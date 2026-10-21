/* tools/groupe-ticket.mjs — TICKET-GROUPE (développement, 12/10/2026).
 * Pas de single-shot : par test (trio,P12,P13,P23), on joue les top-K configs
 * du passé strict, mappées aux chevaux du jour. Succès = la config réelle
 * DANS l'ensemble. On mesure couverture + taille du ticket, par K et par test.
 * Aucun poids, aucune moyenne entre tests. Causal strict.
 * Usage : node tools/groupe-ticket.mjs [N=150]
 */
import { charger } from './empreinte-couple.mjs'

const N = Math.max(1, Number(process.argv[2]) || 150)
const KS = [3, 5, 10]
const rangs = (c) => { const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num); const m = new Map(o.map((x, i) => [x.num, i + 1])); return { parNum: m, parRang: new Map([...m.entries()].map(([n, r]) => [r, n])) } }
const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-N)
const key = { trio: (r) => r.join(','), p12: (r) => r[0] + ',' + r[1], p13: (r) => r[0] + ',' + r[2], p23: (r) => r[1] + ',' + r[2] }
const val = { trio: (r) => r.every((x) => x != null), p12: (r) => r[0] != null && r[1] != null, p13: (r) => r[0] != null && r[2] != null, p23: (r) => r[1] != null && r[2] != null }
const rr = (c) => { const { parNum } = rangs(c); return c.arrivee.slice(0, 3).map((n) => parNum.get(n) ?? null) }

const res = {}
for (const t of Object.keys(key)) { res[t] = {}; for (const k of KS) res[t][k] = { hit: 0, n: 0, chv: 0 } }
const t0 = Date.now()
tests.forEach((course, i) => {
  const passe = tout.filter((c) => c.date < course.date)
  const freq = { trio: new Map(), p12: new Map(), p13: new Map(), p23: new Map() }
  for (const c of passe) { const r = rr(c); for (const t of Object.keys(freq)) { if (!val[t](r)) continue; const k = key[t](r); freq[t].set(k, (freq[t].get(k) || 0) + 1) } }
  const { parRang } = rangs(course)
  const vrai = rr(course)
  for (const t of Object.keys(key)) {
    if (!val[t](vrai)) continue
    const vk = key[t](vrai)
    const ord = [...freq[t].entries()].sort((a, b) => b[1] - a[1])
    for (const K of KS) {
      const set = new Set(ord.slice(0, K).map((x) => x[0]).filter((k) => k.split(',').map(Number).every((r) => parRang.has(r))))
      if (!set.size) continue
      res[t][K].n++
      if (set.has(vk)) res[t][K].hit++
      const pos = t === 'trio' ? [0, 1, 2] : t === 'p12' ? [0, 1] : t === 'p13' ? [0, 2] : [1, 2]
      const chv = new Set()
      for (const k of set) { const w = k.split(',').map(Number); pos.forEach((j, i2) => chv.add(parRang.get(w[i2]))) }
      res[t][K].chv += chv.size
    }
  }
  if ((i + 1) % 50 === 0) console.log('  ... ' + (i + 1) + '/' + tests.length)
})
const pct = (h, n) => (h / Math.max(1, n) * 100).toFixed(1) + '%'
console.log('')
console.log('== TICKET-GROUPE (' + N + ' courses, ' + ((Date.now() - t0) / 1000).toFixed(0) + 's) ==')
for (const t of Object.keys(res)) {
  const l = KS.map((K) => 'K' + K + '=' + res[t][K].hit + '/' + res[t][K].n + ' ' + pct(res[t][K].hit, res[t][K].n) + ' ~' + (res[t][K].chv / Math.max(1, res[t][K].n)).toFixed(1) + 'chv').join(' · ')
  console.log('  ' + t + ' : ' + l)
}
console.log('  rappel single-shot : trio 2.67% ancien / 0.67% top1 · p12 10.0/8.67 · p13 4.67/4.67 · p23 3.33/3.33')
