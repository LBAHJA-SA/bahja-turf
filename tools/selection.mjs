/**
 * SÉLECTION — quelle règle choisir DANS un bloc ? (les quotas ne bougent pas)
 *
 * Les quotas sont figés (3-2-1-1-1, §11.9). La seule variable libre est l'ORDRE
 * dans lequel on remplit chaque bloc.
 *
 * Deux mesures, de la plus grossière à la plus fine :
 *   A. le x/5 par course           → 4 points de mesure, très bruité
 *   B. le RANG de chaque arrivé     → 20 points de mesure, la vraie réponse
 *      à l'intérieur de son bloc
 *
 *   node tools\selection.mjs
 */
import fs from 'node:fs'
import { buildGrid, GROUPES } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))

const courses = []
for (const d of Object.keys(db).sort()) {
  const r = db[d]
  if (!r.arrivee?.length) continue
  const g = buildGrid(r.synthese, r.runners)
  const sc = Object.fromEntries((r.scores || []).map((x) => [x.num, x]))
  courses.push({ d, blocs: g.groupes, sc, arrivee: r.arrivee.slice(0, 5) })
}

const nbKo = (x) => (x?.filtres || []).filter((v) => !v).length
const nbOk = (x) => (x?.filtres || []).filter((v) => v).length

const REGLES = {
  'presse ↑ (ordre du carnet)': (a, b) => a.rang - b.rang,
  'physique (filtres ①③ puis global)': (a, b) =>
    (nbKo(a.s) - nbKo(b.s)) || ((b.s?.global ?? 0) - (a.s?.global ?? 0)),
  'global ↓': (a, b) => (b.s?.global ?? 0) - (a.s?.global ?? 0),
  'forme ↓': (a, b) => (b.s?.forme ?? 0) - (a.s?.forme ?? 0),
  'dist ↓': (a, b) => (b.s?.dist ?? 0) - (a.s?.dist ?? 0),
  'piste ↓': (a, b) => (b.s?.piste ?? 0) - (a.s?.piste ?? 0),
  'niveau ↓': (a, b) => (b.s?.niveau ?? 0) - (a.s?.niveau ?? 0),
  'terrain ↓': (a, b) => (b.s?.terrain ?? 0) - (a.s?.terrain ?? 0),
  'corde ↓': (a, b) => (b.s?.corde ?? 0) - (a.s?.corde ?? 0),
  'nb 3/3 puis presse ↑': (a, b) => (nbOk(b.s) - nbOk(a.s)) || (a.rang - b.rang),
  'nb 3/3 puis global ↓': (a, b) => (nbOk(b.s) - nbOk(a.s)) || ((b.s?.global ?? 0) - (a.s?.global ?? 0)),
  'FORME puis global ↓': (a, b) => ((b.s?.forme ?? 0) - (a.s?.forme ?? 0)) || ((b.s?.global ?? 0) - (a.s?.global ?? 0)),
  'FORME puis presse ↑': (a, b) => ((b.s?.forme ?? 0) - (a.s?.forme ?? 0)) || (a.rang - b.rang),
  'global ↓ puis FORME ↓': (a, b) => ((b.s?.global ?? 0) - (a.s?.global ?? 0)) || ((b.s?.forme ?? 0) - (a.s?.forme ?? 0)),
  'KO↑ puis FORME ↓ puis global ↓': (a, b) =>
    (nbKo(a.s) - nbKo(b.s)) || ((b.s?.forme ?? 0) - (a.s?.forme ?? 0)) || ((b.s?.global ?? 0) - (a.s?.global ?? 0)),
  'FORME ↓ puis KO↑ puis global ↓': (a, b) =>
    ((b.s?.forme ?? 0) - (a.s?.forme ?? 0)) || (nbKo(a.s) - nbKo(b.s)) || ((b.s?.global ?? 0) - (a.s?.global ?? 0)),
  'FORME ↓ puis presse ↑': (a, b) => ((b.s?.forme ?? 0) - (a.s?.forme ?? 0)) || (a.rang - b.rang),
  'FORME utile ↓ puis dist ↓': (a, b) => ((b.s?.forme ?? 0) - (a.s?.forme ?? 0)) || ((b.s?.dist ?? 0) - (a.s?.dist ?? 0)),
  'forme×0.5 + global (mixte)': (a, b) => {
    const v = (x) => (x?.s?.forme ?? 0) * 0.5 + (x?.s?.global ?? 0)
    return v(b) - v(a)
  },
  '— CONTRÔLE — global ↑': (a, b) => (a.s?.global ?? 0) - (b.s?.global ?? 0),
  '— CONTRÔLE — presse ↓': (a, b) => b.rang - a.rang,
  '— CONTRÔLE — forme ↑': (a, b) => (a.s?.forme ?? 0) - (b.s?.forme ?? 0),
}

/** classe les cases d'un bloc selon la règle ; renvoie num → rang (1 = retenu en premier) */
function classerBloc(bloc, cmp, sc) {
  const tri = bloc.cases.map((c) => ({ num: c.num, rang: c.slot, s: sc[c.num] })).sort(cmp)
  return Object.fromEntries(tri.map((c, i) => [c.num, i + 1]))
}

function jouer(cc, cmp) {
  const pris = []
  for (const g of cc.blocs) {
    const rang = classerBloc(g, cmp, cc.sc)
    pris.push(...g.cases.filter((c) => rang[c.num] <= g.quota).map((c) => c.num))
  }
  return [...new Set(pris)]
}

/* ═══════════ A. le x/5 par course ═══════════ */
console.log('\n' + '='.repeat(114))
console.log('  A. x/5 PAR COURSE — quotas figés ' + GROUPES.map((g) => g.quota).join('-')
  + '  (' + courses.length + ' Quintés clôturés, 4 points de mesure)')
console.log('='.repeat(114))

const lignes = []
for (const [nom, cmp] of Object.entries(REGLES)) {
  const lgn = courses.map((cc) => cc.arrivee.filter((n) => jouer(cc, cmp).includes(n)).length)
  lignes.push({ nom, cmp, lgn, tot: lgn.reduce((a, b) => a + b, 0), cinq: lgn.filter((n) => n === 5).length })
}
lignes.sort((a, b) => b.tot - a.tot)
console.log('\n  règle                              ' + courses.map((cc) => cc.d.slice(8).padStart(4)).join('') + '   TOTAL  5/5')
for (const x of lignes) {
  console.log('  ' + x.nom.padEnd(34) + x.lgn.map((n) => String(n).padStart(4)).join('')
    + String(x.tot).padStart(9) + '/20' + (x.cinq ? '   ' + x.cinq : '   —'))
}

/* ═══════════ B. le RANG de chaque arrivé dans son bloc ═══════════ */
console.log('\n' + '='.repeat(114))
console.log('  B. RANG DE CHAQUE ARRIVÉ DANS SON BLOC — 20 points de mesure')
console.log('     (rang 1 = retenu en premier · capté si rang ≤ quota du bloc)')
console.log('='.repeat(114))

const mesures = []
for (const [nom, cmp] of Object.entries(REGLES)) {
  let somme = 0, n = 0, capte = 0, podium = 0, blocOk = 0, blocN = 0
  const rangsG1 = []
  for (const cc of courses) {
    for (const g of cc.blocs) {
      const rang = classerBloc(g, cmp, cc.sc)
      for (const c of g.cases) {
        const p = cc.arrivee.indexOf(c.num)
        if (p < 0) continue
        blocN++
        if (rang[c.num] <= g.quota) { capte++; blocOk++ }
        if (rang[c.num] === 1) podium++
        if (g.id === 'G1') rangsG1.push(rang[c.num])
        somme += rang[c.num]; n++
      }
    }
  }
  mesures.push({ nom, cmp, moy: somme / n, capte, n, blocOk, blocN, podium,
    rang1: podium / n, rangsG1 })
}
mesures.sort((a, b) => b.capte - a.capte || a.moy - b.moy)

console.log('\n  règle                              captés      rang moyen   rang=1    rangs vus dans G1 (case)')
for (const x of mesures) {
  const pct = (x.capte / x.n * 100).toFixed(0) + '%'
  const histo = [1, 2, 3, 4].map((r) => x.rangsG1.filter((v) => v === r).length).join('/')
  console.log('  ' + x.nom.padEnd(34) + String(x.capte).padStart(4) + '/' + String(x.n).padEnd(3)
    + pct.padStart(7) + x.moy.toFixed(2).padStart(12) + (x.rang1 * 100).toFixed(0).padStart(8) + '%' + histo.padStart(22))
}

/* ═══════════ C. le detail par bloc ═══════════ */
console.log('\n' + '='.repeat(114))
console.log('  C. PAR BLOC — combien d\'arrivés captés, et le taux de base du bloc')
console.log('='.repeat(114))
const parBloc = {}
for (const cc of courses) {
  for (const g of cc.blocs) {
    parBloc[g.id] = parBloc[g.id] || { qu: g.quota, arrivees: 0, cases: 0 }
    parBloc[g.id].cases += g.cases.length
    parBloc[g.id].arrivees += g.cases.filter((c) => cc.arrivee.includes(c.num)).length
  }
}
console.log('\n  bloc   quota   cases   arrivés   (taux de base)')
for (const [id, b] of Object.entries(parBloc)) {
  const q = GROUPES.find((g) => g.id === id).quota
  console.log('  ' + id.padEnd(6) + String(q).padStart(5) + String(b.cases).padStart(8)
    + String(b.arrivees).padStart(9) + '   ' + (b.arrivees / b.cases * 100).toFixed(0).padStart(4) + '%')
}
let attendu = 0
for (const cc of courses) {
  for (const g of cc.blocs) {
    const q = Math.min(g.quota, g.cases.length)
    const arr = g.cases.filter((c) => cc.arrivee.includes(c.num)).length
    attendu += arr * (q / g.cases.length)
  }
}
console.log(`\n  → PLAFOND DU HASARD (tirage au hasard dans chaque bloc) : ${attendu.toFixed(1)}/20`)
console.log('  → toute règle SOUS ce chiffre est plus mauvaise que le hasard.')
console.log('  → les quotas donnent 8 chevaux sur ~15 partants : le hasard est déjà fort.')

/* ═══════════ D. qui est laissé dehors, et pourquoi ═══════════ */
console.log('\n' + '='.repeat(114))
console.log('  D. LE VRAI PROBLÈME — les 9 arrivés que le moteur perd, et leur rang')
console.log('='.repeat(114))
const cmpMoteur = REGLES['physique (filtres ①③ puis global)']
for (const cc of courses) {
  const t = jouer(cc, cmpMoteur)
  const manques = cc.arrivee.filter((n) => !t.includes(n))
  if (!manques.length) { console.log(`\n  ${cc.d}  5/5  \u2713`); continue }
  console.log(`\n  ${cc.d}  ${cc.arrivee.filter((n) => t.includes(n)).length}/5`)
  for (const n of manques) {
    const g = cc.blocs.find((b) => b.cases.some((c) => c.num === n))
    const sc = cc.sc[n]
    const rangs = {}
    for (const [nom, cmp] of Object.entries(REGLES)) {
      if (nom.startsWith('—')) continue
      rangs[nom.split(' ')[0]] = classerBloc(g, cmp, cc.sc)[n]
    }
    console.log(`    n°${String(n).padStart(2)}  ${g.id} (quota ${g.quota}, case ${g.cases.findIndex((c) => c.num === n) + 1}/${g.cases.length})`
      + `  globale ${sc?.global}  forme ${sc?.forme}  ${nbOk(sc)}/3 filtres`
      + `  | rangs: ` + Object.entries(rangs).map(([k, v]) => k + '=' + v).join(' '))
  }
}
console.log()