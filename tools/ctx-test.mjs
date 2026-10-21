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

function rangs(c) {
  const o = c.partants.map(p => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) })).filter(x => Number.isFinite(x.c)).sort((a,b)=>a.c-b.c||a.num-b.num)
  return { parNum: new Map(o.map((x,i)=>[x.num,i+1])), parRang: new Map(o.map((x,i)=>[i+1,x.num])) }
}

function killerCombo(c) {
  const market = c.partants.map(p=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote)
  if (market.length<3) return market.slice(0,3).map(x=>x.num)
  const fav1 = market[0].num
  const others = c.partants.filter(p=>p.num!==fav1)
  const scored = others.map(p=>{
    const f=formeScore(p.musique)
    const val=Number(p.valeur??0)
    const cote=Number(p.cote_pmu??999)
    if(f===0||val===0) return {num:p.num,score:-1}
    return {num:p.num,score:(f*val)/cote}
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score)
  const picks=[market[0].num]
  for(const s of scored) if(picks.length<3) picks.push(s.num)
  if(picks.length<3){ for(const m of market.slice(1)) if(picks.length<3) picks.push(m.num) }
  return picks.slice(0,3)
}

function market3(c) {
  return c.partants.map(p=>({num:p.num,cote:Number(p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a,b)=>a.cote-b.cote).slice(0,3).map(x=>x.num)
}

function contextKey(course) {
  const dist=course.distance||0
  const distBucket=dist<=1200?'S':dist<=1800?'M':dist<=2500?'L':'XL'
  const part=course.partants.length
  const partBucket=part<=8?'S':part<=12?'M':'L'
  return distBucket+'|'+partBucket
}

const N=200
const tout=charger().filter(c=>(c.arrivee||[]).length>=3&&(c.partants||[]).length>=8)
const tests=tout.slice(-N)
const train=tout.slice(0,-N)

const ctxStats=new Map()
train.forEach(course=>{
  const ctx=contextKey(course)
  if(!ctxStats.has(ctx)) ctxStats.set(ctx,{killer:0,market:0,kN:0,mN:0})
  const stats=ctxStats.get(ctx)
  const passe=tout.filter(c=>c.date<course.date)
  const vrai=course.arrivee.slice(0,2)
  const kp=killerCombo(course)
  const mp=market3(course)
  if(kp.length===3){stats.kN++; if(kp.includes(vrai[0])&&kp.includes(vrai[1])) stats.killer++}
  if(mp.length===3){stats.mN++; if(mp.includes(vrai[0])&&mp.includes(vrai[1])) stats.market++}
})

const bestRule=new Map()
for(const [ctx,stats] of ctxStats){
  if(stats.kN>=5 && stats.killer/stats.kN > stats.market/stats.mN) bestRule.set(ctx,'killer')
  else bestRule.set(ctx,'market')
}

console.log('سياقات: '+bestRule.size)

let hit=0,n=0,fallback=0
tout.slice(-N).forEach(course=>{
  const ctx=contextKey(course)
  const rule=bestRule.get(ctx) || 'market'
  const picks = rule==='killer' ? killerCombo(course) : market3(course)
  if(!picks||picks.length<3) return
  n++
  const vrai=course.arrivee.slice(0,2)
  if(picks.includes(vrai[0])&&picks.includes(vrai[1])) hit++
  if(!bestRule.has(ctx)) fallback++
})
console.log('Hit: '+hit+'/'+n+' = '+(hit/n*100).toFixed(2)+'%')
console.log('Fallback: '+fallback)