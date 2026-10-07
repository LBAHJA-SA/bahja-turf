/* ---------------------------------------------------------------
 * tools\collecter-corpus.mjs  —  ⭐ LE CORPUS QUI MANQUAIT
 *
 *   node tools\collecter-corpus.mjs            → reprend où il s'est arrêté
 *   node tools\collecter-corpus.mjs --force    → refait tout
 *
 * On a deux moitiés de corpus et aucune course qui ait les deux :
 *
 *   data\quintes.json → la SYNTHÈSE de la presse + les cotes + l'arrivée
 *                       (101 Quintés, 2026-02 → 2026-07)   mais AUCUN cheval
 *   archives\*.json   → le détail des chevaux (musique, valeur, poids, âge,
 *                       stats) + l'arrivée                     mais AUCUNE presse
 *
 * PMU sert un `participants` pour N'IMPORTE QUELLE date :
 *   .../programme/{JJMMAAAA}                    → le programme du jour
 *   .../programme/{JJMMAAAA}/R{n}/C{i}/participants
 *
 * ⇒ On recolle les deux moitiés. Le résultat vit dans
 *   data\corpus\presse-carriere.json : une course = presse + cotes +
 *   arrivée + les partants. C'est le seul endroit où la GRILLE et la
 *   CARRIÈRE existent en même temps — donc le seul terrain où l'on peut
 *   enfin mesurer l Zanaka du moteur contre le marché.
 *
 * Reprise automatique : ce qui est déjà dans le cache est sauté.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOS_PROG = path.join(RACINE, 'data', 'corpus', 'prog')
const DOS_PART = path.join(RACINE, 'data', 'corpus', 'part')
const SORTIE = path.join(RACINE, 'data', 'corpus', 'presse-carriere.json')
const BASE = 'https://online.turfinfo.api.pmu.fr/rest/client/61'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const force = process.argv.includes('--force')

fs.mkdirSync(DOS_PROG, { recursive: true })
fs.mkdirSync(DOS_PART, { recursive: true })

const lire = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
const ecrire = (p, v) => fs.writeFileSync(p, JSON.stringify(v), 'utf8')
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const jjmm = (iso) => iso.slice(8, 10) + iso.slice(5, 7) + iso.slice(0, 4)

/** Le programme d'un jour, avec le chemin R{n}/C{i} de chaque course. */
async function programme(date) {
  const f = path.join(DOS_PROG, `${date}.json`)
  if (!force) { const c = lire(f); if (c) return c }
  const r = await fetch(`${BASE}/programme/${jjmm(date)}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!r.ok) throw new Error(`programme HTTP ${r.status}`)
  const j = await r.json()
  /* ⚠ La forme réelle du programme PMU (vérifiée le 06/10/2026) :
   *   { programme: { date, reunions: [ { numExterne, hippodrome, courses: [...] } ] } }
   * et pour une course : numExterne · distance · nombreDeclaresPartants ·
   * hippodrome.codeHippodrome · hippodrome.libelle.              */
  const reunions = ((j.programme || {}).reunions || []).map((re) => ({
    num: re.numExterne,
    code: ((re.hippodrome || {}).codeHippodrome) || '',
    nom: ((re.hippodrome || {}).libelle) || '',
    courses: (re.courses || []).map((c) => ({
      num: c.numExterne,
      libelle: c.libelle || '',
      code: ((c.hippodrome || {}).codeHippodrome) || '',
      nom: ((c.hippodrome || {}).libelle) || '',
      distance: c.distance,
      partants: c.nombreDeclaresPartants,
    })),
  }))
  ecrire(f, reunions)
  return reunions
}

/** Les partants d'une course, Historical compris. */
async function partants(date, r, c) {
  const cle = `${date}_R${r}_C${c}`
  const f = path.join(DOS_PART, `${cle}.json`)
  if (!force) { const x = lire(f); if (x) return x }
  const rep = await fetch(`${BASE}/programme/${jjmm(date)}/R${r}/C${c}/participants`, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!rep.ok) throw new Error(`participants HTTP ${rep.status}`)
  const j = await rep.json()
  const ps = (j.participants || []).map((p) => ({
    num: p.numPmu,
    nom: p.nom,
    age: p.age ?? null,
    sexe: p.sexe || '',
    jockey: p.driver || '',
    entraineur: p.entraineur || '',
    poids: p.handicapPoids ?? p.poids ?? null,
    valeur: p.handicapValeur ?? null,
    musique: p.musique || '',
    nbCourses: p.nombreCourses ?? null,
    nbVictoires: p.nombreVictoires ?? null,
    nbPlaces: p.nombrePlaces ?? null,
    nb2e: p.nombrePlacesSecond ?? null,
    nb3e: p.nombrePlacesTroisieme ?? null,
    gains: p.gainsParticipant ?? null,
    corde: p.placeCorde ?? null,
    arrivee: p.ordreArrivee ?? null,
  }))
  ecrire(f, ps)
  return ps
}

/* ---------------------------------------------------- le programme du jour --- */
const Q = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'quintes.json'), 'utf8'))
const cibles = Q.filter((q) => Array.isArray(q.presse) && q.presse.length >= 4 && Array.isArray(q.arrivee) && q.arrivee.length >= 5)
const parDate = new Map()
for (const q of cibles) {
  if (!parDate.has(q.date)) parDate.set(q.date, [])
  parDate.get(q.date).push(q)
}
console.log('')
console.log(`  ⭐ COLLECTE DU CORPUS — ${cibles.length} Quintés sur ${parDate.size} journées`)
console.log('')

let prog = 0
let part = 0
let ko = 0
const echecs = []

for (const [date, races] of [...parDate.entries()].sort()) {
  let reunions = null
  try { reunions = await programme(date) } catch (e) { ko++; echecs.push(`${date} programme : ${e.message}`); console.log(`  ${date}  programme KO : ${e.message}`); continue }
  prog++

  for (const q of races) {
    const num = Number(String(q.code).replace(/[^0-9]/g, ''))
    let trouve = null
    // 1. même numéro de course + même distance + même nombre de partants
    for (const re of reunions) {
      const c = (re.courses || []).find((x) => x.num === num)
      if (!c) continue
      if (c.distance === q.distance && Math.abs((c.partants || 0) - q.nb) <= 2) { trouve = { re, c }; break }
    }
    // 2. sinon : même numéro + même distance
    if (!trouve) {
      for (const re of reunions) {
        const c = (re.courses || []).find((x) => x.num === num && x.distance === q.distance)
        if (c) { trouve = { re, c }; break }
      }
    }
    // 3. sinon : la course qui ressemble le plus (distance + partants)
    if (!trouve) {
      let meilleur = null
      for (const re of reunions) {
        for (const c of re.courses || []) {
          if (c.distance !== q.distance) continue
          const ecart = Math.abs((c.partants || 0) - q.nb)
          if (!meilleur || ecart < meilleur.ecart) meilleur = { re, c, ecart }
        }
      }
      if (meilleur && meilleur.ecart <= 3) trouve = { re: meilleur.re, c: meilleur.c }
    }
    if (!trouve) { ko++; echecs.push(`${date} ${q.code} (${q.track} ${q.distance}m ${q.nb}p) : course introuvable`); continue }

    try {
      const ps = await partants(date, trouve.re.num, trouve.c.num)
      if (ps.length < 8) { ko++; echecs.push(`${date} ${q.code} : ${ps.length} partants seulement`); continue }
      part++
      q._r = trouve.re.num
      q._c = trouve.c.num
      q._p = ps
    } catch (e) { ko++; echecs.push(`${date} ${q.code} : ${e.message}`) }
    await pause(350)
  }
  await pause(500)
  if (prog % 10 === 0) console.log(`  ${prog}/${parDate.size} journées  ·  ${part} courses avec partants`)
}

/* --------------------------------------------------------------- écriture --- */
const sortie = {}
let ecrites = 0
for (const q of cibles) {
  if (!q._p) continue
  const cle = `${q.date}_R${q._r}_C${q._c}`
  sortie[cle] = {
    cle,
    date: q.date,
    r: q._r,
    c: q._c,
    track: q.track,
    discipline: q.discipline,
    distance: q.distance,
    nb: q.nb,
    prix: q.prix,
    presse: q.presse,
    cotes: q.cotes,
    ouverture: q.ouverture,
    arrivee: q.arrivee,
    dividends: q.dividends,
    partants: q._p,
  }
  ecrites++
}
fs.mkdirSync(path.dirname(SORTIE), { recursive: true })
ecrire(SORTIE, sortie)

console.log('')
console.log(`  journées récupérées : ${prog}/${parDate.size}`)
console.log(`  courses avec la PRESSE + les CHEVAUX : ${ecrites}/${cibles.length}`)
console.log(`  fichier : data\\corpus\\presse-carriere.json  (${(fs.statSync(SORTIE).size / 1024).toFixed(0)} Ko)`)
if (echecs.length) {
  console.log('')
  console.log(`  ${echecs.length} échec(s), les 10 premiers :`)
  echecs.slice(0, 10).forEach((e) => console.log('     ' + e))
}
console.log('')
