/* ---------------------------------------------------------------
 * tools\sondage-archive.mjs  —  QU'Y A-T-IL DANS LE NOUVEL ARCHIVE ?
 *
 *   node tools\sondage-archive.mjs [dossier]
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Lecture seule.
 *
 * Le dossier contient N fichiers race_R{n}_C{i}_{date}.json.
 * On veut savoir, course par course :
 *
 *   ① est-ce une Quinté Global PMU ?   (types_pari / QUINTE_PLUS)
 *   ② est-ce qu'on a l'ARRIVÉE ?        (course.arrivee)
 *   ③ est-ce qu'on a les COTES ?        (participants[].cote_pmu)
 *   ④ est-ce qu'on a la PRESSE ?        ← LE POINT CRITIQUE
 *
 * ④ est-ce qui manque pour rejouer la GRILLE (P1..P20).
 * S'il manque, les nouveaux fichiers ne sont pas utilisables tels quels.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'

const DOS = process.argv[2] || 'C:/Users/sam/Desktop/archive'
const RE = /^race_R(\d+)_C(\d+)_(\d{4}-\d{2}-\d{2})\.json$/

const fichiers = fs.readdirSync(DOS).filter((f) => RE.test(f))
const brute = []
for (const f of fichiers) {
  const m = f.match(RE)
  brute.push({ f, r: +m[1], c: +m[2], date: m[3], path: path.join(DOS, f) })
}
brute.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.r - b.r))

const st = { total: brute.length, vide: 0, illisible: 0, quinte: 0, avecArrivee: 0, avecCotes: 0, avecPresse: 0, avecClasse: 0, avecPartants: 0, avecDiscipline: 0 }
const mois = {}
const bonnes = []
const sansPresse = []

for (const b of brute) {
  const s = fs.readFileSync(b.path, 'utf8')
  if (!s.trim()) { st.vide++; continue }
  let j
  try { j = JSON.parse(s) } catch { st.illisible++; continue }
  const co = j.course || {}
  const ps = j.participants || []
  const tp = JSON.stringify(co.types_pari || [])
  const estQuinte = /QUINTE_PLUS|quinte/i.test(tp)
  if (estQuinte) st.quinte++
  if (Array.isArray(co.arrivee) && co.arrivee.length >= 5) st.avecArrivee++
  if (ps.some((p) => p.cote_pmu > 0)) st.avecCotes++
  if (co.presse || co.classement || co.synthese) st.avecPresse++
  if (co.classe) st.avecClasse++
  if (ps.length) st.avecPartants++
  if (co.discipline) st.avecDiscipline++
  const m = b.date.slice(0, 7)
  mois[m] = (mois[m] || 0) + 1
  if (estQuinte && Array.isArray(co.arrivee) && co.arrivee.length >= 5 && ps.some((p) => p.cote_pmu > 0)) bonnes.push({ ...b, co, ps, estQuinte })
  else sansPresse.push({ ...b, estQuinte })
}

console.log('')
console.log('  📦 SONDAGE DE L\'ARCHIVE — ' + DOS)
console.log('  ' + '-'.repeat(72))
console.log('  fichiers race_*.json          : ' + st.total)
console.log('  vides (0 octet)               : ' + st.vide)
console.log('  illisibles                    : ' + st.illisible)
console.log('')
console.log('  Quinté Global PMU             : ' + st.quinte)
console.log('  avec arrivée (≥5)             : ' + st.avecArrivee)
console.log('  avec cotes (cote_pmu)         : ' + st.avecCotes)
console.log('  avec les partants             : ' + st.avecPartants)
console.log('  avec discipline               : ' + st.avecDiscipline)
console.log('  avec classe                   : ' + st.avecClasse)
console.log('')
console.log('  ⭐ avec PRESSE (P1..P20)       : ' + st.avecPresse + '   ← SANS ÇA, PAS DE GRILLE')
console.log('')
console.log('  période : ' + (brute[0] ? brute[0].date : '—') + ' → ' + (brute[brute.length - 1] ? brute[brute.length - 1].date : '—'))
console.log('  par mois :')
for (const [m, v] of Object.entries(mois)) console.log('     ' + m + '  ' + String(v).padStart(3) + '  ' + '█'.repeat(Math.ceil(v / 2)))
console.log('')
console.log('  courses UTILISABLES (quinte + arrivée + cotes) : ' + bonnes.length)
console.log('')

if (bonnes.length) {
  const e = bonnes[0]
  console.log('  exemple : ' + e.f)
  console.log('     arrivee   : ' + JSON.stringify(e.co.arrivee))
  console.log('     classe    : ' + JSON.stringify(e.co.classe).slice(0, 200))
  console.log('     discipline: ' + e.co.discipline + '   distance ' + e.co.distance)
  console.log('     partants  : ' + e.ps.length)
  console.log('     cotes     : ' + e.ps.slice(0, 6).map((p) => p.num + '=' + p.cote_pmu).join(' '))
  console.log('')
  console.log('  les 3 premières dates : ' + bonnes.slice(0, 3).map((b) => b.date).join(' · '))
}
console.log('')

if (!st.avecPresse) {
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('  ║  ⚠ AUCUNE PRESSE DANS CES FICHIERS.')
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('  Ces fichiers donnent : arrivée + cotes + partants (musique, valeur, âge).')
  console.log('  Il manque le CLASSEMENT DE LA PRESSE (Synthèse P1..P20).')
  console.log('')
  console.log('  Sans presse on ne peut PAS construire la grille des blocs.')
  console.log('  Il faudrait la récupérer ailleurs (pronostics-turf.info n a pas')
  console.log('  d archive, et le site ne montre que la course du jour).')
  console.log('')
  console.log('  → ALTERNATIVE : rejouer le corpus SANS la presse, avec un autre')
  console.log('    ordre de référence. Voir tools\mesure-sans-presse.mjs.')
  console.log('')
}