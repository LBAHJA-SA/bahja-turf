#!/usr/bin/env node
/* =============================================================================
 * tools/maroc.mjs — LA RÉUNION DU MAROC, COLLECTÉE POUR LE SITE (23/10/2026)
 *
 *   node tools\maroc.mjs                 la journée du jour
 *   node tools\maroc.mjs --date=2026-10-23
 *
 * POURQUOI CE FICHIER EXISTE
 *   `backend/DNA/morocco.js` lit la SOREC en direct (`e-sorec.ma`) à travers
 *   le relais `/api/ma`. Ça marche depuis le poste (au Maroc) et dans le
 *   navigateur. Ça NE MARCHE PAS depuis Vercel : e-sorec est injoignable de
 *   là-bas (504 en runtime edge, 502 en Node, mesuré le 23/10/2026 — alors que
 *   `/api/gz` répondait 200 dans le même run). Résultat : en ligne, Casablanca
 *   disparaissait de la page `/dna`.
 *
 *   Ce script tourne donc LÀ OÙ e-sorec répond — le poste — et écrit la
 *   réunion complète (courses + partants + cotes) dans :
 *
 *       data/maroc.json           (le disque, pour les outils)
 *       public/data/maroc.json    (ce que la page lit en repli)
 *
 *   `morocco.js` s'en sert quand le direct échoue, ou quand le fichier a moins
 *   de 3 h. C'est la même logique que `data/cotes.json` (§13) : le direct
 *   d'abord, le fichier ensuite, jamais une page vide.
 *
 * ⚠ UNE PANNE N'ÉCRASE RIEN
 *   Si la SOREC ne répond pas (ou ne donne aucune réunion marocaine), le
 *   fichier de la veille RESTE en place et le script sort en code 1. Le job
 *   quotidien le signale et continue : il ne casse jamais le cycle.
 * ========================================================================== */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { reglerSource, collecter } from '../backend/DNA/morocco.js'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const DATA = path.join(RACINE, 'data')
const PUB = path.join(RACINE, 'public', 'data')

const args = process.argv.slice(2)
const argDate = (args.find((a) => a.startsWith('--date=')) || '').split('=')[1]
const aujourdhui = (d = new Date()) => {
  /* la date LOCALE, pas UTC : à 00 h 30 au Maroc, UTC est encore hier */
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const date = argDate || aujourdhui()

const ecrire = (f, o) => {
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, JSON.stringify(o, null, 2), 'utf8')
}

/* ⭐ L'ARCHIVE PAR DATE (25/10/2026) — `maroc.json` ne porte QUE la journée du
 *   run. Sur `/dna`, dès qu'on choisit une autre date, la réunion marocaine
 *   disparaissait : le fichier ne correspondait plus. On garde donc les 40
 *   derniers jours dans `maroc-jours.json`, que `morocco.js` consulte quand le
 *   fichier du jour ne correspond pas à la date demandée. */
const GARDER = 40
const FICHIER_JOURS = 'maroc-jours.json'

function archiver(date, meetings) {
  const f = path.join(DATA, FICHIER_JOURS)
  let ancien = { jours: {} }
  try { ancien = JSON.parse(fs.readFileSync(f, 'utf8')) || { jours: {} } } catch (e) { /* premier run */ }
  const jours = { ...(ancien.jours || {}) }
  jours[date] = meetings
  const gardees = Object.keys(jours).sort().slice(-GARDER)
  const propre = {}
  for (const d of gardees) propre[d] = jours[d]
  const sortie = { maj: new Date().toISOString(), jours: propre }
  ecrire(f, sortie)
  ecrire(path.join(PUB, FICHIER_JOURS), sortie)
  return gardees.length
}

async function main() {
  reglerSource('https://e-sorec.ma')
  console.log(`[maroc] ${date} — lecture de la SOREC`)

  let jour
  try {
    jour = await collecter(date)
  } catch (e) {
    console.log(`[maroc] ECHEC : ${e.message}`)
    console.log('[maroc] le fichier précédent reste en place (aucune écriture)')
    process.exitCode = 1
    return
  }

  ecrire(path.join(DATA, 'maroc.json'), jour)
  ecrire(path.join(PUB, 'maroc.json'), jour)
  const nbJours = archiver(date, jour.meetings)

  console.log(
    `[maroc] ${jour.reunions} réunion(s) · ${jour.courses} course(s) · ` +
    `${jour.meetings.reduce((n, m) => n + m.courses.reduce((k, c) => k + (c.runners || []).length, 0), 0)} partants`
  )
  for (const m of jour.meetings) {
    console.log(`[maroc]   MA${m.num} · ${m.hippodrome} (${m.sorec}) · ${m.courses.length} courses`)
  }
  console.log(`[maroc] archive : ${nbJours} jour(s) dans ${FICHIER_JOURS}`)
}

main()
