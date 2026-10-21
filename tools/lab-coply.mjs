/* =============================================================================
 * tools/lab-coply.mjs — LA MESURE DU COUPLÉ, DÉFINITION UTILISATEUR (16/10/2026).
 *
 * L'utilisateur a posé la définition :
 *     « الكوبلي الفائز هو اما الاول والتاني او الاول والتالت او التاني والتالت »
 *     → le couplé gagnant est (1er,2e) OU (1er,3e) OU (2e,3e).
 * C'est donc : DEUX des trois premiers. Pour un jeu de 3 chevaux, ça veut dire
 *     |picks ∩ {1er,2e,3e}| ≥ 2   (les 3 paires du trio).
 * C'est PLUS LARGE que la métrique dont l'artefact actuel a été construit
 * (`picks ⊇ {1er,2e}` — tools/build-contextual.mjs), qui ne compte que la
 * paire 1-2 et ignore 1-3 / 2-3.
 *
 * Causal strict : table de paires construite sur le PASSÉ seul (date < test).
 * Usage : node tools/lab-coply.mjs [N=200]
 * Lecture seule — n'écrit rien.
 * ============================================================================= */

import { charger } from './empreinte-couple.mjs'
import fs from 'node:fs'

const N = Math.max(1, Number(process.argv[2]) || 200)

/* ───────────────────────────── les outils de rang ───────────────────────── */

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

/** Cote de marché, trous = médiane (neutre) — jamais 999. */
function cotesNeutres(partants) {
  const c = partants.map((p) => Number(p.cote_pmu)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
  if (!c.length) return new Map()
  const m = c.length >> 1
  const med = c.length % 2 ? c[m] : (c[m - 1] + c[m]) / 2
  return new Map(partants.map((p) => {
    const n = Number(p.cote_pmu)
    return [p.num, Number.isFinite(n) && n > 0 ? n : med]
  }))
}

function rangs(course) {
  const cot = cotesNeutres(course.partants)
  const ordre = course.partants.slice().sort((a, b) => (cot.get(a.num) - cot.get(b.num)) || (a.num - b.num))
  return {
    cote: cot,
    ordre: ordre.map((p) => p.num),
    parNum: new Map(ordre.map((p, i) => [p.num, i + 1])),
    parRang: new Map(ordre.map((p, i) => [i + 1, p.num])),
  }
}
const mediane = (ns) => { const s = ns.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

/* ───────────────────────────── les stratégies ───────────────────────────── */
/* Chaque stratégie rend 3 numéros (ou moins → ignorée). */

/* Les alias d'hippodrome de contextual-selection.js (le navigateur les
 * applique avant de lire l'artefact : on doit faire pareil pour le juger). */
const ALIASES = {
  BORELY: 'BORDEAUX_LE_BOUSCAT', VINCENNES: 'PARIS_VINCENNES', ENGHIEN: 'ENGHIEN',
  CHANTILLY: 'CHANTILLY', DEAUVILLE: 'DEAUVILLE', PAU: 'PAU', TOULOUSE: 'TOULOUSE',
  AUTEUIL: 'AUTEUIL', CAGNES_SUR_MER: 'CAGNES_SUR_MER', MARSEILLE_VIVAUX: 'MARSEILLE_VIVAUX',
  LVAL: 'LAVAL', LE_CROISE_LAROCHE: 'LE_CROISE_LAROCHE', SAINT_CLOUD: 'SAINT_CLOUD',
  LONGCHAMP: 'PARIS_LONGCHAMP', COMPIGNE: 'COMPIEGNE', FONTAINEBLEAU: 'FONTAINEBLEAU',
  VALPARAISO: 'VALPARAISO', SON_PARDO: 'SON_PARDO', WOLVEGA: 'WOLVEGA', MONS: 'MONS',
  LYON_LA_SOIE: 'LYON_LA_SOIE', LYON_PARILLY: 'LYON_LA_SOIE',
}

let artifactPage = null
try { artifactPage = JSON.parse(fs.readFileSync('public/data/contextual-selection.json', 'utf8')) } catch { /* pas d'artefact */ }

const strategies = {
  /** ① les 3 plus petites cotes (la référence). */
  'marche-3': (c, ctx) => ctx.r.ordre.slice(0, 3),

  /** ② 2 du marché + le meilleur forme restant. */
  '2m+1f': (c, ctx) => {
    const t = ctx.r.ordre.slice(0, 2)
    const reste = c.partants.filter((p) => !t.includes(p.num))
      .map((p) => ({ num: p.num, f: formeScore(p.musique) }))
      .sort((a, b) => b.f - a.f || ctx.r.parNum.get(a.num) - ctx.r.parNum.get(b.num))
    return [...t, reste[0]?.num].filter((x) => x != null)
  },

  /** ③ 1 du marché + 2 formes. */
  '1m+2f': (c, ctx) => {
    const t = ctx.r.ordre.slice(0, 1)
    const reste = c.partants.filter((p) => !t.includes(p.num))
      .map((p) => ({ num: p.num, f: formeScore(p.musique) }))
      .sort((a, b) => b.f - a.f || ctx.r.parNum.get(a.num) - ctx.r.parNum.get(b.num))
    return [...t, ...reste.slice(0, 2).map((x) => x.num)]
  },

  /** ④ le favori 1 écarté (2e,3e,4e du marché). */
  'kill-fav1': (c, ctx) => ctx.r.ordre.slice(1, 4),

  /** ⑤ le favori 2 écarté (1er,3e,4e). */
  'kill-fav2': (c, ctx) => [ctx.r.ordre[0], ctx.r.ordre[2], ctx.r.ordre[3]].filter((x) => x != null),

  /** ⑥ (forme × valeur) / cote — l'ancien inverse-score. */
  'inverse-score': (c, ctx) => {
    const vals = c.partants.map((p) => Number(p.valeur)).filter((n) => Number.isFinite(n) && n > 0)
    const mv = mediane(vals)
    const mf = mediane(c.partants.map((p) => formeScore(p.musique)).filter((n) => n > 0))
    if (mv == null || mf == null) return ctx.r.ordre.slice(0, 3)
    return c.partants.map((p) => {
      const f = formeScore(p.musique) || mf
      const v = Number(p.valeur) > 0 ? Number(p.valeur) : mv
      return { num: p.num, s: (f * v) / ctx.r.cote.get(p.num) }
    }).sort((a, b) => b.s - a.s || a.num - b.num).slice(0, 3).map((x) => x.num)
  },

  /** ⑦ LES PAIRES DU PASSÉ : le trio dont les 3 paires ont le meilleur taux. */
  'paires-passe': (c, ctx) => {
    const cap = Math.min(ctx.r.ordre.length, 8)
    const idx = ctx.r.ordre.slice(0, cap)
    const t = ctx.paires   // Map "r1-r2" -> {s,w}
    const taux = (a, b) => {
      const k = a < b ? a + '-' + b : b + '-' + a
      const e = t.get(k)
      return e ? (e.w + 1) / (e.s + 2) : 0
    }
    let best = null
    for (let i = 0; i < idx.length; i++) for (let j = i + 1; j < idx.length; j++) for (let k = j + 1; k < idx.length; k++) {
      const s = taux(i + 1, j + 1) + taux(i + 1, k + 1) + taux(j + 1, k + 1)
      if (!best || s > best.s) best = { s, trio: [idx[i], idx[j], idx[k]] }
    }
    return best ? best.trio : ctx.r.ordre.slice(0, 3)
  },

  /** ⑦bis form-3 et killer-combo (règles de l'artefact, pour pouvoir la rejouer). */
  'form-3': (c, ctx) => c.partants.slice()
    .sort((a, b) => formeScore(b.musique) - formeScore(a.musique) || a.num - b.num).slice(0, 3).map((p) => p.num),
  'killer-combo': (c, ctx) => {
    const fav1 = ctx.r.ordre[0]
    const vals = c.partants.map((p) => Number(p.valeur)).filter((n) => Number.isFinite(n) && n > 0)
    const mv = mediane(vals) ?? 0
    const mf = mediane(c.partants.map((p) => formeScore(p.musique)).filter((n) => n > 0)) ?? 0
    const reste = c.partants.filter((p) => p.num !== fav1)
      .map((p) => ({ num: p.num, s: ((formeScore(p.musique) || mf) * (Number(p.valeur) > 0 ? Number(p.valeur) : mv)) / ctx.r.cote.get(p.num) }))
      .sort((a, b) => b.s - a.s || a.num - b.num)
    return [fav1, ...reste.slice(0, 2).map((x) => x.num)]
  },

  /** ⑨ L'ARTEFACT ACTUEL DE LA PAGE — contextual-selection.json, appliqué
   *  exactement comme le navigateur (contexte = hippodrome|bucket de distance,
   *  fail-intersect → inverse-score : le navigateur n'a pas d'archive). */
  'artefact-page': (c, ctx) => {
    const art = ctx.artifact
    const repli = () => strategies['marche-3'](c, ctx)
    if (!art || !art.rules) return repli()
    const hippo = (c.hippodrome || 'UNK').toUpperCase().replace(/\s+/g, '_')
    const dist = c.distance || 0
    const bucket = dist <= 1200 ? 'S' : dist <= 1800 ? 'M' : dist <= 2500 ? 'L' : 'XL'
    const cle = (ALIASES[hippo] || hippo) + '|' + bucket
    const nom = (art.rules[cle] && art.rules[cle].rule) || art.globalBest || 'market-3'
    const fn = ART_RULES[nom]
    return fn ? fn(c, ctx) : repli()
  },

  /** ⑩ LE CONTEXTE, SANS FUITE : pour chaque course, la meilleure règle du
   *  contexte (hippodrome|bucket) est choisie sur le PASSÉ seul (n ≥ 30),
   *  sinon la meilleure règle globale du passé. Si ceci ne bat pas marche-3,
   *  c'est que le découpage par contexte n'apporte rien — mesure, pas avis. */
  'contexte-causal': (c, ctx) => {
    const hippo = (c.hippodrome || 'UNK').toUpperCase().replace(/\s+/g, '_')
    const dist = c.distance || 0
    const bucket = dist <= 1200 ? 'S' : dist <= 1800 ? 'M' : dist <= 2500 ? 'L' : 'XL'
    const cle = hippo + '|' + bucket
    const st = ctx.ctxStats.get(cle)
    let nom = ctx.globalBest
    if (st) {
      let best = null
      for (const [k, e] of st) if (e.s >= 30 && (!best || e.w / e.s > best.t)) best = { k, t: e.w / e.s }
      if (best) nom = best.k
    }
    const fn = ART_RULES[nom]
    if (fn) return fn(c, ctx)
    return strategies['marche-3'](c, ctx)
  },

  /** ⑧ LES PAIRES + le rang 1 forcé (le 1er du marché est-il vraiment le meilleur anchor ?). */
  'paires-anchor1': (c, ctx) => {
    const cap = Math.min(ctx.r.ordre.length, 8)
    const t = ctx.paires
    const taux = (a, b) => { const k = a < b ? a + '-' + b : b + '-' + a; const e = t.get(k); return e ? (e.w + 1) / (e.s + 2) : 0 }
    let best = null
    for (let j = 1; j < cap; j++) for (let k = j + 1; k < cap; k++) {
      const s = taux(1, j + 1) + taux(1, k + 1) + taux(j + 1, k + 1)
      if (!best || s > best.s) best = { s, trio: [ctx.r.ordre[0], ctx.r.ordre[j], ctx.r.ordre[k]] }
    }
    return best ? best.trio : ctx.r.ordre.slice(0, 3)
  },

  /** ⑪ LES PAIRES CONDITIONNÉES À LA TAILLE DU PELOTON (table du passé,
   *  bucket ≤10 / 11-13 / ≥14) : le trio optimal n'est pas toujours 1-2-3
   *  dans un petit peloton — c'est là que le moteur peut gagner. */
  'paires-taille': (c, ctx) => {
    const cap = Math.min(ctx.r.ordre.length, 8)
    const idx = ctx.r.ordre.slice(0, cap)
    const t = ctx.pairesTaille
    const bt = bucketTaille(ctx.r.ordre.length)
    const taux = (a, b) => {
      const k = bt + '|' + (a < b ? a + '-' + b : b + '-' + a)
      const e = t.get(k)
      return e ? (e.w + 1) / (e.s + 2) : 0
    }
    let best = null
    for (let i = 0; i < idx.length; i++) for (let j = i + 1; j < idx.length; j++) for (let k = j + 1; k < idx.length; k++) {
      const s = taux(i + 1, j + 1) + taux(i + 1, k + 1) + taux(j + 1, k + 1)
      if (!best || s > best.s) best = { s, trio: [idx[i], idx[j], idx[k]] }
    }
    return best ? best.trio : ctx.r.ordre.slice(0, 3)
  },

  /** ⑫ LES PAIRES CONDITIONNÉES À LA DISCIPLINE (trot / plat / haies / autre). */
  'paires-discipline': (c, ctx) => {
    const cap = Math.min(ctx.r.ordre.length, 8)
    const idx = ctx.r.ordre.slice(0, cap)
    const t = ctx.pairesDisc
    const bd = bucketDisc(c.discipline)
    const taux = (a, b) => {
      const k = bd + '|' + (a < b ? a + '-' + b : b + '-' + a)
      const e = t.get(k)
      return e ? (e.w + 1) / (e.s + 2) : 0
    }
    let best = null
    for (let i = 0; i < idx.length; i++) for (let j = i + 1; j < idx.length; j++) for (let k = j + 1; k < idx.length; k++) {
      const s = taux(i + 1, j + 1) + taux(i + 1, k + 1) + taux(j + 1, k + 1)
      if (!best || s > best.s) best = { s, trio: [idx[i], idx[j], idx[k]] }
    }
    return best ? best.trio : ctx.r.ordre.slice(0, 3)
  },
}

/* Les noms de règles de l'artefact → les fonctions ci-dessus.
 * `fail-intersect` n'existe pas dans le navigateur (pas d'archive) : il y
 * retombe sur inverse-score — c'est ce que fait selection-fail-intersect.js. */
const ART_RULES = {
  'market-3': strategies['marche-3'],
  'form-3': strategies['form-3'],
  '2m+1f': strategies['2m+1f'],
  '1m+2f': strategies['1m+2f'],
  'killer-combo': strategies['killer-combo'],
  'fail-intersect': strategies['inverse-score'],
  'kill-fav2': strategies['kill-fav2'],
  'inverse-score': strategies['inverse-score'],
  'kill-fav1': strategies['kill-fav1'],
}

/* ───────────────────────────── le test causal ───────────────────────────── */

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const tests = tout.slice(-Math.min(N, tout.length))
const sansCote = tout.filter((c) => !c.partants.some((p) => Number.isFinite(Number(p.cote_pmu)) && Number(p.cote_pmu) > 0)).length
console.log('corpus : ' + tout.length + ' courses (' + tout[0].date + ' → ' + tout[tout.length - 1].date + '), sans cote : ' + sansCote)
console.log('test   : ' + tests.length + ' (' + tests[0].date + ' → ' + tests[tests.length - 1].date + ')')

const R = {}
for (const k of Object.keys(strategies)) R[k] = { n: 0, deux: 0, p12: 0, c1: 0, c2: 0, c3: 0, exact: 0 }

/** table des paires de rangs de marché (construite sur le PASSÉ seul). */
const paires = new Map()
/* …et deux tables CONDITIONNÉES : taille du peloton, discipline. C'est là
 * (et seulement là) que le trio optimal peut s'écarter de 1-2-3. */
const pairesTaille = new Map()
const pairesDisc = new Map()
const bucketTaille = (n) => (n <= 10 ? 'S' : n <= 13 ? 'M' : 'L')
const bucketDisc = (d) => (d === 'ATTELE' ? 'TROT' : d === 'PLAT' ? 'PLAT'
  : ['HAIES', 'STEEPLE', 'STEEPLECHASE', 'HAIE', 'CROSS'].includes(d) ? 'OBST' : 'AUTRE')
const nourrirPaires = (c) => {
  const r = rangs(c)
  const top3 = new Set((c.arrivee || []).slice(0, 3))
  const n = Math.min(r.ordre.length, 8)
  const bt = bucketTaille(r.ordre.length), bd = bucketDisc(c.discipline)
  for (let a = 1; a <= n; a++) for (let b = a + 1; b <= n; b++) {
    const k = a + '-' + b
    const e = paires.get(k) || { s: 0, w: 0 }
    e.s++
    if (top3.has(r.parRang.get(a)) && top3.has(r.parRang.get(b))) e.w++
    paires.set(k, e)
    const kT = bt + '|' + k
    const eT = pairesTaille.get(kT) || { s: 0, w: 0 }
    eT.s++
    if (top3.has(r.parRang.get(a)) && top3.has(r.parRang.get(b))) eT.w++
    pairesTaille.set(kT, eT)
    const kD = bd + '|' + k
    const eD = pairesDisc.get(kD) || { s: 0, w: 0 }
    eD.s++
    if (top3.has(r.parRang.get(a)) && top3.has(r.parRang.get(b))) eD.w++
    pairesDisc.set(kD, eD)
  }
}

/* le passé avant la 1re course testée */
for (const c of tout) {
  if (c.date >= tests[0].date) break
  nourrirPaires(c)
}

const hasard = { n: 0, deux: 0 }

/* ② les JEUX DE PAIRES — la définition utilisateur, jouée directement :
 *   une paire gagne si ses DEUX chevaux sont dans le top3 (1-2, 1-3, 2-3…).
 *   Le coût = le nombre de paires jouées. */
const JEUX = {
  '3 paires · 3 ch (1-2,1-3,2-3)': { ch: 3, paires: [[1, 2], [1, 3], [2, 3]] },
  '2 paires · 3 ch (1-2,1-3)': { ch: 3, paires: [[1, 2], [1, 3]] },
  '2 paires · 3 ch (1-2,2-3)': { ch: 3, paires: [[1, 2], [2, 3]] },
  '3 paires · 4 ch (1-2,1-3,1-4)': { ch: 4, paires: [[1, 2], [1, 3], [1, 4]] },
  '4 paires · 4 ch (1-2,1-3,1-4,2-3)': { ch: 4, paires: [[1, 2], [1, 3], [1, 4], [2, 3]] },
  '6 paires · 4 ch (toutes)': { ch: 4, paires: [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]] },
  '4 paires · 5 ch (1-2,1-3,1-4,1-5)': { ch: 5, paires: [[1, 2], [1, 3], [1, 4], [1, 5]] },
  '10 paires · 5 ch (toutes)': { ch: 5, paires: [[1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5], [3, 4], [3, 5], [4, 5]] },
  '15 paires · 6 ch (toutes)': { ch: 6, paires: [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [2, 3], [2, 4], [2, 5], [2, 6], [3, 4], [3, 5], [3, 6], [4, 5], [4, 6], [5, 6]] },
}
const RJ = {}
for (const k of Object.keys(JEUX)) RJ[k] = { n: 0, win: 0 }

/* ── le contexte SANS FUITE : stats par (contexte × règle) sur le passé seul ── */
const ctxStats = new Map()          // cle -> Map(regle -> {s,w})
const globStats = new Map()         // regle -> {s,w}
const cleCtx = (c) => {
  const hippo = (c.hippodrome || 'UNK').toUpperCase().replace(/\s+/g, '_')
  const dist = c.distance || 0
  const bucket = dist <= 1200 ? 'S' : dist <= 1800 ? 'M' : dist <= 2500 ? 'L' : 'XL'
  return hippo + '|' + bucket
}
const majContexte = (course, r) => {
  const cle = cleCtx(course)
  let st = ctxStats.get(cle)
  if (!st) { st = new Map(); ctxStats.set(cle, st) }
  for (const [nom, fn] of Object.entries(ART_RULES)) {
    const picks = (fn(course, { r, paires }) || []).filter(Number.isFinite).slice(0, 3)
    if (picks.length < 3) continue
    const S = new Set(picks)
    const w = (course.arrivee.slice(0, 3).filter((x) => S.has(x)).length >= 2) ? 1 : 0
    const e = st.get(nom) || { s: 0, w: 0 }; e.s++; e.w += w; st.set(nom, e)
    const g = globStats.get(nom) || { s: 0, w: 0 }; g.s++; g.w += w; globStats.set(nom, g)
  }
}
const meilleurGlobal = () => {
  let best = null
  for (const [k, e] of globStats) if (e.s >= 30 && (!best || e.w / e.s > best.t)) best = { k, t: e.w / e.s }
  return best ? best.k : 'marche-3'
}

tests.forEach((course, i) => {
  const r = rangs(course)
  const a = course.arrivee.slice(0, 3)
  const top3 = new Set(a)
  const ctx = { r, paires, pairesTaille, pairesDisc, artifact: artifactPage, ctxStats, globalBest: meilleurGlobal() }
  for (const [nom, fn] of Object.entries(strategies)) {
    const picks = (fn(course, ctx) || []).filter(Number.isFinite)
    if (picks.length < 3) continue
    const S = new Set(picks.slice(0, 3))
    const nb = a.filter((x) => S.has(x)).length
    const m = R[nom]
    m.n++
    if (nb >= 2) m.deux++
    if (S.has(a[0]) && S.has(a[1])) m.p12++
    if (S.has(a[0])) m.c1++
    if (S.has(a[1])) m.c2++
    if (S.has(a[2])) m.c3++
    if (nb === 3) m.exact++
  }
  /* le hasard : la même espérance sur la même course, moyenne des tirages */
  {
    const n = course.partants.length
    hasard.n++
    hasard.deux += (3 * (n - 3) + 1) / (n * (n - 1) * (n - 2) / 6)
  }
  nourrirPaires(course)
  majContexte(course, r)
  /* ② les JEUX DE PAIRES : même définition (une paire gagne si ses deux
   *  chevaux sont dans le top3), mais on joue des paires choisies, pas un
   *  trio. Le coût = le nombre de paires jouées. */
  for (const [nom, jeu] of Object.entries(JEUX)) {
    const m = RJ[nom]
    m.n++
    const rangs = new Set(jeu.paires.flat())
    const chevaux = [...rangs].map((rg) => r.parRang.get(rg)).filter((x) => x != null)
    if (chevaux.length < jeu.ch) continue
    const gagne = jeu.paires.some(([x, y]) => top3.has(r.parRang.get(x)) && top3.has(r.parRang.get(y)))
    if (gagne) m.win++
  }
  if ((i + 1) % 50 === 0) console.log('  … ' + (i + 1) + '/' + tests.length)
})

const pc = (x, n) => (x / Math.max(1, n) * 100).toFixed(2) + '%'
console.log('')
console.log('══ ' + tests.length + ' courses — définition utilisateur : ≥2 des 3 dans le top3 ══')
console.log('   stratégie        ≥2/3      (1-2)     1er      2e       3e     exact')
for (const [nom, m] of Object.entries(R)) {
  console.log('   ' + nom.padEnd(15) + pc(m.deux, m.n).padStart(8) + '  ' + pc(m.p12, m.n).padStart(8)
    + '  ' + pc(m.c1, m.n).padStart(7) + '  ' + pc(m.c2, m.n).padStart(7) + '  ' + pc(m.c3, m.n).padStart(7) + '  ' + pc(m.exact, m.n).padStart(7))
}
console.log('   ' + 'hasard'.padEnd(15) + pc(hasard.deux, hasard.n).padStart(8))
console.log('')
console.log('══ les JEUX DE PAIRES (une paire gagne si ses 2 chevaux sont dans le top3) ══')
console.log('   jeu'.padEnd(34) + 'taux'.padStart(8) + '   paires')
for (const [nom, m] of Object.entries(RJ)) {
  console.log('   ' + nom.padEnd(34) + pc(m.win, m.n).padStart(8) + '   ' + JEUX[nom].paires.length)
}
console.log('')
