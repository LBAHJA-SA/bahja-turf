/* ---------------------------------------------------------------
 * tools\mesure-podium.mjs  —  ⭐ LE TEST QUI TRANCHE
 *
 *   node tools\mesure-podium.mjs
 *
 * Ce n'est pas « combien de chevaux du podium il y a dans chaque bande ».
 * C'est : **est-ce qu'une ticket de 8 chevaux peut COUVRIR le podium ?**
 *
 * Pour chaque course :
 *   podium  = 1er + 2e + 3e
 *   pour chacun des trois : son bloc G1..G5 (P1-P4 / P5-P8 / P9-P10 /
 *   P11-P12 / P13+)
 *   ticket   = une répartition (ex. 3-2-1-1-1) remplie d'une certaine
 *              façon (par la cote, ou par le rang de presse)
 *   → on note 3/3, 2/3, 1/3 ou 0/3
 *
 * Et surtout : pour chaque bloc, la CONTRIBUTION RÉELLE —
 *   attrapé  = chevaux du podium de ce bloc que la ticket prend
 *   perdu     = chevaux du podium de ce bloc que la ticket NE prend pas
 *   gaspillé  = chevaux pris dans ce bloc qui ne sont pas sur le podium
 *
 * C'est exactement la distinction qui compte : prendre 3 dans G1 ne vaut rien
 * si on prend les 3 mauvais.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'presse-carriere.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4 },
  { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]
const blocDe = (p) => (BLOCS.find((b) => p >= b.min && p <= b.max) || BLOCS[4]).id

const brut = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = []
for (const k of Object.values(brut)) {
  if (!k.partants?.length || k.partants.length < 10) continue
  if (!k.arrivee?.length || k.arrivee.length < 5) continue
  const presse = (k.presse || []).filter((x) => k.arrivee.includes(x))
  const nums = presse.concat(k.arrivee.filter((x) => !presse.includes(x)))
  if (nums.length < 10) continue
  const pDe = new Map(nums.map((x, i) => [x, i + 1]))
  const avecC = Object.keys(k.cotes || {}).map(Number).filter((x) => k.cotes[x] > 0)
  if (avecC.length < 8) continue
  base.push({ ...k, nums, pDe, cotes: k.cotes, podium: k.arrivee.slice(0, 3) })
}
const n = base.length

/* --------------------------------------------------------------- outils --- */
const blocsDe = (k) => BLOCS.map((b) => k.nums.filter((num) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max }))

const remplir = {
  cote: (k, bloc) => bloc.slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999)),
  presse: (k, bloc) => bloc.slice().sort((a, b) => k.pDe.get(a) - k.pDe.get(b)),
}

const parQuota = (q) => (k, mode) => blocsDe(k).flatMap((bloc, i) => remplir[mode](k, bloc).slice(0, q[i]))
const plat8 = (k) => k.nums.slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999)).slice(0, 8)

const REPARTITIONS = [
  ['top-8 (à plat)', null],
  ['3-2-1-1-1', [3, 2, 1, 1, 1]],
  ['2-2-1-1-1', [2, 2, 1, 1, 1]],
  ['2-2-2-1-1', [2, 2, 2, 1, 1]],
  ['3-2-2-1-0', [3, 2, 2, 1, 0]],
  ['3-3-1-1-0', [3, 3, 1, 1, 0]],
  ['3-3-1-1-1', [3, 3, 1, 1, 1]],
  ['2-4-1-1-1', [2, 4, 1, 1, 1]],
  ['3-3-2-1-1', [3, 3, 2, 1, 1]],
]

const ticketDe = (nom, k, mode) => {
  const r = REPARTITIONS.find((x) => x[0] === nom)
  return r[1] ? parQuota(r[1])(k, mode) : plat8(k)
}

const pct = (v) => (v / n * 100).toFixed(1).padStart(5) + ' %'

/* ================================================== ① LA COUVERTURE ======= */
console.log('')
console.log(`  ⭐ LE PODIUM EST-IL COUVERT ? — ${n} Quintés`)
console.log('')
console.log('  répartition      remplissage   n    3/3     2/3     1/3     0/3   |   ≥2/3     ≥1/3    attrapé')
console.log('  ' + '-'.repeat(92))
for (const [nom] of REPARTITIONS) {
  for (const mode of (nom.startsWith('top-8') ? ['cote'] : ['cote', 'presse'])) {
    const t = base.map((k) => {
      const tk = ticketDe(nom, k, mode)
      return { n: tk.length, hits: k.podium.filter((x) => tk.includes(x)).length }
    })
    const rep = [0, 0, 0, 0]
    t.forEach((x) => rep[x.hits]++)
    const ge2 = (t.filter((x) => x.hits >= 2).length / n * 100).toFixed(1) + ' %'
    const ge1 = (t.filter((x) => x.hits >= 1).length / n * 100).toFixed(1) + ' %'
    const attrape = (t.reduce((s, x) => s + x.hits, 0) / (n * 3) * 100).toFixed(1) + ' %'
    console.log('  ' + nom.padEnd(16) + mode.padEnd(14) + String(Math.round(t.reduce((a, b) => a + b.n, 0) / n)).padStart(3)
      + pct(rep[3]) + pct(rep[2]) + pct(rep[1]) + pct(rep[0]) + '  |  ' + ge2.padStart(6) + ge1.padStart(9) + attrape.padStart(10))
  }
}

/* ============================== ② LA CONTRIBUTION RÉELLE DE CHAQUE BLOC === */
console.log('')
console.log('  ⭐⭐ CONTRIBUTION RÉELLE — répartition 3-2-1-1-1, remplie par la cote')
console.log('')
console.log('  bloc   courses où    places de     ATTRAPÉES    PERDUES      GASPILLÉES')
console.log('         le podium a   podium dans   (prises)     (laissées)   (prises pour rien)')
console.log('         un cheval     ce bloc')
console.log('  ' + '-'.repeat(88))
const q = [3, 2, 1, 1, 1]
const stat = BLOCS.map(() => ({ present: 0, places: 0, attrape: 0, perdue: 0, gaspille: 0 }))
const totalAttrape = []
for (const k of base) {
  const tk = ticketDe('3-2-1-1-1', k, 'cote')
  const tkSet = new Set(tk)
  // combien de chevaux du podium par bloc
  const parBloc = BLOCS.map((b, i) => {
    const numsBloc = new Set(blocsDe(k)[i])
    const podBloc = k.podium.filter((x) => numsBloc.has(x))
    const prises = tk.filter((x) => numsBloc.has(x))
    return { podBloc, prises }
  })
  k.podium.forEach((x) => {
    const i = BLOCS.findIndex((b) => b.id === blocDe(k.pDe.get(x)))
    if (i >= 0) stat[i].places++
  })
  parBloc.forEach((b, i) => {
    if (b.podBloc.length) stat[i].present++
    stat[i].attrape += b.podBloc.filter((x) => tkSet.has(x)).length
    stat[i].perdue += b.podBloc.filter((x) => !tkSet.has(x)).length
    stat[i].gaspille += b.prises.filter((x) => !k.podium.includes(x)).length
  })
  totalAttrape.push(k.podium.filter((x) => tkSet.has(x)).length)
}
BLOCS.forEach((b, i) => {
  const s = stat[i]
  console.log('  ' + b.id.padEnd(6) + String(s.present).padStart(10) + String(s.places).padStart(14)
    + String(s.attrape).padStart(14) + String(s.perdue).padStart(11) + String(s.gaspille).padStart(14)
    + '   (' + q[i] + ' pris dans ce bloc)')
})
const totAttrape = stat.reduce((s, x) => s + x.attrape, 0)
const totPerdue = stat.reduce((s, x) => s + x.perdue, 0)
const totGasp = stat.reduce((s, x) => s + x.gaspille, 0)
console.log('  ' + '-'.repeat(88))
console.log('  ' + 'TOTAL'.padEnd(6) + ''.padStart(10) + String(n * 3).padStart(14)
  + String(totAttrape).padStart(14) + String(totPerdue).padStart(11) + String(totGasp).padStart(14))
console.log('')
console.log('  ⭐ lecture : « perdu » = un cheval du podium que la ticket NE prend pas.')
console.log('     « gaspillé » = un cheval pris dans la ticket qui n était pas sur le podium.')
console.log('')

/* ================================ ③ où va l'effort, et à quel prix ======= */
console.log('  ⭐ OÙ EST LA PERTE ?')
console.log('')
stat.forEach((s, i) => {
  const tot = s.attrape + s.perdue
  if (!tot) return
  console.log('  ' + BLOCS[i].id + ' : ' + s.attrape + ' attrapés / ' + tot + ' possibles  =  '
    + (s.attrape / tot * 100).toFixed(0).padStart(3) + ' %   (' + s.perdue + ' perdus pour rien dans ce bloc)')
})
console.log('')
console.log('  ⭐ le bloc où l’on rate le plus : '
  + BLOCS[stat.map((s) => s.perdue).indexOf(Math.max(...stat.map((s) => s.perdue)))].id)
console.log('')

/* ============================================ ④ LE TROISIÈME MANQUANT ==== */
console.log('  ⭐ ET PLUS PRÉCISÉMENT : quand on n\'attrape PAS les 3, c\'est lequel ?')
console.log('')
const manqueBloc = {}
for (const k of base) {
  const tk = new Set(ticketDe('3-2-1-1-1', k, 'cote'))
  for (const x of k.podium) {
    if (tk.has(x)) continue
    const b = blocDe(k.pDe.get(x))
    manqueBloc[b] = (manqueBloc[b] || 0) + 1
  }
}
for (const b of BLOCS) {
  const v = manqueBloc[b.id] || 0
  const barre = '█'.repeat(Math.round(v / totPerdue * 40))
  console.log('  ' + b.id.padEnd(6) + String(v).padStart(4) + ' fois  ' + (v / totPerdue * 100).toFixed(0).padStart(3) + ' %  ' + barre)
}
console.log('')
