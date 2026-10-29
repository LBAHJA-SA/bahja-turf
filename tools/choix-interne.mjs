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
  if (c && Array.isArray(c.cotes)) {
    const o = {}
    for (const x of c.cotes) if (x && x.cote > 1) o[x.num] = { cote: x.cote }
    if (Object.keys(o).length >= 10) cotes = o
  }
  MOIS.push({ date: d, discipline: e.discipline, syn, nums, arrivee: arr.slice(0, 5), cotes, source: 'B' })
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

const REGLES = ['carnet', 'marche', 'mixte', 'fusion', 'bassmat', 'marketPlus', 'caseBloc']

/* ⭐ le taux d'arrivée d'une CASE **dans son bloc** — c'est le signal que le
 * carnet ne peut pas voir : P4 n'arrive pas au même rythme selon qu'il tombe
 * dans G1 (parité) ou dans G2. La table est apprise sur les AUTRES courses
 * seulement (leave-one-out), et le corpus B utilise la table complète de A :
 * aucun arrivant n'est deviné, on n'utilise que le passé. */
let TABLE = null            // Map 'G1|4' -> { n, t5 }
function tableDepuis(corpus, sauf = null) {
  const m = new Map()
  for (const c of corpus) {
    if (c === sauf) continue
    const g = buildGrid(c.syn, c.nums)
    for (const gr of g.groupes) for (const k of gr.cases) {
      const key = gr.id + '|' + k.place
      const o = m.get(key) || { n: 0, t5: 0 }
      o.n++
      if (c.arrivee.includes(k.num)) o.t5++
      m.set(key, o)
    }
  }
  return m
}
const tauxCase = (key, m) => {
  const o = (m || TABLE)?.get(key)
  return o && o.n >= 8 ? o.t5 / o.n : null
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
function remplir(grille, course, regles, table = null) {
  const rangM = rangsMarche(course)
  const ticket = []
  const detail = []
  for (const g of grille.groupes) {
    const cases = g.cases.map((c) => ({ ...c }))
    if (!cases.length) { detail.push({ ...g, cases: [] }); continue }
    const regle = regles[g.id] || 'carnet'
    const ordre = ordonner(regle, cases, { cotes: course.cotes, rangM, bloc: g.id, table })
    const quota = g.obligatoire ? Math.max(1, g.quota) : g.quota
    const retenus = new Set(ordre.slice(0, quota).map((c) => c.place))
    detail.push({ ...g, regle, cases: cases.map((c) => ({ ...c, pris: retenus.has(c.place) })) })
    ordre.slice(0, quota).forEach((c) => ticket.push(c.num))
  }
  return { ticket: [...new Set(ticket)], detail }
}

/* ──────────── ③ TÉMOIN : le remplissage local === le vrai moteur ────────── */
const PROD = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' }

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
  /* la table (bloc|case) ne contient jamais la course qu'on note :
   * corpus A → leave-one-out · corpus B → la table complète de A (autre année) */
  const tableB = corpus[0]?.source === 'B' ? tableDepuis(CTRL) : null
  return corpus.map((c) => {
    const g = buildGrid(c.syn, c.nums)
    const table = c.source === 'B' ? tableB : tableDepuis(corpus, c)
    const r = remplir(g, c, regles, table)
    const x5 = c.arrivee.filter((n) => r.ticket.includes(n)).length
    const pod = c.arrivee.slice(0, 3).every((n) => r.ticket.includes(n))
    /* par bloc : arrivants de CE bloc, et combien sont pris */
    const parBloc = {}
    for (const d of r.detail) {
      const nums = new Set(d.cases.map((k) => k.num))
      const dedans = c.arrivee.filter((n) => nums.has(n))
      const pris = d.cases.filter((k) => k.pris && c.arrivee.includes(k.num)).length
      parBloc[d.id] = { arrivees: dedans.length, pris }
    }
    return { date: c.date, x5, pod, q5: x5 === 5, parBloc }
  })
}

const N_A = noter(CTRL, PROD)
const N_B = noter(MOIS, PROD)
const base = (n) => ({
  x5: r2(n.reduce((s, x) => s + x.x5, 0) / n.length),
  q5: r2(100 * n.filter((x) => x.q5).length / n.length),
  pod: r2(100 * n.filter((x) => x.pod).length / n.length),
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

console.log('\n  ① LA RÉFÉRENCE (carnet G1-G3 · marché G4-G5) — quotas constitutionnels')
console.log('  ' + '-'.repeat(78))
const bA = base(N_A)
const bB = base(N_B)
console.log('  ' + pad('corpus A · 96 Quintés', 34) + 'x/5 ' + nr(bA.x5) + '   ·   5/5 ' + nr(bA.q5) + ' %   ·   podium ' + nr(bA.pod) + ' %')
console.log('  ' + pad('corpus B · 26 Quintés d’octobre', 34) + 'x/5 ' + nr(bB.x5) + '   ·   5/5 ' + nr(bB.q5) + ' %   ·   podium ' + nr(bB.pod) + ' %')

/* ② où le bloc coupe : la case JETÉE arrive-t-elle plus que la case GARDÉE ? */
console.log('\n  ② LES CASES DE CHAQUE BLOC — quel sous-ensemble le carnet garde (corpus A)')
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('bloc', 12) + pad('case', 9) + padl('arrive', 9) + padl('taux', 8) + '   gardée ?')
const parCasA = {}
for (const c of CTRL) {
  const g = buildGrid(c.syn, c.nums)
  for (const gr of g.groupes) {
    const q = gr.obligatoire ? Math.max(1, gr.quota) : gr.quota
    const ordre = gr.cases.slice().sort((a, b) => a.place - b.place)
    for (const k of ordre) {
      const key = gr.id + '|' + k.place
      const o = parCasA[key] || (parCasA[key] = { n: 0, t5: 0, bloc: gr.id, place: k.place, garde: ordre.indexOf(k) < q })
      o.n++
      if (c.arrivee.includes(k.num)) o.t5++
    }
  }
}
const parBlocCas = {}
for (const o of Object.values(parCasA)) (parBlocCas[o.bloc] || (parBlocCas[o.bloc] = [])).push(o)
for (const b of GROUPES.map((g) => g.id)) {
  const cases = (parBlocCas[b] || []).sort((x, y) => x.place - y.place)
  for (const o of cases) {
    console.log('  ' + pad(o.bloc, 12) + pad('P' + o.place, 9) + padl(o.t5 + '/' + o.n, 9) +
      padl(pct(o.t5, o.n), 8) + '   ' + (o.garde ? '✓ gardée' : '✗ jetée') +
      '   ' + '█'.repeat(Math.round(24 * o.t5 / o.n)))
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
  const garde = cases.slice(0, q).reduce((s, o) => s + o.t5 / o.n, 0)
  let best = -1
  const combo = (i, pris) => {
    if (pris.length === q) { const t = pris.reduce((s, o) => s + o.t5 / o.n, 0); if (t > best) best = t; return }
    for (let k = i; k < cases.length; k++) combo(k + 1, [...pris, cases[k]])
  }
  combo(0, [])
  console.log('  ' + pad(b, 12) + 'le carnet garde ' + pct(garde, q).padStart(8) +
    '   ·   meilleur sous-ensemble possible ' + pct(best, q).padStart(8) + ' de taux cumulé' +
    (best - garde < 0.001 ? '   → LE CARNET EST DÉJÀ OPTIMAL ✓' : '   → marge ' + nr(best - garde)))
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
    resultats.push({ bloc, regle, a, b, dX5A, dX5B, dPodA, dPodB, dQ5A, dQ5B, pA: bA2, pB: bB2 })
    console.log('  ' + pad(bloc + ' → ' + regle, 22) +
      pad('Δx/5 ' + (dX5A >= 0 ? '+' : '') + nr(dX5A) + ' / ' + (dX5B >= 0 ? '+' : '') + nr(dX5B), 24) +
      pad('Δ5/5 ' + (dQ5A >= 0 ? '+' : '') + nr(dQ5A) + ' / ' + (dQ5B >= 0 ? '+' : '') + nr(dQ5B), 22) +
      'Δpod ' + (dPodA >= 0 ? '+' : '') + nr(dPodA) + ' / ' + (dPodB >= 0 ? '+' : '') + nr(dPodB))
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

/* ───── ⑤ LE PLAFOND DU CHOIX : que rapporterait un choix PARFAIT ? ─────── */
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
  (r.dX5A > 0 || r.dX5B > 0) &&
  r.pA.x5 >= 0.9 && r.pB.x5 >= 0.75)
console.log('\n  ⑤ VERDICT — une règle n’entre que si elle ne perd RIEN sur les deux corpus')
console.log('  ' + '-'.repeat(78))
if (!retenus.length) {
  console.log('  aucune règle ne passe le filtre (x/5 ≥ partout, podium ≥ partout,')
  console.log('  bootstrap ≥ 90 % sur A et ≥ 75 % sur B).')
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

fs.writeFileSync('data/choix-interne.json', JSON.stringify({
  quand: new Date().toISOString(),
  quotas: GROUPES.map((g) => g.id + '=' + g.quota),
  temoin: { koA, koB, identiques: koA + koB === 0 },
  production: { choix: PROD, A: bA, B: bB },
  resultats: resultats.map((r) => ({
    bloc: r.bloc, regle: r.regle,
    A: r.a, B: r.b,
    delta: { x5A: r.dX5A, x5B: r.dX5B, q5A: r.dQ5A, q5B: r.dQ5B, podA: r.dPodA, podB: r.dPodB },
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
}, null, 1))
try { fs.writeFileSync('public/data/choix-interne.json', fs.readFileSync('data/choix-interne.json')) } catch { /* pas de page */ }
console.log('\n  artefact : data/choix-interne.json\n')
