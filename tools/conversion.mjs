/* tools/conversion.mjs — RÈGLE DE CONVERSION (méthode utilisateur, 12/10/2026).
 * AUCUN poids, AUCUNE moyenne, AUCUNE famille : la règle est entièrement
 * déterminée par l'archive — pour chaque test indépendant (trio, P12, P13,
 * P23), le candidat = la config la plus fréquente sur les courses
 * STRICTEMENT antérieures (date < test.date). Puis on mesure, par test :
 * exact-ordre, vs baseline favori + hasard. Causal, séparé, vérifiable.
 * Usage : node tools/conversion.mjs [N=200]
 */
import { charger } from './empreinte-couple.mjs'

const N = Math.max(1, Number(process.argv[2]) || 200)

const rangsDe = (partants) => {
  const ordre = partants
    .map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c))
    .sort((a, b) => a.c - b.c || a.num - b.num)
  const parRang = new Map()
  ordre.forEach((x, i) => parRang.set(i + 1, x.num))
  return { parNum: new Map(ordre.map((x, i) => [x.num, i + 1])), parRang, taille: ordre.length }
}

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
console.log('corpus=' + tout.length + ' tests=' + tests.length + ' (' + tests[0].date + ' -> ' + tests[tests.length - 1].date + ')')

const cles = { trio: (r) => r.join(','), p12: (r) => r[0] + ',' + r[1], p13: (r) => r[0] + ',' + r[2], p23: (r) => r[1] + ',' + r[2] }
const valide = { trio: (r) => r.every((x) => x != null), p12: (r) => r[0] != null && r[1] != null, p13: (r) => r[0] != null && r[2] != null, p23: (r) => r[1] != null && r[2] != null }
const rangsCourse = (c) => { const m = rangsDe(c.partants).parNum; return c.arrivee.slice(0, 3).map((n) => m.get(n) ?? null) }

// top config du passé pour un test
function topPasse(passe, t) {
  const cnt = new Map()
  for (const c of passe) {
    const r = rangsCourse(c)
    if (!valide[t](r)) continue
    const k = cles[t](r)
    cnt.set(k, (cnt.get(k) || 0) + 1)
  }
  let best = null, bn = 0
  for (const [k, n] of cnt) if (n > bn) { bn = n; best = k }
  return best ? { config: best, n: bn } : null
}

const res = { trio: { n: 0, hit: 0 }, p12: { n: 0, hit: 0 }, p13: { n: 0, hit: 0 }, p23: { n: 0, hit: 0 } }
let favN = 0, favHit = 0, hasE = 0
const topSuivi = { trio: new Map(), p12: new Map() }
const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const vrai = rangsCourse(course)
  const { parRang, taille } = rangsDe(course.partants)
  hasE += 1 / (taille * (taille - 1) * (taille - 2))
  // baseline favori : trio rangs 1-2-3
  const fo = course.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num)
  if (fo.length >= 3) { favN++; const a = course.arrivee.slice(0, 3); if (fo[0].num === a[0] && fo[1].num === a[1] && fo[2].num === a[2]) favHit++ }
  for (const t of Object.keys(res)) {
    const top = topPasse(passe, t)
    if (!top) continue
    if (i === tests.length - 1) console.log('  top final ' + t + ' = (' + top.config + ') (' + top.n + ' fois dans le passé)')
    if (t === 'trio' || t === 'p12') topSuivi[t].set(top.config, (topSuivi[t].get(top.config) || 0) + 1)
    // mapper la config vers des chevaux de LA course actuelle
    const want = top.config.split(',').map(Number)
    if (want.some((r) => !parRang.has(r))) continue
    const idx = t === 'trio' ? [0, 1, 2] : t === 'p12' ? [0, 1] : t === 'p13' ? [0, 2] : [1, 2]
    const pred = idx.map((j, k2) => parRang.get(want[k2]))
    const a = course.arrivee.slice(0, 3)
    const cible = idx.map((j) => a[j])
    res[t].n++
    if (pred.every((x, j) => x === cible[j])) res[t].hit++
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})
const pct = (x, n) => (x / Math.max(1, n) * 100).toFixed(2) + '%'
console.log('')
console.log('== CONVERSION argmax-frequence-passee (' + tests.length + ' courses, ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
for (const t of Object.keys(res)) console.log('  ' + t + ' : ' + res[t].hit + '/' + res[t].n + ' = ' + pct(res[t].hit, res[t].n))
console.log('  favori exact : ' + favHit + '/' + favN + ' = ' + pct(favHit, favN))
console.log('  hasard exact (esp.) : ' + pct(hasE, tests.length))
console.log('  stabilite top trio : ' + JSON.stringify([...topSuivi.trio.entries()]))
console.log('  stabilite top p12 : ' + JSON.stringify([...topSuivi.p12.entries()]))
