/* =============================================================================
 * tools/verif-8.mjs — LE TICKET FAIT-IL 8 CHEVAUX, SUR CHAQUE COURSE ?
 *
 * Vérification mécanique du quota 3-2-1-1-1 (§11.40) : on rejoue le VRAI
 * buildGrid + le VRAI remplirGrille sur les Quintés à presse réelle de
 * data/quintes.json, avec les cotes finales, et on compte.
 *
 * Ce que le script refuse :
 *   · un ticket ≠ 8 quand la course a de quoi remplir les 5 blocs ;
 *   · un cheval en double ;
 *   · un bloc qui rend un nombre de chevaux ≠ son quota.
 *
 *   node tools\verif-8.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, GROUPES } from '../src/lib/quinte.js'

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const QUOTA = Object.fromEntries(GROUPES.map((g) => [g.id, g.quota]))
const NB = GROUPES.reduce((s, g) => s + g.quota, 0)

let n = 0, exact = 0, court = 0, long = 0, doublon = 0, blocFaux = 0, ignores = 0
const tailles = {}
const exemples = []

for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) { ignores++; continue }
  const nums = Object.keys(cotes).map(Number).filter((k) => cotes[k] > 1)
  const syn = (q.presse || []).filter((k) => cotes[k] > 1)
  if (nums.length < 10 || syn.length < 10) { ignores++; continue }
  let g
  try { g = buildGrid(syn, nums) } catch { ignores++; continue }
  /* les 5 blocs doivent avoir de quoi tenir leur quota, sinon le ticket
   * est court par construction — ce n'est pas une erreur du moteur. */
  const complet = GROUPES.every((gr) => {
    const cases = (g.groupes.find((x) => x.id === gr.id)?.cases || [])
    return cases.length >= Math.max(1, gr.quota)
  })
  if (!complet) { ignores++; continue }

  n++
  const parCarnet = nums.slice().sort((a, b) => (g.parNum[a] ?? 99) - (g.parNum[b] ?? 99) || a - b)
  const classement = parCarnet.map((k) => ({ p: { num: k }, s: null, ok: true }))
  const cotesObj = Object.fromEntries(nums.map((k) => [k, { cote: cotes[k] }]))
  let r
  try { r = remplirGrille(g, classement, q.discipline || 'PLAT', cotesObj, null) } catch (e) {
    exemples.push(`${q.date} — exception : ${e.message}`)
    continue
  }
  const liste = r.ticket || []
  tailles[liste.length] = (tailles[liste.length] || 0) + 1
  if (new Set(liste).size !== liste.length) doublon++
  if (liste.length === NB) exact++
  else {
    if (liste.length < NB) court++
    else long++
    if (exemples.length < 8) exemples.push(`${q.date} — ${liste.length} chevaux : ${liste.join('·')}`)
  }
  /* le détail par bloc : combien de chevaux chaque bloc a rendus */
  for (const gr of g.groupes) {
    const d = r.detail?.[gr.id]
    const pris = Array.isArray(d) ? d : (d?.pris || d?.retenus || null)
    if (Array.isArray(pris) && pris.length !== Math.max(1, QUOTA[gr.id])) blocFaux++
  }
}

const p = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
console.log('\n  VÉRIFICATION DU TICKET — quotas ' + GROUPES.map((g) => g.quota).join('-') + ' = ' + NB + ' chevaux')
console.log('  ' + n + ' courses mesurées · ' + ignores + ' ignorée(s) (cotes ou blocs incomplets)\n')
console.log('  ticket exactement ' + NB + '        : ' + exact + '  (' + p(exact, n) + ' %)')
console.log('  ticket plus court          : ' + court)
console.log('  ticket plus long           : ' + long)
console.log('  cheval en double           : ' + doublon)
console.log('  bloc hors quota            : ' + blocFaux)
console.log('  tailles rencontrées        : ' + JSON.stringify(tailles))
if (exemples.length) {
  console.log('\n  LES CAS QUI NE FONT PAS ' + NB + ' :')
  for (const e of exemples) console.log('    ' + e)
}
console.log('')
