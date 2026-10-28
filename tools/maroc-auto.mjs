#!/usr/bin/env node
/* Vérifie la publication SOREC et met à jour le site si les données changent.
 * Destiné aux tâches Windows de 06 h, 07 h et 08 h (heure de Casablanca).
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOG = path.join(ROOT, 'data', 'maroc-auto.log')
const NODE = process.execPath
const jourLocal = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())
const heureLocale = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date())

function journal(message) {
  fs.mkdirSync(path.dirname(LOG), { recursive: true })
  fs.appendFileSync(LOG, `[${jourLocal} ${heureLocale} Africa/Casablanca] ${message}\n`, 'utf8')
}

function lancer(script, args = []) {
  const r = spawnSync(NODE, [path.join(ROOT, script), ...args], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
  })
  return { code: r.status ?? 1, output: [r.stdout, r.stderr].filter(Boolean).join('\n').trim(), error: r.error }
}

function sansHorodatage(value) {
  if (Array.isArray(value)) return value.map(sansHorodatage)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value)
    .filter(([k]) => !['collecteLe', 'maj'].includes(k))
    .map(([k, v]) => [k, sansHorodatage(v)]))
}

function lireJSON(file) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')) } catch { return null }
}

const avant = sansHorodatage({
  jour: lireJSON('public/data/maroc.json'),
  archive: lireJSON('public/data/maroc-jours.json')?.jours?.[jourLocal] || null,
})

/* ⭐ 27/10/2026 — LE JOB TOURNE MAINTENANT À L'HEURE PILE.
 *
 *  Une fois la carte du jour publiée ET le site déployé, il n'y a plus rien à
 *  faire : on s'arrête AVANT la collecte SOREC et AVANT le déploiement. Sans
 *  ce garde-fou, chaque heure aurait payé un build Vite + un envoi Vercel
 *  (~3 min) pour republier le même programme.
 *
 *  « Site déployé » se lit avec `deploy.mjs --check` (empreinte des sources
 *  contre `data/deploy.json`) : 2 s, aucun build. */
const jourDejaPublie = avant.jour
  && String(avant.jour.date) === jourLocal
  && Array.isArray(avant.jour.meetings) && avant.jour.meetings.length > 0

if (jourDejaPublie) {
  const verif = lancer('tools/deploy.mjs', ['--check'])
  if (verif.code === 0) {
    journal('Programme du Maroc deja publie et site a jour — rien a faire.')
    process.exit(0)
  }
  journal('Programme du jour present mais site perime — redeploiement.')
  const deploy = lancer('tools/deploy.mjs', ['--force'])
  if (deploy.output) journal(deploy.output.replace(/\r?\n/g, ' | '))
  if (deploy.code !== 0) {
    journal(`Echec du deploiement (code ${deploy.code}).`)
    process.exit(1)
  }
  journal('Deploiement termine.')
  process.exit(0)
}

journal('Début de la vérification SOREC.')
const collecte = lancer('tools/maroc.mjs')
if (collecte.output) journal(collecte.output.replace(/\r?\n/g, ' | '))
if (collecte.code !== 0) {
  journal(`Échec de la collecte (code ${collecte.code}); aucune publication.`)
  process.exitCode = 1
} else {
  const jour = lireJSON('public/data/maroc.json')
  if (!jour || jour.date !== jourLocal || !Array.isArray(jour.meetings) || !jour.meetings.length) {
    journal('La collecte n’a pas produit le programme du jour; aucune publication.')
    process.exitCode = 1
  } else {
    const apres = sansHorodatage({
      jour,
      archive: lireJSON('public/data/maroc-jours.json')?.jours?.[jourLocal] || null,
    })
    if (JSON.stringify(avant) === JSON.stringify(apres)) {
      journal('Programme inchangé; aucun redéploiement nécessaire.')
    } else {
      journal('Nouvelles données détectées; lancement du déploiement Vercel.')
      const deploy = lancer('tools/deploy.mjs', ['--force'])
      if (deploy.output) journal(deploy.output.replace(/\r?\n/g, ' | '))
      if (deploy.code !== 0) {
        journal(`Échec du déploiement (code ${deploy.code}).`)
        process.exitCode = 1
      } else journal('Déploiement terminé.')
    }
  }
}
