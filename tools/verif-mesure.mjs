/* Verification : pourquoi `mesure-physique` et `mesure-selection` ne tombent pas
 * sur la meme valeur pour la FORME ? Et le hasard, c'est combien ?
 *   node tools/verif-mesure.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scorePhysique, scoreForme } from '../src/lib/quinte.js'

const DOSSIER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'archives')
const cj = (r, c) => ({
  dist: c.distance || 2500,
  surf: /psf|synth/i.test(c.surface || '') ? 'PSF' : 'Gazon',
  sens: /gauche/i.test(c.corde || '') ? 'G' : 'D',
  discipline: c.specialty || c.discipline || 'PLAT',
  hippo: r.hippodrome || '',
})

let i = 0
let sommeA = 0
let sommeB = 0
let n = 0
console.log('')
console.log('  course                       disc    partants   forme(scorePhysique)  forme(scoreForme)   ecart')
for (const f of fs.readdirSync(DOSSIER).filter((x) => x.endsWith('.json'))) {
  const chemin = path.join(DOSSIER, f)
  if (!fs.statSync(chemin).size) continue
  const j = JSON.parse(fs.readFileSync(chemin, 'utf8'))
  const c = j.course || {}
  if (!(c.types_pari || []).includes('QUINTE_PLUS')) continue
  const ordre = (c.arrivee || []).flat().filter(Boolean)
  if (ordre.length < 5) continue
  const parts = (j.participants || []).filter((p) => String(p.statut || 'PARTANT').includes('PARTANT') && p.nonPartant !== true)
  const cc = cj(j.reunion, c)
  const disc = c.specialty || c.discipline || 'PLAT'

  const A = parts.slice().sort((a, b) => (scorePhysique(b, [], cc).forme - scorePhysique(a, [], cc).forme) || (a.num - b.num)).slice(0, 5)
  const B = parts.slice().sort((a, b) => (scoreForme(b.musique, disc).score - scoreForme(a.musique, disc).score) || (a.num - b.num)).slice(0, 5)
  const t = ordre.slice(0, 5)
  const ha = t.filter((x) => A.some((p) => p.num === x)).length
  const hb = t.filter((x) => B.some((p) => p.num === x)).length
  sommeA += ha
  sommeB += hb
  n++

  if (i < 8) {
    console.log(`  ${j.reunion.date} R${j.reunion.num}C${c.num}   ${String(disc).padEnd(7)} ${String(parts.length).padStart(7)}   `
      + `${String(ha).padStart(18)}  ${String(hb).padStart(17)}  ${ha === hb ? '' : '  <<< DIFFERE'}`)
    if (ha !== hb) {
      console.log(`      top5 du jour : ${t.join(' ')}`)
      console.log(`      A : ${A.map((p) => p.num + '(' + scorePhysique(p, [], cc).forme + ')').join(' ')}`)
      console.log(`      B : ${B.map((p) => p.num + '(' + scoreForme(p.musique, disc).score + ')').join(' ')}`)
    }
  }
  i++
}
console.log('')
console.log(`  sur ${n} courses :  A(scorePhysique.forme) = ${(sommeA / n).toFixed(2)}   B(scoreForme) = ${(sommeB / n).toFixed(2)}`)
console.log('')
console.log('  --- LE HASARD, correctement : on choisit N chevaux parmi nb, 5 sont arrivés ---')
const nb = 16
for (const N of [5, 6, 7, 8, 10, 12]) {
  console.log(`     N=${String(N).padStart(2)} sur ${nb} partants :  ${(N * 5 / nb).toFixed(2)} arrivants attendus au hasard`)
}
console.log('')
console.log('  (la formule utilisee dans les deux outils etait min(5,N) * 5 / nb,')
console.log('   ce qui plafonne a 5 : le hasard etait donc sous-estime pour N > 5)')
console.log('')
