/** vérifie que le moteur produit bien 7 chevaux avec les nouveaux quotas */
import fs from 'node:fs'
import { buildGrid, remplirGrille, GROUPES, classerPhysique, clePhysique, computeStats } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
// 📈 le marché (data/cotes.json). S'il est là, c'est lui qui remplit les quotas.
const eq = fs.existsSync('data/cotes.json') ? JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) : {}
// 📊 les probabilités de place — c'est elles qui ORDONNENT le ticket.
const stats = computeStats(Object.values(db).filter((x) => x.arrivee?.length))
console.log('\n  quotas : ' + GROUPES.map((g) => g.id + '=' + g.quota).join(' · ')
  + '   total = ' + GROUPES.reduce((n, g) => n + g.quota, 0) + '\n')

for (const d of Object.keys(db).sort()) {
  const r = db[d]
  if (!r.synthese?.length) continue
  const grille = buildGrid(r.synthese, r.runners)
  // classement « physique » : même tri que la page
  const brut = (r.scores || []).map((s) => ({ p: { num: s.num }, s, ok: (s.filtres || []).every((x) => x) }))
  const classement = classerPhysique(brut)
  const cotes = Object.fromEntries((eq[r.courseId]?.cotes || []).map((x) => [x.num, x]))
  const { ticket, detail } = remplirGrille(grille, classement, r.discipline, cotes, stats)
  const surMarche = detail.filter((g) => g.surLeMarche).length
  const marche = '  marché ' + surMarche + '/5 blocs'
  const parBloc = detail.map((g) => g.id + ':' + g.cases.filter((c) => c.pris).length + '/' + g.cases.length).join('  ')
  const arrivee = r.arrivee?.slice(0, 5) || []
  const pris = arrivee.filter((n) => ticket.includes(n)).length
  console.log(`  ${d}  ${(r.hippodrome || '').toUpperCase().padEnd(14)} ${String(r.discipline || '').padEnd(6)}`)
  console.log(`      ${parBloc}`)
  console.log(`      moteur : ${ticket.join(' · ').padEnd(30)} (${ticket.length} chevaux)` + marche
    + (arrivee.length ? `\n      archive : ${r.ticket?.join(' · ')}   →  moteur ${pris}/5 · archive ${(r.bilan ?? '—')}` : ''))
}
console.log()