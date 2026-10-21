/* tools/synthese-blocks.mjs — طريقة الكتل على السينتيز، فقط تواريخ متاحة. */
import fs from 'node:fs'
import { charger } from './empreinte-couple.mjs'

const syntheseData = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)

function getSynthese(date, reunion, course) {
  const d = syntheseData[date]
  if (!d || !d.synthese) return null
  const s = d.synthese
  const mapping = {}
  for (const [pos, num] of Object.entries(s)) {
    const p = parseInt(pos, 10)
    if (Number.isFinite(p)) mapping[p + 1] = num
  }
  return mapping
}

const blocks = {
  G1: [1, 2, 3, 4], G2: [5, 6, 7, 8], G3: [9, 10], G4: [11, 12], G5: [13, 14, 15, 16]
}

const rules = {
  'G1+G2+G3': (s) => { const p=[]; for(const g of['G1','G2','G3']){for(const pos of blocks[g]) if(s[pos]){p.push(s[pos]);break}} return p.length===3?p:null },
  '2G1+1G2': (s) => { const p=[]; let c=0; for(const pos of blocks.G1) if(s[pos]){p.push(s[pos]);if(++c===2)break} for(const pos of blocks.G2) if(s[pos]){p.push(s[pos]);break} return p.length===3?p:null },
  '1G1+2G2': (s) => { const p=[]; for(const pos of blocks.G1) if(s[pos]){p.push(s[pos]);break} let c=0; for(const pos of blocks.G2) if(s[pos]){p.push(s[pos]);if(++c===2)break} return p.length===3?p:null },
  'top3-G1': (s) => { const p=[]; for(const pos of blocks.G1) if(s[pos]) p.push(s[pos]); return p.length>=3?p.slice(0,3):null },
  'vote-blocks': (s) => { const v=new Map(); for(const [,pos] of Object.entries(blocks)){for(const p of pos) if(s[p]){v.set(s[p],(v.get(s[p])||0)+1);break}} if(v.size<3) return null; return [...v.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]) },
}

const results = {}
for(const n of Object.keys(rules)) results[n] = { couple: {hit:0,n:0}, tierce: {hit:0,n:0} }

let totalWithSynthese = 0
for(const course of tout) {
  const parts = course.cle.split('_')
  if(parts.length < 3) continue
  const date = parts[0], reunion = parts[1], courseNum = parts[2]
  const synthese = getSynthese(date, reunion, courseNum)
  if (!synthese) continue
  totalWithSynthese++

  for(const [name, rule] of Object.entries(rules)) {
    const picks = rule(synthese)
    if (!picks || picks.length < 3) continue
    results[name].couple.n++
    results[name].tierce.n++
    const [a,b,c] = course.arrivee
    if (picks.includes(a) && picks.includes(b)) results[name].couple.hit++
    if (picks.includes(a) && picks.includes(b) && picks.includes(c)) results[name].tierce.hit++
  }
}

console.log('سباقات مع سينتيز: ' + totalWithSynthese)
for(const [name, {couple, tierce}] of Object.entries(results)) {
  if(!couple.n) continue
  console.log(name.padEnd(14) + ': كوبلي=' + couple.hit + '/' + couple.n + ' ' + (couple.hit/couple.n*100).toFixed(2) + '% · تريو=' + tierce.hit + '/' + tierce.n + ' ' + (tierce.hit/tierce.n*100).toFixed(2) + '%')
}