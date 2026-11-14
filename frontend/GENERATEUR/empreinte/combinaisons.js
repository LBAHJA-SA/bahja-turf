/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/empreinte/combinaisons.js — الخماسيات والثمانيات
 *
 *  مستقلة: تتعلق فقط بالخماسي/الثماني، تُثبت ولا تولد — للاستخدام مباشرة
 *  لتقييم ±الخماسي. لا خلط بين خماسي كامل وثمان كامل.
 * ════════════════════════════════════════════════════════════════════════ */

import { smoothed } from './relations-binaires.js'

function C_k(n, k) {
  let r = 1
  for (let i = 0; i < k; i++) { r = (r * (n - i)) / (i + 1) }
  return Math.round(r)
}

export function quintéFreqSlots(fp, slots5) {
  if (slots5.some((s) => s == null) || slots5.length !== 5) return 0
  const c = fp.quintéKeys.get(slots5.slice().sort((a, b) => a - b).join('-')) || 0
  return smoothed(c, fp.races, 0.5, C_k(19, 5))
}

export function huitFreqSlots(fp, slots8) {
  if (slots8.some((s) => s == null) || slots8.length !== 8) return 0
  const c = fp.huitKeys?.get(slots8.slice().sort((a, b) => a - b).join('-')) || 0
  if (!fp.huitKeys) return 0
  return smoothed(c, fp.races, 0.5, C_k(19, 8))
}
