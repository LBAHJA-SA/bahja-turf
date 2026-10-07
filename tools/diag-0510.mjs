/* ---------------------------------------------------------------
 * tools\diag-0510.mjs  —  POURQUOI le n°5 a disparu du G2 ?
 *
 *   node tools\diag-0510.mjs
 *
 * Le 05/10, le moteur a pose a 02h32   : 9 11 8 5 13 3 7 4   (n°5 dans le G2)
 * Relance aujourd'hui, sans marche    : 9 11 13 10 7 8 3 4   (n°10 a la place)
 *
 * Un seul cheval a bouge. On affiche tout ce qui peut expliquer ca :
 * la carriere, les filtres, le score, et le score存档 de 08h45.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { trouverCourse, construireTicket } from './daily.mjs'
import { scorePhysique, filtres, classerPhysique } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATE = '2026-10-05'
const QUERIES = [5, 10]

const db = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'synthese.json'), 'utf8'))
const rec = db[DATE]

console.log('')
console.log(`  ${DATE}  ${rec.hippodrome} ${rec.discipline} ${rec.distance}m`)
console.log(`  ticket archivee : ${rec.ticket.join(' ')}`)
console.log(`  archives (08h45): ${(rec.scores || []).filter((s) => QUERIES.includes(s.num)).map((s) => `n°${s.num} global=${s.global} forme=${s.forme} dist=${s.dist} piste=${s.piste} niveau=${s.niveau} terrain=${s.terrain} corde=${s.corde} f=${s.filtres}`).join('\n                    ')}`)
console.log('')

const course = await trouverCourse(DATE, rec.synthese, rec.courseId)
const courseJour = { dist: course.distance || 2500, surf: /ATTELE|TROT/i.test(course.discipline || '') ? 'PSF' : 'Gazon', sens: 'D', discipline: course.discipline || 'PLAT', hippo: course.hippodrome || '' }

const t = await construireTicket(rec.synthese, course, null, rec.courseId, { sansMarche: true })
console.log(`  ticket aujourd hui (sans marche) : ${t.ticket.join(' ')}`)
console.log(`  groupes : ${t.groupes.map((g) => `${g.id}[${g.pris.join(' ')}]`).join('  ')}`)
console.log('')

const cars = t.inputs.cars
const parts = course.participants
for (const num of QUERIES) {
  const p = parts.find((x) => x.num === num)
  const runs = cars[num] || []
  const s = scorePhysique(p, runs, courseJour)
  const f = filtres(p, runs, courseJour)
  console.log(`  n°${num} ${(p.horse || p.nom || '')}`)
  console.log(`     p du jour : ${JSON.stringify(Object.fromEntries(Object.entries(p).filter(([k]) => !/form|musique|stat/i.test(k))))}`)
  console.log(`     carriere  : ${runs.length} courses`)
  for (const r of runs) console.log(`        ${r.date || '?'} ${String(r.dist || '?').padStart(5)}m ${r.hippo || '?'} -> ${r.place ?? '?'}`)
  console.log(`     score     : global=${s?.global?.toFixed(2)} forme=${s?.score?.toFixed?.(2)} dist=${s?.dist} piste=${s?.piste} niveau=${s?.niveau} terrain=${s?.terrain} corde=${s?.corde}`)
  console.log(`     filtres   : ${f.map((x) => `${x.nom || '?'}=${x.ok ? 'ok' : 'NON'}`).join(' ')}  -> ${f.filter((x) => x.ok).length}/3`)
  console.log('')
}

/* le classement physique complet : ou se placent 5 et 10 */
const sc = []
for (const p of parts) {
  const runs = cars[p.num]
  if (!runs || !runs.length) continue
  const s = scorePhysique(p, runs, courseJour)
  const f = filtres(p, runs, courseJour)
  sc.push({ p, s, f, ok: f.filter((x) => x.ok).length })
}
const clas = classerPhysique(sc)
console.log('  classement physique (ordre du moteur) :')
clas.forEach((x, i) => { if (QUERIES.includes(x.p.num)) console.log(`     ${i + 1}. n°${x.p.num} ${x.p.horse || x.p.nom} — ok=${x.ok}/3 global=${x.s?.global?.toFixed(2)}`) })
console.log('')
