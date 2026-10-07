/**
 * SIMULATION DES QUOTAS — que donnait chaque répartition sur les 4 Quintés clôturés ?
 *
 * On rejoue chaque course avec plusieurs quotas G1..G5 et on compte le x/5.
 *   node tools\quota-sim.mjs
 */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))

const courses = []
for (const d of Object.keys(db).sort()) {
  const r = db[d]
  if (!r.arrivee?.length) continue
  const g = buildGrid(r.synthese, r.runners)
  const sc = Object.fromEntries((r.scores || []).map((x) => [x.num, x]))
  const blocs = {}
  for (const gr of g.groupes) blocs[gr.id] = gr.cases.map((x) => ({ num: x.num, slot: x.slot, global: sc[x.num]?.global ?? -1 }))
  courses.push({ d, blocs, arrivee: r.arrivee.slice(0, 5) })
}

/** rejoue une course avec un jeu de quotas ; les cases se remplissent par score */
function jouer(blocs, quotas) {
  const pris = []
  for (const id of ['G1', 'G2', 'G3', 'G4', 'G5']) {
    const q = quotas[id] ?? 0
    const dispo = blocs[id].filter((x) => !pris.includes(x.num)).sort((a, b) => b.global - a.global)
    pris.push(...dispo.slice(0, q).map((x) => x.num))
  }
  return pris
}

const SCENARIOS = {
  'actuel  3-2-1-1-1': { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 },
  '4-2-2-1-0  (9 chevaux)': { G1: 4, G2: 2, G3: 2, G4: 1, G5: 0 },
  '4-1-2-1-0  (8 chevaux)': { G1: 4, G2: 1, G3: 2, G4: 1, G5: 0 },
  '4-1-2-0-0  (7 chevaux)': { G1: 4, G2: 1, G3: 2, G4: 0, G5: 0 },
  '4-0-2-1-0  (7 chevaux)': { G1: 4, G2: 0, G3: 2, G4: 1, G5: 0 },
  '4-0-2-0-1  (7 chevaux)': { G1: 4, G2: 0, G3: 2, G4: 0, G5: 1 },
  '4-1-1-1-0  (7 chevaux)': { G1: 4, G2: 1, G3: 1, G4: 1, G5: 0 },
  '4-2-1-0-0  (7 chevaux)': { G1: 4, G2: 2, G3: 1, G4: 0, G5: 0 },
  '4-0-1-2-0  (7 chevaux)': { G1: 4, G2: 0, G3: 1, G4: 2, G5: 0 },
}

console.log('\n' + '='.repeat(100))
console.log('  SIMULATION DES QUOTAS — sur ' + courses.length + ' Quintés clôturés')
console.log('='.repeat(100))
for (const cc of courses) {
  console.log(`\n  ${cc.d}  arrivée ${cc.arrivee.join(' - ')}`)
  for (const [lbl, q] of Object.entries(SCENARIOS)) {
    const t = jouer(cc.blocs, q)
    const pris = cc.arrivee.filter((n) => t.includes(n)).length
    const manquants = cc.arrivee.filter((n) => !t.includes(n)).map((n) => 'n°' + n).join(' ')
    console.log(`    ${lbl.padEnd(30)} ${pris}/5   ticket ${t.join(' ').padEnd(26)} manque: ${manquants || '—'}`)
  }
}

console.log('\n' + '='.repeat(100))
console.log('  BILAN')
console.log('='.repeat(100))
console.log('  quotas                    ' + courses.map((cc) => cc.d.slice(8).padStart(4)).join('') + '   TOTAL   5/5 ?')
for (const [lbl, q] of Object.entries(SCENARIOS)) {
  let tot = 0, cinq = 0
  const lgn = courses.map((cc) => {
    const t = jouer(cc.blocs, q)
    const p = cc.arrivee.filter((n) => t.includes(n)).length
    tot += p; if (p === 5) cinq++
    return String(p).padStart(4)
  }).join('')
  console.log('  ' + lbl.padEnd(25) + lgn + '    ' + String(tot).padStart(3) + '/20   ' + (cinq ? cinq + ' course(s)' : '—'))
}
console.log()