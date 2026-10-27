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
  { cle: 'lives', nom: 'Lives', route: '/lives', icone: 'bi-broadcast', bandeau: true, teinte: '#f472b6' },
  { cle: 'dna', nom: 'DNA COURSE', route: '/dna', icone: 'bi-cpu', bandeau: true, teinte: '#38bdf8' },
  { cle: 'resultats', nom: 'Résultats', route: '/resultats', icone: 'bi-list-ol', bandeau: true, teinte: '#34d399' },
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

/* ─────────────────────── LE HACHAGE — PBKDF2, LE MÊME CALCUL QUE LE SERVEUR
 *
 *  `api/admin.js` vérifie le mot de passe avec
 *      crypto.pbkdf2Sync(mdp, sel, iter, 32, 'sha256')
 *  Le navigateur calcule exactement la même chose (Web Crypto). C'est ce qui
 *  permet à la console de fabriquer `ADMIN_COMPTES` SANS qu'un mot de passe en
 *  clair ne quitte jamais la machine du propriétaire.
 *
 *  ⚠ Web Crypto n'existe qu'en contexte sûr (https, ou localhost). En clair
 *    sur une IP distante il n'y a pas de `crypto.subtle` : on le DIT, on ne
 *    fabrique pas un faux hash.                                                */
export const ITER_HACHAGE = 210000

const enHex = (octets) => Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('')
const deHex = (hex) => {
  const propre = String(hex || '').replace(/[^0-9a-f]/gi, '')
  const out = new Uint8Array(propre.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(propre.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function cryptoDisponible() {
  return !!(globalThis.crypto && globalThis.crypto.subtle && globalThis.crypto.getRandomValues)
}

/** Un sel de 16 octets, en hexadécimal. */
export function sel() {
  if (!cryptoDisponible()) throw new Error('crypto indisponible : ouvre la console en https (ou sur localhost)')
  const o = new Uint8Array(16)
  globalThis.crypto.getRandomValues(o)
  return enHex(o)
}

/** → { sel, iter, hash } — exactement les trois champs que lit le serveur. */
export async function hacher(motDePasse, selHex, iter = ITER_HACHAGE) {
  if (!cryptoDisponible()) throw new Error('crypto indisponible : ouvre la console en https (ou sur localhost)')
  const s = selHex || sel()
  const cle = await globalThis.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(String(motDePasse)), 'PBKDF2', false, ['deriveBits'],
  )
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: deHex(s), iterations: iter, hash: 'SHA-256' }, cle, 256,
  )
  return { sel: s, iter, hash: enHex(new Uint8Array(bits)) }
}

/**
 * LES COMPTES DU BROUILLON → LA LISTE que lit le serveur.
 *
 * Ne partent au serveur que : le nom, les pages, l'état actif, les dates
 * d'abonnement, et le HASH. Le mot de passe en clair reste dans ce navigateur.
 */
export async function envComptesListe(liste) {
  const out = []
  for (const c of liste || []) {
    if (!c || !c.nom) continue
    if (!c.motDePasse) continue
    const h = await hacher(c.motDePasse, c.sel, Number(c.iter) || ITER_HACHAGE)
    out.push({
      nom: String(c.nom).trim(),
      sel: h.sel,
      iter: h.iter,
      hash: h.hash,
      pages: Array.isArray(c.pages) ? c.pages : [],
      actif: c.actif !== false,
      etudesFrance: c.etudesFrance !== false,
      /* ⭐ L'ABONNEMENT : deux dates, jamais devinées — vides = pas de limite. */
      debut: dateISO(c.debut),
      fin: dateISO(c.fin),
    })
  }
  return out
}

export async function envComptes(liste) {
  return JSON.stringify(await envComptesListe(liste))
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
    etudesFrance: true,
    debut: '',      /* ⭐ abonnement : vide = pas de limite */
    fin: '',
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

/* ⭐ LES COMPTES SUPPRIMÉS À LA MAIN (25/10/2026)
 *
 *  Le brouillon est FUSIONNÉ avec le serveur pour ne jamais perdre un compte
 *  (sinon `sam` s'effaçait tout seul). Mais une suppression VOLONTAIRE doit
 *  gagner : on garde donc ici les noms retirés, pour que la fusion ne les
 *  ressuscite pas. Un nom qui revient avec un mot de passe sort de cette liste.
 */
const CLE_RETIRES = 'bahja.admin.retires'
export function lireRetires() {
  const c = lire(CLE_RETIRES, [])
  return Array.isArray(c) ? c.map(String) : []
}
export function ecrireRetires(liste) {
  return ecrire(CLE_RETIRES, Array.isArray(liste) ? liste.map(String) : [])
}

/* Un compte déjà saisi AVANT l'arrivée d'une page n'a pas sa clé : on ne la
 * lui donne pas d'office (un droit ne s'invente pas), on signale juste. */
export function droitsInconnus(compte) {
  return (compte.pages || []).filter((p) => !PAGE_PAR_CLE[p])
}

/* ═══════════════════════════════════════════════ L'ABONNEMENT (25/10/2026) ══
 *
 *  ⭐ Demande de l'utilisateur : « بداية ونهاية اي يوزر اشتراك » — chaque
 *  compte porte une DATE DE DÉBUT et une DATE DE FIN d'abonnement.
 *
 *  RÈGLES (et pourquoi)
 *   ① DEUX DATES seulement, au format `AAAA-MM-JJ` — le même que l'attribut
 *     `type="date"` du navigateur. Rien d'autre n'est stocké.
 *   ② VIDE = PAS DE LIMITE. Un compte sans dates ne casse jamais : c'est le
 *     cas de tous les comptes créés avant aujourd'hui, et du compte unique.
 *   ③ LA FIN EST INCLUSE : `fin = 2026-11-30` → valable jusqu'au 30 à
 *      minuit (23:59:59.999). Le dernier jour compte, on ne coupe pas la
 *      veille au soir.
 *   ④ TOUT EST EN GMT (règle §26 du projet) : `aujourdhuiGMT()` compare des
 *      jours GMT, jamais l'heure locale de l'appareil.
 *   ⑤ Le calcul du « combien de jours il reste » est ARRONDI AU SUPÉRIEUR :
 *      « il reste 1 jour » veut dire « aujourd'hui est le dernier jour ».
 * ══════════════════════════════════════════════════════════════════════════ */

export const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Une date valide, ou '' — jamais une date inventée. */
export function dateISO(valeur) {
  const s = String(valeur || '').trim()
  if (!DATE_ISO.test(s)) return ''
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10) === s ? s : ''
}

/** Le jour courant en GMT : 'AAAA-MM-JJ'. */
export function aujourdhuiGMT(maintenant = Date.now()) {
  return new Date(maintenant).toISOString().slice(0, 10)
}

/** Les jours qui restent (fin incluse) — `null` s'il n'y a pas de fin. */
export function joursRestants(fin, maintenant = Date.now()) {
  const f = dateISO(fin)
  if (!f) return null
  const finMs = Date.parse(f + 'T23:59:59.999Z')
  const reste = Math.ceil((finMs - maintenant) / 86400000)
  return reste > 0 ? reste : 0
}

/**
 * L'état d'un abonnement, en un objet — le même calcul que le serveur.
 *   illimite  aucune date
 *   a-venir   la date de début est dans le futur
 *   en-cours  on est entre les deux
 *   expire    la date de fin est passée
 */
export function etatAbonnement(compte, maintenant = Date.now()) {
  const debut = dateISO(compte && compte.debut)
  const fin = dateISO(compte && compte.fin)
  const jours = joursRestants(fin, maintenant)
  if (!debut && !fin) return { etat: 'illimite', debut: '', fin: '', jours: null }
  const jour = aujourdhuiGMT(maintenant)
  if (debut && jour < debut) return { etat: 'a-venir', debut, fin, jours }
  if (fin && jour > fin) return { etat: 'expire', debut, fin, jours: 0 }
  return { etat: 'en-cours', debut, fin, jours }
}

/** '2026-11-30' → '30/11/2026' (et '—' si vide). */
export function dateLisible(iso) {
  const d = dateISO(iso)
  if (!d) return '—'
  const [a, m, j] = d.split('-')
  return `${j}/${m}/${a}`
}

/** Une phrase courte, pour une pastille : « illimité », « 12 j restants »… */
export function abonnementCourt(compte, maintenant = Date.now()) {
  const a = etatAbonnement(compte, maintenant)
  if (a.etat === 'illimite') return 'illimité'
  if (a.etat === 'a-venir') return 'débute le ' + dateLisible(a.debut)
  if (a.etat === 'expire') return 'expiré le ' + dateLisible(a.fin)
  if (a.jours === null) return 'depuis le ' + dateLisible(a.debut)
  if (a.jours <= 1) return 'dernier jour'
  return a.jours + ' j restants'
}

/** La date d'aujourd'hui + n jours, en 'AAAA-MM-JJ' (pour les boutons rapides). */
export function dansNJours(n, depuis = Date.now()) {
  return new Date(depuis + Number(n) * 86400000).toISOString().slice(0, 10)
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

/* ────────────────────────── LA CLÉ DE LA CONSOLE — RETIRÉE (25/10/2026)
 *
 *  ⚠ Elle ne garde plus rien : le login de `api/admin.js` a pris sa place
 *    (§25.7 d'AGENTS.md). Ces trois fonctions restent exportées parce que
 *    `CLE_ACCES` sert encore à `backend/ADMIN/visites.js` pour reconnaître un
 *    navigateur qui a déjà ouvert la console — mais la page ne les appelle
 *    plus, et `/admin?cle=…` n'existe plus.                        */

export function lireCle() {
  try { return localStorage.getItem(CLE_ACCES) || '' } catch { return '' }
}
export function ecrireCle(v) {
  try { localStorage.setItem(CLE_ACCES, String(v)); return true } catch { return false }
}
export function oublierCle() {
  try { localStorage.removeItem(CLE_ACCES); return true } catch { return false }
}

/* ────────────────────────────── LA SESSION (ce que le navigateur peut dire)
 *
 *  ⚠ Ce n'est PAS la sécurité : le cookie de session est `HttpOnly`, la page
 *    ne peut donc pas le lire — et c'est voulu. Ce drapeau local ne sert qu'à
 *    UNE chose : que le propriétaire connecté ne soit pas compté comme un
 *    visiteur dans son propre journal (voir `backend/ADMIN/visites.js`).      */
export const CLE_SESSION = 'bahja.admin.session'

export function marquerSession(nom) {
  try { localStorage.setItem(CLE_SESSION, String(nom || 'oui')); return true } catch { return false }
}
export function oublierSession() {
  try { localStorage.removeItem(CLE_SESSION); return true } catch { return false }
}
export function sessionMemorisee() {
  try { return localStorage.getItem(CLE_SESSION) || '' } catch { return '' }
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

/* ────────────────────────────────────────── LES CONNEXIONS (26/10/2026)
 *
 *  Le deuxième journal : une ligne par tentative de connexion, écrite par
 *  `api/admin.js`. Il répond à « pourquoi 0677889900 n'arrive pas à entrer ? »
 *  — nom, heure, IP, appareil, et le verdict.
 *
 *  ⚠ Le jeton est FACULTATIF : la session de la console suffit (le serveur
 *    accepte les deux). On ne l'envoie donc que s'il est là.                */
export async function lireConnexions(jeton) {
  const q = '?journal=connexions' + (jeton ? '&jeton=' + encodeURIComponent(jeton) : '')
  const r = await fetch('/api/visiteurs' + q, { headers: { Accept: 'application/json' } })
  let j = null
  try { j = await r.json() } catch { /* idem : on le dit plus bas */ }
  if (r.status === 403) throw new Error((j && j.erreur) || 'journal fermé — connecte-toi à la console')
  if (!r.ok || !j) throw new Error('journal des connexions illisible (HTTP ' + r.status + ')')
  return j
}

/** Les battements reçus des sessions actives (IP, appareil et heure). */
export async function lireSessionsActives(jeton) {
  const q = '?journal=actifs' + (jeton ? '&jeton=' + encodeURIComponent(jeton) : '')
  const r = await fetch('/api/visiteurs' + q, { headers: { Accept: 'application/json' } })
  let j = null
  try { j = await r.json() } catch { /* réponse illisible */ }
  if (r.status === 403) throw new Error((j && j.erreur) || 'journal fermé — connecte-toi à la console')
  if (!r.ok || !j) throw new Error('journal des sessions illisible (HTTP ' + r.status + ')')
  return j
}

/** Le verdict d'une tentative, en clair : « entré », « mot de passe », … */
export function verdictConnexion(c) {
  if (!c) return '—'
  if (c.ok) return 'entré'
  return c.motif || 'refusé'
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
