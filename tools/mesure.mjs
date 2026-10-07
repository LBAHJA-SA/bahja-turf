/**
 * MESURE — récupère les variables qui NE SONT PAS dans `scores[]` pour chaque
 * Quinté archivé : les COTES du marché, l'âge, et l'arrivée officielle.
 *
 * casacourses donne `odd` (cote finale) + `odd_opening` (cote d'ouverture).
 * On n'a pas `poids` / `valeur` sur les courses closes → noted, non inventé.
 *
 *   node tools\mesure.mjs          → complète data/mesure.json
 *   node tools\mesure.mjs --maj    → refetch complet
 */
import fs from 'node:fs'

const CC = 'https://pro.casacourses.com/api/programme?date='
const RA = 'https://pro.casacourses.com/api/race/'
const F = 'data/mesure.json'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
let mesure = {}
try { mesure = JSON.parse(fs.readFileSync(F, 'utf8')) } catch { /* première fois */ }

const cibles = Object.keys(db).sort().filter((d) => db[d].arrivee?.length)
console.log('\n  MESURE — ' + cibles.length + ' Quintés clôturés\n')

for (const date of cibles) {
  const r = db[date]
  const [_, reunion, course] = r.courseId.split('_')
  if (mesure[date]?.cotes) { console.log('  ' + date + '  déjà mesuré (' + mesure[date].cotes.length + ' chevaux)'); continue }

  const prog = await (await fetch(CC + date)).json()
  const quintes = []
  for (const m of prog.meetings || []) {
    for (const rc of m.races || []) {
      if ((rc.available_bet_types || []).includes('sorec_quinte')) {
        quintes.push({ track: m.track, reunion: m.reunion_code, ...rc })
      }
    }
  }
  // celle qui correspond à notre archive : même nombre de partants
  const q = quintes.find((x) => String(x.code).replace(/\D/g, '') === course.replace(/\D/g, '')
    && x.starters === (r.runners?.length || r.nbPartants)) || quintes[0]
  if (!q) { console.log('  ' + date + '  ✗ Quinté introuvable'); continue }

  const detail = await (await fetch(RA + q.id + '?date=' + date)).json()
  const nums = new Set(r.runners || [])
  const cotes = (detail.runners || [])
    .filter((x) => nums.has(Number(x.number)))
    .map((x) => ({
      num: Number(x.number),
      nom: x.horse_name,
      cote: x.odd_numeric ?? null,
      ouverture: x.odd_opening_numeric ?? null,
      age: x.horse_age ?? null,
      place: x.finish_order ?? null,
      musique: x.performance || '',
    }))

  const officielle = (q.finish_order || []).map((x) => Number(x.number))
  mesure[date] = {
    date, hippodrome: q.track, code: q.code, discipline: q.type, distance: q.distance,
    partants: cotes.length,
    arriveeOfficielle: officielle,
    arriveeArchive: r.arrivee.slice(0, 5),
    controle: JSON.stringify(officielle.slice(0, 5)) === JSON.stringify(r.arrivee.slice(0, 5)) ? 'OK' : 'DIFF',
    cotes,
  }
  fs.writeFileSync(F, JSON.stringify(mesure, null, 1), 'utf8')
  console.log('  ' + date + '  ' + String(q.track).padEnd(15) + cotes.length + ' chevaux'
    + '   arrivée ' + officielle.slice(0, 5).join(' ') + '   contrôle: ' + mesure[date].controle)
}

/* ── ce qu'on a, ce qu'on n'a pas ───────────────────────────────────── */
console.log('\n  ' + '='.repeat(96))
console.log('  VARIABLES DISPONIBLES POUR LA MESURE (hors scores[])')
console.log('  ' + '='.repeat(96))
console.log('  cote        odd_numeric        ✅ disponible pour toutes les courses')
console.log('  ouverture   odd_opening        ✅ disponible (mouvement du marché)')
console.log('  âge         horse_age          ✅ disponible')
console.log('  poids       weight             ❌ ABSENT de casacourses')
console.log('  valeur/VH   rating             ❌ ABSENT de casacourses')
console.log('  ++ stats carrière (taux / podiums)                        ❌ ABSENT des courses closes')
console.log('')