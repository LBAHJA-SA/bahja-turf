/* Vérifie que l'empreinte des sources ignore les horodatages (collecteLe) :
 * deux fichiers qui ne diffèrent que par cette date doivent donner le MÊME
 * hash — sinon le job publierait un site identique 2 fois par jour.
 *   node tools\test-empreinte.mjs
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const VOLATILS = [/("collecteLe"\s*:\s*)"[^"]*"/g, /("collecte_le"\s*:\s*)"[^"]*"/g]

function empreinte(txt) {
  let n = txt
  for (const re of VOLATILS) n = n.replace(re, '$1""')
  return { hash: createHash('sha256').update(n).digest('hex').slice(0, 16), n }
}

const p = 'C:/bahja-TURF/public/data/reu/2026-10-05_R1_C1_FRANCE.json'
const brut = readFileSync(p, 'utf8')

const a = empreinte(brut.replace(/"collecteLe"\s*:\s*"[^"]*"/, '"collecteLe":"2026-10-05T08:45:00Z"'))
const b = empreinte(brut.replace(/"collecteLe"\s*:\s*"[^"]*"/, '"collecteLe":"2026-10-05T20:30:00Z"'))

const montre = (t) => (/"collecteLe"\s*:\s*"[^"]*"/.exec(t) || [''])[0]
console.log(`  fichier reel      : ${montre(brut)}`)
console.log(`  apres neutralisation : ${montre(a.n)}`)
console.log(`  hash A (08:45)     : ${a.hash}`)
console.log(`  hash B (20:30)     : ${b.hash}`)
console.log(`  differents contenus, MEME hash : ${a.hash === b.hash ? 'OUI' : 'NON — le deploy recommencerait chaque jour'}`)

// et le contenu utile doit rester dans l'empreinte
const change = empreinte(brut.replace(/"distance"\s*:\s*\d+/, '"distance":9999'))
console.log(`  un vrai changement (distance) change le hash : ${change.hash !== a.hash ? 'OUI' : 'NON — bug !'}`)
process.exit(a.hash === b.hash && change.hash !== a.hash ? 0 : 1)
