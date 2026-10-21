// backend/COUPLE/selection-kill-fav2.js — إقصاء الفافوري2.
import { selectionMarket3 } from './selection-market.js'

export function selectionKillFav2(partants) {
  const m = selectionMarket3(partants)
  if (m.length < 3) return m
  return [m[0], ...m.slice(2, 4)]
}