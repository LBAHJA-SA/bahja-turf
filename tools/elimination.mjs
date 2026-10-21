/* tools/elimination.mjs — طريقة الإقصاء العكسي:
 * نبدأ بجميع الخيول، نزيل الذين يفشلون في معايير "قاتلة" (فورم سيء، حبل سيء، قيمة منخفضة، إلخ).
 * ما يبقى (3 خيول أو أقل) هو التذكرة. إذا بقي >3، نأخذ الأعلى تصويتًا.
 * سببي على 200 أخيرة.
 * Usage: node tools/elimination.mjs
 */
import { charger } from './empreinte-couple.mjs'

const N = 200
const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)

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

function palmares(p) {
  return Number(p.nombreVictoires ?? 0) * 10
    + Number(p.nombrePlacesSecond ?? 0) * 3
    + Number(p.nombrePlacesTroisieme ?? 0) * 2
    + Number(p.nombrePlaces ?? 0)
}

const rules = {
  // 1. إقصاء بسيط: نزيل الذين فورم=0 أو حبل>12 أو قيمة<20، نأخذ الباقين (أو أعلى 3 كوت)
  'elim-simple': (c) => {
    const alive = c.partants.filter((p) => {
      const f = formeScore(p.musique)
      const palm = palmares(p)
      const corde = Number(p.corde ?? 99)
      const val = Number(p.valeur ?? 0)
      return f > 0 && corde <= 12 && val >= 20
    })
    if (alive.length <= 3) return alive.map((p) => p.num)
    return alive.sort((a, b) => Number(a.cote_pmu ?? Infinity) - Number(b.cote_pmu ?? Infinity)).slice(0, 3).map((p) => p.num)
  },

  // 2. إقصاء صارم: فورم في الأعلى 50%، حبل <=8، قيمة >=30، وزن <= أعلى 70%
  'elim-strict': (c) => {
    const ps = c.partants
    const formes = ps.map((p) => formeScore(p.musique)).filter((x) => x > 0).sort((a, b) => b - a)
    const formMed = formes.length ? formes[Math.floor(formes.length / 2)] : 0
    const vals = ps.map((p) => Number(p.valeur ?? 0)).filter((x) => x > 0).sort((a, b) => a - b)
    const valP70 = vals.length ? vals[Math.floor(vals.length * 0.7)] : 0
    const weights = ps.map((p) => Number(p.poids ?? 0)).filter((x) => x > 0).sort((a, b) => a - b)
    const wP70 = weights.length ? weights[Math.floor(weights.length * 0.7)] : 999

    const alive = ps.filter((p) => {
      const f = formeScore(p.musique)
      const corde = Number(p.corde ?? 99)
      const val = Number(p.valeur ?? 0)
      const w = Number(p.poids ?? 999)
      return f >= formMed && corde <= 8 && val >= 30 && w <= wP70
    })
    if (alive.length === 0) return c.partants.sort((a, b) => Number(a.cote_pmu ?? Infinity) - Number(b.cote_pmu ?? Infinity)).slice(0, 3).map((p) => p.num)
    if (alive.length <= 3) return alive.map((p) => p.num)
    return alive.sort((a, b) => Number(a.cote_pmu ?? Infinity) - Number(b.cote_pmu ?? Infinity)).slice(0, 3).map((p) => p.num)
  },

  // 3. تصويت مع إقصاء: كل معيار يصوت لأعلى 5، لكن من يفشل في معيار "قاتل" يفقد كل أصواته
  'vote-kill': (c) => {
    const ps = c.partants
    const scores = new Map()
    for (const p of ps) {
      let dead = false
      const f = formeScore(p.musique)
      const corde = Number(p.corde ?? 99)
      const val = Number(p.valeur ?? 0)
      const w = Number(p.poids ?? 999)
      // معايير قاتلة
      if (f === 0) dead = true
      if (corde > 14) dead = true
      if (val < 15) dead = true
      if (w > 65) dead = true
      if (dead) continue
      scores.set(p.num, 0)
    }
    if (scores.size === 0) return c.partants.sort((a, b) => Number(a.cote_pmu ?? Infinity) - Number(b.cote_pmu ?? Infinity)).slice(0, 3).map((p) => p.num)

    // تصويت
    const criterias = [
      ['M', (p) => Number(p.cote_pmu ?? Infinity)],
      ['F', (p) => -formeScore(p.musique)],
      ['V', (p) => -(Number(p.valeur ?? -1e9))],
      ['W', (p) => Number(p.poids ?? 1e9)],
      ['D', (p) => Number(p.corde ?? 1e9)],
    ]
    for (const [, fn] of criterias) {
      const ranked = ps.filter((p) => scores.has(p.num)).sort((a, b) => fn(a) - fn(b))
      ranked.slice(0, 5).forEach((p, i) => scores.set(p.num, scores.get(p.num) + (5 - i)))
    }
    return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0])
  },

  // 4. "الكيلر": نأخذ الفافوري1 + 2 خيول لديهم أفضل (فورم * قيمة) / كوت
  'killer-combo': (c) => {
    const market = c.partants.map((p) => ({ num: p.num, cote: Number(p.cote_pmu ?? Infinity) }))
      .filter((x) => Number.isFinite(x.cote)).sort((a, b) => a.cote - b.cote)
    if (market.length < 3) return market.slice(0, 3).map((x) => x.num)
    const fav1 = market[0].num
    const others = c.partants.filter((p) => p.num !== fav1)
    const scored = others.map((p) => {
      const f = formeScore(p.musique)
      const val = Number(p.valeur ?? 0)
      const cote = Number(p.cote_pmu ?? 999)
      if (f === 0 || val === 0) return { num: p.num, score: -1 }
      return { num: p.num, score: (f * val) / cote }
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)
    const picks = [fav1]
    for (const s of scored) if (picks.length < 3) picks.push(s.num)
    if (picks.length < 3) {
      for (const m of market.slice(1)) if (picks.length < 3) picks.push(m.num)
    }
    return picks.slice(0, 3)
  },

  // 5. "المركب العكسي": أعلى 3 في (فورم * قيمة / كوت) — تجاهل السوق كلياً
  'inverse-score': (c) => {
    const scored = c.partants.map((p) => {
      const f = formeScore(p.musique)
      const val = Number(p.valeur ?? 0)
      const cote = Number(p.cote_pmu ?? 999)
      if (f === 0 || val === 0) return { num: p.num, score: -1 }
      return { num: p.num, score: (f * val) / cote }
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)
    if (scored.length >= 3) return scored.slice(0, 3).map((x) => x.num)
    return c.partants.sort((a, b) => Number(a.cote_pmu ?? Infinity) - Number(b.cote_pmu ?? Infinity)).slice(0, 3).map((p) => p.num)
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
console.log('== إقصاء/تركيب عكسي (كوبلي بلاس P1+P2) ==')
for (const [name, { hit, n }] of Object.entries(results)) {
  if (!n) continue
  console.log('  ' + name.padEnd(16) + ': ' + hit + '/' + n + ' = ' + (hit / n * 100).toFixed(2) + '%')
}