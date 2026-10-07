// Wayback CDX -> какие дни есть. Кэшируем, потому что CDX отдаёт 503.
import { writeFileSync, existsSync, readFileSync } from 'fs'

const F = 'cdx-pronostics.json'
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
const U = 'http://web.archive.org/cdx/search/cdx?url=pronostics-turf.info/&from=20190101&to=20260928&output=json&filter=statuscode:200&fl=timestamp,original&collapse=digest'

if (!existsSync(F)) {
  let rows = null
  for (let i = 0; i < 6 && !rows; i++) {
    try {
      const r = await fetch(U, { headers: UA, signal: AbortSignal.timeout(120000) })
      const t = await r.text()
      if (t.trim().startsWith('[')) rows = JSON.parse(t).slice(1)
      else console.log(`  CDX -> HTTP body (${t.length}) essai ${i + 1}`)
    } catch (e) { console.log(`  CDX essai ${i + 1}: ${e.message}`) }
    if (!rows) await new Promise((r) => setTimeout(r, 4000 * (i + 1)))
  }
  if (!rows) { console.log('CDX inaccessible'); process.exit(1) }
  writeFileSync(F, JSON.stringify(rows))
  console.log(`snapshots stockés: ${rows.length}`)
} else { console.log('cache présente') }

const rows = JSON.parse(readFileSync(F, 'utf8'))
const byDate = {}
for (const x of rows) { const d = x[0].slice(0, 8); (byDate[d] = byDate[d] || []).push(x) }
const d2s = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
const next = (s) => {
  const dt = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)))
  dt.setUTCDate(dt.getUTCDate() + 1)
  return dt.toISOString().slice(0, 10).replace(/-/g, '')
}
const pairs = []
for (const d of Object.keys(byDate).sort()) { const n = next(d); if (byDate[n]) pairs.push([d, n]) }
console.log(`\nsnapshots: ${rows.length}   jours distincts: ${Object.keys(byDate).length}`)
console.log(`PAIRES consécutives (D -> D+1): ${pairs.length}\n`)
for (const p of pairs) console.log(`  ${d2s(p[0])} -> ${d2s(p[1])}   (${byDate[p[0]].length} + ${byDate[p[1]].length} snapshots)`)
