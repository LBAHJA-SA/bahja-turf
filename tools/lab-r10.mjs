/* =============================================================================
 * tools/lab-r10.mjs — LABO UNIQUEMENT (15/10, spec utilisateur) : 90% FORCE(P)
 * + 10% PHYSIQUE. Jamais appliqué (consigne : expériences seulement).
 *
 * Physique = scorePhysique complet (6 critères : forme utile ±400m 22%,
 * distance 22%, piste 18%, niveau VH 13%, terrain 13%, corde 12%) via
 * autoCarriere (forms casacourses, mêmes données que le moteur du matin).
 * Normalisé 0-1 par bloc (1 = meilleur), 0.5 si absent. Tie → carnet.
 * Cache brut : $TEMP/carriere-<date>.txt (évite de re-tirer 60 pages).
 * Stats LOO, 14 fermées, référence GELÉ. LENT (~3 min/course) : fond d'écran.
 * Usage : node tools/lab-r10.mjs
 * ============================================================================= */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGrid, computeStats, autoCarriere, parseCarriere, scorePhysique } from '../src/lib/quinte.js'
import { trouverCourse } from './daily.mjs'

const TMP = process.env.TEMP || process.env.TMP || '/tmp'
const QUOTAS = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const GROUPES = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 }, { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 }, { id: 'G5', min: 13, max: 20 },
]
const coteDe = (cotes, num) => {
  const v = cotes?.[num]
  const x = Number(typeof v === 'object' ? (v?.cote ?? null) : v)
  return Number.isFinite(x) && x > 0 ? x : null
}
const FDB = JSON.parse(fs.readFileSync(new URL('../data/synthese.json', import.meta.url), 'utf8'))
const FCOT = JSON.parse(fs.readFileSync(new URL('../data/cotes.json', import.meta.url), 'utf8'))
const closed = Object.values(FDB).filter((r) => r && (r.arrivee || []).length)

async function carsDe(rec, courseId) {
  const f = path.join(TMP, `carriere-${rec.date}.txt`)
  try {
    const t = fs.readFileSync(f, 'utf8')
    if (t.length > 100) return parseCarriere(t)
  } catch { /* on tire */ }
  const a = await autoCarriere(courseId, () => {})
  try { fs.writeFileSync(f, a.texte) } catch { /* tant pis */ }
  return parseCarriere(a.texte)
}

let t10 = 0, w10 = 0, tF = 0, wF = 0, nR = 0, nPhys = 0
for (const rec of closed) {
  const syn = rec.synthese.filter(Number.isFinite)
  const stats = computeStats(closed.filter((r) => r.date !== rec.date))
  const parPlace = stats.parPlace || []
  const grille = buildGrid(syn, rec.runners || [])
  const ps = grille.slotParNum || {}
  const forceDe = (num) => {
    const st = parPlace[(ps[num] ?? 0) - 1]
    if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return 0
    let best = 0
    for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[best] ?? 0)) best = k
    return (st.p[best] ?? 0) > 0 ? st.p[best] / 100 : 0
  }
  let course = null
  try { course = await trouverCourse(rec.date, syn, rec.courseId) } catch (e) { console.log(rec.date, 'course KO :', e.message) }
  if (!course) continue
  const courseJour = {
    dist: course.distance || 2500,
    surf: /ATTELE|TROT/i.test(course.discipline || '') ? 'PSF' : 'Gazon',
    sens: 'D', discipline: course.discipline || 'PLAT', hippo: course.hippodrome || '',
  }
  let cars = {}
  try { cars = await carsDe(rec, rec.courseId || course.courseId) } catch (e) { console.log(rec.date, 'carrière KO :', e.message); continue }
  const scOf = {}
  for (const p of course.participants) {
    const runs = cars[p.num]
    if (!runs || !runs.length) continue
    try { scOf[p.num] = scorePhysique(p, runs, courseJour) } catch { /* rien */ }
  }
  if (!Object.keys(scOf).length) { console.log(rec.date, 'aucun score physique — sautée'); continue }
  nPhys++
  const sel = []
  for (const g of GROUPES) {
    const cases = grille.groupes.flatMap((x) => x.cases).filter((c) => c.slot >= g.min && c.slot <= g.max)
    if (!cases.length) continue
    const q = Math.min(QUOTAS[g.id], cases.length)
    const gs = cases.map((c) => scOf[c.num]?.global).filter((v) => Number.isFinite(v))
    const gMin = Math.min(...gs), gMax = Math.max(...gs)
    const phys = (c) => {
      const v = scOf[c.num]?.global
      if (!Number.isFinite(v) || !(gMax > gMin)) return 0.5
      return (v - gMin) / (gMax - gMin)
    }
    cases.slice()
      .sort((a, b) => ((0.9 * forceDe(b.num) + 0.1 * phys(b)) - (0.9 * forceDe(a.num) + 0.1 * phys(a))) || (a.slot - b.slot))
      .slice(0, q).forEach((c) => sel.push(c.num))
  }
  const arr = rec.arrivee.slice(0, 5)
  const froz = rec.ticket || []
  const h10 = arr.filter((x) => sel.includes(x)).length
  const hF = arr.filter((x) => froz.includes(x)).length
  t10 += h10; tF += hF; nR++
  if (sel.includes(arr[0])) w10++
  if (froz.includes(arr[0])) wF++
  console.log(`${rec.date}  R10 ${h10}/5${sel.includes(arr[0]) ? ' ★1er' : ''} [${sel.join(' ')}]  |  GELÉ ${hF}/5${froz.includes(arr[0]) ? ' ★1er' : ''}  |  arr ${arr.join('-')}`)
}
console.log(`\nTOTAL ${nR} (physique OK) : R10 = ${t10}/${nR * 5} · 1er ${w10}/${nR}   |   GELÉ = ${tF}/${nR * 5} · 1er ${wF}/${nR}`)
