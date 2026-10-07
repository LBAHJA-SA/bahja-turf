/* ---------------------------------------------------------------
 * tools\test-moteur.mjs  —  le garde-fou QUOTIDIEN du moteur
 *
 *   node tools\test-moteur.mjs
 *
 * Pour chaque course de l'archive, on rebatit la ticket avec le moteur
 * d'aujourd'hui et on verifie les invariants de la methode :
 *
 *   ① 8 chevaux (quota 3-2-1-1-1)
 *   ② chaque bloc respecte SON quota exactement
 *   ③ aucun cheval hors des blocs (donc aucun doublon)
 *
 * On n'exige PAS que la ticket rebuilding soit egale a celle de l'archive :
 * elle a ete posee avec le marche et les carrières de l'heure (figes dans
 * data\replay\). C'est `tools\rejouer.mjs` qui rejoue le moteur a l'identique.
 *
 * Si ce test tombe en rouge apres une modification, le defaut est dans le
 * moteur — et il est LOCALISE sur la course concernee.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { trouverCourse, construireTicket } from './daily.mjs'
import { buildGrid } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const QUOTAS = [3, 2, 1, 1, 1]

const db = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'synthese.json'), 'utf8'))
const dates = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const cibles = dates.length ? dates : Object.keys(db).sort().reverse()

console.log('')
console.log('  GUARDE-FOU DU MOTEUR — quotas 3-2-1-1-1 sur tout l archive')
console.log('')

let ko = 0
let ignore = 0

for (const date of cibles) {
  const rec = db[date]
  if (!rec?.synthese?.length || !rec.courseId) { console.log(`  --       ${date}  pas de donnees`); ignore++; continue }

  let t = null, grille = null, nums = []
  try {
    const course = await trouverCourse(date, rec.synthese, rec.courseId)
    if (!course) throw new Error('course introuvable')
    nums = course.participants.map((p) => p.num)
    t = await construireTicket(rec.synthese, course, null, rec.courseId, { sansMarche: true })
    grille = buildGrid(rec.synthese, nums)
  } catch (e) {
    console.log(`  KO       ${date}  ${e.message}`)
    ko++
    continue
  }

  const erreurs = []
  const noms = grille.groupes.map((g) => `${g.id}=${g.quota}`).join(' ')
  if (noms !== 'G1=3 G2=2 G3=1 G4=1 G5=1') erreurs.push(`quotas du carnet = ${noms}`)

  if (t.ticket.length !== QUOTAS.reduce((a, b) => a + b, 0)) erreurs.push(`${t.ticket.length} chevaux au lieu de 8`)

  grille.groupes.forEach((g, i) => {
    const pris = t.ticket.filter((n) => g.cases.some((c) => c.num === n))
    const q = QUOTAS[i]
    if (pris.length !== q) erreurs.push(`${g.id} : ${pris.length} pris au lieu de ${q}  (${pris.join(' ') || '-'})`)
  })

  if (new Set(t.ticket).size !== t.ticket.length) erreurs.push('doublon dans la ticket')

  const hors = t.ticket.filter((n) => !nums.includes(n))
  if (hors.length) erreurs.push(`chevaux absents de la course : ${hors.join(' ')}`)

  if (erreurs.length) {
    ko++
    console.log(`  KO       ${date}  ${rec.hippodrome || '?'} ${rec.distance || '?'}m`)
    console.log(`             ticket : ${t.ticket.join(' ')}`)
    for (const e of erreurs) console.log(`             - ${e}`)
  } else {
    console.log(`  OK       ${date}  ${(rec.hippodrome || '?').padEnd(14)} ${String(rec.distance || '?').padStart(5)}m  ${t.ticket.join(' ')}   groupes ${t.groupes.map((g) => `${g.id}[${g.pris.join(' ')}]`).join(' ')}`)
  }
}

console.log('')
console.log(`  ${cibles.length - ko - ignore} conforme(s) · ${ko} en defaut · ${ignore} ignoree(s)`)
console.log('')
process.exit(ko ? 1 : 0)
