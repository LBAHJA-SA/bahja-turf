/* =============================================================================
 * tools/prono-moteur.mjs — LA MESURE DU MOTEUR PRONOSTIQUE (31/10/2026)
 *
 * Question posée par l'utilisateur : le découpage
 *
 *        G1 = P1..P6 → 3 · G2 = P7..P10 → 2 · G3 = P11..P18 → 3
 *
 * tient-il, et QUELLE règle faut-il dans chaque bloc ? On ne devine pas : on
 * rejoue les Quintés qui ont une arrivée et des cotes, et on compte.
 *
 * ⚠ SÉLECTION / CONTRÔLE SÉPARÉS (consigne de l'utilisateur, §11.24)
 *   On CHOISIT la règle sur le corpus A (97 Quintés à presse réelle), et on la
 *   CONTRÔLE sur le corpus B (octobre, 22 courses avec cotes) — qui n'a pas
 *   servi au choix. Deux moitiés de A servent en plus à la stabilité.
 *
 * Métriques (celles de AGENTS.md §11.25 — le podium est dense, donc lisible) :
 *   x/5        chevaux de l'arrivée présents dans le ticket (sur 5)
 *   5/5        l'arrivée entière est dans le ticket
 *   ≥4         au moins 4 des 5
 *   podium     les 3 premiers sont TOUS dans le ticket
 *   ≥2 pod.    au moins 2 des 3 premiers
 *
 * Usage
 *   node tools\prono-moteur.mjs          → le rapport
 *   node tools\prono-moteur.mjs --json   → + data/prono-moteur.json
 * ========================================================================== */
import fs from 'node:fs'
import { buildGrilleProno, remplirProno, BLOCS_PRONO, CHOIX_PRONO } from '../src/lib/pronostique.js'
import { buildGrid, remplirGrille } from '../src/lib/quinte.js'

const RACINE = 'C:/bahja-TURF'
const ECRIRE = process.argv.includes('--json')

/* ─────────────────────────── 1. LES CORPUS ─────────────────────────────── */

function corpusA() {
  const tous = JSON.parse(fs.readFileSync(RACINE + '/data/quintes.json', 'utf8'))
  const out = []
  for (const c of tous) {
    if (!Array.isArray(c.presse) || c.presse.length < 8) continue
    if (!Array.isArray(c.arrivee) || c.arrivee.length < 5) continue
    if (!c.cotes || Object.keys(c.cotes).length < 8) continue
    const nb = Number(c.nb) || Math.max(...Object.keys(c.cotes).map(Number))
    const runners = Array.from({ length: nb }, (_, i) => i + 1)
    out.push({
      id: c.id || c.date, date: c.date, hippo: c.track || c.code || '',
      presse: c.presse, runners, arrivee: c.arrivee, cotes: c.cotes,
    })
  }
  return out
}

function corpusB() {
  const syn = JSON.parse(fs.readFileSync(RACINE + '/data/synthese.json', 'utf8'))
  const cot = JSON.parse(fs.readFileSync(RACINE + '/data/cotes.json', 'utf8'))
  const out = []
  for (const v of Object.values(syn)) {
    if (!v.found) continue
    if (!Array.isArray(v.synthese) || v.synthese.length < 8) continue
    if (!Array.isArray(v.arrivee) || v.arrivee.length < 5) continue
    const fiche = v.courseId ? cot[v.courseId] : null
    const cotes = fiche && Array.isArray(fiche.cotes)
      ? Object.fromEntries(fiche.cotes.map((c) => [Number(c.num), Number(c.cote)]))
      : null
    const runners = Array.isArray(v.runners) && v.runners.length
      ? v.runners
      : [...new Set([...v.synthese, ...v.arrivee])].sort((a, b) => a - b)
    out.push({
      id: v.courseId || v.date, date: v.date, hippo: v.hippodrome || '',
      presse: v.synthese, runners, arrivee: v.arrivee, cotes,
    })
  }
  return out.sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

/* ─────────────────────────── 2. LES MÉTRIQUES ──────────────────────────── */

function noter(ticket, arrivee) {
  const t = new Set(ticket)
  const c5 = arrivee.slice(0, 5)
  const pod = arrivee.slice(0, 3)
  const x5 = c5.filter((n) => t.has(n)).length
  const x3 = pod.filter((n) => t.has(n)).length
  return { x5, cinq: x5 === 5, quatre: x5 >= 4, podium: x3 === 3, deuxPod: x3 >= 2, x3 }
}

function agreger(lignes) {
  const n = lignes.length || 1
  const somme = (f) => lignes.reduce((s, l) => s + f(l), 0)
  return {
    n: lignes.length,
    x5: somme((l) => l.x5) / n,
    cinq: 100 * somme((l) => (l.cinq ? 1 : 0)) / n,
    quatre: 100 * somme((l) => (l.quatre ? 1 : 0)) / n,
    podium: 100 * somme((l) => (l.podium ? 1 : 0)) / n,
    deuxPod: 100 * somme((l) => (l.deuxPod ? 1 : 0)) / n,
  }
}

const pc = (v) => String(Number(v).toFixed(1)).replace('.', ',') + ' %'
const sg = (v) => (v >= 0 ? '+' : '') + Number(v).toFixed(1)

/* ─────────────────── 3. LES DEUX TICKETS À COMPARER ────────────────────── */

const ticketProno = (course, choix) =>
  remplirProno(buildGrilleProno(course.presse, course.runners), course.cotes, choix).ticket

const ticketQuinte = (course) =>
  remplirGrille(buildGrid(course.presse, course.runners), [], '', course.cotes).ticket

const A = corpusA()
const B = corpusB().filter((c) => c.cotes)

const titre = (t) => console.log('\n' + '═'.repeat(80) + '\n' + t + '\n' + '═'.repeat(80))

titre('① LES CORPUS')
console.log('  A · Quintés à presse réelle (data/quintes.json) : ' + A.length + ' courses   ← on CHOISIT ici')
console.log('  B · octobre (data/synthese.json, cotes Equidia) : ' + B.length + ' courses   ← on CONTRÔLE ici')
console.log('  découpage : ' + BLOCS_PRONO.map((b) => b.id + ' ' + b.label.replace(/^G\d · /, '') + ' → ' + b.quota).join('  ·  ') +
  '   =  ' + BLOCS_PRONO.reduce((n, b) => n + b.quota, 0) + ' chevaux')

/* ── ② les 64 règles, choisies sur A seul ── */
const REGLES_4 = ['carnet', 'marche', 'echange20', 'fusion', 'antipresse', 'antimarche', 'anti', 'contraste']
const COMBOS = []
for (const g1 of REGLES_4) for (const g2 of REGLES_4) for (const g3 of REGLES_4) COMBOS.push({ G1: g1, G2: g2, G3: g3 })
const CODE = { carnet: 'C', marche: 'M', echange20: 'E', fusion: 'F', antipresse: 'A', antimarche: 'R', anti: 'T', contraste: 'X' }
const nom = (c) => [c.G1, c.G2, c.G3].map((r) => CODE[r]).join('')

const moitieA = Math.floor(A.length / 2)
const noterSur = (corpus, choix) => agreger(corpus.map((c) => noter(ticketProno(c, choix), c.arrivee)))

const resultats = COMBOS.map((choix) => {
  const a1 = noterSur(A.slice(0, moitieA), choix)
  const a2 = noterSur(A.slice(moitieA), choix)
  return {
    choix, nom: nom(choix),
    A: noterSur(A, choix), a1, a2,
    B: noterSur(B, choix),
  }
})

const parPodiumA = resultats.slice().sort((a, b) => b.A.podium - a.A.podium || b.A.x5 - a.A.x5)
titre('② LES 7 RÈGLES, appliquées aux TROIS blocs (la même partout)')
console.log('  C carnet · M marché · E échange20 · F fusion P+cote · A anti-presse · R anti-marché · T anti (les deux) · X contraste (quota−1 carnet + le moins cité)')
console.log('\n  règle   A: x/5     5/5     ≥4    podium   ≥2pod  │  B: x/5    5/5    ≥4    podium')
const uniformes = REGLES_4.map((r) => ({ regle: r, r: resultats.find((x) => x.nom === nom({ G1: r, G2: r, G3: r })) }))
for (const u of uniformes) {
  const r = u.r
  console.log('  ' + u.regle.padEnd(11) + r.A.x5.toFixed(2) + '  ' + pc(r.A.cinq).padStart(6) + '  ' + pc(r.A.quatre).padStart(6) + '  ' + pc(r.A.podium).padStart(6) + '  ' + pc(r.A.deuxPod).padStart(6) +
    '  │  ' + r.B.x5.toFixed(2) + '  ' + pc(r.B.cinq).padStart(6) + '  ' + pc(r.B.quatre).padStart(6) + '  ' + pc(r.B.podium).padStart(6))
}

titre('③ LES ' + COMBOS.length + ' COMBINAISONS, CLASSÉES SUR A (choix) — 1ʳᵉ et 2ᵈᵉ moitié en contrôle')
console.log('  règle   x/5     5/5     ≥4    podium   ≥2pod  │ podium 1re mt · 2ᵈᵉ mt   B: x/5   podium')
for (const r of parPodiumA.slice(0, 10)) {
  console.log('  ' + r.nom.padEnd(6) + '  ' + r.A.x5.toFixed(2) + '  ' + pc(r.A.cinq).padStart(6) + '  ' + pc(r.A.quatre).padStart(6) + '  ' + pc(r.A.podium).padStart(6) + '  ' + pc(r.A.deuxPod).padStart(6) +
    '  │   ' + pc(r.a1.podium).padStart(6) + '  ·  ' + pc(r.a2.podium).padStart(6) + '    ' + r.B.x5.toFixed(2) + '  ' + pc(r.B.podium).padStart(6))
}
console.log('  …')
for (const r of parPodiumA.slice(-1)) {
  console.log('  ' + r.nom.padEnd(6) + '  ' + r.A.x5.toFixed(2) + '  ' + pc(r.A.cinq).padStart(6) + '  ' + pc(r.A.quatre).padStart(6) + '  ' + pc(r.A.podium).padStart(6) + '  ' + pc(r.A.deuxPod).padStart(6) +
    '  │   ' + pc(r.a1.podium).padStart(6) + '  ·  ' + pc(r.a2.podium).padStart(6) + '    ' + r.B.x5.toFixed(2) + '  ' + pc(r.B.podium).padStart(6))
}

/* ── ③ un bloc à la fois, depuis CCC — la seule comparaison appariée ── */
const BASE = { G1: 'carnet', G2: 'carnet', G3: 'carnet' }
const base = resultats.find((r) => r.nom === 'CCC')
titre('④ UN BLOC À LA FOIS — le carnet est-il le bon choix dans les TROIS blocs ?')
console.log('  bloc  règle       podium A (écart)   moitiés A         x/5 A   podium B (écart)')
for (const id of ['G1', 'G2', 'G3']) {
  for (const regle of ['marche', 'echange20', 'fusion']) {
    const r = resultats.find((x) => x.nom === nom({ ...BASE, [id]: regle }))
    console.log('  ' + id + '    ' + regle.padEnd(11) + pc(r.A.podium).padStart(6) + ' (' + sg(r.A.podium - base.A.podium) + ')   ' +
      pc(r.a1.podium).padStart(6) + ' / ' + pc(r.a2.podium).padStart(6) + '   ' + r.A.x5.toFixed(2) +
      '   ' + pc(r.B.podium).padStart(6) + ' (' + sg(r.B.podium - base.B.podium) + ')')
  }
}

/* ── ④ le contrôle sur octobre, pour les 5 premiers de A ── */
titre('⑤ CONTRÔLE HORS ÉCHANTILLON — octobre, les 5 premiers de A')
console.log('  règle   podium A │ podium B (octobre)   x/5 B   5/5 B   ≥4 B')
for (const r of parPodiumA.slice(0, 5)) {
  console.log('  ' + r.nom.padEnd(6) + pc(r.A.podium).padStart(8) + ' │ ' + pc(r.B.podium).padStart(10) + '        ' + r.B.x5.toFixed(2) + '  ' + pc(r.B.cinq).padStart(6) + '  ' + pc(r.B.quatre).padStart(6))
}

/* ── ⑤ le moteur Quinté sur les mêmes courses ── */
const qA = agreger(A.map((c) => noter(ticketQuinte(c), c.arrivee)))
const qB = agreger(B.map((c) => noter(ticketQuinte(c), c.arrivee)))
titre('⑥ LE MOTEUR QUINTÉ (3-2-1-1-1) SUR LES MÊMES COURSES — la référence')
console.log('  Quinté    A: x/5 ' + qA.x5.toFixed(2) + ' · 5/5 ' + pc(qA.cinq) + ' · ≥4 ' + pc(qA.quatre) + ' · podium ' + pc(qA.podium) + ' · ≥2pod ' + pc(qA.deuxPod) +
  '  │  B: x/5 ' + qB.x5.toFixed(2) + ' · 5/5 ' + pc(qB.cinq) + ' · podium ' + pc(qB.podium))
console.log('  Prono CCC A: x/5 ' + base.A.x5.toFixed(2) + ' · 5/5 ' + pc(base.A.cinq) + ' · ≥4 ' + pc(base.A.quatre) + ' · podium ' + pc(base.A.podium) + ' · ≥2pod ' + pc(base.A.deuxPod) +
  '  │  B: x/5 ' + base.B.x5.toFixed(2) + ' · 5/5 ' + pc(base.B.cinq) + ' · podium ' + pc(base.B.podium))

/* ── ⑥ la règle retenue + bootstrap apparié contre CCC ── */
const RETENU = parPodiumA[0].choix
const retenu = parPodiumA[0]

function bootstrap(corpus, choixA, choixB, tirages = 10000) {
  const na = corpus.map((c) => noter(ticketProno(c, choixA), c.arrivee))
  const nb = corpus.map((c) => noter(ticketProno(c, choixB), c.arrivee))
  let podMieux = 0, podPire = 0, x5Mieux = 0, x5Pire = 0
  const deltas = []
  const n = corpus.length
  for (let t = 0; t < tirages; t++) {
    let pa = 0, pb = 0, xa = 0, xb = 0
    for (let i = 0; i < n; i++) {
      const k = Math.floor(Math.random() * n)
      pa += na[k].podium ? 1 : 0; pb += nb[k].podium ? 1 : 0
      xa += na[k].x3; xb += nb[k].x3
    }
    if (pb > pa) podMieux++
    if (pb < pa) podPire++
    if (xb > xa) x5Mieux++
    if (xb < xa) x5Pire++
    deltas.push((xb - xa) / n)
  }
  deltas.sort((x, y) => x - y)
  return {
    podMieux: 100 * podMieux / tirages, podPire: 100 * podPire / tirages,
    x5Mieux: 100 * x5Mieux / tirages, x5Pire: 100 * x5Pire / tirages,
    ic: [deltas[Math.floor(tirages * 0.05)], deltas[Math.floor(tirages * 0.95)]],
  }
}

titre('⑦ LA RÈGLE RETENUE — ' + nom(RETENU) + ' (G1 ' + RETENU.G1 + ' · G2 ' + RETENU.G2 + ' · G3 ' + RETENU.G3 + ')')
console.log('  A     : x/5 ' + retenu.A.x5.toFixed(2) + ' · 5/5 ' + pc(retenu.A.cinq) + ' · ≥4 ' + pc(retenu.A.quatre) + ' · podium ' + pc(retenu.A.podium))
console.log('  moitiés A : ' + pc(retenu.a1.podium) + '  ·  ' + pc(retenu.a2.podium) + '   (CCC : ' + pc(base.a1.podium) + ' · ' + pc(base.a2.podium) + ')')
console.log('  B (octobre, hors échantillon) : x/5 ' + retenu.B.x5.toFixed(2) + ' · 5/5 ' + pc(retenu.B.cinq) + ' · podium ' + pc(retenu.B.podium) + '   (CCC : x/5 ' + base.B.x5.toFixed(2) + ' · podium ' + pc(base.B.podium) + ')')
const bs = bootstrap(A, RETENU, BASE)
console.log('  bootstrap A, ' + nom(RETENU) + ' contre CCC (10 000 tirages, appariés) :')
console.log('     podium  mieux ' + pc(bs.podMieux) + ' · pire ' + pc(bs.podPire) +
  '   ·   chevaux du podium mieux ' + pc(bs.x5Mieux) + ' · pire ' + pc(bs.x5Pire) +
  '   IC90 ' + sg(bs.ic[0]) + ' ; ' + sg(bs.ic[1]))

/* ── ⑦ POURQUOI — ce que chaque bande de presse donne réellement ── */
function bandes(corpus) {
  const bandesDef = BLOCS_PRONO.map((b) => ({ id: b.id, de: b.de, a: b.a, quota: b.quota, top5: 0, top3: 0, n: 0 }))
  const hors = { top5: 0, top3: 0 }
  for (const c of corpus) {
    const place = {}
    const ordre = buildGrilleProno(c.presse, c.runners).ordre
    ordre.forEach((num, i) => { place[num] = i + 1 })
    for (const num of c.arrivee.slice(0, 5)) {
      const p = place[num]
      const b = bandesDef.find((x) => p >= x.de && p <= x.a)
      if (b) b.top5++; else hors.top5++
    }
    for (const num of c.arrivee.slice(0, 3)) {
      const p = place[num]
      const b = bandesDef.find((x) => p >= x.de && p <= x.a)
      if (b) b.top3++; else hors.top3++
    }
  }
  const n = corpus.length || 1
  return { lignes: bandesDef.map((b) => ({ ...b, top5: b.top5 / n, top3: b.top3 / n })), hors: { top5: hors.top5 / n, top3: hors.top3 / n }, n: corpus.length }
}

titre('⑧ POURQUOI — ce que chaque bande de presse donne réellement (arrivants par course)')
for (const [nomCorpus, corpus] of [['A', A], ['B (octobre)', B]]) {
  const d = bandes(corpus)
  console.log('\n  corpus ' + nomCorpus + ' — ' + d.n + ' courses')
  console.log('  bloc   bande      chevaux   top5/ course   top3/ course   sièges pris')
  for (const l of d.lignes) {
    console.log('  ' + l.id + '    ' + (l.de + '-' + l.a).padEnd(10) + String(l.a - l.de + 1).padStart(4) + '        ' + l.top5.toFixed(2).padStart(6) + '           ' + l.top3.toFixed(2).padStart(6) + '            ' + l.quota)
  }
  console.log('  hors bandes (P19+)                              ' + d.hors.top5.toFixed(2).padStart(6) + '           ' + d.hors.top3.toFixed(2).padStart(6))
}

/* ── ⑧ les plafonds : top-8 brut, presse et marché ── */
titre('⑨ LES PLAFONDS — 8 chevaux pris « au plus simple », sur les mêmes courses')
function topN(course, par, n = 8) {
  const ordre = buildGrilleProno(course.presse, course.runners).ordre
  if (par === 'presse') return ordre.slice(0, n)
  const cotes = course.cotes || {}
  return Object.keys(cotes).map(Number)
    .filter((n2) => cotes[n2] > 0)
    .sort((a, b) => cotes[a] - cotes[b] || a - b).slice(0, n)
}
for (const [nomCorpus, corpus] of [['A', A], ['B (octobre)', B]]) {
  const p = agreger(corpus.map((c) => noter(topN(c, 'presse'), c.arrivee)))
  const m = agreger(corpus.map((c) => noter(topN(c, 'marche'), c.arrivee)))
  console.log('  ' + nomCorpus.padEnd(12) + 'top-8 presse  x/5 ' + p.x5.toFixed(2) + ' · 5/5 ' + pc(p.cinq) + ' · podium ' + pc(p.podium) +
    '   │  top-8 marché  x/5 ' + m.x5.toFixed(2) + ' · 5/5 ' + pc(m.cinq) + ' · podium ' + pc(m.podium))
}

/* ── ⑩ la courbe : combien de chevaux pour atteindre 70 % de podium ── */
titre('⑩ COMBIEN DE CHEVAUX POUR 70 % DE PODIUM — la courbe mesurée')
console.log('  N     A: podium   ≥2pod    5/5   │  B (octobre): podium     5/5')
const courbe = []
for (let N = 4; N <= 14; N++) {
  const a = agreger(A.map((c) => noter(topN(c, 'presse', N), c.arrivee)))
  const b = agreger(B.map((c) => noter(topN(c, 'presse', N), c.arrivee)))
  courbe.push({ N, A: a, B: b })
  console.log('  ' + String(N).padEnd(5) + pc(a.podium).padStart(8) + '  ' + pc(a.deuxPod).padStart(7) + '  ' + pc(a.cinq).padStart(6) + '  │  ' + pc(b.podium).padStart(12) + '  ' + pc(b.cinq).padStart(6))
}
const seuil = courbe.find((c) => c.A.podium >= 70)
console.log('  → 70 % de podium à N = ' + (seuil ? seuil.N : '>14') + ' (sur A). À 8 chevaux le plafond mesuré est ' + pc(courbe.find((c) => c.N === 8).A.podium) + '.')

/* ── ⑪ les quotas à l'intérieur des MÊMES bandes ── */
titre('⑪ LES QUOTAS DANS LES MÊMES BANDES (8 chevaux) — les bandes ne bougent pas, les sièges oui')
const TAILLES = BLOCS_PRONO.map((b) => b.a - b.de + 1)
const quotasPossibles = []
for (let q1 = 1; q1 <= TAILLES[0]; q1++) {
  for (let q2 = 0; q2 <= TAILLES[1]; q2++) {
    for (let q3 = 0; q3 <= TAILLES[2]; q3++) {
      if (q1 + q2 + q3 !== 8) continue
      quotasPossibles.push([q1, q2, q3])
    }
  }
}
const avecQuotas = (course, quotas, regle = 'carnet') => {
  const grille = buildGrilleProno(course.presse, course.runners)
  const ticket = []
  grille.blocs.forEach((b, i) => {
    const pris = remplirProno(
      { ...grille, blocs: [{ ...b, quota: quotas[i] }] },
      course.cotes,
      { [b.id]: regle },
    ).ticket
    pris.forEach((n) => ticket.push(n))
  })
  return ticket
}
const testQuotas = quotasPossibles.map((q) => ({
  q, nom: q.join('-'),
  A: agreger(A.map((c) => noter(avecQuotas(c, q), c.arrivee))),
  a1: agreger(A.slice(0, moitieA).map((c) => noter(avecQuotas(c, q), c.arrivee))),
  a2: agreger(A.slice(moitieA).map((c) => noter(avecQuotas(c, q), c.arrivee))),
  B: agreger(B.map((c) => noter(avecQuotas(c, q), c.arrivee))),
  antiA: agreger(A.map((c) => noter(avecQuotas(c, q, 'anti'), c.arrivee))),
  antiB: agreger(B.map((c) => noter(avecQuotas(c, q, 'anti'), c.arrivee))),
}))
testQuotas.sort((a, b) => b.A.podium - a.A.podium || b.A.x5 - a.A.x5)
console.log('  quotas   A: x/5    5/5     ≥4     podium   1re mt · 2ᵈᵉ mt  │  B: x/5   podium  │  A avec la règle ANTI')
for (const t of testQuotas) {
  console.log('  ' + t.nom.padEnd(7) + '  ' + t.A.x5.toFixed(2) + '  ' + pc(t.A.cinq).padStart(6) + '  ' + pc(t.A.quatre).padStart(6) + '  ' + pc(t.A.podium).padStart(6) +
    '   ' + pc(t.a1.podium).padStart(6) + ' · ' + pc(t.a2.podium).padStart(6) +
    '  │  ' + t.B.x5.toFixed(2) + '  ' + pc(t.B.podium).padStart(6) +
    '  │  x/5 ' + t.antiA.x5.toFixed(2) + ' · podium ' + pc(t.antiA.podium).padStart(6) + (t.nom === '3-2-3' ? '   ← le découpage demandé' : ''))
}

/* le meilleur quota contre celui qui est demandé, apparié */
const qDemande = testQuotas.find((t) => t.nom === '3-2-3')
const qMeilleur = testQuotas[0]
const tirageQuotas = (tirages = 10000) => {
  const na = A.map((c) => noter(avecQuotas(c, qMeilleur.q), c.arrivee))
  const nb = A.map((c) => noter(avecQuotas(c, qDemande.q), c.arrivee))
  let mieux = 0, pire = 0
  const d = []
  for (let t = 0; t < tirages; t++) {
    let pa = 0, pb = 0
    for (let i = 0; i < A.length; i++) {
      const k = Math.floor(Math.random() * A.length)
      pa += na[k].podium ? 1 : 0; pb += nb[k].podium ? 1 : 0
    }
    if (pa > pb) mieux++
    if (pa < pb) pire++
    d.push(pa - pb)
  }
  d.sort((x, y) => x - y)
  return { mieux: 100 * mieux / tirages, pire: 100 * pire / tirages, median: d[Math.floor(tirages / 2)] }
}
const bsQ = tirageQuotas()
console.log('  bootstrap A (10 000 tirages, appariés) : ' + qMeilleur.nom + ' bat 3-2-3 dans ' + pc(bsQ.mieux) +
  ' des tirages · perd dans ' + pc(bsQ.pire) + ' · écart médian ' + sg(bsQ.median) + ' courses sur ' + A.length)

/* ── ⑨ octobre, course par course ── */
titre('⑫ OCTOBRE — le ticket du nouveau moteur, course par course (' + B.length + ' courses)')
let cumul = 0
for (const c of B) {
  const t = ticketProno(c, RETENU)
  const n = noter(t, c.arrivee)
  const q = noter(ticketQuinte(c), c.arrivee)
  cumul += n.x5
  console.log('  ' + c.date + '  ' + String(c.hippo).slice(0, 18).padEnd(19) +
    t.map((x) => String(x).padStart(2)).join('·') +
    '  → ' + n.x5 + '/5' + (n.podium ? ' PODIUM' : '     ') +
    '  Quinté ' + q.x5 + '/5')
}
console.log('  ── total octobre : ' + (cumul / B.length).toFixed(2) + ' chevaux de l\'arrivée par course')

/* ── ⑧ l'artefact ── */
if (ECRIRE) {
  const sortie = {
    genere: new Date().toISOString(),
    decoupage: BLOCS_PRONO,
    regle: RETENU,
    /* ce que la PAGE joue réellement — CHOIX_PRONO du module */
    production: {
      choix: CHOIX_PRONO,
      A: noterSur(A, CHOIX_PRONO),
      B: noterSur(B, CHOIX_PRONO),
      quinteA: qA, quinteB: qB,
    },
    corpus: { A: A.length, B: B.length },
    /* le contre-exemple mesuré : le choix « contre la presse et contre le
     * marché » demandé le 31/10 — c'est ce que coûte l'opposition systématique */
    anti: {
      uniforme: uniformes.map((u) => ({ regle: u.regle, A: u.r.A, B: u.r.B })),
      podiumA: resultats.find((r) => r.nom === 'TTT').A.podium,
      podiumB: resultats.find((r) => r.nom === 'TTT').B.podium,
    },
    courbe: courbe.map((c) => ({ N: c.N, A: c.A, B: c.B })),
    seuil70: seuil ? seuil.N : null,
    classement: resultats.map((r) => ({ nom: r.nom, choix: r.choix, A: r.A, a1: r.a1, a2: r.a2, B: r.B })),
    quotas: testQuotas.map((t) => ({ nom: t.nom, q: t.q, A: t.A, a1: t.a1, a2: t.a2, B: t.B })),
    bootstrapQuotas: { meilleur: qMeilleur.nom, demande: '3-2-3', ...bsQ },
    quinte: { A: qA, B: qB, cccA: base.A, cccB: base.B },
    bootstrap: bs,
    octobre: B.map((c) => ({ date: c.date, hippodrome: c.hippo, ticket: ticketProno(c, RETENU), arrivee: c.arrivee.slice(0, 5) })),
  }
  fs.writeFileSync(RACINE + '/data/prono-moteur.json', JSON.stringify(sortie, null, 2))
  fs.copyFileSync(RACINE + '/data/prono-moteur.json', RACINE + '/public/data/prono-moteur.json')
  console.log('\n  → data/prono-moteur.json + public/data/prono-moteur.json')
}
console.log('')
