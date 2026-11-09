/* =============================================================================
 * src/lib/probabilite.js — LE MOTEUR DE PROBABILITÉ (09/11/2026)
 *
 * ⛔ MODULE INDÉPENDANT : il ne lit que les RÉSULTATS RÉELS de l'archive
 *    (les arrivées) et en extrait des probabilités. `src/lib/quinte.js` et
 *    sa copie backend ne sont jamais importés ni modifiés.
 *
 * ─── CE QUE CALCULE LE MODULE ────────────────────────────────────────────────
 *   A. Marginales par case P (P1..P20)
 *        n_top5, victoires, podiums, répartition 1er→5e
 *        P(top5 | N) brut            = n_top5 / N
 *        P(top5) postérieur          = (n + m·base) / (N + m)   (base = 5/20)
 *        P(position k | top5)        = pos[k] / n_top5
 *        P(position k | top5) post.  = (pos[k] + 1) / (n_top5 + 5)  (Dirichlet)
 *   B. Paires : P(Pa ∩ Pb), P(Pb | Pa) brut et postérieur
 *   C. Triples : P(Pa ∩ Pb ∩ Pc) brut et postérieur
 *   D. Conditionnelles : P(Pc | Pa, Pb) et P(Pd | Pa, Pb, Pc)
 *   E. Contexte : Bayes par discipline / tranche de distance / taille de champ
 *        postérieur = (n_ctx + m·p_global) / (N_ctx + m)         (m = 10)
 *   F. Combinaisons du Quinté (les 5 cases, en tant qu'ENSEMBLE, pas en ordre)
 *   G. Backtest LOO : ce que couvre un top-N classé par probabilité, comparé
 *      au hasard uniforme sur 20 cases.
 *
 * ─── HONNÊTETÉ ───────────────────────────────────────────────────────────────
 *   Chaque probabilité est une FRÉQUENCE observée, lissée par un prior explicite
 *   (Beta / Dirichlet). Rien n'est inventé, rien n'est extrapolé. N et la force
 *   du prior sont toujours exposés. Les cellules à 1 ou 2 restent du bruit :
 *   la page le dit, le module ne le cache pas.
 *
 *   `node tools\probabilite.mjs` écrit data/probabilite.json + public/data/…
 * ========================================================================== */

export const MAXP = 20
export const ALPHA = 1                 // Dirichlet des 5 positions
export const MARGIN = 10               // force du prior, en pseudo-courses
export const MARGIN_COND = 5           // force du prior des conditionnelles
export const BASE_TOP5 = 5 / MAXP      // 0.25 : taux de base d'une case sur 20
export const BASE_RANG = 1 / 5         // 0.20 : taux de base d'une position
export const BASE_PAIRE = 10 / 190     // C(5,2)/C(20,2)
export const BASE_TRIPLE = 10 / 1140   // C(5,3)/C(20,3)
export const BASE_PODIUM = 3 / MAXP    // 0.15 : taux de base d'un podium sur 20 cases
export const BASE_VICTOIRE = 1 / MAXP  // 0.05 : taux de base d'une victoire

/* ─────────────────────────────────────────────────────── lissage bayésien ── */

/** Beta-binomial : (n + m·base) / (N + m). */
export function posterior(n, N, m = MARGIN, base = BASE_TOP5) {
  return (n + m * base) / (N + m)
}

/** Dirichlet(α) sur les 5 positions : (pos[k] + α) / (n_top5 + 5α). */
export function posteriorRangs(pos, nTop5, alpha = ALPHA) {
  const tot = nTop5 + 5 * alpha
  return pos.map((v) => (v + alpha) / tot)
}

/** Conditionnelle lissée vers le taux marginal : (count + m·base)/(den + m). */
export function posteriorCond(count, den, base, m = MARGIN_COND) {
  return (count + m * base) / (den + m)
}

/** Compatibilité avec l'ancienne API (Laplace simple). */
export function bayesSmooth(count, N, k, alpha = ALPHA) {
  if (!N) return 0
  return (count + alpha) / (N + alpha * k)
}

/* ───────────────────────────────────────────────────────── normalisation ── */

export function normDiscipline(d) {
  const s = String(d || '').toLowerCase()
  if (!s) return 'Inconnue'
  if (s.includes('plat')) return 'Plat'
  if (s.includes('attel')) return 'Attelé'
  if (s.includes('mont')) return 'Monté'
  if (s.includes('haie')) return 'Haies'
  if (s.includes('steeple')) return 'Steeple'
  if (s.includes('cross')) return 'Cross'
  return 'Autre'
}

export function bandeDistance(d) {
  const v = Number(d)
  if (!Number.isFinite(v) || v <= 0) return 'inconnue'
  if (v <= 1500) return '≤1500 m'
  if (v <= 2000) return '1600–2000 m'
  if (v <= 2500) return '2100–2500 m'
  if (v <= 3000) return '2600–3000 m'
  if (v <= 4000) return '3100–4000 m'
  return '4100 m +'
}

export function bandePartants(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return 'inconnu'
  if (v <= 13) return '≤13'
  if (v <= 15) return '14–15'
  if (v <= 17) return '16–17'
  return '18+'
}

/* ─────────────────────────────────────────────────────────── comptage brut ── */

/** Les cases P des 5 premiers, dans l'ordre d'arrivée (celles qui existent). */
function slotsDe(course) {
  const sp = course?.grille?.slotParNum || {}
  return (course?.arr || []).slice(0, 5)
    .map((n) => sp[n])
    .filter((p) => Number.isFinite(p) && p >= 1 && p <= MAXP)
}

/** Toutes les combinaisons de k éléments (indices croissants). */
function pourCombos(arr, k, fn) {
  const acc = []
  const rec = (start) => {
    if (acc.length === k) { fn(acc.slice()); return }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1); acc.pop() }
  }
  rec(0)
}

const cleCombo = (arr) => arr.slice().sort((x, y) => x - y).join('-')

/** Compte marginales + co-occurrences sur une liste de courses. */
function compter(list) {
  const N = list.length
  const parP = Array.from({ length: MAXP + 1 }, (_, p) => ({ p, n: 0, pos: [0, 0, 0, 0, 0], vic: 0, pod: 0 }))
  const pairs = Array.from({ length: MAXP + 1 }, () => Array(MAXP + 1).fill(0))
  const triples = new Map()
  const quads = new Map()
  const quints = new Map()

  for (const c of list) {
    const s = slotsDe(c)
    if (!s.length) continue
    s.forEach((p, i) => {
      const d = parP[p]
      d.n++
      if (i < 5) d.pos[i]++
      if (i === 0) d.vic++
      if (i <= 2) d.pod++
    })
    const uniq = [...new Set(s)]
    pourCombos(uniq, 2, ([a, b]) => { pairs[a][b]++; pairs[b][a]++ })
    pourCombos(uniq, 3, (t) => { const k = cleCombo(t); triples.set(k, (triples.get(k) || 0) + 1) })
    pourCombos(uniq, 4, (t) => { const k = cleCombo(t); quads.set(k, (quads.get(k) || 0) + 1) })
    pourCombos(uniq, 5, (t) => { const k = cleCombo(t); quints.set(k, (quints.get(k) || 0) + 1) })
  }
  return { N, parP, pairs, triples, quads, quints }
}

/** Probabilité d'au moins un élément dans une liste, mesurée sur des slots. */
function auMoinsUn(list, minSlot) {
  let n = 0
  for (const c of list) {
    if (slotsDe(c).some((p) => p >= minSlot)) n++
  }
  return n
}

/* ──────────────────────────────────────────────────────── le constructeur ── */

/**
 * Construit la matrice DNA P1-P20 à partir de courses réelles.
 *
 * @param {Array} courses chaque élément :
 *   { date?, discipline?, distance?, nbPartants?, grille, arr }
 *   `grille` = retour de buildGrid (doit porter slotParNum)
 *   `arr`    = arrivée réelle (au moins les 5 premiers)
 */
export function construireMatrix(courses) {
  const list = (Array.isArray(courses) ? courses : []).filter(
    (c) => c && c.grille && Array.isArray(c.arr) && c.arr.length >= 3
  )
  const N = list.length
  const C = compter(list)

  /* ── A. marginales ─────────────────────────────────────────────────────── */
  const singles = []
  for (let p = 1; p <= MAXP; p++) {
    const d = C.parP[p]
    const p_top5 = N ? d.n / N : 0
    const rang = posteriorRangs(d.pos, d.n)
    singles.push({
      p,
      n_top5: d.n,
      victoires: d.vic,
      podiums: d.pod,
      p_top5,
      p_top5_post: posterior(d.n, N),
      p_top5_smooth: posterior(d.n, N),           // compat
      p_podium_post: posterior(d.pod, N, MARGIN, BASE_PODIUM),
      p_victoire_post: posterior(d.vic, N, MARGIN, BASE_VICTOIRE),
      p_victoire: N ? d.vic / N : 0,              // global (dénominateur N)
      p_podium: N ? d.pod / N : 0,                // global (dénominateur N)
      pos: d.pos.slice(),
      p_1er: d.n ? d.pos[0] / d.n : 0,            // conditionnel (dénominateur n_top5)
      p_2e: d.n ? d.pos[1] / d.n : 0,
      p_3e: d.n ? d.pos[2] / d.n : 0,
      p_4e: d.n ? d.pos[3] / d.n : 0,
      p_5e: d.n ? d.pos[4] / d.n : 0,
      rang_post: rang,                            // [1er..5e] postérieur Dirichlet
    })
  }
  const globalPost = singles.map((s) => s.p_top5_post)

  /* ── B. paires ─────────────────────────────────────────────────────────── */
  const pairList = []
  for (let a = 1; a <= MAXP; a++) {
    for (let b = a + 1; b <= MAXP; b++) {
      const cnt = C.pairs[a][b]
      if (!cnt) continue
      const na = C.parP[a].n
      const nb = C.parP[b].n
      pairList.push({
        a, b, count: cnt,
        p_both: N ? cnt / N : 0,
        p_both_post: posterior(cnt, N, MARGIN, BASE_PAIRE),
        p_b_given_a: na ? cnt / na : 0,
        p_a_given_b: nb ? cnt / nb : 0,
        p_b_given_a_post: posteriorCond(cnt, na, singles[b - 1].p_top5),
        p_a_given_b_post: posteriorCond(cnt, nb, singles[a - 1].p_top5),
      })
    }
  }
  pairList.sort((x, y) => y.count - x.count || x.a - y.a)

  /* ── C. triples ────────────────────────────────────────────────────────── */
  const tripleList = [...C.triples.entries()]
    .map(([k, v]) => {
      const combo = k.split('-').map(Number)
      return {
        combo, count: v,
        p: N ? v / N : 0,
        p_post: posterior(v, N, MARGIN, BASE_TRIPLE),
      }
    })
    .sort((x, y) => y.count - x.count || cleCombo(x.combo).localeCompare(cleCombo(y.combo)))

  /* ── D. conditionnelles ────────────────────────────────────────────────── */
  // D1. P(c | a, b)
  const cond2 = []
  for (const pr of pairList) {
    if (pr.count < 3) continue
    const top = []
    for (let c = 1; c <= MAXP; c++) {
      if (c === pr.a || c === pr.b) continue
      const cnt = C.triples.get(cleCombo([pr.a, pr.b, c])) || 0
      if (!cnt) continue
      top.push({
        c, count: cnt,
        p: cnt / pr.count,
        p_post: posteriorCond(cnt, pr.count, singles[c - 1].p_top5),
      })
    }
    top.sort((x, y) => y.p - x.p || x.c - y.c)
    if (top.length) cond2.push({ a: pr.a, b: pr.b, den: pr.count, top: top.slice(0, 6) })
  }
  cond2.sort((x, y) => y.den - x.den)

  // D2. P(d | a, b, c)
  const cond3 = []
  for (const tr of tripleList) {
    if (tr.count < 2) continue
    const [a, b, c] = tr.combo
    const top = []
    for (let d = 1; d <= MAXP; d++) {
      if (d === a || d === b || d === c) continue
      const cnt = C.quads.get(cleCombo([a, b, c, d])) || 0
      if (!cnt) continue
      top.push({ d, count: cnt, p: cnt / tr.count, p_post: posteriorCond(cnt, tr.count, singles[d - 1].p_top5) })
    }
    top.sort((x, y) => y.p - x.p || x.d - y.d)
    if (top.length) cond3.push({ combo: tr.combo, den: tr.count, top: top.slice(0, 6) })
  }
  cond3.sort((x, y) => y.den - x.den)

  // D3. les conditionnelles demandées, isolées pour la page
  const exemples = [
    { cible: 3, condition: [1, 2] },
    { cible: 5, condition: [1, 3] },
    { cible: 8, condition: [1, 2, 3] },
    { cible: 5, condition: [1] },
    { cible: 4, condition: [1] },
    { cible: 10, condition: [1] },
  ].map((ex) => {
    const [a, b, c] = ex.condition
    const den = ex.condition.length === 1
      ? C.parP[a].n
      : ex.condition.length === 2
        ? (C.pairs[Math.min(a, b)][Math.max(a, b)] || 0)
        : (C.triples.get(cleCombo([a, b, c])) || 0)
    const cnt = ex.condition.length === 1
      ? (C.pairs[Math.min(a, ex.cible)][Math.max(a, ex.cible)] || 0)
      : ex.condition.length === 2
        ? (C.triples.get(cleCombo([...ex.condition, ex.cible])) || 0)
        : (C.quads.get(cleCombo([...ex.condition, ex.cible])) || 0)
    return {
      ...ex,
      den, count: cnt,
      p: den ? cnt / den : null,
      p_post: den ? posteriorCond(cnt, den, singles[ex.cible - 1].p_top5) : null,
      base: singles[ex.cible - 1].p_top5,
    }
  })

  /* ── E. contexte (Bayes hiérarchique) ──────────────────────────────────── */
  const curseur = (c) => ({
    disc: normDiscipline(c.discipline),
    dist: bandeDistance(c.distance),
    part: bandePartants(c.nbPartants || (c.grille && c.grille.max) || 0),
  })

  const groupePar = (cleFn) => {
    const map = new Map()
    for (const c of list) {
      const k = cleFn(curseur(c))
      if (k == null || k === '') continue
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(c)
    }
    const out = []
    for (const [ctx, cs] of map) {
      const CC = compter(cs)
      out.push({
        ctx, N: CC.N,
        parP: Array.from({ length: MAXP }, (_, i) => {
          const p = i + 1
          const n = CC.parP[p].n
          const post = posterior(n, CC.N)
          return {
            p, n, N: CC.N,
            p_top5: CC.N ? n / CC.N : 0,
            p_post: post,
            indice: globalPost[i] ? post / globalPost[i] : 0,
          }
        }),
      })
    }
    out.sort((x, y) => y.N - x.N || x.ctx.localeCompare(y.ctx))
    return out
  }

  const contextes = {
    global: {
      N,
      parP: singles.map((s) => ({
        p: s.p, n: s.n_top5, N,
        p_top5: s.p_top5, p_post: s.p_top5_post, indice: 1,
      })),
    },
    discipline: groupePar((k) => k.disc),
    distance: groupePar((k) => k.dist),
    partants: groupePar((k) => k.part),
    discDist: groupePar((k) => `${k.disc} · ${k.dist}`),
    combine: groupePar((k) => `${k.disc} · ${k.dist} · ${k.part} part.`),
    index: {
      disciplines: [...new Set(list.map((c) => normDiscipline(c.discipline)))].sort(),
      distances: [...new Set(list.map((c) => bandeDistance(c.distance)))]
        .sort((x, y) => (parseInt(x, 10) || 0) - (parseInt(y, 10) || 0)),
      partants: [...new Set(list.map((c) => bandePartants(c.nbPartants || (c.grille && c.grille.max) || 0)))]
        .sort((x, y) => (parseInt(x, 10) || 0) - (parseInt(y, 10) || 0)),
    },
  }

  /* ── F. combinaisons du Quinté (ensemble de 5 cases) ───────────────────── */
  const comboQuint = [...C.quints.entries()]
    .map(([k, v]) => ({ combo: k.split('-').map(Number), count: v, p: N ? v / N : 0 }))
    .sort((x, y) => y.count - x.count || cleCombo(x.combo).localeCompare(cleCombo(y.combo)))

  /* ── G. backtest leave-one-out ─────────────────────────────────────────── */
  const ordrePost = (counts, n) => {
    return Array.from({ length: MAXP }, (_, i) => {
      const p = i + 1
      return { p, post: posterior(counts[p], n) }
    })
      .sort((x, y) => y.post - x.post || x.p - y.p)
      .map((x) => x.p)
  }

  const backtest = []
  for (let nTop = 3; nTop <= 12; nTop++) {
    let pod = 0, quin = 0, quatre = 0, gagnant = 0, evalues = 0
    for (let i = 0; i < N; i++) {
      const s = slotsDe(list[i])
      if (s.length < 5) continue
      evalues++
      // total − la course i : on classe sans s'être vu
      const ci = compter([list[i]])
      const counts = [0]
      for (let p = 1; p <= MAXP; p++) counts[p] = C.parP[p].n - ci.parP[p].n
      const ordre = ordrePost(counts, N - 1)
      const set = new Set(ordre.slice(0, nTop))
      const podium = s.slice(0, 3)
      const quinte = s.slice(0, 5)
      if (podium.every((p) => set.has(p))) pod++
      if (quinte.every((p) => set.has(p))) quin++
      if (quinte.filter((p) => set.has(p)).length >= 4) quatre++
      if (set.has(s[0])) gagnant++
    }
    const comb = (n, k) => {
      if (n < k) return 0
      let r = 1
      for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
      return r
    }
    backtest.push({
      n: nTop,
      evalues,
      podium: evalues ? pod / evalues : 0,
      quinte: evalues ? quin / evalues : 0,
      plus4: evalues ? quatre / evalues : 0,
      gagnant: evalues ? gagnant / evalues : 0,
      hasard_podium: comb(nTop, 3) / comb(MAXP, 3),
      hasard_quinte: comb(nTop, 5) / comb(MAXP, 5),
    })
  }

  // G2. hors échantillon : une moitié classe, l'autre note (et inversement)
  const moitie = Math.floor(N / 2)
  const A = list.slice(0, moitie)
  const B = list.slice(moitie)
  const CA = compter(A)
  const CB = compter(B)
  const courbeSur = (counts, n, evalues) => {
    const ordre = ordrePost(counts, n)
    let pod = 0, quin = 0, ev = 0
    for (const c of evalues) {
      const s = slotsDe(c)
      if (s.length < 5) continue
      ev++
      const set = new Set(ordre.slice(0, 8))
      if (s.slice(0, 3).every((p) => set.has(p))) pod++
      if (s.slice(0, 5).every((p) => set.has(p))) quin++
    }
    return { evalues: ev, podium: ev ? pod / ev : 0, quinte: ev ? quin / ev : 0 }
  }
  const comptesA = CA.parP.map((d) => d.n)
  const comptesB = CB.parP.map((d) => d.n)
  const horsEchantillon = [
    { sens: 'classe sur la 1re moitié → noté sur la 2e', base: A.length, ...courbeSur(comptesA, A.length, B) },
    { sens: 'classe sur la 2e moitié → noté sur la 1re', base: B.length, ...courbeSur(comptesB, B.length, A) },
  ]

  /* ── G-bis. LES RÈGLES DE SÉLECTION (probabilité → choix) ──────────────── *
   * Quatre façons de classer les cases, toutes mesurées de la même manière :
   *   top5     : P(top-5 | N) postérieur
   *   podium   : P(podium | N) postérieur
   *   victoire : P(victoire | N) postérieur
   *   contexte : P(top-5 | contexte) postérieur, avec repli si N_ctx < 3
   * On mesure en LOO (la course ne sert pas à son propre classement) puis en
   * deux moitiés strictes. Aucune règle n'est déclarée gagnante sur un écart
   * qui tient dans le bruit : le classement est publié, pas imposé. */
  const REGLES = ['top5', 'podium', 'victoire', 'contexte']
  const cleCtx = (c) => `${normDiscipline(c.discipline)}|${bandeDistance(c.distance)}|${bandePartants(c.nbPartants || (c.grille && c.grille.max) || 0)}`
  const baseDe = (r) => (r === 'podium' ? BASE_PODIUM : r === 'victoire' ? BASE_VICTOIRE : BASE_TOP5)
  const champDe = (r) => (r === 'podium' ? 'pod' : r === 'victoire' ? 'vic' : 'n')

  const parCourse = list.map((c) => {
    const cc = compter([c])
    const n = [0], vic = [0], pod = [0]
    for (let p = 1; p <= MAXP; p++) { n[p] = cc.parP[p].n; vic[p] = cc.parP[p].vic; pod[p] = cc.parP[p].pod }
    return { n, vic, pod, slots: slotsDe(c), ctx: cleCtx(c) }
  })

  const postsDepuis = (rule, champ, Ntot) => {
    const base = baseDe(rule)
    return Array.from({ length: MAXP }, (_, i) => posterior(champ[i + 1], Ntot, MARGIN, base))
  }
  const ordreDe = (posts) => Array.from({ length: MAXP }, (_, i) => ({ p: i + 1, post: posts[i] }))
    .sort((x, y) => y.post - x.post || x.p - y.p)
    .map((x) => x.p)

  const postGlobal = (rule, excludeIdx) => {
    const champ = [0]
    for (let p = 1; p <= MAXP; p++) {
      let v = C.parP[p][champDe(rule)]
      if (excludeIdx != null) v -= parCourse[excludeIdx][champDe(rule)][p]
      champ[p] = v
    }
    return postsDepuis(rule, champ, N - (excludeIdx != null ? 1 : 0))
  }

  const postContexte = (rule, idx) => {
    const g = postGlobal(rule, idx)
    if (rule !== 'contexte') return g
    const key = parCourse[idx].ctx
    let Nctx = 0
    const champ = [0]
    for (let j = 0; j < N; j++) {
      if (j === idx || parCourse[j].ctx !== key) continue
      Nctx++
      for (let p = 1; p <= MAXP; p++) champ[p] = (champ[p] || 0) + parCourse[j].n[p]
    }
    if (!Nctx) return g
    return g.map((gp, i) => (champ[i + 1] + MARGIN * gp) / (Nctx + MARGIN))
  }

  const regles = {}
  for (const rule of REGLES) {
    const courbe = []
    for (let nTop = 5; nTop <= 12; nTop++) {
      let pod = 0, quin = 0, quatre = 0, gagnant = 0, ev = 0
      for (let i = 0; i < N; i++) {
        const s = parCourse[i].slots
        if (s.length < 5) continue
        ev++
        const set = new Set(ordreDe(postContexte(rule, i)).slice(0, nTop))
        if (s.slice(0, 3).every((p) => set.has(p))) pod++
        if (s.slice(0, 5).every((p) => set.has(p))) quin++
        if (s.slice(0, 5).filter((p) => set.has(p)).length >= 4) quatre++
        if (set.has(s[0])) gagnant++
      }
      courbe.push({
        n: nTop, evalues: ev,
        podium: ev ? pod / ev : 0,
        quinte: ev ? quin / ev : 0,
        plus4: ev ? quatre / ev : 0,
        gagnant: ev ? gagnant / ev : 0,
      })
    }

    // moitiés strictes : on classe sur une moitié, on note sur l'autre
    const moitieRegle = (apprend, note) => {
      const CA = compter(apprend)
      const champ = [0], champV = [0], champP = [0]
      for (let p = 1; p <= MAXP; p++) { champ[p] = CA.parP[p].n; champV[p] = CA.parP[p].vic; champP[p] = CA.parP[p].pod }
      const posts = (r) => postsDepuis(r, r === 'podium' ? champP : r === 'victoire' ? champV : champ, apprend.length)
      const groupe = new Map()
      if (rule === 'contexte') {
        for (const c of apprend) {
          const k = cleCtx(c)
          if (!groupe.has(k)) groupe.set(k, { N: 0, champ: [0] })
          const g = groupe.get(k)
          g.N++
          for (const p of slotsDe(c)) g.champ[p]++
        }
      }
      const postG = posts(rule === 'contexte' ? 'top5' : rule)
      let pod = 0, quin = 0, ev = 0
      for (const c of note) {
        const s = slotsDe(c)
        if (s.length < 5) continue
        ev++
        let pset = postG
        if (rule === 'contexte') {
          const g = groupe.get(cleCtx(c))
          pset = g && g.N >= 3
            ? postG.map((gp, i) => (g.champ[i + 1] + MARGIN * gp) / (g.N + MARGIN))
            : postG
        }
        const set = new Set(ordreDe(pset).slice(0, 8))
        if (s.slice(0, 3).every((p) => set.has(p))) pod++
        if (s.slice(0, 5).every((p) => set.has(p))) quin++
      }
      return { evalues: ev, podium: ev ? pod / ev : 0, quinte: ev ? quin / ev : 0 }
    }

    regles[rule] = {
      courbe,
      horsEchantillon: [
        { sens: 'classe sur la 1re moitié → noté sur la 2e', base: A.length, ...moitieRegle(A, B) },
        { sens: 'classe sur la 2e moitié → noté sur la 1re', base: B.length, ...moitieRegle(B, A) },
      ],
    }
  }

  const classementRegles = REGLES.map((r) => {
    const h = regles[r].horsEchantillon
    return {
      regle: r,
      quinte: (h[0].quinte + h[1].quinte) / 2,
      podium: (h[0].podium + h[1].podium) / 2,
    }
  }).sort((a, b) => b.quinte - a.quinte || b.podium - a.podium)

  const ecartRegles = classementRegles.length
    ? classementRegles[0].quinte - classementRegles[classementRegles.length - 1].quinte
    : 0

  /* ── H. divers ─────────────────────────────────────────────────────────── */
  const avecBas = auMoinsUn(list, 11)
  const casesMoyennes = (() => {
    let s = 0, k = 0
    for (const c of list) {
      const u = new Set(slotsDe(c))
      if (!u.size) continue
      s += u.size; k++
    }
    return k ? s / k : 0
  })()

  const topCases = singles
    .filter((s) => s.n_top5 > 0)
    .sort((a, b) => b.p_top5_post - a.p_top5_post || a.p - b.p)
    .slice(0, 12)

  return {
    N,
    alpha: ALPHA,
    marge: MARGIN,
    baseTop5: BASE_TOP5,
    maxP: MAXP,
    parP: singles,
    pairs: C.pairs,
    pairList,
    tripleList,
    cond2,
    cond3,
    exemples,
    comboQuint,
    topCombos: comboQuint.slice(0, 12),
    topCases,
    topPaires: pairList.slice(0, 15),
    topTriples: tripleList.slice(0, 15),
    contextes,
    backtest,
    horsEchantillon,
    regles,
    classementRegles,
    ecartRegles,
    regleRecommandee: classementRegles.length ? classementRegles[0].regle : 'top5',
    coursesAvecBas: avecBas,
    p_auMoinsUnBas: N ? avecBas / N : 0,
    casesMoyennes,
    genres: {
      disciplines: contextes.index.disciplines,
      distances: contextes.index.distances,
      partants: contextes.index.partants,
    },
    genereLe: new Date().toISOString(),
  }
}

/** Formate une probabilité en % (1 décimale, virgule française). */
export function pctProb(x, d = 1) {
  if (x == null || !Number.isFinite(x)) return '—'
  return (x * 100).toFixed(d).replace('.', ',') + ' %'
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  DE LA PROBABILITÉ À LA SÉLECTION
 *
 *  `casesDepuisPresse` reproduit la numérotation des cases P vue par l'archive
 *  (même règle que `buildGrid().slotParNum` : la ligne du haut porte la parité
 *  du 1er cité, dans l'ordre de la presse ; la ligne du bas porte l'autre).
 *  Aucun groupe, aucun quota : uniquement l'ordre de la Récapitulative.
 *
 *  `choisirContexte` / `selectionner` transforment les postérieurs en ticket :
 *  on classe les cases, on garde les N premières, on rend les NUMÉROS.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Ordre presse → { numAtPlace, slotParNum } (même règle que buildGrid). */
export function casesDepuisPresse(ordre = [], partants = []) {
  const parts = new Set((partants || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))
  const cites = [...new Set((ordre || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))]
  const base = parts.size ? cites.filter((n) => parts.has(n)) : cites
  const manquants = [...parts].filter((n) => !base.includes(n)).sort((a, b) => a - b)
  const tous = [...base, ...manquants]

  const numAtPlace = {}
  tous.forEach((n, i) => { numAtPlace[i + 1] = n })

  const par = (x) => ((x % 2) + 2) % 2
  const pariteHaut = par(numAtPlace[1])
  const haut = tous.filter((n) => par(n) === pariteHaut)
  const bas = tous.filter((n) => par(n) !== pariteHaut)
  const slotParNum = {}
  haut.forEach((n, i) => { slotParNum[n] = 2 * i + 1 })
  bas.forEach((n, i) => { slotParNum[n] = 2 * i + 2 })
  return { numAtPlace, slotParNum, ordre: tous }
}

/** Le contexte retenu pour une course à venir, avec la même remontée que la page. */
export function choisirContexte(matrix, disc, dist, part) {
  const C = matrix?.contextes || {}
  const essais = [
    ['combine', `${disc} · ${dist} · ${part} part.`],
    ['discDist', `${disc} · ${dist}`],
    ['discipline', disc],
  ]
  for (const [niveau, cle] of essais) {
    const g = (C[niveau] || []).find((x) => x.ctx === cle)
    if (g && g.N >= 3) return { ...g, niveau, portee: g.N >= 10 ? 'solide' : 'mince' }
  }
  const g = (C.discipline || []).find((x) => x.ctx === disc)
  if (g) return { ...g, niveau: 'discipline', portee: 'très mince' }
  return { ...(C.global || { N: 0, parP: [] }), ctx: 'global (archive entière)', niveau: 'global', portee: 'repli global' }
}

const champRegle = (r) => (r === 'podium' ? 'p_podium_post' : r === 'victoire' ? 'p_victoire_post' : 'p_top5_post')

/**
 * Classe les cases puis rend les N premières en NUMÉROS.
 *
 * @param {object} matrix  sortie de construireMatrix
 * @param {object} opts    { ordre, partants, taille, regle, contexte }
 *   regle ∈ 'top5' | 'podium' | 'victoire' | 'contexte'
 *   contexte = { disc, dist, part }
 * @returns {object} { lignes, tous, niveau, N_ctx }
 */
export function selectionner(matrix, opts = {}) {
  const { ordre = [], partants = [], taille = 8, regle = 'top5', contexte = null } = opts
  const map = casesDepuisPresse(ordre, partants)
  const nums = Object.keys(map.slotParNum).map(Number)
  if (!nums.length) return { lignes: [], tous: [], niveau: 'aucun', N_ctx: 0 }

  let parCase = matrix.parP
  let niveau = 'global'
  let N_ctx = matrix.N
  if (regle === 'contexte') {
    const g = choisirContexte(matrix, contexte?.disc || '', contexte?.dist || '', contexte?.part || '')
    if (g.parP && g.parP.length) { parCase = g.parP; niveau = g.niveau; N_ctx = g.N }
  }
  const champ = regle === 'contexte' ? 'p_post' : champRegle(regle)

  const tous = nums.map((num) => {
    const slot = map.slotParNum[num]
    const d = parCase.find((x) => x.p === slot) || {}
    return {
      num, slot,
      post: Number.isFinite(d[champ]) ? d[champ] : 0,
      p_top5: Number.isFinite(d.p_top5) ? d.p_top5 : null,
      n: Number.isFinite(d.n) ? d.n : null,
    }
  }).sort((a, b) => b.post - a.post || a.slot - b.slot)

  return { lignes: tous.slice(0, taille), tous, niveau, N_ctx }
}

