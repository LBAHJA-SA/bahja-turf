/* =============================================================================
 * src/lib/pronostique.js — LE MOTEUR PRONOSTIQUE (simplifié 31/10/2026)
 *
 * ⚠ CE FICHIER EST INDÉPENDANT DE `src/lib/quinte.js`.
 *   Il ne l'importe pas, il ne le modifie pas.
 *
 * LE DÉCOUPAGE (donné par l'utilisateur, non négociable)
 *
 *        G1 = P1 .. P6   → 3 chevaux  (les 3 DERNIERS de la bande)
 *        G2 = P7 .. P10  → 2 chevaux  (les 2 DERNIERS de la bande)
 *        G3 = P11.. P18  → 3 chevaux  (les 3 DERNIERS de la bande)
 *                         ────────────
 *                         8 chevaux
 *
 *   P = la place de presse (P1 = le plus cité).
 *
 * LA RÈGLE : toujours prendre les DERNIERS de chaque bande.
 *   Pas de règles complexes. Pas de marché. Pas de carnet.
 *   Contre la presse, contre le marché, contre tout.
 *   L'utilisateur a demandé : « عكس الصحافة وعكس السوق ».
 *
 *   Pour chaque bloc, on prend les (quota) derniers chevaux
 *   de la bande, dans l'ordre de la presse.
 * ========================================================================== */

/** Les trois blocs, en places de presse. `de`/`a` sont INCLUS. */
export const BLOCS_PRONO = [
  { id: 'G1', label: 'G1 · P1-P6', de: 1, a: 6, quota: 3 },
  { id: 'G2', label: 'G2 · P7-P10', de: 7, a: 10, quota: 2 },
  { id: 'G3', label: 'G3 · P11-P18', de: 11, a: 18, quota: 3 },
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

/** Rang de marché : 1 = la cote la plus courte. */
export function rangsMarche(cotes) {
  if (!cotes) return {}
  const nums = Object.keys(cotes).map(Number).filter((n) => coteDe(cotes, n) != null)
  nums.sort((a, b) => coteDe(cotes, a) - coteDe(cotes, b) || a - b)
  return Object.fromEntries(nums.map((n, i) => [n, i + 1]))
}

/**
 * Construit la grille de la page : une case par place de presse, rangée dans
 * les trois blocs.
 *  - `synthese` : les numéros dans l'ordre de la presse (P1..Pn)
 *  - `runners`  : tous les partants réels ; ceux que la presse ne cite pas
 *                 sont ajoutés à la suite (P(n+1)..) par numéro croissant.
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
 * RÈGLE SIMPLE : on prend les DERNIERS de chaque bloc (les moins cités).
 * Pas de règles complexes. Pas de marché. Pas de carnet.
 */
export function remplirProno(grille, cotes = null) {
  const rangs = rangsMarche(cotes)
  const ticket = []
  const detail = []

  for (const bloc of grille.blocs) {
    const parCarnet = bloc.cases.slice().sort((a, b) => a.place - b.place)
    // On prend les DERNIERS de la bande (les moins cités)
    const pris = parCarnet.slice(-Math.min(bloc.quota, parCarnet.length))
    const set = new Set(pris.map((c) => c.num))
    for (const c of pris) ticket.push(c.num)
    detail.push({
      ...bloc,
      choix: 'derniers',
      surLeMarche: false,
      cases: bloc.cases.map((c) => ({
        ...c,
        cote: coteDe(cotes, c.num),
        rangMarche: rangs[c.num] ?? null,
        pris: set.has(c.num),
      })),
    })
  }

  return { ticket: [...new Set(ticket)], detail }
}

/** Le nombre de chevaux attendu — 3 + 2 + 3. */
export const TAILLE_PRONO = BLOCS_PRONO.reduce((n, b) => n + b.quota, 0)
