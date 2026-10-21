// backend/COUPLE/selection-2m1f.js — 2 من السوق + 1 من الفورم.
import { selectionMarket3 } from './selection-market.js'

function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => { const pl = Number(String(r).replace(/\D/g, '')); sc += (pts[pl] ?? 1) / (1 + i * 0.55) })
  return sc
}

export function selection2m1f(partants) {
  const mk = partants.map(p=>({num:p.num,cote:Number(p.coteRef??p.cote_pmu??Infinity)})).filter(x=>Number.isFinite(x.cote)).sort((a, b) => a.cote - b.cote || a.num - b.num).map(x=>x.num)
  const fm = partants.map(p=>({num:p.num,score:-formeScore(p.musique)})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score).map(x=>x.num)
  const s=new Set([...mk.slice(0,2),...fm.slice(0,1)])
  return s.size>=3?[...s].slice(0,3):mk.slice(0,3)
}