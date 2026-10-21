/* =============================================================================
 * tools/train-coply.mjs — ENTRAÎNE le modèle du couplé et l'exporte.
 *
 *  ⚠ ÉCRIT un seul fichier : public/data/coply-modele.json
 *  (les poids + les stats de normalisation). Rien d'autre.
 *
 *  Le modèle est une régression logistique sur P(dans le top3), entraînée sur
 *  l'archive (fenêtre glissante = les N dernières courses). La page charge les
 *  poids et prédit sur la course du jour.
 *
 *  Usage : node tools/train-coply.mjs [FENETRE=2000]
 *
 *  ⚠ 21/10/2026 — LES BRIQUES SONT EXPORTÉES (`caract`, `entrainer`,
 *  `normalise`, `entrainerModele`, `predire`, `note3`). C'est la leçon de
 *  §11.37 : un outil de mesure qui RÉIMPLÉMENTE l'entraînement ne mesure rien
 *  (tools/test-quotas.mjs annonçait 11,5 % là où le moteur donnait 8,3 %).
 *  `tools/coply-regles.mjs` importe donc ces fonctions — il n'en réécrit aucune.
 * ============================================================================= */

import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { charger } from './empreinte-couple.mjs'

/* ── les briques ─────────────────────────────────────────────────────────── */

export const formeScore = (mus) => {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  for (const [i, r] of (s.match(/\d+[a-z]/g) || []).slice(0, 6).entries()) {
    const pl = Number(String(r).replace(/\D/g, ''))
    sc += (pts[pl] ?? 1) / (1 + i * 0.55)
  }
  return sc
}
export const log1p = (x) => Math.log(Math.max(0, x) + 1)
export const BOUT = (v, d) => (Number.isFinite(v) ? v : d)

/** Les 8 caractéristiques. ⚠ DOIT rester identique à `caract()` du moteur
 *  (backend/COUPLE/moteur-coply.js) — sinon l'entraînement et la page ne
 *  parlent plus de la même chose (c'est le défaut trouvé le 21/10/2026). */
export function caract(p, course) {
  const c = Number(p.coteRef ?? p.cote_pmu ?? p.cote)
  return [
    Math.log(Number.isFinite(c) && c > 0 ? c : 30),   // 0 marché
    formeScore(p.musique),                            // 1 forme
    BOUT(Number(p.valeur), 0),                        // 2 valeur
    BOUT(Number(p.age), 5),                           // 3 âge
    BOUT(Number(p.corde), 99),                        // 4 corde
    log1p(BOUT(Number(p.gains ?? p.gain), 0)),        // 5 gains
    /^M|^H/i.test(String(p.sexe || '')) ? 1 : 0,       // 6 mâle
    Number(course.distance) / 1000,                    // 7 distance
  ]
}

export const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))))

export function statsStandardisatrices(X) {
  const f = X[0].length
  const mean = Array(f).fill(0), std = Array(f).fill(0)
  for (const x of X) for (let i = 0; i < f; i++) mean[i] += x[i]
  for (let i = 0; i < f; i++) mean[i] /= X.length
  for (const x of X) for (let i = 0; i < f; i++) std[i] += (x[i] - mean[i]) ** 2
  for (let i = 0; i < f; i++) std[i] = Math.sqrt(std[i] / X.length) || 1
  return { mean, std }
}
export const normalise = (X, st) => X.map((x) => x.map((v, i) => (v - st.mean[i]) / st.std[i]))

export function entrainer(X, y, { it = 80, lr = 0.5 } = {}) {
  const f = X[0].length
  const w = Array(f).fill(0)
  const n = X.length
  for (let k = 0; k < it; k++) {
    const grad = Array(f).fill(0)
    for (let j = 0; j < n; j++) {
      const z = X[j].reduce((s, v, i) => s + v * w[i], 0)
      const e = sigmoid(z) - y[j]
      for (let i = 0; i < f; i++) grad[i] += X[j][i] * e
    }
    for (let i = 0; i < f; i++) w[i] -= (lr * grad[i]) / n
  }
  return w
}

/** Entraîne sur une liste de courses → { mean, std, poids, n } */
export function entrainerModele(courses, opts = {}) {
  const X = [], y = []
  for (const c of courses) {
    const top3 = new Set((c.arrivee || []).slice(0, 3))
    for (const p of c.partants || []) {
      if (!p.num || p.nonPartant) continue
      X.push(caract(p, c))
      y.push(top3.has(p.num) ? 1 : 0)
    }
  }
  if (!X.length) return null
  const st = statsStandardisatrices(X)
  const w = entrainer(normalise(X, st), y, opts)
  return { mean: st.mean, std: st.std, poids: w, n: X.length, it: opts.it ?? 80, lr: opts.lr ?? 0.5 }
}

/** P(dans le top3) d'un partant */
export function predire(m, p, course) {
  const x = caract(p, course).map((v, i) => (v - m.mean[i]) / m.std[i])
  return sigmoid(x.reduce((s, v, i) => s + v * m.poids[i], 0))
}

/** Les 3 numéros prédits par un modèle, pour une course */
export function note3(m, course) {
  const p = (course.partants || []).filter((x) => x.num && !x.nonPartant)
  return p
    .map((x) => ({ num: x.num, p: predire(m, x, course) }))
    .sort((a, b) => b.p - a.p || a.num - b.num)
    .slice(0, 3)
    .map((x) => x.num)
}

/* ── le script ───────────────────────────────────────────────────────────── */

async function main() {
  const FENETRE = Math.max(200, Number(process.argv[2]) || 2000)

  const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
  const train = tout.slice(-Math.min(FENETRE, tout.length))
  console.log('archive ' + tout.length + ' · entraîné sur ' + train.length + ' (' + train[0].date + ' → ' + train[train.length - 1].date + ')')

  const m = entrainerModele(train)

  /* ── la validation causale (les 200 dernières, jamais vues) ─────────────── */
  /* ⚠ 21/10/2026 — sous FENETRE=2000 et avec 3 890 courses, `tout.slice(-200)`
   * est DANS la fenêtre d'entraînement : les 51,5 % annoncés étaient donc
   * IN-SAMPLE. On entraîne ici sur tout SAUF les 200 dernières, et on note
   * sur elles. `--fidele` reproduit l'ancien calcul (in-sample), pour comparer. */
  const fidele = process.argv.includes('--fidele')
  const baseTrain = fidele ? train : tout.slice(0, Math.max(200, tout.length - 200))
  const mb = fidele ? m : entrainerModele(baseTrain)
  const tests = tout.slice(-200)

  let ok = 0, n = 0, trio3 = 0, okM = 0, ident = 0
  for (const c of tests) {
    const top3 = new Set(c.arrivee.slice(0, 3))
    if (top3.size < 3) continue
    const p = c.partants.filter((x) => x.num && !x.nonPartant)
    const tr = note3(mb, c)
    const mar = p.slice().sort((a, b) => Number(a.cote_pmu) - Number(b.cote_pmu) || a.num - b.num).slice(0, 3).map((x) => x.num)
    n++
    const h = c.arrivee.slice(0, 3).filter((x) => tr.includes(x)).length
    if (h >= 2) ok++
    if (h >= 3) trio3++
    if (c.arrivee.slice(0, 3).filter((x) => mar.includes(x)).length >= 2) okM++
    if ([...mar].sort().join('·') === [...tr].sort().join('·')) ident++
  }
  console.log('entraîné sur ' + (fidele ? train.length : baseTrain.length) + ' courses' + (fidele ? ' (l\u2019ancien calcul : in-sample)' : ' (causal)'))
  console.log('moteur   (200 dernières) : ' + ok + '/' + n + ' = ' + (100 * ok / n).toFixed(2) + ' % ≥2/3 · ' + trio3 + '/' + n + ' = ' + (100 * trio3 / n).toFixed(2) + ' % 3/3')
  console.log('marché seul              : ' + okM + '/' + n + ' = ' + (100 * okM / n).toFixed(2) + ' % ≥2/3')
  console.log('le moteur = le top-3 du marché : ' + ident + '/' + n + ' = ' + (100 * ident / n).toFixed(1) + ' %')

  /* ── l'export ───────────────────────────────────────────────────────────── */
  if (fidele) return
  const out = {
    genere: new Date().toISOString(),
    fenetre: train.length,
    debut: train[0].date,
    fin: train[train.length - 1].date,
    nbFeatures: m.poids.length,
    mean: m.mean,
    std: m.std,
    poids: m.poids,
    validation: { n, taux: ok / n, trio: trio3 / n, marche: okM / n, identiques: ident / n, causal: true },
  }
  fs.writeFileSync('public/data/coply-modele.json', JSON.stringify(out))
  console.log('exporté : public/data/coply-modele.json (' + JSON.stringify(out).length + ' o)')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
