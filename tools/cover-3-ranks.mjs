/* tools/cover-3-ranks.mjs — ما 3 رتب سوق تغطي الكوبلي (P1,P2) معًا؟
 * نأخذ 3 رتب {r1,r2,r3}، نلعب خيولها. نربح إذا كان P1 و P2 كلاهما في {r1,r2,r3}.
 * نختبر كل تركيب 3 رتب من 1..10 على الأرشيف كاملًا.
 * Usage: node tools/cover-3-ranks.mjs
 */
import { charger } from './empreinte-couple.mjs'

const rangs = (c) => {
  const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num)
  const m = new Map(o.map((x, i) => [x.num, i + 1]))
  return { parNum: m, parRang: new Map([...m.entries()].map(([n, r]) => [r, n])) }
}

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
console.log('corpus=' + tout.length)

const maxRank = 10
const combos = []
for (let a = 1; a <= maxRank; a++)
  for (let b = a + 1; b <= maxRank; b++)
    for (let c = b + 1; c <= maxRank; c++)
      combos.push([a, b, c])

console.log('testing ' + combos.length + ' combinations of 3 ranks...')

const results = new Map()
for (const [r1, r2, r3] of combos) {
  let hit = 0, n = 0
  for (const course of tout) {
    const { parRang } = rangs(course)
    if (!parRang.has(r1) || !parRang.has(r2) || !parRang.has(r3)) continue
    n++
    const a = course.arrivee[0], b = course.arrivee[1]
    const rA = [...parRang.entries()].find(([num, r]) => num === a)?.[1]
    const rB = [...parRang.entries()].find(([num, r]) => num === b)?.[1]
    if (rA != null && rB != null && [r1, r2, r3].includes(rA) && [r1, r2, r3].includes(rB)) hit++
  }
  if (n > 0) results.set([r1, r2, r3].join(','), { hit, n, pct: hit / n * 100 })
}

const sorted = [...results.entries()].sort((a, b) => b[1].pct - a[1].pct)
console.log('')
console.log('== أفضل 20 تركيب 3 رتب (تغطية P1+P2 معًا) ==')
for (let i = 0; i < 20 && i < sorted.length; i++) {
  const [k, v] = sorted[i]
  console.log('  {' + k + '} : ' + v.hit + '/' + v.n + ' = ' + v.pct.toFixed(2) + '%')
}

// الأفضل مطلقًا
const best = sorted[0]
console.log('')
console.log('الأفضل: {' + best[0] + '} = ' + best[1].pct.toFixed(2) + '% (' + best[1].hit + '/' + best[1].n + ')')

// تحقق سببي على 200 أخيرة
console.log('')
console.log('== تحقق سببي (200 أخيرة) ==')
const tests = tout.slice(-200)
const [rb] = best[0].split(',').map(Number)
let h = 0, n = 0
for (const course of tests) {
  const { parRang } = rangs(course)
  if (!parRang.has(rb[0]) || !parRang.has(rb[1]) || !parRang.has(rb[2])) continue
  n++
  const a = course.arrivee[0], b = course.arrivee[1]
  const rA = [...parRang.entries()].find(([num, r]) => num === a)?.[1]
  const rB = [...parRang.entries()].find(([num, r]) => num === b)?.[1]
  if (rA != null && rB != null && [rb[0], rb[1], rb[2]].includes(rA) && [rb[0], rb[1], rb[2]].includes(rB)) h++
}
console.log('  {' + rb.join(',') + '} سببي: ' + h + '/' + n + ' = ' + (h/n*100).toFixed(2) + '%')