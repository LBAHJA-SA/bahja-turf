/* =============================================================================
 *  tools/maroc-resultats.mjs — L'ARCHIVE DES RÉSULTATS SOREC (24/10/2026)
 *
 *  Pourquoi un outil, alors que la page lit la SOREC en direct ?
 *
 *  ⚠ e-sorec.ma n'est joignable QUE depuis le Maroc. Depuis Vercel : 504 en
 *    edge, 502 en Node (mesuré le 24/10). La page en ligne ne peut donc pas
 *    demander les résultats marocains : elle lit l'archive déployée
 *    `public/data/maroc-resultats.json`. C'est CE fichier que cet outil écrit.
 *
 *  Il tourne sur le poste de l'utilisateur (Maroc), deux fois par jour, depuis
 *  `tools/daily.mjs` — qui publie ensuite le site.
 *
 *      node tools/maroc-resultats.mjs              aujourd'hui + les 6 jours d'avant
 *      node tools/maroc-resultats.mjs 2026-10-23   une seule date
 *      node tools/maroc-resultats.mjs --jours=30   remonter plus loin
 *
 *  Le fichier garde les JOURS (60 par défaut), pas les courses : une date
 *  absente = pas de course marocaine ce jour-là.
 * ========================================================================== */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { reglerSource, chargerSorec } from '../backend/RESULTATS/maroc.js'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const DATA = path.join(RACINE, 'data')
const PUB = path.join(RACINE, 'public', 'data')
const FICHIER = 'maroc-resultats.json'
const GARDER = 60

const log = (...a) => console.log('[sorec]', ...a)

const jour = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function lire(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null }
}

function ecrire(f, o) {
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, JSON.stringify(o), 'utf8')
}

/* ------------------------------------------------------------------ main -- */

const args = process.argv.slice(2)
const demande = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
const nbJours = Number((args.find((a) => a.startsWith('--jours=')) || '').split('=')[1]) || 7

const dates = []
if (demande) {
  dates.push(demande)
} else {
  const d = new Date()
  for (let i = 0; i < nbJours; i++) {
    dates.push(jour(d))
    d.setDate(d.getDate() - 1)
  }
}

reglerSource('https://e-sorec.ma')

const ancien = lire(path.join(DATA, FICHIER)) || { jours: {} }
const jours = { ...(ancien.jours || {}) }
let neuves = 0
let courses = 0

for (const date of dates) {
  try {
    const reunions = await chargerSorec(date)
    if (!reunions.length) { log(date, '— aucune course marocaine'); continue }
    jours[date] = reunions
    neuves++
    courses += reunions.reduce((n, m) => n + m.races.length, 0)
    log(date, `— ${reunions.length} réunion(s), ${reunions.reduce((n, m) => n + m.races.length, 0)} course(s)`)
  } catch (e) {
    log(date, '— ECHEC :', e && e.message ? e.message : e)
  }
}

/* on ne garde que les GARDER dates les plus récentes */
const gardees = Object.keys(jours).sort().slice(-GARDER)
const propre = {}
for (const d of gardees) propre[d] = jours[d]

const sortie = { maj: new Date().toISOString(), jours: propre }
ecrire(path.join(DATA, FICHIER), sortie)
ecrire(path.join(PUB, FICHIER), sortie)

const taille = (fs.statSync(path.join(PUB, FICHIER)).size / 1024).toFixed(0)
log(`${neuves} date(s), ${courses} course(s) — ${gardees.length} jour(s) en archive, ${taille} Ko`)
