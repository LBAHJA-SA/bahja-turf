/**
 * ⭐ TEST DU GEL DE LA TICKET (§13.3.4)
 *
 *   node tools\test-gel.mjs
 *
 * Regle verifiee : une ticket deja posee dans l'archive ne se remplace JAMAIS,
 * meme quand le moteur en propose une autre (le marche qui bouge, la carriere
 * qui arrive, le classement qui change). C'est le bug du 05/10/2026 :
 * la ticket est passee de 5/5 a 4/5 en trois runs, sans decision.
 *
 * On appelle le VRAI `figerTicket()` de tools\daily.mjs — pas une copie.
 */
import { figerTicket } from './daily.mjs'

let ok = 0
let ko = 0
const verifie = (nom, cond, detail = '') => {
  if (cond) { ok++; console.log(`  OK   ${nom}`) }
  else { ko++; console.log(`  KO   ${nom}${detail ? '\n         ' + detail : ''}`) }
}

const t = (ticket, mode, surprises = []) => ({ ticket, mode, surprises, groupes: [], scores: [] })
const M = (n) => n.join(' ')

console.log('\n  GEL DE LA TICKET — tools\\daily.mjs > figerTicket()\n')

/* 1. premiere ecriture : la ticket du moteur est posee, l'heure est notee */
{
  const f = figerTicket({}, t([9, 11, 8, 5, 13, 3, 7, 4], 'defaut'))
  verifie('1. archive vide -> on pose la ticket du moteur',
    M(f.ticket) === '9 11 8 5 13 3 7 4', `recu : ${M(f.ticket || [])}`)
  verifie('1b. ticketPoseLe note (ISO)',
    /^\d{4}-\d{2}-\d{2}T/.test(f.ticketPoseLe || ''), `recu : ${f.ticketPoseLe}`)
  verifie('1c. ticketSource = auto', f.ticketSource === 'auto', `recu : ${f.ticketSource}`)
}

/* 2. le marche arrive et propose autre chose -> RIEN ne bouge (le bug du 05/10) */
{
  const pose = { ticket: [9, 11, 8, 5, 13, 3, 7, 4], ticketMode: 'defaut', ticketSource: 'auto', ticketPoseLe: '2026-10-05T00:32:22.203Z' }
  const f = figerTicket(pose, t([9, 12, 13, 3, 7, 8, 5, 1], 'auto+marche'))
  verifie('2. marche propose 9 12 13 3 7 8 5 1 -> la ticket reste 9 11 8 5 13 3 7 4',
    M(f.ticket) === '9 11 8 5 13 3 7 4', `recu : ${M(f.ticket || [])}`)
  verifie('2b. ticketPoseLe inchange', f.ticketPoseLe === pose.ticketPoseLe)
  verifie('2c. ticketMode inchange (defaut, pas auto+marche)', f.ticketMode === 'defaut', `recu : ${f.ticketMode}`)
  verifie('2d. ticketMoteur garde la lecture du jour',
    M(f.ticketMoteur) === '9 12 13 3 7 8 5 1', `recu : ${M(f.ticketMoteur || [])}`)
  verifie('2e. le journal dit que la ticket est conservee',
    f.log.some((l) => /conserve/.test(l)) && f.log.some((l) => /NON ecrase/.test(l)),
    f.log.join(' | '))
}

/* 3. le meme cas, rejoue 3 fois comme le matin du 05/10 */
{
  const pose = { ticket: [9, 11, 8, 5, 13, 3, 7, 4], ticketMode: 'defaut', ticketSource: 'auto' }
  const etapes = [
    t([9, 12, 8, 5, 6, 3, 7, 1], 'auto+marche', [12, 6]),   // 05 h 39
    t([9, 12, 13, 3, 7, 8, 5, 1], 'auto+marche'),            // 08 h 45
    t([1, 3, 5, 7, 9, 11, 13, 14], 'physique'),              // carriere qui arrive
  ]
  let courant = pose
  for (const e of etapes) courant = figerTicket(courant, e)
  verifie('3. trois runs de suite -> la ticket du matin est toujours la',
    M(courant.ticket) === '9 11 8 5 13 3 7 4', `recu : ${M(courant.ticket || [])}`)
}

/* 4. une carriere physique n'ecrase pas non plus */
{
  const pose = { ticket: [9, 12, 13, 3, 7, 8, 5, 1], ticketMode: 'auto+marche', ticketSource: 'auto' }
  const f = figerTicket(pose, t([4, 13, 9, 3, 18, 5, 1, 14], 'physique'))
  verifie('4. mode physique n ecrase pas une ticket auto+marche',
    M(f.ticket) === '9 12 13 3 7 8 5 1', `recu : ${M(f.ticket || [])}`)
}

/* 5. une ticket manuelle reste intouchable, meme sans moteur */
{
  const pose = { ticket: [2, 4, 6, 8, 10, 12, 14, 1], ticketSource: 'manuel' }
  const f = figerTicket(pose, t([9, 12, 13, 3, 7, 8, 5, 1], 'auto+marche'))
  verifie('5. ticket manuel conservee, source toujours manuel',
    M(f.ticket) === '2 4 6 8 10 12 14 1' && f.ticketSource === 'manuel',
    `${M(f.ticket || [])} / ${f.ticketSource}`)
}

/* 6. course introuvable : on ne touche a rien */
{
  const pose = { ticket: [9, 11, 8, 5, 13, 3, 7, 4], ticketSource: 'auto' }
  const f = figerTicket(pose, null)
  verifie('6. moteur indisponible (null) -> ticket et source inchanges',
    M(f.ticket) === '9 11 8 5 13 3 7 4' && f.ticketSource === 'auto')
}

/* 7. le bilan : la ticket du matin donnait 5/5, celle du marche 4/5 */
{
  const arrivee = [3, 7, 9, 13, 11]
  const x = (tkt) => arrivee.filter((n) => tkt.includes(n)).length
  verifie('7. la ticket du matin fait 5/5 sur l arrivee reelle 3-7-9-13-11',
    x([9, 11, 8, 5, 13, 3, 7, 4]) === 5, `${x([9, 11, 8, 5, 13, 3, 7, 4])}/5`)
  verifie('7b. celle du marche (08 h 45) ne fait que 4/5 — n°11 est perdu',
    x([9, 12, 13, 3, 7, 8, 5, 1]) === 4, `${x([9, 12, 13, 3, 7, 8, 5, 1])}/5`)
}

/* 8. LE RE-GEL FINAL (09/10/2026) : UNE fois, avant-course, puis verrouille.
 *    Le gel du matin fige un marche de nuit sans valeur : entre depart-90 et
 *    depart-10, on re-gele avec le marche du moment. Apres : verrouille. */
{
  const matin = { ticket: [1, 13, 4, 3, 7, 9, 15, 5], ticketMode: 'defaut', ticketSource: 'auto', ticketPoseLe: '2026-10-01T02:33:32.000Z' }
  const f = figerTicket(matin, t([3, 4, 1, 13, 7, 9, 6, 15], 'auto+marche'), { final: true })
  verifie('8. final ecrase auto (UNE fois)',
    M(f.ticket) === '3 4 1 13 7 9 6 15' && f.ticketSource === 'final', `${M(f.ticket || [])} / ${f.ticketSource}`)
  verifie('8b. le matin est garde dans ticketMatin',
    M(f.ticketMatin) === '1 13 4 3 7 9 15 5', `${M(f.ticketMatin || [])}`)
  verifie('8c. ticketPoseLe re-note', f.ticketPoseLe !== matin.ticketPoseLe)
}
{
  const fin = { ticket: [3, 4, 1, 13, 7, 9, 6, 15], ticketMode: 'auto+marche', ticketSource: 'final', ticketPoseLe: '2026-10-01T13:20:00.000Z', ticketMatin: [1, 13, 4, 3, 7, 9, 15, 5] }
  const f = figerTicket(fin, t([2, 4, 6, 8, 10, 12, 14, 1], 'auto+marche'), { final: true })
  verifie('8d. final verrouille : meme --final ne re-ecrase pas',
    M(f.ticket) === '3 4 1 13 7 9 6 15' && f.ticketSource === 'final', `${M(f.ticket || [])} / ${f.ticketSource}`)
}
{
  const man = { ticket: [2, 4, 6, 8, 10, 12, 14, 1], ticketSource: 'manuel' }
  const f = figerTicket(man, t([3, 4, 1, 13, 7, 9, 6, 15], 'auto+marche'), { final: true })
  verifie('8e. --final ne touche jamais au manuel',
    M(f.ticket) === '2 4 6 8 10 12 14 1' && f.ticketSource === 'manuel')
}

console.log(`\n  ${ok} OK · ${ko} KO\n`)
process.exit(ko ? 1 : 0)