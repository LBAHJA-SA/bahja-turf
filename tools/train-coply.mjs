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
 * ============================================================================= */

import fs from 'node:fs'
import { charger } from './empreinte-couple.mjs'

const FENETRE = Math.max(200, Number(process.argv[2]) || 2000)

const formeScore = (mus) => {
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
const log1p = (x) => Math.log(Math.max(0, x) + 1)
const BOUT = (v, d) => (Number.isFinite(v) ? v : d)

function caract(p, course) {
  const c = Number(p.cote_pmu)
  return [
    Math.log(Number.isFinite(c) && c > 0 ? c : 30),   // 0 marché (gagnant)
    formeScore(p.musique),                            // 1 forme
    BOUT(Number(p.valeur), 0),                        // 2 valeur
    BOUT(Number(p.age), 5),                           // 3 âge
    BOUT(Number(p.corde), 99),                        // 4 corde
    log1p(BOUT(Number(p.gains), 0)),                  // 5 gains
    /^M|^H/i.test(String(p.sexe || '')) ? 1 : 0,       // 6 mâle
    Number(course.distance) / 1000,                    // 7 distance
  ]
}

const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))))

function statsStandardisatrices(X) {
  const f = X[0].length
  const mean = Array(f).fill(0), std = Array(f).fill(0)
  for (const x of X) for (let i = 0; i < f; i++) mean[i] += x[i]
  for (let i = 0; i < f; i++) mean[i] /= X.length
  for (const x of X) for (let i = 0; i < f; i++) std[i] += (x[i] - mean[i]) ** 2
  for (let i = 0; i < f; i++) std[i] = Math.sqrt(std[i] / X.length) || 1
  return { mean, std }
}
const normalise = (X, st) => X.map((x) => x.map((v, i) => (v - st.mean[i]) / st.std[i]))

function entrainer(X, y, { it = 80, lr = 0.5 } = {}) {
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

/* ── l'entraînement ──────────────────────────────────────────────────────── */

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const train = tout.slice(-Math.min(FENETRE, tout.length))
console.log('archive ' + tout.length + ' · entraîné sur ' + train.length + ' (' + train[0].date + ' → ' + train[train.length - 1].date + ')')

const X = [], y = []
for (const c of train) {
  const top3 = new Set(c.arrivee.slice(0, 3))
  for (const p of c.partants) {
    if (!p.num || p.nonPartant) continue
    X.push(caract(p, c))
    y.push(top3.has(p.num) ? 1 : 0)
  }
}
const st = statsStandardisatrices(X)
const w = entrainer(normalise(X, st), y)

/* ── la validation causale (les 200 dernières, jamais vues) ─────────────── */

const tests = tout.slice(-200)
let ok = 0, n = 0
for (const c of tests) {
  const top3 = new Set(c.arrivee.slice(0, 3))
  const chevaux = c.partants.filter((p) => p.num && !p.nonPartant)
  const preds = chevaux.map((p) => ({ num: p.num, p: sigmoid(normalise([caract(p, c)], st)[0].reduce((s, v, i) => s + v * w[i], 0)) }))
  preds.sort((a, b) => b.p - a.p || a.num - b.num)
  const trio = preds.slice(0, 3).map((x) => x.num)
  n++
  if (c.arrivee.slice(0, 3).filter((x) => trio.includes(x)).length >= 2) ok++
}
console.log('validation causale (200 dernières) : ' + ok + '/' + n + ' = ' + (ok / n * 100).toFixed(2) + '%')

/* ── l'export ───────────────────────────────────────────────────────────── */

const out = {
  genere: new Date().toISOString(),
  fenetre: train.length,
  debut: train[0].date,
  fin: train[train.length - 1].date,
  nbFeatures: w.length,
  mean: st.mean,
  std: st.std,
  poids: w,
  validation: { n, taux: ok / n },
}
fs.writeFileSync('public/data/coply-modele.json', JSON.stringify(out))
console.log('exporté : public/data/coply-modele.json (' + JSON.stringify(out).length + ' o)')
