/* tools/build-contextual.mjs — يبني نموذج سياقي من الأرشيف كاملاً.
 * سياق = مضمار × مسافة_فئة × جزء_فئة.
 * لكل سياق: يختار أفضل قاعدة من مجموعة، بحد أدنى N عينة.
 * يخرج artifact: public/data/contextual-selection.json
 * Usage: node tools/build-contextual.mjs
 */
import fs from 'node:fs'
import { charger } from './empreinte-couple.mjs'

function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => { const pl = Number(String(r).replace(/\D/g, '')); sc += (pts[pl] ?? 1) / (1 + i * 0.55) })
  return sc
}

const rules = {
  'market-3': (c) => c.partants.map(p=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote).slice(0,3).map(x=>x.num),
  'form-3': (c) => c.partants.map(p=>({num:p.num,score:-formeScore(p.musique)})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score).slice(0,3).map(x=>x.num),
  '2m+1f': (c) => { const mk=c.partants.map(p=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote).map(x=>x.num); const fm=c.partants.map(p=>({num:p.num,score:-formeScore(p.musique)})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score).map(x=>x.num); const s=new Set([...mk.slice(0,2),...fm.slice(0,1)]); return s.size>=3?[...s].slice(0,3):mk.slice(0,3) },
  '1m+2f': (c) => { const mk=c.partants.map(p=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote).map(x=>x.num); const fm=c.partants.map(p=>({num:p.num,score:-formeScore(p.musique)})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score).map(x=>x.num); const s=new Set([...mk.slice(0,1),...fm.slice(0,2)]); return s.size>=3?[...s].slice(0,3):mk.slice(0,3) },
  'killer-combo': (c) => { const market=c.partants.map(p=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote); if(market.length<3) return market.slice(0,3).map(x=>x.num); const fav1=market[0].num; const others=c.partants.filter(p=>p.num!==fav1); const scored=others.map(p=>{ const f=formeScore(p.musique); const val=Number(p.valeur??0); const cote=Number(p.cote_pmu??999); if(f===0||val===0) return {num:p.num,score:-1}; return {num:p.num,score:(f*val)/cote} }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score); const picks=[fav1]; for(const s of scored) if(picks.length<3) picks.push(s.num); if(picks.length<3){ for(const m of market.slice(1)) if(picks.length<3) picks.push(m.num) }; return picks.slice(0,3) },
  'fail-intersect': (c, passe) => { const {parRang}=rangs(c); const freq=new Map(); for(const cc of passe){ const r=rr(cc); if(!r[0]||!r[1]) continue; const k=r[0]+','+r[1]; freq.set(k,(freq.get(k)||0)+1) }; let bk=null,bn=-1; for(const [k,n] of freq) if(n>bn){bn=n;bk=k}; if(!bk) return null; const [r1,r2]=bk.split(',').map(Number); const picks=new Set(); if(parRang.has(r1)) picks.add(parRang.get(r1)); if(parRang.has(r2)) picks.add(parRang.get(r2)); if(parRang.has(r1+1)) picks.add(parRang.get(r1+1)); if(parRang.has(r2+1)) picks.add(parRang.get(r2+1)); if(picks.size>=3) return [...picks].slice(0,3); for(let r=3;r<=6&&picks.size<3;r++) if(parRang.has(r)) picks.add(parRang.get(r)); return picks.size>=3?[...picks].slice(0,3):null },
  'kill-fav2': (c) => { const m=c.partants.map(p=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote); if(m.length<3) return m.slice(0,3).map(x=>x.num); return [m[0],...m.slice(2,4)] },
  'inverse-score': (c) => { const scored=c.partants.map(p=>{ const f=formeScore(p.musique); const val=Number(p.valeur??0); const cote=Number(p.cote_pmu??999); if(f===0||val===0) return {num:p.num,score:-1}; return {num:p.num,score:(f*val)/cote} }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score); if(scored.length>=3) return scored.slice(0,3).map(x=>x.num); return c.partants.sort((a,b)=>Number(a.cote_pmu??Infinity)-Number(b.cote_pmu??Infinity)).slice(0,3).map(p=>p.num) },
  'kill-fav1': (c) => { const m=c.partants.map(p=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote); if(m.length<3) return m.slice(0,3).map(x=>x.num); return m.slice(1,4) },
}

function rangs(c) { const o=c.partants.map(p=>({num:p.num,c:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.c)).sort((a,b)=>a.c-b.c||a.num-b.num); return {parNum:new Map(o.map((x,i)=>[x.num,i+1])), parRang:new Map(o.map((x,i)=>[i+1,x.num]))} }
const rr = c => { const {parNum}=rangs(c); return c.arrivee.slice(0,2).map(n=>parNum.get(n)??null) }

function contextKey(course) {
  const dist = course.distance || 0
  const distBucket = dist <= 1200 ? 'S' : dist <= 1800 ? 'M' : dist <= 2500 ? 'L' : 'XL'
  const hippo = (course.hippodrome || 'UNK').replace(/\s+/g,'_')
  return `${hippo}|${distBucket}`
}

const tout = charger().filter(c => (c.arrivee||[]).length>=3 && (c.partants||[]).length>=8)
console.log('الأرشيف: ' + tout.length + ' سباق')

const ruleNames = Object.keys(rules)
const ctxStats = new Map()

/* تدريب على الأرشيف كاملاً */
tout.forEach(course => {
  const ctx = contextKey(course)
  if (!ctxStats.has(ctx)) ctxStats.set(ctx, {})
  const stats = ctxStats.get(ctx)
  const passe = tout.filter(c => c.date < course.date)
  const vrai = course.arrivee.slice(0, 2)
  for (const rName of Object.keys(rules)) {
    const picks = rName === 'fail-intersect' ? rules[rName](course, tout.filter(c => c.date < course.date)) : rules[rName](course)
    if (!picks || picks.length < 3) continue
    if (!stats[rName]) stats[rName] = { hit: 0, n: 0 }
    stats[rName].n++
    if (picks.includes(vrai[0]) && picks.includes(vrai[1])) stats[rName].hit++
  }
})

/* أفضل قاعدة لكل سياق (حد أدنى 20 عينة) */
const bestRulePerContext = new Map()
const globalStats = {}
for (const [ctx, stats] of ctxStats) {
  let best = null, bestPct = -1
  for (const [rName, { hit, n }] of Object.entries(stats)) {
    if (n < 20) continue
    const pct = hit / n
    if (!globalStats[rName]) globalStats[rName] = { hit: 0, n: 0 }
    globalStats[rName].hit += hit
    globalStats[rName].n += n
    if (pct > bestPct) { bestPct = pct; best = rName }
  }
  if (best) bestRulePerContext.set(ctx, { rule: best, pct: bestPct })
}

/* أفضل قاعدة عالمية (fallback) */
let globalBest = null, globalBestPct = -1
for (const [rName, { hit, n }] of Object.entries(globalStats)) {
  if (n < 20) continue
  const pct = hit / n
  if (pct > globalBestPct) { globalBestPct = pct; globalBest = rName }
}
console.log('قاعدة عالمية: ' + globalBest + ' (' + (globalBestPct*100).toFixed(2) + '%)')

/* بناء artifact */
const artifact = {
  genere: new Date().toISOString(),
  corpus: tout.length,
  contexts: bestRulePerContext.size,
  globalBest,
  globalBestPct,
  rules: Object.fromEntries(bestRulePerContext)
}

fs.writeFileSync('public/data/contextual-selection.json', JSON.stringify(artifact, null, 1))
console.log('سياقات ببيانات كافية: ' + bestRulePerContext.size)
for (const [ctx, { rule, pct }] of bestRulePerContext) console.log('  ' + ctx + ' -> ' + rule + ' (' + (pct*100).toFixed(2) + '%)')
console.log('artifact: public/data/contextual-selection.json')