/**
 * « DEUX FACES DE LA MÊME PIÈCE » — la cote est-elle la forme déguisée ?
 *
 * Le marché ne devine pas : il paie la FORME récente, la distance, le poids,
 * la piste. Notre score de forme en est le résumé. Il faut le mesurer.
 *
 * ⚠ La corrélation se calcule À L'INTÉRIEUR de chaque course : les cotes
 *   n'ont pas la même échelle d'un hippodrome à l'autre (Auteuil ≠ Longchamp).
 *
 *   node tools\monnaie.mjs
 */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const mes = JSON.parse(fs.readFileSync('data/mesure.json', 'utf8'))

const courses = []
for (const d of Object.keys(db).sort()) {
  if (!db[d].arrivee?.length || !mes[d]?.cotes) continue
  const r = db[d]
  courses.push({
    d,
    blocs: buildGrid(r.synthese, r.runners).groupes,
    sc: Object.fromEntries((r.scores || []).map((x) => [x.num, x])),
    co: Object.fromEntries(mes[d].cotes.map((x) => [x.num, x])),
    arrivee: r.arrivee.slice(0, 5),
  })
}

/** rang 1 = le meilleur. dec = false → le plus petit d'abord (cote) */
function rangs(nums, val, dec = true) {
  return nums
    .map((n) => ({ n, v: val(n) }))
    .filter((x) => x.v != null)
    .sort((a, b) => (dec ? b.v - a.v : a.v - b.v))
    .reduce((acc, x, i) => { acc[x.n] = i + 1; return acc }, {})
}
const spearman = (ra, rb, nums) => {
  const xs = nums.map((n) => ra[n]).filter((x) => x != null)
  const ys = nums.map((n) => rb[n]).filter((x) => x != null)
  if (xs.length < 3) return null
  const d2 = xs.reduce((s, x, i) => s + (x - ys[i]) ** 2, 0)
  return 1 - (6 * d2) / (xs.length * (xs.length ** 2 - 1))
}

/* ═══ 1. corrélation de RANG, course par course ═══ */
console.log('\n' + '='.repeat(100))
console.log('  1. SPEARMAN — deux variables sont-elles la même chose ?')
console.log('     (calculé DANS chaque course : les cotes n\'ont pas la même échelle partout)')
console.log('='.repeat(100) + '\n')
console.log('  course        n     forme↔cote   forme↔presse   cote↔presse')
const corrs = { fc: [], fp: [], cp: [] }
for (const cc of courses) {
  const nums = Object.keys(cc.sc).map(Number).filter((n) => cc.co[n])
  const rf = rangs(nums, (n) => cc.sc[n].forme)
  const rc = rangs(nums, (n) => cc.co[n].cote, false)
  const rp = rangs(nums, (n) => -Object.keys(cc.sc).indexOf(n))          // placeholder, remplacé plus bas
  const ordrePresse = new Map()
  cc.blocs.forEach((g) => g.cases.forEach((c, i) => ordrePresse.set(c.num, ordrePresse.size)))
  const rr = rangs(nums, (n) => -ordrePresse.get(n))
  const a = spearman(rf, rc, nums), b = spearman(rf, rr, nums), c = spearman(rc, rr, nums)
  corrs.fc.push(a); corrs.fp.push(b); corrs.cp.push(c)
  console.log('  ' + cc.d + String(nums.length).padStart(7)
    + (a?.toFixed(3) ?? '  —').padStart(15) + (b?.toFixed(3) ?? '  —').padStart(16) + (c?.toFixed(3) ?? '  —').padStart(15))
}
const moy = (x) => x.reduce((a, b) => a + b, 0) / x.length
console.log('\n  MOYENNE        ' + moy(corrs.fc).toFixed(3).padStart(12) + moy(corrs.fp).toFixed(3).padStart(16) + moy(corrs.cp).toFixed(3).padStart(15))
console.log('\n  ρ = +1  les deux variables parfaitement confondues.')
console.log('  ρ ≈ 0  elles ne disent rien l\'une de l\'autre.')

/* ═══ 2. dans un bloc : le même cheval sort-il des DEUX tris ? ═══ */
const cmpF = (a, b) => (b.s?.forme ?? 0) - (a.s?.forme ?? 0)
const cmpC = (a, b) => ((a.co?.cote ?? 1e9) - (b.co?.cote ?? 1e9))
const cmpP = (a, b) => a.rang - b.rang
const classer = (bloc, cmp, cc) => {
  const tri = bloc.cases.map((c) => ({ num: c.num, rang: c.slot, s: cc.sc[c.num], co: cc.co[c.num] })).sort(cmp)
  return Object.fromEntries(tri.map((c, i) => [c.num, i + 1]))
}
const jouer = (cc, cmp) => {
  const pris = []
  for (const g of cc.blocs) {
    const r = classer(g, cmp, cc)
    pris.push(...g.cases.filter((c) => r[c.num] <= g.quota).map((c) => c.num))
  }
  return [...new Set(pris)]
}

console.log('\n' + '='.repeat(100))
console.log('  2. DANS UN BLOC — forme et cote choisissent-elles le même cheval ?')
console.log('='.repeat(100) + '\n')
let idem = 0, blocs = 0
for (const cc of courses) {
  console.log('  ' + cc.d)
  for (const g of cc.blocs) {
    const rf = classer(g, cmpF, cc), rc = classer(g, cmpC, cc)
    const q = Math.min(g.quota, g.cases.length)
    const sf = g.cases.filter((c) => rf[c.num] <= q).map((c) => c.num).sort((a, b) => a - b)
    const sc2 = g.cases.filter((c) => rc[c.num] <= q).map((c) => c.num).sort((a, b) => a - b)
    const meme = JSON.stringify(sf) === JSON.stringify(sc2)
    if (meme) idem++
    blocs++
    console.log('    ' + g.id + '  quota ' + g.quota + '/' + g.cases.length
      + '   forme → ' + String(sf).padEnd(15) + ' cote → ' + String(sc2).padEnd(15) + (meme ? 'IDENTIQUE' : 'diffèrent'))
  }
}
console.log('\n  → blocs où les DEVS tris retiennent le même cheval : ' + idem + '/' + blocs)

/* ═══ 3. la combinaison ═══ */
console.log('\n' + '='.repeat(100))
console.log('  3. LA COMBINAISON — si c\'est la même pièce, elle ne peut pas gagner plus')
console.log('='.repeat(100) + '\n')
const REGLES = {
  'forme ↓': cmpF,
  'cote ↑': cmpC,
  'forme ↓ puis cote ↑': (a, b) => cmpF(a, b) || cmpC(a, b),
  'cote ↑ puis forme ↓': (a, b) => cmpC(a, b) || cmpF(a, b),
  'forme × cote (produit)': (a, b) =>
    (b.s?.forme ?? 0) * Math.log(1 / (b.co?.cote ?? 99)) - (a.s?.forme ?? 0) * Math.log(1 / (a.co?.cote ?? 99)),
  'presse ↑ (le carnet)': cmpP,
}
console.log('  règle                              01  02  03  04   TOTAL  5/5')
for (const [nom, cmp] of Object.entries(REGLES)) {
  const lgn = courses.map((cc) => cc.arrivee.filter((n) => jouer(cc, cmp).includes(n)).length)
  const t = lgn.reduce((a, b) => a + b, 0)
  console.log('  ' + nom.padEnd(32) + lgn.map((n) => String(n).padStart(4)).join('')
    + String(t).padStart(9) + '/20' + (lgn.some((n) => n === 5) ? '   1' : '    —'))
}
console.log('\n  hasard : 12.0/20')
