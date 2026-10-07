/* ---------------------------------------------------------------
 * tools\test-carriere.mjs  —  la carriere automatique est-elle stable ?
 *
 *   node tools\test-carriere.mjs 2026-10-05_R1_C1 [nbAppels]
 *
 * Le 05/10/2026, la meme course, deux appels de autoCarriere() a quelques
 * secondes d'ecart : est-ce qu'on obtient le MEME texte ?
 *
 * Si non, voila le defaut localise : le classement physique change d'un run a
 * l'autre, donc la ticket change, et on ne peut plus developper le moteur.
 * ------------------------------------------------------------- */

import { autoCarriere, parseCarriere } from '../src/lib/quinte.js'

const courseId = process.argv[2] || '2026-10-05_R1_C1'
const nb = Number(process.argv[3] || 2)

const empreinte = (s) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(16)
}

const tires = []
for (let i = 0; i < nb; i++) {
  const a = await autoCarriere(courseId, () => {})
  const cars = parseCarriere(a.texte)
  const lignes = Object.entries(cars)
    .map(([num, runs]) => `${num}:${runs.map((r) => `${r.dist || '?'}#${r.place ?? '?'}@${r.hippo || '?'}`).join(',')}`)
    .sort()
  const texte = lignes.join('\n')
  tires.push({ i: i + 1, empreinte: empreinte(texte), lignes, couverture: a.couverture, cars })
  console.log(`  appel ${i + 1}  empreinte ${empreinte(texte)}  chevaux ${Object.keys(cars).length}  formes ${texte.split('\n').reduce((s, l) => s + l.split(',').length, 0)}`)
}

const memes = tires.every((t) => t.empreinte === tires[0].empreinte)
console.log('')
console.log(memes ? '  OK — la carriere automatique est IDENTIQUE a chaque appel' : '  KO — la carriere automatique CHANGE d un appel a l autre')

if (!memes) {
  for (let i = 1; i < tires.length; i++) {
    console.log('')
    console.log(`  --- appel 1 contre appel ${i + 1} ---`)
    const a = new Map(tires[0].lignes.map((l) => [l.split(':')[0], l]))
    const b = new Map(tires[i].lignes.map((l) => [l.split(':')[0], l]))
    for (const num of [...new Set([...a.keys(), ...b.keys()])].sort((x, y) => x - y)) {
      if (a.get(num) !== b.get(num)) {
        console.log(`    n°${num}`)
        console.log(`      avant : ${a.get(num) || '(absent)'}`)
        console.log(`      apres : ${b.get(num) || '(absent)'}`)
      }
    }
  }
}
console.log('')
process.exit(memes ? 0 : 1)
