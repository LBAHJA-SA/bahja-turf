/* =============================================================================
 * tools/carriere-v2.mjs — LA CARRIÈRE COMPLÈTE (28/10/2026)
 *
 * Pourquoi ce fichier existe : `tools/carriere-archive.mjs` ne gardait que
 * `date · track · dist · place · type` des 5 dernières courses. Le score
 * physique ne pouvait donc pas être calculé — §11.24 avait conclu « la carrière
 * ne choisit pas mieux que le carnet », mais on lui avait coupé 3 critères sur 6.
 *
 * L'API casacourses donne BEAUCOUP plus, dans le MÊME appel :
 *
 *   course   : track_condition (TERRAIN du jour) · class (NIVEAU du jour)
 *              · prize · distance · type · track_name
 *   partant  : number · weight (poids porté) · horse_age · odd · forms[]
 *   forme    : date · track · distance · place · racetype
 *              · weight (poids porté ce jour-là)
 *              · raceprizemoney (ALLOCATION = le niveau de la course courue)
 *              · winners (qui l'a battu) · race · time
 *
 * Ce qu'on peut donc calculer pour de vrai (§4) :
 *   FORME UTILE 22 %   ±400 m + points de place pondérés      ✅
 *   DISTANCE    22 %   distance pratiquée                     ✅
 *   PISTE       18 %   hippodrome déjà couru + résultat       ✅
 *   NIVEAU      13 %   allocation du jour vs ses 2 dernières  ✅  ← nouveau
 *   TERRAIN     13 %   ❌ le terrain des courses passées n'est pas dans l'API
 *   CORDE       12 %   ❌ `number` = numéro de selle, pas la corde de départ
 *
 *   node tools\carriere-v2.mjs            (ne refait pas ce qui est fait)
 *   node tools\carriere-v2.mjs --force
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'

const FORCE = process.argv.includes('--force')
const SORTIE = 'data/corpus/carriere-v2.json'
const CC = 'https://pro.casacourses.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const cibles = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const presse = (q.presse?.length >= 10 ? q.presse : []).filter((n) => cotes[n] > 1)
  if (presse.length < 10) continue
  cibles.push(q)
}
console.log('courses exploitables : ' + cibles.length)

let cache = {}
if (!FORCE && fs.existsSync(SORTIE)) {
  try { cache = JSON.parse(fs.readFileSync(SORTIE, 'utf8')) } catch { cache = {} }
}

const get = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}
const nb = (x) => {
  if (x == null) return null
  const v = Number(String(x).replace(',', '.').replace(/[^\d.\-]/g, ''))
  return Number.isFinite(v) ? v : null
}

const forme = (f) => ({
  date: f.date || null,
  track: f.track || null,
  dist: nb(f.distance),
  place: /^\d+$/.test(String(f.place || '')) ? Number(f.place) : null,
  type: f.racetype || null,
  poids: nb(f.weight),
  alloc: nb(f.raceprizemoney),
  cote: nb(f.odd),
  bat: null,
})

let faits = 0, erreurs = 0
const liste = cibles.filter((q) => FORCE || !cache[q.date + '|' + q.id])

for (let i = 0; i < liste.length; i += 6) {
  await Promise.all(liste.slice(i, i + 6).map(async (q) => {
    try {
      const j = await get(`${CC}/api/race/${q.id}?date=${q.date}`)
      const chevaux = {}
      for (const r of j.runners || []) {
        const n = parseInt(r.number, 10)
        if (!Number.isFinite(n)) continue
        chevaux[n] = {
          nom: r.horse_name || null,
          age: nb(r.horse_age),
          poids: nb(r.weight),
          runs: (r.forms || []).slice(0, 5).map(forme),
        }
      }
      cache[q.date + '|' + q.id] = {
        date: q.date, id: q.id,
        track: j.track_name || q.track || null,
        terrain: j.track_condition || null,
        classe: j.class || null,
        prix: nb(j.prize) ?? nb(q.prix),
        distance: nb(j.distance) ?? nb(q.distance),
        type: j.type || null,
        chevaux,
      }
      faits++
    } catch (e) {
      cache[q.date + '|' + q.id] = { date: q.date, id: q.id, erreur: String(e.message || e) }
      erreurs++
    }
  }))
  if ((i / 6) % 4 === 0) console.log('  … ' + Math.min(i + 6, liste.length) + '/' + liste.length)
}

fs.mkdirSync(path.dirname(SORTIE), { recursive: true })
fs.writeFileSync(SORTIE, JSON.stringify(cache, null, 0))
const ok = Object.values(cache).filter((x) => !x.erreur).length
const avecAlloc = Object.values(cache).filter((x) => !x.erreur
  && Object.values(x.chevaux).some((c) => c.runs.some((r) => r.alloc))).length
const avecTerrain = Object.values(cache).filter((x) => !x.erreur && x.terrain).length
const avecPoids = Object.values(cache).filter((x) => !x.erreur
  && Object.values(x.chevaux).some((c) => c.poids)).length
console.log('\n  collectées : ' + ok + ' / ' + Object.keys(cache).length)
console.log('  avec allocation (niveau) : ' + avecAlloc + ' · avec terrain du jour : ' + avecTerrain + ' · avec poids : ' + avecPoids)
console.log('  erreurs : ' + erreurs + '   → ' + SORTIE)
