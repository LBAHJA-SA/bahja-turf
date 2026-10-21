/* tools/neutral-scan.mjs — اختبار محايد 100% على الأرشيف كاملًا.
 * لا عائلات، لا فافوري، لا OUT/TOC — فقط رتب السوق (1,2,3...) الخام.
 * سببي صارم: لكل سباق اختبار، نبني التكرار من الماضي الصارم (date < test.date).
 * نختبر كل قاعدة اختيار ممكنة على التريو والكوبليه، ونقيس hit rate حقيقية.
 * Usage: node tools/neutral-scan.mjs [N=200]
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
console.log('corpus=' + tout.length + ' tests=' + tests.length + ' (' + tests[0].date + ' -> ' + tests[tests.length - 1].date + ')')

const key = { trio: (r) => r.join(','), p12: (r) => r[0] + ',' + r[1], p13: (r) => r[0] + ',' + r[2], p23: (r) => r[1] + ',' + r[2] }
const val = { trio: (r) => r.every((x) => x != null), p12: (r) => r[0] != null && r[1] != null, p13: (r) => r[0] != null && r[2] != null, p23: (r) => r[1] != null && r[2] != null }
const rr = (c) => { const { parNum } = rangs(c); return c.arrivee.slice(0, 3).map((n) => parNum.get(n) ?? null) }

const testsCount = { trio: 0, p12: 0, p13: 0, p23: 0 }
const hitCount = { trio: 0, p12: 0, p13: 0, p23: 0 }

// قواعد مرشحة للاختبار المحايد
const rules = {
  // 1. الأكثر تكرارًا في الماضي (argmax)
  argmax: (freq, t) => { let bk=null,bn=-1; for(const [k,n] of freq[t]) if(n>bn){bn=n;bk=k} return bk },
  // 2. أعلى-K تكرارًا (مجموعة)
  topK: (freq, t, K) => [...freq[t].entries()].sort((a,b)=>b[1]-a[1]).slice(0,K).map(x=>x[0]),
  // 3. التكوينات التي فيها رتبة 1 (الفافوري الفعلي، ليس عائلة)
  withRank1: (freq, t) => [...freq[t].entries()].filter(([k])=>k.split(',')[0]==='1').sort((a,b)=>b[1]-a[1]).map(x=>x[0]),
  // 4. التكوينات التي فيها رتبة >3 (أوتسايدر حقيقي)
  withOutsider: (freq, t) => [...freq[t].entries()].filter(([k])=>k.split(',').some(r=>Number(r)>3)).sort((a,b)=>b[1]-a[1]).map(x=>x[0]),
  // 5. التكوينات التي رتبها متتالية (1,2,3 أو 2,3,4...)
  sequential: (freq, t) => [...freq[t].entries()].filter(([k])=>{const r=k.split(',').map(Number); return r.every((v,i,a)=>i===0||v===a[i-1]+1)}).sort((a,b)=>b[1]-a[1]).map(x=>x[0]),
}

const results = {}
for (const rName of Object.keys(rules)) results[rName] = { trio: [0,0], p12: [0,0], p13: [0,0], p23: [0,0] }

const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const freq = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
  for (const c of passe) { const r = rr(c); for (const t of Object.keys(freq)) { if (!val[t](r)) continue; const k = key[t](r); freq[t].set(k, (freq[t].get(k) || 0) + 1) } }
  const vrai = rr(course)
  const { parRang } = rangs(course)
  for (const t of Object.keys(val)) {
    if (!val[t](vrai)) continue
    const vk = key[t](vrai)
    testsCount[t]++
    for (const rName of Object.keys(rules)) {
      const rule = rules[rName]
      let preds = []
      if (rName === 'topK') preds = rule(freq, t, 10)
      else preds = rule(freq, t)
      if (!preds.length) continue
      results[rName][t][1]++
      const pos = t === 'trio' ? [0,1,2] : t === 'p12' ? [0,1] : t === 'p13' ? [0,2] : [1,2]
      for (const pk of preds) {
        const want = pk.split(',').map(Number)
        if (want.some((r) => !parRang.has(r))) continue
        const pred = pos.map((j, i2) => parRang.get(want[i2]))
        if (pos.every((j, i2) => pred[i2] === vrai[j])) { results[rName][t][0]++; break }
      }
    }
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})

console.log('')
console.log('== TEST NEUTRE (' + N + ' سباقات، ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
for (const rName of Object.keys(results)) {
  console.log('  --- ' + rName + ' ---')
  for (const t of Object.keys(results[rName])) {
    const [h, n] = results[rName][t]
    if (!n) continue
    console.log('    ' + t + ': ' + h + '/' + n + ' = ' + (h/n*100).toFixed(2) + '%')
  }
}
console.log('  اختبارات صالحة: ' + JSON.stringify(testsCount))