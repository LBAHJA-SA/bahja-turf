/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/moteur-v2.js — المحرك V2
 *
 *  14/11/2026 — V2 : نسخة نظيفة، مفصولة الطبقات:
 *  • getFingerprint(db, disc, uptoDate) — البصمة تُبنى من كل السباقات
 *    السابقة لتاريخ `uptoDate` (مقارنة تأريخية Walk-Forward لا تفصح، لا
 *    بيانات حديثة في الاختبار).
 *  • بناء المرشحين من الخانات المتاحة بدون الاستعارات من خارج السانس.
 *  • التقييم بـخمسة علاقات (أصول 1/2/3، كل pair 1-2/1-3/2-3 مستقلين،
 *    ثلاثي كامل، خماسي كامل) — علاقة تحسم قبل الأفراد، كل علاقة مستقلة.
 *  • لا استنساخ لخماسي مكرر، ترفض الخماسيات المستخدمة سابقًا في نفس التوليد.
 *  • إن لم تكفِ الخيارات يُلجأ إلى ترتيب السانس (القاعدة الراجعة).
 * ════════════════════════════════════════════════════════════════════════ */

import { normDiscipline } from './synthese.js'
import { attributionSlots } from './moteur.js'
import { buildFingerprint } from './empreinte/extraction.js'
import { scoreQuinté, scoreHuit, WEIGHTS_BY_PROFILE } from './generation/classement.js'

function* combinaisons(arr, k) {
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

function getFingerprint(db, discipline, uptoDate) {
  const filtered = {}
  for (const [date, e] of Object.entries(db || {})) {
    if (!e || !Array.isArray(e.arrivee) || e.arrivee.length < 5) continue
    if (discipline && normDiscipline(e.discipline) !== discipline) continue
    if (uptoDate && date >= uptoDate) continue
    filtered[date] = e
  }
  return buildFingerprint(filtered, null)
}

/** توليد كل السطور دفعة واحدة — حتمي 100%.
 *  @param  {object} params
 *  @param  {string} [params.uptoDate]     — يسمح بحقن Walk-Forward (يُمرّر إلى buildFpTrain)
 *  @param  {object} [params.weights]      — يسمح باختبار كل علاقة منفردًا؛ undefined = W_FULL
 */
export async function genererMoteur({ ordre, discipline, ignored, lignes, db, uptoDate, weights }) {
  const disc = discipline === 'TOUS' ? null : discipline
  const fp = getFingerprint(db, disc, uptoDate)
  const weightsArr = weights || WEIGHTS_BY_PROFILE.full

  const ignoredSet = new Set(ignored || [])
  const slotsByOrdre = {}
  const numBySlot = {}
  for (const c of ordre || []) {
    if (c.slot != null) { slotsByOrdre[c.num] = c.slot; numBySlot[c.slot] = c.num }
  }

  /* الخانات المتاحة بدون ما تُتجاهله الآن ومايُستخدم صراحة */
  const availableSlots = (ordre || [])
    .filter((c) => !ignoredSet.has(c.num))
    .map((c) => c.slot)
    .filter((s) => s != null)
    .sort((a, b) => a - b)

  const keys = Object.keys(lignes)
  const out = {}
  const usedQuintéKeys = new Set()

  for (const id of keys) {
    const ligne = lignes[id]
    const typedNums = [...new Set(
      (ligne.typed || [])
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0)
    )]
    const typedSlots = typedNums.map((n) => slotsByOrdre[n]).filter((s) => s != null)
    const cible = ligne.cible
    const need = Math.max(0, cible - typedSlots.length)

    const fill = []
    if (need <= 0) { out[id] = []; continue }

    const typedSet = new Set(typedSlots)
    const pool = availableSlots.filter((s) => !typedSet.has(s))

    /* بناء المرشحين — كل مجموعة مطابقة لـ need */
    const candidates = []
    if (need === 5) {
      for (const slots5 of combinaisons(pool, 5)) {
        const quinté = [...typedSlots, ...slots5]
        if (quinté.length !== 5) continue
        candidates.push({ slots5: quinté, score: scoreQuinté(quinté, fp, weightsArr) })
      }
    } else {
      for (const slots8 of combinaisons(pool, need)) {
        const huit = [...typedSlots, ...slots8]
        if (huit.length !== need + typedSlots.length) continue
        /* خلطات خماسية موازنة للسكان داخل الثماني تُعطي نتائج أدق — لكن إذا لم تكفِ تدخل النتائج الخماسية كمرجّح */
        let trioTotal = 0
        for (let i = 0; i < huit.length; i++) {
          for (let j = i + 1; j < huit.length; j++) {
            for (let k = j + 1; k < huit.length; k++) {
              trioTotal += 1
            }
          }
        }
        candidates.push({ slots5: huit, score: scoreHuit(huit, fp) })
      }
    }
    candidates.sort((a, b) => b.score - a.score)

    let pick = null
    for (const c of candidates) {
      const key = [...c.slots5].sort((a, b) => a - b).join('-')
      if (usedQuintéKeys.has(key)) continue
      usedQuintéKeys.add(key)
      pick = c
      break
    }

    /* اجتمال سقوط المرشحين (حين fp فارغة أو زحماطات شديدة التقوقع) :
     *  احشّي بأرقام اليوم بترتيب السانس — مضمونًا مائة بالمائة */
    if (!pick && pool.length) {
      const fallbackSlots = [...typedSlots, ...pool.slice(0, need)]
      pick = { slots5: fallbackSlots, score: 0 }
    }

    out[id] = pick ? pick.slots5.slice(typedSlots.length).map((s) => numBySlot[s]).filter((n) => Number.isFinite(n)) : []
  }

  return out
}

export function choisirPredictions() { return null }
