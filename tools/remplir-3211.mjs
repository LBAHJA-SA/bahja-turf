/* ---------------------------------------------------------------
 * tools\remplir-3211.mjs  —  LE SEUL LEVIER QUI RESTE
 *
 *   node tools\remplir-3211.mjs
 *
 * Les quotas ne bougent pas : **3-2-1-1-1**, 8 chevaux. C'est dit, c'est
 * fermé. La seule question qui reste est donc :
 *
 *     À l'intérieur de 3-2-1-1-1, QUELS 8 chevaux ?
 *
 * Remplir un bloc, c'est choisir N chevaux parmi ceux que la presse y a
 * mis. On compare les façons de choisir, et on ne retient que ce qui
 * tient **hors échantillon** (5 plis : on choisit sur 4, on mesure sur le
 * 5e).
 *
 * Ce que le miss analysis a déjà dit, et qui sert de guide :
 *   · 0 cheval manquant venait de P1-P4  → les 3 du G1 par cote suffisent
 *   · 31 manquants sur 37 venaient de P5-P8, dont 65 % à cote 1-8
 *   · le G2 est la zone de valeur ; le G4/G5 sont sous le hasard
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreForme } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'presse-carriere.json')
const C = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return Math.round(x) }

const BLOCS = [{ id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 }, { id: 'G3', min: 9, max: 10 }, { id: 'G4', min: 11, max: 12 }, { id: 'G5', min: 13, max: 99 }]
const QUOTA = [3, 2, 1, 1, 1]

const brut = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = []
for (const k of Object.values(brut)) {
  if (!k.partants?.length || k.partants.length < 10) continue
  if (!k.arrivee?.length || k.arrivee.length < 5) continue
  const presse = (k.presse || []).filter((x) => k.arrivee.includes(x))
  const nums = presse.concat(k.arrivee.filter((x) => !presse.includes(x)))
  if (nums.length < 10) continue
  const pDe = new Map(nums.map((x, i) => [x, i + 1]))
  // le rang de COTE, calculé une fois pour toutes
  const avecC = Object.keys(k.cotes || {}).map(Number).filter((x) => k.cotes[x] > 0)
  const triC = avecC.sort((a, b) => k.cotes[a] - k.cotes[b])
  const cDe = new Map(triC.map((x, i) => [x, i + 1]))
  const parNum = new Map(k.partants.map((p) => [p.num, p]))
  base.push({ ...k, nums, pDe, cDe, cotes: k.cotes, parNum, nb: nums.length })
}
const n = base.length

const blocsDe = (k) => BLOCS.map((b) => k.nums.filter((num) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max }))
const stats = (p) => (p.nbVictoires || 0) * 3 + (p.nb2e || 0) * 2 + (p.nb3e || 0) * 1.5 + (p.nbPlaces || 0)

/* ------------------------------------------------------- les remplissages --- */
/* Tous rangés du MEILLEUR au MOINS BON. `desc = true` ⇒ score haut = bien. */
const R = {
  'rang de presse': { desc: false, f: (k, num) => k.pDe.get(num) },
  'cote': { desc: false, f: (k, num) => k.cotes[num] || 999 },
  'forme (musique)': { desc: true, f: (k, num) => scoreForme((k.parNum.get(num) || {}).musique, k.discipline).score },
  'stats PMU': { desc: true, f: (k, num) => stats(k.parNum.get(num) || {}) },
  'valeur': { desc: true, f: (k, num) => (k.parNum.get(num) || {}).valeur || 0 },
  'age (jeune)': { desc: false, f: (k, num) => (k.parNum.get(num) || {}).age ?? 9 },
  'corde': { desc: false, f: (k, num) => (k.parNum.get(num) || {}).corde || num },
  /* ⭐ les hybrides : le marché comme base, la presse ou la forme comme tri */
  'cote × forme': { desc: true, f: (k, num) => 1 / ((k.cotes[num] || 999) ** 0.5) * (1 + scoreForme((k.parNum.get(num) || {}).musique, k.discipline).score / 10) },
  'cote × stats': { desc: true, f: (k, num) => (1 / ((k.cotes[num] || 999) ** 0.5)) * (1 + stats(k.parNum.get(num) || {}) / 40) },
  'cote × valeur': { desc: true, f: (k, num) => (1 / ((k.cotes[num] || 999) ** 0.5)) * (((k.parNum.get(num) || {}).valeur || 30) / 35) },
  'cote × (rang presse)': { desc: true, f: (k, num) => 1 / (k.pDe.get(num) * 0.4 + (k.cotes[num] || 999) / 12) },
}

const construire = (k, nomRegle) => {
  const r = R[nomRegle]
  return blocsDe(k).flatMap((bloc, i) => bloc.slice().sort((a, b) => (r.desc ? r.f(k, b) - r.f(k, a) : r.f(k, a) - r.f(k, b))).slice(0, QUOTA[i]))
}

const noms = Object.keys(R)
const toutes = {}
for (const nom of noms) {
  toutes[nom] = base.map((k) => {
    const t = construire(k, nom)
    return { n: t.length, hits: k.arrivee.slice(0, 5).filter((x) => t.includes(x)).length, ticket: t }
  })
}

console.log('')
console.log(`  ⭐ À QUOI REMPLIR 3-2-1-1-1 ? — ${n} Quintés, 8 chevaux, quotas fixes`)
console.log('')
console.log('  remplissage                   0/5   1/5   2/5   3/5   4/5   5/5   moyen  ≥3/5  ≥4/5   5/5    €/€')
console.log('  ' + '-'.repeat(94))

const gainOrdre = (k) => {
  const d = k.dividends
  if (!Array.isArray(d)) return null
  const l = d.find((x) => x.bet_type === 'QUINTE_ORDRE' && /ordre/i.test(x.sub_type) && !/désordre/i.test(x.sub_type))
  if (!l) return null
  const v = parseFloat(String(l.payout).replace(',', '.'))
  return Number.isFinite(v) ? v : null
}
const eurosDe = (nom) => {
  let tot = 0
  let mise = 0
  let win = 0
  for (let i = 0; i < n; i++) {
    const g = gainOrdre(base[i])
    if (g == null) continue
    const c = C(toutes[nom][i].n, 5)
    if (!c) continue
    mise += c
    if (toutes[nom][i].hits === 5) { tot += g; win++ }
  }
  return { euro: mise ? tot / mise : 0, win }
}

for (const nom of noms) {
  const t = toutes[nom]
  const rep = [0, 0, 0, 0, 0, 0]
  t.forEach((x) => rep[x.hits]++)
  const moy = t.reduce((a, b) => a + b.hits, 0) / n
  const p = (x) => (t.filter((v) => v.hits >= x).length / n * 100).toFixed(0).padStart(5) + ' %'
  const ev = eurosDe(nom)
  console.log('  ' + nom.padEnd(26) + rep.map((v) => (v / n * 100).toFixed(0).padStart(6)).join('')
    + moy.toFixed(2).padStart(8) + p(3) + p(4) + p(5)
    + (ev.euro >= 100 ? ev.euro.toFixed(0) : ev.euro.toFixed(2)).padStart(8) + String(ev.win).padStart(5))
}

/* ---------------------------------------------- référence : le marché plat --- */
const plat = base.map((k) => {
  const t = [...k.cDe.entries()].sort((a, b) => a[1] - b[1]).map((x) => x[0]).slice(0, 8)
  return { n: t.length, hits: k.arrivee.slice(0, 5).filter((x) => t.includes(x)).length, ticket: t }
})
const repP = [0, 0, 0, 0, 0, 0]
plat.forEach((x) => repP[x.hits]++)
let tp = 0
let mp = 0
let wp = 0
for (let i = 0; i < n; i++) {
  const g = gainOrdre(base[i])
  if (g == null) continue
  const c = C(plat[i].n, 5)
  mise: mp += c
  if (plat[i].hits === 5) { tp += g; wp++ }
}
console.log('  ' + '-'.repeat(94))
console.log('  ' + 'RÉFÉRENCE : marché plat'.padEnd(26) + repP.map((v) => (v / n * 100).toFixed(0).padStart(6)).join('')
  + (plat.reduce((a, b) => a + b.hits, 0) / n).toFixed(2).padStart(8)
  + (plat.filter((v) => v.hits >= 3).length / n * 100).toFixed(0).padStart(5) + ' %'
  + (plat.filter((v) => v.hits >= 4).length / n * 100).toFixed(0).padStart(6) + ' %'
  + (plat.filter((v) => v.hits >= 5).length / n * 100).toFixed(0).padStart(5) + ' %'
  + (mp ? tp / mp : 0).toFixed(2).padStart(8) + String(wp).padStart(5))
console.log('  (le marché plat NE RESPECTE PAS 3-2-1-1-1 : il est hors méthode)')

/* ------------------------------------------------------------- out of sample --- */
console.log('')
console.log('  ⭐⭐ HORS ÉCHANTILLON — 5 plis, le choix se fait sur 4, la mesure sur le 5e')
console.log('')
const K = 5
let total = 0
let choisi = 0
for (let f = 0; f < K; f++) {
  const train = base.map((_, i) => i).filter((i) => i % K !== f)
  const test = base.map((_, i) => i).filter((i) => i % K === f)
  let best = null
  for (const nom of noms) {
    const moy = train.reduce((s, i) => s + toutes[nom][i].hits, 0) / train.length
    if (!best || moy > best.v) best = { nom, v: moy }
  }
  const ob = test.reduce((s, i) => s + toutes[best.nom][i].hits, 0)
  total += ob
  if (f === 0) choisi = best.nom
  console.log(`  pli ${f + 1}  gagnante : ${best.nom.padEnd(24)} (${best.v.toFixed(2)})  ->  test : ${(ob / test.length).toFixed(2)}`)
}
console.log('  ' + '-'.repeat(94))
console.log(`  HORS ÉCHANTILLON : ${total} / ${n * 5} = ${(total / n).toFixed(2)} par course`)
console.log(`  le marché plat donnerait ${(plat.reduce((a, b) => a + b.hits, 0) / n).toFixed(2)}  ·  le hasard 8 chevaux ${(base.reduce((s, k) => s + 40 / k.nb, 0) / n).toFixed(2)}`)
console.log('')
console.log('  ⭐ LA RÈGLE QUI TIENT : ' + choisi)
console.log('')
