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
//  l'archive (fenêtre glissante). Il combine le marché (cote_pmu) + la forme,
//  la valeur, l'âge, la corde, le palmarès, les gains, le déferré, les
//  oeillères, le sexe, la distance. Mesuré : 51,50 % (≥2/3) sur les 200
//  dernières courses — le marché seul donne 49,75 %.
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
 *   chevaux : les n numéros (top-n prédit) — 3 par défaut
 *   trios   : les C(n,3) trios des n chevaux
 *   paires  : les C(n,2) couplés des n chevaux
 *   probas  : P(top3) de chaque cheval, pour l'affichage
 *   modele  : { fenetre, validation } — la traçabilité
 *
 * ⚠ 19/10/2026 — la page n'affiche QUE les 3 numéros (choix de
 *   l'utilisateur) : « عطي غير تلاتة الارقام فقط ». `n` reste un paramètre
 *   pour les tests, il n'est pas exposé dans l'interface.
 */
export async function selectionCoply(partants, course, n = 3) {
  const m = await chargerModele()
  const chevaux = (partants || []).filter((p) => p.num && !p.nonPartant)
  if (chevaux.length < 3) return null

  const preds = chevaux.map((p) => {
    const x = caract(p, course).map((v, i) => (v - m.mean[i]) / m.std[i])
    const z = x.reduce((s, v, i) => s + v * m.poids[i], 0)
    return { num: p.num, p: sigmoid(z), cote: Number(p.cote_pmu) }
  })
  preds.sort((a, b) => b.p - a.p || a.num - b.num)

  const taille = Math.max(3, Math.min(Number(n) || 4, preds.length))
  const chevauxSel = preds.slice(0, taille).map((x) => x.num)
  return {
    chevaux: chevauxSel,
    trios: combinaisons(chevauxSel, 3),
    paires: combinaisons(chevauxSel, 2),
    probas: preds.slice(0, 8).map((x) => ({ num: x.num, p: x.p, cote: x.cote })),
    modele: { fenetre: m.fenetre, fin: m.fin, validation: m.validation },
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
