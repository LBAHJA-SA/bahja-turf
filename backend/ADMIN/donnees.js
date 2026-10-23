/* ══════════════════════════════════════════════════════════════════════════
 * backend/ADMIN/donnees.js — LES DONNÉES DE LA CONSOLE D'ADMINISTRATION
 *
 *  ⭐ CE QUI EST DÉJÀ FAIT, ET CE QUI NE L'EST PAS (18/10/2026)
 *
 *  La console est PRÉPARÉE, pas active : il n'y a AUCUN contrôle à l'entrée du
 *  site. Le jour où l'utilisateur voudra le vrai login, tout est là — les
 *  comptes, leurs mots de passe, et la liste des pages de chacun — et il n'y
 *  aura plus qu'à poser cette liste derrière le serveur.
 *
 *     · les COMPTES vivent dans le navigateur (localStorage). Ils s'exportent
 *       en `comptes.json` : c'est ce fichier qu'on donnera au serveur.
 *     · les PAGES du site sont une CONSTANTE (le catalogue ci-dessous) :
 *       c'est le même ordre que le bandeau, plus les pages hors bandeau.
 *     · les VISITES viennent de /api/visiteurs (l'IP est ajoutée par le
 *       serveur, jamais par la page).
 *
 *  ⚠ RIEN N'EST SECRET ICI. La clé de la console ne protège que l'affichage :
 *    un visiteur qui ouvre /admin sans clé est renvoyé à l'accueil, sans un
 *    mot. Ce n'est PAS de la sécurité — c'est de la discrétion, et c'est
 *    assumé tant que le login n'existe pas.
 *
 *  ⏸️ PRÉPARÉ, NON ACTIVÉ (consigne du 18/10/2026) : on ne branche RIEN tant que
 *    l'utilisateur ne l'a pas demandé — ni login, ni base, ni page filtrée.
 *    La marche à suivre de l'activation est dans AGENTS.md §25.6.
 * ══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────── LE CATALOGUE DES PAGES
 *
 *  `cle` sert de CLÉ DE PERMISSION (c'est elle qu'on stocke dans un compte) :
 *  ne jamais la renommer, sinon les droits déjà saisis ne s'appliquent plus.
 *  `route` est l'adresse réelle (vérifiée dans src/App.jsx le 18/10/2026).   */
export const PAGES = [
  { cle: 'analyse', nom: 'Analyse course', route: '/', icone: 'bi-clipboard2-pulse', bandeau: true, teinte: '#22d3ee' },
  { cle: 'quinte', nom: 'Quinté', route: '/quinte', icone: 'bi-trophy', bandeau: true, teinte: '#e879f9' },
  { cle: 'presse', nom: 'Presse', route: '/presse', icone: 'bi-newspaper', bandeau: true, teinte: '#fbbf24' },
  { cle: 'article', nom: 'Fiche de course', route: '/r/:slug', icone: 'bi-file-earmark-text', bandeau: false, teinte: '#a78bfa' },
  { cle: 'admin', nom: 'Administration', route: '/admin', icone: 'bi-shield-lock', bandeau: false, teinte: '#94a3b8', prive: true },
]

/** Le catalogue sous forme de dictionnaire (cle → page). */
export const PAGE_PAR_CLE = PAGES.reduce((m, p) => { m[p.cle] = p; return m }, {})

/* ─────────────────────────────────────────────────────────────── LE STOCKAGE */

const CLE_COMPTES = 'bahja.admin.comptes'
const CLE_REGLAGES = 'bahja.admin.reglages'
const CLE_JETON = 'bahja.admin.jeton'   // jeton du journal des visites (serveur)
export const CLE_ACCES = 'bahja.admin.cle'  // la clé de la console (discrétion)

function lire(cle, defaut) {
  try {
    const v = localStorage.getItem(cle)
    return v == null ? defaut : JSON.parse(v)
  } catch { return defaut }
}
function ecrire(cle, valeur) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); return true } catch { return false }
}

/* ──────────────────────────────────────────────────────── LES MOTS DE PASSE
 *
 *  Générateur LISIBLE : ni 0/O ni 1/l/I ni 5/S. Un mot de passe qu'on relit
 *  au téléphone sans se tromper vaut mieux qu'une suite de symboles.        */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function motDePasse(n = 10) {
  const octets = new Uint32Array(n)
  if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(octets)
  else for (let i = 0; i < n; i++) octets[i] = Math.floor(Math.random() * 4294967296)
  let s = ''
  for (let i = 0; i < n; i++) s += ALPHABET[octets[i] % ALPHABET.length]
  return s
}

/* ────────────────────────────────────────────────────────────── LES COMPTES */

/** Un compte vide, prêt à être rempli. `pages` = les clés autorisées. */
export function nouveauCompte(nom = '') {
  return {
    id: 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    nom,
    motDePasse: motDePasse(),
    pages: ['analyse', 'quinte'],
    actif: true,
    creeLe: new Date().toISOString(),
  }
}

export function lireComptes() {
  const c = lire(CLE_COMPTES, [])
  return Array.isArray(c) ? c : []
}
export function ecrireComptes(liste) {
  return ecrire(CLE_COMPTES, Array.isArray(liste) ? liste : [])
}

/* Un compte déjà saisi AVANT l'arrivée d'une page n'a pas sa clé : on ne la
 * lui donne pas d'office (un droit ne s'invente pas), on signale juste. */
export function droitsInconnus(compte) {
  return (compte.pages || []).filter((p) => !PAGE_PAR_CLE[p])
}

/* ────────────────────────────────────────────────────────────── LES RÉGLAGES */

export const REGLAGES_DEFAUT = {
  login: false,          // le jour du vrai login : true
  retentionJours: 30,    // durée de conservation du journal des visites
  note: '',              // libre
}
export function lireReglages() {
  return { ...REGLAGES_DEFAUT, ...lire(CLE_REGLAGES, {}) }
}
export function ecrireReglages(r) {
  return ecrire(CLE_REGLAGES, { ...REGLAGES_DEFAUT, ...(r || {}) })
}

/* ────────────────────────────────────────── LA CLÉ DE LA CONSOLE (discrétion) */

export function lireCle() {
  try { return localStorage.getItem(CLE_ACCES) || '' } catch { return '' }
}
export function ecrireCle(v) {
  try { localStorage.setItem(CLE_ACCES, String(v)); return true } catch { return false }
}
export function oublierCle() {
  try { localStorage.removeItem(CLE_ACCES); return true } catch { return false }
}

/* ───────────────────────────────────── LE JETON DU JOURNAL (côté serveur) */

export function lireJeton() {
  try { return localStorage.getItem(CLE_JETON) || '' } catch { return '' }
}
export function ecrireJeton(v) {
  try {
    if (v) localStorage.setItem(CLE_JETON, String(v))
    else localStorage.removeItem(CLE_JETON)
    return true
  } catch { return false }
}

/* ─────────────────────────────────────────────────── LES VISITES (serveur)
 *
 *  La page ne peut PAS lire l'IP d'un visiteur — et c'est tant mieux. C'est
 *  `/api/visite` qui l'écrit côté serveur (en-tête `x-forwarded-for`) ; ici on
 *  ne fait que DEMANDER le journal, avec le jeton.                            */
export async function lireVisites(jeton) {
  const q = jeton ? '?jeton=' + encodeURIComponent(jeton) : ''
  const r = await fetch('/api/visiteurs' + q, { headers: { Accept: 'application/json' } })
  let j = null
  try { j = await r.json() } catch { /* réponse non JSON (page HTML) : on la signale plus bas */ }
  if (r.status === 403) throw new Error((j && j.erreur) || 'journal fermé — jeton manquant ou invalide')
  if (!r.ok || !j) throw new Error('journal illisible (HTTP ' + r.status + ')')
  return j
}

/** Envoie une visite de TEST (pour vérifier que la chaîne écrit bien). */
export async function visiteDeTest(chemin = '/admin') {
  const r = await fetch('/api/visite?p=' + encodeURIComponent(chemin) + '&test=1', { method: 'POST' })
  return r.status === 204 || r.ok
}

/* ──────────────────────────────────────────── IMPORT / EXPORT DE FICHIERS */

/** Télécharge un objet en JSON (le navigateur fait le reste). */
export function telechargerJson(nom, objet) {
  const blob = new Blob([JSON.stringify(objet, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nom
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

/** Lit un fichier choisi par l'utilisateur, et rend l'objet JSON. */
export function lireFichierJson(fichier) {
  return new Promise((ok, ko) => {
    const fr = new FileReader()
    fr.onerror = () => ko(new Error('lecture impossible'))
    fr.onload = () => {
      try { ok(JSON.parse(String(fr.result))) } catch (e) { ko(new Error('ce n\'est pas du JSON')) }
    }
    fr.readAsText(fichier)
  })
}

/** Le paquet complet : ce qu'on pose dans data/ le jour du login. */
export function paquetComptes() {
  return {
    genereLe: new Date().toISOString(),
    pages: PAGES.map((p) => ({ cle: p.cle, nom: p.nom, route: p.route, bandeau: p.bandeau })),
    reglages: lireReglages(),
    comptes: lireComptes(),
  }
}

/* ──────────────────────────────────────────────────── LECTURE D'UN VISITEUR */

/** « Chrome · Bureau », « Safari · Mobile »… — l'essentiel, en trois mots. */
export function appareil(ua = '') {
  const u = String(ua)
  const nav = /Edg\//.test(u) ? 'Edge'
    : /OPR\/|Opera/.test(u) ? 'Opera'
      : /Firefox\//.test(u) ? 'Firefox'
        : /Chrome\//.test(u) ? 'Chrome'
          : /Safari\//.test(u) ? 'Safari'
            : /curl|python|wget|bot|spider|crawler/i.test(u) ? 'robot'
              : '?'
  const type = /Mobile|Android|iPhone|iPad|iPod/i.test(u) ? (/iPad|Tablet/i.test(u) ? 'Tablette' : 'Mobile') : 'Bureau'
  return nav + ' · ' + type
}

/** Le pays en deux lettres → le drapeau (et le nom quand on le connaît). */
export function paysLisible(code) {
  if (!code) return '—'
  const c = String(code).toUpperCase()
  try {
    const drapeau = c.replace(/./g, (l) => String.fromCodePoint(127397 + l.charCodeAt(0)))
    const nom = new Intl.DisplayNames(['fr'], { type: 'region' }).of(c)
    return drapeau + ' ' + (nom || c)
  } catch { return c }
}

/** « il y a 4 min » — jamais de date brute dans une liste de visites. */
export function ilYA(iso) {
  const t = Date.parse(iso)
  if (!t) return '—'
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return 'à l\'instant'
  const m = Math.round(s / 60)
  if (m < 60) return 'il y a ' + m + ' min'
  const h = Math.round(m / 60)
  if (h < 24) return 'il y a ' + h + ' h'
  return 'il y a ' + Math.round(h / 24) + ' j'
}
