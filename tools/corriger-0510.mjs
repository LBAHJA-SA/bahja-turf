/* ---------------------------------------------------------------
 * tools/corriger-0510.mjs
 *
 * Repose la TICKET du 05/10 = celle du PREMIER run du jour (00 h 32),
 * conformement a la regle : "la premiere ticket apres la premiere
 * analyse est celle de l'archive, et elle ne bouge plus".
 *
 * RIEN n'est invente : les tickets viennent tous du fichier
 * data\daily.log, ligne par ligne, avec leur horodatage.
 *
 *   node tools\corriger-0510.mjs          -> ecrit data\synthese.json
 *   node tools\corriger-0510.mjs --see    -> affiche, n'ecrit rien
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGrid, GROUPES } from '../src/lib/quinte.js'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.join(ICI, '..')
const JOUR = '2026-10-05'
const voir = process.argv.includes('--see')

/* 1. les tickets du 05/10, lus dans le journal ------------------------------ */
const log = fs.readFileSync(path.join(RACINE, 'data', 'daily.log'), 'utf8').split(/\r?\n/)
const runs = []
for (const ligne of log) {
  if (!ligne.startsWith('[')) continue
  const horodatage = ligne.slice(1, ligne.indexOf(']'))
  if (!horodatage.startsWith(JOUR)) continue
  const m = ligne.match(/ticket \[[a-z]+\] ((?:\d+ ?)+)$/)
  if (!m) continue
  runs.push({ horodatage, ticket: m[1].trim().split(/\s+/).map(Number) })
}

/* 2. le premier = la regle ------------------------------------------------- */
if (!runs.length) { console.log('  aucune ligne pour ' + JOUR + ' dans data\\daily.log'); process.exit(1) }
const premier = runs[0]

console.log('')
console.log('  les ' + runs.length + ' runs du ' + JOUR + ' (data\\daily.log) :')
for (const r of runs) {
  const heureParis = new Date(r.horodatage).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
  console.log('    ' + heureParis + ' (Paris)   ' + r.ticket.join(' '))
}
console.log('')
console.log('  -> la ticket de l archive = le PREMIER run : ' + premier.ticket.join(' '))

/* 3. on applique ------------------------------------------------------------ */
const fichier = path.join(RACINE, 'data', 'synthese.json')
const db = JSON.parse(fs.readFileSync(fichier, 'utf8'))
const r = db[JOUR]
if (!r) { console.log('  pas de ligne ' + JOUR + ' dans synthese.json'); process.exit(1) }

const avant = r.ticket
r.ticket = premier.ticket
r.ticketPoseLe = premier.horodatage
r.ticketVariantes = runs.map((x) => ({ le: x.horodatage, ticket: x.ticket }))
r.note = 'ticket de 00h32 (premier run du jour) remise en archive ; les 3 autres runs du matin sont dans ticketVariantes. Le marche est arrive apres et a propose autre chose - la regle dit que la premiere ticket ne bouge plus.'

/* groupes + scores : on repart de la ticket gelee.
 * Le bloc d'un cheval est FIXE (il vient de sa case dans le carnet) : on
 * le relit avec la vraie buildGrid() du moteur, donc rien n'est devine.
 * On verifie au passage que les quotas 3-2-1-1-1 sont respectes. */
const grille = buildGrid(r.synthese, r.runners)
const parNum = new Map()
for (const g of grille.groupes) for (const c of g.cases) parNum.set(c.num, g.id)
const groupes = []
for (const g of grille.groupes) {
  const pris = r.ticket.filter((n) => parNum.get(n) === g.id)
  groupes.push({ id: g.id, pris })
  const ok = pris.length === g.quota
  console.log('    ' + g.id + '  quota ' + g.quota + '  ->  ' + pris.length + '  ' +
    (pris.join(' ') || '(vide)') + (ok ? '' : '   <<< ECART'))
}
r.groupes = groupes

const pris = new Set(r.ticket)
if (Array.isArray(r.scores)) for (const s of r.scores) s.pris = pris.has(s.num)
console.log('')
console.log('  AVANT : ' + (avant || []).join(' '))
console.log('  APRES : ' + r.ticket.join(' '))
console.log('  notee : ' + r.ticketPoseLe)
console.log('  variantes enregistrees : ' + r.ticketVariantes.length)

if (voir) { console.log('  (--see : rien n est ecrit)'); process.exit(0) }

fs.writeFileSync(fichier, JSON.stringify(db, null, 2), 'utf8')
console.log('  -> ecrit ' + fichier)
