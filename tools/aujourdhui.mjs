/**
 * AUJOURD'HUI — la grille du jour, le bloc par bloc, et le TICKET DU MOTEUR.
 *
 * ⭐ Depuis le 16/10/2026 ce script appelle le VRAI `remplirGrille()` (§11.22) :
 * il ne réimplémente plus la règle de choix. Ce qui est affiché est donc, par
 * construction, le ticket de la page — G1 carnet · G2 marché · G3-G5 carnet.
 *
 * Les cotes viennent de data/cotes.json (tools/cotes.mjs → equidia.fr).
 *
 *   node tools\aujourdhui.mjs [AAAA-MM-JJ]
 */
import fs from 'node:fs'
import { buildGrid, classerPhysique, computeStats, remplirGrille } from '../src/lib/quinte.js'

const jour = process.argv[2] || new Date().toISOString().slice(0, 10)
const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const eq = fs.existsSync('data/cotes.json') ? JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) : {}
const r = db[jour]
if (!r) { console.log('  ' + jour + ' : rien dans l\'archive (data/synthese.json)'); process.exit(0) }

const entree = eq[r.cle || r.courseId] || {}
const cotes = Object.fromEntries((entree.cotes || []).map((x) => [x.num, x]))
const scores = Object.fromEntries((r.scores || []).map((x) => [x.num, x]))
const grille = buildGrid(r.synthese, r.runners)
/** le RANG de presse P1..Pn : c'est la place de presse, pas le n° de colonne */
const placeDe = (num) => grille.parNum[num]

const stats = computeStats(Object.values(db).filter((x) => x.arrivee?.length))
const brut = (r.scores || []).map((s) => ({ p: { num: s.num }, s, ok: (s.filtres || []).every((x) => x) }))
const classement = brut.length ? classerPhysique(brut) : []
const { ticket, detail } = remplirGrille(grille, classement, r.discipline, cotes, stats)

console.log('\n' + '='.repeat(118))
console.log('  ' + jour.toUpperCase() + '  ·  ' + r.hippodrome + '  ·  ' + r.discipline + '  ·  ' + r.distance + ' m  ·  ' + r.nbPartants + ' partants')
console.log('  cotes : ' + (entree.source || 'AUCUNE — lance : node tools\\cotes.mjs ' + (r.cle || r.courseId))
  + '   ·   favori marché n°' + (entree.favori ?? '?') + '  (presse P1 = n°' + (r.synthese?.[0] ?? '?') + ')')
console.log('  choix : G1 carnet · G2 marché · G3-G5 carnet  (§11.22)')
console.log('='.repeat(118))

for (const g of detail) {
  const cases = g.cases.slice().sort((a, b) => (a.pris === b.pris ? a.place - b.place : a.pris ? -1 : 1))
  console.log('\n  ' + g.id + '   quota ' + g.quota + '/' + g.cases.length + '   (choix : ' + g.choix + ')')
  cases.forEach((c) => {
    const e = cotes[c.num]
    console.log('    ' + (c.pris ? '■' : '□') + ' n°' + String(c.num).padStart(2)
      + ' cote ' + String(e?.cote ?? '—').padStart(7)
      + '  ' + (e?.tendance === '+' ? '▲' : e?.tendance === '-' ? '▼' : '■')
      + '  presse P' + String(placeDe(c.num) ?? '?').padStart(2)
      + '  case ' + String(c.slot).padStart(2)
      + '  global ' + String(scores[c.num]?.global ?? '—').padStart(5)
      + (c.pris ? '   retenu' : '   écarté'))
  })
}

console.log('\n' + '-'.repeat(118))
console.log('  TICKET  (' + ticket.length + ' chevaux)   ' + ticket.join(' · '))
console.log('  ordre   : les probabilités de place de l\'archive (' + (stats?.nb ?? 0) + ' Quinté(s) clôturé(s))'
  + '   1er choix = le plus souvent 1er, 2e choix = le plus souvent 2e, etc.')
console.log('             ' + ticket.slice(0, 5).map((n, i) =>
  '[' + (i + 1) + 'e] n°' + n + ' P' + placeDe(n) + ' → P(' + ['1er', '2e', '3e', '4e', '5e'][i] + ')='
  + (stats?.parPlace?.[(placeDe(n) || 1) - 1]?.p?.[i] ?? '?') + '%').join('  '))
console.log('  ticket archive : ' + (r.ticket || []).join(' · ') + '   [' + (r.ticketSource || '?') + ']')
console.log('-'.repeat(118) + '\n')
