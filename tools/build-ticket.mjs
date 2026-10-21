/* tools/build-ticket.mjs — ARTEFACT TICKET-GROUPE (12/10/2026).
 * Tables globales top-50 par test (trio,P12,P13,P23) depuis tout l'archivecouple,
 * avec n + taux. La page mappe le top-K (K=10 : voir groupe-ticket.mjs —
 * K10 domine K5 partout : trio +5.3pts, P12 +12.7, P13 +14, P23 +12 pour
 * +1 à +2 chevaux) sur les rangs du jour. Aucun poids, aucun mélange.
 * Usage : node tools/build-ticket.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charger } from './empreinte-couple.mjs'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const rangs = (c) => { const o = c.partants.map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) })).filter((x) => Number.isFinite(x.c)).sort((a, b) => a.c - b.c || a.num - b.num); const m = new Map(o.map((x, i) => [x.num, i + 1])); return c.arrivee.slice(0, 3).map((n) => m.get(n) ?? null) }
const key = { trio: (r) => r.join(','), p12: (r) => r[0] + ',' + r[1], p13: (r) => r[0] + ',' + r[2], p23: (r) => r[1] + ',' + r[2] }
const val = { trio: (r) => r.every((x) => x != null), p12: (r) => r[0] != null && r[1] != null, p13: (r) => r[0] != null && r[2] != null, p23: (r) => r[1] != null && r[2] != null }

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const out = { genere: new Date().toISOString(), corpus: tout.length, Kdefaut: 10, tests: {} }
for (const t of Object.keys(key)) {
  const m = new Map(); let n = 0
  for (const c of tout) { const r = rangs(c); if (!val[t](r)) continue; n++; const k = key[t](r); m.set(k, (m.get(k) || 0) + 1) }
  out.tests[t] = { n, configs: [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([cfg, nn]) => ({ cfg, n: nn, taux: +(nn / n * 100).toFixed(2) })) }
  const top = out.tests[t].configs
  const couv10 = (top.slice(0, 10).reduce((s, x) => s + x.n, 0) / n * 100).toFixed(1)
  console.log(t + ' n=' + n + ' distinct=' + m.size + ' top1=' + top[0].cfg + '(' + top[0].n + ') top10couv=' + couv10 + '%')
}
fs.writeFileSync(path.join(RACINE, 'public', 'data', 'ticket-groupe.json'), JSON.stringify(out))
console.log('artefact : public/data/ticket-groupe.json')
