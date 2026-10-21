/* tools/debug-32.mjs — تشريح قاعدة killer-combo (32%) و fail-intersect (28.5%):
 * أين تصيب، أين تخطئ، حسب: مسافة، مضمار، نوع، أرضية، عدد جزء، ميدان.
 * Usage: node tools/debug-32.mjs
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
  'killer-combo': (c, passe) => {
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
  }
}

function rangs(c) {
  const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.c)).sort((a,b)=>a.c-b.c||a.num-b.num)
  return { parNum: new Map(o.map((x,i)=>[x.num,i+1])), parRang: new Map(o.map((x,i)=>[i+1,x.num])) }
}
const rr = (c) => { const {parNum}=rangs(c); return c.arrivee.slice(0,2).map(n=>parNum.get(n)??null) }

const results = { 'killer-combo': [], 'fail-intersect': [] }

const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const { parRang } = rangs(course)
  const vrai = course.arrivee.slice(0,2)
  for(const [rName, rule] of Object.entries(rules)) {
    const picks = rule(course, passe)
    if(!picks || picks.length<3) continue
    const hit = picks.includes(vrai[0]) && picks.includes(vrai[1])
    results[rName].push({
      hit,
      cle: course.cle,
      distance: course.distance,
      hippodrome: course.hippodrome,
      discipline: course.discipline,
      partants: course.partants.length,
      terrain: course.terrain || '?',
      picks,
      vrai
    })
  }
  if((i+1)%50===0) console.log('... '+(i+1)+'/'+tests.length)
})

console.log('')
for(const [rName, arr] of Object.entries(results)) {
  const hits = arr.filter(x=>x.hit)
  const fails = arr.filter(x=>!x.hit)
  console.log('=== ' + rName + ' ===')
  console.log('  Hit: ' + hits.length + '/' + arr.length + ' = ' + (hits.length/arr.length*100).toFixed(2) + '%')
  console.log('  Fail: ' + fails.length)
  // تحليل حسب مسافة
  const byDist = {}
  for(const x of arr){ const k=x.distance||'?'; byDist[k]=(byDist[k]||{hit:0,n:0}); byDist[k].n++; if(x.hit) byDist[k].hit++ }
  console.log('  حسب مسافة:')
  for(const [d,v] of Object.entries(byDist).sort((a,b)=>b[1].n-a[1].n).slice(0,10)) console.log('    '+d+'m: '+v.hit+'/'+v.n+' = '+(v.hit/v.n*100).toFixed(1)+'%')
  // تحليل حسب مضمار
  const byHip = {}
  for(const x of arr){ const k=x.hippodrome||'?'; byHip[k]=(byHip[k]||{hit:0,n:0}); byHip[k].n++; if(x.hit) byHip[k].hit++ }
  console.log('  حسب مضمار:')
  for(const [h,v] of Object.entries(byHip).sort((a,b)=>b[1].n-a[1].n).slice(0,10)) console.log('    '+h+': '+v.hit+'/'+v.n+' = '+(v.hit/v.n*100).toFixed(1)+'%')
  // تحليل حسب عدد جزء
  const byPart = {}
  for(const x of arr){ const k=x.partants; byPart[k]=(byPart[k]||{hit:0,n:0}); byPart[k].n++; if(x.hit) byPart[k].hit++ }
  console.log('  حسب جزء:')
  for(const [p,v] of Object.entries(byPart).sort((a,b)=>b[1].n-a[1].n).slice(0,10)) console.log('    '+p+'p: '+v.hit+'/'+v.n+' = '+(v.hit/v.n*100).toFixed(1)+'%')
  // تحليل حسب Discipline
  const byDisc = {}
  for(const x of arr){ const k=x.discipline||'?'; byDisc[k]=(byDisc[k]||{hit:0,n:0}); byDisc[k].n++; if(x.hit) byDisc[k].hit++ }
  console.log('  حسب نوع:')
  for(const [d,v] of Object.entries(byDisc).sort((a,b)=>b[1].n-a[1].n)) console.log('    '+d+': '+v.hit+'/'+v.n+' = '+(v.hit/v.n*100).toFixed(1)+'%')
}