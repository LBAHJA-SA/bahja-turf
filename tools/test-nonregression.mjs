/* =============================================================================
 * tools/test-nonregression.mjs — LE HARNAIS DE NON-RÉGRESSION (§4 du cahier
 * des charges « Correction des statistiques », 16/10/2026).
 *
 * Il rejoue l'archive sur les mêmes courses AVANT et APRÈS modification, et
 * enregistre :
 *   · le nombre de courses valides (retenues) / écartées ;
 *   · les statistiques par position P1..P20 (toutes les clés) ;
 *   · les statistiques par groupe G1..G5 ;
 *   · l'empreinte (les 4 tests indépendants, s'ils existent) ;
 *   · les diagnostics (doublons, chevaux absents de la Synthèse) ;
 *   · le VRAI moteur `remplirGrille` : nb de tickets, distribution 5/5 4/5
 *     3/5 2/5, présence du gagnant, trio exact, paires.
 *
 * Aucun changement de poids, aucun seuil : on MESURE, on ne décide pas.
 *
 * Usage :
 *   node tools/test-nonregression.mjs                      → rapport + copie écran
 *   node tools/test-nonregression.mjs --out=data/avant.json → écrit le JSON
 *
 * Comparaison avant/après :
 *   node tools/test-nonregression.mjs --out=data/nr-avant.json
 *   node tools/test-nonregression.mjs --out=data/nr-apres.json
 *   node tools/test-nonregression.mjs --diff=data/nr-avant.json,data/nr-apres.json
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, classerPhysique, computeStats } from '../src/lib/quinte.js'

const arg = (nom) => {
  const a = process.argv.find((x) => x.startsWith('--' + nom + '='))
  return a ? a.slice(nom.length + 3) : null
}

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const eq = fs.existsSync('data/cotes.json') ? JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) : {}

const archive = Object.values(db).filter((r) => (r.arrivee || []).length)
const stats = computeStats(archive)

/* ─────────────────────── le VRAI moteur, course par course ─────────────── */
const courses = []
for (const d of Object.keys(db).sort()) {
  const r = db[d]
  if (!r.synthese?.length) continue
  const grille = buildGrid(r.synthese, r.runners)
  const brut = (r.scores || []).map((s) => ({ p: { num: s.num }, s, ok: (s.filtres || []).every((x) => x) }))
  const classement = brut.length ? classerPhysique(brut) : []
  const cotes = Object.fromEntries((eq[r.cle || r.courseId]?.cotes || []).map((x) => [x.num, x]))
  /* ⚠ ANTI-FUITE : on juge chaque course avec les stats SANS elle (leave-one-out),
   * comme en production — la course à jouer n'est jamais dans son propre apprentissage. */
  const statsLOO = computeStats(archive.filter((x) => x !== r))
  const { ticket } = remplirGrille(grille, classement, r.discipline, cotes, statsLOO)
  const arrivee = (r.arrivee || []).slice(0, 5)
  const hits = arrivee.filter((n) => ticket.includes(n)).length
  const trio = (r.arrivee || []).slice(0, 3)
  courses.push({
    date: d,
    hippodrome: r.hippodrome || null,
    discipline: r.discipline || null,
    arrivee,
    ticket,
    nbTicket: ticket.length,
    hits,
    gagnant: arrivee.length ? ticket.includes(arrivee[0]) : null,
    trioExact: trio.length === 3 ? trio.every((n) => ticket.includes(n)) : null,
  })
}

const closes = courses.filter((c) => c.arrivee.length === 5)
const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }
for (const c of closes) dist[c.hits] = (dist[c.hits] || 0) + 1
const gagnantPris = closes.filter((c) => c.gagnant).length
const trioExact = closes.filter((c) => c.trioExact).length
const avg = closes.length ? (closes.reduce((a, c) => a + c.hits, 0) / closes.length) : 0

const snapshot = {
  genere: new Date().toISOString(),
  reseau: null,
  archive: { courses: archive.length, valides: stats.nb },
  stats: {
    parPlace: stats.parPlace,
    parGroupe: stats.parGroupe,
    empreinte: stats.empreinte || null,
    diagnostic: stats.diagnostic || null,
  },
  moteur: {
    coursesMesurees: closes.length,
    distribution: dist,
    gagnantPris,
    trioExact,
    moyenne: +avg.toFixed(3),
    detail: courses,
  },
}

const out = arg('out')
if (out) { fs.writeFileSync(out, JSON.stringify(snapshot, null, 1)); console.log('écrit : ' + out) }

const diffArg = arg('diff')
if (diffArg) {
  const [p1, p2] = diffArg.split(',')
  const a = JSON.parse(fs.readFileSync(p1, 'utf8'))
  const b = JSON.parse(fs.readFileSync(p2, 'utf8'))
  const eg = (x, y) => JSON.stringify(x) === JSON.stringify(y)
  console.log('\n  COMPARAISON  ' + p1 + '  →  ' + p2 + '\n')
  console.log('  courses valides   : ' + a.archive.valides + ' → ' + b.archive.valides + (eg(a.archive.valides, b.archive.valides) ? '  (=)' : '  ⚠ DIFFÈRE'))
  console.log('  moteur 5/5 4/5 3/5 2/5 : ' + JSON.stringify(a.moteur.distribution) + ' → ' + JSON.stringify(b.moteur.distribution)
    + (eg(a.moteur.distribution, b.moteur.distribution) ? '  (=)' : '  ⚠ DIFFÈRE'))
  console.log('  gagnant pris      : ' + a.moteur.gagnantPris + ' → ' + b.moteur.gagnantPris + (eg(a.moteur.gagnantPris, b.moteur.gagnantPris) ? '  (=)' : '  ⚠ DIFFÈRE'))
  console.log('  trio exact        : ' + a.moteur.trioExact + ' → ' + b.moteur.trioExact + (eg(a.moteur.trioExact, b.moteur.trioExact) ? '  (=)' : '  ⚠ DIFFÈRE'))
  console.log('  moyenne /5        : ' + a.moteur.moyenne + ' → ' + b.moteur.moyenne + (eg(a.moteur.moyenne, b.moteur.moyenne) ? '  (=)' : '  ⚠ DIFFÈRE'))
  console.log('  tickets identiques : ' + (eg(a.moteur.detail.map((c) => c.ticket), b.moteur.detail.map((c) => c.ticket)) ? 'OUI  (=)' : '⚠ NON'))
  /* les champs que le moteur lit : n, p, top3, top5 par position */
  const cle = (s) => (s.parPlace || []).map((r) => [r.place, r.n, r.p, r.top3, r.top5])
  console.log('  parPlace (n,p,top3,top5) : ' + (eg(cle(a.stats), cle(b.stats)) ? 'IDENTIQUE  (=)  → ordre du ticket inchangé' : '⚠ DIFFÈRE'))
  const cleG = (s) => (s.parGroupe || []).map((g) => [g.id, g.part1, g.part23, g.part45, g.present])
  console.log('  parGroupe (anciens champs) : ' + (eg(cleG(a.stats), cleG(b.stats)) ? 'IDENTIQUE  (=)' : '⚠ DIFFÈRE'))
  console.log('')
}

/* ─────────────────────────────── rapport écran ────────────────────────── */
if (!diffArg) {
  const f = (x) => (x == null ? '—' : x)
  console.log('\n' + '='.repeat(96))
  console.log('  NON-RÉGRESSION — archive ' + archive.length + ' courses · ' + stats.nb + ' valides (5 arrivants mappés)')
  console.log('='.repeat(96))
  if (stats.diagnostic) {
    const d = stats.diagnostic
    console.log('  diagnostic : courses examinées ' + f(d.coursesExaminees) + ' · retenues ' + f(d.coursesRetenues)
      + ' · écartées ' + f(d.coursesEcartees) + ' · doublons ' + f(d.doublons) + ' · chevaux absents ' + f(d.chevauxAbsents))
  }
  console.log('\n  POSITION   courses_valides  n_top5  victoires  podiums  P(vic|top5)  P(vic|glob)  P(pod|top5)  P(top5|glob)')
  console.log('  ' + '-'.repeat(94))
  for (const r of stats.parPlace.slice(0, 20)) {
    console.log('  P' + String(r.place).padEnd(8)
      + String(f(r.courses_valides)).padStart(12)
      + String(f(r.n_top5)).padStart(9)
      + String(f(r.victoires)).padStart(9)
      + String(f(r.podiums)).padStart(9)
      + String(f(r.p_victoire_conditionnel)).padStart(13)
      + String(f(r.p_victoire_global)).padStart(12)
      + String(f(r.p_podium_conditionnel)).padStart(13)
      + String(f(r.p_top5_global)).padStart(13))
  }
  console.log('\n  GROUPE      présence_course  part_victoires  part_podiums  part_places_4_5')
  console.log('  ' + '-'.repeat(74))
  for (const g of stats.parGroupe) {
    console.log('  ' + String(g.label).padEnd(12)
      + String(f(g.presence_course)).padStart(12)
      + String(f(g.part_victoires)).padStart(16)
      + String(f(g.part_podiums)).padStart(14)
      + String(f(g.part_places_4_5)).padStart(17))
  }
  if (stats.empreinte) {
    console.log('\n  EMPREINTE — les 4 tests INDÉPENDANTS (jamais fusionnés)')
    console.log('  test                       n   non éval.  tous top3%  tous top5%   ≥1 top3%   période')
    console.log('  ' + '-'.repeat(88))
    for (const t of stats.empreinte) {
      console.log('  ' + String(t.label).padEnd(22)
        + String(f(t.n)).padStart(5)
        + String(f(t.nonEvaluables)).padStart(11)
        + String(f(t.top3)).padStart(12)
        + String(f(t.top5)).padStart(12)
        + String(f(t.un)).padStart(10)
        + '   ' + (t.debut && t.fin ? t.debut + ' → ' + t.fin : '—'))
    }
  }
  console.log('\n  MOTEUR (remplirGrille, quotas 3-2-1-1-1) — ' + closes.length + ' courses clôturées')
  console.log('  5/5 ' + dist[5] + ' · 4/5 ' + dist[4] + ' · 3/5 ' + dist[3] + ' · 2/5 ' + dist[2] + ' · 1/5 ' + dist[1] + ' · 0/5 ' + dist[0])
  console.log('  gagnant pris ' + gagnantPris + '/' + closes.length + ' · trio exact ' + trioExact + '/' + closes.length + ' · moyenne ' + avg.toFixed(2) + '/5')
  console.log('='.repeat(96) + '\n')
}
