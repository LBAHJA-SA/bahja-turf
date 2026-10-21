/* =============================================================================
 * src/lib/trio.js — LE TRIO ET LE COUPLÉ : l'ordre, les jeux, les zones.
 *
 * POURQUOI CE FICHIER EXISTE
 *   Le Quinté se joue sur un ticket FIXÉ (4-3-1-1-0 depuis le 21/10/2026, §11.34).
 *   Le Trio et le Couplé, NON : le 2e et le 3e sortent souvent de ce ticket.
 *   Mesuré sur les 347 Quintés de data/corpus/fusion.json (tools/trio.mjs) :
 *
 *       le 2e est hors du top 8 du marché :  21,9 %
 *       le 3e  est hors du top 8           :  28,8 %
 *       un des TROIS PREMIERS est hors du top 8 : 55,9 %
 *
 *   → le Trio se joue LARGE (10-11 chevaux) et sur le bon ORDRE.
 *
 * L'ORDRE — la SYNTHÈSE (le rang de presse)
 *   Trois ordres ont été mesurés sur les Quintés à presse réelle (99) :
 *
 *     ordre                        Trio N=8   N=10   N=11
 *     la Synthèse (rang presse)      51,5 %   71,7 %  80,8 %   ← retenu
 *     les cases du carnet (P1…)      45,5 %   66,7 %  76,8 %
 *     la fusion presse+marché        45,5 %   67,7 %  73,7 %
 *     le marché seul                 39,4 %   59,6 %  69,7 %
 *
 *   La Synthèse gagne — et c'est aussi l'ordre le plus simple : les N premiers
 *   chevaux cités par la presse. Le carnet est le bon ordre pour les GROUPES
 *   (G1..G5, le « 1 obligatoire » de G3), pas pour un top-N.
 *
 * LES ZONES (le rang de MARCHÉ, jamais le rang de presse)
 *   Z1 = rangs 1-3  ·  Z2 = rangs 4-8  ·  Z3 = rangs 9 et au-delà.
 *   Le Trio type n'est PAS « les 3 premiers de la cote » (3,2 % des cas) :
 *   c'est 1 ou 2 favoris + 1 ou 2 chevaux de Z2, et souvent un de Z3 — le
 *   motif 1·1·1 arrive 24,5 % du temps.
 *
 * ⚠ AUCUN chiffre n'est saisi à la main ici : les taux viennent de
 *   data/trio.json, écrit par tools/trio.mjs, et la page les affiche tels
 *   quels. Ce module ne contient QUE de la logique.
 * ============================================================================= */

import { rangsMarche } from './quinte.js'

/** La cote d'un numéro. Accepte { num: {cote} } comme { num: 4.2 }. */
export function coteDe(cotes, num) {
  if (!cotes) return null
  const v = typeof cotes.get === 'function' ? cotes.get(num) : cotes[num]
  if (v == null) return null
  const n = typeof v === 'object' ? (v.cote ?? v.odds ?? null) : v
  const x = Number(n)
  return Number.isFinite(x) && x > 0 ? x : null
}

/** L'ordre du carnet : les cases P1, P2, … dans l'ordre. La presse. */
export function ordreDuCarnet(detail) {
  if (!detail) return []
  return detail
    .flatMap((g) => (g.cases || []).map((c) => ({ num: c.num, slot: c.slot })))
    .filter((x) => x.num != null)
    .sort((a, b) => (a.slot ?? 999) - (b.slot ?? 999))
    .map((x) => x.num)
}

/** La zone d'un rang de marché. Z3 = « d'en bas » = rang 9 et au-delà. */
export function zoneDe(rang) {
  if (rang == null) return null
  if (rang <= 3) return 'Z1'
  if (rang <= 8) return 'Z2'
  return 'Z3'
}

/**
 * L'ORDRE DES CASES P1, P2, … — le carnet papier (§11.13).
 *
 * La Synthèse donne les chevaux dans l'ordre de la PRESSE ; le carnet les
 * range en deux lignes : la ligne du haut porte la parité du 1er numéro,
 * la ligne du bas l'autre parité, chacune dans l'ordre de la presse. On lit
 * EN TRAVERS : haut1, bas1, haut2, bas2, …
 *
 *   presse  [2, 1, 4, 10, 3, 13, …]   (P1 = 2, pair)
 *   haut    [2, 4, 10, 14, …]         (les pairs)
 *   bas     [1, 3, 13, 5, …]          (les impairs)
 *   cases   [2, 1, 4, 3, 10, 13, …]   = P1, P2, P3, P4, P5, P6, …
 *
 * C'est l'ordre que la page affiche : les groupes G1..G5 et le « 1
 * obligatoire » de G3 sont définis sur ces cases, pas sur le rang de presse.
 * ⚠ vérifié par tools/test-trio.mjs contre le VRAI buildGrid de la page.
 */
export function ordreDesCases(ordrePresse) {
  const o = (ordrePresse || []).filter((n) => Number.isFinite(n))
  if (o.length < 3) return o.slice()
  const pair = o[0] % 2 === 0
  const haut = o.filter((n) => (n % 2 === 0) === pair)
  const bas = o.filter((n) => (n % 2 === 0) !== pair)
  const out = []
  for (let i = 0; i < Math.max(haut.length, bas.length); i++) {
    if (haut[i] != null) out.push(haut[i])
    if (bas[i] != null) out.push(bas[i])
  }
  return out
}

/**
 * LA FUSION — le rang moyen presse + marché.
 *  - les deux rangs existent → la somme (la moyenne ×2, même ordre)
 *  - un seul existe          → il compte double (on ne pénalise pas un
 *    cheval que la presse ne cite pas, ni une course sans marché)
 *  - égalité → la presse d'abord, puis le marché, puis le numéro.
 */
export function fusionner(ordrePresse, rangs) {
  const rp = new Map((ordrePresse || []).map((n, i) => [n, i + 1]))
  const rm = new Map(Object.entries(rangs || {}).map(([n, r]) => [Number(n), r]))
  const nums = [...new Set([...rp.keys(), ...rm.keys()])]
  return nums
    .map((n) => {
      const a = rp.get(n) ?? null
      const b = rm.get(n) ?? null
      const score = a == null && b == null ? Infinity : (a ?? b) + (b ?? a)
      return { num: n, presse: a, marche: b, score }
    })
    .sort((x, y) =>
      x.score - y.score ||
      (x.presse ?? 99) - (y.presse ?? 99) ||
      (x.marche ?? 99) - (y.marche ?? 99) ||
      x.num - y.num)
    .map((x) => x.num)
}

/** La fusion au niveau de la page : on part du carnet + du marché. */
export function ordreDeFusion(detail, cotes) {
  return fusionner(ordreDuCarnet(detail), rangsMarche(cotes))
}

/** Le rang de chaque numéro dans un ordre : { num: 1, … }. */
export function positionsDe(ordre) {
  return Object.fromEntries((ordre || []).map((n, i) => [n, i + 1]))
}

/** C(n, k) — le nombre de combinaisons ; 0 si k > n. */
export function combinaisons(n, k) {
  if (n < k || k < 0) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

/** Toutes les combinaisons de k chevaux pris dans `liste` (désordre). */
export function jeuxDe(liste, k) {
  const out = []
  const n = (liste || []).length
  if (k < 1 || k > n) return out
  const idx = Array.from({ length: k }, (_, i) => i)
  while (true) {
    out.push(idx.map((i) => liste[i]))
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) break
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
  return out
}

/**
 * LE JEU PRÊT À JOUER.
 * `ordre` = l'ordre retenu (la fusion) · `n` = le nombre de chevaux ·
 * `k` = 3 pour le Trio, 2 pour le Couplé.
 * `courbes` = data/trio.json → courbes.trio / .couple (le taux mesuré).
 */
export function construireJeu(ordre, n, k, courbes) {
  const chevaux = (ordre || []).slice(0, Math.max(0, n))
  const table = Array.isArray(courbes)
    ? (courbes.find((x) => x.n === n) || {})
    : ((courbes || {})[String(n)] || {})
  return {
    k,
    n: chevaux.length,
    chevaux,
    combinaisons: combinaisons(chevaux.length, k),
    liste: jeuxDe(chevaux, k),
    taux: { marche: table.marche ?? null, presse: table.presse ?? null, fusion: table.fusion ?? null },
  }
}

/** La mesure publiée — tools/trio.mjs. La page la lit telle quelle. */
export async function fetchTrio() {
  try {
    const r = await fetch('/data/trio.json', { headers: { Accept: 'application/json' } })
    if (!r.ok) return null
    return r.json()
  } catch (e) { return null }
}
