/* tools/top3-combos.mjs — تركيبات معايير لاختيار 3 خيول.
 * نختبر: 2 كوت + 1 فورم، 1 كوت + 2 فورم، تصويت أغلبية، إقصاء...
 * Usage: node tools/top3-combos.mjs
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

function rankBy(course, fn) {
  return course.partants.map((p) => ({ num: p.num, score: fn(p) }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.num)
}

const M = (p) => Number(p.cote_pmu ?? Infinity)
const F = (p) => -formeScore(p.musique)
const V = (p) => -(Number(p.valeur ?? -1e9))
const W = (p) => Number(p.poids ?? 1e9)
const D = (p) => Number(p.corde ?? 1e9)

const rules = {
  'market-3': (c) => rankBy(c, M).slice(0, 3),
  'form-3': (c) => rankBy(c, F).slice(0, 3),
  '2m+1f': (c) => { const m = rankBy(c, M); const f = rankBy(c, F); const s = new Set([...m.slice(0, 2), ...f.slice(0, 1)]); return s.size >= 3 ? [...s].slice(0, 3) : m.slice(0, 3) },
  '1m+2f': (c) => { const m = rankBy(c, M); const f = rankBy(c, F); const s = new Set([...m.slice(0, 1), ...f.slice(0, 2)]); return s.size >= 3 ? [...s].slice(0, 3) : m.slice(0, 3) },
  '2m+1v': (c) => { const m = rankBy(c, M); const v = rankBy(c, V); const s = new Set([...m.slice(0, 2), ...v.slice(0, 1)]); return s.size >= 3 ? [...s].slice(0, 3) : m.slice(0, 3) },
  '1m+1f+1v': (c) => { const m = rankBy(c, M); const f = rankBy(c, F); const v = rankBy(c, V); const s = new Set([...m.slice(0, 1), ...f.slice(0, 1), ...v.slice(0, 1)]); return s.size >= 3 ? [...s].slice(0, 3) : m.slice(0, 3) },
  'vote-3': (c) => {
    const ranks = { M: rankBy(c, M), F: rankBy(c, F), V: rankBy(c, V), W: rankBy(c, W), D: rankBy(c, D) }
    const votes = new Map()
    for (const [, list] of Object.entries(ranks)) {
      list.slice(0, 5).forEach((num, i) => votes.set(num, (votes.get(num) || 0) + (5 - i)))
    }
    return [...votes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0])
  },
  'market-out': (c) => { // 2 مفضل + 1 من رتب 5-10 الأكثر فوزاً تاريخياً (spécifique à la course)
    const m = rankBy(c, M)
    if (m.length < 3) return m.slice(0, 3)
    return m.slice(0, 3) // fallback
  },
  'kill-fav2': (c) => { // إقصاء الفافوري 2، نلعب 1 + 3-5
    const m = rankBy(c, M)
    if (m.length < 3) return m.slice(0, 3)
    return [m[0], ...m.slice(2, 4)]
  },
  'kill-fav1': (c) => { // إقصاء الفافوري 1، نلعب 2-4
    const m = rankBy(c, M)
    if (m.length < 3) return m.slice(0, 3)
    return m.slice(1, 4)
  },
  'fav+long': (c) => { // الفافوري1 + 2 من رتب 8-12 (اللونغ شوتس)
    const m = rankBy(c, M)
    if (m.length < 3) return m.slice(0, 3)
    return [m[0], ...m.slice(7, 9)]
  },
}

const results = {}
for (const name of Object.keys(rules)) results[name] = { hit: 0, n: 0 }

tests.forEach((course, i) => {
  for (const [name, rule] of Object.entries(rules)) {
    const picks = rule(course)
    if (!picks || picks.length < 3) continue
    if (picks.includes(course.arrivee[0]) && picks.includes(course.arrivee[1])) results[name].hit++
    results[name].n++
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})

console.log('')
console.log('== تركيبات 3 خيول (كوبلي بلاس P1+P2) ==')
for (const [name, { hit, n }] of Object.entries(results)) {
  if (!n) continue
  console.log('  ' + name.padEnd(12) + ': ' + hit + '/' + n + ' = ' + (hit / n * 100).toFixed(2) + '%')
}