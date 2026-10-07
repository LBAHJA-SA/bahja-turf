/**
 * AUJOURD'HUI — la grille du jour, le bloc par bloc, et le ticket
 * que donne la règle « les quota meilleures cotes du bloc ».
 *
 * Les cotes viennent de data/cotes.json (tools/cotes.mjs → equidia.fr).
 *
 *   node tools\aujourdhui.mjs [AAAA-MM-JJ]
 */
import fs from 'node:fs'
import { buildGrid, computeStats, ordonnerParStats } from '../src/lib/quinte.js'

const jour = process.argv[2] || new Date().toISOString().slice(0, 10)
const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const eq = fs.existsSync('data/cotes.json') ? JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) : {}
const r = db[jour]
if (!r) { console.log('  ' + jour + ' : rien dans l\'archive (data/synthese.json)'); process.exit(0) }

const cotes = Object.fromEntries((eq[r.courseId]?.cotes || []).map((x) => [x.num, x]))
const scores = Object.fromEntries((r.scores || []).map((x) => [x.num, x]))
const grille = buildGrid(r.synthese, r.runners)
/** le RANG de presse P1..Pn : c'est la case, pas l'ordre des cases */
const slotParPresse = (num) => grille.parNum[num]

console.log('\n' + '='.repeat(118))
console.log('  ' + jour.toUpperCase() + '  ·  ' + r.hippodrome + '  ·  ' + r.discipline + '  ·  ' + r.distance + ' m  ·  ' + r.nbPartants + ' partants')
console.log('  cotes : ' + (eq[r.courseId]?.source || 'AUCUNE — lance : node tools\\cotes.mjs ' + r.courseId)
  + '   ·   favori marché n°' + (eq[r.courseId]?.favori ?? '?') + '  (presse P1 = n°' + (r.synthese?.[0] ?? '?') + ')')
console.log('='.repeat(118))

const parCote = (a, b) => (cotes[a]?.cote ?? 1e9) - (cotes[b]?.cote ?? 1e9)
const stats = computeStats(Object.values(db).filter((x) => x.arrivee?.length))
const ticket = []
for (const g of grille.groupes) {
  const q = Math.min(g.quota, g.cases.length)
  const tri = [...g.cases].sort((a, b) => parCote(a.num, b.num))
  const ecartes = tri.slice(q)
  console.log('\n  ' + g.id + '   quota ' + q + '/' + g.cases.length)
  tri.forEach((c) => {
    const e = cotes[c.num]
    const s = scores[c.num]
    const rang = tri.indexOf(c)
    const pris = rang < q
    console.log('    ' + (pris ? '■' : '□') + ' n°' + String(c.num).padStart(2) + '  ' + String(c.nom || '').padEnd(24)
      + ' cote ' + String(e?.cote ?? '—').padStart(7)
      + '  ' + (e?.tendance === '+' ? '▲' : e?.tendance === '-' ? '▼' : '■')
      + '  presse P' + slotParPresse(c.num)
      + '  global ' + String(s?.global ?? '—').padStart(5)
      + (pris ? '   retenu' : '   écarté'))
  })
  ticket.push(...tri.slice(0, q).map((c) => c.num))
  console.log('      → les ' + q + ' meilleur(s) cote du bloc : ' + tri.slice(0, q).map((c) => 'n°' + c.num).join(' ')
    + (q >= 2 && ecartes.length ? '   (écartés : ' + ecartes.map((c) => 'n°' + c.num).join(' ') + ')' : ''))
}

const t = ordonnerParStats(ticket, grille, stats, cotes)
console.log('\n' + '-'.repeat(118))
console.log('  TICKET  (' + t.length + ' chevaux)   ' + t.join(' · '))
console.log('  ordre   : les probabilités de place de l\'archive (' + (stats?.nb ?? 0) + ' Quinté(s) clôturé(s))'
  + '   1er choix = le plus souvent 1er, 2e choix = le plus souvent 2e, etc.')
console.log('             ' + t.slice(0, 5).map((n, i) =>
  '[' + (i + 1) + 'e] n°' + n + ' P' + slotParPresse(n) + ' → P(' + ['1er', '2e', '3e', '4e', '5e'][i] + ')='
  + (stats?.parPlace?.[(slotParPresse(n) || 1) - 1]?.p?.[i] ?? '?') + '%').join('  '))
console.log('  ticket archive : ' + (r.ticket || []).join(' · ') + '   [' + (r.ticketSource || '?') + ']')
console.log('-'.repeat(118) + '\n')