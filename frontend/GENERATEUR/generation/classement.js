/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/generation/classement.js — تقييم المرشحين (V2)
 *
 *  ترتيب الأوليَّة هو العلاقات كما طوّرها المستخدم في 13/11/2026:
 *    ① العلاقة P1↔P2   (الفائز و الثاني)
 *    ② العلاقة P1↔P3   (الفائز و الثالث)
 *    ③ العلاقة P2↔P3   (الثاني و الثالث)
 *    ④ الثِّلاثي الكامل  (1+2+3 سويًا بترتيب الوصول)
 *    ⑤ الخماسي الكامل   (1+2+3+4+5)
 *
 *  الأفراد (مكان·خانة) تكمل التعادل لا غير.
 * ════════════════════════════════════════════════════════════════════════ */

import { placeSlotFreq, individuelleScore } from '../empreinte/individuel.js'
import { paireFreq } from '../empreinte/relations-binaires.js'
import { trioSetFreq, trioOrdreFreq, quintéFreqSlots } from '../empreinte/relations-triples.js'

const keySet = (x) => [...x].sort((a, b) => a - b).join('-')

/* أوزان حتمية للعلاقات (علاقات أولاً، أفراد كمرجّح) */
export const W_QUINTE  = 5
export const W_TRIOSET = 4
export const W_TRIO    = 4
export const W_P12     = 3
export const W_P13     = 3
export const W_P23     = 3
export const W_INDIV   = 1

/** علاقة الثنائية بالمركز المقصود لرئيس المراكز الثلاثة الأولى */
const pairPeso = (fp, a, b, place) => {
  if (a == null || b == null) return 0
  if (a === b) return 0
  return paireFreq(fp, place, a, b)
}

/** تقييم خماسي ناقص العرض — النتيجة قابلة للجبر لاحقًا */
export function scoreQuinté(slots5, fp) {
  if (!Array.isArray(slots5) || slots5.length !== 5) return 0
  const [s1, s2, s3] = slots5
  const p12 = pairPeso(fp, s1, s2, '1-2')
  const p13 = pairPeso(fp, s1, s3, '1-3')
  const p23 = pairPeso(fp, s2, s3, '2-3')
  const trioSet = trioSetFreq(fp, s1, s2, s3)
  const trioOrder = trioOrdreFreq(fp, s1, s2, s3)
  const quint = quintéFreqSlots(fp, slots5)
  const ind = individuelleScore(slots5, fp)
  return (
    W_P12 * p12 +
    W_P13 * p13 +
    W_P23 * p23 +
    W_TRIOSET * trioSet +
    W_TRIO * trioOrder +
    W_QUINTE * quint +
    W_INDIV * ind
  )
}

/** تقييم ثمان-خانة (BASE) — من العلاقات داخل/على كل الثماني نفسها */
export function scoreHuit(slots8, fp) {
  if (!Array.isArray(slots8) || slots8.length !== 8) return 0
  let score = 0
  const s = slots8
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      const place = i === 0 && j === 1 ? '1-2'
                  : i === 0 && j === 2 ? '1-3'
                  : i === 1 && j === 2 ? '2-3'
                  : null
      if (place) score += paireFreq(fp, place, s[i], s[j]) * 3
      else score += paireFreq(fp, '1-2', s[i], s[j]) * 0.5
    }
  }
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      for (let k = j + 1; k < s.length; k++) {
        score += trioSetFreq(fp, s[i], s[j], s[k]) * 2
      }
    }
  }
  return score
}

/** الترتيب التنازلي (تُعاد قائمة ممثّلة {slots5, score}) */
export function classerCandidats(cands, fp) {
  return cands
    .map((c) => ({ slots5: [...c], score: scoreQuinté([...c], fp) }))
    .sort((a, b) => b.score - a.score)
}
