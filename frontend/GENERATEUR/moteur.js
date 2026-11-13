/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/moteur.js — المحرك (دستور في MOTEUR.md)
 *
 *  13/11/2026 — القاعدة : **أنماط P التي كوّنت الخماسي في الأرشيف**.
 *  لا أوزان، لا قوة، لا ترتيب بالأفضلية — الكل مرشح.
 *  لا يُرجّح المحرك شيئًا؛ الترشيح مصدره شيئان فقط :
 *    ① الأنماط المؤرشفة : كل خماسي سباق مؤرَشَف هو مرشّح خماسي جاهز
 *      {1,5,3,10,8} مثلًا — تُستدعى كما هي، بترتيب **الأحدث أولًا**
 *      (ثم بالمفتاح المرتب، حتمية 100%).
 *    ② الأرقام المستبعدة يدويًا بـ«ignorer» يقلص الحقل — لا أكثر.
 *  القيد الصارم بين كل صفَّين : **≤ 2 رقمًا مشتركًا** — بالتزامن مع التذكرات الخمسية وقاعدة الأساسين (disjoint).
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

/** أنماط P المؤرشفة : كل خماسي سباق مؤرَشَف هو «تركيبة نجحت» للخانات.
 *  مرتبة بـ(date تنازليًا ثم بالمفتاح) — حتمية، لا ترجيح. تُصفّى بالتخصص كبقية الأرشيف.
 *  التكرار يُحذف (نفس مجموعة الخانات = نفس المرشح). */
export function patternsFromArchive(db, discipline) {
  const items = []
  for (const [k, e] of Object.entries(db || {})) {
    if (!e || !Array.isArray(e.arrivee) || e.arrivee.length < 5) continue
    if (!Array.isArray(e.synthese) || !Array.isArray(e.runners)) continue
    if (discipline && normDiscipline(e.discipline) !== discipline) continue
    const slots = attributionSlots(e.synthese, e.runners)
    const comboS = e.arrivee.slice(0, 5).map((n) => slots[n]).filter((s) => s != null)
    if (comboS.length !== 5) continue
    const sorted = comboS.slice().sort((a, b) => a - b)
    items.push({ slots: sorted, key: sorted.join('-'), date: k })
  }
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)))
  const seen = new Set()
  return items.filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)))
}

/** تجسيد الأنماط بأرقام اليوم (مع الاستبعاد والترجيح بال P تصاعديًا فقط) */
function candidatesFromPatterns(patterns, ordre, absents) {
  const numBySlot = {}
  for (const c of ordre || []) if (c.slot != null) numBySlot[c.slot] = c.num
  const out = []
  for (const p of patterns) {
    const nums = p.slots.map((s) => numBySlot[s])
    if (nums.some((n) => !Number.isFinite(n))) continue          /* اليوم لا يملك هذه الخانة */
    if (new Set(nums).size !== 5) continue
    if (nums.some((n) => absents.has(n))) continue               /* رقم مُتجاهَل */
    out.push({ nums, key: p.key, slots: p.slots, date: p.date })
  }
  return out
}

const overlapCount = (a, b) => {
  const sb = new Set(b)
  let n = 0
  for (const x of a) if (sb.has(x)) n++
  return n
}

/** اختيار خارجي حتمي كامل (DFS) — يُستدعى فقط إذا لم تكفِ الأنماط.
 *  ترتيب المرشحين = ترتيب الكارني (P تصاعدي) — لا أفضلية ولا وزن. */
function fillDiverse(candidates, priors, target, forced) {
  const priorSets = priors.map((p) => new Set(p))
  const sol = [...forced]
  const taken = new Set(forced)
  const dfs = (startIdx) => {
    if (sol.length >= target) return true
    for (let i = startIdx; i < candidates.length; i++) {
      const c = candidates[i]
      if (taken.has(c)) continue
      const tent = [...sol, c]
      if (priorSets.some((s) => overlapCount(tent, [...s]) > 2)) continue
      taken.add(c)
      sol.push(c)
      if (dfs(i + 1)) return true
      sol.pop()
      taken.delete(c)
    }
    return false
  }
  dfs(0)
  return sol
}

/** توليد كل السطور دفعة واحدة — حتمية 100%، لا أوزان. */
export async function genererMoteur({ ordre, discipline, ignored, lignes, db, diversify }) {
  const patterns = patternsFromArchive(db, discipline === 'TOUS' ? null : discipline)
  const absents = new Set(ignored || [])
  /* ترتيب التوليد : الأساسين ثم التذاكر الخمسية */
  const keys = Object.keys(lignes)

  const rankOrder = (a, b) => ordre.findIndex((c) => c.num === a) - ordre.findIndex((c) => c.num === b)

  /* تجسيد المرشّحات مرة واحدة */
  const candidatBase = (ordre || []).filter((c) => !absents.has(c.num))
  const rankedNums = candidatBase.map((c) => c.num)
  const allCandidates = candidatesFromPatterns(patterns, ordre, absents)

  const out = {}
  const priors = []   /* التذاكر الخمسية فقط : ≤ 2 بين كل زوج من التذاكر الخمسية (الأساسين خارج القيد) */
  const baseUsed = new Set()  /* أرقام BASE 1 تُستبعد من BASE 2 لمنع التماثل */

  for (const id of keys) {
    const ligne = lignes[id]
    const typedNums = [...new Set((ligne.typed || []).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))]
    const isDiverse = !!diversify?.includes(id)
    const isBase = !isDiverse

    if (isBase) {
      /* BASE 1 / BASE 2 : تعبئة بترتيب الكارني صرف — لا أوزان، بلا تماثل حتى بينهما */
      const cible = ligne.cible
      const used = new Set([...baseUsed, ...typedNums])
      const fill = []
      for (const n of rankedNums) {
        if (fill.length >= cible - typedNums.length) break
        if (used.has(n)) continue
        used.add(n)
        fill.push(n)
      }
      const total = [...typedNums, ...fill]
      for (const n of total) baseUsed.add(n)
      out[id] = fill
      continue
    }

    /* التذاكر الخمسية : المرشحون = أنماط P المؤرشفة (الأحدث أولًا) — بلا أوزان */
    const target = Math.min(ligne.cible, 5)
    const fixed = typedNums
    let pick = null
    for (const cand of allCandidates) {
      if (pick) break
      const total = [...fixed, ...cand.nums]
      /* أرقام مكتوبة إلزامية : يجب أن تحتويها التذكرة */
      if (fixed.some((n) => !cand.nums.includes(n))) continue
      if (priors.some((s) => overlapCount(total, s) > 2)) continue
      pick = cand
    }
    if (pick) {
      const total = [...fixed, ...pick.nums]
      priors.push(total)
      out[id] = pick.nums.filter((n) => !fixed.includes(n))
      continue
    }
    /* الاستنفاد : DFS بترتيب الكارني — لا أوزان، ≤ 2 أو «؟» للباقي */
    const forcedArr = [...fixed]
    const rest = fillDiverse(rankedNums, priors, target, forcedArr)
    priors.push(rest)
    out[id] = rest.filter((n) => !fixed.includes(n))
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
