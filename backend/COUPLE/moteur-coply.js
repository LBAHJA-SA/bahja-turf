// backend/COUPLE/moteur-coply.js — LE MOTEUR DU COUPLÉ (page /coply).
// Importé par frontend/COUPLE/Couple.jsx UNIQUEMENT. Ne pas partager.
//
// ⚠ Ce fichier tourne DANS LE NAVIGATEUR : aucun `node:fs`. Il charge les
//   poids du modèle (public/data/coply-modele.json, écrit par
//   tools/train-coply.mjs) et prédit P(dans le top3) sur la course du jour.
//
// ─────────────────────────────────────────────────────────────────────────
//  LA DÉFINITION (utilisateur, 16/10/2026)
//
//  « الكوبلي الفائز هو اما الاول والتاني او الاول والتالت او التاني والتالت »
//     → le couplé gagnant est (1er,2e) OU (1er,3e) OU (2e,3e).
//  C'est DEUX des trois premiers. Pour un jeu de 3 chevaux, ça veut dire
//     |picks ∩ {1er,2e,3e}| ≥ 2   (les 3 paires du trio).
//
//  Le modèle : régression logistique sur P(dans le top3), entraînée sur
//  l'archive (fenêtre glissante). Il combine le marché (cote) + la forme,
//  la valeur, l'âge, la corde, les gains, le sexe, la distance.
//
//  ⚠ MESURÉ LE 21/10/2026 — `tools/coply-verif.mjs` + `tools/coply-regles.mjs`.
//    600 courses JAMAIS VUES (train = tout le reste) :
//        le moteur   51,3 % (≥2/3)  ·  8,2 % (les 3 exacts)
//        le marché   51,2 % (≥2/3)  ·  8,4 % (les 3 exacts)
//        → il choisit EXACTEMENT le top-3 du marché 89,2 % du temps.
//    Les « 51,50 % » annoncés jusqu'ici étaient IN-SAMPLE : les 200 courses
//    de validation étaient DANS la fenêtre d'entraînement (bug corrigé dans
//    tools/train-coply.mjs le même jour).
//    Huit autres règles testées hors échantillon, toutes ≤ au marché :
//        la forme seule 35,1 % · le marché sans le favori 35,9 % ·
//        1er du marché + 2 formes 49,0 % · deux réentraînements 51,0-51,2 %.
//        La grille « a × rang de cote + b × rang de forme » a choisi b = 0
//        SUR LE TRAIN : la forme n'ajoute rien à la cote.
//    → À 3 NUMÉROS, LA COTE EST LE PLAFOND. Le seul signal mesuré au-dessus
//      est la PRESSE sur le Quinté : favori + presse rangs 2-3 = 39,6 %
//      contre 32,3 % au marché (96 Quintés, moitiés 39,6 / 39,6, bootstrap
//      91,8 %). Ce n'est PAS branché ici — décision de l'utilisateur.
// ─────────────────────────────────────────────────────────────────────────

const FORMULE = '/data/coply-modele.json'

const formeScore = (mus) => {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  for (const [i, r] of (s.match(/\d+[a-z]/g) || []).slice(0, 6).entries()) {
    const pl = Number(String(r).replace(/\D/g, ''))
    sc += (pts[pl] ?? 1) / (1 + i * 0.55)
  }
  return sc
}
const log1p = (x) => Math.log(Math.max(0, x) + 1)
const BOUT = (v, d) => (Number.isFinite(v) ? v : d)

/** Les caractéristiques d'un cheval — DOIVENT correspondre à l'entraînement.
 *  ⚠ 8 caractéristiques, celles qui existent À LA FOIS dans l'archive
 *   (cote_pmu) ET sur la page (coteRef). Les autres (palmarès, déferré,
 *   oeillères) ne sont pas publiées par reu.php → exclues du modèle. */
function caract(p, course) {
  const c = Number(p.coteRef ?? p.cote_pmu ?? p.cote)
  return [
    Math.log(Number.isFinite(c) && c > 0 ? c : 30),
    formeScore(p.musique),
    BOUT(Number(p.valeur), 0),
    BOUT(Number(p.age), 5),
    BOUT(Number(p.corde), 99),
    log1p(BOUT(Number(p.gains), 0)),
    /^M|^H/i.test(String(p.sexe || '')) ? 1 : 0,
    Number(course.distance) / 1000,
  ]
}

let _modele = null

/** Charge le modèle (une fois, en mémoire). */
async function chargerModele() {
  if (_modele) return _modele
  const r = await fetch(FORMULE, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('modele HTTP ' + r.status)
  _modele = await r.json()
  return _modele
}

const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))))

/**
 * selectionCoply(partants, course, n = 3) → { chevaux, trios, paires, probas, modele }
 *   chevaux : les n numéros (top-n) — 3 par défaut
 *   trios   : les C(n,3) trios des n chevaux
 *   paires  : les C(n,2) couplés des n chevaux
 *   probas  : P(top3) de chaque cheval (vide quand le carnet décide)
 *   modele  : { regle: 'carnet' | 'modele', … } — la traçabilité
 *
 * ⚠ 19/10/2026 — la page n'affiche QUE les 3 numéros (choix de
 *   l'utilisateur) : « عطي غير تلاتة الارقام فقط ». `n` reste un paramètre
 *   pour les tests, il n'est pas exposé dans l'interface.
 *
 * ⚠ 21/10/2026 — L'ORDRE DU CARNET PASSE DEVANT LE MARCHÉ.
 *   Mesuré en EUROS (`tools/coply-trio-euros.mjs` + `tools/couple-euros.mjs`,
 *   94 Quintés, 1 € par course) :
 *       trio du marché 1-3   : −74 %   (quand il gagne, il paie 8 €)
 *       trio du carnet 1-3   : −56 %
 *       couplé placé marché  : −22,4 %
 *       couplé placé carnet  : −3,4 %
 *   Le balayage de TOUTES les fenêtres de 3 rangs (marché et carnet, 1-3 à
 *   10-12) ne donne aucune ligne positive : sous le rang 4, on ne touche
 *   JAMAIS (0/92). Le trio à 3 numéros est une loterie — le carnet est
 *   simplement l'ordre qui perd le moins.
 *   `course.presse` = l'ordre de la presse (P1, P2, …). Il n'existe QUE pour
 *   le Quinté ; ailleurs le marché reste la seule donnée disponible.
 */
export async function selectionCoply(partants, course, n = 3) {
  const chevaux = (partants || []).filter((p) => p.num && !p.nonPartant)
  if (chevaux.length < 3) return null
  const taille = Math.max(3, Math.min(Number(n) || 3, chevaux.length))

  /* ① LE CARNET, quand il est publié */
  const nums = new Set(chevaux.map((p) => p.num))
  const carnet = (Array.isArray(course && course.presse) ? course.presse : [])
    .map(Number)
    .filter((x) => nums.has(x))
  if (carnet.length >= 3) {
    const sel = carnet.slice(0, taille)
    return {
      chevaux: sel,
      trios: combinaisons(sel, 3),
      paires: combinaisons(sel, 2),
      probas: [],
      modele: { regle: 'carnet', presse: carnet.slice(0, taille) },
    }
  }

  /* ② sinon le modèle — mesuré égal au marché (§ en-tête) */
  const m = await chargerModele()
  const preds = chevaux.map((p) => {
    const x = caract(p, course).map((v, i) => (v - m.mean[i]) / m.std[i])
    const z = x.reduce((s, v, i) => s + v * m.poids[i], 0)
    return { num: p.num, p: sigmoid(z), cote: Number(p.cote_pmu) }
  })
  preds.sort((a, b) => b.p - a.p || a.num - b.num)

  const chevauxSel = preds.slice(0, taille).map((x) => x.num)
  return {
    chevaux: chevauxSel,
    trios: combinaisons(chevauxSel, 3),
    paires: combinaisons(chevauxSel, 2),
    probas: preds.slice(0, 8).map((x) => ({ num: x.num, p: x.p, cote: x.cote })),
    modele: { regle: 'modele', fenetre: m.fenetre, fin: m.fin, validation: m.validation },
  }
}

/** Les combinaisons de k numéros pris parmi n (l'ordre ne compte pas). */
export function combinaisons(liste, k) {
  const out = []
  const rec = (debut, acc) => {
    if (acc.length === k) { out.push([...acc]); return }
    for (let i = debut; i < liste.length; i++) { acc.push(liste[i]); rec(i + 1, acc); acc.pop() }
  }
  rec(0, [])
  return out
}

/** Le repli si le modèle est indisponible : les n plus petites cotes. */
export function repliMarche(partants, n = 3) {
  const chevaux = (partants || []).filter((p) => p.num && !p.nonPartant)
  const cs = chevaux
    .map((p) => ({ num: p.num, c: Number(p.coteRef ?? p.cote_pmu ?? p.cote) }))
    .filter((x) => Number.isFinite(x.c) && x.c > 0)
    .sort((a, b) => a.c - b.c || a.num - b.num)
  const taille = Math.max(3, Math.min(Number(n) || 4, cs.length))
  return cs.slice(0, taille).map((x) => x.num)
}
