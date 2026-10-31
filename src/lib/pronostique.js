/* =============================================================================
 * src/lib/pronostique.js — MOTEUR PRONOSTIQUE (statistiques)
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
 * LES 4 RÈGLES DE SÉLECTION (au choix de l'utilisateur) :
 *   1. top5   — par P(top5 | N) : cases qui arrivent le plus dans les 5
 *   2. podium — par P(podium | top5) : cases qui montent le plus sur le podium
 *   3. absolu — par nombre absolu de podiums
 *   4. combo  — par P(podium | top5) × P(top5 | N) : probabilité globale
 *
 *   Seulement les statistiques de l'archive. Pas de carnet, pas de marché.
 * ========================================================================== */

/** Les trois blocs, en places de presse. `de`/`a` sont INCLUS. */
export const BLOCS_PRONO = [
  { id: 'G1', label: 'G1 · P1-P6', de: 1, a: 6, quota: 3 },
  { id: 'G2', label: 'G2 · P7-P10', de: 7, a: 10, quota: 2 },
  { id: 'G3', label: 'G3 · P11-P18', de: 11, a: 18, quota: 3 },
]

/**
 * Taux P(top5 | N) par position de presse (P1..P18).
 * Source : outil Statistiques, 28 Quintés valides.
 */
export const TAUX_TOP5 = [
  0.607, 0.357, 0.571, 0.500, 0.464, 0.357,  // P1-P6   (G1)
  0.429, 0.357, 0.143, 0.214,                    // P7-P10  (G2)
  0.286, 0.286, 0.107, 0.179, 0.071, 0.071,    // P11-P16 (G3)
  0.000, 0.000,                                    // P17-P18 (G3)
]

/**
 * Taux P(podium | top5) par position de presse (P1..P18).
 * Source : outil Statistiques, 28 Quintés valides.
 */
export const TAUX_PODIUM = [
  0.824, 0.600, 0.625, 0.786, 0.769, 0.700,  // P1-P6   (G1)
  0.167, 0.500, 0.500, 0.833,                    // P7-P10  (G2)
  0.500, 0.500, 1.000, 0.200, 0.000, 0.000,    // P11-P16 (G3)
  0.000, 0.000,                                    // P17-P18 (G3)
]

/**
 * Nombre absolu de podiums par position (P1..P18).
 * Source : outil Statistiques, 28 Quintés valides.
 */
export const ABS_PODIUM = [
  14, 6, 10, 11, 10, 7,   // P1-P6   (G1)
  2, 5, 2, 5,               // P7-P10  (G2)
  4, 4, 3, 1, 0, 0,         // P11-P16 (G3)
  0, 0,                      // P17-P18 (G3)
]

/** Les 4 règles disponibles. */
export const REGLES_PRONO = ['top5', 'podium', 'absolu', 'combo']

/** Règle par défaut. */
export const REGLE_DEFAUT = 'top5'

/** La cote d'un numéro. */
export function coteDe(cotes, num) {
  if (!cotes) return null
  const v = cotes[num]
  if (v == null) return null
  const n = typeof v === 'object' ? (v.cote ?? v.odds ?? null) : v
  const x = Number(n)
  return Number.isFinite(x) && x > 0 ? x : null
}

/**
 * Construit la grille de la page.
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
 * Score d'une case selon la règle choisie.
 */
function scoreCase(c, regle) {
  const p = c.place - 1
  switch (regle) {
    case 'podium':
      return TAUX_PODIUM[p] ?? 0
    case 'absolu':
      return ABS_PODIUM[p] ?? 0
    case 'combo':
      return (TAUX_PODIUM[p] ?? 0) * (TAUX_TOP5[p] ?? 0)
    case 'top5':
    default:
      return TAUX_TOP5[p] ?? 0
  }
}

/**
 * Remplit la grille : chaque bloc donne exactement `quota` chevaux.
 * Sélection par la règle choisie (meilleur score en premier).
 */
export function remplirProno(grille, regle = REGLE_DEFAUT) {
  const ticket = []
  const detail = []

  for (const bloc of grille.blocs) {
    const parStats = bloc.cases.slice().sort((a, b) => {
      const scoreA = scoreCase(a, regle)
      const scoreB = scoreCase(b, regle)
      return scoreB - scoreA || a.place - b.place
    })
    const pris = parStats.slice(0, Math.min(bloc.quota, parStats.length))
    const set = new Set(pris.map((c) => c.num))
    for (const c of pris) ticket.push(c.num)
    detail.push({
      ...bloc,
      choix: regle,
      surLeMarche: false,
      cases: bloc.cases.map((c) => ({
        ...c,
        cote: null,
        rangMarche: null,
        taux: TAUX_TOP5[c.place - 1] ?? 0,
        tauxPodium: TAUX_PODIUM[c.place - 1] ?? 0,
        absPodium: ABS_PODIUM[c.place - 1] ?? 0,
        pris: set.has(c.num),
      })),
    })
  }

  return { ticket: [...new Set(ticket)], detail }
}

/** Le nombre de chevaux attendu — 3 + 2 + 3. */
export const TAILLE_PRONO = BLOCS_PRONO.reduce((n, b) => n + b.quota, 0)
