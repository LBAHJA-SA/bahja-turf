/* ---------------------------------------------------------------
 * tools\aligner-archive.mjs  —  rendre l'archive cohérente avec elle-même
 *
 *   node tools\aligner-archive.mjs          → applique
 *   node tools\aligner-archive.mjs --see    → regarde sans écrire
 *
 * But (demandé le 05/10/2026) :
 *   « باش نطورو التحليل خاص تكون النتائج تابتة باش نعارفو الخلل فين كاين »
 * Une archive qui se contredit, on ne peut plus rien localiser.
 *
 * Contrôle, pour chaque course, à partir des SEULES données figées de la
 * ligne (`synthese` = les rangs de la presse, `runners` = les partants,
 * `ticket` = la ticket gelée) :
 *
 *   ① chaque cheval du ticket est dans le bloc où la presse le met
 *   ② chaque bloc reçoit au plus SON quota
 *   ③ le total fait 8 (3-2-1-1-1)
 *
 * Si ①②③ tiennent, on réécrit `groupes` et `scores[].pris` par la procédure
 * déterministe (`buildGrid`), donc le calcul est rejouable. Si ça ne tient
 * pas, on ne touche à rien et on dit pourquoi — c'est là qu'est le défaut.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGrid, quotasEffectifs } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F_SYN = path.join(RACINE, 'data', 'synthese.json')
const voir = process.argv.includes('--see')

const db = JSON.parse(fs.readFileSync(F_SYN, 'utf8'))
let aligne = 0
let refuse = 0
let vide = 0

console.log('')
console.log(`  ${voir ? 'LECTURE SEULE' : 'ALIGNEMENT'} — verifier que chaque ticket tient dans sa synthese`)
console.log('')

for (const date of Object.keys(db).sort().reverse()) {
  const r = db[date]
  if (!r?.ticket?.length || !r?.synthese?.length || !Array.isArray(r.runners) || !r.runners.length) {
    vide++
    console.log(`  --       ${date}  donnees incompletes (synthe / runners) — on ne touche a rien`)
    continue
  }

  const grille = buildGrid(r.synthese, r.runners)
  const ticket = r.ticket
  const problemes = []

  // ① + ② : le cheval du ticket est-il dans le bon bloc, en nombre legal ?
  for (const g of grille.groupes) {
    const dansBloc = new Set(g.cases.map((c) => c.num))
    const pris = ticket.filter((n) => dansBloc.has(n))
    if (pris.length > g.quota) problemes.push(`${g.id} recoit ${pris.length} chevaux pour un quota de ${g.quota} (${pris.join(' ')})`)
  }
  // le total : la somme des quotas du carnet
  const total = quotasEffectifs().reduce((a, b) => a + b.n, 0)
  if (ticket.length !== total) problemes.push(`${ticket.length} chevaux dans le ticket, le carnet en demande ${total}`)

  const deja = Array.isArray(r.groupes) && r.groupes.length === grille.groupes.length
    && r.groupes.every((g, i) => g.id === grille.groupes[i].id
      && g.pris.length === ticket.filter((n) => grille.groupes[i].cases.some((c) => c.num === n)).length
      && g.pris.every((n) => ticket.includes(n)))
  const prisOk = Array.isArray(r.scores) && r.scores.length
    && r.scores.every((s) => !!s.pris === ticket.includes(s.num))

  if (problemes.length) {
    refuse++
    console.log(`  REFUSE   ${date}  ${r.hippodrome || '?'} ${r.distance || '?'}m  ticket ${ticket.join(' ')}`)
    for (const p of problemes) console.log(`             - ${p}`)
    console.log(`             carnet : ${grille.groupes.map((g) => `${g.id}${g.quota}[${g.cases.map((c) => c.num).join(' ')}]`).join(' ')}`)
    continue
  }

  if (deja && prisOk) {
    console.log(`  deja ok  ${date}  ${r.hippodrome || '?'} ${r.distance || '?'}m  ${ticket.join(' ')}`)
    continue
  }

  aligne++
  const parTicket = new Set(ticket)
  const nouveaux = grille.groupes.map((g) => ({ id: g.id, pris: ticket.filter((n) => g.cases.some((c) => c.num === n)) }))
  console.log(`  aligne   ${date}  ${r.hippodrome || '?'} ${r.distance || '?'}m  ${ticket.join(' ')}`)
  console.log(`             groupes : ${(r.groupes || []).map((g) => `${g.id}[${g.pris.join(' ')}]`).join(' ') || '(vide)'}  ->  ${nouveaux.map((g) => `${g.id}[${g.pris.join(' ')}]`).join(' ')}`)
  if (r.scores) console.log(`             pris    : ${r.scores.filter((s) => s.pris).map((s) => s.num).join(' ') || '(aucun)'}  ->  ${r.scores.filter((s) => parTicket.has(s.num)).map((s) => s.num).join(' ')}`)
  if (!voir) {
    r.groupes = nouveaux
    if (r.scores) r.scores = r.scores.map((s) => ({ ...s, pris: parTicket.has(s.num) }))
  }
}

if (!voir && aligne) {
  fs.writeFileSync(F_SYN, JSON.stringify(db, null, 2), 'utf8')
  fs.mkdirSync(path.join(RACINE, 'public', 'data'), { recursive: true })
  fs.copyFileSync(F_SYN, path.join(RACINE, 'public', 'data', 'synthese.json'))
  console.log('')
  console.log(`  ${aligne} course(s) alignee(s) — aucun ticket touche, aucun resultat change`)
} else if (voir && aligne) {
  console.log('')
  console.log('  (relance sans --see pour ecrire)')
}
if (refuse) console.log(`  ${refuse} course(s) refusee(s) : le ticket ne tient pas dans sa synthese — la NE PAS toucher`)
if (vide) console.log(`  ${vide} course(s) sans donnees suffisantes`)
console.log('')
process.exit(refuse ? 1 : 0)
