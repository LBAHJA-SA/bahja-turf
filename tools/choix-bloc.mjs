/* =============================================================================
 * tools/choix-bloc.mjs — QUI ENTRE ET QUI SORT DE CHAQUE BLOC (19/10/2026)
 *
 * Question de l'utilisateur :
 *   « 8 cases = 39,6 % du podium et 7,3 % du quinté. C'est là qu'il faut une
 *     méthode pour que le moteur sache QUI choisir et QUI écarter dans chaque G. »
 *
 * Les quotas 3-2-1-1-1 ne bougent pas (§11.16). Ce qui se cherche, c'est
 * LA RÈGLE DE CHOIX À L'INTÉRIEUR de chaque bloc.
 *
 * TROIS signaux, disponibles pour TOUS les partants de l'archive :
 *   C · carnet   la place de presse P1..P20 de la case (`place`) — §11.23 ;
 *   M · marché   la cote finale (rang de marché) ;
 *   S · stats    la P(top5) HISTORIQUE de la case, lue dans computeStats()
 *                (§2.2 : `p_top5_global` = n_top5 / courses_valides).
 *                C'est la seule utilisation possible de `stats` dans le CHOIX —
 *                jusqu'ici il ne servait qu'à ORDONNER le ticket (§11.19).
 *
 * 3^5 = 243 combinaisons, puis LEAVE-ONE-OUT : la règle est choisie sur 95
 * courses et testée sur la 96e. C'est le seul chiffre qui dit si une règle
 * « choisie » tient vraiment.
 *
 * CONTRÔLE : la combinaison CCCMM doit reproduire le 5/5 du VRAI
 * `remplirGrille` (11,5 %). Sans ça, l'expérience ne parle pas du moteur.
 *
 *   node tools\choix-bloc.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, computeStats } from '../src/lib/quinte.js'

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']
const PROD = 'CCCMM'   // G1-G3 carnet · G4-G5 marché (§11.23)

const pct = (x) => (100 * x).toFixed(1).replace('.', ',') + ' %'
const pad = (s, n) => String(s).padEnd(n)

/* ───────────────────────────── l'échantillon ───────────────────────────── */
const courses = []
const records = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const presse = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (presse.length < 10) continue

  let g
  try { g = buildGrid(presse, nums) } catch { continue }
  const groupes = g.groupes.map((gr) => ({
    id: gr.id,
    cases: gr.cases.filter((c) => c.num != null).map((c) => ({ num: c.num, place: c.place, slot: c.slot })),
  }))
  if (groupes.length < 5) continue

  const rang = Object.fromEntries(
    nums.slice().sort((a, b) => cotes[a] - cotes[b] || a - b).map((n, i) => [n, i + 1]))

  courses.push({
    date: q.date, groupes, rang,
    arrivee: q.arrivee.slice(0, 5),
    grille: g, discipline: q.discipline,
    cotesEnv: Object.fromEntries(Object.keys(cotes).map((n) => [n, { cote: cotes[n] }])),
    record: { date: q.date, synthese: presse, runners: nums, arrivee: q.arrivee.slice(0, 5) },
  })
  records.push(courses[courses.length - 1].record)
}
const N = courses.length

/* ─────────────────────────────── les règles ─────────────────────────────── */
/** trie les cases d'un bloc selon la règle ; `stats` = { place → P(top5) } */
function ordonner(cases, regle, course, stats) {
  const c = cases.slice()
  if (regle === 'C') return c.sort((a, b) => a.place - b.place)
  if (regle === 'M') return c.sort((a, b) => (course.rang[a.num] ?? 99) - (course.rang[b.num] ?? 99) || a.place - b.place)
  // S : la P(top5) historique de la CASE (slot), la plus forte d'abord ; à égalité, le carnet
  return c.sort((a, b) => (stats[b.slot] ?? -1) - (stats[a.slot] ?? -1) || a.place - b.place)
}

function ticket(course, combo, stats) {
  const out = []
  for (let i = 0; i < 5; i++) {
    const gr = course.groupes.find((x) => x.id === IDS[i])
    if (!gr) continue
    out.push(...ordonner(gr.cases, combo[i], course, stats).slice(0, QUOTA[IDS[i]]).map((x) => x.num))
  }
  return out
}

function noter(liste, combo, stats) {
  let n5 = 0, n4 = 0, n3 = 0, s = 0
  for (const c of liste) {
    const t = new Set(ticket(c, combo, stats))
    let k = 0
    for (const x of c.arrivee) if (t.has(x)) k++
    if (k >= 5) n5++
    if (k >= 4) n4++
    if (c.arrivee.slice(0, 3).every((x) => t.has(x))) n3++
    s += k
  }
  const n = liste.length || 1
  return { n, p5: n5 / n, p4: n4 / n, p3: n3 / n, moy: s / n }
}

/* les 243 combinaisons */
const COMBOS = []
for (let m = 0; m < 243; m++) {
  let x = m
  let s = ''
  for (let i = 0; i < 5; i++) { s += 'CMS'[x % 3]; x = Math.floor(x / 3) }
  COMBOS.push(s)
}

/* la P(top5) par CASE (slot), à partir d'un computeStats */
function statsParPlace(st) {
  const out = {}
  for (const r of st.parPlace) out[r.place] = (r.courses_valides || 0) > 0 ? r.n_top5 / r.courses_valides : 0
  return out
}

/* ───────────────────────────── 0. le contrôle ───────────────────────────── */
{
  const stats = statsParPlace(computeStats(records))
  let direct = 0, moteur = 0
  for (const c of courses) {
    const classement = c.grille.groupes.flatMap((g) => g.cases)
      .slice().sort((a, b) => a.place - b.place).map((x) => ({ p: { num: x.num }, s: null, ok: true }))
    const t1 = new Set(ticket(c, PROD, stats))
    const t2 = new Set(remplirGrille(c.grille, classement, c.discipline, c.cotesEnv).ticket)
    if (c.arrivee.every((n) => t1.has(n))) direct++
    if (c.arrivee.every((n) => t2.has(n))) moteur++
  }
  console.log('\n  CONTRÔLE — 5/5 de la règle de production ' + PROD + ' :')
  console.log('     calcul direct        ' + pct(direct / N))
  console.log('     vrai remplirGrille   ' + pct(moteur / N) + '   ' + (Math.abs(direct - moteur) <= 1 ? '✓ même compte' : '✗ DIVERGE'))
}

/* ───────────────────── 1. les 243 combinaisons (stats pleines) ──────────── */
const STATS = statsParPlace(computeStats(records))
const res = COMBOS.map((combo) => ({ combo, ...noter(courses, combo, STATS) }))
res.sort((a, b) => b.p5 - a.p5 || b.moy - a.moy || b.p4 - a.p4)

const nom = (c) => c.split('').map((x, i) => IDS[i] + ':' + ({ C: 'carnet', M: 'marché', S: 'stats' })[x]).join(' · ')

console.log('\n  QUI ENTRE DANS CHAQUE BLOC — ' + N + ' Quintés à presse réelle, cotes finales')
console.log('  quotas 3-2-1-1-1 (fermés) · le reste = la règle de choix du bloc\n')
console.log('  ' + pad('code', 8) + pad('5/5', 9) + pad('≥4', 9) + pad('1-2-3', 9) + pad('x/5', 7) + 'règle')
console.log('  ' + '-'.repeat(100))
for (const r of res.slice(0, 12)) {
  console.log('  ' + pad(r.combo, 8) + pad(pct(r.p5), 9) + pad(pct(r.p4), 9) + pad(pct(r.p3), 9) +
    pad(r.moy.toFixed(2), 7) + nom(r.combo))
}
const prod = res.find((r) => r.combo === PROD)
console.log('  ' + '-'.repeat(100))
console.log('  PRODUCTION ' + PROD + ' → ' + pct(prod.p5) + ' 5/5 · ' + pct(prod.p4) + ' ≥4 · ' + pct(prod.p3) +
  ' 1-2-3 · ' + prod.moy.toFixed(2) + ' x/5  (rang ' + (res.indexOf(prod) + 1) + '/' + COMBOS.length + ')')

/* ───────────────────────── 2. l'effet d'UN bloc seul ────────────────────── */
console.log('\n  EFFET D’UN SEUL BLOC (les autres restent en production : ' + PROD + ')')
console.log('  ' + pad('bloc', 6) + pad('carnet', 26) + pad('marché', 26) + 'stats')
for (let i = 0; i < 5; i++) {
  const f = (r) => pct(r.p5) + ' · ' + r.moy.toFixed(2)
  const out = ['C', 'M', 'S'].map((x) => {
    const c2 = PROD.split('')
    c2[i] = x
    return f(noter(courses, c2.join(''), STATS))
  })
  console.log('  ' + pad(IDS[i], 6) + pad(out[0], 26) + pad(out[1], 26) + out[2])
}

/* ────────────────────── 3. leave-one-out (la vraie preuve) ──────────────── */
let bonLOO = 0, bonProd = 0
const choix = {}
for (let i = 0; i < N; i++) {
  const app = courses.filter((_, j) => j !== i)
  const st = statsParPlace(computeStats(records.filter((_, j) => j !== i)))
  let best = null
  for (const combo of COMBOS) {
    const r = noter(app, combo, st)
    if (!best || r.p5 > best.r.p5 || (r.p5 === best.r.p5 && r.moy > best.r.moy)) best = { combo, r }
  }
  choix[best.combo] = (choix[best.combo] || 0) + 1
  const a = noter([courses[i]], best.combo, st)
  const b = noter([courses[i]], PROD, st)
  if (a.p5 > 0) bonLOO++
  if (b.p5 > 0) bonProd++
}

console.log('\n  LEAVE-ONE-OUT — la règle est choisie sur 95 courses, testée sur la 96e')
console.log('     règle choisie par LOO : ' + pct(bonLOO / N) + ' de 5/5')
console.log('     règle de production   : ' + pct(bonProd / N) + ' de 5/5  (' + nom(PROD) + ')')
const freq = Object.entries(choix).sort((a, b) => b[1] - a[1]).slice(0, 6)
console.log('     combinaisons retenues : ' + freq.map(([k, v]) => k + ' ×' + v).join(' · '))

/* ──────────────── 4. ce que le choix coûte, bloc par bloc ───────────────── */
console.log('\n  CE QUE LE CHOIX COÛTE — par bloc, sur les ' + N + ' courses')
for (let i = 0; i < 5; i++) {
  const id = IDS[i]
  let cB = 0, mB = 0, sB = 0, aucun = 0, n = 0
  for (const c of courses) {
    const gr = c.groupes.find((x) => x.id === id)
    if (!gr || !gr.cases.length) continue
    const dans = gr.cases.filter((x) => c.arrivee.includes(x.num))
    if (!dans.length) { aucun++; continue }
    n++
    const set = (r) => new Set(ordonner(gr.cases, r, c, STATS).slice(0, QUOTA[id]).map((x) => x.num))
    const sc = set('C'), sm = set('M'), ss = set('S')
    const oc = dans.filter((x) => sc.has(x.num)).length
    const om = dans.filter((x) => sm.has(x.num)).length
    const os = dans.filter((x) => ss.has(x.num)).length
    if (oc > Math.max(om, os)) cB++
    else if (om > Math.max(oc, os)) mB++
    else if (os > Math.max(oc, om)) sB++
  }
  console.log('     ' + id + ' : ' + n + ' courses avec un arrivant · carnet mieux ' + cB +
    ' · marché mieux ' + mB + ' · stats mieux ' + sB + ' · aucun arrivant ' + aucun)
}

console.log('')
