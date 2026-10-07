// Le CDX avec collapse=digest ne gardait qu'une capture par contenu : 190 jours.
// Sans collapse, on peut avoir bien plus de jours — et donc plus de courses
// mesurables. On regarde ce que le Wayback a vraiment.
import { writeFileSync, existsSync, readFileSync } from 'fs'

const F = 'cdx-complet.json'
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
const BASE = 'http://web.archive.org/cdx/search/cdx?url=pronostics-turf.info/&from=20180101&to=20260928&output=json&filter=statuscode:200&fl=timestamp,original&'

const variantes = {
  'collapse=timestamp:8': BASE + 'collapse=timestamp:8',
  'sans collapse': BASE,
  'collapse=timestamp:4': BASE + 'collapse=timestamp:4',
}
let fusion = {}
for (const [nom, u] of Object.entries(variantes)) {
  let rows = null
  for (let i = 0; i < 5 && !rows; i++) {
    try {
      const t = await (await fetch(u, { headers: UA, signal: AbortSignal.timeout(120000) })).text()
      if (t.trim().startsWith('[')) rows = JSON.parse(t).slice(1)
    } catch (e) { /* CDX répond 503 sous charge */ }
    if (!rows) await new Promise((r) => setTimeout(r, 5000 * (i + 1)))
  }
  if (!rows) { console.log(`  ${nom.padEnd(24)} inaccessible`); continue }
  const jours = new Set(rows.map((x) => x[0].slice(0, 8)))
  const parAn = {}
  for (const j of jours) { const k = j.slice(0, 4); parAn[k] = (parAn[k] || 0) + 1 }
  console.log(`  ${nom.padEnd(24)} ${String(rows.length).padStart(6)} captures   ${String(jours.size).padStart(4)} jours distincts`)
  console.log(`  ${' '.repeat(24)} ${Object.entries(parAn).sort().map(([a, n]) => `${a}:${n}`).join('  ')}`)
  for (const r of rows) fusion[r[0]] = r[1]
}
const all = Object.entries(fusion).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([t, o]) => [t, o])
const jours = new Set(all.map((x) => x[0].slice(0, 8)))
console.log(`\n  FUSION : ${all.length} captures sur ${jours.size} jours distincts`)
writeFileSync(F, JSON.stringify(all))

// Combien de courses seront mesurables ? Il faut la grille ET l'arrivée.
const d2s = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
const byJour = {}
for (const [ts] of all) (byJour[ts.slice(0, 8)] ||= []).push(ts)
let courses = 0
const detail = []
for (const j of Object.keys(byJour).sort()) {
  const d = new Date(Date.UTC(+j.slice(0, 4), +j.slice(4, 6) - 1, +j.slice(6, 8)))
  d.setUTCDate(d.getUTCDate() + 1)
  const n = d.toISOString().slice(0, 10).replace(/-/g, '')
  if (byJour[n]) { courses++; detail.push(`${d2s(j)}`) }
}
console.log(`  PAIRES de jours consécutifs : ${courses}  →  ${courses} courses mesurables au mieux`)
console.log('  ' + detail.join('  '))
