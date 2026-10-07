/* ---------------------------------------------------------------
 * tools\corpus-complet.mjs  —  ⭐ LE CORPUS QUI A TOUT, PAR CHEVAL
 *
 *   node tools\corpus-complet.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *
 * LE CONSTAT
 *   archive-94.json   94 courses : cote, ouverture, arrivée, ET
 *                                les partants (âge, sexe, poids,
 *                                valeur, musique, gains, corde,
 *                                nbVictoires, nbPlaces)
 *   fusion.json      347 courses : cote, ouverture, arrivée, discipline,
 *                                distance — MAIS PAS les partants
 *
 *   Pour chercher un indice de DÉVIATION, il faut les caractéristiques
 *   de chaque cheval AVANT la course. Elles n'existent que dans les 94.
 *   Donc : il faut aller chercher les partants des 253 autres courses.
 *
 *   PMU sert un `participants` pour N'IMPORTE QUELLE date, comme pour
 *   la collecte du corpus. C'est la même source, le même format.
 *
 *   node tools\corpus-complet.mjs            reprend où il s'est arrêté
 *   node tools\corpus-complet.mjs --force    refait tout
 *
 * SORTIE  data\corpus\chevaux.json
 *   une course = la course + partants[] enrichis avec la position
 *   de marché, le Top 5, l'écart de cotation, la musique, etc.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOS = path.join(RACINE, 'data', 'corpus', 'chevaux')
const SORTIE = path.join(RACINE, 'data', 'corpus', 'chevaux.json')
const BASE = 'https://online.turfinfo.api.pmu.fr/rest/client/61'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const force = process.argv.includes('--force')

fs.mkdirSync(DOS, { recursive: true })
const lire = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
const ecrire = (p, v) => fs.writeFileSync(p, JSON.stringify(v), 'utf8')
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const jjmm = (iso) => iso.slice(8, 10) + iso.slice(5, 7) + iso.slice(0, 4)

/* la liste des courses à enrichir */
const fusion = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'corpus', 'fusion.json'), 'utf8')).courses
  const dejaFait = lire(SORTIE)
const cible = fusion.filter((c) => {
  if (dejaFait && dejaFait.courses && dejaFait.courses.some((x) => x.cle === c.cle)) return false
  return true
})
console.log('')
console.log('  📦 CORPUS COMPLET — les caractéristiques de chaque cheval')
console.log('  ' + '-'.repeat(70))
console.log('  courses à enrichir : ' + cible.length + ' / ' + fusion.length)
if (!cible.length) {
  console.log('  ⇒ déjà complet. relancer avec --force pour tout refaire.')
  console.log('')
  process.exit(0)
}

/** le R et le C d une course, pour l'URL PMU */
const prog = lire(path.join(RACINE, 'data', 'corpus', 'prog', cible[0].date + '.json'))
void prog
const programme = new Map()
for (const c of fusion) {
  if (!programme.has(c.date)) {
    const p = lire(path.join(RACINE, 'data', 'corpus', 'prog', c.date + '.json'))
    programme.set(c.date, p || null)
  }
}

/**PMU indexe par R/C, la fusion n'a qu'une clé libre : on cherche */
function trouverRC(date, cle) {
  const p = programme.get(date)
  if (!p) return null
  const m = cle.match(/_R(\d+)_C(\d+)$/)
  if (m) return { r: +m[1], c: +m[2] }
  return null
}

async function partants(date, r, c) {
  const f = path.join(DOS, `${date}_R${r}_C${c}.json`)
  if (!force) { const x = lire(f); if (x) return x }
  const url = `${BASE}/programme/${jjmm(date)}/R${r}/C${c}/participants`
  const rep = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!rep.ok) throw new Error('participants HTTP ' + rep.status)
  const j = await rep.json()
  const ps = (j.participants || []).map((p) => ({
    num: p.numPmu,
    nom: p.nom,
    age: p.age ?? null,
    sexe: p.sexe || '',
    jockey: p.driver || '',
    entraineur: p.entraineur || '',
    poids: p.handicapPoids ?? p.poids ?? null,
    valeur: p.valeur ?? null,
    musique: p.musique || '',
    nbCourses: p.nombreCourses ?? null,
    nbVictoires: p.nombreVictoires ?? null,
    nbPlaces: p.nombrePlaces ?? null,
    nb2e: p.nombrePlacesSecond ?? null,
    nb3e: p.nombrePlacesTroisieme ?? null,
    gains: p.gains ? {
      carriere: p.gains.gainsCarriere ?? null,
      victoires: p.gains.gainsVictoires ?? null,
      annee: p.gains.gainsAnneeEnCours ?? null,
      precedente: p.gains.gainsAnneePrecedente ?? null,
    } : null,
    corde: p.corde ?? p.depart ?? null,
  }))
  ecrire(f, ps)
  return ps
}

/* ─────────────── la boucle ─────────────── */
const progCache = new Map()
async function chargerProg(date) {
  if (progCache.has(date)) return progCache.get(date)
  let p = lire(path.join(RACINE, 'data', 'corpus', 'prog', date + '.json'))
  if (!p) {
    const rep = await fetch(`${BASE}/programme/${jjmm(date)}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (!rep.ok) { progCache.set(date, null); return null }
    const j = await rep.json()
    p = ((j.programme || {}).reunions || []).map((re) => ({
      num: re.numExterne, code: ((re.hippodrome || {}).codeHippodrome) || '', nom: ((re.hippodrome || {}).libelle) || '',
      courses: (re.courses || []).map((c) => ({ num: c.numExterne, partants: c.nombreDeclaresPartants })),
    }))
    ecrire(path.join(RACINE, 'data', 'corpus', 'prog', date + '.json'), p)
  }
  progCache.set(date, p)
  return p
}

let ok = 0
let ko = 0
const echecs = []
const resultat = dejaFait ? dejaFait.courses.slice() : []

/* on groupe par date pour ne charger chaque programme qu'une fois */
const parDate = new Map()
for (const c of cible) {
  if (!parDate.has(c.date)) parDate.set(c.date, [])
  parDate.get(c.date).push(c)
}

for (const [date, liste] of parDate) {
  const prog = await chargerProg(date)
  if (!prog) { ko += liste.length; echecs.push(date + ' (programme) ' + liste.length + ' courses'); continue }
  for (const c of liste) {
    const m = c.cle.match(/_R(\d+)_C(\d+)$/)
    let r = m ? +m[1] : null
    let cc = m ? +m[2] : null
    if (r == null) {
      /* la clé de la fusion est « date_Cn » : on retrouve le C dans le programme
         et on prend le premier R qui a ce nombre de partants */
      const cible2 = liste.filter((x) => x.cle === c.cle)
      void cible2
      const cn = c.cle.match(/_C(\d+)$/)
      cc = cn ? +cn[1] : null
      let trouve = null
      for (const re of prog) {
        for (const co of re.courses) {
          if (co.num === cc && (!trouve || co.partants === c.nbPartants)) trouve = { r: re.num, c: cc }
        }
      }
      if (!trouve) { ko++; echecs.push(c.cle + ' (course introuvable)'); continue }
      r = trouve.r
    }
    try {
      const ps = await partants(date, r, cc)
      const ordre = c.ordreCote
      const rangDe = new Map(ordre.map((x, i) => [x, i + 1]))
      const partantsEnrichis = ps.map((p) => {
        const rang = rangDe.get(p.num)
        return {
          ...p,
          rangMarche: rang ?? null,
          arrivee: c.arrivee.indexOf(p.num) + 1 || null,
          top5: c.arrivee.slice(0, 5).includes(p.num),
          cote: c.cotes[p.num] ?? null,
          ouverture: c.ouverture ? (c.ouverture[p.num] ?? null) : null,
        }
      })
      resultat.push({
        cle: c.cle, date: c.date, hippodrome: c.hippodrome, discipline: c.discipline,
        distance: c.distance, nbPartants: c.nbPartants, source: c.source,
        presseDispo: c.presseDispo, ordreCote: c.ordreCote, arrivee: c.arrivee,
        cotes: c.cotes, ouverture: c.ouverture, partants: partantsEnrichis,
      })
      ok++
    } catch (e) {
      ko++
      echecs.push(c.cle + ' — ' + String(e.message).slice(0, 40))
    }
    await pause(120)
  }
  process.stdout.write('  ' + date + ' : ' + parDate.get(date).length + ' courses traitées\r')
}

resultat.sort((a, b) => (a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0))
ecrire(SORTIE, {
  meta: {
    genere: new Date().toISOString().slice(0, 16).replace('T', ' '),
    nb: resultat.length, ok, ko,
    note: 'chaque partants[] porte rangMarche, arrivee, top5, cote, ouverture',
  },
  courses: resultat,
})

console.log('  ' + '-'.repeat(70))
console.log('  ✅ enrichies : ' + ok)
console.log('  ❌ échouées   : ' + ko)
if (echecs.length) {
  console.log('  ')
  echecs.slice(0, 12).forEach((e) => console.log('     ' + e))
  if (echecs.length > 12) console.log('     … et ' + (echecs.length - 12) + ' autres')
}
console.log('')
console.log('  → ' + SORTIE)
console.log('')