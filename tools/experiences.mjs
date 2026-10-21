/* =============================================================================
 * tools/experiences.mjs — A · B · C, TROIS EXPÉRIENCES INDÉPENDANTES (20/10/2026)
 *
 * Demande de l'utilisateur : trois tests sur LES MÊMES courses, tout le reste
 * figé, et pour chacun : couverture des 5 premiers, Top3 ENTIER, 5/5, ≥4/5,
 * et le nombre de chevaux SAUVÉS de l'exclusion.
 *
 *   A  la référence 4-2-1-1-0, rien ne bouge
 *   B  UN siège de plus à G2, en nommant le groupe qui le perd
 *   C  l'ordre du choix DANS G1 et DANS G2, quotas figés
 *
 * Deux corpus, jamais mélangés :
 *   P96  data/quintes.json — 96 Quintés à presse réelle (fév.→juil.)
 *   R18  data/synthese.json + data/cotes.json — les 18 clôturés du 2 au 19/10
 *        (hors échantillon : ils n'ont servi ni aux quotas ni à CHOIX_DU_BLOC)
 *
 * ⚠ On ne mesure QUE des ensembles (les 8 numéros). L'ordre du ticket, le Trio
 *   et les paires ne sont pas touchés ici (§15 : autre onglet, autre mesure).
 *
 *   node tools\experiences.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille } from '../src/lib/quinte.js'
import { chargerEchantillon } from './experience-g5.mjs'

const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const wid = (s, n) => {
  const x = String(s)
  return x + ' '.repeat(Math.max(0, n - x.length))
}

/* ─────────────────────────── les deux corpus ───────────────────────────── */

/** P96 — mêmes filtres que tools/experience-g5.mjs */
function corpus96() {
  return chargerEchantillon('cotes').map((c) => ({ ...c, stats: null }))
}

/** R18 — l'archive réelle + les cotes Equidia réelles */
function corpus18() {
  const BRUT = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
  const TOUT = Array.isArray(BRUT) ? BRUT : Object.values(BRUT)
  const COTES = JSON.parse(fs.readFileSync('data/cotes.json', 'utf8'))
  const out = []
  for (const a of TOUT) {
    if (!a || !a.date || (a.arrivee || []).length < 5) continue
    const nums = (a.runners || []).map(Number).filter(Number.isFinite)
    const syn = (a.synthese || []).map(Number).filter(Number.isFinite)
    if (nums.length < 8 || syn.length < 10) continue
    const brut = COTES[a.cle] || (a.courseId && COTES[a.courseId]) || null
    const liste = brut ? (Array.isArray(brut) ? brut : brut.cotes || []) : []
    const cotes = {}
    for (const x of liste) {
      const n = Number(x.num), v = Number(x.cote), o = Number(x.ouverture)
      if (Number.isFinite(n) && Number.isFinite(v) && v > 0) cotes[n] = { cote: v, ouverture: Number.isFinite(o) && o > 0 ? o : null }
    }
    out.push({
      /* ⚠ 20/10/2026 — la VRAIE discipline du jour, plus de 'PLAT' en dur.
         Elle est INERTE dans `remplirGrille` (prouvé par tools/audit-entrees.mjs :
         0/18 et 0/96 tickets changés sur 6 disciplines, `discipline` n'apparaît
         que dans la signature), mais on ne laisse pas une entrée fausse. */
      date: a.date, discipline: a.discipline || a.race?.discipline || '', synthese: syn, runners: nums,
      arrivee: (a.arrivee || []).map(Number).slice(0, 5),
      cotes: Object.keys(cotes).length >= 10 ? cotes : null,
      stats: null,
    })
  }
  return out.sort((x, y) => x.date.localeCompare(y.date))
}

/* ─────────────────────── le moteur, répliqué à l'identique ──────────────── */

const ORDRE = (grille) => grille.groupes.flatMap((g) => g.cases).slice()
  .sort((a, b) => a.slot - b.slot)
  .map((x) => ({ p: { num: x.num }, s: null, ok: true }))

/* ⚠ 20/10/2026 — UN SEUL constructeur de classement pour tous les outils.
 * L'ordre passé ici n'est lu par `remplirGrille` que dans la branche `else`
 * (choix ni « carnet » ni « marche ») ; la production n'y entre jamais.
 * Prouvé : tools/audit-entrees.mjs, 0/96 et 0/18 tickets changés même avec
 * l'ordre de la synthèse INVERSÉ. On unifie quand même, pour que la seule
 * variable qui bouge soit l'expérience elle-même. */
const classementDe = ORDRE

/** ouvre le moteur : quotas imposés + règle de choix imposée. `null` = production. */
function ouvrir(c, quotas = null, choix = null) {
  const grille = buildGrid(c.synthese, c.runners)
  const g = quotas ? { groupes: grille.groupes.map((x) => ({ ...x, quota: quotas[x.id] ?? x.quota })) } : grille
  return remplirGrille(g, ORDRE(grille), c.discipline, c.cotes, c.stats, choix).ticket.map(Number)
}

/** l'ÉTALON : le vrai remplirGrille sans aucun argument de mesure */
function etalon(c) {
  const grille = buildGrid(c.synthese, c.runners)
  return remplirGrille(grille, ORDRE(grille), c.discipline, c.cotes, c.stats).ticket.map(Number)
}

const memes = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join()

/* ───────────────────────────── les notations ───────────────────────────── */
function noter(courses, prendre) {
  const r = { n: 0, couverts: 0, t3: 0, p5: 0, p4: 0, ch: 0, sauf: 0, perdus: 0 }
  for (const c of courses) {
    const t = prendre(c)
    const base = etalon(c)
    const s = new Set(t), b = new Set(base)
    const k = c.arrivee.filter((n) => s.has(n)).length
    r.n++
    r.couverts += k
    r.ch += t.length
    if (c.arrivee.slice(0, 3).every((n) => s.has(n))) r.t3++
    if (k >= 5) r.p5++
    if (k >= 4) r.p4++
    for (const n of c.arrivee) {
      if (s.has(n) && !b.has(n)) r.sauf++
      if (!s.has(n) && b.has(n)) r.perdus++
    }
  }
  return r
}

/* ─────────────────────────────── le rapport ─────────────────────────────── */
const P96 = corpus96()
const R18 = corpus18()

console.log('')
console.log('  ═══ VALIDATION — la réplique est-elle exactement le moteur ? ═══')
for (const [nom, C] of [['P96', P96], ['R18', R18]]) {
  const idem = C.filter((c) => memes(ouvrir(c), etalon(c))).length
  console.log('  ' + pad(nom, 6) + idem + '/' + C.length + ' tickets identiques' + (idem === C.length ? '  ✔' : '  ✘'))
}

const CORPUS = [['P96 (96 courses)', P96], ['R18 (18 courses)', R18]]

function entete(titre) {
  console.log('')
  console.log('  ' + titre)
  console.log('  ' + wid('', 44) + wid('couverture', 12) + wid('Top3 entier', 13) + wid('5/5', 8) + wid('≥4/5', 8) + wid('sauvés', 8) + 'perdus')
}

function ligne(nom, r) {
  console.log('  ' + wid(nom, 44) + wid(pct(r.couverts, 5 * r.n), 12) + wid(pct(r.t3, r.n), 13) +
    wid(pct(r.p5, r.n), 8) + wid(pct(r.p4, r.n), 8) + wid('+' + r.sauf, 8) + '-' + r.perdus)
}

/** stabilité : le 5/5 sur chaque moitié chronologique (P96 seulement) */
function stabilite(nom, C, prendre) {
  const m = Math.floor(C.length / 2)
  const a = noter(C.slice(0, m), prendre), b = noter(C.slice(m), prendre)
  console.log('     ' + wid(nom, 40) + '5/5 · 1re moitié ' + wid(pct(a.p5, a.n), 8) + '· 2e moitié ' + pct(b.p5, b.n))
}

/* ═══════════════ A — LA RÉFÉRENCE 4-2-1-1-0 ═══════════════ */
entete('A · RÉFÉRENCE — 4-2-1-1-0, aucune règle touchée')
for (const [nom, C] of CORPUS) ligne(nom + ' · A référence', noter(C, etalon))
stabilite('A · référence', P96, etalon)

/* ═══════════════ B — UN SIÈGE DE PLUS À G2 ═══════════════ */
const Q = { G1: 4, G2: 2, G3: 1, G4: 1, G5: 0 }
const B = [
  { nom: 'B1 · G1 donne → 3-3-1-1-0', q: { ...Q, G1: 3, G2: 3 } },
  { nom: 'B2 · G4 donne → 4-3-1-0-0', q: { ...Q, G2: 3, G4: 0 } },
]
entete('B · UN SIÈGE DE PLUS À G2 — G1 donne (B1) ou G4 donne (B2)')
for (const [nom, C] of CORPUS) {
  ligne(nom + ' · A référence', noter(C, etalon))
  for (const b of B) ligne(nom + ' · ' + b.nom, noter(C, (c) => ouvrir(c, b.q)))
}
console.log('')
console.log('  ⚠ POURQUOI IL N’Y A QUE DEUX DONATEURS. Le siège doit venir d’un groupe à 8 chevaux :')
console.log('    G3 (`obligatoire: true`) est forcé à 1 par `Math.max(1, g.quota)` — il ne peut pas')
console.log('    donner ; G5 est déjà à 0. Il ne reste que G1 et G4, donc B1 et B2.')
console.log('    Un « G2 +1 » financé par G3 ferait 9 chevaux : c’est l’ajout d’un cheval, refusé.')
stabilite('B1 · G1 donne', P96, (c) => ouvrir(c, B[0].q))
stabilite('B2 · G4 donne', P96, (c) => ouvrir(c, B[1].q))

/* ═══════════════ C — L'ORDRE DU CHOIX DANS G1 ET G2 ═══════════════ */
const C_ = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'carnet' }
const C_TESTS = [
  { nom: 'C1 · G1 au marché', ch: { ...C_, G1: 'marche' } },
  { nom: 'C2 · G2 au marché', ch: { ...C_, G2: 'marche' } },
  { nom: 'C3 · G1 + G2 au marché', ch: { ...C_, G1: 'marche', G2: 'marche' } },
]
entete('C · L’ORDRE DANS G1 ET G2, quotas figés à 4-2-1-1-0')
for (const [nom, C] of CORPUS) {
  ligne(nom + ' · A référence', noter(C, etalon))
  for (const t of C_TESTS) ligne(nom + ' · ' + t.nom, noter(C, (c) => ouvrir(c, Q, t.ch)))
}
stabilite('C2 · G2 au marché', P96, (c) => ouvrir(c, Q, C_TESTS[1].ch))

/* combien de fois G1 a-t-elle vraiment un choix ? */
for (const [nom, C] of CORPUS) {
  let g1 = 0, g1court = 0, g2 = 0
  for (const c of C) {
    const g = buildGrid(c.synthese, c.runners)
    const n1 = g.groupes[0].cases.length, n2 = g.groupes[1].cases.length
    if (n1 > 4) g1++
    if (n1 < 4) g1court++
    if (n2 > 2) g2++
  }
  console.log('')
  console.log('  ' + pad(nom, 18) + 'G1 > 4 cases : ' + g1 + ' · G1 < 4 cases : ' + g1court + ' · G2 > 2 cases (donc choix réel) : ' + g2 + '/' + C.length)
}
console.log('')
console.log('  Lecture : avec 4 sièges, G1 prend ses 4 cases → il n’y a AUCUN choix dans G1.')
console.log('  Le seul bloc où le choix est réel est donc G2 (2 sièges pour 4 cases).')
console.log('')
