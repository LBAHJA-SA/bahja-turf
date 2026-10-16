/* =============================================================================
 * tools/mesure-moteur.mjs — LE CODE SUIT-IL LA MÉTHODE ? (16/10/2026)
 *
 * §11.18 mesure « la course est PAYANTE » (le 1-2-3 complet dans la grille)
 * sur 280 vrais Quintés. §11.19 dit : **`stats` ne change PAS la sélection,
 * seulement l'ordre d'affichage**.
 *
 * Or le code a une branche `aStats` (R8 = 0,9 FORCE(P) + 0,1 marché) qui
 * fait EXACTEMENT le contraire : dès qu'une archive existe, ce sont les
 * statistiques qui choisissent les chevaux — plus le marché.
 *
 * Ce script mesure les deux, sur les MÊMES courses, avec la MÊME métrique,
 * en LOO (les statistiques d'une course ne contiennent jamais cette course).
 *
 *   node tools\mesure-moteur.mjs             cotes finales
 *   node tools\mesure-moteur.mjs ouverture   cotes du matin
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, remplirGrille } from '../src/lib/quinte.js'

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CHAMP = process.argv[2] === 'ouverture' ? 'ouverture' : 'cotes'

const CASES = TOUT
  .map((q) => {
    const cotes = q[CHAMP]
    if (!cotes || Object.keys(cotes).length < 12) return null
    if (!q.arrivee || q.arrivee.length < 5) return null
    const nums = Object.keys(cotes).map(Number)
    if (nums.some((n) => !(cotes[n] > 1))) return null
    const presse = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
    if (presse.length < 10) return null            // on ne garde que la VRAIE presse
    return {
      date: q.date,
      discipline: q.discipline,
      cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])),
      synthese: presse,
      runners: nums,
      arrivee: q.arrivee.slice(0, 5),
    }
  })
  .filter(Boolean)

/* mêmes courses pour TOUTES les méthodes — sinon la comparaison ne vaut rien */
const N = CASES.length
console.log('\n  LA MÉTHODE DIT-ELLE LA MÊME CHOSE QUE LE CODE ?')
console.log('  ' + N + ' Quintés avec Synthèse de presse RÉELLE, cotes ' + (CHAMP === 'cotes' ? 'finales' : "d'ouverture") + ', métrique §11.18 (PAYANTE = 1-2-3 complet)\n')

const kpi = (t, arr) => { let k = 0; for (const x of arr) { if (!t.includes(x)) break; k++ } return k }
const pct = (a, b) => Math.round((a / b) * 100) + ' %'
const pad = (s, n) => String(s).padEnd(n)

const parCote8 = (c) => Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a].cote - c.cotes[b].cote)

const R = {}
const bump = (nom, k) => {
  R[nom] = R[nom] || { n: 0, p3: 0, p4: 0, p5: 0, ch: 0 }
  const r = R[nom]
  r.n++; if (k >= 3) r.p3++; if (k >= 4) r.p4++; if (k >= 5) r.p5++
}

/* le classement de repli : l'ordre du carnet (pas de carrière ici) */
const classementDe = (grille) => grille.groupes
  .flatMap((g) => g.cases)
  .slice()
  .sort((a, b) => a.slot - b.slot)
  .map((c) => ({ p: { num: c.num }, s: null, ok: true }))

for (let i = 0; i < N; i++) {
  const c = CASES[i]
  const grille = buildGrid(c.synthese, c.runners)
  const classement = classementDe(grille)
  const statsLOO = computeStats(CASES.filter((_, k) => k !== i))

  // ① le marché seul — le plafond à 8 chevaux
  bump('marché seul — top 8 des cotes', kpi(parCote8(c).slice(0, 8), c.arrivee))
  bump('marché seul — top 9 des cotes', kpi(parCote8(c).slice(0, 9), c.arrivee))

  // ② la règle RETENUE (§11.17) : les q meilleures cotes du bloc — stats = null
  const tMkt = remplirGrille(grille, classement, c.discipline, c.cotes, null).ticket
  bump('RÈGLE RETENUE  q meilleures cotes  (stats=null)', kpi(tMkt, c.arrivee))
  R['RÈGLE RETENUE  q meilleures cotes  (stats=null)'].ch += tMkt.length

  // ③ le VRAI chemin de la page : avec les statistiques → branche R8
  const tR8 = remplirGrille(grille, classement, c.discipline, c.cotes, statsLOO).ticket
  bump('CODE ACTUEL  R8 = 0,9 force + 0,1 marché', kpi(tR8, c.arrivee))
  R['CODE ACTUEL  R8 = 0,9 force + 0,1 marché'].ch += tR8.length

  // ④ R8 sans marché (pour isoler ce qu'apporte le marché dans R8)
  const tF = remplirGrille(grille, classement, c.discipline, null, statsLOO).ticket
  bump('R8 sans marché (force seule)', kpi(tF, c.arrivee))

  /* ⑤ LA TAILLE DU TICKET — le seul levier qui reste si les quotas ne bougent pas.
   * Blocs de la grille, meilleures cotes de chaque bloc, puis on AJOUTE le
   * meilleur cheval restant (le 4e de G1 dans l'immense majorité des cas). */
  const bloc = (g) => g.cases.slice().sort((a, b) => c.cotes[a.num].cote - c.cotes[b.num].cote)
  const parBloc = (nPremier) => {
    const t = []
    for (const g of grille.groupes) {
      const q = g.id === 'G1' ? nPremier : g.quota
      bloc(g).slice(0, q).forEach((x) => { if (!t.includes(x.num)) t.push(x.num) })
    }
    return t
  }
  const reste = (t) => {
    const libre = Object.keys(c.cotes).map(Number).filter((n) => !t.includes(n)).sort((a, b) => c.cotes[a].cote - c.cotes[b].cote)
    return libre.length ? [...t, libre[0]] : t
  }
  const t9 = reste(parBloc(3))
  bump('RETENUE + 1 cheval (9 ch., le 4e de G1)', kpi(t9, c.arrivee))
  R['RETENUE + 1 cheval (9 ch., le 4e de G1)'].ch += t9.length
  const t42111 = parBloc(4)
  bump('quotas 4-2-1-1-1 (9 ch., G1 plein)', kpi(t42111, c.arrivee))
  R['quotas 4-2-1-1-1 (9 ch., G1 plein)'].ch += t42111.length
}

const ordre = Object.entries(R).sort((a, b) => (b[1].p3 / b[1].n) - (a[1].p3 / a[1].n))
console.log('  ' + pad('méthode', 46) + 'PAYANTE   couvre +4   Quinté 5/5   ch.')
console.log('  ' + '-'.repeat(84))
for (const [nom, r] of ordre) {
  console.log('  ' + pad(nom, 46) + pad(pct(r.p3, r.n), 10) + pad(pct(r.p4, r.n), 13) + pad(pct(r.p5, r.n), 13) + (r.ch / r.n).toFixed(1))
}
console.log('')
console.log('  LOO = les statistiques de la course testée n\'entrent jamais dans les siennes.')
console.log('  La règle retenue ne lit QUE le marché ; le code actuel lit FORCE(P) quand il a une archive.')
console.log('')
