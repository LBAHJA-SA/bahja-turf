/* tools/comparatif.mjs — ANCIEN MOTEUR vs GROUPE-top1 vs FAVORI vs HASARD.
 * Même fenêtre (150 dernières), même protocole causal (date < test.date),
 * par test séparé (trio, P12, P13, P23), ordre exact. Un seul passage.
 * Usage : node tools/comparatif.mjs [N=150]
 */
import { charger } from './empreinte-couple.mjs'
import { construireIndex } from './empreinte-v3.mjs'
import { verdict } from '../backend/COUPLE/moteur.js'

const N = Math.max(1, Number(process.argv[2]) || 150)
const rangs = (c) => { const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num); const m = new Map(o.map((x, i) => [x.num, i + 1])); return { m, n: o.length } }
const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
const key = { trio: (r) => r.join(','), p12: (r) => r[0] + ',' + r[1], p13: (r) => r[0] + ',' + r[2], p23: (r) => r[1] + ',' + r[2] }
const val = { trio: (r) => r.every((x) => x != null), p12: (r) => r[0] != null && r[1] != null, p13: (r) => r[0] != null && r[2] != null, p23: (r) => r[1] != null && r[2] != null }
const rr = (c) => { const { m } = rangs(c); return c.arrivee.slice(0, 3).map((n) => m.get(n) ?? null) }

const old = { trio: [0, 0], p12: [0, 0], p13: [0, 0], p23: [0, 0] } // [hit, n]
const grp = { trio: [0, 0], p12: [0, 0], p13: [0, 0], p23: [0, 0] }
const fav = { trio: [0, 0], p12: [0, 0], p13: [0, 0], p23: [0, 0] }
let has = 0
const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const a = course.arrivee.slice(0, 3)
  const vrai = rr(course)
  const { n: tail } = rangs(course)
  has += 1 / (tail * (tail - 1) * (tail - 2))
  // ancien moteur
  const v = verdict(course.partants, construireIndex(passe))
  if (v && v.trio) {
    const t = v.trio
    if (t[0] === a[0] && t[1] === a[1] && t[2] === a[2]) old.trio[0]++; old.trio[1]++
    if (t[0] === a[0] && t[1] === a[1]) old.p12[0]++; old.p12[1]++
    if (t[0] === a[0] && t[2] === a[2]) old.p13[0]++; old.p13[1]++
    if (t[1] === a[1] && t[2] === a[2]) old.p23[0]++; old.p23[1]++
  }
  // groupe top-1 passé
  const freq = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
  for (const c of passe) { const r = rr(c); for (const t of Object.keys(freq)) { if (!val[t](r)) continue; const k = key[t](r); freq[t].set(k, (freq[t].get(k) || 0) + 1) } }
  const { m: mm } = rangs(course)
  const parR = new Map([...mm.entries()].map(([num, r]) => [r, num]))
  for (const t of Object.keys(grp)) {
    if (!val[t](vrai)) continue
    let bk = null, bn = -1
    for (const [k, n] of freq[t]) if (n > bn) { bn = n; bk = bk = k }
    if (bk == null) continue
    const want = bk.split(',').map(Number)
    const pos = t === 'trio' ? [0, 1, 2] : t === 'p12' ? [0, 1] : t === 'p13' ? [0, 2] : [1, 2]
    if (want.some((r, j) => !parR.has(r))) continue
    grp[t][1]++
    if (pos.every((j, k2) => parR.get(want[k2]) === a[j])) grp[t][0]++
  }
  // favori (rangs 1,2,3)
  const fo = [...mm.entries()].sort((x, y) => x[1] - y[1]).map((x) => x[0])
  if (fo.length >= 3) {
    if (fo[0] === a[0] && fo[1] === a[1] && fo[2] === a[2]) fav.trio[0]++; fav.trio[1]++
    if (fo[0] === a[0] && fo[1] === a[1]) fav.p12[0]++; fav.p12[1]++
    if (fo[0] === a[0] && fo[2] === a[2]) fav.p13[0]++; fav.p13[1]++
    if (fo[1] === a[1] && fo[2] === a[2]) fav.p23[0]++; fav.p23[1]++
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})
const pct = (h, n) => (h / Math.max(1, n) * 100).toFixed(2) + '%'
console.log('')
console.log('== COMPARATIF (' + N + ' courses, ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
for (const t of ['trio', 'p12', 'p13', 'p23'])
  console.log('  ' + t + ' : ancien=' + old[t][0] + '/' + old[t][1] + ' ' + pct(old[t][0], old[t][1])
    + ' · groupeTop1=' + grp[t][0] + '/' + grp[t][1] + ' ' + pct(grp[t][0], grp[t][1])
    + ' · favori=' + fav[t][0] + '/' + fav[t][1] + ' ' + pct(fav[t][0], fav[t][1]))
console.log('  hasard trio (esp.) : ' + pct(has, N))
