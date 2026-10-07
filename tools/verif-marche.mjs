/**
 * VÉRIFICATION — la règle du marché est-elle bien celle qu'on a mesurée ?
 *
 * On rejoue les 4 Quintés de l'archive en appelant le VRAI moteur
 * (remplirGrille) avec data/cotes.json, et on compare avec le moteur d'avant.
 *
 *   node tools\verif-marche.mjs
 */
import fs from 'node:fs'
import { buildGrid, remplirGrille, classerPhysique, scorePhysique, filtres } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const eq = JSON.parse(fs.readFileSync('data/cotes.json', 'utf8'))

let avecMarche = 0, sansMarche = 0, n = 0
console.log('\n' + '='.repeat(104))
console.log('  VÉRIFICATION — le VRAI moteur (remplirGrille), avant / après la cote')
console.log('='.repeat(104))

for (const d of Object.keys(db).sort()) {
  const r = db[d]
  if (!r.arrivee?.length) continue
  const cotes = eq[r.courseId]?.cotes || []
  if (!cotes.length) continue
  const map = Object.fromEntries(cotes.map((x) => [x.num, x]))
  const participants = r.runners.map((num) => ({ num, nom: '', discipline: r.discipline }))
  const grille = buildGrid(r.synthese, r.runners)
  // « avant » = le classement d'archives (score global), comme le faisait l'ancien moteur
  const classement = [...(r.scores || [])]
    .sort((a, b) => (b.global ?? 0) - (a.global ?? 0))
    .map((x) => ({ p: { num: x.num, nom: x.nom }, s: { global: x.global, forme: x.forme } }))

  const avant = remplirGrille(grille, classement, r.discipline)
  const apres = remplirGrille(grille, classement, r.discipline, map)

  const a = r.arrivee.slice(0, 5)
  const pa = a.filter((x) => avant.ticket.includes(x)).length
  const pb = a.filter((x) => apres.ticket.includes(x)).length
  avecMarche += pb; sansMarche += pa; n += a.length
  console.log('\n  ' + d + '  ' + (r.hippodrome || '') + ' ' + (r.discipline || '') + '   arrivée ' + a.join(' '))
  console.log('      sans cote  ' + pa + '/5   ' + avant.ticket.join(' '))
  console.log('      AVEC cote  ' + pb + '/5   ' + apres.ticket.join(' '))
  apres.detail.forEach((g) => {
    const star = g.cases.find((c) => c.surprise)
    if (g.quota >= 2) console.log('      ' + g.id + ' : ' + g.cases.map((c) => c.num + '@' + c.cote + (c.pris ? '■' : '□') + (c.surprise ? '★' : '')).join('  ')
      + (star ? '   → surprise = n°' + star.num + ' @' + star.cote : ''))
  })
}
console.log('\n' + '-'.repeat(104))
console.log('  TOTAL   sans cote ' + sansMarche + '/' + n + '   ·   AVEC cote ' + avecMarche + '/' + n + '   ·   hasard 12.0/20')
console.log('-'.repeat(104) + '\n')