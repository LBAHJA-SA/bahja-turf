// backend/COUPLE/selection-market.js — أعلى 3 كوت (السوق).
// الغائب الكوت → الوسيط المحايد (يُرتب، لا يُعدم). 13/10/2026.
import { mediane } from './neutre.js'
export function selectionMarket3(partants) {
  const cs = (partants || []).map((p) => Number(p.coteRef ?? p.cote_pmu ?? p.cote)).filter((n) => Number.isFinite(n) && n > 0)
  const med = mediane(cs) ?? Infinity
  return (partants || [])
    .map((p) => { const n = Number(p.coteRef ?? p.cote_pmu ?? p.cote); return { num: p.num, cote: Number.isFinite(n) && n > 0 ? n : med } })
    .sort((a, b) => a.cote - b.cote || a.num - b.num).slice(0, 3).map((x) => x.num)
}
