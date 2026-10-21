/* tools/inverse-rules.mjs — اختبار قواعد عكسية متعددة لـ P12 (3 خيول).
 * كل قاعدة تقلب منطق السوق: إقصاء الفافوري، لعب الكيلرز، تقاطع الفشل...
 * سببي صارم. Usage: node tools/inverse-rules.mjs [N=200]
 */
import { charger } from './empreinte-couple.mjs'

const N = Math.max(1, Number(process.argv[2]) || 200)

const rangs = (c) => {
  const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num)
  const parNum = new Map(o.map((x, i) => [x.num, i + 1]))
  const parRang = new Map([...parNum.entries()].map(([n, r]) => [r, n]))
  return { parNum, parRang, taille: o.length }
}

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
const rr = (c) => { const { parNum } = rangs(c); return c.arrivee.slice(0, 2).map((n) => parNum.get(n) ?? null) }

const rules = {
  // 1. لا تلعب الـ2 فافوري معاً — خذ الفافوري1 + 2 خيول من رتبة 4-8
  'kill-fav2': (course, passe) => {
    const { parRang } = rangs(course)
    if (!parRang.has(1) || !parRang.has(2)) return null
    const fav1 = parRang.get(1)
    const outsiders = []
    for (let r = 4; r <= Math.min(8, parRang.size); r++) if (parRang.has(r)) outsiders.push(parRang.get(r))
    if (outsiders.length < 2) return null
    // خذ الـ2 الأكثر ظهوراً في الكوبليهات التي فيها أوتسايدر بالماضي
    const score = new Map()
    for (const c of passe) {
      const r = rr(c)
      if (!r[0] || !r[1]) continue
      if (r[0] > 3 || r[1] > 3) {
        const a = c.arrivee[0], b = c.arrivee[1]
        score.set(a, (score.get(a) || 0) + 1)
        score.set(b, (score.get(b) || 0) + 1)
      }
    }
    const topOuts = [...score.entries()].filter(([num]) => outsiders.includes(num)).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0])
    if (topOuts.length < 2) return null
    return [fav1, ...topOuts]
  },

  // 2. كيلر الفافوري: الحصان الذي يفوز بالـP12 عندما يفشل الفافوري1
  'fav-killer': (course, passe) => {
    const { parNum, parRang } = rangs(course)
    if (!parNum.has(1)) return null
    const fav1 = parNum.get(1)
    const killer = new Map()
    for (const c of passe) {
      const { parNum: pn } = rangs(c)
      if (!pn.has(1)) continue
      const fav = pn.get(1)
      const a = c.arrivee[0], b = c.arrivee[1]
      if (a !== fav && b !== fav) {
        killer.set(a, (killer.get(a) || 0) + 1)
        killer.set(b, (killer.get(b) || 0) + 1)
      }
    }
    const topK = [...killer.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(x=>x[0])
    const todayNums = new Set([...parNum.keys()])
    const valid = topK.filter((n) => todayNums.has(n))
    return valid.length >= 3 ? valid.slice(0, 3) : null
  },

  // 3. تقاطع الفشل: التكوينات التي فشلت فيها argmax أكثر — نلعبها
  'fail-intersect': (course, passe) => {
    const { parRang } = rangs(course)
    // نبني تكرار كل تكوين في الماضي
    const freq = new Map()
    for (const c of passe) {
      const r = rr(c)
      if (!r[0] || !r[1]) continue
      const k = r[0] + ',' + r[1]
      freq.set(k, (freq.get(k) || 0) + 1)
    }
    // argmax الماضي
    let bk = null, bn = -1
    for (const [k, n] of freq) if (n > bn) { bn = n; bk = k }
    if (!bk) return null
    const [r1, r2] = bk.split(',').map(Number)
    // نلعب التكوين + جاره (r1+1, r2) و (r1, r2+1) إذا وجدوا
    const picks = new Set()
    if (parRang.has(r1)) picks.add(parRang.get(r1))
    if (parRang.has(r2)) picks.add(parRang.get(r2))
    if (parRang.has(r1 + 1)) picks.add(parRang.get(r1 + 1))
    if (parRang.has(r2 + 1)) picks.add(parRang.get(r2 + 1))
    if (picks.size >= 3) return [...picks].slice(0, 3)
    // نكمل من رتب 3-6
    for (let r = 3; r <= 6 && picks.size < 3; r++) if (parRang.has(r)) picks.add(parRang.get(r))
    return picks.size >= 3 ? [...picks].slice(0, 3) : null
  },

  // 4. "السوق يكذب": خذ 3 خيول من رتب 3-7 الأكثر فوزاً في الماضي
  'market-lie': (course, passe) => {
    const { parRang } = rangs(course)
    const winRank = new Map()
    for (const c of passe) {
      const r = rr(c)
      if (!r[0] || !r[1]) continue
      if (r[0] >= 3 && r[0] <= 7) winRank.set(r[0], (winRank.get(r[0]) || 0) + 1)
      if (r[1] >= 3 && r[1] <= 7) winRank.set(r[1], (winRank.get(r[1]) || 0) + 1)
    }
    const bestRanks = [...winRank.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0])
    const picks = []
    for (const r of bestRanks) if (parRang.has(r)) picks.push(parRang.get(r))
    return picks.length >= 3 ? picks.slice(0, 3) : null
  },

  // 5. قاعدة المستخدم العكسية: الفافوري1 + 2 خيول من رتب 5-10 الأكثر تكراراً في الكوبلي الحقيقي
  'user-inverse': (course, passe) => {
    const { parRang } = rangs(course)
    if (!parRang.has(1)) return null
    const fav1 = parRang.get(1)
    const rankScore = new Map()
    for (const c of passe) {
      const r = rr(c)
      if (!r[0] || !r[1]) continue
      if (r[0] >= 5 && r[0] <= 10) rankScore.set(r[0], (rankScore.get(r[0]) || 0) + 1)
      if (r[1] >= 5 && r[1] <= 10) rankScore.set(r[1], (rankScore.get(r[1]) || 0) + 1)
    }
    const best = [...rankScore.entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0])
    const picks = [fav1]
    for (const r of best) if (parRang.has(r)) picks.push(parRang.get(r))
    return picks.length >= 3 ? picks.slice(0, 3) : null
  }
}

const results = {}
for (const rName of Object.keys(rules)) results[rName] = { hit: 0, n: 0 }

const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const vrai = course.arrivee.slice(0, 2)
  for (const [rName, rule] of Object.entries(rules)) {
    const picks = rule(course, passe)
    if (!picks || picks.length < 3) continue
    results[rName].n++
    if (picks.includes(vrai[0]) && picks.includes(vrai[1])) results[rName].hit++
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})

console.log('')
console.log('== قواعد عكسية P12 (' + N + ' سباقات، ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
for (const [rName, { hit, n }] of Object.entries(results)) {
  if (!n) continue
  console.log('  ' + rName + ': ' + hit + '/' + n + ' = ' + (hit/n*100).toFixed(2) + '%')
}