/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/tests/paires-triplets.mjs — تحليل العلاقات الثنائية
 *  والثلاثية للسباقات 38 في الأرشيف المُسجَّل.
 *
 *  مخرجات:
 *   ① كل الأزواج التي تظهر معًا في نفس الخمسة الأوائل + العدد والنسبة.
 *   ② نفس الأزواج مُصنَّفة حسب المركزين (1∘2، 1∘3، 2∘3، 1∘4، …) مع فصل الترتيب.
 *   ③ الثلاثيات غير المرتبة مع عدّة الظهور.
 *   ④ الثلاثيات المرتبة بترتيب الوصول (P1→P2→P3 إلخ).
 *   ⑤ مختارات من العلاقات القوية — مجموعة حسب التخصص إن وُجب.
 * ════════════════════════════════════════════════════════════════════════ */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { normDiscipline } from '../synthese.js'
import { attributionSlots } from '../moteur.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.resolve(HERE, '..', '..', '..', 'data', 'synthese.json')
const db = JSON.parse(fs.readFileSync(DATA, 'utf8'))
const races = Object.keys(db).sort().filter((d) => Array.isArray(db[d]?.arrivee) && db[d].arrivee.length >= 5)

/* وظيفة C(n,k) */
function C(n, k) {
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

/* ── Combinations générer ─────────────────────────────────────────────── */
function* combos(arr, size) {
  const n = arr.length
  if (size > n) return
  const ci = Array.from({ length: size }, (_, i) => i)
  while (true) {
    yield ci.map((i) => arr[i])
    let i = size - 1
    while (i >= 0 && ci[i] === n - size + i) i--
    if (i < 0) return
    ci[i]++
    for (let j = i + 1; j < size; j++) ci[j] = ci[j - 1] + 1
  }
}

const orderKey = (a, b) => [a, b].sort((x, y) => x - y).join('-')
const orderKey3 = (a, b, c) => [a, b, c].sort((x, y) => x - y).join('-')
const inOrderKey = (a, b) => `${a}-${b}`
const tripleOrderKey = (a, b, c) => `${a}-${b}-${c}`

/* ── كل سباق: خانات اليوم بالترتيب ────────────────────────────────── */
const racesSlots = []
for (const date of races) {
  const e = db[date]
  const slots = attributionSlots(e.synthese, e.runners)
  const arrived = e.arrivee.slice(0, 5).map((n) => slots[n]).filter((s) => s != null)
  if (arrived.length !== 5) continue
  racesSlots.push({ date, slots: arrived, discipline: normDiscipline(e.discipline) })
}

console.log('عدد السباقات المُسجّلة:', racesSlots.length)
for (const d of racesSlots) console.log(' ', d.date, d.discipline, '→', d.slots.join(' · '))
console.log()

/* ───────── أحصاء كل الأزواج في نفس الخماسية ───────── */
const pairsInQuinté = new Map()
for (const r of racesSlots) {
  for (const combo of combos(r.slots, 2)) {
    const key = orderKey(combo[0], combo[1])
    pairsInQuinté.set(key, (pairsInQuinté.get(key) || 0) + 1)
  }
}
const pairsSorted = [...pairsInQuinté.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
console.log('══ الأزواج داخل الخماسيات المُكررة (n≥3) ══')
console.log('الزوج        التكرارات    %')
for (const [key, count] of pairsSorted.filter(([, n]) => n >= 3)) {
  console.log('  P' + key.split('-').join(' + P'), ' ', String(count).padStart(3), ' ', (count / racesSlots.length * 100).toFixed(1) + '%')
}

/* ───────── نفس الأزواج مُصنّفة حسب المركزين ───────── */
const pairesPlace = { '1-2': new Map(), '1-3': new Map(), '1-4': new Map(), '1-5': new Map(), '2-3': new Map(), '2-4': new Map(), '2-5': new Map(), '3-4': new Map(), '3-5': new Map(), '4-5': new Map() }
for (const r of racesSlots) {
  for (let i = 0; i < r.slots.length; i++) {
    for (let j = i + 1; j < r.slots.length; j++) {
      const a = r.slots[i], b = r.slots[j]
      const key = pairOrderKey(a, b)
      const placeKey = `${i + 1}-${j + 1}`
      pairesPlace[placeKey].set(key, (pairesPlace[placeKey].get(key) || 0) + 1)
    }
  }
}
function pairOrderKey(a, b) { return `${Math.min(a, b)}-${Math.max(a, b)}` }

console.log('\n══ الأزواج حسب المركزين ══')
for (const [p, m] of Object.entries(pairesPlace)) {
  const tops = [...m.entries()].sort((a, b) => b[1] - a[1])
  for (const [key, count] of tops.filter(([, n]) => n >= 2)) {
    console.log('  ', p, 'P' + key.split('-').join(' + P'), ' ', count)
  }
}

/* ───────── الثلاثيات غير المرتبة داخل الخماسية ───────── */
const trios = new Map()
for (const r of racesSlots) {
  for (const combo of combos(r.slots, 3)) {
    const key = orderKey3(combo[0], combo[1], combo[2])
    trios.set(key, (trios.get(key) || 0) + 1)
  }
}
console.log('\n══ ثلاثيات غير مرتبة (n≥2) ══')
const triosSorted = [...trios.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
for (const [key, count] of triosSorted.filter(([, n]) => n >= 2)) {
  console.log('  P' + key.split('-').join(' + P'), ' ', String(count).padStart(2))
}

/* ───────── الثلاثيات المرتبة حسب الوصول ───────── */
const triosOrder = new Map()
for (const r of racesSlots) {
  const t = r.slots.slice(0, 3)
  const key = tripleOrderKey(t[0], t[1], t[2])
  triosOrder.set(key, (triosOrder.get(key) || 0) + 1)
}
console.log('\n══ الثلاثيات المرتبة حسب الوصول (P1 ثم P2 ثم P3) ══')
const triosOrdSorted = [...triosOrder.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
for (const [key, count] of triosOrdSorted) {
  console.log('  P' + key.split('-').join('→P'), ' ', String(count).padStart(2))
}

/* ───────── البوديوم المرتب (TOP 3) لكل تخصص ───────── */
console.log('\n══ البوديوم حسب التخصص ══')
for (const disc of ['PLAT', 'ATTELÉ', 'HAIE', 'STEEPLE'].filter((d) => racesSlots.filter((r) => r.discipline === d).length >= 2)) {
  const dr = racesSlots.filter((r) => r.discipline === disc)
  const top3 = new Map()
  for (const r of dr) {
    const t = r.slots.slice(0, 3)
    const key = [...t].sort((a, b) => a - b).join('-')
    top3.set(key, (top3.get(key) || 0) + 1)
  }
  console.log('  ' + disc + ' (' + dr.length + ' سباق)')
  for (const [k, n] of top3) console.log('    ', 'P' + k.split('-').join(' + P'), n)
}

/* ───────── التركيبات الثلاثية المطابقة للوصول بالترتيب ───────── */
console.log('\n══ الثلاثيات المرتبة تكررًا (نفس الترتيب يصلتان) ══')
const triplesSameOrder = new Map()
for (const r of racesSlots) {
  const key = inOrderKey(r.slots[0], r.slots[1])
  const k2 = r.slots[0] + '-' + r.slots[1]
  triplesSameOrder.set(k2, (triplesSameOrder.get(k2) || 0) + 1)
}
const repeated = [...triplesSameOrder.entries()].filter(([, n]) => n >= 1).sort((a, b) => b[1] - a[1])
for (const [k, n] of repeated) if (n >= 2) console.log('   P' + k.split('-').join(' → P'), ' ', n)
