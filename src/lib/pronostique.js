/* =============================================================================
 * src/lib/pronostique.js — MOTEUR PRONOSTIQUE
 *
 * ⚠ CE FICHIER EST INDÉPENDANT DE `src/lib/quinte.js`.
 *
 * LE DÉCOUPAGE (donné par l'utilisateur, non négociable)
 *
 *        G1 = P1 .. P6   → 3 chevaux
 *        G2 = P7 .. P10  → 2 chevaux
 *        G3 = P11.. P18  → 3 chevaux
 *                         ────────────
 *                         8 chevaux (TICKET)
 *
 *   P = la place de presse (P1 = le plus cité).
 *
 * LE TICKET (8 chevaux) : sélection par les statistiques P(top5 | N).
 *   Les meilleures cases de chaque bloc.
 *
 * LE PODIUM (3 chevaux) : 3 règles indépendantes, basées sur les
 *   statistiques du podium (P(podium | top5), nombre absolu, combo).
 *   Ces 3 règles sont SÉPARÉES du ticket. Elles ne le modifient pas.
 *
 *   1. podium  — par P(podium | top5) : cases qui montent le plus sur le podium
 *   2. absolu  — par nombre absolu de podiums
 *   3. combo   — par podium × top5 : probabilité globale
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

/** Les 3 règles de podium disponibles. */
export const REGLES_PODIUM = ['podium', 'absolu', 'combo']

/** Labels des règles de podium. */
export const REGLE_PODIUM_LABELS = {
  podium: 'Podium — P(podium | top5)',
  absolu: 'Absolu — nb podiums',
  combo: 'Combo — podium × top5',
}

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
 * Score d'une case selon la règle choisie (pour le podium).
 */
function scorePodium(c, regle) {
  const p = c.place - 1
  switch (regle) {
    case 'absolu':
      return ABS_PODIUM[p] ?? 0
    case 'combo':
      return (TAUX_PODIUM[p] ?? 0) * (TAUX_TOP5[p] ?? 0)
    case 'podium':
    default:
      return TAUX_PODIUM[p] ?? 0
  }
}

/**
 * TICKET (8 chevaux) : sélection par les statistiques P(top5 | N).
 * Les meilleures cases de chaque bloc.
 */
export function remplirTicket(grille) {
  const ticket = []
  const detail = []

  for (const bloc of grille.blocs) {
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
      choix: 'top5',
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

/**
 * PODIUM (3 chevaux) : sélection par la règle choisie.
 * Prend les 3 meilleures cases de TOUTE la grille (pas par bloc).
 */
export function remplirPodium(grille, regle = 'podium') {
  const allCases = grille.blocs.flatMap((b) => b.cases)
  const parStats = allCases.slice().sort((a, b) => {
    const scoreA = scorePodium(a, regle)
    const scoreB = scorePodium(b, regle)
    return scoreB - scoreA || a.place - b.place
  })
  return parStats.slice(0, 3).map((c) => c.num)
}

/** Le nombre de chevaux du ticket — 3 + 2 + 3. */
export const TAILLE_PRONO = BLOCS_PRONO.reduce((n, b) => n + b.quota, 0)
/** Le nombre de chevaux du podium. */
export const TAILLE_PODIUM = 3
