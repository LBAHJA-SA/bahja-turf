/* tools/value-betting.mjs — رياضيات عكسية: كوت عادلة من الأساسيات vs كوت السوق.
 * لكل حصان: نحسب احتمال فوزه بالكوبلي من (فورم، قيمة، وزن، حبل، سن، انتصارات).
 * نحول الاحتمال لكوت عادلة = 1/احتمال. إذا كوت السوق > كوت عادلة → الحصان "قيمة".
 * نأخذ أعلى 3 خيول قيمة. سببي على 200 أخيرة.
 * Usage: node tools/value-betting.mjs
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

/* نحسب "قوة" الحصان للكوبلي من الأساسيات فقط (بدون كوت السوق) */
function strength(p) {
  const f = formeScore(p.musique)
  const val = Number(p.valeur ?? 0)
  const palm = palmares(p)
  const w = Number(p.poids ?? 0)
  const corde = Number(p.corde ?? 99)
  const age = Number(p.age ?? 0)
  const wins = Number(p.nombreVictoires ?? 0)
  const places = Number(p.nombrePlacesSecond ?? 0) + Number(p.nombrePlacesTroisieme ?? 0)

  // كل معيار 0-1، نجمعهم بدلاً من الضرب (لتجنب الصفر)
  const nForm = Math.min(1, f / 20)
  const nVal = Math.min(1, val / 60)
  const nPalm = Math.min(1, palm / 100)
  const nWins = Math.min(1, wins / 10)
  const nPlaces = Math.min(1, places / 20)
  const nWeight = w > 0 ? Math.max(0.3, 1 - (w - 50) / 30) : 0.5
  const nCorde = corde > 0 ? Math.max(0.2, 1 - (corde - 1) / 18) : 0.5
  const nAge = age > 0 ? Math.max(0.3, 1 - (age - 3) / 10) : 0.5

  // متوسط حسابي بدلاً من ضرب
  return (nForm + nVal + nPalm + nWins + nPlaces + nWeight + nCorde + nAge) / 8
}

/* كوت عادلة = 1 / قوة (معيار لكي المجموع = 1) */
function fairOdds(strongest, strength) {
  return strongest / strength
}

let hit = 0, n = 0
const t0 = Date.now()
tests.forEach((course, i) => {
  const scored = course.partants.map((p) => {
    const s = strength(p)
    return { num: p.num, strength: s, cote: Number(p.cote_pmu ?? Infinity) }
  }).filter((x) => x.strength > 0 && Number.isFinite(x.cote) && x.cote > 0)

  if (scored.length < 3) return

  const maxStr = Math.max(...scored.map((x) => x.strength))
  const valueBets = scored.map((x) => ({
    num: x.num,
    fair: fairOdds(maxStr, x.strength),
    market: x.cote,
    value: x.cote / fairOdds(maxStr, x.strength)
  })).sort((a, b) => b.value - a.value)
  const top3 = valueBets.slice(0, 3).map((x) => x.num)

  n++
  if (top3.includes(course.arrivee[0]) && top3.includes(course.arrivee[1])) hit++
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})

console.log('')
console.log('== VALUE BETTING (كوبلي بلاس، ' + N + ' سباق، ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
console.log('  Hit: ' + hit + '/' + n + ' = ' + (hit / Math.max(1, n) * 100).toFixed(2) + '%')
console.log('  سباقات لعبت: ' + n + '/' + tests.length)