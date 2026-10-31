/* =============================================================================
 * tools/env-sync.mjs — REMETTRE LE LOGIN LOCAL À L'ÉTAT DE VERCEL (31/10/2026)
 *
 * La question
 *   « pourquoi ne pas faire un pull Vercel → local ? »
 *   C'est EXACTEMENT la bonne réparation. Cet outil le fait.
 *
 * Ce qui s'est passé (mesuré le 31/10/2026)
 *   `.env.local` est une PHOTO prise par `vercel env pull`. Depuis, le mot de
 *   passe de « sam » a changé sur Vercel : le hash du poste est l'ANCIEN.
 *   En ligne → accepté ; au poste → « nom ou mot de passe incorrect ».
 *
 *   ⚠ La cible `production` de `ADMIN_COMPTES` est de type `sensitive` :
 *     Vercel ne la rend à PERSONNE (API ni CLI), donc un pull `--environment
 *     production` ne répare rien. La cible `development`, elle, est chiffrée
 *     et SE LIT : c'est elle qu'on tire.
 *
 * Ce que l'outil fait
 *   1. `vercel env pull` (CLI 59) sur un fichier TEMPORAIRE, cible development
 *   2. lit ADMIN_COMPTES / ADMIN_SECRET de ce fichier
 *   3. compare compte par compte avec `.env.local` (hash égal ? oui/non)
 *   4. avec --ecrire : sauvegarde puis REMPLACE CES DEUX LIGNES SEULEMENT
 *      (les autres variables locales — VERCEL_OIDC_TOKEN… — sont conservées :
 *      on ne veut pas que le poste écrive dans le Redis de production)
 *
 * Usage
 *   node tools\env-sync.mjs             → diagnostic (n'écrit rien)
 *   node tools\env-sync.mjs --ecrire    → répare .env.local
 *
 * ⚠ Aucune valeur secrète n'est affichée : seulement les NOMS de comptes,
 *   leurs droits, et « hash identique » oui/non.
 * ⚠ `.env*` est ignoré par git.
 * ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const RACINE = path.resolve('.')
const ENVFILE = path.join(RACINE, '.env.local')
const DEPLOY = path.join(RACINE, '.deploy-env')
const TEMP = path.join(RACINE, '.env.sync.tmp')
const ecrire = process.argv.includes('--ecrire')
const CIBLES = ['ADMIN_COMPTES', 'ADMIN_SECRET']

const lireKeyVal = (fichier) => {
  const out = {}
  if (!fs.existsSync(fichier)) return out
  for (const ligne of fs.readFileSync(fichier, 'utf8').split(/\r?\n/)) {
    const i = ligne.indexOf('=')
    if (i > 0 && !ligne.trim().startsWith('#')) out[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim()
  }
  return out
}
const sansGuillemets = (v) => {
  const s = String(v || '').trim()
  return (s.length > 1 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) ? s.slice(1, -1) : s
}
const comptesDe = (valeur) => {
  try {
    const j = JSON.parse(sansGuillemets(valeur))
    const l = Array.isArray(j) ? j : (j.comptes || [])
    return Array.isArray(l) ? l : []
  } catch { return null }
}

const token = process.env.VERCEL_TOKEN || lireKeyVal(DEPLOY).VERCEL_TOKEN
if (!token) {
  console.log('\n  VERCEL_TOKEN manquant (environnement ou .deploy-env).\n')
  process.exit(1)
}

console.log('\n  Pull Vercel (cible development) → fichier temporaire…')
if (fs.existsSync(TEMP)) fs.unlinkSync(TEMP)
const r = spawnSync('npx', ['-y', 'vercel@59', 'env', 'pull', path.basename(TEMP),
  '--environment=development', '--yes', '--token', token],
{ cwd: RACINE, encoding: 'utf8', shell: true, timeout: 300000 })

if (r.status !== 0 || !fs.existsSync(TEMP)) {
  console.log('  ✗ échec du pull :\n' + String(r.stderr || r.stdout || '').slice(-500) + '\n')
  process.exit(1)
}

const tire = lireKeyVal(TEMP)
const local = lireKeyVal(ENVFILE)

console.log('\n  VERCEL (dev) → LOCAL')
console.log('  ' + '-'.repeat(70))
let aReparer = 0
for (const cle of CIBLES) {
  const vVercel = tire[cle]
  const vLocal = local[cle]
  if (vVercel == null) { console.log('  ' + cle.padEnd(16) + 'absent côté Vercel (dev)'); continue }
  if (vLocal == null) {
    console.log('  ' + cle.padEnd(16) + 'ABSENT en local            → à poser'); aReparer++
    continue
  }
  const egales = sansGuillemets(vVercel) === sansGuillemets(vLocal)
  console.log('  ' + cle.padEnd(16) + (egales ? 'identique' : 'DIFFÉRENT') +
    '                  (Vercel ' + String(vVercel).length + ' car. · local ' + String(vLocal).length + ' car.)')
  if (!egales) aReparer++
}

/* le détail par compte — c'est ça qui dit POURQUOI ça refuse */
const cv = comptesDe(tire.ADMIN_COMPTES)
const cl = comptesDe(local.ADMIN_COMPTES)
if (cv) {
  console.log('\n  comptes côté Vercel (dev) :')
  for (const c of cv) console.log('     ' + String(c.nom).padEnd(10) + ' actif=' + (c.actif !== false) + '  pages=' + JSON.stringify(c.pages || []))
}
if (cv && cl) {
  console.log('\n  comparaison des empreintes :')
  for (const c of cv) {
    const l = cl.find((x) => String(x.nom).toLowerCase() === String(c.nom).toLowerCase())
    if (!l) { console.log('     ' + String(c.nom).padEnd(10) + ' ABSENT en local'); continue }
    console.log('     ' + String(c.nom).padEnd(10) + (l.hash === c.hash ? 'hash identique' : 'hash DIFFÉRENT — mot de passe périmé au poste'))
  }
}

if (!aReparer) {
  console.log('\n  ✅ .env.local est déjà à l’état Vercel pour le login.\n')
  fs.unlinkSync(TEMP)
  process.exit(0)
}

if (!ecrire) {
  console.log('\n  ' + aReparer + ' variable(s) à remettre à jour — relance avec --ecrire.\n  (fichier temporaire supprimé)')
  fs.unlinkSync(TEMP)
  process.exit(0)
}

/* --ecrire : on REMPLACE LES DEUX LIGNES, le reste du fichier ne bouge pas. */
const texte = fs.existsSync(ENVFILE) ? fs.readFileSync(ENVFILE, 'utf8') : ''
const sauvegarde = ENVFILE + '.bak-' + new Date().toISOString().replace(/[:.]/g, '-')
if (fs.existsSync(ENVFILE)) fs.copyFileSync(ENVFILE, sauvegarde)
let sortie = texte
for (const cle of CIBLES) {
  if (tire[cle] == null) continue
  const ligne = cle + '=' + tire[cle]
  const motif = new RegExp('^' + cle + '=.*$', 'm')
  sortie = motif.test(sortie) ? sortie.replace(motif, ligne) : sortie.replace(/\s*$/, '\n') + ligne + '\n'
}
fs.writeFileSync(ENVFILE, sortie, 'utf8')
fs.unlinkSync(TEMP)

console.log('\n  ✅ .env.local réparé (' + CIBLES.filter((c) => tire[c] != null).join(' + ') + ')' +
  (fs.existsSync(sauvegarde) ? '\n     sauvegarde : ' + path.basename(sauvegarde) : ''))
console.log('     → Ctrl+C sur le serveur, `npm run dev`, puis le mot de passe EN LIGNE.\n')
