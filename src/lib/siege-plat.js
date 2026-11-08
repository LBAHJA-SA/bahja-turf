/* =============================================================================
 * src/lib/siege-plat.js — LE SIÈGE PLAT : 9ᵉ CHEVAL, HORS QUOTA (08/11/2026)
 *
 * ⛔ CE FICHIER NE TOUCHE PAS AU MOTEUR. `src/lib/quinte.js` et sa copie
 *    `backend/QUINTE/quinte.js` restent intacts : les quotas constitutionnels
 *    3-2-1-1-1 continuent de remplir 8 chevaux (§11.49). Ce module ajoute
 *    UN siège SUPPLÉMENTAIRE, après coup, sans déplacer une seule boîte
 *    (P1-P4 / P5-P8 / P9-P10 / P11-P12 / P13+).
 *
 * ─── POURQUOI (mesuré le 08/11/2026) ────────────────────────────────────────
 * Le rendement du ticket de 8 dépend fortement de la discipline :
 *
 *      discipline      quinté 5/5     podium 3/3     AUC presse
 *      Plat               8,9 %         31,1 %          0,681
 *      Attelé            17,1 %         51,2 %          0,715
 *      Haies             10,0 %         20,0 %          0,691
 *
 * En Plat, le carnet est moins lisible : il lui faut UNE case de plus pour
 * dire la même chose. Ce n'est PAS un écart dans les cases P (testé sur 128
 * courses : aucune case significative, P5 le plus proche à z = −1,68) — c'est
 * un écart de LARGEUR.
 *
 * ─── CE QUE LE SIÈGE RAPPORTE ───────────────────────────────────────────────
 * On ajoute le cheval que G1 coupe : le 4ᵉ cité par la presse.
 *
 *      corpus 96 (presse + marché)      Plat            Attelé        Haies
 *      T1 (8 chevaux)                4/45   8,9 %    7/41 17,1 %    1/10 10,0 %
 *      T1 + siège Plat              11/45  24,4 %    8/41 19,5 %    1/10 10,0 %
 *      T1 + 2ᵉ de G5 (TÉMOIN)        4/45   8,9 %    7/41 17,1 %    1/10 10,0 %
 *
 *      podium : 31,1 % → 48,9 % en Plat · le témoin ne donne que 35,6 %
 *
 * Le témoin est la preuve que le gain est DIRIGÉ : ajouter n'importe quel
 * cheval ne change rien (8,9 % reste 8,9 %).
 *
 * Registre du site (tickets réels, 32 courses) : Plat 7,7 → 15,4 % de quinté,
 * podium 15,4 → 46,2 % (témoin 30,8 %).
 *
 * ─── LA RÈGLE, EN UNE LIGNE ─────────────────────────────────────────────────
 * Plat → le 4ᵉ cité par la presse entre comme 9ᵉ, à la fin du ticket.
 * Attelé et Haies → rien ne change, le ticket reste à 8.
 *
 * ⚠ Ce n'est pas un quota : on ne retire rien à personne. Le ticket de 8 est
 *   construit exactement comme avant, puis on ajoute un cheval.
 *   `node tools\diag-discipline-ticket.mjs` rejoue toute la mesure.
 * ========================================================================== */

/** Le jour est-il du Plat ? (`PLAT`, `Plat`, `plat`…) */
export const estPlat = (discipline) =>
  /^plat/i.test(String(discipline == null ? '' : discipline).trim())

/**
 * Le cheval du siège Plat : le 4ᵉ cité par la presse, c'est-à-dire celui que
 * G1 coupe. `null` si la course n'est pas du Plat, ou si G1 n'a pas 4 cases
 * (non-partant dans les 4 premiers cités → on n'invente rien, §7).
 *
 * @param {object} grille  le retour de `buildGrid`
 * @param {string} discipline  la discipline du jour
 * @returns {{num:number, place:number, slot:number}|null}
 */
export function siegePlat(grille, discipline) {
  if (!estPlat(discipline)) return null
  const g1 = grille && grille.groupes && grille.groupes[0]
  if (!g1 || !Array.isArray(g1.cases) || g1.cases.length < 4) return null
  const ordre = g1.cases.slice().sort((a, b) => a.place - b.place)
  return ordre[3] || null
}

/**
 * Le ticket de production, plus le siège Plat s'il y a lieu.
 * Le siège est ajouté À LA FIN : il ne prend la place de personne et reste
 * identifiable comme le 9ᵉ cheval.
 *
 * @param {number[]} ticket  le ticket du moteur (8 chevaux)
 * @param {object} grille    le retour de `buildGrid` du jour
 * @param {string} discipline
 * @returns {number[]} le même ticket, éventuellement + 1
 */
export function avecSiegePlat(ticket, grille, discipline) {
  const base = Array.isArray(ticket) ? ticket : []
  const s = siegePlat(grille, discipline)
  if (!s || base.includes(s.num)) return base.slice()
  return [...base, s.num]
}
