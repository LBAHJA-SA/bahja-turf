/* tools/neutral-scan-fullsig.mjs — اختبار التواقيع الكاملة للعائلات.
 * يستخرج كل تكوين عائلة كامل (FAV1-OUT3-TOC1، FAV2-FAV3-OUT1، ...)
 * ويختبر: argmax الكامل، top-K الكامل، وتوزيع النجاح/الفشل لكل توقيع.
 * Usage: node tools/neutral-scan-fullsig.mjs [N=200]
 */
import { charger } from './empreinte-couple.mjs'

const N = Math.max(1, Number(process.argv[2]) || 200)

const BOUNDS = [
  ['FAV1', 0, 3.0], ['FAV2', 3.1, 7.0], ['FAV3', 7.1, 10.0],
  ['OUT1', 10.1, 13.0], ['OUT2', 13.1, 16.0], ['OUT3', 16.1, 18.0],
  ['TOC1', 18.1, 21.0], ['TOC2', 21.1, 25.0], ['TOC3', 25.1, 28.0],
  ['TOC4', 28.1, 31], ['TOC5', 31.1, 36], ['TOC6', 36.1, 40],
  ['TOC7', 40.1, 50], ['TOC8', 50.1, 100]
]
function famille(cote) {
  const n = Number(cote)
  if (!Number.isFinite(n) || n <= 0) return null
  for (const [nom, lo, hi] of BOUNDS) if (n >= lo && n <= hi) return nom
  if (n > 100) return 'TOC8'
  return null
}

const rangs = (c) => {
  const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num)
  const m = new Map(o.map((x, i) => [x.num, i + 1]))
  return { parNum: m, parRang: new Map([...m.entries()].map(([n, r]) => [r, n])), fam: new Map(o.map((x, i) => [x.num, famille(x.c)])) }
}

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
console.log('corpus=' + tout.length + ' tests=' + tests.length)

const key = { trio: (r) => r.join('-'), p12: (r) => r[0] + '-' + r[1], p13: (r) => r[0] + '-' + r[2], p23: (r) => r[1] + '-' + r[2] }
const val = { trio: (r) => r.every((x) => x != null), p12: (r) => r[0] != null && r[1] != null, p13: (r) => r[0] != null && r[2] != null, p23: (r) => r[1] != null && r[2] != null }
const rr = (c) => { const { parNum, fam } = rangs(c); return c.arrivee.slice(0, 3).map((n) => fam.get(n) ?? null) }

// 1. نبني تكرار كل توقيع كامل في الماضي
const globalFreq = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
for (const c of tout.slice(0, -N)) {
  const r = rr(c)
  for (const t of Object.keys(globalFreq)) { if (!val[t](r)) continue; const k = key[t](r); globalFreq[t].set(k, (globalFreq[t].get(k) || 0) + 1) }
}

// 2. نختبر على السباقات الاختبارية
const results = { argmax: { trio: [0,0], p12: [0,0], p13: [0,0], p23: [0,0] }, top10: { trio: [0,0], p12: [0,0], p13: [0,0], p23: [0,0] } }
const failDetail = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() } // sig -> {hit, miss}
const hitDetail = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }

const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const freq = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
  for (const c of passe) { const r = rr(c); for (const t of Object.keys(freq)) { if (!val[t](r)) continue; const k = key[t](r); freq[t].set(k, (freq[t].get(k) || 0) + 1) } }
  const vrai = rr(course)
  const { fam } = rangs(course)
  for (const t of Object.keys(val)) {
    if (!val[t](vrai)) continue
    const vk = key[t](vrai)
    // argmax الكامل
    let bk = null, bn = -1
    for (const [k, n] of freq[t]) if (n > bn) { bn = n; bk = k }
    if (bk) {
      results.argmax[t][1]++
      const want = bk.split('-')
      const pred = (t === 'trio' ? [0,1,2] : t === 'p12' ? [0,1] : t === 'p13' ? [0,2] : [1,2])
        .map((j, i2) => { for (const [num, f] of fam) if (f === want[i2]) return num; return null })
      if (!pred.some(x => x == null) && pred.every((p, i2) => p === course.arrivee.slice(0, 3)[i2])) results.argmax[t][0]++
      else failDetail[t].set(bk, (failDetail[t].get(bk) || 0) + 1)
    }
    // top-10 الكامل
    const top10 = [...freq[t].entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(x=>x[0])
    if (top10.length) {
      results.top10[t][1]++
      let hit = false
      for (const pk of top10) {
        const want = pk.split('-')
        const pred = (t === 'trio' ? [0,1,2] : t === 'p12' ? [0,1] : t === 'p13' ? [0,2] : [1,2])
          .map((j, i2) => { for (const [num, f] of fam) if (f === want[i2]) return num; return null })
        if (!pred.some(x => x == null) && pred.every((p, i2) => p === course.arrivee.slice(0, 3)[i2])) { hit = true; break }
      }
      if (hit) results.top10[t][0]++
      else { for (const pk of top10) failDetail[t].set(pk, (failDetail[t].get(pk) || 0) + 1) }
    }
    // تسجل التوقيع الحقيقي
    hitDetail[t].set(vk, (hitDetail[t].get(vk) || 0) + 1)
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})

console.log('')
console.log('== التواقيع الكاملة للعائلات (' + N + ' سباقات، ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
for (const mode of ['argmax', 'top10']) {
  console.log('  --- ' + mode + ' ---')
  for (const t of Object.keys(results[mode])) {
    const [h, n] = results[mode][t]
    if (!n) continue
    console.log('    ' + t + ': ' + h + '/' + n + ' = ' + (h/n*100).toFixed(2) + '%')
  }
}

console.log('')
console.log('  --- أعلى 15 توقيع حقيقي في الاختبار ---')
for (const t of Object.keys(hitDetail)) {
  const top = [...hitDetail[t].entries()].sort((a,b)=>b[1]-a[1]).slice(0,15)
  console.log('  ' + t + ': ' + top.map(([s,n])=>s+'('+n+')').join('  '))
}

console.log('')
console.log('  --- أعلى 15 توقيع فشلت فيه argmax ---')
for (const t of Object.keys(failDetail)) {
  const top = [...failDetail[t].entries()].sort((a,b)=>b[1]-a[1]).slice(0,15)
  console.log('  ' + t + ': ' + top.map(([s,n])=>s+'('+n+')').join('  '))
}

console.log('')
console.log('  --- أعلى 15 توقيع فشلت فيه top10 ---')
for (const t of Object.keys(failDetail)) {
  // نفس الكائن يجمع argmax + top10 fails
  const top = [...failDetail[t].entries()].sort((a,b)=>b[1]-a[1]).slice(0,15)
  console.log('  ' + t + ': ' + top.map(([s,n])=>s+'('+n+')').join('  '))
}