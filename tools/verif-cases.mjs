/* =============================================================================
 * tools\verif-cases.mjs — la numérotation des cases est-elle la même ?
 *
 * `casesDepuisPresse()` (src/lib/probabilite.js) reconstruit la case P d'un
 * cheval à partir de l'ordre de la Récapitulative, sans importer le moteur
 * Quinté. Il DOIT donner exactement `buildGrid().slotParNum` sur toute
 * l'archive — sinon la page de probabilité et les statistiques du site ne
 * parlent plus des mêmes cases.
 *
 *   node tools\verif-cases.mjs
 * ========================================================================== */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'
import { casesDepuisPresse } from '../src/lib/probabilite.js'

const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
let ok = 0, ko = 0
const details = []

for (const r of Object.values(SYN)) {
  if (!r || !r.synthese || !r.synthese.length) continue
  const presse = r.synthese.map(Number).filter(Number.isFinite)
  const runners = (r.runners || []).map(Number).filter(Number.isFinite)
  if (presse.length < 5) continue

  const a = buildGrid(presse, runners).slotParNum
  const b = casesDepuisPresse(presse, runners).slotParNum

  const nums = new Set([...Object.keys(a), ...Object.keys(b)])
  const ecarts = []
  for (const n of nums) if (a[n] !== b[n]) ecarts.push(`${n}: buildGrid=${a[n]} · casesDepuisPresse=${b[n]}`)
  if (ecarts.length) { ko++; details.push(`${r.date || '?'} : ${ecarts.join(' | ')}`) } else ok++
}

console.log(`\n  ${ok} course(s) identique(s) · ${ko} écart(s)\n`)
for (const d of details.slice(0, 10)) console.log('   ' + d)
process.exit(ko ? 1 : 0)
