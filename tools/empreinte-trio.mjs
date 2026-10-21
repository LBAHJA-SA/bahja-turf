/* tools/empreinte-trio.mjs — L'EMPREINTE DU TRIO (page /coply).
 *
 *  Demande de l'utilisateur (20/10/2026) :
 *    « دابا بغيت بصمة حقيقية للتريو في هذه الصفحة Coply. الامر يختلف عن سباقات
 *      الكانتي لان الاول والتاني يربح والتاني والتالت يربح والاول والتالت يربح »
 *
 *  Même objet que `tools/empreinte.mjs` (§15.8), mais pour les TROIS premières
 *  places seulement — et lu par CASE DU CARNET (P1..P20), le P que la grille
 *  affiche. Trois choses, et rien d'autre :
 *
 *    motifs      le motif par groupe : combien de chevaux de G1, G2, G3, G4, G5
 *                (« 2·1·0·0·0 » = 2 de G1 + 1 de G2)
 *    pairesCases LA VRAIE EMPREINTE DU TRIO : chaque trio = 3 paires ; on
 *                compte, paire de cases par paire de cases, le nombre de
 *                COURSES où deux des trois premiers occupent ces deux cases.
 *                « 1-2 14,6 % » = jouer le couplé des cases 1 et 2 paie dans
 *                14,6 % des courses. (Instruction du 20/10/2026 :
 *                « 1-2 · 1-4 · 2-4 كل واحد بنسبتو ».)
 *    courbe      à partir de k cases (P1..Pk) : le COUPLÉ (≥ 2 des 3) et le
 *                TRIO (les 3)
 *
 *  Source UNIQUE : data/quintes.json — la presse réelle (§11.23 : jamais
 *  fusion.json pour les cases). Le marché n'entre pas ici : la page Quinté et
 *  cette empreinte parlent la même langue, celle du carnet.
 *
 *  Usage : node tools/empreinte-trio.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildGrid } from '../src/lib/quinte.js'

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const lire = (p) => JSON.parse(fs.readFileSync(path.join(RACINE, p), 'utf8'))
const arr = (x) => (Array.isArray(x) ? x : [])
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)

const GROUPES = [
  { id: 'G1', min: 1, max: 4 },
  { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 20 },
]
const groupeDe = (p) => GROUPES.find((g) => p >= g.min && p <= g.max)?.id

/* ── le corpus : les Quintés dont on a la VRAIE presse ──────────────────── */
const recs = []
for (const q of lire('data/quintes.json')) {
  const presse = arr(q.presse).filter(Number.isFinite)
  const arrivee = arr(q.arrivee).filter(Number.isFinite)
  const cotes = q.cotes || {}
  const nums = Object.keys(cotes).map(Number).filter(Number.isFinite)
  if (presse.length < 10 || arrivee.length < 5 || nums.length < 10) continue
  if (nums.some((n) => !(cotes[n] > 1))) continue
  recs.push({ date: q.date, synthese: presse, runners: nums, arrivee })
}
recs.sort((a, b) => String(a.date).localeCompare(String(b.date)))

/* ── la case P de chacun des 3 premiers (vrai buildGrid) ────────────────── */
const lignes = []
for (const r of recs) {
  let g
  try { g = buildGrid(r.synthese, r.runners) } catch { continue }
  const trois = r.arrivee.slice(0, 3)
  const cases = trois.map((n) => g.slotParNum[n])
  if (cases.some((x) => !Number.isFinite(x))) continue
  lignes.push({ date: r.date, trois, cases: [...cases].sort((a, b) => a - b), groupes: cases.map(groupeDe) })
}
const N = lignes.length

/* ① le motif par groupe */
const mMotif = new Map()
const moy = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
for (const l of lignes) {
  const c = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
  for (const g of l.groupes) { if (!g) continue; c[g]++; moy[g]++ }
  const cle = [c.G1, c.G2, c.G3, c.G4, c.G5].join('·')
  mMotif.set(cle, (mMotif.get(cle) || 0) + 1)
}
for (const k of Object.keys(moy)) moy[k] = +(moy[k] / N).toFixed(2)
const motifs = [...mMotif.entries()]
  .map(([motif, n]) => ({ motif, n, pct: pct(n, N) }))
  .sort((a, b) => b.n - a.n || a.motif.localeCompare(b.motif))

/* ② l'empreinte par case */
const mEmp = new Map()
for (const l of lignes) {
  const cle = l.cases.join('-')
  mEmp.set(cle, (mEmp.get(cle) || 0) + 1)
}
const empreintes = [...mEmp.entries()]
  .map(([empreinte, n]) => {
    const [a, b, c] = empreinte.split('-').map(Number)
    return { empreinte, n, pct: pct(n, N), paires: [a + '-' + b, a + '-' + c, b + '-' + c] }
  })
  .sort((x, y) => y.n - x.n || x.empreinte.localeCompare(y.empreinte))
const distinctes = empreintes.length

/* ③ LES 3 PAIRES — la vraie empreinte du trio (instruction du 20/10/2026) :
 *    « 1-2 · 1-4 · 2-4 كل واحد بنسبتو ». Chaque trio donne 3 paires ; ici on
 *    compte, PAIRE DE CASES PAR PAIRE DE CASES, le nombre de COURSES où deux
 *    des trois premiers occupent ces deux cases. Un % se lit donc :
 *    « si je joue le couplé des cases a et b, il paie dans X % des courses ». */
const mPair = new Map()
for (const l of lignes) {
  const [a, b, c] = l.cases
  for (const [x, y] of [[a, b], [a, c], [b, c]]) {
    const cle = x + '-' + y
    mPair.set(cle, (mPair.get(cle) || 0) + 1)
  }
}
const pairesCases = [...mPair.entries()]
  .map(([paire, n]) => ({ paire, n, pct: pct(n, N) }))
  .sort((a, b) => b.n - a.n || a.paire.localeCompare(b.paire))

/* les 3 paires par BLOC (lecture dense) */
const mBloc = new Map()
for (const l of lignes) {
  const g = l.groupes
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
    if (!g[i] || !g[j]) continue
    const cle = [g[i], g[j]].sort().join('-')
    mBloc.set(cle, (mBloc.get(cle) || 0) + 1)
  }
}
const paires = [...mBloc.entries()]
  .map(([blocs, n]) => ({ blocs, n, pct: pct(n, N * 3) }))
  .sort((a, b) => b.n - a.n || a.blocs.localeCompare(b.blocs))

/* ④ combien de cases : le COUPLÉ (≥ 2 des 3) et le TRIO (les 3) */
const courbe = []
for (let k = 3; k <= 14; k++) {
  const d = lignes.filter((l) => l.cases.every((p) => p <= k)).length
  const d2 = lignes.filter((l) => l.cases.filter((p) => p <= k).length >= 2).length
  courbe.push({ k, trio: pct(d, N), n: d, couple: pct(d2, N), n2: d2 })
}

const out = {
  ecrit: new Date().toISOString().slice(0, 10),
  outil: 'tools/empreinte-trio.mjs',
  source: 'data/quintes.json — la presse réelle (jamais fusion.json pour les cases)',
  n: N,
  periode: { debut: lignes[0]?.date || null, fin: lignes[lignes.length - 1]?.date || null },
  groupes: 'G1 = P1-P4 · G2 = P5-P8 · G3 = P9-P10 · G4 = P11-P12 · G5 = P13+',
  lecture: 'une empreinte se lit en 3 paires : 1-2-4 = 1-2 · 1-4 · 2-4 (ce que paie le couplé)',
  motifs,
  moyenne: moy,
  empreintes,
  distinctes,
  pairesCases,
  paires,
  courbe,
}

fs.writeFileSync(path.join(RACINE, 'data', 'empreinte-trio.json'), JSON.stringify(out))
fs.writeFileSync(path.join(RACINE, 'public', 'data', 'empreinte-trio.json'), JSON.stringify(out))
fs.rmSync(path.join(RACINE, 'data', 'trio-empreinte.json'), { force: true })
fs.rmSync(path.join(RACINE, 'public', 'data', 'trio-empreinte.json'), { force: true })

/* ── le rapport ─────────────────────────────────────────────────────────── */
const rp = (s, n) => String(s).padStart(n)
console.log('\n  EMPREINTE DU TRIO — ' + N + ' Quintés à presse réelle (' + out.periode.debut + ' → ' + out.periode.fin + ')')
console.log('  ' + out.groupes + '\n')

console.log('  LE MOTIF — combien de chevaux de chaque groupe dans les 3 premiers')
for (const m of motifs.slice(0, 10)) console.log('     ' + m.motif.padEnd(12) + rp(m.n, 4) + rp(m.pct + ' %', 8))
console.log('     moyenne par course : ' + JSON.stringify(moy) + ' · ' + motifs.length + ' motifs')

console.log('\n  L\'EMPREINTE — la case exacte des 3 premiers (triée)')
for (const e of empreintes.slice(0, 10)) console.log('     ' + e.empreinte.padEnd(12) + rp(e.n, 4) + rp(e.pct + ' %', 8) + '   = ' + e.paires.join(' · '))
console.log('     ' + distinctes + ' empreintes distinctes · la plus fréquente : ' + empreintes[0].empreinte + ' (' + empreintes[0].pct + ' %)')

console.log('\n  LES 3 PAIRES — la vraie empreinte : chaque trio = 3 paires')
for (const p of pairesCases.slice(0, 12)) console.log('     ' + p.paire.padEnd(12) + rp(p.n, 4) + rp(p.pct + ' % des courses', 20))
console.log('     ' + pairesCases.length + ' paires distinctes · la plus fréquente : ' + pairesCases[0].paire + ' (' + pairesCases[0].pct + ' %)')

console.log('\n  LES 3 PAIRES PAR BLOC')
for (const p of paires) console.log('     ' + p.blocs.padEnd(12) + rp(p.n, 4) + rp(p.pct + ' %', 8))

console.log('\n  COMBIEN DE CASES — le couplé (≥ 2 des 3) et le trio (les 3)')
for (const c of courbe) console.log('     P1..P' + String(c.k).padEnd(3) + rp('couplé ' + c.couple + ' %', 16) + rp('trio ' + c.trio + ' %', 14))

console.log('\n  → data/empreinte-trio.json + public/data/empreinte-trio.json\n')
