/* =============================================================================
 * tools/sept.mjs — 7 CHEVAUX : LA RÉPARTITION, PUIS LE CHOIX DANS CHAQUE BLOC
 * (20/10/2026)
 *
 * L'utilisateur : « je cherche seulement 7 chevaux, j'ai trouvé le meilleur
 * découpage — ce qui me manque c'est LE CHOIX dans chaque bloc ».
 * Et il a écarté l'idée d'ajouter un cheval.
 *
 * Deux questions, deux mesures :
 *
 *   ① À 7 CHEVAUX, quelle répartition ? (G3 reste obligatoire)
 *   ② À cette répartition, QUI prend-on dans chaque bloc : le carnet (rang de
 *      presse P) ou le marché (la cote) ? 2⁴ combinaisons, mesurées une à une.
 *
 * Métriques DENSES (jamais le cheval isolé) : podium entier (3/3) et quinté
 * entier (5/5).
 *
 * ⚠ Le corpus à presse réelle est `data/quintes.json` (96 courses) : c'est le
 * seul qui porte les places P1..P20. Les 123 archives n'ont pas la presse, donc
 * elles ne peuvent pas départager carnet contre marché. Pour ne pas conclure
 * sur un échantillon, tout est rejoué en DEUX MOITIÉS chronologiques : la règle
 * choisie sur une moitié est notée sur l'autre.
 *
 *   node tools\sept.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, remplirGrille } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)

/* ─────────────────────────────── l'échantillon ─────────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const BRUT = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  BRUT.push({ q, nums, syn, cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])) })
}
const REC = BRUT.map((c) => ({
  date: c.q.date, discipline: c.q.discipline,
  synthese: c.syn, runners: c.nums, arrivee: c.q.arrivee.slice(0, 5),
}))
/* tout est pré-calculé une fois : grille, classement, stats LOO, arrivée */
const C = BRUT.map((c, i) => {
  const grille = buildGrid(c.syn, c.nums)
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  return { c, grille, cl, stats: computeStats(REC.filter((_, k) => k !== i)), arr: c.q.arrivee }
})

/* ─────────────────────────────── le moteur ─────────────────────────────── */
function jouer(c, quotas, choix, { ordonner = false } = {}) {
  const g2 = { groupes: c.grille.groupes.map((g, k) => ({ ...g, quota: Math.min(quotas[k], g.cases.length) })) }
  const r = remplirGrille(g2, c.cl, c.c.q.discipline, c.c.cotes, c.stats, choix)
  return r.ticket
}
function noter(liste, quotas, choix) {
  let pod = 0, qui = 0, q4 = 0, ch = 0
  for (const c of liste) {
    const t = jouer(c, quotas, choix)
    const s = new Set(t)
    ch += t.length
    if (c.arr.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arr.slice(0, 5).every((x) => s.has(x))) qui++
    if (c.arr.slice(0, 5).filter((x) => s.has(x)).length >= 4) q4++
  }
  return { pod, qui, q4, n: liste.length, ch: ch / (liste.length || 1) }
}

/* ═════════════ ① TOUTES LES RÉPARTITIONS DE 7 (G3 obligatoire) ═══════════ */
const SEPT = []
for (let q1 = 0; q1 <= 4; q1++)
  for (let q2 = 0; q2 <= 4; q2++)
    for (let q3 = 1; q3 <= 2; q3++)
      for (let q4 = 0; q4 <= 2; q4++) {
        const q5 = 7 - q1 - q2 - q3 - q4
        if (q5 < 0 || q5 > 7) continue
        SEPT.push([q1, q2, q3, q4, q5])
      }
const cle = (q) => q.join('-')

console.log('\n  ① À 7 CHEVAUX — ' + SEPT.length + ' répartitions possibles (G3 ≥ 1 : il est obligatoire)')
const noteSept = SEPT.map((q) => ({ q, r: noter(C, q, null) }))
noteSept.sort((a, b) => (b.r.qui - a.r.qui) || (b.r.pod - a.r.pod))
console.log('  ' + pad('répartition', 13) + pad('chev.', 7) + pad('podium entier', 15) + pad('quinté entier', 15) + '≥4 quinté')
for (const { q, r } of noteSept.slice(0, 10)) {
  console.log('  ' + pad(cle(q), 13) + pad(r.ch.toFixed(2), 7) + pad(pct(r.pod, r.n), 15) + pad(pct(r.qui, r.n), 15) + pct(r.q4, r.n))
}
const prod7 = noteSept.findIndex((x) => cle(x.q) === '3-2-1-1-0') + 1
console.log('  …\n  le classique 3-2-1-1-0 : rang ' + (prod7 || 'absent') + ' / ' + SEPT.length)
/* la même question, moitié par moitié : le rang tient-il ? */
{
  const mh = Math.floor(C.length / 2)
  const rangSur = (liste) => {
    const notes = SEPT.map((q) => ({ q, r: noter(liste, q, null) }))
    notes.sort((a, b) => (b.r.qui - a.r.qui) || (b.r.pod - a.r.pod))
    return notes.findIndex((x) => cle(x.q) === '3-2-1-1-0') + 1
  }
  console.log('  moitié par moitié, 3-2-1-1-0 est : rang ' + rangSur(C.slice(0, mh)) +
    ' / ' + SEPT.length + ' sur la 1ʳᵉ · rang ' + rangSur(C.slice(mh)) + ' / ' + SEPT.length + ' sur la 2ᵈᵉ')
}

/* ═════════ ② À 3-2-1-1-0 — LE CHOIX DANS CHAQUE BLOC (16 combos) ════════ */
const SPLIT = [3, 2, 1, 1, 0]
const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']
const ACTIFS = IDS.filter((id) => SPLIT[IDS.indexOf(id)] > 0)
const COMBOS = []
for (let m = 0; m < 16; m++) {
  const ch = {}
  ACTIFS.forEach((id, k) => { ch[id] = (m >> k) & 1 ? 'marche' : 'carnet' })
  COMBOS.push(ch)
}
const nom = (ch) => ACTIFS.map((id) => (ch[id] === 'carnet' ? 'C' : 'M')).join('')
const PROD = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' }

console.log('\n  ② À 3-2-1-1-0 — QUI PREND-ON DANS CHAQUE BLOC ? (C = carnet · M = marché)')
console.log('  ' + pad('règle', 9) + pad('G1', 5) + pad('G2', 5) + pad('G3', 5) + pad('G4', 5) +
  pad('podium entier', 15) + pad('quinté entier', 15) + '≥4 quinté')
const noteChoix = COMBOS.map((ch) => ({ ch, r: noter(C, SPLIT, ch) }))
noteChoix.sort((a, b) => (b.r.qui - a.r.qui) || (b.r.pod - a.r.pod))
for (const { ch, r } of noteChoix.slice(0, 8)) {
  console.log('  ' + pad(nom(ch), 9) + pad(ch.G1 === 'carnet' ? 'C' : 'M', 5) + pad(ch.G2 === 'carnet' ? 'C' : 'M', 5) +
    pad(ch.G3 === 'carnet' ? 'C' : 'M', 5) + pad(ch.G4 === 'carnet' ? 'C' : 'M', 5) +
    pad(pct(r.pod, r.n), 15) + pad(pct(r.qui, r.n), 15) + pct(r.q4, r.n))
}
const prodRang = noteChoix.findIndex((x) => ACTIFS.every((id) => x.ch[id] === PROD[id])) + 1
console.log('  …\n  la règle de production (carnet partout sauf G4) : rang ' + prodRang + ' / ' + COMBOS.length)

/* ═════════ ③ L'EFFET D'UN SEUL BLOC, TOUTES CHOSES ÉGALES ═══════════════ */
/* On ne change QU'UN bloc à la fois en partant de la production, et on rejoue
 * les 96 courses. Le test est apparié : la même course est comparée à elle-même.
 * ⚠ Le bootstrap porte sur les ÉVÉNEMENTS qui paient (5/5 et ≥4), pas sur le
 * simple décompte d'arrivants : les deux peuvent diverger (voir G4). */
const evts = (liste, quotas, choix) => liste.map((c) => {
  const s = new Set(jouer(c, quotas, choix))
  const k = c.arr.slice(0, 5).filter((x) => s.has(x)).length
  return { c5: k === 5 ? 1 : 0, c4: k >= 4 ? 1 : 0 }
})
const boot = (d) => {
  let m = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let k = 0; k < d.length; k++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) m++
  }
  return m / 100
}
const A0 = evts(C, SPLIT, PROD)

console.log('\n  ③ L’EFFET D’UN BLOC SEUL — on ne change QUE ce bloc, depuis la production')
console.log('  ' + pad('bloc', 7) + pad('production', 12) + pad('l’autre', 10) + pad('quinté 5/5', 16) +
  pad('l’autre gagne (5/5)', 20) + 'l’autre gagne (≥4)')
for (const id of ACTIFS) {
  const autre = { ...PROD, [id]: PROD[id] === 'carnet' ? 'marche' : 'carnet' }
  const B0 = evts(C, SPLIT, autre)
  const d5 = A0.map((x, i) => B0[i].c5 - x.c5)
  const d4 = A0.map((x, i) => B0[i].c4 - x.c4)
  const p5 = d5.filter((x) => x > 0).length, m5 = d5.filter((x) => x < 0).length
  const nC = noter(C, SPLIT, PROD), nA = noter(C, SPLIT, autre)
  const g5 = boot(d5), g4 = boot(d4)
  const verdict = g5 < 10 ? 'production ✓' : g5 > 90 ? '⚠ l’autre est mieux' : 'indécis'
  console.log('  ' + pad(id, 7) + pad(PROD[id], 12) + pad(autre[id], 10) +
    pad(pct(nC.qui, nC.n) + ' → ' + pct(nA.qui, nA.n), 16) +
    pad((g5.toFixed(1) + ' %').padEnd(8) + '(' + p5 + ' / ' + m5 + ')', 20) +
    (g4.toFixed(1) + ' %').padEnd(18) + verdict)
}

/* ═════════ ⑤ UNE TROISIÈME OPTION PAR BLOC : LA FUSION CARNET + MARCHÉ ═══ */
/* Dans un bloc, on classe les cases par : le carnet (P), le marché (cote), ou
 * la FUSION (P + rang de marché). 3⁴ = 81 règles. C'est la seule famille qui
 * n'avait jamais été testée : jusqu'ici on n'opposait que deux ordres. */
for (const c of C) {
  const ordre = c.c.nums.slice().sort((a, b) => c.c.cotes[a].cote - c.c.cotes[b].cote || a - b)
  c.rm = Object.fromEntries(ordre.map((x, k) => [x, k + 1]))
}
function jouerLocal(c, quotas, modes) {
  const out = []
  c.grille.groupes.forEach((g, k) => {
    const q = Math.min(quotas[IDS.indexOf(g.id)], g.cases.length)
    const cle2 = (x) => (modes[g.id] === 'marche' ? c.rm[x.num]
      : modes[g.id] === 'fusion' ? x.place + c.rm[x.num] : x.place)
    g.cases.slice().sort((a, b) => cle2(a) - cle2(b) || a.place - b.place)
      .slice(0, q).forEach((x) => out.push(x.num))
  })
  return out
}
const OPTIONS = ['carnet', 'marche', 'fusion']
const M81 = []
for (let m = 0; m < 81; m++) {
  const ch = {}
  ACTIFS.forEach((id, k) => { ch[id] = OPTIONS[Math.floor(m / Math.pow(3, k)) % 3] })
  M81.push(ch)
}
const note81 = M81.map((ch) => {
  let pod = 0, qui = 0
  for (const c of C) {
    const s = new Set(jouerLocal(c, SPLIT, ch))
    if (c.arr.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arr.slice(0, 5).every((x) => s.has(x))) qui++
  }
  return { ch, pod, qui }
})
note81.sort((a, b) => (b.qui - a.qui) || (b.pod - a.pod))
const sigle = (ch) => ACTIFS.map((id) => ({ carnet: 'C', marche: 'M', fusion: 'F' }[ch[id]])).join('')
console.log('\n  ④ TROIS OPTIONS PAR BLOC — carnet (C) · marché (M) · fusion P+cote (F) — 81 règles')
console.log('  ' + pad('règle', 8) + pad('podium entier', 15) + pad('quinté entier', 15) + '≥4')
for (const x of note81.slice(0, 8)) {
  console.log('  ' + pad(sigle(x.ch), 8) + pad(pct(x.pod, C.length), 15) + pad(pct(x.qui, C.length), 15) +
    pct(C.filter((c) => {
      const s = new Set(jouerLocal(c, SPLIT, x.ch))
      return c.arr.slice(0, 5).filter((y) => s.has(y)).length >= 4
    }).length, C.length))
}
const rangProd81 = note81.findIndex((x) => ACTIFS.every((id) => x.ch[id] === PROD[id])) + 1
console.log('  …\n  la production (CCCM) : rang ' + rangProd81 + ' / 81')
console.log('\n  ⑤ HORS ÉCHANTILLON — la règle choisie sur une moitié, notée sur l’autre')
const m = Math.floor(C.length / 2)
const H = [C.slice(0, m), C.slice(m)]
const noterLocal = (liste, ch) => {
  let pod = 0, qui = 0
  for (const c of liste) {
    const s = new Set(jouerLocal(c, SPLIT, ch))
    if (c.arr.slice(0, 3).every((x) => s.has(x))) pod++
    if (c.arr.slice(0, 5).every((x) => s.has(x))) qui++
  }
  return { pod, qui, n: liste.length }
}
const meilleurSur = (liste) => {
  const notes = M81.map((ch) => ({ ch, r: noterLocal(liste, ch) }))
  notes.sort((a, b) => (b.r.qui - a.r.qui) || (b.r.pod - a.r.pod))
  return notes[0].ch
}
let totalAuto = 0, totalProd = 0, totalN = 0
for (const [a, b] of [[0, 1], [1, 0]]) {
  const ch = meilleurSur(H[a])
  const rA = noterLocal(H[b], ch)
  const rP = noterLocal(H[b], PROD)
  totalAuto += rA.qui; totalProd += rP.qui; totalN += rA.n
  console.log('  choisi sur ' + (a === 0 ? 'la 1ʳᵉ' : 'la 2ᵈᵉ') + ' moitié → ' + sigle(ch) +
    '   noté sur l’autre : ' + pct(rA.pod, rA.n) + ' / ' + pct(rA.qui, rA.n) +
    '   (production : ' + pct(rP.pod, rP.n) + ' / ' + pct(rP.qui, rP.n) + ')')
}
console.log('  ' + pad('TOTAL hors échantillon', 38) + 'règle choisie ' + pct(totalAuto, totalN) + ' de quinté · production ' + pct(totalProd, totalN))
console.log('')
