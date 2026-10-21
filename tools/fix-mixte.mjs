/* tools/fix-mixte.mjs — FIXE archive-dérivé (diagnostic utilisateur 12/10/2026).
 * Règle sans poids inventé : par test (trio,P12,P13,P23), on énumère TOUS les
 * rangs mappables de LA course actuelle, on les sépare en 2 strates FAMILLE
 * (bornes ODDS_LAYER_BOUNDS sur les cotes du jour) : FAV-FAV vs OUT/TOC, et
 * on prend l'argmax fréquence-passée DANS chaque strate → 2 prédictions.
 * Hit si l'une des 2 touche l'ordre réel. Causal strict, par test séparé.
 * Usage : node tools/fix-mixte.mjs [N=150]
 */
import { charger } from './empreinte-couple.mjs'

const N = Math.max(1, Number(process.argv[2]) || 150)
const B = [['FAV1', 0, 3.0], ['FAV2', 3.1, 7.0], ['FAV3', 7.1, 10.0], ['OUT1', 10.1, 13.0], ['OUT2', 13.1, 16.0], ['OUT3', 16.1, 18.0], ['TOC1', 18.1, 21.0], ['TOC2', 21.1, 25.0], ['TOC3', 25.1, 28.0], ['TOC4', 28.1, 31], ['TOC5', 31.1, 36], ['TOC6', 36.1, 40], ['TOC7', 40.1, 50], ['TOC8', 50.1, 100]]
const fam = (c) => { const n = Number(c); if (!Number.isFinite(n) || n <= 0) return null; for (const [nm, lo, hi] of B) if (n >= lo && n <= hi) return nm; if (n > 100) return 'TOC8'; return null }

const rangsDe = (partants) => {
  const o = partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num)
  return { parNum: new Map(o.map((x, i) => [x.num, i + 1])), parRang: new Map(o.map((x, i) => [i + 1, x.num])), taille: o.length }
}
const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
const cles = { trio: (r) => r.join(','), p12: (r) => r[0] + ',' + r[1], p13: (r) => r[0] + ',' + r[2], p23: (r) => r[1] + ',' + r[2] }
const valide = { trio: (r) => r.every((x) => x != null), p12: (r) => r[0] != null && r[1] != null, p13: (r) => r[0] != null && r[2] != null, p23: (r) => r[1] != null && r[2] != null }
const rc = (c) => { const m = rangsDe(c.partants).parNum; return c.arrivee.slice(0, 3).map((n) => m.get(n) ?? null) }

// tous les rangs mappables d'une course pour un test
function* cands(course, t) {
  const { parRang, taille } = rangsDe(course.partants)
  const par = new Map(course.partants.map((p) => [p.num, p]))
  const fams = new Map([...parRang.entries()].map(([r, num]) => [r, fam(par.get(num)?.cote_pmu)]))
  if ([...fams.values()].some((f) => !f)) return
  const R = [...parRang.keys()]
  if (t === 'trio') { for (const a of R) for (const b of R) { if (b === a) continue; for (const c of R) { if (c === a || c === b) continue; yield [a, b, c] } } }
  else { const pos = t === 'p12' ? [0, 1] : t === 'p13' ? [0, 2] : [1, 2]; for (const a of R) for (const b of R) { if (b === a) continue; const r = []; r[pos[0]] = a; r[pos[1]] = b; yield r } }
}
const strate = (course, t, r) => {
  const { parRang } = rangsDe(course.partants)
  const par = new Map(course.partants.map((p) => [p.num, p]))
  const fs = (t === 'trio' ? r : t === 'p12' ? [r[0], r[1]] : t === 'p13' ? [r[0], r[2]] : [r[1], r[2]]).map((rk) => fam(par.get(parRang.get(rk))?.cote_pmu))
  if (fs.some((f) => !f)) return null
  return fs.every((f) => f.startsWith('FAV')) ? 'FF' : 'OT'
}

const res = {}; for (const t of ['trio', 'p12', 'p13', 'p23']) res[t] = { n: 0, hit: 0, hitFF: 0, hitOT: 0 }
const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const freq = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
  for (const c of passe) { const r = rc(c); for (const t of Object.keys(freq)) { if (!valide[t](r)) continue; const k = cles[t](r); freq[t].set(k, (freq[t].get(k) || 0) + 1) } }
  const vrai = rc(course)
  for (const t of Object.keys(res)) {
    if (!valide[t](vrai)) continue
    const vk = cles[t](vrai)
    const best = { FF: null, OT: null }
    for (const r of cands(course, t)) {
      const k = t === 'trio' ? r.join(',') : r[0] + ',' + r[1]
      const s = strate(course, t, r)
      if (!s) continue
      const f = freq[t].get(k) || 0
      if (!best[s] || f > best[s].f) best[s] = { k, f }
    }
    if (!best.FF || !best.OT) continue
    res[t].n++
    for (const s of ['FF', 'OT']) if (best[s].k === vk) { res[t].hit++; s === 'FF' ? res[t].hitFF++ : res[t].hitOT++; break }
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})
const pct = (x, n) => (x / Math.max(1, n) * 100).toFixed(2) + '%'
console.log('')
console.log('== FIXE FF+OT (' + tests.length + ' courses, ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
for (const t of Object.keys(res)) console.log('  ' + t + ' : ' + res[t].hit + '/' + res[t].n + ' = ' + pct(res[t].hit, res[t].n) + ' (dont FF=' + res[t].hitFF + ' OT=' + res[t].hitOT + ')')
console.log('  rappel ancien moteur : trio 2.67% · rappel argmax unique : trio 1.00%, p12 8.00%, p13 0%, p23 0%')
