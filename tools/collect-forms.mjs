/* =============================================================================
 * tools/collect-forms.mjs — LA CARRIÈRE DES 96 QUINTÉS ARCHIVÉS (16/10/2026)
 *
 * Les 96 Quintés à presse réelle de `data/quintes.json` ont leur `id`
 * casacourses. `pro.casacourses.com/api/race/{id}?date={date}` rend, pour
 * CHAQUE partant, ses 5 dernières courses : `{date, track, distance, place,
 * racetype, weight}`. C'est exactement la matière des filtres §5 (distance)
 * et du critère PISTE (§4) — la donnée qui manquait pour choisir dans G1/G2.
 *
 * ⚠ ANTI-FUITE : on ne garde que les courses STRICTEMENT antérieures à la
 *   course du jour, avec une place connue. Le `forms[0]` de certaines courses
 *   EST la course elle-même (place nul) — elle est écartée.
 *
 *   data/forms.json           (cache : on ne refait pas 96 appels deux fois)
 *   node tools\collect-forms.mjs            ne refait que ce qui manque
 *   node tools\collect-forms.mjs --force    refait tout
 * ============================================================================= */
import fs from 'node:fs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const FORCE = process.argv.includes('--force')
const FICHIER = 'data/forms.json'

const quintes = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CIBLES = quintes
  .filter((q) => q.presse?.length >= 10 && (q.arrivee || []).length)
  .map((q) => ({ id: q.id, date: q.date, track: q.track || null }))

let cache = {}
if (!FORCE && fs.existsSync(FICHIER)) cache = JSON.parse(fs.readFileSync(FICHIER, 'utf8'))

const aFaire = CIBLES.filter((c) => !cache[`${c.date}_${c.id}`])
console.log(`\n  ${CIBLES.length} courses · ${aFaire.length} à collecter (${CIBLES.length - aFaire.length} en cache)\n`)

async function detail(id, date) {
  const r = await fetch(`https://pro.casacourses.com/api/race/${id}?date=${date}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

let fait = 0
const PARALLELE = 4
for (let i = 0; i < aFaire.length; i += PARALLELE) {
  await Promise.all(aFaire.slice(i, i + PARALLELE).map(async (c) => {
    try {
      const j = await detail(c.id, c.date)
      const chevaux = {}
      const infos = {}
      for (const r of j.runners || []) {
        const n = parseInt(r.number, 10)
        if (!Number.isFinite(n)) continue
        infos[n] = {
          age: r.horse_age ?? null,
          poids: r.weight ?? null,
          musique: r.performance || null,
          sexe: r.horse_gender || null,
          jockey: r.jockey_name || null,
          entraineur: r.horse_trainer || null,
        }
        chevaux[n] = (r.forms || [])
          .filter((f) => f.date && f.date < c.date && f.place != null && String(f.place).trim() !== '')
          .slice(0, 6)
          .map((f) => ({
            date: f.date,
            track: f.track || null,
            dist: f.distance == null ? null : Number(f.distance),
            place: parseInt(f.place, 10) || 0,
            type: f.racetype || null,
            poids: f.weight || null,
          }))
      }
      cache[`${c.date}_${c.id}`] = {
        date: c.date, id: c.id, track: j.track_name || c.track || null,
        distance: j.distance || null, type: j.type || null,
        terrain: j.track_condition || null, piste: j.track_type || null,
        chevaux,
        infos,
      }
    } catch (e) {
      console.log('  ✗ ' + c.date + ' #' + c.id + ' — ' + String(e).slice(0, 90))
      cache[`${c.date}_${c.id}`] = { date: c.date, id: c.id, erreur: String(e).slice(0, 120), chevaux: {} }
    }
  }))
  fait = Math.min(aFaire.length, i + PARALLELE)
  process.stdout.write(`\r  collectés ${fait}/${aFaire.length}…`)
  fs.writeFileSync(FICHIER, JSON.stringify(cache, null, 1))
}
console.log('\n')

const cles = Object.keys(cache)
let ok = 0, chevaux = 0, avecForms = 0
for (const k of cles) {
  const c = cache[k]
  if (c.erreur) continue
  ok++
  const nums = Object.keys(c.chevaux)
  chevaux += nums.length
  avecForms += nums.filter((n) => c.chevaux[n].length).length
}
console.log(`  data/forms.json — ${cles.length} entrées · ${ok} courses OK · ${chevaux} chevaux · ${avecForms} avec au moins 1 course passée (${((100 * avecForms) / chevaux).toFixed(0)} %)`)
const ex = cles.find((k) => !cache[k].erreur && Object.keys(cache[k].chevaux).length)
if (ex) {
  const c = cache[ex]
  console.log(`\n  exemple — ${c.date} · ${c.track} · ${c.distance} m · ${c.type}`)
  for (const n of Object.keys(c.chevaux).slice(0, 3)) {
    console.log(`   ${n} : ` + c.chevaux[n].map((f) => `${f.date} ${f.track} ${f.dist}m ${f.place}e`).join(' | '))
  }
}
console.log('')
