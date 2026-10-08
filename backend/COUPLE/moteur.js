// backend/COUPLE/moteur.js — LE MOTEUR « EMPREINTE DU COUPLÉ » V3, côté page.
//
// Importé par frontend/COUPLE/Couple.jsx UNIQUEMENT. Ne pas partager.
//
// ⚠ Ce fichier tourne DANS LE NAVIGATEUR : aucun `node:fs`, aucun chemin
//   disque. L'index des empreintes vient de `public/data/empreinte-v3.json`
//   (construit par `node tools/empreinte-v3.mjs`, ~3 900 courses).
//
// ─────────────────────────────────────────────────────────────────────────
// V3 (spécification du 07/10/2026 — appliquée telle quelle)
//
// Le moteur ne teste PAS un trio imposé (top-3 cote). Il GÉNÈRE tous les
// Top3 ordonnés possibles (permutations), construit l'empreinte de chacun
// (familles + rangs + relations), cherche son antécédent historique
// (FULL > FAM > COARSE), mesure sa COHÉRENCE AVEC SON PROPRE GROUPE
// (jamais contre tout l'archive), et classe par :
//     (level, support, -rank_dev, -prof_dev, rel_freq)
// Le premier est le Top3 candidat. Aucun seuil, aucun FORTE : on classe,
// on ne coupe pas.
//
// L'empreinte : FAM(P1)-FAM(P2)-FAM(P3) | RANK(P1)-RANK(P2)-RANK(P3)
//   ex. FAV2-FAV2-FAV3|1-2-4
// L'échelle des familles est ABSOLUE (la même pour toutes les courses) :
//   FAV1 0–3 · FAV2 3.1–7 · FAV3 7.1–10 · OUT1 10.1–13 · OUT2 13.1–16
//   OUT3 16.1–18 · TOC1 18.1–21 · TOC2 21.1–25 · TOC3 25.1–28
//   TOC4 28.1–31 · TOC5 31.1–36 · TOC6 36.1–40 · TOC7 40.1–50 · TOC8 >50
// COARSE : FAV* → FAV · OUT* → OUT · TOC* → TOC.

/* ─────────────────────────────────────────────────── les familles ─────── */

const ECHELLE = [
  ['FAV1', 3.0], ['FAV2', 7.0], ['FAV3', 10.0],
  ['OUT1', 13.0], ['OUT2', 16.0], ['OUT3', 18.0],
  ['TOC1', 21.0], ['TOC2', 25.0], ['TOC3', 28.0], ['TOC4', 31.0],
  ['TOC5', 36.0], ['TOC6', 40.0], ['TOC7', 50.0], ['TOC8', Infinity],
]

export function famille(cote) {
  const n = Number(cote)
  if (!Number.isFinite(n) || n <= 0) return null
  for (const [nom, max] of ECHELLE) if (n <= max) return nom
  return 'TOC8'
}

export function coarse(fam) {
  if (!fam) return null
  if (fam.startsWith('FAV')) return 'FAV'
  if (fam.startsWith('OUT')) return 'OUT'
  return 'TOC'
}

/* ⚠ QUELLE COTE ? (vérifié le 08/10/2026 — point bloquant levé par la revue)
 *   Les archives historiques n'ont QU'UN SEUL champ : `cote_pmu` (la cote
 *   PMU de référence, ex. 17). Les courses du jour en ont DEUX :
 *     `cote`    = la colonne « Cotes » de reu.php (ex. 185, 141, 3.8…)
 *     `coteRef` = la colonne « Cotes Ref. » (ex. 5.4, 16.7, 19.9…)
 *   Mesuré sur 616 paires : 74% diffèrent de plus de ×1.5 (ex. n17 :
 *   cote=3.8 contre coteRef=19.9 — inversés). La colonne « Cotes » est
 *   donc INUTILISABLE pour la famille : autre type, autre moment, ou
 *   lignes décalées. Seule `coteRef` est du même type que `cote_pmu`.
 *   Ordre imposé : coteRef d'abord, jamais la « Cotes » du jour. */
function coteDe(p) {
  const v = p.coteRef ?? p.cote_pmu ?? null
  const n = Number(v)
  if (Number.isFinite(n) && n > 0) return n
  // repli : la cote déjà normalisée par /api/couple (qui met la ref dedans)
  const c = Number(p.cote)
  return Number.isFinite(c) && c > 0 ? c : Infinity
}

/* ⚠ Infinity N'EST PAS une cote (08/10/2026). `Number.isFinite(Infinity)`
 *   vaut true : sans ce garde, les chevaux sans cote passaient le filtre
 *   et formaient un « trio » fantôme — le verdict répondait n'importe quoi
 *   au lieu de « pas assez de cotes ». */
function coteValide(x) {
  return Number.isFinite(x) && x !== Infinity && x > 0
}

/* ─────────────────────────────────────────────────── une empreinte ────── */

function rangsMarche(partants) {
  const ordre = (partants || [])
    .map((p) => ({ num: p.num, c: coteDe(p) }))
    .filter((x) => coteValide(x.c))
    .sort((a, b) => a.c - b.c)
  return new Map(ordre.map((x, i) => [x.num, i + 1]))
}

/**
 * L'empreinte d'un trio ORDONNÉ [a,b,c] : familles + rangs + relations
 * (fam_pair, rank_pair, écarts cote/poids/valeur/âge/corde/gains).
 * `null` si un des trois manque, n'a pas de cote ou n'a pas de rang.
 */
export function empreinteDe(partants, trio) {
  const parNum = new Map((partants || []).map((p) => [p.num, p]))
  if (!trio || trio.length !== 3 || trio.some((n) => !parNum.get(n))) return null
  const rangs = rangsMarche(partants)
  if (trio.some((n) => rangs.get(n) == null)) return null
  const fs3 = trio.map((n) => {
    const p = parNum.get(n)
    return {
      num: n,
      cote: coteDe(p) === Infinity ? null : coteDe(p),
      poids: p.poids ?? null,
      valeur: p.valeur ?? null,
      age: p.age ?? null,
      corde: p.corde ?? null,
      gains: p.gains ?? p.gain ?? null,
    }
  })
  if (fs3.some((x) => x.cote == null)) return null
  const fams = fs3.map((x) => famille(x.cote))
  if (fams.some((x) => !x)) return null
  const rks = trio.map((n) => rangs.get(n))
  const rel = (i, j) => ({
    fam_pair: fams[i] + '-' + fams[j],
    rank_pair: rks[i] + '-' + rks[j],
    cote_gap: +(Math.abs(fs3[i].cote - fs3[j].cote)).toFixed(2),
    poids_gap: fs3[i].poids != null && fs3[j].poids != null ? Math.abs(fs3[i].poids - fs3[j].poids) : null,
    valeur_gap: fs3[i].valeur != null && fs3[j].valeur != null ? Math.abs(fs3[i].valeur - fs3[j].valeur) : null,
    age_gap: fs3[i].age != null && fs3[j].age != null ? Math.abs(fs3[i].age - fs3[j].age) : null,
    corde_gap: fs3[i].corde != null && fs3[j].corde != null ? Math.abs(fs3[i].corde - fs3[j].corde) : null,
    gain_gap: fs3[i].gains != null && fs3[j].gains != null ? Math.abs(fs3[i].gains - fs3[j].gains) : null,
  })
  const fkey = fams.join('-')
  const rkey = rks.join('-')
  return {
    trio: [...trio],
    fams, rangs: rks,
    fkey, rkey,
    full: fkey + '|' + rkey,
    fam: fkey,
    coarse: fams.map(coarse).join('-'),
    fiches: fs3,
    relations: { 'P1-P2': rel(0, 1), 'P1-P3': rel(0, 2), 'P2-P3': rel(1, 2) },
  }
}

/* ─────────────────────────────────────────────────── cohérence ────────── */

function ecartRel(x, med) {
  if (x == null || med == null) return null
  return Math.abs(x - med) / (Math.abs(med) + 1)
}

/**
 * La cohérence AVEC SON PROPRE GROUPE (jamais contre tout l'archive) :
 * rank_dev (rangs vs médianes), prof_dev (cote/poids/valeur, écarts
 * relatifs), rel_freq (les 3 paires actuelles sont-elles les habituelles ?).
 */
export function coherence(emp, resume) {
  let rankDev = 0
  emp.rangs.forEach((r, i) => {
    const m = resume.medRangs[i]
    if (m != null) rankDev += Math.abs(r - m)
  })
  let profDev = 0, profN = 0
  emp.fiches.forEach((f, i) => {
    for (const [cle, meds] of [['cote', resume.medCote], ['poids', resume.medPoids], ['valeur', resume.medValeur]]) {
      const e = ecartRel(f[cle], meds[i])
      if (e != null) { profDev += e; profN++ }
    }
  })
  profDev = profN ? profDev / profN : 0
  let relFreq = 0
  for (const k of ['P1-P2', 'P1-P3', 'P2-P3']) {
    const fp = emp.relations[k].fam_pair
    const top = resume.paires[k][0]
    relFreq += top && top.fam_pair === fp ? top.pct / 100 : 0
  }
  relFreq = relFreq / 3
  return { rankDev: +rankDev.toFixed(2), profDev: +profDev.toFixed(3), relFreq: +relFreq.toFixed(3) }
}

/* ─────────────────────────────────────────────────── candidats ────────── */

function* triples(partants) {
  const nums = (partants || []).map((p) => p.num)
  const cotes = new Map((partants || []).map((p) => [p.num, coteDe(p)]))
  for (const a of nums) {
    if (!coteValide(cotes.get(a))) continue
    for (const b of nums) {
      if (b === a || !coteValide(cotes.get(b))) continue
      for (const c of nums) {
        if (c === a || c === b || !coteValide(cotes.get(c))) continue
        yield [a, b, c]
      }
    }
  }
}

const NIVEAU_RANG = { FULL: 3, FAM: 2, COARSE: 1 }

export function cleClassement(cand, coh) {
  return [NIVEAU_RANG[cand.level], cand.support, -coh.rankDev, -coh.profDev, coh.relFreq]
}

function comparerCles(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] > b[i]) return -1
    if (a[i] < b[i]) return 1
  }
  return 0
}

/**
 * Le meilleur trio : on génère TOUS les Top3 ordonnés possibles, on
 * construit l'empreinte de chacun, on cherche son antécédent (FULL, sinon
 * FAM, sinon COARSE), on mesure sa cohérence avec son groupe, et on classe
 * par (level, support, -rank_dev, -prof_dev, rel_freq). Le premier gagne.
 * `null` si aucun trio ne trouve d'antécédent.
 */
export function meilleurTrio(partants, index) {
  let best = null
  for (const t of triples(partants)) {
    const emp = empreinteDe(partants, t)
    if (!emp) continue
    /* ⚠ LA CLÉ AFFICHÉE EST CELLE DE L'ARCHIVE, pas celle calculée.
     *   Si le match est au niveau FAM, la FULL du jour n'a peut-être jamais
     *   existé : l'afficher comme « empreinte » serait l'inventer. On
     *   affiche donc la clé TROUVÉE dans l'index (son support, son groupe).
     *   La FULL du jour reste visible en second, comme référence. */
    let cand = null
    if (index.full[emp.full]) cand = { level: 'FULL', cleArchive: emp.full, support: index.full[emp.full].n, resume: index.full[emp.full] }
    else if (index.fam[emp.fam]) cand = { level: 'FAM', cleArchive: emp.fam, support: index.fam[emp.fam].n, resume: index.fam[emp.fam] }
    else if (index.coarse[emp.coarse]) cand = { level: 'COARSE', cleArchive: emp.coarse, support: index.coarse[emp.coarse].n, resume: index.coarse[emp.coarse] }
    if (!cand) continue
    const coh = coherence(emp, cand.resume)
    const cle = cleClassement(cand, coh)
    if (!best || comparerCles(cle, best.cle) < 0) best = { trio: t, emp, ...cand, ...coh, cle }
  }
  return best
}

/* ─────────────────────────────────────────────────── verdict ──────────── */

/**
 * Le verdict pour une course : son meilleur trio, avec l'empreinte, le
 * niveau, le support, la cohérence et le profil historique du groupe
 * (médianes + paires habituelles). Aucun seuil, aucun FORTE : le
 * classement parle, on ne coupe pas.
 */
export function verdict(partants, db) {
  const index = db?.index || db
  if (!index || !index.full) return { trio: null, raison: 'index introuvable' }
  /* ⚠ D'abord les cotes : sans 3 cotes valides il n'y a pas de trio à
   *   tester — ce n'est pas « aucun antécédent », c'est « pas de cotes »
   *   (le matin, reu.php ne les publie pas encore). */
  if (!trioCandidat(partants)) return { trio: null, raison: 'pas assez de cotes' }
  const best = meilleurTrio(partants, index)
  if (!best) return { trio: null, raison: 'aucun antécédent' }
  const r = best.resume
  return {
    trio: best.trio,
    empreinte: best.cleArchive,
    empreinteJour: best.emp.full,
    niveau: best.level,
    support: best.support,
    coherence: { rankDev: best.rankDev, profDev: best.profDev, relFreq: best.relFreq },
    profil: {
      medRangs: r.medRangs,
      medCote: r.medCote,
      paires: ['P1-P2', 'P1-P3', 'P2-P3'].map((k) => ({
        paire: k,
        habituelle: r.paires[k][0] ? r.paires[k][0].fam_pair + ' (' + r.paires[k][0].pct + '%)' : '—',
      })),
    },
  }
}

/* Le trio candidat simple (top-3 cote) : utile comme référence, jamais
 * comme décision. Le moteur ne l'impose à rien. */
export function trioCandidat(partants) {
  const ps = (partants || [])
    .map((p) => ({ num: p.num, v: coteDe(p) }))
    .filter((x) => coteValide(x.v))
    .sort((a, b) => a.v - b.v)
  if (ps.length < 3) return null
  return [ps[0].num, ps[1].num, ps[2].num]
}
