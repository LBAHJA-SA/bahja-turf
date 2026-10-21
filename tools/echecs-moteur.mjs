/* tools/echecs-moteur.mjs — ÉCHECS DE L'ANCIEN MOTEUR vs EMPREINTES RÉELLES.
 * Causal strict (index + tops sur date < test.date uniquement).
 * Par test séparé (trio, P12, P13, P23), ordre respecté, aucun mélange.
 * Usage : node tools/echecs-moteur.mjs [N=150]
 */
import { charger } from './empreinte-couple.mjs'
import { construireIndex } from './empreinte-v3.mjs'
import { verdict } from '../backend/COUPLE/moteur.js'

const N = Math.max(1, Number(process.argv[2]) || 150)
const rangsDe = (partants) => {
  const o = partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num)
  return new Map(o.map((x, i) => [x.num, i + 1]))
}
const cfg = (m, t) => t.map((n) => m.get(n) ?? '?').join(',')

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
console.log('corpus=' + tout.length + ' tests=' + tests.length)

let jouees = 0, exact = 0
const predCount = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
const predHit = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
const reelCount = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
const parNiveau = {}, supEchec = [], supReussi = []
let cfgEgal = 0
const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const index = construireIndex(passe)
  const v = verdict(course.partants, index)
  const m = rangsDe(course.partants)
  const a = course.arrivee.slice(0, 3)
  const rc = { trio: cfg(m, a), p12: cfg(m, a.slice(0, 2)), p13: cfg(m, [a[0], a[2]]), p23: cfg(m, a.slice(1, 3)) }
  for (const t of Object.keys(reelCount)) reelCount[t].set(rc[t], (reelCount[t].get(rc[t]) || 0) + 1)
  if (!v || !v.trio) return
  jouees++
  parNiveau[v.niveau] = (parNiveau[v.niveau] || 0) + 1
  const t = v.trio
  const pc = { trio: cfg(m, t), p12: cfg(m, t.slice(0, 2)), p13: cfg(m, [t[0], t[2]]), p23: cfg(m, t.slice(1, 3)) }
  const okT = t[0] === a[0] && t[1] === a[1] && t[2] === a[2]
  if (okT) { exact++; supReussi.push(v.support) } else supEchec.push(v.support)
  const ok = { trio: okT, p12: t[0] === a[0] && t[1] === a[1], p13: t[0] === a[0] && t[2] === a[2], p23: t[1] === a[1] && t[2] === a[2] }
  if (pc.trio === rc.trio) cfgEgal++
  for (const k of Object.keys(predCount)) {
    predCount[k].set(pc[k], (predCount[k].get(pc[k]) || 0) + 1)
    if (ok[k]) predHit[k].set(pc[k], (predHit[k].get(pc[k]) || 0) + 1)
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})
const pct = (x, n) => (x / Math.max(1, n) * 100).toFixed(2) + '%'
const top = (m, k = 10) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k)
console.log('')
console.log('== ECHECS ANCIEN MOTEUR (' + tests.length + ' courses, ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
console.log('  jouees=' + jouees + ' exact=' + exact + ' ' + pct(exact, jouees) + ' config_pred==config_reel=' + cfgEgal + ' ' + pct(cfgEgal, jouees))
console.log('  niveaux: ' + JSON.stringify(parNiveau))
supEchec.sort((a, b) => a - b); supReussi.sort((a, b) => a - b)
const med = (s) => s.length ? s[s.length >> 1] : '-'
console.log('  support echecs: n=' + supEchec.length + ' med=' + med(supEchec) + ' min=' + (supEchec[0] ?? '-') + ' max=' + (supEchec[supEchec.length - 1] ?? '-'))
console.log('  support reussis: n=' + supReussi.length + ' [' + supReussi.join(',') + ']')
for (const k of ['trio', 'p12', 'p13', 'p23']) {
  console.log('')
  console.log('  -- ' + k + ' : PREDITES (n/hit) vs REELLES (n) --')
  for (const [c, n] of top(predCount[k], 8)) console.log('    pred (' + c + ') ' + n + ' hit=' + (predHit[k].get(c) || 0))
  for (const [c, n] of top(reelCount[k], 8)) console.log('    reel (' + c + ') ' + n)
}
