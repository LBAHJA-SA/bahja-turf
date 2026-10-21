/* tools/neutral-scan-families.mjs — اختبار محايد بالعائلات ODDS_LAYER_BOUNDS.
 * نفس الحدود التي طلبتها، مطبقة على cote_pmu → عائلة، ثم نبني بصمات العائلات
 * ونختبر نفس القواعد. سببي صارم (date < test.date).
 * Usage: node tools/neutral-scan-families.mjs [N=200]
 */
import { charger } from './empreinte-couple.mjs'

const N = Math.max(1, Number(process.argv[2]) || 200)

/* حدودك حرفيًا */
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

const rules = {
  argmax: (freq, t) => { let bk=null,bn=-1; for(const [k,n] of freq[t]) if(n>bn){bn=n;bk=k} return bk },
  topK: (freq, t, K) => [...freq[t].entries()].sort((a,b)=>b[1]-a[1]).slice(0,K).map(x=>x[0]),
  withFAV: (freq, t) => [...freq[t].entries()].filter(([k])=>k.split('-').some(f=>f.startsWith('FAV'))).sort((a,b)=>b[1]-a[1]).map(x=>x[0]),
  withOUT: (freq, t) => [...freq[t].entries()].filter(([k])=>k.split('-').some(f=>f.startsWith('OUT'))).sort((a,b)=>b[1]-a[1]).map(x=>x[0]),
  withTOC: (freq, t) => [...freq[t].entries()].filter(([k])=>k.split('-').some(f=>f.startsWith('TOC'))).sort((a,b)=>b[1]-a[1]).map(x=>x[0]),
  withOUTorTOC: (freq, t) => [...freq[t].entries()].filter(([k])=>k.split('-').some(f=>f.startsWith('OUT')||f.startsWith('TOC'))).sort((a,b)=>b[1]-a[1]).map(x=>x[0]),
  allFAV: (freq, t) => [...freq[t].entries()].filter(([k])=>k.split('-').every(f=>f.startsWith('FAV'))).sort((a,b)=>b[1]-a[1]).map(x=>x[0]),
}

const results = {}
for (const rName of Object.keys(rules)) results[rName] = { trio: [0,0], p12: [0,0], p13: [0,0], p23: [0,0] }

const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const freq = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
  for (const c of passe) { const r = rr(c); for (const t of Object.keys(freq)) { if (!val[t](r)) continue; const k = key[t](r); freq[t].set(k, (freq[t].get(k) || 0) + 1) } }
  const vrai = rr(course)
  const { parRang, fam } = rangs(course)
  for (const t of Object.keys(val)) {
    if (!val[t](vrai)) continue
    const vk = key[t](vrai)
    for (const rName of Object.keys(rules)) {
      const rule = rules[rName]
      let preds = rName === 'topK' ? rule(freq, t, 10) : rule(freq, t)
      if (!preds.length) continue
      results[rName][t][1]++
      const pos = t === 'trio' ? [0,1,2] : t === 'p12' ? [0,1] : t === 'p13' ? [0,2] : [1,2]
      for (const pk of preds) {
        const want = pk.split('-')
        if (want.some((f) => !f)) continue
        // map family -> horse in today's race
        const pred = pos.map((j, i2) => {
          const targetFam = want[i2]
          for (const [num, f] of fam) if (f === targetFam) return num
          return null
        })
        if (pred.some((x) => x == null)) continue
        if (pos.every((j, i2) => pred[i2] === course.arrivee.slice(0, 3)[j])) { results[rName][t][0]++; break }
      }
    }
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})

console.log('')
console.log('== TEST NEUTRE بالعائلات (' + N + ' سباقات، ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
for (const rName of Object.keys(results)) {
  console.log('  --- ' + rName + ' ---')
  for (const t of Object.keys(results[rName])) {
    const [h, n] = results[rName][t]
    if (!n) continue
    console.log('    ' + t + ': ' + h + '/' + n + ' = ' + (h/n*100).toFixed(2) + '%')
  }
}