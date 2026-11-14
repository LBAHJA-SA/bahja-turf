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

/* أوزان حتمية للعلاقات (علاقات أولاً، أفراد كمرجّح) — المجموعة افتراضيًا full
 *  لكنها تلقى من المحرك أو من الاختبار عبر `weights` للتحليل المستقل. */
export const W_FULL    = { p12: 3, p13: 3, p23: 3, trioSet: 4, trioOrder: 4, quinte: 5, individuel: 1 }
export const W_ONLY_P12      = { p12: 1, p13: 0, p23: 0, trioSet: 0, trioOrder: 0, quinte: 0, individuel: 0 }
export const W_ONLY_P13      = { p12: 0, p13: 1, p23: 0, trioSet: 0, trioOrder: 0, quinte: 0, individuel: 0 }
export const W_ONLY_P23      = { p12: 0, p13: 0, p23: 1, trioSet: 0, trioOrder: 0, quinte: 0, individuel: 0 }
export const W_ONLY_PAIRES   = { p12: 1, p13: 1, p23: 1, trioSet: 0, trioOrder: 0, quinte: 0, individuel: 0 }
export const W_ONLY_TRIOSET  = { p12: 0, p13: 0, p23: 0, trioSet: 1, trioOrder: 0, quinte: 0, individuel: 0 }
export const W_ONLY_TRIOORD  = { p12: 0, p13: 0, p23: 0, trioSet: 0, trioOrder: 1, quinte: 0, individuel: 0 }
export const W_ONLY_QUINTE   = { p12: 0, p13: 0, p23: 0, trioSet: 0, trioOrder: 0, quinte: 1, individuel: 0 }
export const W_ONLY_INDIV    = { p12: 0, p13: 0, p23: 0, trioSet: 0, trioOrder: 0, quinte: 0, individuel: 1 }
export const W_NO_RELATIONS  = { ...W_FULL, p12: 0, p13: 0, p23: 0, trioSet: 0, trioOrder: 0, quinte: 0, individuel: 5 }
export const W_NO_INDIV      = { ...W_FULL, individuel: 0 }
export const WEIGHTS_BY_PROFILE = {
  full: W_FULL,
  onlyP12: W_ONLY_P12,
  onlyP13: W_ONLY_P13,
  onlyP23: W_ONLY_P23,
  onlyPaires: W_ONLY_PAIRES,
  onlyTrioSet: W_ONLY_TRIOSET,
  onlyTrioOrder: W_ONLY_TRIOORD,
  onlyQuinte: W_ONLY_QUINTE,
  onlyIndividuel: W_ONLY_INDIV,
  noRelations: W_NO_RELATIONS,
  noIndividuel: W_NO_INDIV,
}

/* ثابت تاريخي للإعلان عن الأوزان الافتراضيين (compat خارجي) */
export const W_QUINTE  = W_FULL.quinte
export const W_TRIOSET = W_FULL.trioSet
export const W_TRIO    = W_FULL.trioOrder
export const W_P12     = W_FULL.p12
export const W_P13     = W_FULL.p13
export const W_P23     = W_FULL.p23
export const W_INDIV   = W_FULL.individuel

/** علاقة الثنائية بالمركز المقصود لرئيس المراكز الثلاثة الأولى */
const pairPeso = (fp, a, b, place) => {
  if (a == null || b == null || a === b) return 0
  return paireFreq(fp, place, a, b)
}

/** تقييم خماسي — يُحقِّق وزنًا اختياريًا عبر `weights` */
export function scoreQuinté(slots5, fp, weights) {
  if (!Array.isArray(slots5) || slots5.length !== 5) return 0
  const w = weights || W_FULL
  const [s1, s2, s3] = slots5
  const p12 = pairPeso(fp, s1, s2, '1-2')
  const p13 = pairPeso(fp, s1, s3, '1-3')
  const p23 = pairPeso(fp, s2, s3, '2-3')
  const trioSet = trioSetFreq(fp, s1, s2, s3)
  const trioOrder = trioOrdreFreq(fp, s1, s2, s3)
  const quint = quintéFreqSlots(fp, slots5)
  const ind = individuelleScore(slots5, fp)
  return (
    w.p12 * p12 +
    w.p13 * p13 +
    w.p23 * p23 +
    w.trioSet * trioSet +
    w.trioOrder * trioOrder +
    w.quinte * quint +
    w.individuel * ind
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
export function classerCandidats(cands, fp, weights) {
  return cands
    .map((c) => ({ slots5: [...c], score: scoreQuinté([...c], fp, weights) }))
    .sort((a, b) => b.score - a.score)
}
