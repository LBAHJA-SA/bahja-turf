// Remplit l'archive avec les courses fournies par l'utilisateur.
// Usage : node tools/seed-archive.mjs
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('data', 'synthese.json')
const PUB = path.resolve('public', 'data', 'synthese.json')

const RECORDS = [
  {
    date: '2026-10-01',
    hippodrome: 'AUTEUIL',
    prix: 'PRIX CEREALISTE',
    courseId: '2026-10-01_R1_C1',
    discipline: 'HAIE', distance: 3600, nbPartants: 15,
    // Synthèse PAR POINTS (ordre de citation de la presse)
    synthese: [1, 3, 4, 14, 12, 7, 13, 9, 10, 2, 6, 11, 15, 8, 5],
    runners: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    ticketSource: 'auto',
    ticket: [1, 3, 4, 7, 13, 9, 15, 5],
    arrivee: [15, 3, 14, 1, 9],
    source: 'utilisateur',
    note: '4/5 — perdu n14 (P4 de G1, coupé par le quota 3/4)',
  },
  {
    date: '2026-10-02',
    hippodrome: 'VINCENNES',
    prix: 'PRIX LUDOVICA',
    courseId: '2026-10-02_R1_C4',
    discipline: 'ATTELE', distance: 2700, nbPartants: 14,
    synthese: [4, 6, 13, 9, 11, 5, 10, 3, 12, 14, 8, 7, 2, 1],
    runners: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    ticketSource: 'auto',
    ticket: [4, 6, 13, 10, 12, 14, 8, 2],
    arrivee: [4, 11, 13, 12, 7],
    source: 'utilisateur',
    note: '3/5 — perdus n11 (P5 de G2) et n7 (P12 de G4)',
  },
  {
    date: '2026-10-03',
    hippodrome: 'PARISLONGCHAMP',
    prix: 'QATAR PRIX DE LA PLACE DES VOSGES',
    courseId: '2026-10-03_R1_C4',
    discipline: 'PLAT', distance: 2500, nbPartants: 18,
    synthese: [4, 13, 9, 8, 11, 6, 3, 18, 5, 16, 1, 2, 17, 7, 14, 12, 15],
    runners: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    ticketSource: 'auto',
    ticket: [4, 13, 9, 3, 18, 5, 1, 14],
    arrivee: null,
    source: 'pronostics-turf.info',
  },
]

let db = {}
try { db = JSON.parse(fs.readFileSync(OUT, 'utf8')) } catch (e) { db = {} }

for (const r of RECORDS) {
  db[r.date] = {
    ...db[r.date],
    ...r,
    nb: r.synthese.length,
    found: true,
    collecte: r.collecte || db[r.date]?.collecte || new Date().toISOString(),
  }
}

const tri = {}
for (const k of Object.keys(db).sort().reverse()) tri[k] = db[k]
const json = JSON.stringify(tri, null, 2)
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, json, 'utf8')
fs.mkdirSync(path.dirname(PUB), { recursive: true })
fs.writeFileSync(PUB, json, 'utf8')

console.log(`Archive écrite : ${OUT}`)
console.log('')
for (const [d, r] of Object.entries(tri)) {
  const t = new Set(r.ticket || [])
  const p = (r.arrivee || []).filter((n) => t.has(n)).length
  console.log(`  ${d}  ${(r.hippodrome || '').padEnd(16)} ${r.distance}m`)
  console.log(`     synthese (${r.synthese.length}) : ${r.synthese.join(' ')}`)
  console.log(`     runners  (${(r.runners || []).length}) : ${(r.runners || []).join(' ')}`)
  console.log(`     ticket   : ${(r.ticket || []).join(' ') || '—'}`)
  console.log(`     arrivee  : ${(r.arrivee || []).join(' - ') || '—'}` +
    (r.ticket && r.arrivee ? `   →  ${p}/5` : ''))
  console.log('')
}