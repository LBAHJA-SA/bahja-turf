/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/moteur.js — MOTOR ENGINE (دستور في MOTEUR.md)
 *
 *  13/11/2026 — أول إصدار. حتمية 100% : نفس المدخلات → نفس المخرجات.
 *  الترجيح = الأرشيف لأنه «المراة» : كل خلية تُوزن بمرات حضورها في الخماسي.
 *  لا عشوائية — لا shuffle — لا !تعديلية. ولا تُكرر أي تشكيلة من الأرشيف.
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

function pickDiverse(ranked, priors, target = 5) {
  const picks = []
  const priorSets = priors.map((prior) => new Set(prior.map((p) => p.slot)))
  for (const c of ranked) {
    if (picks.length >= target) break
    let ok = true
    const tent = [...picks.map((p) => p.slot), c.slot]
    for (const s of priorSets) {
      let count = 0
      for (const x of tent) if (s.has(x)) count++
      if (count > 2) { ok = false; break }
    }
    if (ok) picks.push(c)
  }
  /* الإشباع الاحتياطي — لا يُسقط الخانة حتى لو اضطررت للتكرار */
  for (const c of ranked) {
    if (picks.length >= target) break
    if (picks.find((p) => p.slot === c.slot)) continue
    picks.push(c)
  }
  return picks
}

function remplaceComboInterdit(picks, ordonnes, combos) {
  if (picks.length !== 5) return picks
  const cle = (arr) => arr.map((p) => p.slot).slice().sort((a, b) => a - b).join('-')
  if (!combos.has(cle(picks))) return picks
  const restantes = ordonnes.filter((x) => !picks.includes(x))
  for (const alt of restantes) {
    const tentative = [...picks.slice(0, -1), alt]
    if (!combos.has(cle(tentative))) return tentative
  }
  return picks
}

/** تحليل الأرشيف لتخصص — أو الكل عند discipline = null («TOUS»). */
export function analyser(db, discipline) {
  const parNature = {}
  const combos = new Set()
  for (const e of Object.values(db)) {
    if (!e || !Array.isArray(e.arrivee) || e.arrivee.length < 5 || !Array.isArray(e.synthese)) continue
    if (discipline && normDiscipline(e.discipline) !== discipline) continue
    const slot = attributionSlots(e.synthese, e.runners)
    e.arrivee.slice(0, 5).forEach((num, i) => {
      const s = slot[num]
      if (s == null) return
      const c = parNature[s] || (parNature[s] = { cinq: 0, trois: 0, un: 0 })
      c.cinq++
      if (i < 3) c.trois++
      if (i === 0) c.un++
    })
    const combo = e.arrivee.slice(0, 5).map((n) => slot[n]).filter((s) => s != null)
    if (combo.length === 5) combos.add(combo.slice().sort((a, b) => a - b).join('-'))
  }
  const poids = {}
  let maxPoids = 0
  for (const [s, c] of Object.entries(parNature)) {
    const p = c.cinq + c.trois * 2 + c.un * 3
    poids[Number(s)] = p
    if (p > maxPoids) maxPoids = p
  }
  return { poids, maxPoids, combos, races: Object.keys(db).filter((k) => !discipline || normDiscipline(db[k]?.discipline) === discipline).length }
}

/** توليد سطر واحد — target خلية «?»، بلا أرقام مكتوبة وملا، بترتيب الأوزان. */
export function genererLigne({ ordre, discipline, ignored, typed, target, db, cache }) {
  const an = (cache || analyser(db, discipline))
  const absents = new Set(ignored || [])
  for (const n of typed || []) absents.add(n)
  const candidates = (ordre || []).filter((c) => !absents.has(c.num)).map((c) => ({ ...c, p: an.poids[c.slot] || 0 }))
  const ordonnes = [...candidates].sort((a, b) => (b.p - a.p) || (a.slot - b.slot))
  const picked = ordonnes.slice(0, target)
  return remplaceComboInterdit(picked, ordonnes, an.combos).map((c) => c.num)
}

/** توليد كل السطور دفعة واحدة — استعمال واحد للتحليل وللأداء.
 *  `diversify` : قائمة من المعرفات تُولَّد بخوارزمية التباين (≤ 2 مشترك بين كل زوجين). */
export async function genererMoteur({ ordre, discipline, ignored, lignes, db, diversify }) {
  const caches = {}
  const analyserWithCache = (dbLocal, disc) => {
    const key = disc || 'TOUS'
    if (!caches[key]) caches[key] = analyser(dbLocal, disc || null)
    return caches[key]
  }
  const an = analyserWithCache(db, discipline === 'TOUS' ? null : discipline)
  const absents = new Set(ignored || [])
  const ranked = (ordre || []).filter((c) => !absents.has(c.num)).map((c) => ({ ...c, p: an.poids[c.slot] || 0 }))
    .sort((a, b) => (b.p - a.p) || (a.slot - b.slot))
  const out = {}
  const priors = []
  const diverseSet = new Set(diversify || [])
  for (const id of Object.keys(lignes)) {
    const ligne = lignes[id]
    const typedNums = (ligne.typed || []).map((v) => Number(v)).filter(Number.isFinite).filter((n) => n > 0)
    const cible = ligne.cible
    if (typedNums.length === 0 && diverseSet.has(id)) {
      /* توليد التذاكرات الخمسية بتباين حتمي ≤ 2 مشترك بين كل زوجين */
      const target = Math.min(cible, 5)
      const picks = pickDiverse(ranked, priors, target)
      priors.push(picks)
      out[id] = remplaceComboInterdit(picks, ranked, an.combos).map((c) => c.num)
    } else {
      /* التوليد الحتمي المعتاد */
      const target = Math.max(0, cible - typedNums.length)
      const mine = ranked.filter((c) => !typedNums.includes(c.num))
      const gen = mine.slice(0, target)
      out[id] = remplaceComboInterdit(gen, ranked, an.combos).map((c) => c.num)
    }
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

/** اختيارات المحرك للميدالية/الفائز — حتمية، من الأرشيف فقط. */
export function choisirPredictions({ ordre, discipline, db }) {
  const stats = statsParPosition(db)
  const key = discipline ? discipline : 'TOUS'
  const s = stats[key] || stats['TOUS'] || { win: {}, second: {}, third: {} }
  if (!Array.isArray(ordre) || !ordre.length) return null
  // رتّب كل مرشح حسب المركز : الأكثر تكرارًا أولًا، ثم الكارني الأقرب
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
