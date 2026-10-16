/* =============================================================================
 * tools/mesure-moteur.mjs — LE CODE SUIT-IL LA MÉTHODE ? (16/10/2026)
 *
 * §11.18 mesure « la course est PAYANTE » (le 1-2-3 complet dans la grille)
 * sur 280 vrais Quintés. Sur les 96 qui ont une presse RÉELLE, ce script
 * compare les façons de REMPLIR les blocs (les quotas 3-2-1-1-1 ne bougent
 * pas, §11.16), en LOO (les statistiques d'une course ne contiennent jamais
 * cette course) :
 *
 *   · le VRAI code — `remplirGrille()` appelé pour de vrai (§11.22)
 *   · le carnet partout          — le rang de presse
 *   · le marché partout          — l'ancienne règle §11.17
 *   · R8 partout                 — 0,9 FORCE(P) + 0,1 marché (l'ancien code)
 *   · les baselines : top 8 / top 9 des cotes
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

const coteDe = (cotes, num) => {
  const v = cotes?.[num]
  if (v == null) return null
  const n = typeof v === 'object' ? (v.cote ?? v.odds ?? null) : v
  const x = Number(n)
  return Number.isFinite(x) && x > 0 ? x : null
}

/* les 3 façons de remplir un bloc : le carnet, le marché, R8 (0,9 force + 0,1 marché) */
function ticketModes(grille, cotes, stats, modes) {
  const parPlace = stats?.parPlace || []
  const force = (slot) => {
    const st = parPlace[slot - 1]
    if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return 0
    let b = 0
    for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[b] ?? 0)) b = k
    return (st.p[b] ?? 0) > 0 ? st.p[b] / 100 : 0
  }
  const t = []
  grille.groupes.forEach((g, i) => {
    const cases = g.cases.map((x) => ({ ...x }))
    const quota = g.obligatoire ? Math.max(1, g.quota) : g.quota
    const m = modes[i]
    const surLeMarche = cases.every((x) => coteDe(cotes, x.num) != null)
    let ordre
    if (m === 'marche' && surLeMarche) {
      ordre = cases.slice().sort((a, b) => coteDe(cotes, a.num) - coteDe(cotes, b.num) || a.place - b.place)
    } else if (m === 'carnet') {
      ordre = cases.slice().sort((a, b) => a.place - b.place)
    } else {
      const connues = cases.filter((x) => coteDe(cotes, x.num) != null).map((x) => coteDe(cotes, x.num))
      const cMin = Math.min(...connues), cMax = Math.max(...connues)
      const mkt = (x) => {
        const v = coteDe(cotes, x.num)
        if (v == null || !(cMax > cMin)) return 0.5
        return (cMax - v) / (cMax - cMin)
      }
      ordre = cases.slice().sort((a, b) => ((0.9 * force(b.slot) + 0.1 * mkt(b)) - (0.9 * force(a.slot) + 0.1 * mkt(a))) || (a.slot - b.slot))
    }
    ordre.slice(0, quota).forEach((x) => { if (!t.includes(x.num)) t.push(x.num) })
  })
  return t
}

for (let i = 0; i < N; i++) {
  const c = CASES[i]
  const grille = buildGrid(c.synthese, c.runners)
  const classement = classementDe(grille)
  const statsLOO = computeStats(CASES.filter((_, k) => k !== i))

  // ① le marché seul — le plafond à 8 et 9 chevaux
  bump('marché seul — top 8 des cotes', kpi(parCote8(c).slice(0, 8), c.arrivee))
  bump('marché seul — top 9 des cotes', kpi(parCote8(c).slice(0, 9), c.arrivee))

  // ② ⭐ LE VRAI CODE (§11.22) : G1 carnet · G2 marché · G3-G5 carnet
  const tCode = remplirGrille(grille, classement, c.discipline, c.cotes, statsLOO).ticket
  bump('⭐ LE CODE — G1 carnet · G2 marché · G3-G5 carnet', kpi(tCode, c.arrivee))
  R['⭐ LE CODE — G1 carnet · G2 marché · G3-G5 carnet'].ch += tCode.length

  // ③ le carnet partout — le rang de presse choisit dans chaque bloc
  const tCar = ticketModes(grille, c.cotes, statsLOO, ['carnet', 'carnet', 'carnet', 'carnet', 'carnet'])
  bump('le carnet partout (rang de presse)', kpi(tCar, c.arrivee))

  // ④ le marché partout — l'ancienne règle §11.17
  const tMkt = ticketModes(grille, c.cotes, statsLOO, ['marche', 'marche', 'marche', 'marche', 'marche'])
  bump('le marché partout (§11.17)', kpi(tMkt, c.arrivee))

  // ⑤ R8 partout — 0,9 FORCE(P) + 0,1 marché, l'ancien code
  const tR8 = ticketModes(grille, c.cotes, statsLOO, ['r8', 'r8', 'r8', 'r8', 'r8'])
  bump('R8 partout (0,9 force + 0,1 marché, l\'ancien code)', kpi(tR8, c.arrivee))

  /* ⑥ LA TAILLE DU TICKET — le seul levier qui reste si les quotas ne bougent pas.
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
console.log('  Quotas 3-2-1-1-1 dans TOUS les cas (§11.16) : on ne change que QUI remplit le bloc.')
console.log('')
