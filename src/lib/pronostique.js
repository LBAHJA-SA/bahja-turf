/* =============================================================================
 * src/lib/pronostique.js — LE MOTEUR PRONOSTIQUE (statistiques)
 *
 * ⚠ CE FICHIER EST INDÉPENDANT DE `src/lib/quinte.js`.
 *
 * LE DÉCOUPAGE (donné par l'utilisateur, non négociable)
 *
 *        G1 = P1 .. P6   → 3 chevaux
 *        G2 = P7 .. P10  → 2 chevaux
 *        G3 = P11.. P18  → 3 chevaux
 *                         ────────────
 *                         8 chevaux
 *
 *   P = la place de presse (P1 = le plus cité).
 *
 * LA RÈGLE : sélection par les STATISTIQUES de l'archive.
 *   Pour chaque bloc, on prend les positions avec le meilleur taux
 *   P(top5 | N) — c'est-à-dire celles qui arrivent le plus souvent
 *   dans les 5 premiers, sur l'archive réelle.
 *
 *   Pas de carnet. Pas de marché. Pas de règles complexes.
 *   Seulement les statistiques de l'archive.
 * ========================================================================== */

/** Les trois blocs, en places de presse. `de`/`a` sont INCLUS. */
export const BLOCS_PRONO = [
  { id: 'G1', label: 'G1 · P1-P6', de: 1, a: 6, quota: 3 },
  { id: 'G2', label: 'G2 · P7-P10', de: 7, a: 10, quota: 2 },
  { id: 'G3', label: 'G3 · P11-P18', de: 11, a: 18, quota: 3 },
]

/**
 * Taux P(top5 | N) par position de presse (P1..P18).
 * Source : outil Statistiques de la page QUINTE, 28 Quintés valides.
 * P17 et P18 n'ont jamais été dans les 5 → 0.
 */
export const TAUX_TOP5 = [
  0.607, 0.357, 0.571, 0.500, 0.464, 0.357,  // P1-P6   (G1)
  0.429, 0.357, 0.143, 0.214,                    // P7-P10  (G2)
  0.286, 0.286, 0.107, 0.179, 0.071, 0.071,    // P11-P16 (G3)
  0.000, 0.000,                                    // P17-P18 (G3)
]

/** La cote d'un numéro. Accepte { num: 4.2 } comme { num: { cote: 4.2 } }. */
export function coteDe(cotes, num) {
  if (!cotes) return null
  const v = cotes[num]
  if (v == null) return null
  const n = typeof v === 'object' ? (v.cote ?? v.odds ?? null) : v
  const x = Number(n)
  return Number.isFinite(x) && x > 0 ? x : null
}

/**
 * Construit la grille de la page : une case par place de presse, rangée dans
 * les trois blocs.
 */
export function buildGrilleProno(synthese, runners = []) {
  const partants = new Set((runners || []).filter((n) => Number.isFinite(n) && n > 0))
  const vus = new Set()
  const ordre = []
  for (const n of (synthese || [])) {
    const num = Number(n)
    if (!Number.isFinite(num) || num <= 0) continue
    if (partants.size && !partants.has(num)) continue
    if (vus.has(num)) continue
    vus.add(num)
    ordre.push(num)
  }
  const manquants = [...partants].filter((n) => !vus.has(n)).sort((a, b) => a - b)
  for (const num of manquants) { vus.add(num); ordre.push(num) }

  const placeDe = {}
  ordre.forEach((num, i) => { placeDe[num] = i + 1 })

  const blocs = BLOCS_PRONO.map((b) => {
    const cases = []
    for (let p = b.de; p <= b.a; p++) {
      const num = ordre[p - 1]
      if (num == null) continue
      cases.push({ place: p, num, cote: null, pris: false })
    }
    return { ...b, cases }
  })

  return { ordre, placeDe, blocs, partants: [...partants] }
}

/**
 * Remplit la grille : chaque bloc donne exactement `quota` chevaux.
 * RÈGLE : sélection par les statistiques (meilleur taux P(top5 | N)).
 *   Pour chaque bloc, on prend les positions avec le meilleur taux.
 *   Pas de carnet. Pas de marché. Pas de règles complexes.
 */
export function remplirProno(grille) {
  const ticket = []
  const detail = []

  for (const bloc of grille.blocs) {
    // Trier les cases par taux décroissant (meilleur en premier)
    const parStats = bloc.cases.slice().sort((a, b) => {
      const tauxA = TAUX_TOP5[a.place - 1] ?? 0
      const tauxB = TAUX_TOP5[b.place - 1] ?? 0
      return tauxB - tauxA || a.place - b.place
    })
    const pris = parStats.slice(0, Math.min(bloc.quota, parStats.length))
    const set = new Set(pris.map((c) => c.num))
    for (const c of pris) ticket.push(c.num)
    detail.push({
      ...bloc,
      choix: 'stats',
      surLeMarche: false,
      cases: bloc.cases.map((c) => ({
        ...c,
        cote: null,
        rangMarche: null,
        taux: TAUX_TOP5[c.place - 1] ?? 0,
        pris: set.has(c.num),
      })),
    })
  }

  return { ticket: [...new Set(ticket)], detail }
}

/** Le nombre de chevaux attendu — 3 + 2 + 3. */
export const TAILLE_PRONO = BLOCS_PRONO.reduce((n, b) => n + b.quota, 0)
