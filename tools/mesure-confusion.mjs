/* ---------------------------------------------------------------
 * tools\mesure-confusion.mjs  —  « 60 % » : un OU DEUX ?
 *
 *   node tools\mesure-confusion.mjs
 *
 * Il y a deux mesures très différentes qu'on confond :
 *
 *   « au moins UN des 3 premiers est hors du top 8 des cotes »
 *   « DEUX des 3 premiers sont hors du top 8 des cotes »
 *
 * La première est un OU. La seconde est ce qu'il faut pour qu'une ticket
 * « 4 du bas + 3 du haut » puisse gagner. On les sort côte à côte, pour
 * qu'il n'y ait plus d'ambiguïté.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const Q = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'quintes.json'), 'utf8'))
const base = []
for (const q of Q) {
  if (!Array.isArray(q.presse) || q.presse.length < 4) continue
  if (!Array.isArray(q.arrivee) || q.arrivee.length < 5) continue
  const cotes = Object.keys(q.cotes || {}).map(Number).filter((x) => q.cotes[x] > 0)
  if (cotes.length < q.nb - 2) continue
  const rang = new Map(cotes.sort((a, b) => q.cotes[a] - q.cotes[b]).map((x, i) => [x, i + 1]))
  base.push({ cle: q.date + ' ' + q.code, rang, arrivee: q.arrivee, nb: q.nb })
}

const n = base.length
const hors = (k, i, seuil = 8) => {
  const r = k.rang.get(k.arrivee[i])
  return r != null && r > seuil
}

console.log('')
console.log(`  ⭐ LE « 60 % » DÉCOMPOSÉ — ${n} Quintés`)
console.log('')
console.log('  ⭐⭐⭐  CE QU\'IL FAUT REGARDER :')
console.log('')

const parPodium = [0, 0, 0, 0]     // 0, 1, 2 ou 3 des 3 premiers hors du top 8
const parTop5 = [0, 0, 0, 0, 0, 0]  // 0..5 des 5 arrivants hors du top 8
for (const k of base) {
  let h3 = 0
  for (let i = 0; i < 3; i++) if (hors(k, i)) h3++
  parPodium[h3]++
  let h5 = 0
  for (let i = 0; i < 5; i++) if (hors(k, i)) h5++
  parTop5[h5]++
}
const p = (v) => (v / n * 100).toFixed(0) + ' %'

console.log('  --- A. sur les 3 PREMIERS ---')
console.log('  combien hors du top 8 ?    courses    part')
for (let h = 0; h <= 3; h++) {
  console.log('      ' + h + ' sur 3          ' + String(parPodium[h]).padStart(6) + '   ' + p(parPodium[h]).padStart(6)
    + (h === 1 ? '   ← le « 60 % » vient d ici (un OU)' : h === 2 ? '   ← ça, c\'est 2 des 3 : bien plus rare' : ''))
}
console.log('')
console.log(`  ⭐ « au moins UN des 3 premiers hors du top 8 » : ${parPodium[1] + parPodium[2] + parPodium[3]}/${n} = ${p(parPodium[1] + parPodium[2] + parPodium[3])}`)
console.log(`  ⭐ « DEUX des 3 premiers hors du top 8 »          : ${parPodium[2] + parPodium[3]}/${n} = ${p(parPodium[2] + parPodium[3])}`)
console.log('')

console.log('  --- B. sur les 5 ARRIVANTS (ce qu\'une ticket doit couvrir) ---')
console.log('  combien hors du top 8 ?    courses    part      une ticket 4bas+3haut peut gagner ?')
for (let h = 0; h <= 5; h++) {
  // la ticket a 3 « haut » → au plus 3 arrivants du haut ; et 4 « bas » → au plus 4 du bas
  const peut = h <= 4 && (5 - h) <= 3
  console.log('      ' + h + ' sur 5          ' + String(parTop5[h]).padStart(6) + '   ' + p(parTop5[h]).padStart(6)
    + '     ' + (peut ? 'oui' : 'NON — impossible'))
}
console.log('')
const gagnable = parTop5[2] + parTop5[3] + parTop5[4]
console.log(`  ⭐ une ticket « 4 du bas + 3 du haut » ne peut gagner que dans ${gagnable}/${n} = ${p(gagnable)} des courses`)
console.log(`     (il lui faut au moins 2 arrivants hors du top 8, parce qu'elle n'a que 3 places du haut)`)
console.log('')

console.log('  --- C. et le top-7 du marché ? ---')
const possible = parTop5[0]
console.log(`  une ticket « 7 du haut » ne peut gagner que si les 5 sont dans le top 8 : ${possible}/${n} = ${p(possible)}`)
console.log('')
console.log('  ⚠ Ce n\'est pas un choix de stratégie, c\'est une contrainte géométrique.')
console.log('    4bas+3haut a un PLAFOND de ' + p(gagnable) + '. top-7 a un plafond de ' + p(possible) + '.')
console.log('    Le 60 % n\'est atteignable par AUCUNE des deux.')
console.log('')
