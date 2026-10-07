// backend/COUPLE/moteur.js — LE MOTEUR « EMPREINTE DU COUPLÉ », côté page.
//
// Importé par frontend/COUPLE/Couple.jsx UNIQUEMENT. Ne pas partager.
//
// ⚠ Ce fichier tourne DANS LE NAVIGATEUR : aucun `node:fs`, aucun chemin
//   disque. La base des formes vient de `public/data/empreinte.json`
//   (construite par `node tools/moteur-couple.mjs`, 3 986 courses).
//
// ─────────────────────────────────────────────────────────────────────────
// LA RÈGLE (vision du 07/10/2026, mesurée sur 3 986 courses)
//
//   1. Le trio CANDIDAT = top-3 de la cote (le meilleur critère isolé).
//   2. Sa FORME = tiers(marché) + tiers(forme) + tiers(palmarès), calculés
//      DANS LA COURSE (jamais de seuils absolus).
//   3. On cherche la forme dans la base : n apparitions, P(3/3), P(les3).
//   4. FORTE = n ≥ 10 ET P(3/3) ≥ 2× baseline. Sinon on PASSE.
//
// ⚠ ÉTAT AU 07/10/2026 : 0 forme forte sur 98. Le moteur PASSE donc
//   partout — c'est honnête, pas un bug. Le seul signal stable trouvé
//   (favori ≤3 → 2.69% contre 1.70% de baseline) est affiché en INFO,
//   pas en décision : il n'est pas encore validé comme règle.

/* ─────────────────────────────────────────────────────── les couches ──── */

function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => {
    const pl = Number(String(r).replace(/\D/g, ''))
    sc += (pts[pl] ?? 1) / (1 + i * 0.55)
  })
  return sc
}

function palmares(p) {
  return Number(p.nombreVictoires ?? 0) * 10
    + Number(p.nombrePlacesSecond ?? 0) * 3
    + Number(p.nombrePlacesTroisieme ?? 0) * 2
    + Number(p.nombrePlaces ?? 0)
}

function tiers(valeurs, sens = 'bas') {
  const tris = [...valeurs].sort((a, b) => a - b)
  const q1 = tris[Math.floor(tris.length / 3)] ?? 0
  const q2 = tris[Math.floor((tris.length * 2) / 3)] ?? 0
  if (sens === 'haut') return (v) => (v >= q2 ? 'F' : v >= q1 ? 'm' : 'O')
  return (v) => (v <= q1 ? 'F' : v <= q2 ? 'm' : 'O')
}

function coteDe(p) {
  const v = p.cote ?? p.coteRef ?? p.cote_pmu ?? null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : Infinity
}

/* ─────────────────────────────────────────────────────── le moteur ────── */

/**
 * Le trio candidat : top-3 de la cote. `null` s'il manque des cotes.
 * Les partants viennent de `/api/couple` (déjà normalisés : num, cheval,
 * driver, cote, musique, valeur, gains, corde, poids, age…).
 */
export function trioCandidat(partants) {
  const ps = (partants || [])
    .map((p) => ({ num: p.num, v: coteDe(p) }))
    .filter((x) => Number.isFinite(x.v))
    .sort((a, b) => a.v - b.v)
  if (ps.length < 3) return null
  return [ps[0].num, ps[1].num, ps[2].num]
}

/**
 * La forme D'UN trio : les trois couches, dans la course.
 * `null` si un des trois manque ou n'a pas de cote.
 */
export function formeDe(partants, trio) {
  const parNum = new Map((partants || []).map((p) => [p.num, p]))
  if (!trio || trio.some((n) => !parNum.get(n))) return null
  const cotes = partants.map(coteDe).filter(Number.isFinite)
  const formes = partants.map((p) => formeScore(p.musique))
  const palms = partants.map((p) => palmares(p))
  if (!cotes.length) return null
  const tC = tiers(cotes, 'bas')
  const tF = tiers(formes, 'haut')
  const tP = tiers(palms, 'haut')
  return trio.map((n) => {
    const p = parNum.get(n)
    return tC(coteDe(p)) + tF(formeScore(p.musique)) + tP(palmares(p))
  }).join(' ')
}

/**
 * Le verdict : le trio, sa forme, son historique, et la décision.
 *
 *   db = public/data/empreinte.json { baseline, formes: [{forme,n,pExact,pLes3}] }
 *
 *   forte = n ≥ 10 ET pExact ≥ 2× baseline   →  JOUER
 *   sinon                                    →  PASSER
 *
 * `infoFavori` rappelle le seul signal stable mesuré (favori ≤3 → 2.69%) :
 * affiché, jamais décisif tant qu'il n'est pas validé comme règle.
 */
export function verdict(partants, db) {
  const trio = trioCandidat(partants)
  if (!trio) return { trio: null, raison: 'pas assez de cotes' }
  const forme = formeDe(partants, trio)
  if (!forme) return { trio, forme: null, raison: 'forme incalculable' }

  const e = (db?.formes || []).find((x) => x.forme === forme) || null
  const baseline = Number(db?.baseline ?? 1.7)
  const forte = !!e && e.n >= 10 && e.pExact >= baseline * 2

  const parNum = new Map((partants || []).map((p) => [p.num, p]))
  const fav = trio.map((n) => coteDe(parNum.get(n))).sort((a, b) => a - b)[0]

  return {
    trio,
    forme,
    n: e?.n ?? 0,
    pExact: e?.pExact ?? 0,
    pLes3: e?.pLes3 ?? 0,
    baseline,
    forte,
    jouer: forte,
    infoFavori: {
      cote: Number.isFinite(fav) ? fav : null,
      // le seul signal stable (2.69% sur n=2232) — INFO, pas décision
      signal: Number.isFinite(fav) && fav <= 3,
    },
  }
}
