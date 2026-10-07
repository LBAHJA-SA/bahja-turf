/**
 * DIAGNOSTIC DE L'ARCHIVE — pourquoi la ticket du jour diffère de celle
 * qu'on a jouée le matin, et ce que ça a coûté.
 *
 *   node tools\diag-archive.mjs [2026-10-05]
 *
 * Compare, sur la course donnée :
 *   · la grille (cases, slots, cotes)
 *   · le ticket SANS marché  (le classement physique du carnet)
 *   · le ticket AVEC marché  (les cotes d'equidia remplissent les quotas)
 *   · la ticket réellement ARCHIVÉE
 * et le x/5 de chacune contre l'arrivée réelle.
 */
import fs from 'node:fs'
import {
  buildGrid, remplirGrille, GROUPES, classerPhysique, computeStats, clePhysique,
} from '../src/lib/quinte.js'

const date = process.argv[2] || new Date().toISOString().slice(0, 10)
const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const eq = fs.existsSync('data/cotes.json') ? JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) : {}
const r = db[date]
if (!r) { console.log(`  aucune archive pour ${date}`); process.exit(1) }

const cotes = Object.fromEntries((eq[r.courseId]?.cotes || []).map((x) => [x.num, x]))
const stats = computeStats(Object.values(db).filter((x) => x.arrivee?.length))
const grille = buildGrid(r.synthese, r.runners)
const brut = (r.scores || []).map((s) => ({ p: { num: s.num }, s, ok: (s.filtres || []).every((x) => x) }))
const classement = classerPhysique(brut)

const bilan = (t, arrivee) => {
  const s = new Set(t)
  const pris = arrivee.filter((n) => s.has(n))
  return `${pris.length}/5` + (pris.length === 5 ? '  ★ 5/5' : `  manquants : ${arrivee.filter((n) => !s.has(n)).join(' ')}`)
}

// l'arrivée réelle : l'archive si elle l'a, sinon celle de la course
const arrivee = r.arrivee?.length ? r.arrivee
  : (eq[r.courseId]?.arrivee || null)

console.log(`\n  ${date}  ${r.hippodrome} · ${r.discipline} · ${r.distance} m · ${r.nbPartants} partants`)
console.log(`  courseId ${r.courseId}   marché ${Object.keys(cotes).length} cotes   ` +
  `mode archivé : ${r.ticketMode || '—'}`)
console.log(`  arrivée : ${arrivee ? arrivee.join(' · ') : '(inconnue — la course a-t-elle été courue ?)'}\n`)

console.log('  LA GRILLE (cases du carnet)')
for (const g of grille.groupes) {
  const cells = g.cases.map((c) => {
    const co = cotes[c.num]
    return `P${String(c.place).padStart(2)}/case${String(c.slot).padStart(2)} n°${String(c.num).padStart(2)}` +
      (co ? ` @${String(co.cote ?? '?').replace('.', ',')}` : ' @—')
  })
  console.log(`    ${g.id} (quota ${g.quota})   ${cells.join('   ')}`)
}

const sans = remplirGrille(grille, classement, r.discipline, null, stats)
const avec = remplirGrille(grille, classement, r.discipline, cotes, stats)
const archive = r.ticket || []

console.log(`\n  3 TICKETS`)
console.log(`    SANS marché (classement) : ${sans.ticket.join(' · ').padEnd(32)} ${arrivee ? bilan(sans.ticket, arrivee) : ''}`)
console.log(`    AVEC marché (archivée ?) : ${avec.ticket.join(' · ').padEnd(32)} ${arrivee ? bilan(avec.ticket, arrivee) : ''}`)
console.log(`    ARCHIVÉE (${(r.collecte || '').slice(11, 16)})        : ${archive.join(' · ').padEnd(32)} ${arrivee ? bilan(archive, arrivee) : ''}`)
console.log(`    pareille à la version marché ? ${JSON.stringify(avec.ticket) === JSON.stringify(archive) ? 'OUI' : 'NON ⚠'}`)
console.log(`    pareille à la version physique ? ${JSON.stringify(sans.ticket) === JSON.stringify(archive) ? 'OUI' : 'NON ⚠'}`)

const parBloc = (res) => res.detail.map((g) => `${g.id}:${g.cases.filter((c) => c.pris).length}/${g.cases.length}`).join('  ')
console.log(`\n  QUOTAS  sans marché : ${parBloc(sans)}`)
console.log(`           avec marché : ${parBloc(avec)}`)
console.log(`  (règle fermée §11.16 : ${GROUPES.map((g) => `${g.id}=${g.quota}`).join(' ')} → total ${GRATOUPE()})\n`)

function GRATOUPE() { return GROUPES.reduce((n, g) => n + g.quota, 0) }
void clePhysique