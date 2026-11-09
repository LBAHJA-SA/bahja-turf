/* =============================================================================
 * src/lib/probabilite.js — LE MOTEUR DE PROBABILITÉ (09/11/2026)
 *
 * ⛔ NE TOUCHE PAS AU MOTEUR Quinté. `src/lib/quinte.js` et sa copie backend
 *    restent intacts. Ce module lit l'archive (les arrivées réelles) et calcule
 *    des probabilités EMPIRIQUES, conditionnelles et bayésiennes sur les cases
 *    P1..P20 — sans jamais modifier un quota ni une boîte.
 *
 * ─── POURQUOI ────────────────────────────────────────────────────────────────
 * La méthode Quinté travaille par BLOCS (G1..G5) et par QUOTAS (3-2-1-1-1).
 * Elle ne répond pas à la question : « quelle est la probabilité que P3 entre
 * dans le top 5 SI P1 et P2 y sont déjà ? ». C'est exactement ce que fait ce
 * module : il passe de
 *
 *      Horse Ranking  →  Probability
 * à
 *      Historical Race DNA  →  Position Probability  →  Horse Selection
 *
 * Les probabilités sont EMPIRIQUES (fréquences observées) avec lissage de
 * Laplace, jamais inventées : chaque chiffre vient d'une course réelle.
 *
 * ─── CE QUE LE MODULE CALCULE ────────────────────────────────────────────────
 *  A. Par case P (P1..P20) :
 *     · n_top5  = nombre de fois où la case finit dans les 5
 *     · pos[0..4] = répartition dans les 5 positions (1er..5e)
 *     · victoires, podiums
 *     · P(top5 | N) = n_top5 / N   (globale)
 *     · P(pos k | top5) = pos[k] / n_top5   (conditionnelle)
 *     · P(top5 | N) lissée (Laplace, α=1)
 *  B. Co-occurrences (paires) :
 *     · count(Pa ∩ Pb) = courses où les deux sont dans les 5
 *     · P(Pa ∩ Pb) = count / N
 *     · P(Pb | Pa) = count / n_top5(Pa)   (conditionnelle)
 *  C. Triples (top 20 par fréquence) :
 *     · count(Pa ∩ Pb ∩ Pc), P = count / N
 *  D. Top listes : top cases, top paires, top triples.
 *
 * ⚠ Les probabilités conditionnelles sont MESURÉES, pas estimées par un modèle.
 *   Avec N < 100, les valeurs sont bruitées — le module expose N et alpha pour
 *   que la page puisse l'afficher honnêtement.
 *
 *   `node tools\probabilite.mjs` écrit data/probabilite.json + public/data/...
 * ========================================================================== */

export const MAXP = 20
export const ALPHA = 1

/** Laplace : (count + α) / (N + α·k) */
export function bayesSmooth(count, N, k, alpha = ALPHA) {
  if (!N) return 0
  return (count + alpha) / (N + alpha * k)
}

/**
 * Construit la matrice DNA à partir d'une liste de courses.
 *
 * @param {Array} courses  chaque élément : { grille, arr, discipline?, date? }
 *                         `grille` = retour de buildGrid (doit porter slotParNum)
 *                         `arr`    = arrivée (les 5 premiers)
 * @returns {object} la matrice complète
 */
export function construireMatrix(courses) {
  const list = Array.isArray(courses) ? courses : []
  const N = list.length

  // A. par case P
  const parP = Array.from({ length: MAXP + 1 }, () => ({
    p: 0, n: 0, pos: [0, 0, 0, 0, 0], vic: 0, pod: 0,
  }))
  for (let p = 1; p <= MAXP; p++) parP[p].p = p

  // B. paires
  const pairs = Array.from({ length: MAXP + 1 }, () => Array(MAXP + 1).fill(0))

  // C. triples
  const triplesMap = new Map()

  for (const c of list) {
    const top5 = (c.arr || []).slice(0, 5)
    const slots = top5.map((n) => (c.grille && c.grille.slotParNum ? c.grille.slotParNum[n] : null))
      .filter((s) => Number.isFinite(s) && s >= 1 && s <= MAXP)
    // positions : on garde la position réelle dans l'arrivée, indexée par slot
    const slotAtPos = top5.map((n) => (c.grille && c.grille.slotParNum ? c.grille.slotParNum[n] : null))

    for (let i = 0; i < slotAtPos.length; i++) {
      const p = slotAtPos[i]
      if (!Number.isFinite(p) || p < 1 || p > MAXP) continue
      parP[p].n++
      if (i < 5) parP[p].pos[i]++
      if (i === 0) parP[p].vic++
      if (i <= 2) parP[p].pod++
    }

    // paires (unordered, dans top5)
    for (let a = 0; a < slots.length; a++) {
      for (let b = a + 1; b < slots.length; b++) {
        const x = slots[a], y = slots[b]
        pairs[x][y]++
        pairs[y][x]++
      }
    }

    // triples (unordered)
    for (let a = 0; a < slots.length; a++) {
      for (let b = a + 1; b < slots.length; b++) {
        for (let c2 = b + 1; c2 < slots.length; c2++) {
          const key = [slots[a], slots[b], slots[c2]].sort((x, y) => x - y).join('-')
          triplesMap.set(key, (triplesMap.get(key) || 0) + 1)
        }
      }
    }
  }

  // A. probabilités par case
  const singles = []
  for (let p = 1; p <= MAXP; p++) {
    const d = parP[p]
    singles.push({
      p,
      n_top5: d.n,
      victoires: d.vic,
      podiums: d.pod,
      p_top5: N ? d.n / N : 0,
      p_top5_smooth: bayesSmooth(d.n, N, MAXP, ALPHA),
      // conditionnelles sur ses top-5
      p_1er: d.n ? d.pos[0] / d.n : 0,
      p_2e: d.n ? d.pos[1] / d.n : 0,
      p_3e: d.n ? d.pos[2] / d.n : 0,
      p_4e: d.n ? d.pos[3] / d.n : 0,
      p_5e: d.n ? d.pos[4] / d.n : 0,
      pos: d.pos.slice(),
    })
  }

  // B. paires
  const pairList = []
  for (let a = 1; a <= MAXP; a++) {
    for (let b = a + 1; b <= MAXP; b++) {
      const cnt = pairs[a][b]
      if (!cnt) continue
      const na = parP[a].n, nb = parP[b].n
      pairList.push({
        a, b, count: cnt,
        p_both: N ? cnt / N : 0,
        p_b_given_a: na ? cnt / na : 0,
        p_a_given_b: nb ? cnt / nb : 0,
        // lissage bayésien pour les paires (k = nombre de paires possibles)
        p_both_smooth: bayesSmooth(cnt, N, (MAXP * (MAXP - 1)) / 2, ALPHA),
      })
    }
  }
  pairList.sort((x, y) => y.count - x.count || x.a - y.a)

  // C. triples
  const tripleList = [...triplesMap.entries()]
    .map(([k, v]) => ({ combo: k.split('-').map(Number), count: v, p: N ? v / N : 0 }))
    .sort((a, b) => b.count - a.count || a.combo.join('').localeCompare(b.combo.join('')))

  // D. top listes
  const topCases = singles
    .filter((s) => s.n_top5 > 0)
    .sort((a, b) => b.n_top5 - a.n_top5 || a.p - b.p)
    .slice(0, 10)

  const topPaires = pairList.slice(0, 15)
  const topTriples = tripleList.slice(0, 15)

  // E. probabilité d'au moins un P11+ dans le top-5
  let coursesAvecBas = 0
  for (const c of list) {
    const slots = (c.arr || []).slice(0, 5).map((n) => (c.grille && c.grille.slotParNum ? c.grille.slotParNum[n] : null))
    if (slots.some((s) => Number.isFinite(s) && s >= 11)) coursesAvecBas++
  }

  return {
    N,
    alpha: ALPHA,
    maxP: MAXP,
    parP: singles,
    pairs,                 // matrice 21×21 (index 0 inutilisé)
    pairList,
    tripleList,
    topCases,
    topPaires,
    topTriples,
    coursesAvecBas,
    p_auMoinsUnBas: N ? coursesAvecBas / N : 0,
    genereLe: new Date().toISOString(),
  }
}

/** Formate une probabilité en % (1 décimale) */
export function pctProb(x) {
  if (x == null || !Number.isFinite(x)) return '—'
  return (x * 100).toFixed(1).replace('.', ',') + ' %'
}
