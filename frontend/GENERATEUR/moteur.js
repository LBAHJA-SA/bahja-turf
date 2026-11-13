/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/moteur.js — المحرك (دستور في MOTEUR.md)
 *
 *  13/11/2026 — القاعدة الوحيدة : **الأرشيف وحده**.
 *  كل صف من الصفحة = أحدث نمط مؤرَشَف (خماسي سباق حقيقي سابق) مجسد مع أرقام اليوم،
 *  بترتيب **الأحدث أولًا** (حتمية 100%). «عدم التكرار» = النمط الواحد يُستهلك مرة واحدة فقط.
 *  تظهر «؟» فقط للناقص — لا تعبئة خارج الأرشيف ولا استبعاد لنمط كامل.
 *  استثناء «انصهر»: أرقامك المكتوبة تُسحب من أرقام النمط فلا تتكرر داخل السطر نفسه.
 * ════════════════════════════════════════════════════════════════════════ */

import { normDiscipline } from './synthese.js'

/** تخصيص خانات الكارني (P1..Pn) كما يفعل الجدول — نسخة خاصة بالصفحة، لا استيراد للميتة. */
export function attributionSlots(synthese, runners) {
  const partants = new Set((runners || []).filter((n) => Number.isFinite(n) && n > 0))
  const synthe = (synthese || []).filter((n) => Number.isFinite(n) && n > 0 && (partants.size === 0 || partants.has(n)))
  const ordre = [
    ...synthe.map((num) => ({ num, presse: true })),
    ...[...partants].filter((n) => !synthe.includes(n)).sort((a, b) => a - b).map((num) => ({ num, presse: false })),
  ]
  const p1 = ordre[0].num
  const par = (x) => ((x % 2) + 2) % 2
  const ph = par(p1)
  const h = ordre.filter((c) => par(c.num) === ph)
  const b = ordre.filter((c) => par(c.num) !== ph)
  const slot = {}
  h.forEach((c, i) => { slot[c.num] = 2 * i + 1 })
  b.forEach((c, i) => { slot[c.num] = 2 * i + 2 })
  return slot
}

/** أسبوع الشهر لتحديد نطاق الترشيحات — كل أسبوع = طريقة من الأرشيف */
export function weekOfMonth(dateStr) {
  const day = Number(String(dateStr).slice(8, 10))
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

/** أنماط P المؤرشفة : كل خماسي سباق مؤرَشَف = تركيبة خانات جاهزة بترتيب وصولها
 *  (1,2,3,4,5 كما في السباق نفسه). مرتبة بـ(date تنازليًا ثم بالمفتاح) — حتمية.
 *  التكرار (نفس مجموعة الخانات) يُحذف مرة واحدة. `week` تقيّد الأسبوع من الشهر نفسه. */
export function patternsFromArchive(db, discipline, week) {
  const items = []
  for (const [k, e] of Object.entries(db || {})) {
    if (!e || !Array.isArray(e.arrivee) || e.arrivee.length < 5) continue
    if (!Array.isArray(e.synthese) || !Array.isArray(e.runners)) continue
    if (discipline && normDiscipline(e.discipline) !== discipline) continue
    if (week && weekOfMonth(k) !== week) continue
    const slots = attributionSlots(e.synthese, e.runners)
    const comboS = e.arrivee.slice(0, 5).map((n) => slots[n]).filter((s) => s != null)
    if (comboS.length !== 5) continue
    const key = comboS.slice().sort((a, b) => a - b).join('-')
    items.push({ slots: comboS, key, date: k })
  }
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)))
  const seen = new Set()
  return items.filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)))
}

/** تجسيد الأنماط بأرقام اليوم (بترتيب الوصول) — تُرفض كل التركيبات التي
 *  تحتوي رقمًا مُتجاهَلًا أو مرقّمًا لا يوجد اليوم */
function candidatesFromPatterns(patterns, ordre, absents) {
  const numBySlot = {}
  for (const c of ordre || []) if (c.slot != null) numBySlot[c.slot] = c.num
  const out = []
  for (const p of patterns) {
    const nums = p.slots.map((s) => numBySlot[s])
    if (nums.some((n) => !Number.isFinite(n))) continue
    if (new Set(nums).size !== 5) continue
    if (nums.some((n) => absents.has(n))) continue
    out.push({ nums, key: p.key, date: p.date })
  }
  return out
}

/** توليد كل السطور دفعة واحدة — الأرشيف وحده، حتمية 100%.
 *  «منهج كل أسبوع» : المرشحون أولاً = أنماط نفس أسبوع الشهر (كما الأرشيف كرَيس اليوم)،
 *  وإن قلّت عن عدد الصفوف يتراجعَ المرشحون إلى أرشيف كل الأسابيع (نفس المنهج).
 *  كل سطر يستهلك أحدث نمط مجسَّد لم يُستهلك بعد؛ الاستهلاك مرة واحدة فقط. */
export async function genererMoteur({ ordre, discipline, ignored, lignes, db }) {
  const disc = discipline === 'TOUS' ? null : discipline
  /* تاريخ اليوم بيروق ثم الأسبوع المناسب */
  const now = new Date()
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
  const week = weekOfMonth(todayStr)
  const weekPatterns = patternsFromArchive(db, disc, week)
  const weekKeys = new Set(weekPatterns.map((p) => p.key))
  /* «منهج الأسبوع» : الأرشيف الخاص بأسبوع اليوم أولًا، ثم بقية الأرشيف */
  const rest = patternsFromArchive(db, disc, null).filter((p) => !weekKeys.has(p.key))
  const patterns = [...weekPatterns, ...rest]
  const absents = new Set(ignored || [])
  const candidates = candidatesFromPatterns(patterns, ordre, absents)

  /* ترتيب التوليد : BASE 1 → BASE 2 → التذاكر الخمسية ← الأحدث دائمًا */
  const keys = Object.keys(lignes)
  const out = {}
  let ptr = 0   /* مؤشر الانتظار في قائمة المرشحين — لا يرجع للوراء */

  for (const id of keys) {
    const ligne = lignes[id]
    const typedNums = [...new Set((ligne.typed || []).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))]
    const cible = ligne.cible
    const need = Math.max(0, cible - typedNums.length)
    const typedSet = new Set(typedNums)

    /* نستهلك أحدث نمط: تُسحب أرقامه للسطر، ويُستثنى منها ما كتبته أنت يدويًا
     * (تبقى خلاياك المكتوبة كما هي) — وإن لم يبقَ ما يكفي تظهر «؟» للناقص */
    let fill = []
    while (ptr < candidates.length) {
      const cand = candidates[ptr++]
      fill = cand.nums.filter((n) => !typedSet.has(n)).slice(0, need)
      if (fill.length) break
    }

    out[id] = fill
  }

  return out
}

/** إحصائيات المراكز من الأرشيف — لكل تخصص : كم مرة حل كل مركز في الموضع 1 / 2 / 3. */
export function statsParPosition(db) {
  const res = {}
  for (const e of Object.values(db || {})) {
    if (!e || !Array.isArray(e.arrivee) || e.arrivee.length < 3) continue
    if (!Array.isArray(e.synthese) || !Array.isArray(e.runners)) continue
    const slots = attributionSlots(e.synthese, e.runners)
    if (!Object.keys(slots).length) continue
    const disc = (e.discipline || 'AUTRE')
    const d = {}
    try {
      d.d = (() => {
        const s = String(disc).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '')
        if (s.startsWith('ATT')) return 'ATTELÉ'
        if (s.startsWith('PLAT')) return 'PLAT'
        if (s.startsWith('HAI')) return 'HAIE'
        if (s.startsWith('STEEP')) return 'STEEPLE'
        return 'AUTRE'
      })()
    } catch { d.d = 'AUTRE' }
    for (const key of [d.d, 'TOUS']) {
      if (!res[key]) res[key] = { win: {}, second: {}, third: {} }
      const [a, b, c] = e.arrivee
      const s1 = slots[a]; const s2 = slots[b]; const s3 = slots[c]
      if (s1) res[key].win[s1] = (res[key].win[s1] || 0) + 1
      if (s2) res[key].second[s2] = (res[key].second[s2] || 0) + 1
      if (s3) res[key].third[s3] = (res[key].third[s3] || 0) + 1
    }
  }
  return res
}

/** اختيارات المحرك للقلادة/الفائز — من الأرشيف فقط. */
export function choisirPredictions({ ordre, discipline, db }) {
  const stats = statsParPosition(db)
  const key = discipline ? discipline : 'TOUS'
  const s = stats[key] || stats['TOUS'] || { win: {}, second: {}, third: {} }
  if (!Array.isArray(ordre) || !ordre.length) return null
  const candidats = ordre.map((c) => c)
  const used = new Set()
  const pickBest = (cle) => {
    let best = null
    let bestVal = -1
    for (const c of candidats) {
      if (used.has(c.num)) continue
      const v = (s[cle] || {})[c.slot] || 0
      if (v > bestVal || (v === bestVal && best !== null && c.slot < best.slot)) { best = c; bestVal = v }
    }
    used.add(best.num)
    return best.num
  }
  const l1 = [pickBest('win'), pickBest('second'), pickBest('third')]
  const l2 = [pickBest('win'), pickBest('second'), pickBest('third')]
  const winRank = [...candidats].sort((a, b) => {
    const va = (s.win || {})[a.slot] || 0, vb = (s.win || {})[b.slot] || 0
    return vb - va || a.slot - b.slot
  })
  return {
    trio1: l1,
    trio2: l2,
    gagnant1: l1[0],
    gagnant2: l2[0],
    topWinners: [winRank[0]?.num, winRank[1]?.num].filter(Number.isFinite),
  }
}
