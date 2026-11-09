/* =============================================================================
 * tools\probabilite.mjs — LE MOTEUR DE PROBABILITÉ (09/11/2026)
 *
 * Lit l'archive (data/synthese.json), reconstruit la grille réelle de chaque
 * course avec le VRAI buildGrid, puis calcule la matrice DNA P1-P20 :
 *
 *   · marginales            P(top5 | N), P(position k | top5), P(victoire | N)
 *   · paires                P(Pa ∩ Pb), P(Pb | Pa)
 *   · triples               P(Pa ∩ Pb ∩ Pc)
 *   · conditionnelles       P(Pc | Pa, Pb), P(Pd | Pa, Pb, Pc)
 *   · contexte bayésien     discipline / distance / taille de champ
 *   · combinaisons Quinté   l'ensemble des 5 cases (pas leur ordre)
 *   · backtest LOO          ce que couvre un top-N, contre le hasard uniforme
 *
 *   node tools\probabilite.mjs           → data/probabilite.json + public/data/probabilite.json
 *
 * ⚠ Uniquement des arrivées réelles. Chaque chiffre vient d'une course
 *   (data/synthese.json). N, α et la force du prior sont exposés.
 * ========================================================================== */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'
import { construireMatrix, pctProb, dnaComplet } from '../src/lib/probabilite.js'

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
    distance: r.distance,
    nbPartants: r.nbPartants || runners.length,
    hippodrome: r.hippodrome,
    grille,
    arr: r.arrivee.slice(0, 5),
  })
}
courses.sort((a, b) => (a.date < b.date ? -1 : 1))

console.log(`\n  ${courses.length} courses avec arrivée (archive réelle)\n`)
const M = construireMatrix(courses)

console.log(`  N = ${M.N}  ·  α = ${M.alpha}  ·  prior m = ${M.marge} (base ${pctProb(M.baseTop5, 1)})`)
console.log(`  top case   : P${M.topCases[0].p}   P(top5) brut ${pctProb(M.topCases[0].p_top5)}  post. ${pctProb(M.topCases[0].p_top5_post)}`)
console.log(`  top paire  : P${M.topPaires[0].a}-P${M.topPaires[0].b}  (${M.topPaires[0].count}/${M.N})`)
if (M.topTriples.length) console.log(`  top triple : ${M.topTriples[0].combo.map((x) => 'P' + x).join('-')}  (${M.topTriples[0].count}/${M.N})`)
console.log(`  P(au moins un P11+ dans le top-5) : ${pctProb(M.p_auMoinsUnBas)}  (${M.coursesAvecBas}/${M.N})`)

const b8 = M.backtest.find((b) => b.n === 8)
if (b8) console.log(`  backtest LOO, n=8 : quinté ${pctProb(b8.quinte)} · podium ${pctProb(b8.podium)} · hasard quinté ${pctProb(b8.hasard_quinte)}`)
for (const h of M.horsEchantillon) console.log(`  hors échantillon (${h.sens}) : quinté ${pctProb(h.quinte)} · podium ${pctProb(h.podium)}`)

console.log('\n  règles de sélection — hors échantillon, top-8 (2 moitiés moyennées) :')
for (const c of M.classementRegles) {
  console.log(`     ${c.regle.padEnd(9)}  quinté ${pctProb(c.quinte).padStart(6)}   podium ${pctProb(c.podium).padStart(6)}`)
}
console.log(`  écart entre la meilleure et la moins bonne : ${(M.ecartRegles * 100).toFixed(1).replace('.', ',')} points`)

/* ── DNA 2.0 : du marginal au joint ──────────────────────────────────────── */
console.log('\n  DNA 2.0 — les quatre couches, λ appris couche par couche :')
const D = dnaComplet(courses)
for (const e of D.echelle) {
  console.log(`     ${String(e.couche).padStart(2)}. ${e.nom.padEnd(34)} λ = ${e.lambda.pair}/${e.lambda.triple}/${e.lambda.quinte}   logLik ${e.logLik.toFixed(4)}`)
}
const b8d = D.courbe[8]
console.log(`  modèle complet, dans l'archive : quinté ${pctProb(b8d.quinte)} · podium ${pctProb(b8d.podium)} · hasard ${pctProb(b8d.hasard_quinte)}`)

console.log('\n  hors échantillon — ce que chaque couche ajoute (n = 8, deux moitiés moyennées) :')
for (const m of D.moyenne) {
  const r = m[8]
  console.log(`     ${m.etape.padEnd(14)} quinté ${pctProb(r.quinte).padStart(6)}  podium ${pctProb(r.podium).padStart(6)}  ≥4 ${pctProb(r.plus4).padStart(6)}`)
}
console.log(`  bootstrap apparié ④ vs ① (n=8, 4000 tirages) : mieux ${pctProb(D.bootstrap.mieux)} · pire ${pctProb(D.bootstrap.pire)} · écart moyen ${D.bootstrap.diff >= 0 ? '+' : ''}${D.bootstrap.diff.toFixed(3)}`)
const dg = D.diagnostic
console.log(`  diagnostic paires du top-8 : ${dg.positives} positives / ${dg.negatives} négatives · ${dg.adjacentes} sont voisines (|a−b| = 1)`)
console.log(`  triples vus ${dg.triplesVus} (dont ${dg.triplesRepetes} ≥ 2 fois) · quintés distincts ${dg.quintesDistincts} (dont ${dg.quinteRepetes} ≥ 2 fois)`)

const meilleurScan = D.scan.slice().sort((a, b) => b.tauxQ - a.tauxQ || b.tauxP - a.tauxP)[0]
console.log('\n  balayage λ (n = 8, hors échantillon, meilleur des deux sens) :')
console.log(`     meilleur λ = ${meilleurScan.pair}/${meilleurScan.triple}/${meilleurScan.quinte} → quinté ${pctProb(meilleurScan.tauxQ)} · podium ${pctProb(meilleurScan.tauxP)}`)
console.log(`     couche ① seule (λ = 0) → quinté ${pctProb(D.scan[0].tauxQ)} · podium ${pctProb(D.scan[0].tauxP)}`)

M.dna = D

const out = JSON.stringify(M, null, 2)
fs.writeFileSync('data/probabilite.json', out)
try { fs.writeFileSync('public/data/probabilite.json', out) } catch (e) { /* public absent */ }
console.log('\n  écrit : data/probabilite.json + public/data/probabilite.json\n')
