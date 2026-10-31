/* =============================================================================
 * tools/mdp-local.mjs — LE MOT DE PASSE DU SERVEUR LOCAL (31/10/2026)
 *
 * Pourquoi cet outil
 *   En ligne ça marche, en local « nom ou mot de passe incorrect ». Normal :
 *   `.env.local` (tiré par `vercel env pull`) peut contenir un compte
 *   ANCIEN — le mot de passe a été changé sur Vercel depuis, et le hash
 *   local n'a pas suivi.
 *
 *   ⚠ On ne peut PAS « retrouver » le mot de passe : `ADMIN_COMPTES` ne le
 *   contient pas. Il garde `sel`, `iter` et `hash` = PBKDF2-SHA256(mot de
 *   passe, sel, iter, 32 octets), une empreinte à sens unique (api/_session.js,
 *   `verifier()`). D'où cet outil : il VÉRIFIE une candidat, ou REMPLACE le
 *   hash local par celui du mot de passe que tu veux.
 *
 * Usage
 *   node tools\mdp-local.mjs --test "monmotdepasse"      → bon / mauvais
 *   node tools\mdp-local.mjs --set  "monmotdepasse"      → écrit le nouveau hash
 *   node tools\mdp-local.mjs --set  --nom sam            → mot de passe ALÉATOIRE
 *
 * Ce que ça touche : UNIQUEMENT `.env.local` (ignoré par git, `.env*`).
 * Rien d'autre. Une sauvegarde `.env.local.bak-<date>` est écrite avant.
 * Ensuite : arrête et relance `npm run dev` (les variables sont lues au
 * démarrage — vite.config.js, `loadEnv`).
 * ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const FICHIER = path.resolve('.env.local')
const ITER = 210000

const args = process.argv.slice(2)
const option = (nom, defaut = null) => {
  const i = args.indexOf(nom)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : defaut
}
const nom = option('--nom', 'sam')
const mode = args.includes('--set') ? 'set' : (args.includes('--test') ? 'test' : null)
const motDePasse = option('--test') || option('--set')

if (!mode) {
  console.log('\n  usage :')
  console.log('    node tools\\mdp-local.mjs --test "monmotdepasse"')
  console.log('    node tools\\mdp-local.mjs --set  "monmotdepasse"')
  console.log('    node tools\\mdp-local.mjs --set  --nom sam   (aléatoire)\n')
  process.exit(0)
}
if (!fs.existsSync(FICHIER)) {
  console.log('\n  .env.local absent — lance `vercel env pull .env.local` d’abord.\n')
  process.exit(1)
}

const texte = fs.readFileSync(FICHIER, 'utf8')
const ligne = texte.split(/\r?\n/).find((l) => l.startsWith('ADMIN_COMPTES='))
if (!ligne) {
  console.log('\n  ADMIN_COMPTES absent de .env.local.\n')
  process.exit(1)
}
let brut = ligne.slice('ADMIN_COMPTES='.length).trim()
let guillemets = ''
if ((brut.startsWith('"') && brut.endsWith('"')) || (brut.startsWith("'") && brut.endsWith("'"))) {
  guillemets = brut[0]
  brut = brut.slice(1, -1)
}
let json
try { json = JSON.parse(brut) } catch (e) {
  console.log('\n  ADMIN_COMPTES n’est pas du JSON valide : ' + e.message + '\n')
  process.exit(1)
}
const liste = Array.isArray(json) ? json : (json.comptes || [])
const compte = liste.find((c) => String(c.nom || '').toLowerCase() === nom.toLowerCase())
if (!compte) {
  console.log('\n  Aucun compte « ' + nom + ' » dans .env.local. Comptes : ' + liste.map((c) => c.nom).join(', ') + '\n')
  process.exit(1)
}

const empreinte = (mdp, sel, iter) => crypto.pbkdf2Sync(String(mdp), Buffer.from(sel, 'hex'), iter, 32, 'sha256').toString('hex')
const egal = (a, b) => {
  const x = String(a || ''), y = String(b || '')
  if (!x || x.length !== y.length) return false
  let d = 0
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return d === 0
}

if (mode === 'test') {
  if (!motDePasse) { console.log('\n  donne un mot de passe à tester.\n'); process.exit(1) }
  const iter = Number(compte.iter) || ITER
  const ok = egal(empreinte(motDePasse, compte.sel, iter), compte.hash)
  console.log('\n  compte « ' + compte.nom + ' » · iter ' + iter)
  console.log('  → ' + (ok ? 'MOT DE PASSE BON (le local est à jour)' : 'MOT DE PASSE DIFFÉRENT du hash local'))
  if (!ok) console.log('     (en ligne il peut être bon : le hash de Vercel est un autre)')
  console.log('')
  process.exit(ok ? 0 : 2)
}

/* --set */
const nouveau = motDePasse || crypto.randomBytes(9).toString('base64url')
const sel = crypto.randomBytes(16).toString('hex')
compte.sel = sel
compte.iter = ITER
compte.hash = empreinte(nouveau, sel, ITER)
if (compte.actif === undefined) compte.actif = true

const valeur = (guillemets || '') + JSON.stringify(json) + (guillemets || '')
const sauvegarde = FICHIER + '.bak-' + new Date().toISOString().replace(/[:.]/g, '-')
fs.copyFileSync(FICHIER, sauvegarde)
fs.writeFileSync(FICHIER, texte.replace(ligne, 'ADMIN_COMPTES=' + valeur), 'utf8')

console.log('\n  ✅ hash local réécrit pour « ' + compte.nom + ' »')
console.log('     mot de passe : ' + nouveau + (motDePasse ? '' : '   (aléatoire — note-le)'))
console.log('     sauvegarde   : ' + path.basename(sauvegarde))
console.log('     → arrête le serveur, relance `npm run dev`, puis reconnecte-toi.\n')
