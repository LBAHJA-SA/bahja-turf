/* =============================================================================
 * tools/collect-jockeys.mjs — JOCKEY · ENTRAÎNEUR · ÂGE (20/10/2026)
 *
 * Les 96 Quintés à presse réelle n'ont AUCUNE donnée d'homme : `carriere96.json`
 * ne donne que date / distance / place. Or le jockey et l'entraîneur n'ont
 * jamais été mesurés comme signal de choix dans un bloc.
 *
 * `pro.casacourses.com/api/race/{id}?date=` publie pour chaque partant :
 *   jockey_name · horse_trainer · horse_age · weight · finish_order
 *
 * Sortie : data/corpus/jockeys96.json — { "date|id": { "n°": {...} } } (incrémental)
 *
 *   node tools\collect-jockeys.mjs
 * ============================================================================= */
import fs from 'node:fs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const SORTIE = 'data/corpus/jockeys96.json'
const BASE = 'https://pro.casacourses.com/api/race/'

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const LISTE = []
for (const q of TOUT) {
  const c = q.cotes
  if (!c || Object.keys(c).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  if (!(q.presse?.length >= 10)) continue
  if (!q.id || !q.date) continue
  LISTE.push(q)
}
let cache = {}
try { cache = JSON.parse(fs.readFileSync(SORTIE, 'utf8')) } catch { cache = {} }
const aFaire = LISTE.filter((q) => !cache[q.date + '|' + q.id])
console.log('')
console.log('  courses à presse réelle : ' + LISTE.length + ' · déjà en cache : ' + (LISTE.length - aFaire.length) +
  ' · à collecter : ' + aFaire.length)

let ok = 0, err = 0
for (let i = 0; i < aFaire.length; i += 5) {
  await Promise.all(aFaire.slice(i, i + 5).map(async (q) => {
    const cle = q.date + '|' + q.id
    try {
      const r = await fetch(BASE + q.id + '?date=' + q.date, {
        headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' },
      })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const j = await r.json()
      const out = {}
      for (const x of j.runners || []) {
        const n = Number(x.number)
        if (!Number.isFinite(n)) continue
        out[n] = {
          jockey: x.jockey_name || null,
          entraineur: x.horse_trainer || null,
          age: Number(x.horse_age) || null,
          poids: Number(x.weight) || null,
          ouverture: Number(x.odd_opening_numeric) || null,
        }
      }
      cache[cle] = out
      ok++
    } catch (e) {
      err++
      cache[cle] = { erreur: e.message }
    }
  }))
  if (i % 25 === 0) process.stdout.write('    ' + Math.min(i + 5, aFaire.length) + ' / ' + aFaire.length + '\r')
}
fs.writeFileSync(SORTIE, JSON.stringify(cache))
const bons = Object.values(cache).filter((x) => !x.erreur && Object.keys(x).length >= 8).length
console.log('    collectés : ' + ok + ' · erreurs : ' + err)
console.log('    cache : ' + Object.keys(cache).length + ' courses · ' + bons + ' exploitables')
console.log('')
