/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/empreinte/individuel.js — المراكز 1 إلى 5 فرادى
 *
 *  مستقلة بذاتها ولا تُخلط مع العلاقات.
 *  تُستخدم حظرًا احتياطيًا حين تتساوى علاقة صالحة ( tie-break ) ولا تملأ باقي الخلايا.
 * ════════════════════════════════════════════════════════════════════════ */

import { smoothed } from './relations-binaires.js'

function C_k(n, k) {
  let r = 1
  for (let i = 0; i < k; i++) { r = (r * (n - i)) / (i + 1) }
  return Math.round(r)
}

/** تكرار خانة s بمكان p (فردًا) */
export function placeSlotFreq(fp, place, slot) {
  const map = fp.placeSlots[place]
  if (!map) return 0
  const c = map[slot] || 0
  return smoothed(c, fp.races, 0.5, C_k(19, 1))
}

/** وزنًا إجماليًا لكل خانة لفرد أولي — للجولة الأولية للترتيب داخل العلاقات محدودة الأداء */
export function individuelleScore(slots, fp) {
  if (!slots || !slots.length) return 0
  let score = 0
  for (let place = 1; place <= slots.length; place++) {
    score += placeSlotFreq(fp, place, slots[place - 1])
  }
  return score
}
