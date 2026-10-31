/* =============================================================================
 * src/lib/pronostique.js — LE MOTEUR PRONOSTIQUE (31/10/2026)
 *
 * ⚠ CE FICHIER EST INDÉPENDANT DE `src/lib/quinte.js`. Il ne l'importe pas, il
 *   ne le modifie pas, et il ne partage AUCUNE structure avec lui. C'est le
 *   moteur de la page `/pronostique-bahja-turf`, et il contredit le moteur
 *   Quinté par construction : le découpage n'est pas le même.
 *
 * LE DÉCOUPAGE (donné par l'utilisateur, non négociable)
 *
 *        G1 = P1 .. P6   → 3 chevaux
 *        G2 = P7 .. P10  → 2 chevaux
 *        G3 = P11.. P18  → 3 chevaux
 *                         ────────────
 *                         8 chevaux
 *
 *   P = la place de presse (P1 = le cheval le plus cité de la Synthèse).
 *   Ce ne sont PAS les cases du carnet coloré du moteur Quinté (P1-P4 / P5-P8
 *   / P9-P10 / P11-P12 / P13+) : ici le haut du carnet prend 6 places, le
 *   milieu 4, le bas 8 — et on y prend 3 / 2 / 3.
 *
 * LE CHOIX DANS LE BLOC
 *   `CHOIX_PRONO` porte la règle retenue après mesure (`tools/prono-moteur.mjs`).
 *   Règles disponibles :
 *     carnet     l'ordre de la presse (P1 d'abord)
 *     marche     la cote la plus courte du bloc
 *     echange20  le carnet, sauf si une cote est ≥ 2× plus courte que celle
 *                du cheval placé devant → il passe
 *     fusion     rang de presse + rang de marché (le plus petit gagne)
 *     stats      la case qui donne le plus de podium (computeStats du Quinté,
 *                passé en 4ᵉ argument) — jamais sans statistique
 * ========================================================================== */

/** Les trois blocs, en places de presse. `de`/`a` sont INCLUS. */
export const BLOCS_PRONO = [
  { id: 'G1', label: 'G1 · P1-P6', de: 1, a: 6, quota: 3 },
  { id: 'G2', label: 'G2 · P7-P10', de: 7, a: 10, quota: 2 },
  { id: 'G3', label: 'G3 · P11-P18', de: 11, a: 18, quota: 3 },
]

/** La règle de choix dans chaque bloc — remplie après la mesure. */
export const CHOIX_PRONO = { G1: 'carnet', G2: 'carnet', G3: 'carnet' }

/* ⚠ 31/10/2026 — l'utilisateur a demandé le CONTRAIRE de la presse et du
 * marché : « طريقة اختيار الارقام داخل المجموعة يجب ان يكون عكس الصحافة وعكس
 * السوق ». Les trois règles contrariennes sont donc mesurables :
 *   antipresse  le DERNIER du bloc (le moins cité)
 *   antimarche  la cote la PLUS LONGUE du bloc
 *   anti        les deux à la fois (place + rang de marché, décroissant)
 * Elles sont dans REGLES pour être mesurées — pas pour être jouées sans
 * preuve. `tools/prono-moteur.mjs` les note comme les autres. */
export const REGLES = ['carnet', 'marche', 'echange20', 'fusion', 'antipresse', 'antimarche', 'anti', 'contraste']

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
 * Les doublons, les zéros et les non-partants sont jetés : un ticket ne
 * contient que des chevaux qui courent.
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
 * L'ordre des cases d'un bloc selon la règle.
 * ⚠ `marche`, `echange20` et `fusion` ont besoin de la cote de TOUT le bloc :
 *   une cote manquante déformerait le tri, donc on retombe sur le carnet.
 *   Jamais sur la carrière : sans cote, la place de presse est la seule vérité.
 */
function ordonnerBloc(cases, cotes, regle, rangs, stats, placeDe) {
  const surLeMarche = cases.length > 0 && cases.every((c) => coteDe(cotes, c.num) != null)
  /* ⚠ seules `marche`, `echange20`, `fusion`, `antimarche` et `anti` ont besoin
   *   de la cote de TOUT le bloc. `carnet`, `antipresse` et `stats` s'en
   *   passent : elles ne doivent pas retomber sur le carnet faute de marché. */
  const besoinMarche = ['marche', 'echange20', 'fusion', 'antimarche', 'anti'].includes(regle)
  const effectif = besoinMarche ? (surLeMarche ? regle : 'carnet') : regle

  const parCarnet = cases.slice().sort((a, b) => a.place - b.place)

  if (effectif === 'marche') {
    return { effectif, surLeMarche, ordre: parCarnet.slice().sort((a, b) => coteDe(cotes, a.num) - coteDe(cotes, b.num) || a.place - b.place) }
  }
  if (effectif === 'fusion') {
    const poids = (c) => (c.place + (rangs[c.num] ?? 99))
    return { effectif, surLeMarche, ordre: parCarnet.slice().sort((a, b) => poids(a) - poids(b) || a.place - b.place) }
  }
  if (effectif === 'echange20') {
    const ordre = parCarnet.slice()
    for (let i = 0; i < ordre.length; i++) {
      let best = i
      for (let j = i + 1; j < ordre.length; j++) {
        const ci = coteDe(cotes, ordre[best].num) ?? 999
        const cj = coteDe(cotes, ordre[j].num) ?? 999
        if (cj * 2 <= ci) best = j
      }
      if (best !== i) { const x = ordre[i]; ordre[i] = ordre[best]; ordre[best] = x }
    }
    return { effectif, surLeMarche, ordre }
  }
  if (effectif === 'antipresse') {
    /* le CONTRAIRE de la presse : le moins cité du bloc passe devant */
    return { effectif, surLeMarche, ordre: parCarnet.slice().sort((a, b) => b.place - a.place) }
  }
  if (effectif === 'antimarche') {
    /* le CONTRAIRE du marché : la cote la plus longue passe devant */
    const ordre = cases.slice()
      .filter((c) => coteDe(cotes, c.num) != null)
      .sort((a, b) => coteDe(cotes, b.num) - coteDe(cotes, a.num) || b.place - a.place)
    return { effectif, surLeMarche, ordre }
  }
  if (effectif === 'anti') {
    /* les deux ensemble : place de presse + rang de marché, décroissant */
    const poids = (c) => (c.place + (rangs[c.num] ?? 0))
    return { effectif, surLeMarche, ordre: parCarnet.slice().sort((a, b) => poids(b) - poids(a) || b.place - a.place) }
  }
  if (effectif === 'stats') {
    /* la case qui donne le plus de podium : podiums / n_top5, cf. le moteur
     * Quinté §2.2. Une case sans échantillon (n < 2) passe derrière. */
    const taux = (c) => {
      const s = stats?.cases?.[String(c.place)] || stats?.cases?.[c.place]
      const n = Number(s?.top5 ?? s?.n ?? 0)
      const pod = Number(s?.podiums ?? s?.top3 ?? 0)
      return n >= 2 ? pod / n : -1
    }
    const ordre = parCarnet.slice().sort((a, b) => taux(b) - taux(a) || a.place - b.place)
    return { effectif, surLeMarche, ordre }
  }
  return { effectif: 'carnet', surLeMarche, ordre: parCarnet }
}

/**
 * Remplit la grille : chaque bloc donne exactement `quota` chevaux.
 * Retourne { ticket, detail }.
 * `choix` permet de MESURER une autre règle sans toucher à `CHOIX_PRONO`.
 */
export function remplirProno(grille, cotes = null, choix = null, stats = null) {
  const rangs = rangsMarche(cotes)
  const regles = choix || CHOIX_PRONO
  const ticket = []
  const detail = []

  for (const bloc of grille.blocs) {
    const regle = regles[bloc.id] || 'carnet'

    /* `contraste` — le bloc prend ses (quota−1) mieux cités PUIS le DERNIER du
     * bloc (le moins cité de la presse). C'est la seule façon de faire entrer
     * un cheval « contre la presse » sans détruire le bloc : les autres sièges
     * gardent l'ordre du carnet. */
    if (regle === 'contraste' && bloc.cases.length > bloc.quota) {
      const parCarnet = bloc.cases.slice().sort((a, b) => a.place - b.place)
      const pris = bloc.quota >= 2
        ? [...parCarnet.slice(0, bloc.quota - 1), parCarnet[parCarnet.length - 1]]
        : [parCarnet[0]]
      const set = new Set(pris.map((c) => c.num))
      for (const c of pris) ticket.push(c.num)
      detail.push({
        ...bloc,
        choix: 'contraste',
        surLeMarche: bloc.cases.every((c) => coteDe(cotes, c.num) != null),
        cases: bloc.cases.map((c) => ({
          ...c,
          cote: coteDe(cotes, c.num),
          rangMarche: rangs[c.num] ?? null,
          pris: set.has(c.num),
        })),
      })
      continue
    }

    const { effectif, surLeMarche, ordre } = ordonnerBloc(bloc.cases, cotes, regle, rangs, stats, grille.placeDe)
    const pris = ordre.slice(0, Math.min(bloc.quota, ordre.length))
    const set = new Set(pris.map((c) => c.num))
    for (const c of pris) ticket.push(c.num)
    detail.push({
      ...bloc,
      choix: effectif,
      surLeMarche,
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
