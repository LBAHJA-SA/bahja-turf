/**
 * AUTOPSIE G1 — pourquoi le 1er et le 2e de G1 sont-ils les plus forts ?
 *
 * Le bloc G1 (cases P1→P4) fournit à lui seul la moitié du Top5.
 * Question : qu'est-ce qui distingue, À L'INTÉRIEUR de G1, les chevaux qui
 * arrivent de ceux qui restent dehors ? On classe G1 par score physique et on
 regarde ce que donne ce classement face à l'arrivée.
 *
 *   node tools\g1.mjs
 */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const c = (v, n) => String(v ?? '—').padStart(n)

const courses = []
for (const d of Object.keys(db).sort()) {
  const r = db[d]
  if (!r.arrivee?.length) continue
  const g = buildGrid(r.synthese, r.runners)
  const sc = Object.fromEntries((r.scores || []).map((x) => [x.num, x]))
  const g1 = g.groupes.find((x) => x.id === 'G1')
  // G1 trié par score physique décroissant
  const parScore = g1.cases.map((x) => ({
    ...x, ...(sc[x.num] || {}),
    place: r.arrivee.indexOf(x.num) >= 0 ? r.arrivee.indexOf(x.num) + 1 : null,
  })).sort((a, b) => (b.global ?? -1) - (a.global ?? -1))
  courses.push({ d, r, g1, parScore, sc })
}

/* ═══════════ 1. G1 de chaque course, classé par score ═══════════ */
console.log('\n' + '='.repeat(108))
console.log('  G1 CLASSÉ PAR SCORE PHYSIQUE — rang dans G1 (R) vs place réelle')
console.log('='.repeat(108))
for (const cc of courses) {
  console.log(`\n  ${cc.d}  ${(cc.r.hippodrome || '').toUpperCase()} ${cc.r.discipline || ''} ${cc.r.distance || '?'}m`)
  console.log(`  arrivée : ${cc.r.arrivee.slice(0, 5).join(' - ')}`)
  console.log('  R  n°  case  presse | global forme  dist  piste niv terr cor | F1 F2 F3 | arrivée')
  console.log('  ' + '-'.repeat(104))
  cc.parScore.forEach((x, i) => {
    const f = x.filtres || []
    console.log(
      `  ${i + 1}  ${c(x.num, 3)}  P${c(x.slot, 2)}    P${c(x.place, 2)}   | ${c(x.global, 5)} ${c(x.forme, 5)} ${c(x.dist, 5)} ${c(x.piste, 5)} ${c(x.niveau, 3)} ${c(x.terrain, 3)} ${c(x.corde, 3)}`
      + ` | ${f.map((z) => (z === undefined ? '·' : z ? 'ok' : 'KO')).join(' ')} |`
      + (x.place ? `  ${x.place}e  ✔` : '  —   ✘'))
  })
}

/* ═══════════ 2. le classement par score tient-il dans G1 ? ═══════════ */
console.log('\n' + '='.repeat(108))
console.log('  LE CLASSEMENT PAR SCOPE, VÉRIFIÉ COURSE PAR COURSE')
console.log('='.repeat(108))
const tous = courses.flatMap((cc) => cc.parScore.map((x, i) => ({ d: cc.d, R: i + 1, ...x })))
const parR = [1, 2, 3, 4].map((R) => {
  const z = tous.filter((x) => x.R === R)
  return { R, n: z.length, hits: z.filter((x) => x.place).length, podium: z.filter((x) => x.place && x.place <= 3).length }
})
console.log('  rang dans G1   présents   arrivés   dont podium')
for (const x of parR) {
  console.log(`     R${x.R}            ${x.n}         ${x.hits}/${x.n}      ${x.podium}`)
}
console.log('\n  → le top-2 de G1 par score arrive : '
  + parR.slice(0, 2).reduce((s, x) => s + x.hits, 0) + '/'
  + parR.slice(0, 2).reduce((s, x) => s + x.n, 0))
console.log('  → le top-3 de G1 par score arrive : '
  + parR.slice(0, 3).reduce((s, x) => s + x.hits, 0) + '/'
  + parR.slice(0, 3).reduce((s, x) => s + x.n, 0))

/* ═══════════ 3. le « case » gagne-t-il plus que le score ? ═══════════ */
console.log('\n' + '='.repeat(108))
console.log('  CASE vs SCORE — lequel des deux classe mieux les arrivants de G1 ?')
console.log('='.repeat(108))
const parCase = [1, 2, 3, 4].map((S) => {
  const z = tous.filter((x) => x.slot === S)
  return { S, n: z.length, hits: z.filter((x) => x.place).length }
})
console.log('  case        présents   arrivés')
for (const x of parCase) {
  const bar = '█'.repeat(x.hits) + '░'.repeat(x.n - x.hits)
  console.log(`  P${x.S}          ${x.n}          ${x.hits}/${x.n}  ${bar}`)
}

/* ═══════════ 4. quel critère fait le tri, à l'intérieur de G1 ? ═══════════ */
console.log('\n' + '='.repeat(108))
console.log('  À L\'INTÉRIEUR DE G1, QUEL CRITÈRE SÉPARE LES ARRIVANTS ?')
console.log('  (moyenne des arrivants / moyenne des non-arrivants, G1 uniquement)')
console.log('='.repeat(108))
const hit = tous.filter((x) => x.place)
const miss = tous.filter((x) => !x.place)
const moy = (arr, k) => (arr.length ? (arr.reduce((s, x) => s + (x[k] ?? 0), 0) / arr.length).toFixed(2) : '—')
console.log('  critère   arrivés(8)  non-arrivés(8)   écart')
for (const k of ['global', 'forme', 'dist', 'piste', 'niveau', 'terrain', 'corde']) {
  const a = moy(hit, k), b = moy(miss, k)
  const ec = +(a - b).toFixed(2)
  console.log(`  ${k.padEnd(9)}  ${a.padStart(7)}      ${b.padStart(7)}      ${(ec > 0 ? '+' : '') + ec}`)
}
const rr = (arr, i) => (arr.length ? Math.round(arr.filter((x) => x.filtres?.[i]).length / arr.length * 100) + '%' : '—')
console.log('\n  filtre      arrivés    non-arrivés')
for (let i = 0; i < 3; i++) {
  console.log(`  ${['① distance', '② forme  ', '③ niveau '][i]}  ${rr(hit, i).padStart(6)}      ${rr(miss, i).padStart(6)}`)
}
// combos
const combo = (arr) => {
  const z = arr.filter((x) => x.filtres?.[0] && x.filtres?.[1] && x.filtres?.[2]).length
  return z + '/' + arr.length + ' (' + Math.round(z / arr.length * 100) + '%)'
}
console.log('\n  3/3 filtres : arrivés ' + combo(hit) + '   non-arrivés ' + combo(miss))
console.log()