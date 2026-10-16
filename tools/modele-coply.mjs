/* =============================================================================
 * tools/modele-coply.mjs — LE MODÈLE PRÉDICTIF DU COUPLÉ (16/10/2026).
 *
 *  ⚠ LABORATOIRE UNIQUEMENT. Lecture seule.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  POURQUOI CE FICHIER EXISTE
 *
 *  « 3 أصغر كوت شبه مستحيلة » (utilisateur). Le marché est efficace, mais
 *  le couplé placé demande le TOP-3, pas la victoire. Le cote_pmu est la
 *  cote de GAGNANT. Un modèle qui combine le marché + les autres signaux
 *  (forme, valeur, âge, corde, palmarès, …) peut peut-être trouver des
 *  chevaux que le marché mal évalue pour le top-3.
 *
 *  Ce fichier entraîne une RÉGRESSION LOGISTIQUE sur P(dans le top3) :
 *     ① causal strict : entraîne sur le PASSÉ, teste sur le FUTUR
 *        (fenêtre glissante, jamais de fuite) ;
 *     ② mesure le taux « ≥2 des 3 dans le top3 » (la définition) ;
 *     ③ compare au trio de marché (3 plus petites cotes) ;
 *     ④ dit combien de fois le modèle choisit un trio DIFFÉRENT —
 *        c'est là seulement qu'il peut gagner.
 *
 *  Usage : node tools/modele-coply.mjs [N=400] [FENETRE=800]
 * ============================================================================= */

import { charger } from './empreinte-couple.mjs'

const N = Math.max(10, Number(process.argv[2]) || 400)
const FENETRE = Math.max(50, Number(process.argv[3]) || 800)

/* ───────────────────────────── les caractéristiques ──────────────────────── */

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

/** Les caractéristiques d'un cheval (cote + le reste, normalisées plus tard). */
function caract(p, course) {
  const c = Number(p.cote_pmu)
  return [
    Math.log(Number.isFinite(c) && c > 0 ? c : 30),   // 0 marché (gagnant)
    formeScore(p.musique),                            // 1 forme
    BOUT(Number(p.valeur), 0),                        // 2 valeur
    BOUT(Number(p.age), 5),                           // 3 âge
    BOUT(Number(p.corde), 99),                        // 4 corde
    BOUT(Number(p.nombrePlaces), 0),                  // 5 places
    BOUT(Number(p.nombreVictoires), 0),               // 6 victoires
    BOUT(Number(p.nombreCourses), 0),                 // 7 expérience
    log1p(BOUT(Number(p.gains), 0)),                  // 8 gains
    /deferre/i.test(String(p.deferre || '')) ? 1 : 0, // 9 déferré (trot)
    /OEILLERE/i.test(String(p.oeilleres || '')) ? 1 : 0, // 10 oeillères
    /^M|^H/i.test(String(p.sexe || '')) ? 1 : 0,       // 11 mâle
    Number(course.distance) / 1000,                    // 12 distance
  ]
}

/* ───────────────────────────── la régression logistique ───────────────────── */

const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))))

/** Normalise (z-score) avec les stats de l'ENTRAÎNEMENT. */
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

function entrainer(X, y, { it = 60, lr = 0.5 } = {}) {
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
const predire = (x, w) => sigmoid(x.reduce((s, v, i) => s + v * w[i], 0))

/* ───────────────────────────── le test causal ───────────────────────────── */

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-Math.min(N, tout.length))
console.log('corpus ' + tout.length + ' · test ' + tests.length + ' · fenêtre ' + FENETRE)

const R = {
  modele: { n: 0, deux: 0, cotes: 0 },
  marche: { n: 0, deux: 0, cotes: 0 },
  same: { n: 0, deux: 0 },   // modèle = marché
  diff: { n: 0, deux: 0 },   // modèle ≠ marché — c'est là qu'il peut gagner
}

tests.forEach((course, i) => {
  const fi = tout.findIndex((c) => c.cle === course.cle)
  const passe = tout.slice(Math.max(0, fi - FENETRE), fi)
  if (passe.length < 60) return

  /* ① entraîne sur le passé */
  const X = [], y = []
  for (const c of passe) {
    const top3 = new Set(c.arrivee.slice(0, 3))
    for (const p of c.partants) {
      if (!p.num || p.nonPartant) continue
      X.push(caract(p, c))
      y.push(top3.has(p.num) ? 1 : 0)
    }
  }
  const st = statsStandardisatrices(X)
  const w = entrainer(normalise(X, st), y)

  /* ② prédit sur la course de test */
  const top3 = new Set(course.arrivee.slice(0, 3))
  const chevaux = course.partants.filter((p) => p.num && !p.nonPartant)
  const preds = chevaux.map((p) => ({ num: p.num, p: predire(normalise([caract(p, course)], st)[0], w) }))
  preds.sort((a, b) => b.p - a.p || a.num - b.num)
  const trio = preds.slice(0, 3).map((x) => x.num)
  const nb = course.arrivee.slice(0, 3).filter((x) => trio.includes(x)).length
  R.modele.n++
  if (nb >= 2) R.modele.deux++
  R.modele.cotes += trio.reduce((s, n) => s + (chevaux.find((p) => p.num === n) ? Number(chevaux.find((p) => p.num === n).cote_pmu) : 0), 0)

  /* ③ le trio de marché, pour comparaison */
  const cot = chevaux.map((p) => ({ num: p.num, c: Number(p.cote_pmu) }))
    .filter((x) => Number.isFinite(x.c) && x.c > 0).sort((a, b) => a.c - b.c || a.num - b.num)
  const tm = cot.slice(0, 3).map((x) => x.num)
  R.marche.n++
  if (course.arrivee.slice(0, 3).filter((x) => tm.includes(x)).length >= 2) R.marche.deux++
  R.marche.cotes += tm.reduce((s, n) => s + (chevaux.find((p) => p.num === n) ? Number(chevaux.find((p) => p.num === n).cote_pmu) : 0), 0)

  /* combien de fois le modèle choisit-il un trio différent ? */
  const identique = new Set(trio).size === new Set(tm).size && trio.every((n) => tm.includes(n))
  const cible = identique ? R.same : R.diff
  cible.n++
  if (nb >= 2) cible.deux++

  if ((i + 1) % 50 === 0) console.log('  … ' + (i + 1) + '/' + tests.length)
})

const pc = (x, n) => (x / Math.max(1, n) * 100).toFixed(2) + '%'
console.log('')
console.log('══ ' + R.modele.n + ' courses — le modèle vs le marché ══')
console.log('   modèle (top-3 prédit)   : ' + pc(R.modele.deux, R.modele.n) + '   ≥2/3')
console.log('   marché (3 plus petites)  : ' + pc(R.marche.deux, R.marche.n) + '   ≥2/3')
console.log('   quand modèle = marché    : ' + pc(R.same.deux, R.same.n) + '   ≥2/3  (n=' + R.same.n + ')')
console.log('   quand modèle ≠ marché    : ' + pc(R.diff.deux, R.diff.n) + '   ≥2/3  (n=' + R.diff.n + ')  ← le gain/perte se joue ici')
const cm = R.modele.cotes / Math.max(1, R.modele.n)
const cmk = R.marche.cotes / Math.max(1, R.marche.n)
console.log('   cote moyenne du trio     : modèle ' + cm.toFixed(1) + ' · marché ' + cmk.toFixed(1) + '   (plus haut = plus de valeur)')
console.log('')
