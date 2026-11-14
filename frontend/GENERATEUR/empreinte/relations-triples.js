/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/empreinte/relations-triples.js — العلاقات الثلاثية
 *
 *  ثلاثيات كاملة (1↔2↔3) بترتيب الوصول + ثلاثيات الوصول كاملة بأي ترتيب:
 *    ▸ trioOrdre  (الفائز ثم الثاني ثم الثالث)
 *    ▸ trioSet    (تواجد ثلاثتها في المراكز الثلاثة الأولى، بأي ترتيب)
 *  كل وحدة مستقلة ولا تُخلط بأي علاقة أخرى.
 * ════════════════════════════════════════════════════════════════════════ */

import { smoothed } from './relations-binaires.js'

const keySet = (x) => [...x].sort((a, b) => a - b).join('-')
const keyOrdre = (x) => [...x].join('-')

function C_k(n, k) {
  let r = 1
  for (let i = 0; i < k; i++) { r = (r * (n - i)) / (i + 1) }
  return Math.round(r)
}

/** عدد ظهور ثلاثي Morse (slot-a, slot-b, slot-c) بترتيب الوصول */
export function trioOrdreFreq(fp, s1, s2, s3) {
  if (s1 == null || s2 == null || s3 == null) return 0
  const c = fp.triplesOrdre.get(keyOrdre([s1, s2, s3])) || 0
  return smoothed(c, fp.races, 0.5, C_k(19, 3))
}

/** عدد ظهور ثلاث الفريق كحزمة في المراكز الثلاثة الأولى (أي ترتيب داخلي) */
export function trioSetFreq(fp, s1, s2, s3) {
  if (s1 == null || s2 == null || s3 == null) return 0
  const c = fp.podiumKeys.get(keySet([s1, s2, s3])) || 0
  return smoothed(c, fp.races, 0.5, C_k(19, 3))
}

/** مقياس خماسي كامل (slot₄, slot₅) — 15 خمسية أكثر تنئة بأرقام من 3 */
export function quintéFreqSlots(fp, slots5) {
  if (slots5.some((s) => s == null) || slots5.length !== 5) return 0
  const c = fp.quintéKeys.get(keySet(slots5)) || 0
  return smoothed(c, fp.races, 0.5, C_k(19, 5))
}
