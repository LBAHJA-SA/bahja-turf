// backend/COUPLE/selection-kill-fav1.js — إقصاء الفافوري1.
import { selectionMarket3 } from './selection-market.js'

export function selectionKillFav1(partants) {
  const m = selectionMarket3(partants)
  if (m.length < 3) return m
  return m.slice(1, 4)
}