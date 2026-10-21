/* =============================================================================
 * tools/choix-physique.mjs — QUI ENTRE DANS LE BLOC ? LE TEST HORS ÉCHANTILLON
 *                            (19/10/2026)
 *
 * ⚠ RÈGLE DE MÉTHODE POSÉE PAR L'UTILISATEUR :
 *   « ne fais pas passer dans les tests les courses qui ont servi aux
 *     STATISTIQUES — les courses de Quinté ne sont pas comme les autres. »
 *
 *   Donc : le corpus des statistiques (data/quintes.json, 96 Quintés) est
 *   coupé en DEUX PÉRIODES. La règle se choisit sur une période, se mesure sur
 *   l'AUTRE, et on refait le trajet dans les deux sens. Aucune course ne sert
 *   à la fois à choisir et à noter. Et uniquement des Quintés.
 *
 * ── Ce qu'on cherche ──────────────────────────────────────────────────────
 * tools/choix-bloc.mjs a montré que sur les signaux de l'archive (carnet,
 * marché, stats de case), la règle de production est déjà la meilleure : les
 * 243 combinaisons balayées, la production sort 6ᵉ, et la meilleure combinaison
 * choisie en LOO retombe à 8,3 % contre 11,5 %. Le blocage n'est donc pas la
 * RÈGLE, c'est le SIGNAL.
 *
 * Le seul signal jamais testé : LA CARRIÈRE (§6 « la forme est du bruit, le
 * physique est un fait »). data/corpus/carriere96.json (tools/carriere-archive.mjs)
 * porte les 5 dernières courses de chaque partant.
 *
 * ⚠ On mesure les COMPOSANTES DU MOTEUR, pas un critère maison : celles que
 *   `scorePhysique()` renvoie déjà — `forme` (forme utile à ±400 m), `distance`,
 *   `piste` (hippodrome + sens). Ce qui gagne ici s'implémente tel quel.
 *
 * Les quotas 3-2-1-1-1 ne bougent pas (§11.16). On ne touche QUE qui entre.
 *
 *   node tools\choix-physique.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, scorePhysique, codeHippo } from '../src/lib/quinte.js'

const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']
const PROD = ['C', 'C', 'C', 'M', 'M']
const CAR = JSON.parse(fs.readFileSync('data/corpus/carriere96.json', 'utf8'))
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))

const pct = (x) => (100 * x).toFixed(1).replace('.', ',') + ' %'
const pad = (s, n) => String(s).padEnd(n)
const rp = (s, n) => String(s).padStart(n)

/* ───────────────────────────── l'échantillon ───────────────────────────── */
const courses = []
let chevaux = 0, avecRun = 0, sansFormes = 0
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const presse = (q.presse?.length >= 10 ? q.presse : []).filter((n) => cotes[n] > 1)
  if (presse.length < 10) continue

  const cc = CAR[q.date + '|' + q.id]
  if (!cc || cc.erreur) { sansFormes++; continue }

  let g
  try { g = buildGrid(presse, nums) } catch { continue }
  const groupes = g.groupes.map((gr) => ({
    id: gr.id,
    cases: gr.cases.filter((c) => c.num != null).map((c) => ({ num: c.num, place: c.place, slot: c.slot })),
  }))
  if (groupes.length < 5) continue

  /* le score physique, exactement comme le moteur le calcule */
  const courseJ = {
    dist: Number(q.distance) || 2500,
    surf: 'Gazon', sens: 'D',
    hippo: q.track || '',
    discipline: q.discipline || 'Plat',
  }
  const sp = {}
  for (const n of nums) {
    const c = cc.chevaux[n]
    const runs = ((c && c.runs) || []).map((r) => ({
      dist: r.dist || null,
      rang: r.place && r.place <= 9 ? r.place : null,
      hippo: codeHippo(r.track) || null,
      date: r.date || null,
    }))
    chevaux++
    if (runs.length) avecRun++
    sp[n] = runs.length ? scorePhysique({ valeur: null, musique: '' }, runs, courseJ) : null
  }

  const rang = Object.fromEntries(
    nums.slice().sort((a, b) => cotes[a] - cotes[b] || a - b).map((n, i) => [n, i + 1]))

  courses.push({ date: q.date, groupes, rang, sp, arrivee: q.arrivee.slice(0, 5) })
}
courses.sort((a, b) => a.date.localeCompare(b.date))
const N = courses.length

/* ─────────────────────────────── les règles ─────────────────────────────── */
const champ = (k) => (a, b, c) => {
  const sa = c.sp[a.num], sb = c.sp[b.num]
  if (!sa && !sb) return a.place - b.place
  if (!sa) return 1
  if (!sb) return -1
  return (sb[k] - sa[k]) || a.place - b.place
}
const R = {
  C: (cs) => cs.slice().sort((a, b) => a.place - b.place),
  M: (cs, c) => cs.slice().sort((a, b) => (c.rang[a.num] ?? 99) - (c.rang[b.num] ?? 99) || a.place - b.place),
  F: (cs, c) => cs.slice().sort((a, b) => {
    const sa = c.sp[a.num], sb = c.sp[b.num]
    if (!sa && !sb) return a.place - b.place
    if (!sa) return 1
    if (!sb) return -1
    return (sb.forme - sa.forme) || a.place - b.place
  }),
  D: (cs, c) => cs.slice().sort((a, b) => {
    const sa = c.sp[a.num], sb = c.sp[b.num]
    if (!sa && !sb) return a.place - b.place
    if (!sa) return 1
    if (!sb) return -1
    return (sb.distance - sa.distance) || a.place - b.place
  }),
  P: (cs, c) => cs.slice().sort((a, b) => {
    const sa = c.sp[a.num], sb = c.sp[b.num]
    if (!sa && !sb) return a.place - b.place
    if (!sa) return 1
    if (!sb) return -1
    return (sb.piste - sa.piste) || a.place - b.place
  }),
}
const NOM = { C: 'carnet', M: 'marché', F: 'phys. FORME', D: 'phys. DISTANCE', P: 'phys. PISTE' }
const TOKENS = ['C', 'M', 'F', 'D', 'P']

function ticket(course, combo) {
  const out = []
  for (let i = 0; i < 5; i++) {
    const gr = course.groupes.find((x) => x.id === IDS[i])
    if (!gr) continue
    out.push(...R[combo[i]](gr.cases, course).slice(0, QUOTA[IDS[i]]).map((x) => x.num))
  }
  return out
}

function noter(combo, liste) {
  let n5 = 0, n4 = 0, n3 = 0, s = 0
  for (const c of liste) {
    const t = new Set(ticket(c, combo))
    let k = 0
    for (const x of c.arrivee) if (t.has(x)) k++
    if (k >= 5) n5++
    if (k >= 4) n4++
    if (c.arrivee.slice(0, 3).every((x) => t.has(x))) n3++
    s += k
  }
  const n = liste.length || 1
  return { n, p5: n5 / n, p4: n4 / n, p3: n3 / n, moy: s / n, n5 }
}

/* ───────────────────────── 0. la couverture ─────────────────────────────── */
console.log('\n  QUINTÉS SEULEMENT — ' + N + ' courses, du ' + courses[0].date + ' au ' + courses[N - 1].date)
console.log('     partants examinés        ' + chevaux)
console.log('     avec au moins une forme  ' + avecRun + '  (' + pct(avecRun / chevaux) + ')')
console.log('     courses écartées (API)   ' + sansFormes)

const prod0 = noter(PROD, courses)
console.log('\n  LA PRODUCTION ' + PROD.join('') + ' (G1-G3 carnet · G4-G5 marché)')
console.log('     ' + pct(prod0.p5) + ' de 5/5 · ' + pct(prod0.p4) + ' ≥4 · ' + pct(prod0.p3) + ' 1-2-3 · ' + prod0.moy.toFixed(2) + ' x/5')

/* ─────────── 1. les familles, sur tout le corpus (indicatif) ────────────── */
console.log('\n  LES FAMILLES — même règle dans les 5 blocs (indicatif, in-sample)')
for (const x of TOKENS) {
  const r = noter(Array(5).fill(x), courses)
  console.log('     ' + pad(NOM[x], 20) + rp(pct(r.p5), 7) + ' 5/5 · ' + rp(pct(r.p4), 7) + ' ≥4 · ' +
    rp(pct(r.p3), 7) + ' 1-2-3 · ' + r.moy.toFixed(2) + ' x/5')
}

/* les familles dans CHAQUE moitié : une règle n'est crédible que si elle tient deux fois */
{
  const c2 = Math.floor(N / 2)
  const A = courses.slice(0, c2), B = courses.slice(c2)
  console.log('\n  LA MÊME CHOSE, MOITIÉ PAR MOITIÉ (une règle ne vaut que si elle tient des deux côtés)')
  console.log('     ' + pad('', 20) + pad('1ʳᵉ moitié', 16) + '2ᵈᵉ moitié')
  for (const x of TOKENS) {
    const a = noter(Array(5).fill(x), A), b = noter(Array(5).fill(x), B)
    console.log('     ' + pad(NOM[x], 20) + pad(pct(a.p5) + ' · ' + a.moy.toFixed(2), 16) + pct(b.p5) + ' · ' + b.moy.toFixed(2))
  }
  const a = noter(PROD, A), b = noter(PROD, B)
  console.log('     ' + pad('PRODUCTION CCCMM', 20) + pad(pct(a.p5) + ' · ' + a.moy.toFixed(2), 16) + pct(b.p5) + ' · ' + b.moy.toFixed(2))
}

/* ─────────── 2. un seul bloc change (indicatif, in-sample) ──────────────── */
console.log('\n  UN SEUL BLOC CHANGE (les quatre autres restent en production)')
console.log('  ' + pad('bloc', 6) + pad('carnet', 18) + pad('marché', 18) + pad('FORME', 18) + pad('DISTANCE', 18) + 'PISTE')
for (let i = 0; i < 5; i++) {
  const cells = TOKENS.map((x) => {
    const c2 = PROD.slice(); c2[i] = x
    const r = noter(c2, courses)
    return pct(r.p5) + ' · ' + r.moy.toFixed(2)
  })
  console.log('  ' + pad(IDS[i], 6) + cells.map((s) => pad(s, 18)).join(''))
}

/* ─────────── 3. LE TEST HORS ÉCHANTILLON — deux périodes ───────────────── */
const COMBOS = []
for (let m = 0; m < Math.pow(5, 5); m++) {
  let x = m, s = []
  for (let i = 0; i < 5; i++) { s.push(TOKENS[x % 5]); x = Math.floor(x / 5) }
  COMBOS.push(s)
}
const choisirSur = (app, crit = 'p5') => {
  let best = null
  for (const combo of COMBOS) {
    const r = noter(combo, app)
    if (!best) { best = { combo, r }; continue }
    const a = crit === 'moy' ? r.moy - best.r.moy : r.p5 - best.r.p5
    const b = crit === 'moy' ? r.p5 - best.r.p5 : r.moy - best.r.moy
    if (a > 0 || (a === 0 && b > 0)) best = { combo, r }
  }
  return best
}

console.log('\n  TEST HORS ÉCHANTILLON — la règle se choisit sur une période, se mesure sur l’autre')
console.log('  (aucune course ne sert deux fois)\n')

/* 2 périodes — deux critères de sélection : le 5/5 (rare) et les chevaux trouvés (dense) */
const coupe = Math.floor(N / 2)
const P1 = courses.slice(0, coupe), P2 = courses.slice(coupe)
for (const crit of ['p5', 'moy']) {
  console.log('  ── sélection par ' + (crit === 'p5' ? 'le 5/5 (événement rare : 11 %)' : 'les chevaux trouvés (métrique dense)') + ' ──\n')
  let totN = 0, totPhys = 0, totProd = 0, totMoy = 0
  for (const [app, test, nomApp, nomTest] of [[P1, P2, 'A', 'B'], [P2, P1, 'B', 'A']]) {
    const best = choisirSur(app, crit)
    const t = noter(best.combo, test)
    const p = noter(PROD, test)
    totN += test.length; totPhys += t.n5; totProd += p.n5; totMoy += t.moy * test.length
    console.log('     période ' + nomApp + ' (' + app.length + ' c.) → règle retenue : ' + best.combo.join(' ') +
      '   (' + (crit === 'moy' ? best.r.moy.toFixed(2) + ' x/5' : pct(best.r.p5)) + ' à l’apprentissage)')
    console.log('        testée sur ' + nomTest + ' : ' + pct(t.p5) + ' de 5/5 (' + t.n5 + '/' + test.length + ') · ' +
      t.moy.toFixed(2) + ' x/5   |   production : ' + pct(p.p5) + ' (' + p.n5 + '/' + test.length + ') · ' + p.moy.toFixed(2) + ' x/5')
  }
  console.log('     TOTAL hors échantillon (' + totN + ' c.) : règle choisie ' + pct(totPhys / totN) + ' (' + totPhys + ') · ' +
    totMoy / totN + ' x/5   |   production ' + pct(totProd / totN) + ' (' + totProd + ')\n')
}

/* 4 périodes — rotation */
console.log('\n  ROTATION EN 4 PÉRIODES (plus solide : 4 tests indépendants)')
const q4 = Math.floor(N / 4)
const parts = [courses.slice(0, q4), courses.slice(q4, 2 * q4), courses.slice(2 * q4, 3 * q4), courses.slice(3 * q4)]
let rN = 0, rPhys = 0, rProd = 0
for (let k = 0; k < 4; k++) {
  const test = parts[k]
  const app = parts.filter((_, j) => j !== k).flat()
  const best = choisirSur(app)
  const t = noter(best.combo, test)
  const p = noter(PROD, test)
  rN += test.length; rPhys += t.n5; rProd += p.n5
  console.log('     test ' + (k + 1) + ' (' + test.length + ' c.) : ' + best.combo.join(' ') +
    ' → ' + pct(t.p5) + ' (' + t.n5 + ') · production ' + pct(p.p5) + ' (' + p.n5 + ')')
}
console.log('     ─────────────────────────────────────────────────────')
console.log('     physiques ' + pct(rPhys / rN) + ' (' + rPhys + '/' + rN + ')   ·   production ' + pct(rProd / rN) + ' (' + rProd + '/' + rN + ')')
