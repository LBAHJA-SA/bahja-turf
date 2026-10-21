/* tools/top3-selection.mjs — نرتّب بمعيار، نأخذ أعلى 3، نقيس تغطية P1+P2 (كوبلي بلاس).
 * سببي صارم على 200 أخيرة. نختبر معايير متعددة.
 * Usage: node tools/top3-selection.mjs
 */
import { charger } from './empreinte-couple.mjs'

const N = 200
const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)

const rangs = (c) => {
  const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num)
  return { parNum: new Map(o.map((x, i) => [x.num, i + 1])), parRang: new Map(o.map((x, i) => [i + 1, x.num])) }
}

function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => {
    const pl = Number(String(r).replace(/\D/g, ''))
    sc += (pts[pl] ?? 1) / (1 + i * 0.55)
  })
  return sc
}

const criterias = {
  'market': (p) => Number(p.cote_pmu ?? Infinity), // الأقل كوت = الأول
  'form': (p) => -formeScore(p.musique), // الأعلى فورم = الأول
  'value': (p) => -(Number(p.valeur ?? -1e9)), // الأعلى قيمة = الأول
  'weight': (p) => Number(p.poids ?? 1e9), // الأقل وزن = الأول
  'draw': (p) => Number(p.corde ?? 1e9), // الأقل حبل = الأول
  'age': (p) => Number(p.age ?? 1e9), // الأصغر سن = الأول
  'wins': (p) => -(Number(p.nombreVictoires ?? 0) * 10 + Number(p.nombrePlacesSecond ?? 0) * 3 + Number(p.nombrePlacesTroisieme ?? 0) * 2 + Number(p.nombrePlaces ?? 0)), // الأعلى بالماريه = الأول
}

const results = {}
for (const name of Object.keys(criterias)) results[name] = { hit: 0, n: 0 }

const t0 = Date.now()
tests.forEach((course, i) => {
  const { parRang } = rangs(course)
  const a = course.arrivee[0], b = course.arrivee[1]
  for (const [name, fn] of Object.entries(criterias)) {
    const scored = course.partants.map((p) => ({ num: p.num, score: fn(p) }))
      .filter((x) => Number.isFinite(x.score))
      .sort((a, b) => a.score - b.score)
    if (scored.length < 3) continue
    const top3 = scored.slice(0, 3).map((x) => x.num)
    if (top3.includes(course.arrivee[0]) && top3.includes(course.arrivee[1])) results[name].hit++
    results[name].n++
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})

console.log('')
console.log('== أعلى 3 خيول بكل معيار (كوبلي بلاس = P1 و P2 في الـ3) ==')
for (const [name, { hit, n }] of Object.entries(results)) {
  if (!n) continue
  console.log('  ' + name.padEnd(10) + ': ' + hit + '/' + n + ' = ' + (hit / n * 100).toFixed(2) + '%')
}