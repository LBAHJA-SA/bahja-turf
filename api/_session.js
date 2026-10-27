/* =============================================================================
 * api/_session.js — LA SESSION, LUE PAR TOUS (26/10/2026)
 *
 *   ⭐ Pourquoi ce fichier existe : jusqu'ici le cookie `bahja_admin` n'était
 *   lu QUE par `api/admin.js`. Impossible, donc, de savoir qu'un visiteur est
 *   un abonné : le journal des visites ne connaissait que des adresses IP.
 *   Demande de l'utilisateur — « واش كاين شي طريقة باش ايبان ليا نوع الجهاز
 *   ةالايب ديال المشتركين » — il faut pouvoir écrire « sam, Chrome · Mobile,
 *   41.140.… » et pas seulement « 41.140.… ».
 *
 *   Ce module est la version PARTAGÉE du code de `api/admin.js` : mêmes
 *   constantes, mêmes calculs, à l'octet près. `admin.js` s'en sert pour
 *   fabriquer le cookie (login), les autres routes s'en servent pour le LIRE.
 *
 * ⚠ LE NOM DU FICHIER COMMENCE PAR `_` : Vercel ne l'expose pas comme route.
 *   C'est une bibliothèque, pas un endpoint (même convention que `_proxy.js`).
 *
 * ⚠ ON NE FABRIQUE JAMAIS UNE SESSION ICI SANS MOT DE PASSE : `fabriquer()`
 *   suppose que `verifier()` a déjà dit oui. Aucun appel ne doit inverser ça.
 * ========================================================================== */

import crypto from 'node:crypto'

export const COOKIE = 'bahja_admin'
export const DEVICE_COOKIE = 'bahja_device'
export const DUREE = 12 * 3600            /* 12 h, en secondes */
export const ITER = 210000

export const env = (nom) => String(process.env[nom] || '').trim()
export const secret = () => env('ADMIN_SECRET')

/** Les comptes configurés (jamais rendus tels quels : ni sel ni hash). */
export function comptes() {
  const brut = env('ADMIN_COMPTES')
  if (!brut) return []
  try {
    const j = JSON.parse(brut)
    const liste = Array.isArray(j) ? j : (j.comptes || [])
    return Array.isArray(liste) ? liste.filter((c) => c && c.nom) : []
  } catch { return [] }
}

/* Comparaison à temps constant : on ne laisse pas mesurer un secret. */
export function memeChaine(a, b) {
  const x = String(a || ''), y = String(b || '')
  if (!x || x.length !== y.length) return false
  let d = 0
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return d === 0
}

export const b64u = (v) => Buffer.from(v).toString('base64url')
export const signer = (p) => crypto.createHmac('sha256', secret()).update(p).digest('base64url')

export function fabriquer(compte) {
  const corps = b64u(JSON.stringify({
    n: compte.nom,
    p: Array.isArray(compte.pages) ? compte.pages : [],
    exp: Date.now() + DUREE * 1000,
  }))
  return corps + '.' + signer(corps)
}

export function lireJeton(v) {
  if (!v || !secret()) return null
  const [corps, sig] = String(v).split('.')
  if (!corps || !sig) return null
  if (!memeChaine(sig, signer(corps))) return null
  try {
    const j = JSON.parse(Buffer.from(corps, 'base64url').toString('utf8'))
    if (!j || !j.exp || Number(j.exp) < Date.now()) return null
    return j
  } catch { return null }
}

export function cookies(req) {
  const brut = String(req.headers.cookie || '')
  const out = {}
  for (const morceau of brut.split(';')) {
    const i = morceau.indexOf('=')
    if (i > 0) out[morceau.slice(0, i).trim()] = decodeURIComponent(morceau.slice(i + 1).trim())
  }
  return out
}

/** Le mot de passe est-il le bon ? PBKDF2, le même calcul que la console. */
export function verifier(compte, motDePasse) {
  const sel = String(compte.sel || '')
  const attendu = String(compte.hash || '')
  const iter = Number(compte.iter) || ITER
  if (!sel || !attendu) return false
  let calc = ''
  try {
    calc = crypto.pbkdf2Sync(String(motDePasse), Buffer.from(sel, 'hex'), iter, 32, 'sha256').toString('hex')
  } catch { return false }
  return memeChaine(calc, attendu)
}

/* ─────────────────────────────────────────── QUI EST CONNECTÉ, MAINTENANT ?
 *
 *  Deux vérifications, pas une :
 *    ① le cookie est signé et pas expiré (`lireJeton`) ;
 *    ② le compte EXISTE ENCORE dans `ADMIN_COMPTES` et n'est pas désactivé.
 *
 *  ⭐ La ② est essentielle : sans elle, un compte supprimé garderait l'accès
 *  jusqu'à l'expiration de son cookie (12 h). Vérifié le 26/10/2026 : compte
 *  retiré → cookie refusé → formulaire de connexion.
 */
export function sessionAdmin(req) {
  const j = lireJeton(cookies(req)[COOKIE])
  if (!j) return null
  const c = comptes().find((x) => String(x.nom).toLowerCase() === String(j.n || '').toLowerCase())
  if (!c || c.actif === false) return null
  return {
    nom: c.nom,
    pages: Array.isArray(c.pages) ? c.pages : (Array.isArray(j.p) ? j.p : []),
  }
}

/** `admin` dans `pages[]` = tous les droits (voir PAGES, donnees.js). */
export function aDroitAdmin(session) {
  return !!session && Array.isArray(session.pages) && session.pages.includes('admin')
}

/** Le propriétaire, ou la clé `ADMIN_JETON` — les deux ouvrent le journal.
 *
 *  ⭐ 26/10/2026 — LA SESSION SUFFIT. Avant, il fallait taper `ADMIN_JETON`
 *  dans la console pour lire le journal. C'était une variable de plus à poser
 *  sur Vercel pour une information que le propriétaire a déjà le droit de
 *  voir : sa propre session. Le jeton reste accepté (utile pour `curl`), mais
 *  il n'est plus obligatoire — une variable oubliée ne doit pas rendre le
 *  journal illisible à son propriétaire.
 */
export function journalOuvert(req) {
  const s = sessionAdmin(req)
  if (aDroitAdmin(s)) return { par: 'session', nom: s.nom }
  const attendu = env('ADMIN_JETON')
  if (!attendu) return null
  const donne = String((req.query && req.query.jeton) || '')
  if (memeChaine(donne, attendu)) return { par: 'jeton', nom: '' }
  return null
}
