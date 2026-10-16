/* =============================================================================
 * tools/backfill-cotes.mjs — RÉPARATION DU MARCHÉ MANQUANT (16/10/2026).
 *
 * Constat de l'audit : data/cotes.json ne couvrait que 7 dates sur 14. Causes :
 *   ① la clé `{date}_R{n}_C{m}` n'a pas pu être dérivée (courseId numérique,
 *      ex. 145899 pour le 08/10) → aucun appel Equidia n'a jamais été fait ;
 *   ② la clé dérivée pointe parfois la mauvaise course (10/10 : la dérivation
 *      donnait R1_C4 = 18 partants, alors que la course Quinté est R1_C3 = 14,
 *      comme la stockait l'archive).
 *
 * Méthode : on teste des CANDIDATS de clé (la clé stockée d'abord, puis la clé
 * re-dérivée par le chemin de la page `cleEquidia`). Une clé n'est acceptée que
 * si le nombre de partants Equidia correspond à celui de l'archive (±2).
 * Ensuite seulement on lit le marché et on l'écrit dans data/cotes.json.
 *
 * Aucune donnée inventée : si Equidia ne répond pas, la course reste sans cote.
 *
 * Usage : node tools/backfill-cotes.mjs [--dry]
 * ============================================================================= */
import fs from 'node:fs'
import { chargerCourseCC } from '../src/lib/quinte.js'
import { chargerEquidia, lireCourse, cacheCotes } from './cotes.mjs'

const dry = process.argv.includes('--dry')
const RE = /^(\d{4}-\d{2}-\d{2})_R(\d+)_C(\d+)$/
const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const recs = Object.values(db).sort((a, b) => (a.date < b.date ? -1 : 1))
const cache = cacheCotes()
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))

/** nombre de partants vus par Equidia pour une clé (cache d'abord, réseau sinon) */
async function partantsDe(cle, date) {
  if (cache[cle]?.cotes?.length) return cache[cle].cotes.length
  const m = cle.match(RE)
  if (!m) return null
  const etat = await chargerEquidia(m[1], m[2], m[3])
  if (!etat) return null
  const course = etat[`v2/courses/${m[1]}/R${m[2]}/C${m[3]}`] || {}
  return course.nb_partants || (course.partants || []).length || lireCourse(etat, m[1], m[2], m[3]).length || null
}
async function ecrire(cle, r) {
  const m = cle.match(RE)
  const etat = await chargerEquidia(m[1], m[2], m[3])
  if (!etat) return false
  const cotes = lireCourse(etat, m[1], m[2], m[3])
  if (cotes.length <= 4) return false
  const course = etat[`v2/courses/${m[1]}/R${m[2]}/C${m[3]}`] || {}
  const prec = cache[cle] || {}
  cache[cle] = {
    ...prec,
    source: 'equidia.fr',
    hippodrome: course.reunion?.libelle || r.hippodrome || null,
    distance: course.lib_distance_course || r.distance || null,
    discipline: course.libelle_discipline || r.discipline || null,
    favori: cotes.find((x) => x.favori)?.num ?? cotes[0]?.num ?? null,
    cotes,
    backfill: '2026-10-16',
  }
  return true
}

console.log('\ndate        clé stockée              candidats testés                part.Em  part.arch  clé retenue             verdict')
console.log('-'.repeat(118))
const mapping = {}
let ajout = 0, echec = 0

for (const r of recs) {
  const stockee = String(r.courseId || '')
  const estCle = RE.test(stockee)
  const cands = []
  if (estCle) cands.push(stockee)

  let derive = null
  try {
    const det = await chargerCourseCC(r.date, r.synthese)
    derive = det?.cle || null
    await attendre(700)
  } catch { /* réseau : on fera avec la clé stockée */ }
  if (derive && !cands.includes(derive)) cands.push(derive)

  if (!cands.length) {
    console.log(r.date.padEnd(12) + (stockee || '—').padEnd(24) + '—'.padEnd(32) + '  ?       ' + String(r.nbPartants || '?').padStart(7) + '   —                       non dérivable')
    echec++; continue
  }

  let retenue = null, part = null, trace = []
  for (const c of cands) {
    let p = null
    try { p = await partantsDe(c, r.date); if (!cache[c]?.cotes?.length) await attendre(700) } catch { /* ignore */ }
    trace.push(c + '=' + (p ?? '?'))
    const colle = p != null && Math.abs(p - (r.nbPartants || p)) <= 2
    if (colle) { retenue = c; part = p; break }
    if (part == null) part = p
  }

  /* dernier recours : la clé dérivée par le chemin de la page est l'autorité.
   * On l'accepte si le garde-fou n'a pas pu conclure (marché encore partiel
   * le jour même : nb de cotes < nb de partants). On ne l'accepte JAMAIS
   * contre un candidat qui, lui, colle aux partants. */
  let confiance = false
  if (!retenue && derive && cands.includes(derive)) { retenue = derive; confiance = true }

  const verdict = retenue
    ? (confiance ? '⚠ accepté sur confiance (marché en cours)'
      : cache[retenue]?.backfill ? '✅ ajouté' : 'déjà en cache')
    : '⚠ REFUSÉ (aucun candidat ne colle)'
  console.log(r.date.padEnd(12) + (stockee || '—').padEnd(24) + trace.join(' ').padEnd(32)
    + String(part ?? '?').padStart(7) + String(r.nbPartants || '?').padStart(10) + '   '
    + (retenue || '—').padEnd(24) + verdict)

  mapping[r.date] = { cleRetenue: retenue, cleStockee: stockee, candidats: cands, partantsEquidia: part, partantsArchive: r.nbPartants || null }

  if (!retenue) { echec++; continue }
  if (cache[retenue]?.backfill || !cache[retenue]?.cotes?.length) {
    if (!dry) { try { if (await ecrire(retenue, r)) ajout++ ; await attendre(700) } catch { echec++ } }
  }
}

if (!dry) {
  fs.writeFileSync('data/cotes.json', JSON.stringify(cache, null, 1))
  fs.writeFileSync('data/cles-equidia.json', JSON.stringify(mapping, null, 1))
  try { fs.copyFileSync('data/cotes.json', 'public/data/cotes.json') } catch { /* public optionnel */ }
}
console.log('\n  marché écrit : ' + ajout + ' · clés refusées : ' + echec + ' · clés en cache : ' + Object.keys(cache).length)
console.log('  mapping → data/cles-equidia.json\n')
