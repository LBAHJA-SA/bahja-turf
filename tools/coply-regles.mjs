/* =============================================================================
 * tools/coply-regles.mjs — QUELLE RÈGLE DONNE LES 3 NUMÉROS DU COUPLÉ ? (21/10/2026)
 *
 * Question de l'utilisateur : « coply المحرك ديالو فاشل جدا ».
 * `tools/coply-verif.mjs` a montré que le moteur publié donne 89,2 % du temps
 * EXACTEMENT le top-3 du marché : ce n'est pas un moteur, c'est la cote.
 * Reste à savoir si une autre règle fait mieux — et le prouver HORS échantillon.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PROTOCOLE
 *
 *  archive (3 890 courses, 2020-01-01 → 2026-10-05), triée par date.
 *    test  = les N dernières (défaut 600, 2026-03-24 → 2026-10-05)
 *    train = tout le reste (rien du test ne sert à choisir quoi que ce soit)
 *
 *  ⚠ Les briques (`caract`, `formeScore`, `entrainerModele`, `predire`,
 *    `note3`) sont IMPORTÉES de tools/train-coply.mjs — aucune n'est réécrite
 *    ici (§11.37 : un outil qui réimplémente le moteur ne mesure rien).
 *
 *  Métriques (la définition de l'utilisateur du 16/10) :
 *    couplé = |picks ∩ {1er,2e,3e}| ≥ 2   ·   trio = les 3 exactement
 *
 *  Usage : node tools\coply-regles.mjs [N_TEST=600]
 * ============================================================================= */

import fs from 'node:fs'
import { charger } from './empreinte-couple.mjs'
import { formeScore, entrainerModele, predire, note3 } from './train-coply.mjs'

const N_TEST = Math.max(100, Number(process.argv[2]) || 600)

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const test = tout.slice(-N_TEST)
const train = tout.slice(0, tout.length - N_TEST)

const pub = JSON.parse(fs.readFileSync('public/data/coply-modele.json', 'utf8'))

console.log('\n  ══ QUELLE RÈGLE POUR LES 3 NUMÉROS ? ══')
console.log('  train : ' + train.length + ' (' + train[0].date + ' → ' + train[train.length - 1].date + ')')
console.log('  test  : ' + test.length + ' (' + test[0].date + ' → ' + test[test.length - 1].date + ') — jamais vu\n')

/* ── les partants utilisables d'une course ──────────────────────────────── */
const utiles = (c) => (c.partants || []).filter((p) => p.num && !p.nonPartant && Number(p.cote_pmu ?? p.coteRef) > 0)

/* ── ÉVALUATION ─────────────────────────────────────────────────────────── */
function evalRule(pick, courses) {
  let n = 0, m2 = 0, m3 = 0, hasard = 0
  for (const c of courses) {
    const arr = c.arrivee || []
    if (new Set(arr.slice(0, 3)).size < 3) continue
    const p = utiles(c)
    if (p.length < 8) continue
    const picks = pick(p, c)
    if (!picks || picks.length !== 3) continue
    n++
    const h = arr.slice(0, 3).filter((x) => picks.includes(x)).length
    if (h >= 2) m2++
    if (h >= 3) m3++
    const T = p.length
    hasard += (3 * (T - 3) + 1) / (T * (T - 1) * (T - 2) / 6)
  }
  return { n, m2: (100 * m2) / n, m3: (100 * m3) / n, hasard: (100 * hasard) / n }
}

const ligne = (nom, r) =>
  '  ' + nom.padEnd(40) + r.m2.toFixed(1).padStart(6) + ' %' + r.m3.toFixed(1).padStart(9) + ' %'

/* ── ① les règles de base ───────────────────────────────────────────────── */
const parCote = (p) => p.slice().sort((a, b) => a.cote_pmu - b.cote_pmu || a.num - b.num)

const REGLES = {
  '[A] le marché — 3 cotes les plus basses': (p) => parCote(p).slice(0, 3).map((x) => x.num),
  '[B] le modèle PUBLIÉ (celui de la page)': (p, c) => note3(pub, c),
  '[C] la forme seule (musique)': (p) => p.slice().sort((a, b) => formeScore(b.musique) - formeScore(a.musique) || a.num - b.num).slice(0, 3).map((x) => x.num),
  '[D] 1er du marché + 2 meilleures formes (rangs 2-5)': (p) => {
    const m = parCote(p)
    const q = m.slice(1, 5).slice().sort((a, b) => formeScore(b.musique) - formeScore(a.musique) || a.num - b.num)
    return [m[0].num, q[0].num, q[1].num]
  },
  '[E] le marché SANS le favori (rangs 2,3,4)': (p) => parCote(p).slice(1, 4).map((x) => x.num),
}

/* ── ② les modèles réentraînés (train seulement) ────────────────────────── */
console.log('  entraînement des modèles sur le train…')
const m80 = entrainerModele(train, { it: 80, lr: 0.5 })
const m400 = entrainerModele(train, { it: 400, lr: 0.3 })
REGLES['[F] modèle réentraîné (80 it.)'] = (p, c) => note3(m80, c)
REGLES['[G] modèle réentraîné (400 it., lr 0.3)'] = (p, c) => note3(m400, c)

/* ── ③ la grille cote × forme (choisie sur le TRAIN) ────────────────────── */
const rangsDe = (arr, key) => {
  const r = new Map()
  arr.slice().sort((a, b) => key(a) - key(b) || a.num - b.num).forEach((x, i) => r.set(x.num, i))
  return r
}
const mixte = (a, b) => (p) => {
  const rc = rangsDe(p, (x) => x.cote_pmu)
  const rf = rangsDe(p, (x) => -formeScore(x.musique))
  return p.slice().sort((x, y) => (a * rc.get(x.num) + b * rf.get(x.num)) - (a * rc.get(y.num) + b * rf.get(y.num)) || x.num - y.num)
    .slice(0, 3).map((x) => x.num)
}

console.log('\n  ── la grille « a × rang de cote + b × rang de forme », choisie sur le TRAIN ──')
const grille = []
for (const a of [1, 2, 3, 4, 6, 8]) for (const b of [0, 1, 2, 3]) {
  const r = evalRule(mixte(a, b), train)
  grille.push({ a, b, ...r })
}
grille.sort((x, y) => y.m2 - x.m2 || y.m3 - x.m3)
for (const g of grille.slice(0, 6)) console.log('     a=' + g.a + ' b=' + g.b + '  train : ' + g.m2.toFixed(1) + ' % ≥2/3 · ' + g.m3.toFixed(1) + ' % 3/3')
const best = grille[0]
REGLES['[H] grille mixte a=' + best.a + ' b=' + best.b + ' (choisie sur train)'] = mixte(best.a, best.b)

/* ── ④ le tableau, sur le TEST ──────────────────────────────────────────── */
console.log('\n  ══ RÉSULTAT SUR LE TEST (' + test.length + ' courses, jamais vues) ══')
console.log('  ' + 'règle'.padEnd(40) + '  couplé   trio')
const res = {}
for (const [nom, f] of Object.entries(REGLES)) {
  res[nom] = evalRule(f, test)
  console.log(ligne(nom, res[nom]))
}
const ref = res['[A] le marché — 3 cotes les plus basses']
console.log('  ' + 'hasard (analytique)'.padEnd(40) + ref.hasard.toFixed(1).padStart(6) + ' %' + '       —')

/* ── ⑤ stabilité : le test coupé en deux ────────────────────────────────── */
const moit = [test.slice(0, Math.floor(test.length / 2)), test.slice(Math.floor(test.length / 2))]
console.log('\n  ── stabilité (le test coupé en deux) ──')
console.log('  ' + 'règle'.padEnd(40) + '   1re moitié      2e moitié')
for (const nom of ['[A] le marché — 3 cotes les plus basses', '[B] le modèle PUBLIÉ (celui de la page)', '[D] 1er du marché + 2 meilleures formes (rangs 2-5)', '[H] grille mixte a=' + best.a + ' b=' + best.b + ' (choisie sur train)']) {
  const a = evalRule(REGLES[nom], moit[0])
  const b = evalRule(REGLES[nom], moit[1])
  console.log('  ' + nom.padEnd(40) + (a.m2.toFixed(1) + ' / ' + a.m3.toFixed(1)).padStart(12) + (b.m2.toFixed(1) + ' / ' + b.m3.toFixed(1)).padStart(16))
}

/* ── ⑥ fidélité : `predire` ≡ le vrai `selectionCoply` ? ────────────────── */
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => pub })
const { selectionCoply } = await import('../backend/COUPLE/moteur-coply.js')
let same = 0, tot = 0
for (const c of test.slice(0, 120)) {
  const p = utiles(c)
  if (p.length < 8) continue
  const vrai = (await selectionCoply(p, { distance: c.distance || 0 }, 3))?.chevaux
  const faux = note3(pub, c)
  if (!vrai) continue
  tot++
  if ([...vrai].sort().join('·') === [...faux].sort().join('·')) same++
}
console.log('\n  contrôle : `predire` reproduit le vrai moteur sur ' + same + '/' + tot + ' courses (' + (100 * same / tot).toFixed(1) + ' %)')

/* ── ⑦ combien de numéros ? le marché au top-k, sur le TEST ─────────────── */
console.log('\n  ══ COMBIEN DE NUMÉROS ? (le marché, sur le test) ══')
console.log('  ' + 'k'.padEnd(6) + 'les 3 premiers tous dedans'.padStart(30) + '   ≥2 dedans')
for (let k = 3; k <= 8; k++) {
  let n = 0, all3 = 0, m2 = 0
  for (const c of test) {
    const arr = c.arrivee || []
    if (new Set(arr.slice(0, 3)).size < 3) continue
    const p = utiles(c)
    if (p.length < 8) continue
    const picks = parCote(p).slice(0, k).map((x) => x.num)
    if (picks.length < k) continue
    n++
    const h = arr.slice(0, 3).filter((x) => picks.includes(x)).length
    if (h >= 3) all3++
    if (h >= 2) m2++
  }
  console.log('  ' + String(k).padEnd(6) + ((100 * all3 / n).toFixed(1) + ' %').padStart(24) + ((100 * m2 / n).toFixed(1) + ' %').padStart(14))
}
console.log('')
