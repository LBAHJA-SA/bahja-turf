/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/empreinte/extraction.js — البصمة التاريخية للأرشيف
 *
 *  14/11/2026 — V2 : تستخرج العلاقات التي أنتجت الوصول، لا مجرد تكرار الخانات.
 *  خمسة طبقات للبصمة، كل واحدة مستقلة، بتنعيم Laplace لمنع قيمة صفرية.
 *  المتصفح و Node على حد سواء: تُنادى من داخل الاثنين بلا تفاضل.
 * ════════════════════════════════════════════════════════════════════════ */

import { attributionSlots } from '../moteur.js'
import { normDiscipline } from '../synthese.js'

/** تفكيك دالة القيمة ("4-11-13-12-7" → [4, 11, 13, 12, 7]) إلى سلة خانات مرتبة + مرتبة بترتيب الوصول */
export function keySet(a) { return [...a].sort((x, y) => x - y).join('-') }
export function keyOrdre(a) { return [...a].join('-') }

/** كل الأزواج داخل مجموعة من الخانات */
function* combos(arr, size) {
  const n = arr.length
  if (size > n) return
  const combo = Array.from({ length: size }, (_, i) => i)
  while (true) {
    yield combo.map((i) => arr[i])
    let i = size - 1
    while (i >= 0 && combo[i] === n - size + i) i--
    if (i < 0) return
    combo[i]++
    for (let j = i + 1; j < size; j++) combo[j] = combo[j - 1] + 1
  }
}

/** البصمة فوق الأرشيف الكامل (نقي أو مرشّح بالتخصص) — للإخراج السريع من Node */
export function buildFingerprint(db, discipline) {
  const races = []
  for (const [date, e] of Object.entries(db || {})) {
    if (!e || !Array.isArray(e.arrivee) || e.arrivee.length < 5) continue
    if (!Array.isArray(e.synthese) || !Array.isArray(e.runners)) continue
    if (discipline && normDiscipline(e.discipline) !== discipline) continue
    const slots = attributionSlots(e.synthese, e.runners)
    const arrivee = e.arrivee.slice(0, 5).map((n) => slots[n]).filter((s) => s != null)
    if (arrivee.length !== 5) continue
    races.push({ date, slots: arrivee, discipline: normDiscipline(e.discipline) })
  }
  const n = races.length
  const fp = {
    races: n,
    placeSlots: [null, {}, {}, {}, {}, {}],     // placeSlots[1..5] = { slot: count }
    quintéKeys: new Map(),                      // key (set) -> count
    quintéOrdreKeys: new Map(),                 // key (ordre arrivee) -> count
    podiumKeys: new Map(),                      // podium = TOP-3 en tant que SET -> count
    pairs: new Map(),                           // key pair (set) -> count (tous les 1/2/3)
    pairesPlace: { '1-2': new Map(), '1-3': new Map(), '2-3': new Map() }, // أزواج حسب المركزين
    triples: new Map(),                         // triples 3-sets -> count
    triplesOrdre: new Map(),                    // triples exact-order (1er,2e,3e)
  }
  for (const { slots } of races) {
    for (let place = 1; place <= 5; place++) {
      const s = slots[place - 1]
      fp.placeSlots[place][s] = (fp.placeSlots[place][s] || 0) + 1
    }
    fp.quintéKeys.set(keySet(slots), (fp.quintéKeys.get(keySet(slots)) || 0) + 1)
    fp.quintéOrdreKeys.set(keyOrdre(slots), (fp.quintéOrdreKeys.get(keyOrdre(slots)) || 0) + 1)
    fp.podiumKeys.set(keySet(slots.slice(0, 3)), (fp.podiumKeys.get(keySet(slots.slice(0, 3))) || 0) + 1)
    for (const pair of combos(slots, 2)) fp.pairs.set(keySet(pair), (fp.pairs.get(keySet(pair)) || 0) + 1)
    for (const triple of combos(slots, 3)) fp.triples.set(keySet(triple), (fp.triples.get(keySet(triple)) || 0) + 1)
    /* أزواج حسب المركزين */
    const p12 = keySet([slots[0], slots[1]])
    const p13 = keySet([slots[0], slots[2]])
    const p23 = keySet([slots[1], slots[2]])
    fp.pairesPlace['1-2'].set(p12, (fp.pairesPlace['1-2'].get(p12) || 0) + 1)
    fp.pairesPlace['1-3'].set(p13, (fp.pairesPlace['1-3'].get(p13) || 0) + 1)
    fp.pairesPlace['2-3'].set(p23, (fp.pairesPlace['2-3'].get(p23) || 0) + 1)
    /* ثلاثيات بترتيب الوصول */
    const tor = keyOrdre(slots.slice(0, 3))
    fp.triplesOrdre.set(tor, (fp.triplesOrdre.get(tor) || 0) + 1)
  }
  return fp
}

/** سلاسة لابلاس : S(c) = (c + α) / (n + α·K) حيث K = حجم القاموس (السلة = الخانات الفعلية) */
export function smoothed(c, total, alpha = 0.5, vocab = 18) {
  return (c + alpha) / (total + alpha * vocab)
}

/** تقديرات نصيب مفرد: P(الوجبة في مكان p = slot s) */
export function placeFreq(fp, place, slot) {
  return smoothed(fp.placeSlots[place][slot] || 0, fp.races, 0.5, 19)
}

/** تقدير وصفح الأزواج، مع إلغاء التركيز على أوضح الحالات (أقلّ بلبلة) */
export function pairFreq(fp, slotA, slotB) {
  if (slotA == null || slotB == null) return 1e-6
  const key = keySet([slotA, slotB])
  return smoothed(fp.pairs.get(key) || 0, fp.races, 0.5, 171 /* C(19,2) */)
}

/** تقدير وصفح الأزواج حسب المركزين (للعلاقات) */
export function pairePlaceFreq(fp, place, slotA, slotB) {
  if (slotA == null || slotB == null) return 1e-6
  const key = keySet([slotA, slotB])
  return smoothed(fp.pairesPlace[place]?.get(key) || 0, fp.races, 0.5, 171)
}

/** تقدير وصفح الثلاثيات */
export function tripleFreq(fp, s1, s2, s3) {
  if (s1 == null || s2 == null || s3 == null) return 1e-6
  const key = keySet([s1, s2, s3])
  return smoothed(fp.triples.get(key) || 0, fp.races, 0.5, 969 /* C(19,3) */)
}

/** تقدير السباعيات */
export function tripletteOrdreFreq(fp, a, b, c) {
  if ([a, b, c].some((s) => s == null)) return 1e-6
  return smoothed(fp.triplesOrdre.get(keyOrdre([a, b, c])) || 0, fp.races, 0.5, 6859 /* 19^3 */)
}

/** تقدير الخماسيات (كل مجموعة فركت تأخذ خمسية مكررة من الأعلى للوصول) */
export function quintéFreq(fp, slots) {
  if (slots.some((s) => s == null) || slots.length !== 5) return 1e-6
  const key = keySet(slots)
  return smoothed(fp.quintéKeys.get(key) || 0, fp.races, 0.5, 11628 /* C(19,5) */)
}

/** تقدير البوديوم */
export function podiumFreq(fp, slots3) {
  if (slots3.some((s) => s == null) || slots3.length !== 3) return 1e-6
  const key = keySet(slots3)
  return smoothed(fp.podiumKeys.get(key) || 0, fp.races, 0.5, 969)
}
