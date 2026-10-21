/* =============================================================================
 * tools/carriere-archive.mjs — LA CARRIÈRE DES 96 QUINTÉS D'ARCHIVE (19/10/2026)
 *
 * Jusqu'ici le CHOIX dans les blocs n'avait que deux signaux mesurables
 * (carnet, marché) et un troisième indirect (stats de case). Le score
 * PHYSIQUE n'était pas testable sur l'archive : data/quintes.json ne porte
 * aucune forme.
 *
 * Or pro.casacourses.com accepte `?date=` sur une course d'archive :
 *
 *     GET /api/race/{id}?date=2026-01-01  →  runners[].forms[]
 *                                            { date, track, distance, place, racetype }
 *
 * On collecte donc les 5 dernières courses de CHAQUE partant des 96 Quintés
 * exploitables, et on les met en cache dans data/corpus/carriere96.json.
 *
 *   node tools\carriere-archive.mjs            (ne refait pas ce qui est fait)
 *   node tools\carriere-archive.mjs --force
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'

const FORCE = process.argv.includes('--force')
const SORTIE = 'data/corpus/carriere96.json'
const CC = 'https://pro.casacourses.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'

/* la même sélection que tools/choix-bloc.mjs : presse réelle + cotes complètes */
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

/* le cache */
let cache = {}
if (!FORCE && fs.existsSync(SORTIE)) {
  try { cache = JSON.parse(fs.readFileSync(SORTIE, 'utf8')) } catch { cache = {} }
}

const get = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

const normaliser = (num, runs) => (runs || []).slice(0, 5).map((f) => ({
  date: f.date || null,
  track: f.track || null,
  dist: Number(f.distance) || null,
  place: /^\d+$/.test(String(f.place || '')) ? Number(f.place) : null,
  type: f.racetype || null,
}))

let faits = 0, erreurs = 0
const liste = cibles.filter((q) => FORCE || !cache[q.date + '|' + q.id])

for (let i = 0; i < liste.length; i += 6) {
  const lot = liste.slice(i, i + 6)
  await Promise.all(lot.map(async (q) => {
    try {
      const j = await get(`${CC}/api/race/${q.id}?date=${q.date}`)
      const chevaux = {}
      for (const r of j.runners || []) {
        const n = parseInt(r.number, 10)
        if (!Number.isFinite(n)) continue
        chevaux[n] = { nom: r.horse_name || null, runs: normaliser(n, r.forms) }
      }
      cache[q.date + '|' + q.id] = { date: q.date, id: q.id, track: q.track || null, chevaux }
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
const avecFormes = Object.values(cache).filter((x) => !x.erreur && Object.values(x.chevaux).some((c) => c.runs.length)).length
console.log('\n  collectées : ' + ok + ' / ' + Object.keys(cache).length + '  (avec au moins une forme : ' + avecFormes + ')')
console.log('  erreurs    : ' + erreurs + '   → ' + SORTIE)
