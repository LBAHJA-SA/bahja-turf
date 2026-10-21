/* tools/contrarian-3.mjs — قاعدة عكسية: 3 خيول من التكوينات التي فيها أوتسايدر.
 * سببي صارم (date < test.date). K=10 تكوينات سابقة فيها رتبة >3.
 * يحسب لكل حصان اليوم "كم ظهر في تلك التكوينات" → يأخذ أعلى 3.
 * Usage: node tools/contrarian-3.mjs [N=200]
 */
import { charger } from './empreinte-couple.mjs'

const N = Math.max(1, Number(process.argv[2]) || 200)

const rangs = (c) => {
  const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num)
  const m = new Map(o.map((x, i) => [x.num, i + 1]))
  return { parNum: m, parRang: new Map([...m.entries()].map(([n, r]) => [r, n])) }
}

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
console.log('corpus=' + tout.length + ' tests=' + tests.length)

const key = { p12: (r) => r[0] + ',' + r[1], p13: (r) => r[0] + ',' + r[2], p23: (r) => r[1] + ',' + r[2] }
const val = { p12: (r) => r[0] != null && r[1] != null, p13: (r) => r[0] != null && r[2] != null, p23: (r) => r[1] != null && r[2] != null }
const rr = (c) => { const { parNum } = rangs(c); return c.arrivee.slice(0, 2).map((n) => parNum.get(n) ?? null) } // P12 فقط

const K = 10
let hit = 0, n = 0
const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const freq = new Map()
  for (const c of passe) {
    const r = rr(c)
    if (!val.p12(r)) continue
    if (r[0] > 3 || r[1] > 3) { // فقط التكوينات التي فيها أوتسايدر
      const k = key.p12(r)
      freq.set(k, (freq.get(k) || 0) + 1)
    }
  }
  if (!freq.size) return
  const topK = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, K)
  const { parRang } = rangs(course)
  const count = new Map() // num -> كم ظهر في topK
  for (const [cfg] of topK) {
    const [r1, r2] = cfg.split(',').map(Number)
    if (!parRang.has(r1) || !parRang.has(r2)) continue
    const n1 = parRang.get(r1), n2 = parRang.get(r2)
    count.set(n1, (count.get(n1) || 0) + 1)
    count.set(n2, (count.get(n2) || 0) + 1)
  }
  if (count.size < 3) return
  const top3 = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0])
  const vrai = course.arrivee.slice(0, 2)
  n++
  if (top3.includes(vrai[0]) && top3.includes(vrai[1])) hit++
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})

console.log('')
console.log('== CONTRARIAN-3 (P12 فقط، ' + N + ' سباقات، ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
console.log('  P12 hit: ' + hit + '/' + n + ' = ' + (hit / Math.max(1, n) * 100).toFixed(2) + '%')
console.log('  سباقات لعبت: ' + n + '/' + N)