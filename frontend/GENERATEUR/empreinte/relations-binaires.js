/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/empreinte/relations-binaires.js — العلاقات الثنائية
 *
 *  كل علاقة مستقلة بذاتها :
 *    ▸ P1↔P2   (الفائز و الثاني)
 *    ▸ P1↔P3   (الفائز و الثالث)
 *    ▸ P2↔P3   (الثاني و الثالث)
 *  لا تخلط أنواعها، ولا تُرجّحها ترتيبًا يتجاوز تلك التي يأسرها الأرشيف نفسه.
 * ════════════════════════════════════════════════════════════════════════ */

const keySet = (x) => [...x].sort((a, b) => a - b).join('-')

function C_k(n, k) {
  let r = 1
  for (let i = 0; i < k; i++) { r = (r * (n - i)) / (i + 1) }
  return Math.round(r)
}

export function smoothed(c, total, alpha = 0.5, K = 171) {
  return (c + alpha) / (total + alpha * K)
}

/** تكرار الزوج (a,b) في المركز (place ∈ {1-2,1-3,2-3}) — لا تُمزج الأزواج. */
export function paireFreq(fp, place, slotA, slotB) {
  if (slotA == null || slotB == null || slotA === slotB) return 0
  const map = fp.pairesPlace[place]
  if (!map) return smoothed(0, fp.races)
  const key = keySet([slotA, slotB])
  const c = map.get(key) || 0
  return smoothed(c, fp.races, 0.5, C_k(19, 2))
}

/** جميع تكرارها عبر كل الأزواج المحتملة للخانات المعطاة */
export function pairesScore(slots5, fp, weights) {
  /* أوزان تُعطى من الأرشيف (not strictly needed — keep for flexibility) */
  const [w12, w13, w23] = weights || [1, 1, 1]
  const s = slots5
  const p12 = paireFreq(fp, '1-2', s[0], s[1]) * w12
  const p13 = paireFreq(fp, '1-3', s[0], s[2]) * w13
  const p23 = paireFreq(fp, '2-3', s[1], s[2]) * w23
  return p12 + p13 + p23
}
