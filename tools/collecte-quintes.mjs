/**
 * COLLECTE DES QUINTÉS — le jeu de données de référence de la méthode (§11.18).
 *
 * `archives/` ne peut PAS servir : 866 courses y portent `quinte:true`, mais
 * 861 n'ont pas d'`arrivee`, et les 280 qui en ont une n'en comptent que 5
 * Quintés. Les données casacourses s'arrêtent à l'année en cours, donc 2020
 * n'est plus récupérable.
 *
 * Ce script va donc chercher la source directement :
 *
 *   pro.casacourses.com/api/programme?date=JJ-MM-AAAA
 *       -> on garde les courses dont available_bet_types contient sorec_quinte
 *          ET dont le pays est FR  (le Quinté Global PMU, PAS le Maroc)
 *   pro.casacourses.com/api/race/{id}?date=JJ-MM-AAAA
 *       -> cote finale + cote d'ouverture + résultat + dividendes officiels
 *          + la Synthèse de la presse quand elle existe
 *
 * Pour chaque Quinté on ne garde que ce qui est exploitable :
 *   ≥ 12 partants · une cote > 1 pour TOUS les partants · une arrivée connue.
 *
 *   node tools\collecte-quintes.mjs                 2026-01-01 → aujourd'hui
 *   node tools\collecte-quintes.mjs 2026-01-01 2026-09-30
 *   node tools\collecte-quintes.mjs --force         on repart de zéro
 *
 * Écrit data/quintes.json. Ne touche à rien d'autre.
 */
import fs from 'node:fs'

const CC = 'https://pro.casacourses.com'
const H = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
const FICHIER = 'data/quintes.json'
const CONC = 6

const args = process.argv.slice(2)
const force = args.includes('--force')
const dates = args.filter((a) => /^\d{4}-\d{2}-\d{2}$/)

const getJSON = async (u) => {
  const r = await fetch(u, { headers: H })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

const dISO = (d) => d.toISOString().slice(0, 10)
const debut = dates[0] || '2026-01-01'
const fin = dates[1] || dISO(new Date())

/* les jours à scruter, un par un */
const jours = []
for (let d = new Date(debut + 'T00:00:00Z'); d <= new Date(fin + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) jours.push(dISO(d))

/* ce qu'on a déjà : évite de refaire 280 requêtes */
const deja = new Map()
if (!force && fs.existsSync(FICHIER)) {
  for (const q of JSON.parse(fs.readFileSync(FICHIER, 'utf8'))) deja.set(q.date + '#' + q.id, q)
}
console.log(`  ${jours.length} jours  (${debut} → ${fin})   ${deja.size} Quintés déjà en base`
  + (force ? '   --force : on repart de zéro' : ''))

const out = []
let progKo = 0

async function jour(dt) {
  const prog = await getJSON(`${CC}/api/programme?date=${dt}`).catch(() => { progKo++; return null })
  if (!prog) return
  const cibles = []
  for (const m of prog.meetings || []) {
    for (const rc of m.races || []) {
      // Quinté Global PMU France : sorec_quinte ET pays FR (le Maroc sort)
      if (!(rc.available_bet_types || []).includes('sorec_quinte')) continue
      if ((rc.country || m.country) !== 'FR') continue
      cibles.push({ id: rc.id, code: rc.code, prix: (rc.name || '').trim() })
    }
  }
  for (const cible of cibles) {
    const cle = dt + '#' + cible.id
    if (deja.has(cle)) { out.push(deja.get(cle)); continue }
    const j = await getJSON(`${CC}/api/race/${cible.id}?date=${dt}`).catch(() => null)
    if (!j) continue
    const partants = (j.runners || []).filter((r) => r.status !== false)
    if (partants.length < 12) continue
    if (partants.some((r) => !(r.odd_numeric > 1))) continue       // cote manquante = tri partiel, on jette
    const arrivee = (j.results || []).slice().sort((a, b) => a.position - b.position).map((x) => Number(x.number))
    if (arrivee.length < 5) continue
    const syn = j.pronosticsDetailles?.syntheses
    let presse = []
    if (Array.isArray(syn)) {
      for (const s of syn) for (const c of s.classement || []) if (c.numPmu != null) presse.push(c.numPmu)
      presse = [...new Set(presse)]
    }
    out.push({
      date: dt, id: cible.id, code: cible.code, prix: cible.prix,
      track: j.track_name, discipline: j.type, distance: j.distance,
      nb: partants.length,
      cotes: Object.fromEntries(partants.map((r) => [Number(r.number), r.odd_numeric])),
      ouverture: Object.fromEntries(partants.map((r) => [Number(r.number), r.odd_opening_numeric ?? null])),
      arrivee,
      presse,                    // P1..Pn = l'ordre de la Synthèse de la presse
      dividends: j.dividends || [],
    })
    process.stdout.write('.')
  }
}

let i = 0
async function worker() {
  while (i < jours.length) {
    await jour(jours[i++])
    await new Promise((s) => setTimeout(s, 120))       // on ménage le serveur
  }
}
await Promise.all(Array.from({ length: CONC }, worker))

out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id))
fs.writeFileSync(FICHIER, JSON.stringify(out))

console.log('')
console.log(`  Quintés Global PMU France : ${out.length}   (programmes KO : ${progKo})`)
const parMois = {}
for (const q of out) { const m = q.date.slice(0, 7); parMois[m] = (parMois[m] || 0) + 1 }
console.log('  par mois : ' + Object.entries(parMois).map(([k, v]) => k + '=' + v).join('  '))
console.log(`  dont avec la Synthèse de la presse : ${out.filter((q) => q.presse.length >= 10).length}`)
console.log(`  → ${FICHIER}`)
console.log('')
console.log('  Mesure :  node tools\\mesure-quintes.mjs')