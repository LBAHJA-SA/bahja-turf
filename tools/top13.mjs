/* ---------------------------------------------------------------
 * tools\top13.mjs  —  ⭐ TOP 13  →  7 CHEVAUX. LA SÉLECTION, PAS LA COUVERTURE
 *
 *   node tools\top13.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *
 * LE CADRAGE, RÉÉCRIT
 *   on ne cherche plus à couvrir le Top 5.
 *   on a 13 chevaux et il faut en garder 7.
 *   la question est : SUR QUELS 13, ET LESQUELS 6 SORTIR ?
 *
 *   le Top 5 ne sert plus qu de SONDE : il mesure la qualité de la 7.
 *
 * LE VRAI PROBLÈME, ÉNONCÉ SIMPLEMENT
 *   sur une course à 16 partants, exactement 5 arrivent dans le Top 5.
 *   si on garde 7 chevaux, la capture ATTENDUE d'un tirage aveugle
 *   est 5 × 7/16 = 2,2 chevaux.
 *   Tout ce qu'on peut gagner vient donc d'un seul endroit :
 *   certains rangs du classement de référence doivent être
 *   MEILLEURS que d'autres, de façon REPRODUCTIBLE.
 *
 * CE QUE CE SCRIPT TESTE, DANS L'ORDRE
 *   ① le taux de Top 5 par rang — le signal existe-t-il ?
 *   ② le PLAFOND : le meilleur sous-ensemble de 7, choisi par hindsight
 *   ③ le TEST HONNÊTE : on choisit sur 70 courses, on vérifie sur 24
 *   ④ la comparaison avec le moteur actuel (par blocs)
 *   ⑤ les 6 SORTIS : quand on est à 3/5, qui a été jeté ?
 *   ⑥ le verdict : existe-t-il une règle de sélection ?
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F94 = path.join(RACINE, 'data', 'corpus', 'archive-94.json')
const FF = path.join(RACINE, 'data', 'corpus', 'fusion.json')
const TAILLE = 13
const GARDER = 7
const COUPURE = 70

function charger(fichier, mode) {
  const brut = JSON.parse(fs.readFileSync(fichier, 'utf8')).courses
  return brut.map((k) => {
    const arrivee = (k.arrivee || []).slice()
    const ordre = mode === 'presse' && k.presse && k.presse.length
      ? k.presse.slice()
      : (k.ordreCote || Object.keys(k.cotes).map(Number)
        .filter((x) => k.cotes[x] > 0).sort((a, b) => k.cotes[a] - k.cotes[b])).slice()
    return { cle: k.cle, date: k.date, arrivee, ordre, cotes: k.cotes, nb: k.nbPartants }
  }).filter((k) => k.arrivee.length >= 5 && k.ordre.length >= 10)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

function positionDe(k, num) { return k.ordre.indexOf(num) + 1 }
function dansLeTop5(k, num) { return k.arrivee.slice(0, 5).includes(num) }

/** les 7 chevaux gardés, par liste de rangs (1-indexés dans k.ordre) */
function garder(k, rangs) {
  return rangs.map((r) => k.ordre[r - 1]).filter((x) => x != null)
}
function capturer(k, rangs) {
  const sel = garder(k, rangs)
  return k.arrivee.slice(0, 5).filter((x) => sel.includes(x)).length
}
const rng = (n, k) => {
  const out = []
  const comb = (start, cur) => {
    if (cur.length === k) { out.push(cur.slice()); return }
    for (let i = start; i <= n - (k - cur.length); i++) { cur.push(i); comb(i + 1, cur); cur.pop() }
  }
  comb(1, [])
  return out
}

function rapport(lib, base, idx, fn) {
  const par = [0, 0, 0, 0, 0, 0]
  let s = 0
  for (const ki of idx) { const c = fn(base[ki]); par[c]++; s += c }
  const t = idx.length
  console.log('  ' + lib.padEnd(34)
    + par.slice(0, 6).map((v) => (v / t * 100).toFixed(1).padStart(7)).join('')
    + '   |' + (par[5] / t * 100).toFixed(1).padStart(7) + (s / t).toFixed(2).padStart(8))
  return { par, taux: par[5] / t * 100, ge4: (par[4] + par[5]) / t * 100, moy: s / t, n: t }
}

const entete = () => {
  console.log('')
  console.log('  ' + 'sélection'.padEnd(34) + '   5/5     4/5     3/5     2/5     1/5     0/5   |   ≥5/5  moyenne')
  console.log('  ' + '-'.repeat(96))
}

for (const [fichier, mode, titre] of [[F94, 'presse', 'LES 94 COURSES AVEC PRESSE'], [FF, 'cote', 'LE CORPUS 347']]) {
  const base = charger(fichier, mode)
  const n = base.length
  const idxAll = base.map((_, i) => i)
  const idxApp = idxAll.slice(0, Math.min(COUPURE, n))
  const idxTest = idxAll.slice(Math.min(COUPURE, n))

  console.log('')
  console.log('  ══════════════════════════════════════════════════════════════════════')
  console.log('  ║  ' + titre + '   (' + n + ' Quintés, ' + base[0].date + ' → ' + base[n - 1].date + ')')
  console.log('  ══════════════════════════════════════════════════════════════════════')
  console.log('')
  console.log('  On garde ' + GARDER + ' chevaux sur les ' + TAILLE + ' premiers du classement de référence.')
  console.log('')

  /* ═══ ① le taux de Top 5 par rang ═════════════════════════════ */
  console.log('  ① LE SIGNAL — le taux de Top 5 par rang')
  console.log('')
  console.log('  rang   présent   dans le Top 5   taux       (rang 1 = le plus soutenu)')
  console.log('  ' + '-'.repeat(62))
  const taux = []
  for (let r = 1; r <= TAILLE; r++) {
    let pres = 0; let top5 = 0
    for (const ki of idxApp) {
      const num = base[ki].ordre[r - 1]
      if (num == null) continue
      pres++
      if (dansLeTop5(base[ki], num)) top5++
    }
    const t = pres ? top5 / pres * 100 : 0
    taux.push({ r, t, pres, top5 })
    console.log('  ' + ('P' + r).padEnd(7) + String(pres).padStart(7) + String(top5).padStart(15)
      + t.toFixed(1).padStart(8) + ' %   ' + '█'.repeat(Math.round(t)))
  }
  console.log('')
  const attendu = 100 * 5 / 16
  console.log('  ⭐ le taux ATTENDU si les rangs ne valaient rien : '
    + attendu.toFixed(1) + ' % (5 places sur 16 partants)')
  console.log('    rangs au-dessus du hasard : '
    + (taux.filter((x) => x.t >= attendu).length ? taux.filter((x) => x.t >= attendu).map((x) => 'P' + x.r + ' ' + x.t.toFixed(0) + '%').join(' · ') : 'AUCUN'))
  console.log('')

  /* ═══ ② le plafond par hindsight ═════════════════════════════ */
  console.log('  ② LE PLAFOND — le MEILLEUR sous-ensemble de 7, choisi après coup')
  console.log('')
  const combos = rng(TAILLE, GARDER)
  const scores = combos.map((c) => {
    let s = 0; let n5 = 0
    for (const ki of idxApp) { const x = capturer(base[ki], c); s += x; if (x === 5) n5++ }
    return { c, moy: s / idxApp.length, n5: n5 / idxApp.length * 100 }
  })
  scores.sort((a, b) => b.moy - a.moy || b.n5 - a.n5)
  console.log('  ' + combos.length + ' sous-ensembles possibles. Les 5 meilleurs sur l APPRENTISSAGE :')
  console.log('')
  console.log('   #  les 7 rangs gardés                        moyenne   5/5')
  console.log('  ' + '-'.repeat(66))
  scores.slice(0, 5).forEach((s, i) => {
    console.log('   ' + String(i + 1).padStart(2) + ' ' + s.c.join(',').padEnd(34)
      + s.moy.toFixed(2).padStart(9) + s.n5.toFixed(1).padStart(7) + ' %')
  })
  console.log('')

  /* ═══ ③ le test honnête ══════════════════════════════════════ */
  console.log('  ③ LE TEST HONNÊTE — choisi sur ' + idxApp.length + ', vérifié sur ' + idxTest.length)
  console.log('')
  entete()
  const rTout = rapport('les 7 premiers (aveugle)', base, idxAll, (k) => capturer(k, [1, 2, 3, 4, 5, 6, 7]))
  const rPond = rapport('les 7 par meilleur taux (P1..P13)', base, idxAll, (k) => capturer(k, taux.slice().sort((a, b) => b.t - a.t).slice(0, 7).map((x) => x.r)))
  const rOracle = rapport('le MEILLEUR (choisi après coup)', base, idxAll, (k) => capturer(k, scores[0].c))
  console.log('')
  if (idxTest.length) {
    console.log('  Sur le TEST seul (' + idxTest.length + ' courses, jamais vues) :')
    entete()
    rapport('les 7 premiers (aveugle)', base, idxTest, (k) => capturer(k, [1, 2, 3, 4, 5, 6, 7]))
    rapport('les 7 par meilleur taux (appris)', base, idxTest, (k) => capturer(k, taux.slice().sort((a, b) => b.t - a.t).slice(0, 7).map((x) => x.r)))
    rapport('le MEILLEUR (oracle, triche)', base, idxTest, (k) => capturer(k, scores[0].c))
    rapport('le 2e MEILLEUR (oracle, triche)', base, idxTest, (k) => capturer(k, scores[1].c))
    console.log('')
  }

  /* ═══ ④ le moteur actuel par blocs ════════════════════════════ */
  console.log('  ④ LE MOTEUR ACTUEL — le remplissage par blocs')
  console.log('')
  const BLOCS = [
    { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 },
    { id: 'G3', min: 9, max: 10 }, { id: 'G4', min: 11, max: 12 },
    { id: 'G5', min: 13, max: 999 },
  ]
  const parBlocs = BLOCS.map((b, i) => {
    const dis = Math.min(b.max, TAILLE) - b.min + 1
    return dis
  })
  console.log('  le moteur prend ' + BLOCS.map((b, i) => b.id).join(' · ')
    + ' → ' + parBlocs.join('+') + ' = ' + parBlocs.reduce((a, b) => a + b, 0) + ' chevaux')
  const rangsMoteur = []
  BLOCS.forEach((b, i) => { for (let r = b.min; r <= Math.min(b.max, TAILLE); r++) rangsMoteur.push(r) })
  console.log('  les rangs pris : ' + rangsMoteur.join(', ') + '   ('
    + rangsMoteur.length + ' chevaux — on n en garde que ' + GARDER + ')')
  console.log('')
  entete()
  rapport('moteur : rangs ' + rangsMoteur.slice(0, GARDER).join(','), base, idxAll, (k) => capturer(k, rangsMoteur.slice(0, GARDER)))
  console.log('')

  /* ═══ ⑤ les 6 sortis ══════════════════════════════════════════ */
  console.log('  ⑤ LES 6 SORTIS — quand le moteur est à 3/5, qui a été jeté ?')
  console.log('')
  const trois = []
  for (const ki of idxAll) {
    const k = base[ki]
    if (capturer(k, [1, 2, 3, 4, 5, 6, 7]) === 3) {
      const manquants = k.arrivee.slice(0, 5).filter((x) => !garder(k, [1, 2, 3, 4, 5, 6, 7]).includes(x))
      trois.push({ ki, cle: k.cle, rangs: manquants.map((num) => positionDe(k, num)) })
    }
  }
  const parRangSorti = new Map()
  trois.forEach((x) => x.rangs.forEach((r) => parRangSorti.set(r, (parRangSorti.get(r) || 0) + 1)))
  console.log('  ' + trois.length + ' courses à 3/5, soit '
    + (trois.length / n * 100).toFixed(0) + ' % du corpus. Les 2 perdus :')
  console.log('')
  console.log('   rang du cheval perdu   fois    part des 6 chefs de liste jetés')
  console.log('  ' + '-'.repeat(60))
  const sorties = [8, 9, 10, 11, 12, 13]
  sorties.forEach((r) => {
    const v = parRangSorti.get(r) || 0
    console.log('   P' + String(r).padEnd(24) + String(v).padStart(4)
      + '    ' + (v / trois.length * 100).toFixed(0).padStart(3) + ' %   ' + '█'.repeat(Math.round(v / 3)))
  })
  const totSortis = sorties.reduce((a, r) => a + (parRangSorti.get(r) || 0), 0)
  console.log('  ' + '-'.repeat(60))
  console.log('   les 6 chevalés jetés arrive tous dans le Top 5 : ' + totSortis
    + ' fois sur ' + (trois.length * 2) + ' perdus')
  console.log('')
  console.log('  ⚠ Ce sont les rangs 8 à 13. Their fate is decided by the quota,')
  console.log('    pas par une qualité. C est exactement la question à trancher.')
  console.log('')

  /* ═══ ⑥ verdict ══════════════════════════════════════════════ */
  console.log('  ⑥ LE VERDICT')
  console.log('')
  const ecart = rPond.moy - rTout.moy
  console.log('   les 7 premiers (aveugle)   : moyenne ' + rTout.moy.toFixed(2)
    + '   5/5 ' + rTout.taux.toFixed(1) + ' %')
  console.log('   les 7 meilleurs (appris)   : moyenne ' + rPond.moy.toFixed(2)
    + '   5/5 ' + rPond.taux.toFixed(1) + ' %   → ' + (ecart > 0 ? '+' : '') + ecart.toFixed(2))
  console.log('   le MEILLEUR (oracle)       : moyenne ' + rOracle.moy.toFixed(2)
    + '   5/5 ' + rOracle.taux.toFixed(1) + ' %   → ' + (rOracle.moy - rTout.moy > 0 ? '+' : '') + (rOracle.moy - rTout.moy).toFixed(2) + '  (il triche)')
  console.log('')
  if (idxTest.length) {
    const tTout = (() => { let s = 0; let n5 = 0; for (const ki of idxTest) { const c = capturer(base[ki], [1, 2, 3, 4, 5, 6, 7]); s += c; if (c === 5) n5++ } return { moy: s / idxTest.length, n5: n5 / idxTest.length * 100 } })()
    const tPond = (() => { const r = taux.slice().sort((a, b) => b.t - a.t).slice(0, 7).map((x) => x.r); let s = 0; let n5 = 0; for (const ki of idxTest) { const c = capturer(base[ki], r); s += c; if (c === 5) n5++ } return { moy: s / idxTest.length, n5: n5 / idxTest.length * 100 } })()
    console.log('   SUR LE TEST :')
    console.log('     les 7 premiers : moyenne ' + tTout.moy.toFixed(2) + '   5/5 ' + tTout.n5.toFixed(1) + ' %')
    console.log('     les 7 meilleurs : moyenne ' + tPond.moy.toFixed(2) + '   5/5 ' + tPond.n5.toFixed(1) + ' %')
    console.log('     écart           : ' + (tPond.moy - tTout.moy > 0 ? '+' : '') + (tPond.moy - tTout.moy).toFixed(2)
      + '   ⇒ ' + (Math.abs(tPond.moy - tTout.moy) < 0.05 ? 'AUCUN' : 'réel'))
    console.log('')
  }
  console.log('   le gain d une sélection APPRISE sur les rangs vaut '
    + (Math.abs(ecart) < 0.05 ? 'RIEN' : ecart.toFixed(2) + ' cheval de Top 5') + '.')
  console.log('   le gain d une sélection PAR HINDSIGHT vaut '
    + (rOracle.moy - rTout.moy).toFixed(2) + '.')
  console.log('')
  console.log('  ───────────────────────────────────────────────────────────────')
  console.log('  ⚠ Aucun système n est modifié. Le moteur reste 3-2-1-1-1.')
  console.log('  ───────────────────────────────────────────────────────────────')
  console.log('')
}