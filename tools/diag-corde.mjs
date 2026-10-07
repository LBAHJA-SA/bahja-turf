/* ---------------------------------------------------------------
 * tools\diag-corde.mjs  —  le critere CORDE est mort (12 % du score)
 *
 *   node tools\diag-corde.mjs [date ...]
 *
 * Constat : `scorePhysique` lit `p.corde` (ligne 1032 de src/lib/quinte.js),
 * mais casacourses renvoie le numero de depart sous le nom `depart`
 * (ligne 420). `p.corde` est donc TOUJOURS undefined, et le criterion
 * renvoie 6/10 pour les 14 chevaux — il ne distingue personne.
 *
 * Ce que dit la methode (§4) :  corde <=6 -> 10 · <=11 -> 8 · <=15 -> 5 · >=16 -> 3
 *
 * Ce script ne touche a rien : il injecte `corde = depart` dans les
 * participants et relance le moteur, pour mesurer l'ecart.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { trouverCourse } from './daily.mjs'
import { autoCarriere, parseCarriere, buildGrid, remplirGrille, scorePhysique, filtres, classerPhysique, computeStats } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const db = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'synthese.json'), 'utf8'))
const dates = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const cibles = dates.length ? dates : Object.keys(db).sort().reverse()

const sansMarche = process.argv.includes('--marche') ? false : true
console.log('')
console.log(`  ⭐ CORDE — le criterion vaut-il quelque chose ?  (${sansMarche ? 'classement physique' : 'marche'})`)
console.log('')

let rowing = 0
for (const date of cibles) {
  const rec = db[date]
  if (!rec?.synthese?.length || !rec.courseId) { console.log(`  --       ${date}  pas de donnees`); continue }
  const course = await trouverCourse(date, rec.synthese, rec.courseId)
  if (!course) { console.log(`  KO       ${date}  course introuvable`); continue }
  const courseJour = { dist: course.distance || 2500, surf: /ATTELE|TROT/i.test(course.discipline || '') ? 'PSF' : 'Gazon', sens: 'D', discipline: course.discipline || 'PLAT', hippo: course.hippodrome || '' }

  const cars = parseCarriere((await autoCarriere(course.courseId, () => {})).texte)
  const grille = buildGrid(rec.synthese, course.participants.map((p) => p.num))
  const stats = computeStats(Object.values(db).filter((x) => x.arrivee?.length))

  const lignes = []
  for (const avecCorde of [false, true]) {
    const parts = avecCorde ? course.participants.map((p) => ({ ...p, corde: p.depart })) : course.participants
    const sc = []
    for (const p of parts) {
      const runs = cars[p.num]
      if (!runs || !runs.length) continue
      const s = scorePhysique(p, runs, courseJour)
      const f = filtres(p, runs, courseJour)
      sc.push({ p, s, f, ok: f.filter((x) => x.ok).length })
    }
    const clas = classerPhysique(sc)
    const r = remplirGrille(grille, clas, courseJour.discipline, null, stats)
    const cordes = [...new Set(sc.map((x) => x.s.corde))].sort((a, b) => a - b)
    lignes.push({ avecCorde, ticket: r.ticket, cordes, clas })
  }

  const [avant, apres] = lignes
  const change = avant.ticket.join(' ') !== apres.ticket.join(' ')
  if (change) rowing++
  const conformes = (l) => grille.groupes.every((g) => {
    const pris = l.ticket.filter((n) => g.cases.some((c) => c.num === n))
    return pris.length === Math.max(1, g.quota)
  })

  console.log(`  ${date}  ${rec.hippodrome || '?'} ${rec.discipline || '?'} ${rec.distance || '?'}m`)
  console.log(`     sans corde : ${avant.ticket.join(' ')}   valeurs corde = ${avant.cordes.join(',')}   quotas ${conformes(avant) ? 'ok' : 'CASSES'}`)
  console.log(`     avec corde : ${apres.ticket.join(' ')}   valeurs corde = ${apres.cordes.join(',')}   quotas ${conformes(apres) ? 'ok' : 'CASSES'}`)
  if (rec.ticket?.length) {
    console.log(`     archive    : ${rec.ticket.join(' ')}   ->  ${apres.ticket.join(' ') === rec.ticket.join(' ') ? 'IDENTIQUE avec le correctif' : 'different'}`)
  }
  if (change) {
    const s1 = new Set(avant.ticket), s2 = new Set(apres.ticket)
    console.log(`     >> le correctif change la ticket : sort ${avant.ticket.filter((n) => !s2.has(n)).join(' ') || '-'}  entre ${apres.ticket.filter((n) => !s1.has(n)).join(' ') || '-'}`)
  }
  console.log('')
}
console.log(`  ${rowing} course(s) ou le correctif change la ticket\n`)
