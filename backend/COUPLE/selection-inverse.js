// backend/COUPLE/selection-inverse.js — inverse-score: أعلى (فورم × قيمة / كوت).
// الغائب (كوت/قيمة/موسيقى) → الوسيط المحايد، لا الإعدام. 13/10/2026.
import { selectionMarket3 } from './selection-market.js'
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

export function selectionInverseScore(partants, course) {
  const ps = partants || []
  const cotes = ps.map((p) => Number(p.coteRef ?? p.cote_pmu ?? p.cote)).filter((n) => Number.isFinite(n) && n > 0)
  const medCote = mediane(cotes)
  const formes = ps.map((p) => (p.musique ? formeScore(p.musique) : null)).filter((n) => n != null && n > 0)
  const medForme = mediane(formes)
  const vals = ps.map((p) => Number(p.valeur)).filter((n) => Number.isFinite(n) && n > 0)
  const medVal = mediane(vals)
  if (medCote == null || medForme == null || medVal == null) return selectionMarket3(partants)
  const scored = ps.map((p) => {
    const f = p.musique ? formeScore(p.musique) : null
    const ff = f != null && f > 0 ? f : medForme
    const v = Number(p.valeur)
    const vv = Number.isFinite(v) && v > 0 ? v : medVal
    const c = Number(p.coteRef ?? p.cote_pmu ?? p.cote)
    const cc = Number.isFinite(c) && c > 0 ? c : medCote
    return { num: p.num, score: (ff * vv) / cc }
  }).sort((a, b) => b.score - a.score || a.num - b.num)
  if (scored.length >= 3) return scored.slice(0, 3).map((x) => x.num)
  return selectionMarket3(partants)
}
