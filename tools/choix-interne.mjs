/* =============================================================================
 * tools/choix-interne.mjs — LE SEUL TRAVAIL AUTORISÉ : QUI ENTRE DANS LE BLOC
 * (29/10/2026)
 *
 * DÉCISION DE L'UTILISATEUR :
 *   « الكوطة التي لا يجب تغييرها بالمرة هي 3 2 1 1 1 تعتمد كدستور وحدف كل
 *     الكوطات الاخرى والبحت عن مصدر فشل الاختيار داخل الكوطة واصلاحه »
 *
 * → **3-2-1-1-1 est CONSTITUTIONNEL.** Ce fichier ne touche PAS aux quotas :
 *   il travaillle à quotas fixes, et ne fait varier qu'une chose — l'ORDRE
 *   INTERNE de chaque bloc, c'est-à-dire QUI des cases on garde.
 *
 * ── OÙ EST LE DÉFAUT, EN UNE LIGNE ─────────────────────────────────────────
 *
 * Aujourd'hui l'ordre interne est le CARNET : G1 garde P1-P2-P3 et jette P4,
 * G2 garde P5-P6 et jette P7-P8, G3 garde P9 et jette P10, G4 garde P11 et
 * jette P12 (au marché), G5 garde le moins cher (au marché).
 *
 * Autrement dit : on jette TOUJOURS la dernière case du bloc. C'est un choix,
 * pas une nécessité. Les règles testées ci-dessous ne diffèrent que là.
 *
 * ── LES RÈGLES COMPARÉES (à quotas 3-2-1-1-1) ──────────────────────────────
 *
 *   carnet      la place de presse (P1 < P2 < …)            ← l'actuelle
 *   marche      la cote la plus courte
 *   mixte       1 carnet + 1 marché (puis 2 carnet + 1 marché)  ← les DEUX signaux
 *   fusion      rang P + rang marché (somme), départage au carnet
 *   bassmat     le pc5 mesuré de la CASE (data/bassmat.json), décroissant
 *   marketPlus  la case que le marché aime BEAUCOUP plus que la presse
 *               (P − rang marché, décroissant)
 *
 * ── LA MÉTHODE ─────────────────────────────────────────────────────────────
 *
 *   ① on valide le témoin : le remplissage local doit rendre EXACTEMENT les
 *     tickets du vrai `remplirGrille`. Sinon, on ne mesure rien (on s'arrête).
 *   ② on change UN bloc à la fois, et on rejoue les deux corpus :
 *        A = 96 Quintés à presse réelle (data/quintes.json)
 *        B = 26 Quintés d'octobre (data/synthese.json + data/cotes.json)
 *   ③ on compare en APPARIÉ (mêmes courses) sur trois métriques :
 *        x/5 moyen · 5/5 · podium entier — et par moitié de calendrier.
 *   ④ bootstrap apparié 10 000 tirages sur la différence de x/5 et de podium.
 *
 *   node tools\choix-interne.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, GROUPES } from '../src/lib/quinte.js'

const pad = (s, n) => String(s).padEnd(n)
const padl = (s, n) => String(s).padStart(n)
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const r2 = (x) => Math.round(100 * x) / 100
const nr = (x) => String(r2(x)).replace('.', ',')

/* ────────────────────────────── ① LES CORPUS ───────────────────────────── */
const lire = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return d } }
const BASSMAT = lire('data/bassmat.json', null)
const PC5 = new Map()
if (BASSMAT && Array.isArray(BASSMAT.cases)) for (const c of BASSMAT.cases) PC5.set(c.p, (c.pc5 ?? 0) / 100)

const CTRL = []
for (const q of lire('data/quintes.json', [])) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  CTRL.push({
    date: q.date, discipline: q.discipline, syn, nums,
    arrivee: q.arrivee.slice(0, 5),
    cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])),
    ouv: q.ouverture ? Object.fromEntries(nums.filter((n) => q.ouverture[n] > 1).map((n) => [n, q.ouverture[n]])) : null,
    avis: Number.isFinite(q.nbAvis) ? q.nbAvis : null,
    source: 'A',
  })
}
CTRL.sort((a, b) => String(a.date).localeCompare(String(b.date)))

const ARCH = lire('data/synthese.json', {})
const COTES = lire('data/cotes.json', {})
const MOIS = []
for (const d of Object.keys(ARCH).sort().filter((x) => x >= '2026-10-01' && x <= '2026-10-31')) {
  const e = ARCH[d]
  const syn = (e.synthese || []).filter((n) => Number.isFinite(n) && n > 0)
  const arr = (e.arrivee || []).filter((n) => Number.isFinite(n) && n > 0)
  if (syn.length < 8 || arr.length < 5) continue
  const nums = (e.runners && e.runners.length ? e.runners : syn).map(Number)
  const c = COTES[e.courseId]
  let cotes = null
  let ouv = null
  if (c && Array.isArray(c.cotes)) {
    const o = {}
    const oo = {}
    for (const x of c.cotes) if (x && x.cote > 1) {
      o[x.num] = { cote: x.cote }
      if (x.ouverture > 1) oo[x.num] = x.ouverture
    }
    if (Object.keys(o).length >= 10) cotes = o
    if (Object.keys(oo).length >= 10) ouv = oo
  }
  MOIS.push({ date: d, discipline: e.discipline, syn, nums, arrivee: arr.slice(0, 5), cotes, ouv, source: 'B' })
}
MOIS.sort((a, b) => String(a.date).localeCompare(String(b.date)))

/* ─────────────────── ② LE REMPLISSAGE, RÈGLE PAR RÈGLE ─────────────────── */
const coteDe = (cotes, num) => {
  const x = cotes ? cotes[num] : null
  if (x == null) return null
  const v = typeof x === 'number' ? x : x.cote
  return v > 1 ? v : null
}

/** le rang de marché dans la COURSE (1 = la cote la plus courte) */
function rangsMarche(course) {
  const n = course.nums.filter((x) => coteDe(course.cotes, x) != null)
  const o = n.slice().sort((a, b) => coteDe(course.cotes, a) - coteDe(course.cotes, b) || a - b)
  const r = {}
  o.forEach((x, i) => { r[x] = i + 1 })
  return r
}

const REGLES = ['carnet', 'marche', 'mixte', 'fusion', 'bassmat', 'marketPlus', 'caseBloc',
  'podiumPlace', 'podiumCase', 'mixtePodium', 'sauterP2', 'derivePlace', 'deriveBloc',
  'tendance', 'chuteForte', 'regime', 'echange15', 'echange20', 'avis']

/** le seuil de régime : la médiane de la dispersion sur le corpus A */
let SEUIL_REGIME = null
let SEUIL_AVIS = null
{
  const d = CTRL.map(dispersion).filter((x) => x != null).sort((a, b) => a - b)
  if (d.length) SEUIL_REGIME = d[Math.floor(d.length / 2)]
  const a = CTRL.map((c) => c.avis).filter((x) => x != null).sort((x, y) => x - y)
  if (a.length) SEUIL_AVIS = a[Math.floor(a.length / 2)]
}

/* ⭐ le taux d'arrivée d'une CASE **dans son bloc** — c'est le signal que le
 * carnet ne peut pas voir : P4 n'arrive pas au même rythme selon qu'il tombe
 * dans G1 (parité) ou dans G2. La table est apprise sur les AUTRES courses
 * seulement (leave-one-out), et le corpus B utilise la table complète de A :
 * aucun arrivant n'est deviné, on n'utilise que le passé. */
let TABLE = null            // Map 'G1|4' -> { n, t5, t3 }
function tableDepuis(corpus, sauf = null) {
  const m = new Map()
  for (const c of corpus) {
    if (c === sauf) continue
    const g = buildGrid(c.syn, c.nums)
    for (const gr of g.groupes) for (const k of gr.cases) {
      const key = gr.id + '|' + k.place
      const o = m.get(key) || { n: 0, t5: 0, t3: 0 }
      o.n++
      const i = c.arrivee.indexOf(k.num)
      if (i >= 0) o.t5++
      if (i >= 0 && i < 3) o.t3++
      m.set(key, o)
    }
  }
  return m
}
/** la table GLOBALE par rang de presse (tous blocs confondus) */
let TABLE_PLACE = null
function tablePlace(corpus, sauf = null) {
  const m = new Map()
  for (const c of corpus) {
    if (c === sauf) continue
    const g = buildGrid(c.syn, c.nums)
    for (const gr of g.groupes) for (const k of gr.cases) {
      const o = m.get(k.place) || { n: 0, t5: 0, t3: 0 }
      o.n++
      const i = c.arrivee.indexOf(k.num)
      if (i >= 0) o.t5++
      if (i >= 0 && i < 3) o.t3++
      m.set(k.place, o)
    }
  }
  return m
}
const tauxCase = (key, m) => {
  const o = (m || TABLE)?.get(key)
  return o && o.n >= 8 ? o.t5 / o.n : null
}
const tauxPodium = (o, seuil = 10) => (o && o.n >= seuil ? o.t3 / o.n : null)

/* ⭐ 29/10/2026 — LE RÉGIME DE LA COURSE : « un Quinté n'est pas l'autre ».
 * dispersion = cote du 4ᵉ favori / cote du favori. Petit = marché serré (le
 * haut du carnet est fiable) ; grand = marché ouvert (le marché en sait plus).
 * C'est le seul signal dynamique disponible AVANT le départ, course par course. */
function dispersion(course) {
  const c = course.nums.map((n) => coteDe(course.cotes, n)).filter((x) => x > 1).sort((a, b) => a - b)
  return c.length >= 4 && c[0] > 0 ? c[3] / c[0] : null
}


/* ⭐ 29/10/2026 — LA RÈGLE DU MARCHÉ QUI BOUGE (le point de l'utilisateur) :
 * « octobre a changé, il faut être malin et suivre la dérive ». On ne le croit
 * pas sur parole : on la teste en ROULANT. Pour chaque course, la table est
 * construite sur les 26 courses PRÉCÉDENTES seulement (même taille qu'octobre),
 * et on la compare au carnet figé. Si la dérive est réelle et persistante, le
 * roulant gagne. Sinon il perd — et c'est la réponse. */
const FENETRE = 26
const TIMELINE = []
const ROULANT = new Map()          // course -> { place, bloc }
{
  const gp = new Map()             // place -> { n, t5, t3 }
  const gb = new Map()             // 'G1|4' -> { n, t5, t3 }
  const hist = []                  // les 26 dernières courses
  const ajouter = (c, sens) => {
    const g = buildGrid(c.syn, c.nums)
    for (const gr of g.groupes) for (const k of gr.cases) {
      const i = c.arrivee.indexOf(k.num)
      for (const [m, cle] of [[gp, k.place], [gb, gr.id + '|' + k.place]]) {
        const o = m.get(cle) || { n: 0, t5: 0, t3: 0 }
        o.n += sens; if (i >= 0) o.t5 += sens; if (i >= 0 && i < 3) o.t3 += sens
        m.set(cle, o)
      }
    }
  }
  for (const c of [...CTRL, ...MOIS]) {
    TIMELINE.push(c)
    /* la fenêtre AVANT cette course */
    const copie = (m) => new Map([...m].map(([k, v]) => [k, { ...v }]))
    ROULANT.set(c, { place: copie(gp), bloc: copie(gb) })
    ajouter(c, +1)
    hist.push(c)
    if (hist.length > FENETRE) { ajouter(hist.shift(), -1) }
  }
}


/** l'ordre des cases d'un bloc selon la règle */
function ordonner(regle, cases, ctx) {
  const parPlace = cases.slice().sort((a, b) => a.place - b.place)
  const surLeMarche = cases.every((c) => coteDe(ctx.cotes, c.num) != null)
  const parCote = cases.slice().sort((a, b) =>
    (coteDe(ctx.cotes, a.num) ?? 999) - (coteDe(ctx.cotes, b.num) ?? 999) || a.place - b.place)

  if (regle === 'carnet') return parPlace
  if (regle === 'marche') return surLeMarche ? parCote : parPlace
  if (regle === 'bassmat') {
    if (!PC5.size) return parPlace
    return cases.slice().sort((a, b) => (PC5.get(b.place) ?? 0) - (PC5.get(a.place) ?? 0) || a.place - b.place)
  }
  if (regle === 'caseBloc') {
    const T = ctx.table
    if (!T) return parPlace
    return cases.slice().sort((a, b) => {
      const ra = tauxCase(ctx.bloc + '|' + a.place, T)
      const rb = tauxCase(ctx.bloc + '|' + b.place, T)
      if (ra != null && rb != null && ra !== rb) return rb - ra
      if (ra != null && rb == null) return -1
      if (ra == null && rb != null) return 1
      return a.place - b.place
    })
  }
  /* ⭐ 29/10/2026 — LE CRITÈRE DU PODIUM (instruction de l'utilisateur).
   * Ranger les cases par P(podium) = t3 / n — la métrique DENSE (§11.25), pas
   * P(top5). C'est le seul critère qui dit : « cette case-là produit un
   * podiums », et c'est la fonction du quota. */
  if (regle === 'podiumPlace' || regle === 'podiumCase' || regle === 'mixtePodium') {
    const parPodium = (T, cle) => cases.slice().sort((a, b) => {
      const ra = tauxPodium(T?.get(cle(a)))
      const rb = tauxPodium(T?.get(cle(b)))
      if (ra != null && rb != null && ra !== rb) return rb - ra
      if (ra != null && rb == null) return -1
      if (ra == null && rb != null) return 1
      return a.place - b.place
    })
    const parP = parPodium(ctx.tablePlace, (c) => c.place)
    const parB = parPodium(ctx.table, (c) => ctx.bloc + '|' + c.place)
    if (regle === 'podiumPlace') return parP
    if (regle === 'podiumCase') return parB
    /* mixtePodium : 1 podium-de-case, 1 podium-de-rang, puis on alterne */
    const out = []
    const pris = new Set()
    const lignes = [parB, parP, parPlace]
    let k = 0
    while (out.length < cases.length) {
      const L = lignes[k % lignes.length]
      const x = L.find((c) => !pris.has(c.num))
      k++
      if (!x) continue
      out.push(x); pris.add(x.num)
    }
    return out
  }
  /* ⭐ 29/10/2026 — LA RÈGLE DE L'UTILISATEUR, TESTÉE TELLE QUELLE :
   * « P2 est le maillon jetable de G1, pas P4 » (table d'octobre).
   * G1 garde P1, P3, P4 et jette P2 — aucune donnée apprise, c'est structurel. */
  if (regle === 'sauterP2') {
    const cle = (c) => (ctx.bloc === 'G1' && c.place === 2 ? 99 : c.place)
    return cases.slice().sort((a, b) => cle(a) - cle(b))
  }
  /* ⭐ 29/10/2026 — LA DÉRIVE SUIVIE EN ROULANT (26 courses précédentes). */
  if (regle === 'derivePlace' || regle === 'deriveBloc') {
    const T = regle === 'derivePlace' ? ctx.roulant?.place : ctx.roulant?.bloc
    const cle = (c) => (regle === 'derivePlace' ? c.place : ctx.bloc + '|' + c.place)
    return cases.slice().sort((a, b) => {
      const ra = tauxPodium(T?.get(cle(a)), 5)
      const rb = tauxPodium(T?.get(cle(b)), 5)
      if (ra != null && rb != null && ra !== rb) return rb - ra
      if (ra != null && rb == null) return -1
      if (ra == null && rb != null) return 1
      return a.place - b.place
    })
  }
  /* ⭐ 29/10/2026 — LE MOTEUR DYNAMIQUE : « ils sentent les parieurs et
   * changent de plan ». Le signal n'est pas le passé des 26 dernières courses,
   * c'est le mOUVEMENT DE LA COTE DE CETTE COURSE : cote / ouverture.
   *   tendance    → la plus forte baisse d'abord (le marché a bougé vers lui)
   *   chuteForte  → le carnet, mais tout cheval dont la cote a chuté ≥ 20 %
   *                 passe devant (les autres gardent leur ordre) */
  const ratio = (num) => {
    const o = ctx.ouv?.[num]
    const c = coteDe(ctx.cotes, num)
    return o > 1 && c > 0 ? c / o : null
  }
  if (regle === 'tendance') {
    if (!ctx.ouv) return parPlace
    return cases.slice().sort((a, b) => {
      const ra = ratio(a.num)
      const rb = ratio(b.num)
      if (ra == null && rb == null) return a.place - b.place
      if (ra == null) return 1
      if (rb == null) return -1
      return ra - rb || a.place - b.place
    })
  }
  if (regle === 'chuteForte') {
    if (!ctx.ouv) return parPlace
    const chutes = cases.filter((c) => { const r = ratio(c.num); return r != null && r <= 0.8 })
    if (!chutes.length) return parPlace
    chutes.sort((a, b) => ratio(a.num) - ratio(b.num) || a.place - b.place)
    const pris = new Set(chutes.map((c) => c.num))
    return [...chutes, ...parPlace.filter((c) => !pris.has(c.num))]
  }
  /* ⭐ 29/10/2026 — L'ÉCHANGE FORT : le carnet garde son ordre, SAUF si le
   * marché de CETTE course préfère nettement un cheval plus bas dans le bloc
   * (cote SEUIL fois plus courte). C'est la version prudente du dynamisme :
   * elle ne se déclenche que quand les parieurs ont réellement bougé un cheval. */
  if (regle === 'echange15' || regle === 'echange20') {
    const SEUIL = regle === 'echange15' ? 1.5 : 2.0
    if (!surLeMarche) return parPlace
    const out = parPlace.slice()
    for (let i = 0; i < out.length; i++) {
      let best = i
      for (let j = i + 1; j < out.length; j++) {
        const ci = coteDe(ctx.cotes, out[best].num) ?? 999
        const cj = coteDe(ctx.cotes, out[j].num) ?? 999
        if (cj * SEUIL <= ci) best = j
      }
      if (best !== i) { const x = out[i]; out[i] = out[best]; out[best] = x }
    }
    return out
  }
  if (regle === 'avis') {
    /* la presse est-elle sûre d'elle ? quand peu de pronostiqueurs se
     * prononcent, le carnet est moins fiable → le marché. */
    if (!surLeMarche) return parPlace
    if (ctx.avis == null || SEUIL_AVIS == null) return parPlace
    return ctx.avis < SEUIL_AVIS ? parCote : parPlace
  }
  if (regle === 'regime') {
    /* marché serré → carnet ; marché ouvert → la cote. Dynamique COURSE PAR
     * COURSE, sans rien apprendre du passé des arrivées. */
    if (!surLeMarche) return parPlace
    const d = ctx.disp
    if (d == null || SEUIL_REGIME == null) return parPlace
    return d >= SEUIL_REGIME ? parCote : parPlace
  }
  if (!surLeMarche) return parPlace        // sans cote complète : repli carnet (§11.16)

  const rM = ctx.rangM
  if (regle === 'fusion') {
    return cases.slice().sort((a, b) => (a.place + rM[a.num]) - (b.place + rM[b.num]) || a.place - b.place)
  }
  if (regle === 'marketPlus') {
    return cases.slice().sort((a, b) =>
      (b.place - rM[b.num]) - (a.place - rM[a.num]) || a.place - b.place)
  }
  if (regle === 'mixte') {
    /* 1 carnet, 1 marché, 2 carnet, 1 marché… — les deux signaux, à tour de rôle */
    const out = []
    const pris = new Set()
    const carnet = parPlace
    const marche = parCote
    let i = 0
    let j = 0
    while (out.length < cases.length) {
      /* positions paires (0,2,4…) = carnet ; impaires = marché */
      if (out.length % 2 === 0) {
        while (i < carnet.length && pris.has(carnet[i].num)) i++
        if (i < carnet.length) { out.push(carnet[i]); pris.add(carnet[i].num); i++; continue }
        while (j < marche.length && pris.has(marche[j].num)) j++
        if (j < marche.length) { out.push(marche[j]); pris.add(marche[j].num); j++ }
        else break
      } else {
        while (j < marche.length && pris.has(marche[j].num)) j++
        if (j < marche.length) { out.push(marche[j]); pris.add(marche[j].num); j++; continue }
        while (i < carnet.length && pris.has(carnet[i].num)) i++
        if (i < carnet.length) { out.push(carnet[i]); pris.add(carnet[i].num); i++ }
        else break
      }
    }
    return out
  }
  return parPlace
}

/** le remplissage complet à quotas FIXES (ceux de GROUPES) */
function remplir(grille, course, regles, table = null, table3 = null) {
  const rangM = rangsMarche(course)
  const ticket = []
  const detail = []
  for (const g of grille.groupes) {
    const cases = g.cases.map((c) => ({ ...c }))
    if (!cases.length) { detail.push({ ...g, cases: [] }); continue }
    const regle = regles[g.id] || 'carnet'
    const ordre = ordonner(regle, cases, { cotes: course.cotes, ouv: course.ouv, disp: dispersion(course), avis: course.avis, rangM, bloc: g.id, table, tablePlace: table3, roulant: ROULANT.get(course) })
    const quota = g.obligatoire ? Math.max(1, g.quota) : g.quota
    const retenus = new Set(ordre.slice(0, quota).map((c) => c.place))
    detail.push({ ...g, regle, cases: cases.map((c) => ({ ...c, pris: retenus.has(c.place) })) })
    ordre.slice(0, quota).forEach((c) => ticket.push(c.num))
  }
  return { ticket: [...new Set(ticket)], detail }
}

/* ──────────── ③ TÉMOIN : le remplissage local === le vrai moteur ────────── */
const PROD = { G1: 'carnet', G2: 'carnet', G3: 'echange20', G4: 'marche', G5: 'echange20' }

function controle(corpus) {
  let ko = 0
  for (const c of corpus) {
    const g = buildGrid(c.syn, c.nums)
    const cl = g.groupes.flatMap((x) => x.cases).slice().sort((a, b) => a.slot - b.slot)
      .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
    const vrai = remplirGrille(g, cl, c.discipline || 'PLAT', c.cotes, null).ticket
    const moi = remplir(g, c, PROD).ticket
    if (vrai.slice().sort().join() !== moi.slice().sort().join()) ko++
  }
  return ko
}
const koA = controle(CTRL)
const koB = controle(MOIS)
console.log('\n  ══ LE CHOIX À L’INTÉRIEUR DU BLOC — quotas 3-2-1-1-1 (constitution) ══')
console.log('  quotas : ' + GROUPES.map((g) => g.id + ' ' + g.quota + '/' + (g.max - g.min + 1)).join(' · '))
if (koA || koB) {
  console.log('\n  ✗ TÉMOIN ROMPU : ' + koA + ' + ' + koB + ' tickets ≠ remplirGrille. On ne mesure rien.')
  process.exit(1)
}
console.log('  témoin : ' + (CTRL.length + MOIS.length) + ' tickets identiques au vrai remplirGrille ✓')

/* ───────────────────────── ④ LA MESURE, BLOC PAR BLOC ──────────────────── */
function noter(corpus, regles) {
  /* les tables (bloc|case) ne contiennent jamais la course qu'on note :
   * corpus A → leave-one-out · corpus B → la table complète de A (autre année) */
  const estB = corpus[0]?.source === 'B'
  const tableB = estB ? tableDepuis(CTRL) : null
  const placeB = estB ? tablePlace(CTRL) : null
  return corpus.map((c) => {
    const g = buildGrid(c.syn, c.nums)
    const table = estB ? tableB : tableDepuis(corpus, c)
    const table3 = estB ? placeB : tablePlace(corpus, c)
    const r = remplir(g, c, regles, table, table3)
    const x5 = c.arrivee.filter((n) => r.ticket.includes(n)).length
    const pod = c.arrivee.slice(0, 3).every((n) => r.ticket.includes(n))
    /* ⭐ le critère de l'utilisateur, traduit en score global : combien des 3
     * chevaux du podium sont dans le ticket (0 à 3). C'est la somme de ce que
     * mesure sa colonne P(podium | case). */
    const podH = c.arrivee.slice(0, 3).filter((n) => r.ticket.includes(n)).length
    /* par bloc : arrivants de CE bloc, et combien sont pris */
    const parBloc = {}
    for (const d of r.detail) {
      const nums = new Set(d.cases.map((k) => k.num))
      const dedans = c.arrivee.filter((n) => nums.has(n))
      const pris = d.cases.filter((k) => k.pris && c.arrivee.includes(k.num)).length
      parBloc[d.id] = { arrivees: dedans.length, pris }
    }
    return { date: c.date, x5, pod, podH, q5: x5 === 5, parBloc }
  })
}

const N_A = noter(CTRL, PROD)
const N_B = noter(MOIS, PROD)
const base = (n) => ({
  x5: r2(n.reduce((s, x) => s + x.x5, 0) / n.length),
  q5: r2(100 * n.filter((x) => x.q5).length / n.length),
  pod: r2(100 * n.filter((x) => x.pod).length / n.length),
  podH: r2(100 * n.reduce((s, x) => s + x.podH, 0) / (3 * n.length)),
})

function boot(nA, nB) {
  const f = (n) => {
    let mieux = 0
    const B = 4000
    for (let b = 0; b < B; b++) {
      let s = 0
      for (let k = 0; k < n.length; k++) {
        const i = Math.floor(Math.random() * n.length)
        s += n[i]
      }
      if (s > 0) mieux++
    }
    return mieux / B
  }
  return { x5: f(nA.map((x) => x.dx5)), pod: f(nA.map((x) => x.dpod)) }
}
function bootB(nA, nB) {
  const f = (n) => {
    let mieux = 0
    const B = 4000
    for (let b = 0; b < B; b++) {
      let s = 0
      for (let k = 0; k < n.length; k++) {
        const i = Math.floor(Math.random() * n.length)
        s += n[i]
      }
      if (s > 0) mieux++
    }
    return mieux / B
  }
  return { x5: f(nA), pod: f(nB) }
}

console.log('\n  ① LA RÉFÉRENCE (G1-G2 carnet · G3 échange fort · G4 marché · G5 échange fort) — quotas constitutionnels')
console.log('  ' + '-'.repeat(78))
const bA = base(N_A)
const bB = base(N_B)
console.log('  ' + pad('corpus A · 96 Quintés', 34) + 'x/5 ' + nr(bA.x5) + '   ·   5/5 ' + nr(bA.q5) + ' %   ·   podium ' + nr(bA.pod) + ' %')
console.log('  ' + pad('corpus B · 26 Quintés d’octobre', 34) + 'x/5 ' + nr(bB.x5) + '   ·   5/5 ' + nr(bB.q5) + ' %   ·   podium ' + nr(bB.pod) + ' %')

/* ② où le bloc coupe : la case JETÉE arrive-t-elle plus que la case GARDÉE ? */
console.log('\n  ② LES CASES DE CHAQUE BLOC — quel sous-ensemble le carnet garde (corpus A)')
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('bloc', 12) + pad('case', 9) + padl('arrive', 9) + padl('taux', 8) +
  padl('podium', 9) + padl('P(pod)', 8) + '   gardée ?')
const parCasA = {}
for (const c of CTRL) {
  const g = buildGrid(c.syn, c.nums)
  for (const gr of g.groupes) {
    const q = gr.obligatoire ? Math.max(1, gr.quota) : gr.quota
    const ordre = gr.cases.slice().sort((a, b) => a.place - b.place)
    for (const k of ordre) {
      const key = gr.id + '|' + k.place
      const o = parCasA[key] || (parCasA[key] = { n: 0, t5: 0, t3: 0, bloc: gr.id, place: k.place, garde: ordre.indexOf(k) < q })
      o.n++
      const i = c.arrivee.indexOf(k.num)
      if (i >= 0) o.t5++
      if (i >= 0 && i < 3) o.t3++
      parCasA[key] = o
    }
  }
}
const parBlocCas = {}
for (const o of Object.values(parCasA)) (parBlocCas[o.bloc] || (parBlocCas[o.bloc] = [])).push(o)
for (const b of GROUPES.map((g) => g.id)) {
  const cases = (parBlocCas[b] || []).sort((x, y) => x.place - y.place)
  for (const o of cases) {
    if (o.n < 10) continue
    console.log('  ' + pad(o.bloc, 12) + pad('P' + o.place, 9) + padl(o.t5 + '/' + o.n, 9) +
      padl(pct(o.t5, o.n), 8) + padl(o.t3 + '/' + o.n, 9) + padl(pct(o.t3, o.n), 8) +
      '   ' + (o.garde ? '✓ gardée' : '✗ jetée') + '   ' + '█'.repeat(Math.round(16 * o.t3 / o.n)))
  }
}
/* le sous-ensemble gardé est-il le MEILLEUR des C(n,q) sous-ensembles ? */
console.log('  ' + '-'.repeat(78))
console.log('  ⚠ seules les cases vues ≥ 20 fois comptent : une case à 1 observation')
console.log('    (100 % sur n=1) n’est pas un signal, c’est un accident.')
for (const b of GROUPES.map((g) => g.id)) {
  const cases = (parBlocCas[b] || []).filter((o) => o.n >= 20).sort((x, y) => x.place - y.place)
  const g = GROUPES.find((x) => x.id === b)
  const q = g.obligatoire ? Math.max(1, g.quota) : g.quota
  if (cases.length <= q) { console.log('  ' + pad(b, 12) + 'bloc entier pris — aucun choix'); continue }
  const bestOf = (champ) => {
    let best = -1
    const combo = (i, pris) => {
      if (pris.length === q) { const t = pris.reduce((s, o) => s + o[champ] / o.n, 0); if (t > best) best = t; return }
      for (let k = i; k < cases.length; k++) combo(k + 1, [...pris, cases[k]])
    }
    combo(0, [])
    return best
  }
  const g5 = cases.slice(0, q).reduce((s, o) => s + o.t5 / o.n, 0)
  const g3 = cases.slice(0, q).reduce((s, o) => s + o.t3 / o.n, 0)
  const b5 = bestOf('t5')
  const b3 = bestOf('t3')
  console.log('  ' + pad(b, 12) +
    'top5 : gardé ' + pct(g5, q).padStart(7) + ' · meilleur ' + pct(b5, q).padStart(7) + (b5 - g5 < 0.001 ? ' ✓' : ' ✗ marge ' + nr(b5 - g5)) +
    '   |   PODIUM : gardé ' + pct(g3, q).padStart(7) + ' · meilleur ' + pct(b3, q).padStart(7) + (b3 - g3 < 0.001 ? ' ✓' : ' ✗ marge ' + nr(b3 - g3)))
}

/* ─────────────── ⑤ chaque bloc, chaque règle, apparié vs production ────── */
console.log('\n  ③ CHANGER UN SEUL BLOC — 6 règles × 5 blocs, apparié vs la production')
console.log('  ' + '-'.repeat(78))
const resultats = []
for (const bloc of GROUPES.map((g) => g.id)) {
  for (const regle of REGLES) {
    if (PROD[bloc] === regle) continue
    const R = { ...PROD, [bloc]: regle }
    const nA = noter(CTRL, R)
    const nB = noter(MOIS, R)
    const a = base(nA)
    const b = base(nB)
    const dA = nA.map((x, i) => ({ dx5: x.x5 - N_A[i].x5, dpod: (x.pod ? 1 : 0) - (N_A[i].pod ? 1 : 0) }))
    const dB = nB.map((x, i) => ({ dx5: x.x5 - N_B[i].x5, dpod: (x.pod ? 1 : 0) - (N_B[i].pod ? 1 : 0) }))
    const bA2 = boot(dA)
    const bB2 = boot(dB)
    const dX5A = r2(a.x5 - bA.x5)
    const dX5B = r2(b.x5 - bB.x5)
    const dPodA = r2(a.pod - bA.pod)
    const dPodB = r2(b.pod - bB.pod)
    const dQ5A = r2(a.q5 - bA.q5)
    const dQ5B = r2(b.q5 - bB.q5)
    const dPH_A = r2(a.podH - bA.podH)
    const dPH_B = r2(b.podH - bB.podH)
    resultats.push({ bloc, regle, a, b, dX5A, dX5B, dPodA, dPodB, dQ5A, dQ5B, dPH_A, dPH_B, pA: bA2, pB: bB2 })
    console.log('  ' + pad(bloc + ' → ' + regle, 22) +
      pad('Δx/5 ' + (dX5A >= 0 ? '+' : '') + nr(dX5A) + ' / ' + (dX5B >= 0 ? '+' : '') + nr(dX5B), 24) +
      pad('Δ5/5 ' + (dQ5A >= 0 ? '+' : '') + nr(dQ5A) + ' / ' + (dQ5B >= 0 ? '+' : '') + nr(dQ5B), 22) +
      pad('Δpod ' + (dPodA >= 0 ? '+' : '') + nr(dPodA) + ' / ' + (dPodB >= 0 ? '+' : '') + nr(dPodB), 20) +
      'ΔpodH ' + (dPH_A >= 0 ? '+' : '') + nr(dPH_A) + ' / ' + (dPH_B >= 0 ? '+' : '') + nr(dPH_B))
  }
}

/* ───────────────────────── ⑥ stabilité par moitié ─────────────────────── */
const moitie = (corpus, regles) => {
  const n = noter(corpus, regles)
  const m = Math.floor(n.length / 2)
  return [base(n.slice(0, m)), base(n.slice(m))]
}
console.log('\n  ④ STABILITÉ — la moitié qui choisit retrouve-t-elle l’autre ?')
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('configuration', 24) + pad('A 1re moitié', 22) + 'A 2e moitié')
for (const r of resultats.filter((x) => x.dX5A >= 0 && x.dX5B >= 0 && x.dPodA >= 0 && x.dPodB >= 0)) {
  const [h1, h2] = moitie(CTRL, { ...PROD, [r.bloc]: r.regle })
  console.log('  ' + pad(r.bloc + ' → ' + r.regle, 24) +
    pad('x/5 ' + nr(h1.x5) + ' · pod ' + nr(h1.pod) + ' %', 22) +
    'x/5 ' + nr(h2.x5) + ' · pod ' + nr(h2.pod) + ' %')
}

/* ── ④ bis LE POINT DE L'UTILISATEUR : le podium est-il dans G1 ? ───────── */
/* « P1-P4 : 25/26 = 96 % » — vrai sur octobre. On le mesure sur les deux
 * corpus, et on regarde ce que le quota de 3 fait de ces 4 cases. */
function podiumDansG1(corpus) {
  let n = 0, dansG1 = 0, dansG12 = 0, jete = 0, podTotal = 0
  for (const c of corpus) {
    const g = buildGrid(c.syn, c.nums)
    const p3 = c.arrivee.slice(0, 3)
    const c1 = new Set(g.groupes[0].cases.map((k) => k.num))
    const c2 = new Set(g.groupes[1].cases.map((k) => k.num))
    n++
    podTotal += p3.length
    if (p3.every((x) => c1.has(x))) dansG1++
    if (p3.every((x) => c1.has(x) || c2.has(x))) dansG12++
    /* combien de chevaux du podium G1 sont JETÉS par le quota de 3 */
    const ordre = g.groupes[0].cases.slice().sort((a, b) => a.place - b.place)
    const jetes = new Set(ordre.slice(g.groupes[0].quota).map((k) => k.num))
    jete += p3.filter((x) => jetes.has(x)).length
  }
  return { n, dansG1, dansG12, jete, podTotal }
}
const pdA = podiumDansG1(CTRL)
const pdB = podiumDansG1(MOIS)
console.log('\n  ④ bis LE PODIUM EST-IL DANS G1 ? (le point de l’utilisateur)')
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('', 34) + padl('96 courses', 13) + padl('26 d’octobre', 14))
console.log('  ' + pad('podium entier dans les 4 cases de G1', 34) + padl(pct(pdA.dansG1, pdA.n), 13) + padl(pct(pdB.dansG1, pdB.n), 14))
console.log('  ' + pad('podium entier dans G1 ∪ G2', 34) + padl(pct(pdA.dansG12, pdA.n), 13) + padl(pct(pdB.dansG12, pdB.n), 14))
console.log('  ' + pad('chevaux du podium G1 JETÉS par 3/4', 34) + padl(pdA.jete + '/' + pdA.podTotal, 13) + padl(pdB.jete + '/' + pdB.podTotal, 14))
console.log('  → quand le podium est dans G1, le quota 3 en jette forcément un sur les 4 :')
console.log('    ce n’est pas une erreur de choix, c’est le nombre de sièges.')

/* ── ④ ter LE TABLEAU DE L'UTILISATEUR, RECALCULÉ SUR LES DEUX CORPUS ────── */
/* Sa table d'octobre classe les cases par P(podium | top5). On la refait, à
 * l'identique, sur les 26 courses d'octobre ET sur les 96 courses de contrôle.
 * Le point à trancher : P2 est-il vraiment le maillon faible de G1 ? */
function tableParRang(corpus) {
  const m = new Map()
  for (const c of corpus) {
    const g = buildGrid(c.syn, c.nums)
    for (const gr of g.groupes) for (const k of gr.cases) {
      const o = m.get(k.place) || { n: 0, n5: 0, pod: 0, vic: 0 }
      o.n++
      if (c.nums.includes(k.num)) { }           // course valide
      const i = c.arrivee.indexOf(k.num)
      if (i >= 0) { o.n5++; if (i < 3) o.pod++; if (i === 0) o.vic++ }
      m.set(k.place, o)
    }
  }
  return m
}
const TA = tableParRang(CTRL)
const TB = tableParRang(MOIS)
console.log('\n  ④ ter LA TABLE DE L’UTILISATEUR — par RANG DE PRESSE, sur les deux corpus')
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('', 8) + padl('n_top5 A', 10) + padl('pod A', 8) + padl('P(pod|5) A', 12) +
  padl('n_top5 B', 10) + padl('pod B', 8) + padl('P(pod|5) B', 12))
for (let p = 1; p <= 8; p++) {
  const a = TA.get(p) || { n: 0, n5: 0, pod: 0 }
  const b = TB.get(p) || { n: 0, n5: 0, pod: 0 }
  console.log('  ' + pad('P' + p, 8) + padl(a.n5 + '/' + a.n, 10) + padl(String(a.pod), 8) +
    padl(a.n5 ? pct(a.pod, a.n5) : '—', 12) +
    padl(b.n5 + '/' + b.n, 10) + padl(String(b.pod), 8) + padl(b.n5 ? pct(b.pod, b.n5) : '—', 12))
}
const combienPod = (corpus, rangs) => {
  let n = 0, auMoins1 = 0, tous = 0, tot = 0
  for (const c of corpus) {
    const g = buildGrid(c.syn, c.nums)
    const nums = new Set(g.groupes.flatMap((gr) => gr.cases).filter((k) => rangs.includes(k.place)).map((k) => k.num))
    const p3 = c.arrivee.slice(0, 3)
    n++
    const dedans = p3.filter((x) => nums.has(x)).length
    tot += dedans
    if (dedans >= 1) auMoins1++
    if (dedans === p3.length) tous++
  }
  return { n, auMoins1, tous, tot }
}
const cmpA = combienPod(CTRL, [1, 2, 3, 4])
const cmpB = combienPod(MOIS, [1, 2, 3, 4])
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('≥ 1 cheval du podium en P1-P4', 34) + padl(pct(cmpA.auMoins1, cmpA.n), 13) + padl(pct(cmpB.auMoins1, cmpB.n), 14))
console.log('  ' + pad('les 3 du podium en P1-P4', 34) + padl(pct(cmpA.tous, cmpA.n), 13) + padl(pct(cmpB.tous, cmpB.n), 14))
console.log('  ' + pad('chevaux du podium en P1-P4', 34) + padl(cmpA.tot + '/' + 3 * cmpA.n, 13) + padl(cmpB.tot + '/' + 3 * cmpB.n, 14) + '   (le maximum possible est 3/3)')
console.log('  ⚠ « ≥ 1 » est trivialement vrai : 3 chevaux du podium, 4 cases larges.')
console.log('    Le test honnête est « les 3 » — et là le quota de 3 ne peut pas suivre.')

/* les deux corpus réunis — 122 courses : c'est la seule taille qui tranche */
const TC = new Map()
for (const T of [TA, TB]) for (const [k, v] of T) {
  const o = TC.get(k) || { n: 0, n5: 0, pod: 0 }
  o.n += v.n; o.n5 += v.n5; o.pod += v.pod
  TC.set(k, o)
}
console.log('  ' + '-'.repeat(78))
console.log('  122 courses réunies — P(podium | N) : la probabilité qu\'un cheval de cette case monte sur le podium')
for (let p = 1; p <= 4; p++) {
  const o = TC.get(p)
  if (!o) continue
  console.log('  ' + pad('P' + p, 8) + padl(o.pod + '/' + o.n, 10) + padl(pct(o.pod, o.n), 10) +
    '   ' + '█'.repeat(Math.round(30 * o.pod / o.n)) + '   (P(pod | top5) ' + pct(o.pod, o.n5) + ')')
}

/* ── ④ quater LE GLISSEMENT D'OCTOBRE ────────────────────────────────────── */
/* « Octobre montre que les bookmakers ont changé : ce qui était en P9-P10 est
 * passé en P11-P12. » On mesure la dérive, groupe par groupe, sur les deux
 * corpus. Aucune opinion : les mêmes cases, les deux périodes. */
function parGroupe(corpus) {
  const acc = {}
  for (const c of corpus) {
    const g = buildGrid(c.syn, c.nums)
    const p3 = c.arrivee.slice(0, 3)
    const p5 = c.arrivee.slice(0, 5)
    for (const gr of g.groupes) {
      const nums = new Set(gr.cases.map((k) => k.num))
      const o = acc[gr.id] || (acc[gr.id] = { n: 0, dans3: 0, dans5: 0, chev3: 0, chev5: 0, cases: 0 })
      o.n++
      o.cases += gr.cases.length
      const a3 = p3.filter((x) => nums.has(x)).length
      const a5 = p5.filter((x) => nums.has(x)).length
      if (a3) o.dans3++
      if (a5) o.dans5++
      o.chev3 += a3
      o.chev5 += a5
    }
  }
  return acc
}
const gA = parGroupe(CTRL)
const gB = parGroupe(MOIS)
/* la queue binomiale exacte : « si A était la vraie loi, quelle chance de voir
 * autant ou plus en 26 courses ? » — sans ça, une dérive de 26 courses n'est
 * qu'une impression. */
function queue(n, k, p0) {
  if (k <= 0) return 1
  let s = 0
  let c = 1
  for (let i = 0; i <= n; i++) {
    if (i >= k) s += c * Math.pow(p0, i) * Math.pow(1 - p0, n - i)
    c = c * (n - i) / (i + 1)
  }
  return s
}
console.log('\n  ④ quater LE GLISSEMENT D’OCTOBRE — le haut du carnet a-t-il bougé ?')
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('', 8) + padl('P(top5|N)', 11) + padl('P(pod|N)', 10) +
  padl('A → B', 10) + padl('p', 8) + '   lecture')
for (let p = 1; p <= 14; p++) {
  const a = TA.get(p)
  const b = TB.get(p)
  if (!a || !b || a.n < 20) continue
  const ra = a.n ? a.pod / a.n : null
  const rb = b.n ? b.pod / b.n : null
  /* la queue porte sur le top5 (l'échantillon est plus gros que le podium) */
  const q = Math.min(queue(b.n, b.n5, a.n5 / a.n), queue(b.n, b.n - b.n5, 1 - a.n5 / a.n))
  const d = 100 * (rb - ra)
  const mot = q < 0.05 ? '★ net' : q < 0.2 ? '~ faible' : 'bruit'
  console.log('  ' + pad('P' + p, 8) +
    padl(pct(a.n5, a.n) + ' → ' + pct(b.n5, b.n), 11) +
    padl(pct(a.pod, a.n) + ' → ' + pct(b.pod, b.n), 10) +
    padl((d >= 0 ? '+' : '') + d.toFixed(1).replace('.', ','), 10) +
    padl(q.toFixed(2), 8) + '   ' + (d >= 0 ? '▲ ' : '▼ ') + mot)
}
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('groupe', 8) + padl('chev. top5 / course', 20) + padl('≥1 dans le TRIO', 17) + padl('≥1 dans le top5', 17) + '   dérive (B − A)')
for (const id of GROUPES.map((x) => x.id)) {
  const a = gA[id]; const b = gB[id]
  if (!a || !b) continue
  const d3 = 100 * (b.dans3 / b.n - a.dans3 / a.n)
  console.log('  ' + pad(id, 8) +
    padl((a.chev5 / a.n).toFixed(2).replace('.', ',') + ' → ' + (b.chev5 / b.n).toFixed(2).replace('.', ','), 20) +
    padl(pct(a.dans3, a.n) + ' → ' + pct(b.dans3, b.n), 17) +
    padl(pct(a.dans5, a.n) + ' → ' + pct(b.dans5, b.n), 17) +
    '   trio ' + (d3 >= 0 ? '+' : '') + d3.toFixed(1).replace('.', ',') + ' pts')
}
console.log('  ⚠ la dérive est lue en POINTS sur 26 courses : ±10 points = ±2,6 courses.')
console.log('  ⚠ la dérive est lue en POINTS sur 26 courses : ±10 points = ±2,6 courses.')

/* d'où viennent les arrivants de G4 ? (le point exact de l'utilisateur) */
function origines(corpus, id) {
  const m = new Map()
  for (const c of corpus) {
    const g = buildGrid(c.syn, c.nums)
    const gr = g.groupes.find((x) => x.id === id)
    for (const k of gr.cases) {
      const o = m.get(k.place) || { n: 0, t5: 0 }
      o.n++
      if (c.arrivee.slice(0, 5).includes(k.num)) o.t5++
      m.set(k.place, o)
    }
  }
  return m
}
console.log('  ' + '-'.repeat(78))
console.log('  D’OÙ VIENNENT LES ARRIVANTS DE G4 — place de la case, nombre de top5')
for (const id of ['G3', 'G4']) {
  for (const [nom, corpus] of [['A', CTRL], ['B', MOIS]]) {
    const m = origines(corpus, id)
    const s = [...m.entries()].sort((x, y) => x[0] - y[0])
      .map(([p, o]) => 'P' + p + ' ' + o.t5).join(' · ')
    const tot = [...m.values()].reduce((a, o) => a + o.t5, 0)
    console.log('  ' + pad(id + ' · ' + nom, 10) + padl(tot + ' top5', 9) + '   ' + (s || '—'))
  }
}
console.log('  → si les arrivants de G4 viennent de P13, ce n’est pas P11-P12 qui monte :')
console.log('    c’est la case P13 qui tombe dans G4 par la parité.')

/* C'est la mesure qui tranche entre les deux diagnostics possibles :
 *
 *   · si l'oracle rapporte BEAUCOUP plus que la production → le choix interne
 *     a de la marge, il faut juste trouver le bon signal ;
 *   · si l'oracle rapporte ~la même chose → le choix est DÉJÀ au plafond et
 *     le défaut est ailleurs (la place des sièges, c.-à-d. le quota).
 *
 * Pour chaque bloc et chaque course on prend, parmi les cases du bloc, la
 * MEILLEURE sélection de `quota` cases (celle qui attrape le plus d'arrivants),
 * et on compare à ce que le carnet attrape. */
function plafond(corpus, regles) {
  const parBloc = {}
  for (const c of corpus) {
    const g = buildGrid(c.syn, c.nums)
    const prod = remplir(g, c, regles)
    for (const gr of g.groupes) {
      const q = gr.obligatoire ? Math.max(1, gr.quota) : gr.quota
      if (q >= gr.cases.length) continue
      const arrivees = gr.cases.map((k) => (c.arrivee.includes(k.num) ? 1 : 0))
      const total = arrivees.reduce((s, x) => s + x, 0)
      /* ce que la PRODUCTION attrape dans ce bloc */
      const d = prod.detail.find((x) => x.id === gr.id)
      const pris = d ? d.cases.filter((k) => k.pris && c.arrivee.includes(k.num)).length : 0
      /* ce qu'un choix parfait attrape */
      const oracle = Math.min(total, q)
      const o = parBloc[gr.id] || (parBloc[gr.id] = { n: 0, prod: 0, oracle: 0, arrivees: 0, jetables: 0 })
      o.n++
      o.prod += pris
      o.oracle += oracle
      o.arrivees += total
      o.jetables += Math.max(0, total - q)   // arrivants perdus même par l'oracle
    }
  }
  return parBloc
}
const plA = plafond(CTRL, PROD)
const plB = plafond(MOIS, PROD)
console.log('\n  ⑤ LE PLAFOND DU CHOIX — un choix PARFAIT aurait-il changé quelque chose ?')
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('bloc', 8) + padl('arrivants', 11) + padl('production', 11) + padl('oracle', 9) +
  padl('marge', 8) + padl('ingagnable', 13))
for (const b of GROUPES.map((g) => g.id)) {
  const o = plA[b]
  if (!o) continue
  const ob = plB[b] || { prod: 0, oracle: 0, arrivees: 0, jetables: 0 }
  console.log('  ' + pad(b, 8) + padl(o.arrivees + '+' + ob.arrivees, 11) +
    padl(o.prod + '+' + ob.prod, 11) + padl(o.oracle + '+' + ob.oracle, 9) +
    padl('+' + (o.oracle - o.prod) + '+' + (ob.oracle - ob.prod), 8) +
    padl(o.jetables + '+' + ob.jetables, 13))
}
const totProd = Object.values(plA).reduce((s, o) => s + o.prod, 0) + Object.values(plB).reduce((s, o) => s + o.prod, 0)
const totOracle = Object.values(plA).reduce((s, o) => s + o.oracle, 0) + Object.values(plB).reduce((s, o) => s + o.oracle, 0)
const totArr = Object.values(plA).reduce((s, o) => s + o.arrivees, 0) + Object.values(plB).reduce((s, o) => s + o.arrivees, 0)
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('TOTAL', 8) + padl(totArr, 11) + padl(totProd, 11) + padl(totOracle, 9) +
  padl('+' + (totOracle - totProd), 8))
console.log('  → un choix parfait rapporterait ' + (totOracle - totProd) + ' arrivants de plus' +
  ' sur ' + totArr + ' (' + pct(totProd, totArr) + ' → ' + pct(totOracle, totArr) + ').')

/* ── et combien de fois le carnet garde une case VIDE alors qu'il jette une
 *    case PLEINE — c'est la définition exacte d'un « mauvais choix » ────── */
function mauvaisChoix(corpus) {
  let mauvais = 0
  let blocN = 0
  let sansObjet = 0
  for (const c of corpus) {
    const g = buildGrid(c.syn, c.nums)
    for (const gr of g.groupes) {
      const q = gr.obligatoire ? Math.max(1, gr.quota) : gr.quota
      if (q >= gr.cases.length) continue
      blocN++
      const ordre = gr.cases.slice().sort((a, b) => a.place - b.place)
      const gardes = ordre.slice(0, q)
      const jetes = ordre.slice(q)
      const gardeArrive = gardes.some((k) => c.arrivee.includes(k.num))
      const jeteArrive = jetes.some((k) => c.arrivee.includes(k.num))
      if (jeteArrive && !gardeArrive) mauvais++
      if (!jeteArrive) sansObjet++   // aucun arrivant jeté : rien à réparer
    }
  }
  return { mauvais, blocN, sansObjet }
}
const mcA = mauvaisChoix(CTRL)
const mcB = mauvaisChoix(MOIS)
const mc = { mauvais: mcA.mauvais + mcB.mauvais, blocN: mcA.blocN + mcB.blocN, sansObjet: mcA.sansObjet + mcB.sansObjet }
console.log('\n  ' + pad('blocs jugés (2 corpus)', 34) + padl(mc.blocN, 6))
console.log('  ' + pad('le carnet jette un arrivant du bloc', 34) + padl(mc.blocN - mc.sansObjet, 6) + '   ' + pct(mc.blocN - mc.sansObjet, mc.blocN))
console.log('  ' + pad('… et garde une case VIDE', 34) + padl(mc.mauvais, 6) + '   ' + pct(mc.mauvais, mc.blocN) + ' des blocs')
console.log('  ' + pad('… mais tous les gardés arrivent', 34) + padl((mc.blocN - mc.sansObjet) - mc.mauvais, 6) + '   (le bloc était plein de toute façon)')

/* ─────────────────────────────── ⑦ le verdict ─────────────────────────── */
const retenus = resultats.filter((r) =>
  r.dX5A >= 0 && r.dX5B >= 0 && r.dPodA >= 0 && r.dPodB >= 0 &&
  r.dPH_A >= 0 && r.dPH_B >= 0 &&
  (r.dX5A > 0 || r.dX5B > 0 || r.dPH_A > 0 || r.dPH_B > 0) &&
  r.pA.x5 >= 0.9 && r.pB.x5 >= 0.75)
console.log('\n  ⑤ VERDICT — une règle n’entre que si elle ne perd RIEN sur les deux corpus')
console.log('  ' + '-'.repeat(78))
if (!retenus.length) {
  console.log('  aucune règle ne passe le filtre (x/5 ≥ partout, podium entier ≥ partout,')
  console.log('  chevaux du podium ≥ partout, bootstrap ≥ 90 % sur A et ≥ 75 % sur B).')
} else {
  for (const r of retenus) {
    console.log('  ✓ ' + pad(r.bloc + ' → ' + r.regle, 22) +
      'cas A ' + (r.pA.x5 * 100).toFixed(0) + ' % · cas B ' + (r.pB.x5 * 100).toFixed(0) + ' %' +
      '   ·  x/5 ' + nr(r.a.x5) + ' (A) / ' + nr(r.b.x5) + ' (B)')
  }
}

/* la meilleure combinaison, si plusieurs règles gagnent sur des blocs différents */
const meilleur = {}
for (const r of retenus) {
  if (!meilleur[r.bloc] || r.pA.x5 > meilleur[r.bloc].pA.x5) meilleur[r.bloc] = r
}
const COMB = { ...PROD, ...Object.fromEntries(Object.entries(meilleur).map(([k, v]) => [k, v.regle])) }
const cA = base(noter(CTRL, COMB))
const cB = base(noter(MOIS, COMB))
console.log('\n  combinaison retenue : ' + GROUPES.map((g) => g.id + ' ' + COMB[g.id]).join(' · '))
console.log('  ' + pad('corpus A', 12) + 'x/5 ' + nr(cA.x5) + '   ·   5/5 ' + nr(cA.q5) + ' %   ·   podium ' + nr(cA.pod) + ' %' +
  '   (production : ' + nr(bA.x5) + ' · ' + nr(bA.q5) + ' % · ' + nr(bA.pod) + ' %)')
console.log('  ' + pad('corpus B', 12) + 'x/5 ' + nr(cB.x5) + '   ·   5/5 ' + nr(cB.q5) + ' %   ·   podium ' + nr(cB.pod) + ' %' +
  '   (production : ' + nr(bB.x5) + ' · ' + nr(bB.q5) + ' % · ' + nr(bB.pod) + ' %)')

/* ── ⑥ L'ADOPTION — ce que l'échange fort a changé, contre la règle d'AVANT ── */
/* On garde la comparaison historique : production du 20→28/10 (G3 carnet,
 * G5 marché) CONTRE la règle adoptée le 29/10 (§11.52). Rejouable même quand
 * la production aura changé. */
const AVANT = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' }
const DYN = { G1: 'carnet', G2: 'carnet', G3: 'echange20', G4: 'marche', G5: 'echange20' }
{
  const pA = base(noter(CTRL, AVANT))
  const pB = base(noter(MOIS, AVANT))
  const dA = base(noter(CTRL, DYN))
  const dB = base(noter(MOIS, DYN))
  const nA = noter(CTRL, DYN)
  const n0 = noter(CTRL, AVANT)
  const b = boot(nA.map((x, i) => ({ dx5: x.x5 - n0[i].x5, dpod: (x.pod ? 1 : 0) - (n0[i].pod ? 1 : 0) })))
  console.log('\n  ⑥ L’ADOPTION DE L’ÉCHANGE FORT (§11.52) — G3 et G5')
  console.log('  ' + '-'.repeat(78))
  console.log('  règle : le carnet garde son ordre, SAUF si la cote de cette course dit')
  console.log('          qu’un cheval du bloc est ≥ 2 fois plus court que celui du dessus.')
  console.log('  ' + pad('', 14) + padl('x/5', 8) + padl('5/5', 10) + padl('podium', 10) + padl('chev. podium', 14))
  console.log('  ' + pad('A avant', 14) + padl(nr(pA.x5), 8) + padl(nr(pA.q5) + ' %', 10) + padl(nr(pA.pod) + ' %', 10) + padl(nr(pA.podH) + ' %', 14))
  console.log('  ' + pad('A adopté', 14) + padl(nr(dA.x5), 8) + padl(nr(dA.q5) + ' %', 10) + padl(nr(dA.pod) + ' %', 10) + padl(nr(dA.podH) + ' %', 14))
  console.log('  ' + pad('B avant', 14) + padl(nr(pB.x5), 8) + padl(nr(pB.q5) + ' %', 10) + padl(nr(pB.pod) + ' %', 10) + padl(nr(pB.podH) + ' %', 14))
  console.log('  ' + pad('B adopté', 14) + padl(nr(dB.x5), 8) + padl(nr(dB.q5) + ' %', 10) + padl(nr(dB.pod) + ' %', 10) + padl(nr(dB.podH) + ' %', 14))
  console.log('  bootstrap A : x/5 mieux dans ' + (100 * b.x5).toFixed(1).replace('.', ',') + ' % · podium mieux dans ' +
    (100 * b.pod).toFixed(1).replace('.', ',') + ' %')
  console.log('  → jamais négatif sur les 4 métriques des 2 corpus, mais l’effet est PETIT :')
  console.log('    ' + nr(dA.q5 - pA.q5) + ' pt de 5/5 (' + nr(dA.pod - pA.pod) + ' pt de podium) sur 96 courses.')
  /* combien de TICKETS changent réellement ? c'est la réponse à « rien n'a bougé » */
  let chg = 0, chgCh = 0, tot = 0
  for (const corpus of [CTRL, MOIS]) {
    for (const c of corpus) {
      const g = buildGrid(c.syn, c.nums)
      const cl = g.groupes.flatMap((x) => x.cases).slice().sort((a, b) => a.slot - b.slot)
        .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
      const t0 = remplirGrille(g, cl, c.discipline || 'Plat', c.cotes, null, AVANT).ticket
      const t1 = remplirGrille(g, cl, c.discipline || 'Plat', c.cotes, null, DYN).ticket
      tot++
      const dif = t1.filter((n) => !t0.includes(n)).length
      if (dif) { chg++; chgCh += dif }
    }
  }
  console.log('  ' + pad('tickets qui changent', 34) + padl(chg + '/' + tot, 10) + '   ' + pct(chg, tot) +
    ' · ' + chgCh + ' chevaux remplacés')
  console.log('  → c’est ça la réponse à « le ticket n’a pas bougé » : la règle ne se')
  console.log('    déclenche que quand le marché est DEUX FOIS plus court, ce qui est rare.')
}

fs.writeFileSync('data/choix-interne.json', JSON.stringify({
  quand: new Date().toISOString(),
  quotas: GROUPES.map((g) => g.id + '=' + g.quota),
  temoin: { koA, koB, identiques: koA + koB === 0 },
  production: { choix: PROD, A: bA, B: bB },
  resultats: resultats.map((r) => ({
    bloc: r.bloc, regle: r.regle,
    A: r.a, B: r.b,
    delta: { x5A: r.dX5A, x5B: r.dX5B, q5A: r.dQ5A, q5B: r.dQ5B, podA: r.dPodA, podB: r.dPodB, podHA: r.dPH_A, podHB: r.dPH_B },
    bootstrap: { A: r.pA, B: r.pB },
  })),
  retenus: retenus.map((r) => ({ bloc: r.bloc, regle: r.regle })),
  plafond: {
    parBloc: Object.fromEntries(GROUPES.map((g) => [g.id, {
      A: plA[g.id] || null, B: plB[g.id] || null,
      marge: (plA[g.id]?.oracle ?? 0) - (plA[g.id]?.carnet ?? 0) + (plB[g.id]?.oracle ?? 0) - (plB[g.id]?.carnet ?? 0),
    }])),
    totaux: { production: totProd, oracle: totOracle, marge: totOracle - totProd, arrivants: totArr },
    mauvaisChoix: mc,
  },
  combinaison: { choix: COMB, A: cA, B: cB },
  podiumG1: {
    note: 'P(podium | cas) par rang de presse — le critere demande par l utilisateur',
    A: Object.fromEntries([1, 2, 3, 4].map((p) => [p, TA.get(p) ? { n: TA.get(p).n, pod: TA.get(p).pod } : null])),
    B: Object.fromEntries([1, 2, 3, 4].map((p) => [p, TB.get(p) ? { n: TB.get(p).n, pod: TB.get(p).pod } : null])),
    reunis: Object.fromEntries([1, 2, 3, 4].map((p) => [p, TC.get(p) ? { n: TC.get(p).n, pod: TC.get(p).pod } : null])),
    podiumEntierDansG1: { A: pdA.dansG1 / pdA.n, B: pdB.dansG1 / pdB.n },
    auMoinsUnDansP1P4: { A: cmpA.auMoins1 / cmpA.n, B: cmpB.auMoins1 / cmpB.n },
  },
}, null, 1))
try { fs.writeFileSync('public/data/choix-interne.json', fs.readFileSync('data/choix-interne.json')) } catch { /* pas de page */ }
console.log('\n  artefact : data/choix-interne.json\n')
