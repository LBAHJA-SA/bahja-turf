/* =============================================================================
 * tools/recours.mjs — LA CLÉ DE SECOURS DU LOGIN (28/10/2026)
 *
 * Le problème constaté en production :
 *   · `ADMIN_COMPTES` existait en TROIS exemplaires (production · preview ·
 *     development), et Vercel ne rend JAMAIS la valeur d'une variable
 *     « sensitive ». Impossible de relire un hash perdu, impossible de
 *     reconstruire la liste sans effacer les autres comptes.
 *   · Résultat : « nom ou mot de passe incorrect » sans aucun moyen de vérifier
 *     quoi que ce soit depuis l'extérieur.
 *
 * Ce que fait ce fichier — sans rien détruire :
 *   ① fabrique un mot de passe lisible (ni 0/O ni 1/l/I) ;
 *   ② calcule `sel · iter · hash` avec EXACTEMENT le calcul du serveur
 *      (PBKDF2-SHA256, 210 000 itérations, 32 octets) ;
 *   ③ pose `ADMIN_COMPTES_RECOURS` sur production + preview + development ;
 *   ④ affiche le mot de passe UNE fois et le garde dans `.recours.json`
 *      (fichier local, ignoré par git) pour pouvoir revérifier.
 *
 * `api/_session.js` lit cette variable EN PREMIER et FUSIONNE : les comptes
 * d'`ADMIN_COMPTES` restent intacts et continuent de fonctionner.
 *
 *   node tools\recours.mjs                  → pose la clé, affiche le mot de passe
 *   node tools\recours.mjs --verifier        → teste le login de bout en bout
 *   node tools\recours.mjs --retirer         → efface la clé de secours
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const PROJET = 'prj_FZFNbBzmLKfzQeAfNa6SNjXt3q2q'
const CLE = 'ADMIN_COMPTES_RECOURS'
const NOM = 'sam'
const LOCAL = '.recours.json'
const ITER = 210000
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'

const VERIFIER = process.argv.includes('--verifier')
const RETIRER = process.argv.includes('--retirer')

const token = (() => {
  try {
    const t = fs.readFileSync('.deploy-env', 'utf8').trim()
    const m = t.match(/VERCEL_TOKEN\s*=\s*(\S+)/)
    return m ? m[1] : ''
  } catch { return '' }
})()
if (!token) { console.error('VERCEL_TOKEN introuvable dans .deploy-env'); process.exit(1) }

const api = async (methode, chemin, corps) => {
  const r = await fetch('https://api.vercel.com' + chemin, {
    method: methode,
    headers: { Authorization: 'Bearer ' + token, ...(corps ? { 'Content-Type': 'application/json' } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  })
  let j = null
  try { j = await r.json() } catch { /* vide */ }
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + String(j?.error?.message || j?.message || '').slice(0, 200))
  return j
}

const motDePasse = (n = 14) => {
  const o = crypto.randomBytes(n)
  let s = ''
  for (let i = 0; i < n; i++) s += ALPHABET[o[i] % ALPHABET.length]
  return s
}

const existantes = async () => {
  const j = await api('GET', `/v9/projects/${PROJET}/env`)
  return (j.envs || []).filter((e) => e.key === CLE)
}

/* ───────────────────────────── ① RETIRER ────────────────────────────────── */
if (RETIRER) {
  const listes = await existantes()
  for (const e of listes) await api('DELETE', `/v9/projects/${PROJET}/env/${e.id}`)
  try { fs.unlinkSync(LOCAL) } catch { /* déjà absent */ }
  console.log('✓ ' + listes.length + ' entrée(s) ' + CLE + ' supprimée(s). Redéploie pour que ça prenne effet.')
  process.exit(0)
}

/* ───────────────────────────── ② VÉRIFIER ───────────────────────────────── */
if (VERIFIER) {
  if (!fs.existsSync(LOCAL)) { console.error('aucun ' + LOCAL + ' — lance d’abord « node tools\\recours.mjs »'); process.exit(1) }
  const { motDePasse: mdp, nom } = JSON.parse(fs.readFileSync(LOCAL, 'utf8'))
  const r = await fetch('https://bahja-turf.vercel.app/api/admin?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom, motDePasse: mdp }),
  })
  const j = await r.json().catch(() => null)
  console.log('login « ' + nom + ' » → HTTP ' + r.status + ' · ' + JSON.stringify(j?.erreur || j?.nom || j))
  const e = await fetch('https://bahja-turf.vercel.app/api/admin?action=etat').then((x) => x.json()).catch(() => null)
  console.log('etat → ' + JSON.stringify(e))
  process.exit(r.status === 200 ? 0 : 1)
}

/* ───────────────────────────── ③ POSER ──────────────────────────────────── */
const mdp = motDePasse()
const sel = crypto.randomBytes(16).toString('hex')
const hash = crypto.pbkdf2Sync(mdp, Buffer.from(sel, 'hex'), ITER, 32, 'sha256').toString('hex')
const compte = {
  nom: NOM,
  sel,
  iter: ITER,
  hash,
  pages: ['analyse', 'quinte', 'presse', 'lives', 'dna', 'resultats', 'article', 'admin'],
  actif: true,
  etudesFrance: true,
  debut: '',
  fin: '',
}
const valeur = JSON.stringify([compte])

const listes = await existantes()
for (const e of listes) await api('DELETE', `/v9/projects/${PROJET}/env/${e.id}`)
await api('POST', `/v10/projects/${PROJET}/env`, {
  key: CLE,
  value: valeur,
  type: 'sensitive',
  target: ['production', 'preview', 'development'],
})

fs.writeFileSync(LOCAL, JSON.stringify({ nom: NOM, motDePasse: mdp, pose: new Date().toISOString() }, null, 1))

console.log('✓ ' + CLE + ' posée sur production + preview + development')
console.log('  anciennes entrées remplacées : ' + listes.length)
console.log('')
console.log('  ┌──────────────────────────────────────────────┐')
console.log('  │  nom          : ' + NOM.padEnd(28) + '│')
console.log('  │  mot de passe : ' + mdp.padEnd(28) + '│')
console.log('  └──────────────────────────────────────────────┘')
console.log('')
console.log('  ⚠ le mot de passe n’est affiché qu’ici (copie locale : ' + path.resolve(LOCAL) + ').')
console.log('  Il faut maintenant REDÉPLOYER pour que la fonction le voie :')
console.log('      git push origin main        (ou n’importe quel déploiement de production)')
console.log('  puis :  node tools\\recours.mjs --verifier')
