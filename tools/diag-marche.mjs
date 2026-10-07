/* ---------------------------------------------------------------
 * tools\diag-marche.mjs  —  la ticket du 05/10 etait-elle une ticket de MARCHE ?
 *
 *   node tools\diag-marche.mjs
 *
 * Question : le ticket pose a 02h32 (9 11 8 5 13 3 7 4) vient-il du marche
 * Equidia ou du classement physique ? On rejoue les deux et on regarde.
 *
 * C'est important : si c'est le marche, alors la seule facon de rejouer cette
 * course est d'avoir conserve les cotes de l'heure. Equidia publie les cotes
 * de la VEILLE au SOIR — donc a 02h32 le marche existait deja.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { trouverCourse, construireTicket } from './daily.mjs'
import { buildGrid } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATE = process.argv[2] || '2026-10-05'
const db = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'synthese.json'), 'utf8'))
const rec = db[DATE]

console.log('')
console.log(`  ${DATE}  ticket archivee : ${rec.ticket.join(' ')}   mode ${rec.ticketMode}`)
console.log('')

const course = await trouverCourse(DATE, rec.synthese, rec.courseId)
const grille = buildGrid(rec.synthese, course.participants.map((p) => p.num))

console.log('  le carnet, bloc par bloc :')
for (const g of grille.groupes) {
  console.log(`    ${g.id} (quota ${g.quota}) : ${g.cases.map((c) => `n°${c.num}(P${c.place})`).join(' ')}`)
}
console.log('')

for (const sansMarche of [true, false]) {
  const t = await construireTicket(rec.synthese, course, null, rec.courseId, { sansMarche })
  const cotes = t.inputs.cotes || {}
  const nom = sansMarche ? 'SANS marche (classement physique)' : 'AVEC le marche du jour'
  console.log(`  ${nom}`)
  console.log(`     ticket : ${t.ticket.join(' ')}   mode ${t.mode}`)
  console.log(`     groupes: ${t.groupes.map((g) => `${g.id}[${g.pris.join(' ')}]`).join('  ')}`)
  if (!sansMarche && Object.keys(cotes).length) {
    for (const g of grille.groupes) {
      const tri = g.cases.map((c) => ({ n: c.num, cote: cotes[c.num]?.cote ?? '?' })).sort((a, b) => a.cote - b.cote)
      console.log(`       ${g.id} par cote : ${tri.map((x) => `n°${x.n}@${x.cote}`).join(' ')}  ->  quota ${g.quota} : n°${tri.slice(0, g.quota).map((x) => x.n).join(' ')}`)
    }
  }
  const meme = JSON.stringify(t.ticket) === JSON.stringify(rec.ticket)
  console.log(`     ${meme ? '>>> IDENTIQUE a l archive' : '    different de l archive'}`)
  console.log('')
}
