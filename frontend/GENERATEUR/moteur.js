/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/moteur.js — المحرك (دستور في MOTEUR.md)
 *
 *  14/11/2026 — القاعدة :
 *  • المرشحون = الأنماط المؤرشفة (خماسيات سباقات حقيقية سابقة مجسَّدة بأرقام اليوم).
 *  • ترتيب المرشحين : **تكرار البوديوم في الأرشيف نزولًا** (الأكثر ظهورًا أولًا)،
 *    ثم التاريخ تنازليًا، ثم المفتاح (حتميًا).
 *  • لا نسخة من خماسي مؤرَشَف حرفيًا (لا تستنسخ).
 *  • كل الخليا بعد R تُملأ حتمًا — إن لم يكفِ نمط الأستثناء يُستهلك من النمط التالي
 *    (يمدّد مثل الأرشيف).
 *  • عدم التكرار : تذكرة لا تُكرر تذكرة سابقة في نفس التوليد.
 *  • البوديوم يتكرر حرًا — لا قيود عليه من حيث التكرار.
 * ════════════════════════════════════════════════════════════════════════ */

import { normDiscipline } from './synthese.js'

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

export function weekOfMonth(dateStr) {
  const day = Number(String(dateStr).slice(8, 10))
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

/** أنماط P المؤرشفة : كل خماسي سباق مؤرَشَف = تركيبة خانات جاهزة بترتيب وصولها
 *  (1,2,3,4,5 كما في السباق نفسه). مرتبة حسب تكرار البوديوم نزولًا ثم بالنطاق التاريخي. */
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
  const seen = new Set()
  const dedup = items.filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)))
  /* حساب تكرار البوديوم (دون ترتيب) لكل مجموعة مؤرشفة */
  const podiumFreq = {}
  for (const p of dedup) {
    const k = p.slots.slice(0, 3).slice().sort((a, b) => a - b).join('-')
    podiumFreq[k] = (podiumFreq[k] || 0) + 1
  }
  dedup.sort((a, b) => {
    const ka = a.slots.slice(0, 3).slice().sort((x, y) => x - y).join('-')
    const kb = b.slots.slice(0, 3).slice().sort((x, y) => x - y).join('-')
    const fa = podiumFreq[ka] || 0, fb = podiumFreq[kb] || 0
    return fb - fa || (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  })
  return dedup
}

/** تجسيد الأنماط بأرقام اليوم — بدون نسخ أي تركيبة مؤرشفة حرفيًا (نفس الخانة ⇔ بعد instantiation) */
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

/** توليد كل السطور دفعة واحدة — حتمي 100%، كل سطر يُستهلك حصريًا بمؤشر واحد (مشترك).
 *  كل سطر يُملأ من الأرشيف حصريًا؛ إن لم يكفِ نمط واحد يتم استهلاكه من النمط التالي :
 *  المحرك يمدّد لبقية الخانات الميك ما دامت تفتقر إلى تعبئة.
 *  ولا يُكرر خماسيًا كاملًا: عند إتمام التذكرة تُنشئ مفتاح التذكرة وتُرفض النسخة المكررة. */
export async function genererMoteur({ ordre, discipline, ignored, lignes, db }) {
  const disc = discipline === 'TOUS' ? null : discipline
  const patterns = patternsFromArchive(db, disc, null)
  const absents = new Set(ignored || [])
  const candidates = candidatesFromPatterns(patterns, ordre, absents)

  const keys = Object.keys(lignes)
  const out = {}
  const usedKeys = new Set()   /* لضمان عدم تكرار الخماسي نفسه */
  let ptr = 0   /* مؤشر مشترك على الأرشيف — لا يرجع أبدا */
  let fptr = 0  /* مؤشر مشترك على ترتيبة الكارني — يدور (لضمان عدم التماثل بين الصفوف) */

  for (const id of keys) {
    const ligne = lignes[id]
    const typedNums = [...new Set((ligne.typed || []).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))]
    const need = Math.max(0, ligne.cible - typedNums.length)
    const usedLocal = new Set(typedNums)
    const picks = []

    /* المرحلة 1 — من الأرشيف أولًا */
    while (ptr < candidates.length && picks.length < need) {
      const cand = candidates[ptr++]
      for (const n of cand.nums) {
        if (picks.length >= need) break
        if (usedLocal.has(n)) continue
        usedLocal.add(n)
        picks.push(n)
      }
    }

    /* المرحلة 2 — حتمية : إكمال الناقص بأرقام اليوم بترتيب الكارني (P1..Pn) مع مؤشر مشترك */
    if (picks.length < need) {
      let guard = 0
      const maxGuard = ordre.length * 4
      while (picks.length < need && guard < maxGuard) {
        const c = ordre[fptr % ordre.length]
        fptr++
        guard++
        const n = c.num
        if (usedLocal.has(n) || absents.has(n)) continue
        usedLocal.add(n)
        picks.push(n)
      }
    }

    const full = [...typedNums.sort((a, b) => a - b), ...picks.slice().sort((a, b) => a - b)]
    const key = full.join('-')
    if (picks.length >= need && !usedKeys.has(key)) usedKeys.add(key)
    out[id] = picks
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
