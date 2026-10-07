#!/usr/bin/env node
/* =============================================================================
 * tools/deploy.mjs — publier Bahja-TURF sur Vercel, puis LE VÉRIFIER.
 *
 *   node tools\deploy.mjs            build + deploy + verification
 *   node tools\deploy.mjs --check    compare local / en ligne, ne publie PAS
 *   node tools\deploy.mjs --force    publie même si rien n'a changé
 *   node tools\deploy.mjs --no-build réutilise le dist/ déjà construit
 *
 * Le jeton vient de `.deploy-env` (jamais écrit dans un autre fichier, jamais
 * affiché). Aucune clé Vercel n'est requise en dehors de ce fichier.
 *
 * La vérification est en DEUX temps :
 *   ① l'empreinte des SOURCES locales == l'empreinte déployée ?
 *      (sinon le site est périmé)
 *   ② le bundle EN LIGNE contient-il encore une référence à bahja-pmu ?
 *      (le retour de la séparation — doit être 0)
 * ========================================================================== */

import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ETAT = path.join(RACINE, 'data', 'deploy.json')
const ENVFILE = path.join(RACINE, '.deploy-env')
const SITE = process.env.BAHJA_SITE || 'https://bahja-turf.vercel.app'
const ARGS = process.argv.slice(2)
const CHECK = ARGS.includes('--check')
const FORCE = ARGS.includes('--force')
const NOBUILD = ARGS.includes('--no-build')

/* ------------------------------------------------------------- journal --- */
const t0 = Date.now()
const sec = () => `${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s`
const log = (...a) => console.log(`[${sec()}]`, ...a)

/* ------------------------------------------------------------- helpers --- */
function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    // sur Windows, npm.cmd / npx.cmd ne sont pas des exécutables : il faut un shell
    const shell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd)
    const p = spawn(cmd, args, { cwd: RACINE, stdio: 'inherit', shell, windowsHide: true, ...opts })
    p.on('error', rej)
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(`${cmd} a fini avec le code ${code}`))))
  })
}

/** lit KEY=VAL depuis .deploy-env (jamais affiche la valeur) */
function lireEnv() {
  if (!existsSync(ENVFILE)) return {}
  const out = {}
  for (const l of readFileSync(ENVFILE, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

/** l'empreinte des SOURCES — c'est elle qui dit si le site est périmé */
const SOURCES = ['src', 'frontend', 'backend', 'public', 'index.html', 'package.json', 'vite.config.js', 'vercel.json']
const SUFFIXES = new Set(['.js', '.jsx', '.mjs', '.css', '.json', '.html'])

/** Champs d'horodatage : ils changent a chaque job SANS rien changer de utile.
 *  Sans cette neutralisation, les 2 runs quotidiens (08:45 / 20:30) publieraient
 *  un site identique, pour un `collecteLe` de plus. On les neutralise pour le
 *  calcul de l'empreinte SEULEMENT : le fichier sur disque garde sa valeur. */
const VOLATILS = [/("collecteLe"\s*:\s*)"[^"]*"/g, /("collecte_le"\s*:\s*)"[^"]*"/g]

function empreinteFichier(p, rel) {
  if (path.extname(p) !== '.json') return readFileSync(p)
  let txt = readFileSync(p, 'utf8')
  for (const re of VOLATILS) txt = txt.replace(re, '$1""')
  return txt
}

function empreinteSources() {
  const h = createHash('sha256')
  const fichiers = []
  const marcher = (p, rel) => {
    const st = statSync(p)
    if (st.isDirectory()) {
      for (const e of readdirSync(p).sort()) {
        if (e === 'node_modules' || e === '.vercel' || e === 'dist' || e === 'tmp') continue
        marcher(path.join(p, e), path.join(rel, e))
      }
    } else if (SUFFIXES.has(path.extname(p)) && rel !== path.join('data', 'deploy.json')) {
      fichiers.push(rel)
    }
  }
  for (const s of SOURCES) {
    const p = path.join(RACINE, s)
    if (existsSync(p)) marcher(p, s)
  }
  for (const rel of fichiers.sort()) {
    h.update(rel)
    h.update(empreinteFichier(path.join(RACINE, rel), rel))
  }
  return { hash: h.digest('hex').slice(0, 16), nb: fichiers.length }
}

/* ------------------------------------------------- ce qui est en ligne --- */
async function enLigne() {
  const r = await fetch(SITE, { cache: 'no-store' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const html = await r.text()
  const b = (html.match(/assets\/index-([A-Za-z0-9_-]+)\.js/) || [])[1] || null
  let sale = []
  if (b) {
    const js = await (await fetch(`${SITE}/assets/index-${b}.js`, { cache: 'no-store' })).text()
    sale = ['railway.app', 'bahja-pmu', 'bahja-pmu.vercel.app'].filter((s) => js.includes(s))
  }
  return { bundle: b, sale }
}

/* ---------------------------------------------------------------- main --- */
const env = lireEnv()
const token = process.env.VERCEL_TOKEN || env.VERCEL_TOKEN
const local = empreinteSources()
let etat = existsSync(ETAT) ? JSON.parse(readFileSync(ETAT, 'utf8')) : null

log(`sources : ${local.nb} fichiers  empreinte ${local.hash}`)
log(`site    : ${SITE}`)
log(`deployee: ${etat?.hash || '(jamais)'}`)

if (CHECK) {
  const { bundle, sale } = await enLigne()
  const aJour = etat?.hash === local.hash
  console.log('')
  console.log(`  bundle en ligne : ${bundle || '(introuvable)'}`)
  console.log(`  a jour          : ${aJour ? 'OUI' : 'NON — le site est perime'}`)
  console.log(`  refs bahja-pmu  : ${sale.length ? sale.join(', ') : '0  (OK)'}`)
  console.log('')
  process.exit(aJour && !sale.length ? 0 : 1)
}

if (!token) {
  console.error('\n  VERCEL_TOKEN manquant. Le mettre dans .deploy-env :\n    VERCEL_TOKEN=vcp_...\n')
  process.exit(2)
}

if (!NOBUILD) {
  log('build local…')
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'])
}

if (!FORCE && etat?.hash === local.hash) {
  log('rien n a change depuis le dernier deploy — rien a publier')
  process.exit(0)
}

log('deploy Vercel --prod…')
await run(process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['-y', 'vercel@59', 'deploy', '--prod', '--yes', '--token', token])

log('verification en ligne…')
let verif = null
for (let i = 1; i <= 15; i++) {
  await new Promise((r) => setTimeout(r, 4000))
  try { verif = await enLigne(); if (verif.bundle) break } catch (e) { /* le CDN est peut-etre en train de rafraichir */ }
}
if (!verif) { console.error('  le site ne repond pas apres le deploy'); process.exit(1) }

if (verif.sale.length) {
  console.error(`\n  ECHEC : le bundle en ligne contient encore ${verif.sale.join(', ')}`)
  process.exit(1)
}

writeFileSync(ETAT, JSON.stringify({
  site: SITE, hash: local.hash, nbFichiers: local.nb,
  bundle: verif.bundle, deployeLe: new Date().toISOString(),
}, null, 2))

console.log('')
console.log(`  bundle en ligne : ${verif.bundle}`)
console.log(`  refs bahja-pmu  : 0  (OK)`)
console.log(`  ${SITE}/  ->  a jour`)
console.log('')