/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/generation/candidats.js — توليد المرشحين
 *
 *  يبني مرشحّي C(n,5) من خانات اليوم (تجاهل + مطابقة جميع التخصصات).
 *  لا يكرر أي تركيبة (خامة المنطق نفسه كفاح ضد التكرار في الصفوف).
 * ════════════════════════════════════════════════════════════════════════ */

/** كل خمسة فركات من مصفوفة مفردات (تم حذف المحظورات) */
export function* combos(arr, k = 5) {
  const n = arr.length
  if (k > n) return
  const combo = Array.from({ length: k }, (_, i) => i)
  while (true) {
    yield combo.map((i) => arr[i])
    let i = k - 1
    while (i >= 0 && combo[i] === n - k + i) i--
    if (i < 0) return
    combo[i]++
    for (let j = i + 1; j < k; j++) combo[j] = combo[j - 1] + 1
  }
}

/** كل المرشحين الخماسيات من الخانات المتاحة (ترجع {{ slots: [..], num: [..] }}). */
export function candidatsVides(slotsDisponibles) {
  const out = []
  for (const slots5 of combos(slotsDisponibles, 5)) {
    out.push({ slots5 })
  }
  return out
}
