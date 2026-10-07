/**
 * L'arrivée RÉELLE d'une course, lue sur casacourses, et le x/5 de chaque
 * ticket contre elle. Sert à trancher « quel ticket on archive ».
 *
 *   node tools\arrivee-cc.mjs 2026-10-05_R1_C1 2026-10-05
 *   node tools\arrivee-cc.mjs 2026-10-05          ← la 1re course FR du jour
 */
import fs from 'node:fs'
import { buildGrid, remplirGrille, classerPhysique, computeStats } from '../src/lib/quinte.js'

const CC = 'https://pro.casacourses.com/api'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const get = async (u) => {
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  return r.json()
}

let date = process.argv[2]
let courseId = process.argv[3]

if (!courseId) {
  const prog = await get(`${CC}/programme?date=${date}`)
  const fr = prog.meetings.filter((m) => (m.country || '').toUpperCase() === 'FR')
  const course = fr.flatMap((m) => m.races).find((c) => (c.bet_types || []).includes('sorec_quinte'))
    || fr.flatMap((m) => m.races)[0]
  courseId = course.id
  date = course.date || date
  console.log(`  course du jour : ${courseId}  (${course.track || ''})`)
}

const det = await get(`${CC}/race/${courseId}?date=${date}`)
const arrivee = (det.results || []).slice(0, 5).map((x) => Number(x.number)).filter(Boolean)
console.log(`  ARRIVÉE  ${arrivee.join(' · ')}\n`)

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const eq = fs.existsSync('data/cotes.json') ? JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) : {}
const r = db[date]
if (!r) { console.log(`  pas d'archive pour ${date} — on s'arrête là`); process.exit(0) }

const bilan = (t) => {
  const s = new Set(t)
  const pris = arrivee.filter((n) => s.has(n))
  return `${pris.length}/5  manquants : ${arrivee.filter((n) => !s.has(n)).join(' ') || '—'}`
}

const cotes = Object.fromEntries((eq[r.courseId]?.cotes || []).map((x) => [x.num, x]))
const stats = computeStats(Object.values(db).filter((x) => x.arrivee?.length))
const grille = buildGrid(r.synthese, r.runners)
const brut = (r.scores || []).map((s) => ({ p: { num: s.num }, s, ok: (s.filtres || []).every((x) => x) }))
const classement = classerPhysique(brut)
const sans = remplirGrille(grille, classement, r.discipline, null, stats).ticket
const avec = remplirGrille(grille, classement, r.discipline, cotes, stats).ticket

console.log('  TICKET          contre l\'arrivée réelle')
console.log(`    archive        ${(r.ticket || []).join(' · ').padEnd(30)} ${bilan(r.ticket || [])}`)
console.log(`    sans marché    ${sans.join(' · ').padEnd(30)} ${bilan(sans)}`)
console.log(`    avec marché    ${avec.join(' · ').padEnd(30)} ${bilan(avec)}`)
console.log()