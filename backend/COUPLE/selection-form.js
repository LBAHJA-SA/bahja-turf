// backend/COUPLE/selection-form.js — أعلى 3 فورم.
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

export function selectionForm3(partants) {
  const fm = (partants || [])
    .map((p) => ({ num: p.num, score: -formeScore(p.musique) }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => a.score - b.score || a.num - b.num)
    .map((x) => x.num)
  if (fm.length >= 3) return fm.slice(0, 3)
  return selectionMarket3(partants)
}