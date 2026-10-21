// backend/COUPLE/selection.js — killer-combo (neutre : médiane, jamais 999).
// Importé par frontend/COUPLE/Couple.jsx UNIQUEMENT.
import { mediane } from './neutre.js'

function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => { const pl = Number(String(r).replace(/\D/g, '')); sc += (pts[pl] ?? 1) / (1 + i * 0.55) })
  return sc
}

/**
 * killer-combo: الفافوري1 + 2 خيول بأعلى (فورم × قيمة / كوت) من الباقين.
 * الغائب → وسيط السباق (محايد). 13/10/2026.
 */
export function selectionKillerCombo(partants) {
  const ps = partants || []
  const cotes = ps.map((p) => Number(p.coteRef ?? p.cote_pmu ?? p.cote)).filter((n) => Number.isFinite(n) && n > 0)
  const medCote = mediane(cotes) ?? Infinity
  const market = ps
    .map((p) => { const n = Number(p.coteRef ?? p.cote_pmu ?? p.cote); return { num: p.num, cote: Number.isFinite(n) && n > 0 ? n : medCote } })
    .sort((a, b) => a.cote - b.cote || a.num - b.num)
  if (market.length < 3) return market.slice(0, 3).map((x) => x.num)

  const fav1 = market[0].num
  const others = ps.filter((p) => p.num !== fav1)
  const formes = others.map((p) => (p.musique ? formeScore(p.musique) : null)).filter((n) => n != null && n > 0)
  const medF = mediane(formes)
  const vals = others.map((p) => Number(p.valeur)).filter((n) => Number.isFinite(n) && n > 0)
  const medV = mediane(vals)

  const scored = others.map((p) => {
    const f = p.musique ? formeScore(p.musique) : null
    const ff = f != null && f > 0 ? f : (medF ?? 0)
    const v = Number(p.valeur)
    const vv = Number.isFinite(v) && v > 0 ? v : (medV ?? 0)
    const c = Number(p.coteRef ?? p.cote_pmu ?? p.cote)
    const cc = Number.isFinite(c) && c > 0 ? c : medCote
    if (ff <= 0 || vv <= 0) return { num: p.num, score: -1 }
    return { num: p.num, score: (ff * vv) / cc }
  }).filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.num - b.num)

  const picks = [fav1]
  for (const s of scored) if (picks.length < 3) picks.push(s.num)
  if (picks.length < 3) {
    for (const m of market.slice(1)) if (picks.length < 3) picks.push(m.num)
  }
  return picks.slice(0, 3)
}
