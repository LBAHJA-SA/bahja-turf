/* =============================================================================
 * tools/test-apparie.mjs — PLUSIEURS RÉPARTITIONS, MÊME MOTEUR (21/10/2026)
 *
 * On ne change QUE la répartition des sièges entre les blocs : même corpus,
 * mêmes cotes, même règle de choix (carnet G1-G3 · marché G4-G5). Le nombre de
 * chevaux peut changer d'une répartition à l'autre — il est AFFICHÉ, pour que
 * « 8 chevaux » et « 9 chevaux » ne se confondent jamais.
 *
 * ⚠ POURQUOI CE TEST EXISTE.
 *   `tools/test-quotas.mjs` (celui du §11.26) n'appelle PAS le moteur : il
 *   réimplémente le remplissage (sa fonction `remplir()`), sans `computeStats`.
 *   Sur le VRAI `remplirGrille`, la production donne **8,3 %** de quinté entier,
 *   pas les 11,5 % qu'il annonce. Ici : le VRAI `buildGrid` + le VRAI
 *   `remplirGrille` + `computeStats` en leave-one-out, comme
 *   `tools/verif-production.mjs` et `tools/egaler.mjs`.
 *
 * MESURE DU 21/10/2026 (96 Quintés à presse réelle) :
 *
 *   répartition   chevaux   podium entier        quinté entier
 *   3-2-1-1-1     8,00      38,5 %  (37/96)       8,3 %  ( 8/96)   ← le moteur
 *   4-2-1-1-0     8,00      47,9 %  (46/96)      12,5 %  (12/96)
 *
 *   bootstrap apparié 10 000, « 4-2-1-1-0 fait mieux » :
 *     podium  99,0 % (pire 0,5 %)   écart +0,094 [0,031 ; 0,156]
 *     quinté  89,7 % (pire 5,0 %)   écart +0,042 [0,000 ; 0,094]
 *     arrivants du top 5 trouvés :  +0,229 [0,125 ; 0,333]
 *
 * USAGE
 *   node tools\test-apparie.mjs 4-2-1-1-0
 *   node tools\test-apparie.mjs 3-2-1-1-1 4-2-1-1-0 4-2-1-1-1
 *
 *   La 1ʳᵉ répartition donnée est la RÉFÉRENCE. Sans argument :
 *   3-2-1-1-1 (le moteur) contre 4-2-1-1-0. L'IC qui ne contient pas 0 = le
 *   gain n'est pas du hasard.
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, computeStats } from '../src/lib/quinte.js'

const lire = (s) => {
  const n = String(s).split('-').map(Number)
  if (n.length !== 5 || n.some((x) => !Number.isInteger(x) || x < 0)) throw new Error('répartition invalide : ' + s)
  return { nom: s, q: { G1: n[0], G2: n[1], G3: n[2], G4: n[3], G5: n[4] } }
}
const args = process.argv.slice(2)
const COMPOS = (args.length ? args : ['3-2-1-1-1', '4-2-1-1-0']).map(lire)
const REF = COMPOS[0]

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const C = []
for (const q of TOUT) {
  const c = q.cotes
  if (!c || Object.keys(c).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(c).map(Number)
  if (nums.some((n) => !(c[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => c[n] > 1)
  if (syn.length < 10) continue
  C.push({ q, nums, syn, cotes: Object.fromEntries(nums.map((n) => [n, { cote: c[n] }])) })
}
const REC = C.map((c) => ({
  date: c.q.date, discipline: c.q.discipline,
  synthese: c.syn, runners: c.nums, arrivee: c.q.arrivee.slice(0, 5),
}))

/* ── le ticket de chaque répartition pour chaque course (le VRAI moteur) ──── */
const tickets = {}
COMPOS.forEach(({ nom }) => { tickets[nom] = [] })
C.forEach((c, i) => {
  const grille = buildGrid(c.syn, c.nums)
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((x, y) => x.slot - y.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const stats = computeStats(REC.filter((_, k) => k !== i))
  for (const { nom, q } of COMPOS) {
    const g2 = { ...grille, groupes: grille.groupes.map((g) => ({ ...g, quota: q[g.id] ?? 0, obligatoire: false })) }
    tickets[nom].push(new Set(remplirGrille(g2, cl, c.q.discipline, c.cotes, stats).ticket))
  }
})

const N = C.length
const ev = (nom, i) => {
  const t = tickets[nom][i], a = C[i].q.arrivee
  return {
    pod: a.slice(0, 3).every((x) => t.has(x)) ? 1 : 0,
    qui: a.slice(0, 5).every((x) => t.has(x)) ? 1 : 0,
    couv: a.slice(0, 5).filter((x) => t.has(x)).length,
    taille: t.size,
  }
}
const tot = (nom) => {
  let p = 0, q = 0, t = 0
  for (let i = 0; i < N; i++) { const e = ev(nom, i); p += e.pod; q += e.qui; t += e.taille }
  return { p, q, taille: t / N }
}
const pc = (a, b) => (100 * a / b).toFixed(1).replace('.', ',') + ' %'
const R = tot(REF.nom)

console.log('\n  CORPUS : ' + N + ' Quintés à presse réelle — le VRAI remplirGrille, rien d’autre ne change\n')
console.log('  répartition   chevaux  podium entier        quinté entier         ≥4')
for (const { nom } of COMPOS) {
  const s = tot(nom)
  let q4 = 0
  for (let i = 0; i < N; i++) if (ev(nom, i).couv >= 4) q4++
  console.log('  ' + nom.padEnd(13) + s.taille.toFixed(2).replace('.', ',') + '    '
    + pc(s.p, N).padEnd(8) + '(' + String(s.p).padStart(2) + '/' + N + ')   '
    + pc(s.q, N).padEnd(8) + '(' + String(s.q).padStart(2) + '/' + N + ')   ' + pc(q4, N))
}
console.log('  référence : ' + REF.nom + '\n')

const T = 10000
for (const { nom } of COMPOS) {
  if (nom === REF.nom) continue
  let podM = 0, podP = 0, quiM = 0, quiP = 0
  const dPod = [], dQui = [], dCouv = []
  for (let t = 0; t < T; t++) {
    let ap = 0, bp = 0, aq = 0, bq = 0, ca = 0, cb = 0
    for (let k = 0; k < N; k++) {
      const i = (Math.random() * N) | 0
      const e = ev(REF.nom, i), f = ev(nom, i)
      ap += e.pod; bp += f.pod; aq += e.qui; bq += f.qui; ca += e.couv; cb += f.couv
    }
    if (ap < bp) podM++; else if (ap > bp) podP++
    if (aq < bq) quiM++; else if (aq > bq) quiP++
    dPod.push((bp - ap) / N); dQui.push((bq - aq) / N); dCouv.push((cb - ca) / N)
  }
  const ic = (d) => {
    const s = d.slice().sort((x, y) => x - y)
    return '[' + s[Math.floor(T * .05)].toFixed(3).replace('.', ',') + ' ; '
      + s[Math.floor(T * .95)].toFixed(3).replace('.', ',') + ']'
  }
  const moy = (d) => d.reduce((s, x) => s + x, 0) / d.length
  const sg = (x) => (x >= 0 ? '+' : '')
  console.log('  BOOTSTRAP 10 000 — « ' + nom + ' fait mieux que ' + REF.nom + ' » :')
  console.log('    podium entier : ' + (100 * podM / T).toFixed(1).replace('.', ',') + ' %   (pire ' + (100 * podP / T).toFixed(1).replace('.', ',') + ' %)')
  console.log('    quinté entier : ' + (100 * quiM / T).toFixed(1).replace('.', ',') + ' %   (pire ' + (100 * quiP / T).toFixed(1).replace('.', ',') + ' %)')
  console.log('    podiums gagnés            : ' + sg(moy(dPod)) + moy(dPod).toFixed(3).replace('.', ',') + '  ' + ic(dPod))
  console.log('    quintés gagnés            : ' + sg(moy(dQui)) + moy(dQui).toFixed(3).replace('.', ',') + '  ' + ic(dQui))
  console.log('    arrivants du top 5 trouvés: ' + sg(moy(dCouv)) + moy(dCouv).toFixed(3).replace('.', ',') + '  ' + ic(dCouv))
  console.log('')
}
console.log('  Un intervalle qui ne contient pas 0 = le gain n’est pas du hasard.\n')
