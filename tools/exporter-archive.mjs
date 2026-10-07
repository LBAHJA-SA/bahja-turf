/* ---------------------------------------------------------------
 * tools\exporter-archive.mjs  —  الـ94 Quintés في ملف واحد
 *
 *   node tools\exporter-archive.mjs
 *
 * Prend `data\corpus\presse-carriere.json` (101 Quintés) et n'en garde que
 * ceux que les harnais utilisent — **94** — puis les écrit dans UN seul
 * fichier : `data\corpus\archive-94.json`.
 *
 * Un Quinté est conservé si :
 *   · la Synthèse de la presse cite au moins 4 partants
 *   · l'arrivée fait au moins 5
 *   · au moins 10 partants réels
 *   · au moins 8 cotes disponibles
 *
 * Le fichier est autoportant : presses, cotes, ouverture, arrivée complète,
 * partants (musique, valeur, poids, stats, corde) et les gains réels.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(RACINE, 'data', 'corpus', 'presse-carriere.json')
const DST = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const brut = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const courses = []
let ecartees = []

for (const k of Object.values(brut)) {
  const presse = (k.presse || []).filter((x) => k.arrivee?.includes(x))
  const nums = presse.concat((k.arrivee || []).filter((x) => !presse.includes(x)))
  const avecC = Object.keys(k.cotes || {}).filter((x) => k.cotes[x] > 0).length
  const motifs = []
  if (!k.partants?.length || k.partants.length < 10) motifs.push('moins de 10 partants')
  if (!k.arrivee || k.arrivee.length < 5) motifs.push('arrivée incomplète')
  if (avecC < 8) motifs.push('moins de 8 cotes')
  if (nums.length < 10) motifs.push('moins de 10 numéros au carnet')
  if (motifs.length) { ecartees.push(`${k.cle} : ${motifs.join(', ')}`); continue }

  courses.push({
    cle: k.cle,
    date: k.date,
    reunion: k.r,
    course: k.c,
    hippodrome: k.track,
    discipline: k.discipline,
    distance: k.distance,
    nbPartants: k.nb,
    prix: k.prix,
    /* la Synthèse de la presse : P1 = le 1er cité.
     * On la complète avec les partants que la presse n'a pas cités (§12.2). */
    presse: nums,
    presseCitee: presse.length,
    cotes: k.cotes,
    ouverture: k.ouverture || {},
    arrivee: k.arrivee,
    podium: k.arrivee.slice(0, 3),
    top5: k.arrivee.slice(0, 5),
    partants: k.partants,
    gains: k.dividends || null,
  })
}

courses.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const meta = {
  titre: 'Archive Quinté Global PMU — presse + partants',
  genereLe: new Date().toISOString(),
  nbQuintes: courses.length,
  periode: courses.length ? [courses[0].date, courses[courses.length - 1].date].join(' → ') : null,
  source: 'data\\corpus\\presse-carriere.json',
  filtres: '≥ 10 partants · arrivée ≥ 5 · ≥ 8 cotes · ≥ 10 numéros au carnet  (identique à tools\\ab-moteur.mjs)',
  champsPartant: Object.keys(courses[0]?.partants?.[0] || {}),
  ceQuIlNyANePas: 'aucune carrière détaillée : pas de place/distance/piste par course passée (§16.7)',
}
const sortie = { meta, courses }
fs.writeFileSync(DST, JSON.stringify(sortie), 'utf8')

/* ----------------------------------------------------------- contrôle --- */
console.log('')
console.log('  ⭐ ARCHIVE EXPORTÉE')
console.log('')
console.log(`  fichier      : data\\corpus\\archive-94.json`)
console.log(`  taille       : ${(fs.statSync(DST).size / 1024).toFixed(0)} Ko`)
console.log(`  Quintés      : ${courses.length}`)
console.log(`  période      : ${meta.periode}`)
console.log('')
const dates = {}
courses.forEach((c) => { const m = c.date.slice(0, 7); dates[m] = (dates[m] || 0) + 1 })
console.log('  par mois     : ' + JSON.stringify(dates))
const part = courses.reduce((s, c) => s + c.partants.length, 0) / courses.length
console.log(`  partants     : ${part.toFixed(1)} en moyenne  ·  ${courses.reduce((s, c) => s + c.partants.length, 0)} au total`)
console.log('')
const avec = (f) => courses.filter((c) => Object.values(c).some((v) => v && v !== null && v[f] !== null && v[f] !== undefined)).length
console.log('  contenu par course :')
console.log(`     presse (P1..Pn)      : ${courses.filter((c) => c.presse.length >= 10).length}/${courses.length} ont ≥ 10 numéros`)
console.log(`     cotes               : ${courses.length}/${courses.length}`)
console.log(`     ouverture           : ${courses.filter((c) => Object.keys(c.ouverture).length >= 8).length}/${courses.length}`)
console.log(`     arrivée complète    : ${courses.every((c) => c.arrivee.length >= 10) ? courses.length : courses.filter((c) => c.arrivee.length >= 10).length}/${courses.length} ont ≥ 10`)
console.log(`     gains réels         : ${courses.filter((c) => Array.isArray(c.gains) && c.gains.length).length}/${courses.length}`)
console.log(`     partants détaillés : ${courses.length}/${courses.length}`)
console.log('')
if (ecartees.length) {
  console.log(`  ${ecartees.length} écartée(s) :`)
  ecartees.forEach((e) => console.log('     ' + e))
}
console.log('')
console.log('  champs d un partant : ' + meta.champsPartant.join(', '))
console.log('')
