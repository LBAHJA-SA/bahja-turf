/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/generation/anti-doublons.js — مكافحة التكرار
 *
 *  • التذاكر محددة عند التجسيد: لا تذكرة تتكرر هذا التوليد.
 *  • لا نسخة من خماسي مؤرَشَف (نفس الخانة بعد instantiation).
 *  • لا تذكرة تتكرر بين الصفوف.
 *  • البوديوم قد يتكرر.
 * ════════════════════════════════════════════════════════════════════════ */

export const keySet = (x) => [...x].sort((a, b) => a - b).join('-')

/** هل هذه الخماسية مكررة وسابق لها؟ */
export function isAlreadyUsed(keys, slots5) {
  return keys.has(keySet(slots5))
}

/** هل هذه الخماسية مطابقة لخماسي مؤرشف (instantiation)؟ */
export function isQuintéArchivest(slots5, archivedKeys) {
  return archivedKeys && archivedKeys.has(keySet(slots5))
}

export function registKey(keys, slots5) {
  keys.add(keySet(slots5))
}
