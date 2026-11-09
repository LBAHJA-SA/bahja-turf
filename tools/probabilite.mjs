/* =============================================================================
 * tools\probabilite.mjs — LE MOTEUR DE PROBABILITÉ (09/11/2026)
 *
 * Lit l'archive (data/synthese.json) + les cotes, reconstruit la grille de
 * chaque course (buildGrid), et calcule la matrice DNA P1-P20 :
 *   · probabilités marginales P(top5), P(pos k | top5), P(victoire)
 *   · co-occurrences (paires) et conditionnelles P(Pb | Pa)
 *   · triples les plus fréquents
 *   · lissage bayésien (Laplace, α=1)
 *
 *   node tools\probabilite.mjs           → écrit data/probabilite.json + public/data/probabilite.json
 *   node tools\probabilite.mjs --json    → idem (alias)
 *
 * ⚠ Chaque chiffre vient d'une course réelle (arrivee). Aucun n'est inventé
 *   (§7 de la méthode). N et alpha sont exposés pour que la page puisse
 *   afficher honnêtement la taille de l'échantillon.
 * ========================================================================== */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'
import { construireMatrix, pctProb } from '../src/lib/probabilite.js'

const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const courses = []
for (const r of Object.values(SYN)) {
  if (!r || !r.synthese || !r.synthese.length) continue
  if (!r.arrivee || r.arrivee.length < 5) continue
  const presse = r.synthese.map(Number).filter(Number.isFinite)
  const runners = (r.runners || []).map(Number).filter(Number.isFinite)
  if (presse.length < 10) continue
  const grille = buildGrid(presse, runners)
  courses.push({
    date: r.date,
    discipline: r.discipline,
    hippodrome: r.hippodrome,
    grille,
    arr: r.arrivee.slice(0, 5),
  })
}
courses.sort((a, b) => (a.date < b.date ? -1 : 1))

console.log(`\n  ${courses.length} courses avec arrivée (archive réelle)\n`)
const M = construireMatrix(courses)
console.log(`  N = ${M.N}  ·  α = ${M.alpha}  ·  P avec au moins un P11+ dans le top-5 : ${pctProb(M.p_auMoinsUnBas)} (${M.coursesAvecBas}/${M.N})`)
console.log(`  top case : P${M.topCases[0].p}  (${M.topCases[0].n_top5}/${M.N})`)
console.log(`  top paire : P${M.topPaires[0].a}-P${M.topPaires[0].b}  (${M.topPaires[0].count}/${M.N})`)
if (M.topTriples.length) console.log(`  top triple : ${M.topTriples[0].combo.map((x) => 'P' + x).join('-')}  (${M.topTriples[0].count}/${M.N})`)

const out = JSON.stringify(M, null, 2)
fs.writeFileSync('data/probabilite.json', out)
try { fs.writeFileSync('public/data/probabilite.json', out) } catch (e) { /* public absent */ }
console.log('\n  écrit : data/probabilite.json + public/data/probabilite.json\n')
