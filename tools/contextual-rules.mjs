/* tools/contextual-rules.mjs — قواعد سياقية: لكل (مضمار×مسافة×جزء×نوع) تختار أفضل قاعدة.
 * تدريب على الماضي الصارم، اختبار سببي على 200 أخيرة.
 * Usage: node tools/contextual-rules.mjs
 */
import { charger } from './empreinte-couple.mjs'

const N = 200
const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)

function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => { const pl = Number(String(r).replace(/\D/g, '')); sc += (pts[pl] ?? 1) / (1 + i * 0.55) })
  return sc
}

function palmares(p) {
  return Number(p.nombreVictoires ?? 0) * 10 + Number(p.nombrePlacesSecond ?? 0) * 3 + Number(p.nombrePlacesTroisieme ?? 0) * 2 + Number(p.nombrePlaces ?? 0)
}

const rules = {
  'market-3': (c) => {
    const m = c.partants.map((p) => ({ num: p.num, cote: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote)
    return m.slice(0,3).map(x=>x.num)
  },
  'form-3': (c) => {
    const m = c.partants.map((p) => ({ num: p.num, score: -formeScore(p.musique) })).filter((x)=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score)
    return m.slice(0,3).map(x=>x.num)
  },
  '2m+1f': (c) => {
    const mk = c.partants.map((p)=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote).map(x=>x.num)
    const fm = c.partants.map((p)=>({num:p.num,score:-formeScore(p.musique)})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score).map(x=>x.num)
    const s=new Set([...mk.slice(0,2),...fm.slice(0,1)]); return s.size>=3?[...s].slice(0,3):mk.slice(0,3)
  },
  '1m+2f': (c) => {
    const mk = c.partants.map((p)=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote).map(x=>x.num)
    const fm = c.partants.map((p)=>({num:p.num,score:-formeScore(p.musique)})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score).map(x=>x.num)
    const s=new Set([...mk.slice(0,1),...fm.slice(0,2)]); return s.size>=3?[...s].slice(0,3):mk.slice(0,3)
  },
  'killer-combo': (c) => {
    const market = c.partants.map((p) => ({ num: p.num, cote: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote)
    if (market.length < 3) return market.slice(0,3).map(x=>x.num)
    const fav1 = market[0].num
    const others = c.partants.filter((p) => p.num !== fav1)
    const scored = others.map((p) => {
      const f = formeScore(p.musique)
      const val = Number(p.valeur ?? 0)
      const cote = Number(p.cote_pmu ?? 999)
      if (f === 0 || val === 0) return { num: p.num, score: -1 }
      return { num: p.num, score: (f * val) / cote }
    }).filter((x) => x.score > 0).sort((a,b)=>b.score-a.score)
    const picks = [fav1]
    for(const s of scored) if(picks.length<3) picks.push(s.num)
    if(picks.length<3){ for(const m of market.slice(1)) if(picks.length<3) picks.push(m.num) }
    return picks.slice(0,3)
  },
  'fail-intersect': (c, passe) => {
    const { parRang } = rangs(c)
    const freq = new Map()
    for(const cc of passe) { const r = rr(cc); if(!r[0]||!r[1]) continue; const k=r[0]+','+r[1]; freq.set(k,(freq.get(k)||0)+1) }
    let bk=null,bn=-1; for(const [k,n] of freq) if(n>bn){bn=n;bk=k}
    if(!bk) return null
    const [r1,r2]=bk.split(',').map(Number)
    const picks=new Set()
    if(parRang.has(r1)) picks.add(parRang.get(r1))
    if(parRang.has(r2)) picks.add(parRang.get(r2))
    if(parRang.has(r1+1)) picks.add(parRang.get(r1+1))
    if(parRang.has(r2+1)) picks.add(parRang.get(r2+1))
    if(picks.size>=3) return [...picks].slice(0,3)
    for(let r=3;r<=6&&picks.size<3;r++) if(parRang.has(r)) picks.add(parRang.get(r))
    return picks.size>=3?[...picks].slice(0,3):null
  },
  'kill-fav2': (c) => {
    const m = c.partants.map((p) => ({ num: p.num, cote: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote)
    if (m.length < 3) return m.slice(0,3).map(x=>x.num)
    return [m[0], ...m.slice(2,4)]
  },
  'inverse-score': (c) => {
    const scored = c.partants.map((p) => {
      const f = formeScore(p.musique)
      const val = Number(p.valeur ?? 0)
      const cote = Number(p.cote_pmu ?? 999)
      if (f === 0 || val === 0) return { num: p.num, score: -1 }
      return { num: p.num, score: (f * val) / cote }
    }).filter((x) => x.score > 0).sort((a,b)=>b.score-a.score)
    if (scored.length >= 3) return scored.slice(0,3).map(x=>x.num)
    return c.partants.sort((a,b)=>Number(a.cote_pmu??Infinity)-Number(b.cote_pmu??Infinity)).slice(0,3).map(p=>p.num)
  },
  'fav+long': (c) => {
    const m = c.partants.map((p) => ({ num: p.num, cote: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote)
    if (m.length < 3) return m.slice(0,3).map(x=>x.num)
    return [m[0], ...m.slice(7,9)]
  },
}

function rangs(c) {
  const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.c)).sort((a,b)=>a.c-b.c||a.num-b.num)
  return { parNum: new Map(o.map((x,i)=>[x.num,i+1])), parRang: new Map(o.map((x,i)=>[i+1,x.num])) }
}
const rr = (c) => { const {parNum}=rangs(c); return c.arrivee.slice(0,2).map(n=>parNum.get(n)??null) }

/* دالة توليد مفتاح سياق */
function contextKey(course) {
  const hippo = course.hippodrome || 'UNK'
  const dist = course.distance || 0
  const distBucket = dist <= 1200 ? 'S' : dist <= 1800 ? 'M' : dist <= 2500 ? 'L' : 'XL'
  const part = course.partants.length
  const partBucket = part <= 8 ? 'S' : part <= 12 ? 'M' : 'L'
  const disc = course.discipline || 'UNK'
  return `${hippo}|${distBucket}|${partBucket}|${disc}`
}

/* ======== التدريب: لكل سياق، نحسب دقة كل قاعدة ======== */
console.log('=== تدريب على الماضي (سباقات قبل الاختبار) ===')
const train = tout.slice(0, -N)
const test = tests

const ruleNames = Object.keys(rules)
const contextStats = new Map() // ctx -> { rule -> {hit, n} }

train.forEach((course, i) => {
  const ctx = contextKey(course)
  if (!contextStats.has(ctx)) contextStats.set(ctx, {})
  const stats = contextStats.get(ctx)
  const passe = tout.filter((c) => c.date < course.date)
  const { parRang } = rangs(course)
  const vrai = course.arrivee.slice(0, 2)
  for (const rName of ruleNames) {
    const rule = rules[rName]
    const picks = rName === 'fail-intersect' ? rule(course, passe) : rule(course)
    if (!picks || picks.length < 3) continue
    if (!stats[rName]) stats[rName] = { hit: 0, n: 0 }
    stats[rName].n++
    if (picks.includes(vrai[0]) && picks.includes(vrai[1])) stats[rName].hit++
  }
})

/* لكل سياق، نختار أفضل قاعدة (بحد أدنى 10 أمثلة) */
const bestRulePerContext = new Map()
for (const [ctx, stats] of contextStats) {
  let best = null, bestPct = -1
  for (const [rName, { hit, n }] of Object.entries(stats)) {
    if (n < 10) continue
    const pct = hit / n
    if (pct > bestPct) { bestPct = pct; best = rName }
  }
  if (best) bestRulePerContext.set(ctx, { rule: best, pct: bestPct })
}

console.log('سياقات ببيانات كافية: ' + bestRulePerContext.size + ' / ' + contextStats.size)
const distPct = [...bestRulePerContext.values()].reduce((s, x) => s + x.pct, 0) / bestRulePerContext.size
console.log('متوسط دقة أفضل قاعدة لكل سياق: ' + (distPct * 100).toFixed(2) + '%')

/* ======== الاختبار: لكل سباق اختبار، نطبق قاعدة سياقه ======== */
console.log('')
console.log('=== اختبار سببي على ' + N + ' سباق ===')
let hit = 0, n = 0, fallback = 0, exact = 0
const byCtx = new Map()

test.forEach((course, i) => {
  const ctx = contextKey(course)
  const ctxBest = bestRulePerContext.get(ctx)
  let ruleName = ctxBest ? ctxBest.rule : 'market-3' // fallback
  if (!ctxBest) fallback++

  const rule = rules[ruleName]
  const picks = ruleName === 'fail-intersect' ? rule(course, tout.filter(c => c.date < course.date)) : rule(course)
  if (!picks || picks.length < 3) return

  n++
  const vrai = course.arrivee.slice(0, 2)
  const ok = picks.includes(vrai[0]) && picks.includes(vrai[1])
  if (ok) hit++
  if (picks[0] === course.arrivee[0] && picks[1] === course.arrivee[1]) exact++

  if (!byCtx.has(ctx)) byCtx.set(ctx, { hit: 0, n: 0, rule: ruleName })
  const b = byCtx.get(ctx)
  b.n++
  if (ok) b.hit++
})

console.log('')
console.log('== قواعد سياقية (سببي ' + N + ') ==')
console.log('  كوبلي بلاس: ' + hit + '/' + n + ' = ' + (hit / n * 100).toFixed(2) + '%')
console.log('  مرتبة صحيحة (P1+P2): ' + exact + '/' + n + ' = ' + (exact / n * 100).toFixed(2) + '%')
console.log('  fallback (بدون سياق): ' + fallback + '/' + N)

console.log('')
console.log('--- أفضل سياقات ---')
const sortedCtx = [...byCtx.entries()].sort((a, b) => (b[1].hit / b[1].n) - (a[1].hit / a[1].n)).slice(0, 15)
for (const [ctx, { hit: h, n: n2, rule }] of sortedCtx) {
  if (n2 < 2) continue
  console.log('  ' + ctx + ' -> ' + rule + ': ' + h + '/' + n2 + ' = ' + (h / n2 * 100).toFixed(2) + '%')
}

console.log('')
console.log('--- سياقات تحتاج تحسين (أقل دقة) ---')
const worstCtx = [...byCtx.entries()].filter(([_, v]) => v.n >= 2).sort((a, b) => (a[1].hit / a[1].n) - (b[1].hit / b[1].n)).slice(0, 10)
for (const [ctx, { hit: h, n: n2, rule }] of worstCtx) {
  console.log('  ' + ctx + ' -> ' + rule + ': ' + h + '/' + n2 + ' = ' + (h / n2 * 100).toFixed(2) + '%')
}