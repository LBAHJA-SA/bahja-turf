/* =============================================================================
 * tools/choix-signal.mjs — QUI SORT DE CHAQUE BLOC ? (20/10/2026)
 *
 * La question de l'utilisateur, enfin posée au bon niveau :
 *   « l'élimination dans le bloc — c'est ça le choix. »
 *
 * On ne compare plus des ORDRES GLOBAUX (carnet contre marché). On demande, bloc
 * par bloc : ** quel cheval faut-il SORTIR ? ** et on teste des signaux portés
 * par le cheval lui-même, dans les archives locales :
 *
 *   cote            la référence (on sort le plus cher du bloc)
 *   tauxVictoire    nombreVictoires / nombreCourses
 *   tauxPlace       nombrePlaces / nombreCourses
 *   gainParCourse   gain / nombreCourses
 *   age             deux sens testés
 *   poids           le poids (plat)
 *   valeur          la valeur handicap
 *   corde           le numéro de départ (plat)
 *
 * Corpus : les Quintés français des archives qui ont une arrivée ET des cotes
 * (123 courses, hors celles qui ont servi aux statistiques). Les blocs sont des
 * TRANCHES DE MARCHÉ faute de presse locale : G1 = rangs 1-4 … G4 = 11-12.
 * Quotas 3-3-1-1-0.
 *
 * Métriques : quinté complet (5/5) et podium entier — jamais le cheval isolé.
 * Tout est rejoué moitié par moitié avant de conclure.
 *
 *   node tools\choix-signal.mjs
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const N = (s) => String(s || '').toUpperCase().replace(/[_\s]+/g, ' ').trim()

/* ─────────────────── ① la sélection : 123 courses hors statistiques ─────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const statCles = new Set(TOUT.filter((x) => x.date).map((x) => x.date + '|' + N(x.track)))
const CORPUS = JSON.parse(fs.readFileSync('data/corpus/archives-quinte.json', 'utf8'))
  .filter((c) => !statCles.has(c.date + '|' + N(c.track)))

/* ─────────────────── ② l'index des fichiers d'archives ──────────────────── */
const FICHIERS = new Map()
function indexer(dir, hippo) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { indexer(p, N(e.name)); continue }
    if (!e.name.endsWith('.json')) continue
    const m = e.name.match(/^race_R\d+_C(\d+)_(\d{4}-\d{2}-\d{2})\.json$/)
    if (!m) continue
    const k = m[2] + '|' + (hippo || '?') + '|' + Number(m[1])
    if (!FICHIERS.has(k)) FICHIERS.set(k, p)
  }
}
indexer('archives', null)

/* ─────────────────── ③ les signaux portés par chaque partant ────────────── */
function signaux(p) {
  const nc = Number(p.nombreCourses) || 0
  const nv = Number(p.nombreVictoires) || 0
  const np = Number(p.nombrePlaces) || 0
  const gain = Number(p.gain) || 0
  return {
    cote: Number(p.cote_pmu) || null,
    tauxVictoire: nc >= 5 ? nv / nc : null,
    tauxPlace: nc >= 5 ? np / nc : null,
    gainParCourse: nc >= 5 ? gain / nc : null,
    age: Number(p.age) || null,
    poids: Number(p.poids) || null,
    valeur: Number(p.valeur) || null,
    corde: Number(p.corde) || null,
  }
}

/* la course du corpus → ses partants et leurs signaux */
const COURSES = []
let manquants = 0
for (const c of CORPUS) {
  const f = FICHIERS.get(c.date + '|' + N(c.track) + '|' + c.num) || FICHIERS.get(c.date + '|?|' + c.num)
  if (!f) { manquants++; continue }
  let j
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { manquants++; continue }
  const parts = (j.participants || []).filter((x) => Number(x.cote_pmu) > 0 && Number.isFinite(Number(x.num)))
  const parNum = Object.fromEntries(parts.map((x) => [Number(x.num), signaux(x)]))
  /* les cotes du corpus font foi (ce sont elles qui ont servi aux mesures) */
  const nums = Object.keys(c.cotes).map(Number)
    .filter((n) => c.cotes[n] > 0)
    .sort((a, b) => c.cotes[a] - c.cotes[b] || a - b)
  if (nums.length < 10 || c.arrivee.length < 5) continue
  COURSES.push({
    c, nums,
    blocs: [nums.slice(0, 4), nums.slice(4, 8), nums.slice(8, 10), nums.slice(10, 12), nums.slice(12)],
    sig: parNum,
  })
}
console.log('\n  QUI SORT DE CHAQUE BLOC — ' + COURSES.length + ' Quintés français (archives, hors statistiques)' +
  (manquants ? '  ⚠ ' + manquants + ' fichiers introuvables' : ''))
console.log('  blocs = tranches de marché · quotas 3-3-1-1-0 · métriques : quinté entier et podium entier')

/* ─────────────────── ④ le remplissage : un signal par bloc ──────────────── */
const QUOTA = [3, 3, 1, 1, 0]
const SIGNAUX = ['cote', 'tauxVictoire', 'tauxPlace', 'gainParCourse', 'age', 'poids', 'valeur', 'corde']

/**
 * `choix` = { 0..3 : { sig, asc } | null }
 * null → le tri de référence (la cote). Sinon on garde les MEILLEURS du signal.
 * Un cheval sans signal passe derrière : on ne parie jamais sur une donnée absente.
 */
function ticketDe(course, choix) {
  const t = []
  for (let b = 0; b < 5; b++) {
    const q = QUOTA[b]
    if (!q) continue
    const liste = course.blocs[b].slice()
    const ch = choix[b]
    if (ch) {
      liste.sort((x, y) => {
        const a = course.sig[x]?.[ch.sig], z = course.sig[y]?.[ch.sig]
        if (a == null && z == null) return 0
        if (a == null) return 1
        if (z == null) return -1
        return ch.asc ? a - z : z - a
      })
    }
    liste.slice(0, q).forEach((n) => t.push(n))
  }
  return t
}
function noter(liste, choix) {
  let pod = 0, qui = 0, q4 = 0
  for (const course of liste) {
    const s = new Set(ticketDe(course, choix))
    const a = course.c.arrivee
    if (a.slice(0, 3).every((x) => s.has(x))) pod++
    if (a.slice(0, 5).every((x) => s.has(x))) qui++
    if (a.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod, qui, q4, n: liste.length }
}
const BASE = [null, null, null, null]
const ref = noter(COURSES, BASE)
console.log('\n  référence (la cote partout) : ' + pct(ref.pod, ref.n) + ' de podium · ' +
  pct(ref.qui, ref.n) + ' de quinté · ' + pct(ref.q4, ref.n) + ' de ≥4')

/* ─────────────────── ⑤ un bloc à la fois : quel signal sort qui ? ───────── */
const boot = (d) => {
  let m = 0
  for (let t = 0; t < 4000; t++) {
    let s = 0
    for (let k = 0; k < d.length; k++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) m++
  }
  return m / 40
}
const marq = (choix) => COURSES.map((course) => {
  const s = new Set(ticketDe(course, choix))
  return course.c.arrivee.slice(0, 5).filter((x) => s.has(x)).length === 5 ? 1 : 0
})
const base5 = marq(BASE)
const MEILLEUR = []

console.log('\n  LE MEILLEUR SIGNAL PAR BLOC — on ne change que ce bloc, on compte les 5/5')
for (let b = 0; b < 4; b++) {
  const essais = []
  for (const sig of SIGNAUX) {
    for (const asc of [true, false]) {
      const ch = BASE.slice(); ch[b] = { sig, asc }
      const r = noter(COURSES, ch)
      essais.push({ sig, asc, r })
    }
  }
  essais.sort((x, y) => (y.r.qui - x.r.qui) || (y.r.pod - x.r.pod))
  const best = essais[0]
  MEILLEUR[b] = { sig: best.sig, asc: best.asc }
  const d = marq(BASE.map((x, k) => (k === b ? { sig: best.sig, asc: best.asc } : x)))
  const gain = d.map((x, i) => x - base5[i])
  const meilleur = boot(gain)
  const nomB = ['G1', 'G2', 'G3', 'G4'][b]
  console.log('  ' + pad(nomB, 4) + 'meilleur : ' + pad(best.sig + (best.asc ? ' ↑' : ' ↓'), 18) +
    pad(pct(best.r.qui, best.r.n), 10) + '(réf. ' + pct(ref.qui, ref.n) + ')   ' +
    'bootstrap mieux que la cote : ' + meilleur.toFixed(1) + ' %' + (meilleur > 90 ? '  ✓' : ''))
  const suiv = essais.slice(1, 3).map((x) => x.sig + (x.asc ? '↑' : '↓') + ' ' + pct(x.r.qui, x.r.n))
  console.log('      ' + pad('', 4) + 'puis : ' + suiv.join(' · '))
}

/* ─────────────────── ⑥ combien de courses le signal change-t-il ? ──────── */
console.log('\n  COUVERTURE — dans combien de courses le signal change-t-il vraiment le ticket ?')
for (let b = 0; b < 4; b++) {
  const ch = BASE.slice(); ch[b] = MEILLEUR[b]
  let change = 0
  for (const course of COURSES) {
    const a = new Set(ticketDe(course, BASE)), z = new Set(ticketDe(course, ch))
    if ([...z].some((x) => !a.has(x))) change++
  }
  console.log('  ' + pad(['G1', 'G2', 'G3', 'G4'][b], 4) + pad(MEILLEUR[b].sig, 16) + change + ' / ' + COURSES.length + ' courses')
}

/* ─────────────────── ⑦ hors échantillon : choisir / noter ──────────────── */
const choisir = (liste) => {
  const ch = BASE.slice()
  for (let b = 0; b < 4; b++) {
    let best = null
    for (const sig of SIGNAUX) for (const asc of [true, false]) {
      const c2 = ch.slice(); c2[b] = { sig, asc }
      const r = noter(liste, c2)
      if (!best || r.qui > best.r.qui || (r.qui === best.r.qui && r.pod > best.r.pod)) best = { sig, asc, r }
    }
    ch[b] = { sig: best.sig, asc: best.asc }
  }
  return ch
}
console.log('\n  HORS ÉCHANTILLON — la règle est choisie sur une moitié et notée sur l’AUTRE')
const m = Math.floor(COURSES.length / 2)
const H = [COURSES.slice(0, m), COURSES.slice(m)]
let auto = { pod: 0, qui: 0, q4: 0, n: 0 }, base = { pod: 0, qui: 0, q4: 0, n: 0 }
for (const [a, b] of [[0, 1], [1, 0]]) {
  const ch = choisir(H[a])
  const rA = noter(H[b], ch), rB = noter(H[b], BASE)
  auto = { pod: auto.pod + rA.pod, qui: auto.qui + rA.qui, q4: auto.q4 + rA.q4, n: auto.n + rA.n }
  base = { pod: base.pod + rB.pod, qui: base.qui + rB.qui, q4: base.q4 + rB.q4, n: base.n + rB.n }
  console.log('  choisie sur la ' + (a === 0 ? '1ʳᵉ' : '2ᵈᵉ') + ' moitié → ' +
    [0, 1, 2, 3].map((k) => ch[k].sig + (ch[k].asc ? '↑' : '↓')).join(' · '))
  console.log('     notée sur l’autre : ' + pct(rA.pod, rA.n) + ' podium · ' + pct(rA.qui, rA.n) + ' quinté' +
    '   (la cote : ' + pct(rB.pod, rB.n) + ' · ' + pct(rB.qui, rB.n) + ')')
}
console.log('\n  ' + pad('TOTAL hors échantillon', 26) + 'règle : ' + pad(pct(auto.qui, auto.n), 9) + 'quinté · ' +
  pad(pct(auto.pod, auto.n), 9) + 'podium · ' + pct(auto.q4, auto.n) + ' ≥4')
console.log('  ' + pad('', 26) + 'cote  : ' + pad(pct(base.qui, base.n), 9) + 'quinté · ' +
  pad(pct(base.pod, base.n), 9) + 'podium · ' + pct(base.q4, base.n) + ' ≥4')
console.log('')
