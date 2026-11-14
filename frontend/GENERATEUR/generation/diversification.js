/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/generation/diversification.js — توزيع بين الصفوف
 *
 *  V2 : كل صف = تركيبة 5 خانات متفردة. لا تركيبة تتكرر بين الصفوف (مكتمل).
 *  لكن لا نفوقي عمليًا على تفكيك أي تذكرة: إمكانية اشتراك التذاكر بـ4 خانات
 *  مسموحة (مطابقة البوديوم متكررة أو جدية عليها واجمالًا) — الأرشيف نفسه يقول
 *  إن ذلك يحدث، ولا قوى لدينا تمنعه.
 * ════════════════════════════════════════════════════════════════════════ */

const keySet = (x) => [...x].sort((a, b) => a - b).join('-')

/** التذاكر المتعددة — مع التنويع الملزم ضد التكرار (لا خماسيات مكررة مستخدمة).
 *  المردود: قائمة متفردة لكل سطر. */
export function diversifierLignes(candSorted, nLignes) {
  const out = []
  const used = new Set()
  for (const c of candSorted) {
    if (out.length >= nLignes) break
    const key = keySet(c.slots5)
    if (used.has(key)) continue
    used.add(key)
    out.push(c)
  }
  return out
}

/** مؤهل — تقييم تنوير: تركيبتان متساويتان أخريان أو لا. */
export function isQuintéDistinct(aSlots5, bSlots5) {
  return keySet(aSlots5) !== keySet(bSlots5)
}
