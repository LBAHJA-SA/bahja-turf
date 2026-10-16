/* =============================================================================
 * tools/audit-engine.mjs — AUDIT + VALIDATION HORS ÉCHANTILLON (16/10/2026).
 *
 * Réponse au cahier des charges utilisateur :
 *   A. AUDIT DE L'ARCHIVE      — intégrité (ordre du carnet, numéros, données
 *                                manquantes), course par course.
 *   B. LES 4 TESTS D'EMPREINTE — séparés, jamais fusionnés.
 *   C. WALK-FORWARD            — stats des courses STRICTEMENT antérieures, puis
 *                                on remplit la course suivante SANS sa donnée.
 *   D. DISSECTION              — les courses où le gagnant manque, cause par cause.
 *   E. COMPARAISON À DES RÉFÉRENCES SIMPLES (mêmes courses, même taille de
 *      ticket = 8) : top-8 par cote, 8 premiers de la Synthèse, + variantes.
 *
 * Règles : aucun poids inventé ; la walk-forward est la seule mesure de perf ;
 *         à périmètre égal (on ne compare que les courses évaluables partout).
 *
 * Usage : node tools/audit-engine.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, classerPhysique, computeStats, remplirGrille } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const eq = fs.existsSync('data/cotes.json') ? JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) : {}

const recs = Object.values(db)
  .filter((r) => (r.arrivee || []).length >= 5 && (r.synthese || []).length)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

const coteDe = (cotes, num) => {
  const v = cotes?.[num]
  const x = Number(typeof v === 'object' ? (v?.cote ?? null) : v)
  return Number.isFinite(x) && x > 0 ? x : null
}
/* ⚠ la page identifie le marché par `cle` (pas `courseId`, qui est l'id
 *   casacourses et reste parfois numérique — cf. 08/10 et 15/10). */
const RE_CLE = /^\d{4}-\d{2}-\d{2}_R\d+_C\d+$/
const cleDe = (r) => (RE_CLE.test(String(r.cle || '')) ? String(r.cle) : RE_CLE.test(String(r.courseId || '')) ? String(r.courseId) : null)
const cotesDe = (r) => Object.fromEntries((eq[cleDe(r)]?.cotes || []).map((x) => [x.num, x]))
const podMap = (stats) => {
  const m = new Map()
  for (const b of stats?.podiumBloc || []) for (const d of b.detail || []) m.set(d.p, (d.n || 0) / Math.max(1, stats.nb))
  return m
}
const forceDe = (stats, slot) => {
  const st = (stats?.parPlace || [])[slot - 1]
  if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return 0
  let best = 0
  for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[best] ?? 0)) best = k
  return (st.p[best] ?? 0) > 0 ? st.p[best] / 100 : 0
}

/* ── remplissage par blocs (quotas 3-2-1-1-1), score au choix ─────────────── */
function remplir(grille, classement, cotes, stats, score) {
  const rang = new Map(classement.map((x, i) => [x.p.num, i]))
  const pod = podMap(stats)
  const ticket = []
  for (const g of grille.groupes) {
    const cases = g.cases.map((c) => ({ ...c }))
    if (!cases.length) continue
    const connues = cases.filter((c) => coteDe(cotes, c.num) != null).map((c) => coteDe(cotes, c.num))
    const cMin = connues.length ? Math.min(...connues) : 0
    const cMax = connues.length ? Math.max(...connues) : 0
    const x = {
      mkt: (c) => { const v = coteDe(cotes, c.num); return v == null || !(cMax > cMin) ? 0.5 : (cMax - v) / (cMax - cMin) },
      rang: (c) => rang.get(c.num),
      pod: (c) => pod.get(c.slot) ?? 0,
      force: (c) => forceDe(stats, c.slot),
      slot: (c) => c.slot,
    }
    cases.slice().sort((a, b) => (score(b, x) - score(a, x)) || (a.slot - b.slot)).slice(0, g.quota).forEach((c) => ticket.push(c.num))
  }
  return [...new Set(ticket)]
}
const VARIANTES = {
  'R8 force+marche (ancien)': (c, x) => 0.9 * x.force(c) + 0.1 * x.mkt(c),
  'podium (avant-dernier)': (c, x) => 0.9 * x.pod(c) + 0.1 * x.mkt(c),
  'force seul': (c, x) => x.force(c),
  'cote seule': (c, x) => x.mkt(c),
  'physique (carriere)': (c, x) => -(x.rang(c) ?? 999),
  'carnet (cases)': (c, x) => -x.slot(c),
}

/* ── RÈGLE §11.17 (le marché) : (quota−1) meilleures cotes + ★ la surprise ──
 * La surprise = le cheval que la presse cite LE MOINS parmi ceux que la cote a
 * écartés (rang de cote ≥ quota). Un bloc sans cote complète retombe sur le
 * classement (physique → carnet), jamais sur un tri partiel. */
function remplir117(grille, classement, cotes, stats, mode = 'presse') {
  const rang = new Map(classement.map((x, i) => [x.p.num, i]))
  const pod = podMap(stats)
  const meilleur = (arr) => {
    let best = arr[0]
    for (const c of arr.slice(1)) {
      // ★ la surprise = le cheval que la presse cite LE MOINS = le plus grand
      // RANG DE PRESSE (`place` = parNum), pas la colonne du carnet (`slot`).
      if (mode === 'presse') { if (c.place > best.place) best = c; continue }
      const val = (x) => (mode === 'force' ? forceDe(stats, x.slot) : (pod.get(x.slot) ?? 0))
      const d = val(c) - val(best)
      if (d > 0 || (d === 0 && c.place > best.place)) best = c
    }
    return best
  }
  const ticket = []
  for (const g of grille.groupes) {
    const cases = g.cases
    if (!cases.length) continue
    const complet = cases.every((c) => coteDe(cotes, c.num) != null)
    if (!complet) {
      cases.slice().sort((a, b) => ((rang.get(a.num) ?? 999) - (rang.get(b.num) ?? 999)) || (a.slot - b.slot)).slice(0, g.quota).forEach((c) => ticket.push(c.num))
      continue
    }
    const tri = cases.slice().sort((a, b) => coteDe(cotes, a.num) - coteDe(cotes, b.num))
    if (g.quota === 1) { ticket.push(tri[0].num); continue }
    tri.slice(0, g.quota - 1).forEach((c) => ticket.push(c.num))
    const ecartes = tri.slice(g.quota)
    ticket.push(meilleur(ecartes.length ? ecartes : tri.slice(g.quota - 1)).num)
  }
  return [...new Set(ticket)]
}

/* variantes « §11.17 » : seule change la façon de désigner ★ la surprise */
const VARIANTES_G = {
  '§11.17 (presse)': (gr, cl, co, st) => remplir117(gr, cl, co, st, 'presse'),
  '§11.17 + surprise force': (gr, cl, co, st) => remplir117(gr, cl, co, st, st ? 'force' : 'presse'),
  '§11.17 + surprise podium': (gr, cl, co, st) => remplir117(gr, cl, co, st, st ? 'stats' : 'presse'),
}

/* ── références globales (aucune règle, aucun apprentissage) ─────────────── */
const baselines = (r) => {
  const cotes = cotesDe(r)
  const nums = (r.runners || []).filter(Number.isFinite)
  const parCote = nums.filter((n) => coteDe(cotes, n) != null).sort((a, b) => coteDe(cotes, a) - coteDe(cotes, b))
  return {
    'TOP-8 Synthese': (r.synthese || []).slice(0, 8),
    'TOP-8 cote': parCote.length >= 8 ? parCote.slice(0, 8) : null,
  }
}
const nbCotes = (r) => (r.runners || []).filter((n) => coteDe(cotesDe(r), n) != null).length

/* ═══════════════════════ A. AUDIT D'INTÉGRITÉ ═══════════════════════════ */
console.log('\n' + '='.repeat(112))
console.log("  A. AUDIT DE L'ARCHIVE — " + recs.length + ' courses')
console.log('='.repeat(112))
console.log('  date        synth  arrivée        nums⊂grille  doublon  marché/bloc (chevaux sans cote)   cotes')
console.log('  ' + '-'.repeat(108))
for (const r of recs) {
  const grille = buildGrid(r.synthese, r.runners)
  const cotes = cotesDe(r)
  const arr = (r.arrivee || []).slice(0, 5)
  const vus = new Set(); let dbl = 0
  for (const n of r.arrivee) { if (vus.has(n)) dbl++; else vus.add(n) }
  const absents = arr.filter((n) => grille.slotParNum[n] == null)
  const parBloc = grille.groupes.map((g) => {
    const sans = g.cases.filter((c) => coteDe(cotes, c.num) == null).length
    return g.id + ':' + (sans ? '−' + sans : 'ok')
  }).join(' ')
  console.log('  ' + r.date + '  ' + String((r.synthese || []).length).padStart(3)
    + '   ' + arr.join('-').padEnd(14)
    + '  ' + (absents.length ? '⚠ ' + absents.join(',') : 'ok').padEnd(12)
    + '  ' + (dbl ? '⚠ ' + dbl : 'ok').padEnd(8)
    + '  ' + parBloc.padEnd(34) + '  ' + nbCotes(r) + '/' + (r.runners || []).length)
}

/* ═══════════════════════ B. LES 4 TESTS D'EMPREINTE ═════════════════════ */
const statsAll = computeStats(recs)
console.log('\n' + '='.repeat(112))
console.log('  B. EMPREINTE — 4 tests INDÉPENDANTS (jamais fusionnés), base = le carnet')
console.log('='.repeat(112))
console.log('  test                      n   non éval.   tous top3%   tous top5%   ≥1 top3%   période')
console.log('  ' + '-'.repeat(110))
for (const t of statsAll.empreinte) {
  console.log('  ' + t.label.padEnd(24) + String(t.n).padStart(4) + String(t.nonEvaluables).padStart(11)
    + String(t.top3 == null ? '—' : t.top3).padStart(12) + String(t.top5 == null ? '—' : t.top5).padStart(12)
    + String(t.un == null ? '—' : t.un).padStart(11) + '   ' + (t.debut && t.fin ? t.debut + ' → ' + t.fin : '—'))
}

/* ═══════════════════════ C. WALK-FORWARD — détail par course ════════════ */
const rows = []
for (let i = 0; i < recs.length; i++) {
  const r = recs[i]
  const stats = i ? computeStats(recs.slice(0, i)) : null
  const grille = buildGrid(r.synthese, r.runners)
  const brut = (r.scores || []).map((s) => ({ p: { num: s.num }, s, ok: (s.filtres || []).every((x) => x) }))
  const classement = brut.length ? classerPhysique(brut) : []
  const cotes = cotesDe(r)
  const arr = (r.arrivee || []).slice(0, 5)
  const tkReel = stats ? remplirGrille(grille, classement, r.discipline, cotes, stats).ticket : null
  const row = { date: r.date, arr, nStats: i, tk: {}, win: {}, trio: {}, cause: null }
  for (const [nom, score] of Object.entries(VARIANTES)) row.tk[nom] = stats ? remplir(grille, classement, cotes, stats, score) : null
  for (const [nom, f] of Object.entries(VARIANTES_G)) row.tk[nom] = stats ? f(grille, classement, cotes, stats) : remplir117(grille, classement, cotes, null, 'presse')
  for (const [nom, T] of Object.entries(baselines(r))) row.tk[nom] = T
  /* le VRAI moteur (remplirGrille) — c'est lui qui fait foi */
  row.tk['★ MOTEUR RÉEL'] = stats ? remplirGrille(grille, classement, r.discipline, cotes, stats).ticket : null
  for (const [nom, T] of Object.entries(row.tk)) {
    if (!T || !T.length) continue
    row.win[nom] = T.includes(arr[0])
    row.trio[nom] = arr.slice(0, 3).every((n) => T.includes(n))
  }
  if (tkReel && !tkReel.includes(arr[0])) row.cause = dissect(r, grille, cotes, tkReel)
  rows.push(row)
}

function dissect(r, grille, cotes, ticket) {
  const arr = (r.arrivee || []).slice(0, 5)
  const win = arr[0]
  const wp = grille.slotParNum[win] ?? null
  const wg = grille.groupes.find((g) => g.cases.some((c) => c.num === win))
  const wcote = coteDe(cotes, win)
  const gc = wg ? wg.cases.map((c) => ({ num: c.num, cote: coteDe(cotes, c.num) })).filter((c) => c.cote != null).sort((a, b) => a.cote - b.cote) : []
  const rangCote = gc.findIndex((c) => c.num === win)
  if (wp == null) return { win, wp, wg: 'hors grille', gCaseCount: 0, wcote, rangCote, cause: 'donnée : gagnant hors grille' }
  if (wcote == null) return { win, wp, wg: wg ? wg.id : '?', gCaseCount: wg ? wg.cases.length : 0, wcote, rangCote, cause: 'donnée : gagnant sans cote (bloc rempli au carnet)' }
  if (rangCote >= 0 && rangCote >= wg.quota) return { win, wp, wg: wg.id, gCaseCount: wg.cases.length, wcote, rangCote, cause: 'sélection : rang cote ' + (rangCote + 1) + ' > quota ' + wg.quota + ' de ' + wg.id }
  return { win, wp, wg: wg.id, gCaseCount: wg.cases.length, wcote, rangCote, cause: 'sélection : ' + (rangCote >= 0 ? 'rang cote ' + (rangCote + 1) + ' ≤ quota' : 'hors quota') + ' mais score écarté' }
}

const M = ['★ MOTEUR RÉEL', ...Object.keys(VARIANTES), ...Object.keys(VARIANTES_G), 'TOP-8 Synthese', 'TOP-8 cote']
console.log('\n' + '='.repeat(112))
console.log("  C. WALK-FORWARD — la course testée n'entre JAMAIS dans ses propres statistiques")
console.log('  ⚠ MÉTRIQUE x/5 — SUPERSEDED. §11.18 (280 Quintés) : « 3/5 est une perte sèche ».')
console.log('    La mesure qui fait foi est PAYANTE (1-2-3 complet) → tools/mesure-moteur.mjs')
console.log('='.repeat(112))
console.log('  date        n<stats  arrivée        ' + ['force', 'podium', 'f.seul', 'cote', 'phy', 'carnet', '117pr', '+force', '+pod'].map((c) => c.padStart(7)).join('') + '   | TOP8syn  TOP8cote | 1er')
console.log('  ' + '-'.repeat(124))
for (const row of rows) {
  const cells = ['R8 force+marche (ancien)', 'podium (avant-dernier)', 'force seul', 'cote seule', 'physique (carriere)', 'carnet (cases)', '§11.17 (presse)', '§11.17 + surprise force', '§11.17 + surprise podium']
    .map((nom) => { const T = row.tk[nom]; return (T ? row.arr.filter((n) => T.includes(n)).length + '/5' : '—').padStart(7) })
  const b1 = row.tk['TOP-8 Synthese'] ? row.arr.filter((n) => row.tk['TOP-8 Synthese'].includes(n)).length + '/5' : '—'
  const b2 = row.tk['TOP-8 cote'] ? row.arr.filter((n) => row.tk['TOP-8 cote'].includes(n)).length + '/5' : '—'
  const g = row.win['★ MOTEUR RÉEL'] == null ? '—' : row.win['★ MOTEUR RÉEL'] ? '★' : '✗'
  console.log('  ' + row.date + String(row.nStats).padStart(8) + '   ' + row.arr.join('-').padEnd(14) + cells.join('')
    + '   | ' + b1.padStart(6) + '  ' + b2.padStart(7) + '   |  ' + g)
}

/* ═══════════════════════ E. TOTAUX à PÉRIMÈTRE ÉGAL ═════════════════════ */
const agg = (set, nom) => {
  let hits = 0, n5 = 0, n = 0, win = 0, trio = 0
  const d = {}
  for (const row of set) {
    const T = row.tk[nom]; if (!T || !T.length) continue
    const h = row.arr.filter((x) => T.includes(x)).length
    hits += h; d[h] = (d[h] || 0) + 1; n++; n5 += 5
    if (row.win[nom]) win++
    if (row.trio[nom]) trio++
  }
  return { hits, n5, n, d, win, trio }
}
const scopes = [
  ['13 COURSES évaluables (walk-forward, moteur)', rows.filter((r) => r.nStats >= 1)],
  ['14 COURSES (toutes, marché complet)', rows],
]
for (const [titre, set] of scopes) {
  console.log('\n' + '='.repeat(112))
  console.log('  E. TOTAUX — ' + titre + '   (ticket = 8 chevaux)')
  console.log('='.repeat(112))
  console.log('  ' + 'méthode'.padEnd(24) + 'x/5      moy     5/5 4/5 3/5 2/5 1/5 0/5   1er     trio')
  console.log('  ' + '-'.repeat(108))
  const lignes = M.map((nom) => [nom, agg(set, nom)]).filter(([, o]) => o.n)
  lignes.sort((a, b) => (b[1].hits / b[1].n5) - (a[1].hits / a[1].n5))
  for (const [nom, o] of lignes) {
    console.log('  ' + nom.padEnd(24) + (o.hits + '/' + o.n5).padEnd(9) + (o.hits / o.n5).toFixed(3).padStart(6)
      + [5, 4, 3, 2, 1, 0].map((k) => String(o.d[k] || 0).padStart(4)).join('')
      + String(o.win + '/' + o.n).padStart(7) + String(o.trio + '/' + o.n).padStart(9))
  }
}

/* ═══════════════════════ D. DISSECTION DES ÉCHECS DU GAGNANT ════════════ */
console.log('\n' + '='.repeat(112))
console.log('  D. DISSECTION — gagnant ABSENT du ticket du MOTEUR RÉEL (walk-forward)')
console.log('='.repeat(112))
console.log('  date        gagnant  caseP  groupe (cases)  cote   rang cote  arrivée        cause')
console.log('  ' + '-'.repeat(108))
for (const row of rows) {
  if (!row.cause) continue
  const L = row.cause
  console.log('  ' + row.date + '  ' + String(L.win).padStart(6) + '  ' + String(L.wp == null ? '—' : L.wp).padStart(5)
    + '  ' + (L.wg + ' (' + L.gCaseCount + ')').padEnd(14)
    + '  ' + String(L.wcote == null ? '—' : L.wcote).padStart(5)
    + '  ' + String(L.rangCote >= 0 ? L.rangCote + 1 : '—').padStart(9)
    + '  ' + row.arr.join('-').padEnd(14) + '  ' + L.cause)
}
console.log('\n  Rappel : la 1re course n\'a AUCUNE statistique (pas de force) ; la force ne')
console.log('  compte qu\'à partir de n≥2 observations par case. C\'est le régime réel.')
console.log('='.repeat(112) + '\n')
