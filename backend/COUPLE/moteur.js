// backend/COUPLE/moteur.js — LE MOTEUR « EMPREINTE DU COUPLÉ » v2, côté page.
//
// Importé par frontend/COUPLE/Couple.jsx UNIQUEMENT. Ne pas partager.
//
// ⚠ Ce fichier tourne DANS LE NAVIGATEUR : aucun `node:fs`, aucun chemin
//   disque. La base des formes vient de `public/data/empreinte.json`
//   (construite par `node tools/moteur-couple.mjs`, 3 986 courses).
//
// ─────────────────────────────────────────────────────────────────────────
// v2 (critique du 07/10/2026 — juste) : on n'exige plus la forme EXACTE à
// 9 caractères (875 formes sur 3 986 trios — aucune ne revenait 10 fois).
// On interroge 4 NIVEAUX — complet, marché, forme, palmarès — et pour
// chacun 4 QUESTIONS : les3 ? auMoins2 ? le 1er finit-il 1er ? le 2e 2e ?
// FORTE = n ≥ 10 ET taux ≥ 2× baseline(de la question).
// JOUER = au moins une réponse forte, sur n'importe quel niveau.

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

export function trioCandidat(partants) {
  const ps = (partants || [])
    .map((p) => ({ num: p.num, v: coteDe(p) }))
    .filter((x) => Number.isFinite(x.v))
    .sort((a, b) => a.v - b.v)
  if (ps.length < 3) return null
  return [ps[0].num, ps[1].num, ps[2].num]
}

/**
 * Les 4 niveaux d'un trio : complet + une entrée par couche.
 * `null` si un des trois manque ou n'a pas de cote.
 */
export function niveauxDe(partants, trio) {
  const parNum = new Map((partants || []).map((p) => [p.num, p]))
  if (!trio || trio.some((n) => !parNum.get(n))) return null
  const cotes = partants.map(coteDe).filter(Number.isFinite)
  if (!cotes.length) return null
  const tC = tiers(cotes, 'bas')
  const tF = tiers(partants.map((p) => formeScore(p.musique)), 'haut')
  const tP = tiers(partants.map((p) => palmares(p)), 'haut')
  const couches = trio.map((n) => {
    const p = parNum.get(n)
    return {
      m: tC(coteDe(p)),
      f: tF(formeScore(p.musique)),
      p: tP(palmares(p)),
    }
  })
  const m = couches.map((c) => c.m).join('')
  const f = couches.map((c) => c.f).join('')
  const p = couches.map((c) => c.p).join('')
  return {
    complet: couches.map((c) => c.m + c.f + c.p).join(' '),
    marche: m, forme: f, palmares: p,
  }
}

const QUESTIONS = [
  ['les3', 'les 3 dans le Top3'],
  ['auMoins2', 'au moins 2 dans le Top3'],
  ['c1', 'le 1er finit 1er'],
  ['c2', 'le 2e finit 2e'],
  ['exact3', 'podium exact'],
]

/**
 * Le verdict : le trio, ses 4 niveaux, et pour chacun les réponses fortes.
 *
 *   db = public/data/empreinte.json
 *     { baselines: {les3, auMoins2, c1, c2, exact3},
 *       seuils: {n, facteur},
 *       niveaux: {complet: [{forme,n,c1,c2,c3,exact3,les3,auMoins2}], …} }
 *
 *   Pour chaque niveau : on cherche la forme, et pour chaque question on
 *   compare au double de sa baseline (n ≥ 10 exigé).
 *   jouer = au moins une réponse forte, sur n'importe quel niveau.
 */
export function verdict(partants, db) {
  const trio = trioCandidat(partants)
  if (!trio) return { trio: null, raison: 'pas assez de cotes' }
  const niveaux = niveauxDe(partants, trio)
  if (!niveaux) return { trio, raison: 'forme incalculable' }

  const seuils = db?.seuils || { n: 10, facteur: 2 }
  const base = db?.baselines || {}
  const reponses = []

  for (const niveau of ['complet', 'marche', 'forme', 'palmares']) {
    const table = db?.niveaux?.[niveau] || []
    const e = table.find((x) => x.forme === niveaux[niveau])
    if (!e || e.n < (seuils.n ?? 10)) continue
    for (const [cle, label] of QUESTIONS) {
      const taux = e[cle] / e.n * 100
      const seuil = (base[cle] ?? 0) * (seuils.facteur ?? 2)
      if (taux >= seuil) {
        reponses.push({
          niveau, forme: niveaux[niveau],
          question: label, taux: +taux.toFixed(1),
          nb: e[cle], n: e.n,
          forte: true,
        })
      }
    }
  }

  const parNum = new Map((partants || []).map((p) => [p.num, p]))
  const fav = trio.map((n) => coteDe(parNum.get(n))).sort((a, b) => a - b)[0]

  return {
    trio,
    niveaux,
    reponses,
    jouer: reponses.length > 0,
    // ★ LA PERSONNALITÉ DE LA FORME COMPLÈTE : ce n'est pas un signal
    //   isolé (« OmO = 70% »), c'est le portrait de la forme entière —
    //   combien de fois vue, et ce qui s'est passé à chaque fois.
    empreinte: personnalite(db, niveaux.complet),
    infoFavori: {
      cote: Number.isFinite(fav) ? fav : null,
      // le seul signal numérique stable (2.69% sur n=2232) — INFO, pas décision
      signal: Number.isFinite(fav) && fav <= 3,
    },
  }
}

/**
 * La personnalité d'une forme COMPLÈTE (« OmO | FmO | mFF ») : son
 * historique complet, en chiffres, plus une phrase qui la résume.
 *
 *   N'apparaît que si la forme a été vue (sinon : inconnue, on passe).
 *   Le profil se lit sur les TAUX comparés à leurs baselines — jamais
 *   sur un seul chiffre isolé :
 *     les3 ≥ 2× base      → le trio entre souvent ensemble
 *     auMoins2 ≥ 2× base   → deux des trois entrent, rarement les trois
 *     c1 ≥ 2× base         → le 1er gagne souvent, la suite suit mal
 *     sinon                → forme sans force particulière
 */
export function personnalite(db, formeComplet) {
  const table = db?.niveaux?.complet || []
  const seuils = db?.seuils || { n: 10, facteur: 2 }
  const base = db?.baselines || {}
  const e = table.find((x) => x.forme === formeComplet)
  if (!e) {
    return {
      forme: formeComplet, connue: false, n: 0,
      texte: 'Forme jamais vue dans l\u2019archive — on passe.',
    }
  }
  const taux = (k) => (e[k] / Math.max(1, e.n)) * 100
  const stats = {
    n: e.n,
    les3: +taux('les3').toFixed(1),
    auMoins2: +taux('auMoins2').toFixed(1),
    c1: +taux('c1').toFixed(1),
    c2: +taux('c2').toFixed(1),
    exact3: +taux('exact3').toFixed(1),
  }
  const F = seuils.facteur ?? 2
  let profil, ton
  if (e.n < (seuils.n ?? 10)) {
    profil = 'Forme trop rare pour conclure (n<' + (seuils.n ?? 10) + ').'
    ton = 'neutre'
  } else if (stats.les3 >= (base.les3 ?? 0) * F) {
    profil = 'Profil TRIO : les trois entrent souvent ensemble.'
    ton = 'fort'
  } else if (stats.auMoins2 >= (base.auMoins2 ?? 0) * F) {
    profil = 'Profil COUPLÉ : deux des trois entrent, rarement les trois.'
    ton = 'moyen'
  } else if (stats.c1 >= (base.c1 ?? 0) * F) {
    profil = 'Profil FAVORI : le 1er gagne souvent, la suite suit mal.'
    ton = 'moyen'
  } else {
    profil = 'Forme sans force particulière.'
    ton = 'neutre'
  }
  return { forme: formeComplet, connue: true, ...stats, profil, ton }
}
