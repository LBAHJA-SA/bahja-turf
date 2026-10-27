/* =============================================================================
 * api/admin.js — LE LOGIN DE LA CONSOLE (25/10/2026)
 *
 *   POST /api/admin?action=login     { nom, motDePasse }  → cookie de session
 *   GET  /api/admin?action=session                        → qui est connecté
 *   POST /api/admin?action=logout                         → efface le cookie
 *   GET  /api/admin?action=etat                           → la console est-elle armée ?
 *   GET  /api/admin?action=comptes                       → noms + pages (session)
 *
 * ⭐ POURQUOI CE FICHIER EXISTE
 *   Jusqu'au 25/10/2026, `/admin` s'ouvrait avec une « clé » gardée dans le
 *   navigateur (`?cle=…`) : c'était de la DISCRÉTION, pas un login. Ici le mot
 *   de passe est vérifié PAR LE SERVEUR, et la session est un cookie signé que
 *   la page ne peut ni lire ni fabriquer.
 *
 * ⚠ LES COMPTES NE SONT PLUS DANS LE NAVIGATEUR
 *   Ils viennent de la variable d'environnement `ADMIN_COMPTES` (Vercel →
 *   Settings → Environment Variables) : un tableau JSON
 *
 *       [{ "nom": "sam", "sel": "…", "iter": 210000, "hash": "…",
 *          "pages": ["analyse","quinte"], "actif": true,
 *          "debut": "2026-10-25", "fin": "2027-10-25" }]
 *
 *   `hash` = PBKDF2-SHA256(motDePasse, sel, iter, 32 octets) en hexadécimal.
 *   La console `/admin` fabrique cette valeur puis peut la sauvegarder via
 *   l'API Vercel et déclencher un redéploiement.
 *
 *   ⭐ `debut` / `fin` = L'ABONNEMENT (25/10/2026) : deux dates `AAAA-MM-JJ`.
 *   Fin INCLUSE, comparaison en jours GMT. Vides → pas de limite. Fin passée
 *   → `login` répond 403 et une session en cours est fermée.
 *
 *   `ADMIN_SECRET` signe les cookies (HMAC-SHA256). Les deux variables absentes
 *   → la route répond `{ configure: false }` et la page explique quoi poser.
 *   Rien n'est cassé, rien n'est ouvert.
 *
 * ⚠ CE QUE ÇA NE FAIT PAS
 *   Les pages, données et API du site exigent une session valide. Les droits
 *   `pages[]` déterminent aussi les pages disponibles pour chaque compte.
 *
 * ⭐ 26/10/2026 — LA SESSION N'EST PLUS LUE SEULEMENT PAR CE FICHIER.
 *   Les constantes et les calculs (cookie, PBKDF2, HMAC) vivent désormais dans
 *   `api/_session.js` : `api/visite.js` s'en sert pour écrire « qui » dans le
 *   journal des visites, et `api/visiteurs.js` / `api/connexions.js` pour
 *   laisser entrer le propriétaire. Et chaque tentative de connexion — réussie
 *   ou refusée — laisse une ligne dans `connexions` (§25.12).
 * ========================================================================== */

import {
  COOKIE, DEVICE_COOKIE, DUREE, secret, comptes, fabriquer, lireJeton, cookies, verifier,
} from './_session.js'
import { ecrire, contexte } from './_journal.js'
import { sessionValide, adminValide } from './_acces.js'
import { lireEtatAppareil, enregistrerAppareil, reinitialiserAppareil } from './_device.js'
import crypto from 'node:crypto'

const VERCEL_TEAM_ID = 'team_hNLmwUkmGtwVFYfSED5UMvpr'
const VERCEL_PROJECT_ID = 'prj_FZFNbBzmLKfzQeAfNa6SNjXt3q2q'
const PAGES_AUTORISEES = new Set(['analyse', 'quinte', 'presse', 'lives', 'dna', 'resultats', 'article', 'admin'])

async function appelVercel(path, options = {}) {
  const token = String(process.env.VERCEL_TOKEN || '').trim()
  if (!token) throw new Error('configuration requise : ajoute VERCEL_TOKEN aux variables Vercel, puis redéploie une fois')
  const r = await fetch('https://api.vercel.com' + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(8000),
  })
  let j = null
  try { j = await r.json() } catch { /* réponse illisible */ }
  if (!r.ok) {
    // Vercel renvoie la cause exacte dans `error.message`. Ne jamais inclure
    // la requête (elle contient ADMIN_COMPTES) ni le jeton dans le message.
    const cause = String(j && j.error && j.error.message || j && j.message || '').trim()
    throw new Error('Vercel a refusé l’opération (HTTP ' + r.status + ')' + (cause ? ' : ' + cause : ''))
  }
  return j || {}
}

function comptesValides(valeur) {
  if (typeof valeur !== 'string' || valeur.length > 60000) throw new Error('liste de comptes trop longue ou illisible')
  let liste
  try { liste = JSON.parse(valeur) } catch { throw new Error('liste de comptes JSON invalide') }
  if (!Array.isArray(liste) || !liste.length) throw new Error('il faut conserver au moins un compte')
  const noms = new Set()
  const propres = liste.map((c) => {
    const nom = String(c && c.nom || '').trim()
    const cle = nom.toLowerCase()
    if (!nom || nom.length > 60 || noms.has(cle)) throw new Error('nom de compte vide, trop long ou en double')
    noms.add(cle)
    if (!/^[0-9a-f]{32}$/i.test(String(c.sel || '')) || !/^[0-9a-f]{64}$/i.test(String(c.hash || ''))) {
      throw new Error('un mot de passe n’a pas été haché correctement')
    }
    const iter = Number(c.iter) || 210000
    if (!Number.isInteger(iter) || iter < 10000 || iter > 1000000) throw new Error('paramètres de hachage invalides')
    const pages = Array.isArray(c.pages) ? c.pages : []
    if (pages.some((p) => !PAGES_AUTORISEES.has(p))) throw new Error('un compte contient une page inconnue')
    const debutBrut = String(c.debut || '').trim(), finBrut = String(c.fin || '').trim()
    const debut = dateISO(debutBrut), fin = dateISO(finBrut)
    if ((debutBrut && !debut) || (finBrut && !fin)) throw new Error('une date d’abonnement est invalide')
    return {
      nom, sel: c.sel, iter, hash: c.hash,
      pages: [...new Set(pages)],
      actif: c.actif !== false,
      etudesFrance: c.etudesFrance !== false,
      debut, fin,
    }
  })
  if (!propres.some((c) => c.actif && c.pages.includes('admin'))) {
    throw new Error('garde au moins un compte actif avec le droit Administration')
  }
  return JSON.stringify(propres)
}

async function enregistrerComptesVercel(valeur) {
  let envSaved = false
  try {
  const team = '?teamId=' + encodeURIComponent(VERCEL_TEAM_ID)
  const teamParam = '&teamId=' + encodeURIComponent(VERCEL_TEAM_ID)
  const project = '/v10/projects/' + encodeURIComponent(VERCEL_PROJECT_ID) + '/env'
  const variables = await appelVercel(project + team)
  const envs = Array.isArray(variables.envs) ? variables.envs : []
  const cibles = ['production', 'preview', 'development']
  const misesAJour = cibles.map((cible) => {
    const env = envs.find((item) => item && item.key === 'ADMIN_COMPTES' &&
      Array.isArray(item.target) && item.target.includes(cible))
    return env && env.id ? { cible, id: env.id } : null
  })
  if (misesAJour.some((env) => !env)) {
    throw new Error('Vercel doit contenir une variable ADMIN_COMPTES distincte pour Production, Preview et Development')
  }
  // Chaque environnement a déjà son propre type (Secret/sensitive pour
  // Production et Preview, encrypted pour Development). Modifier par ID
  // préserve ce type et évite le rejet HTTP 400 du POST groupé.
  for (const env of misesAJour) {
    await appelVercel(
      '/v9/projects/' + encodeURIComponent(VERCEL_PROJECT_ID) + '/env/' + encodeURIComponent(env.id) + team,
      { method: 'PATCH', body: JSON.stringify({ value: valeur }) },
    )
  }
  envSaved = true

  const deploys = await appelVercel(
    '/v7/deployments?projectId=' + encodeURIComponent(VERCEL_PROJECT_ID) +
      '&target=production&state=READY&limit=10' + teamParam,
  )
  const dernier = (deploys.deployments || []).find((d) => d && (d.uid || d.id))
  if (!dernier) throw new Error('aucun déploiement de production prêt à relancer n’a été trouvé')
  // Vercel documents `forceNew` as numeric `1` (boolean `true` is rejected).
  const deployment = await appelVercel('/v13/deployments?forceNew=1' + teamParam, {
    method: 'POST', body: JSON.stringify({ deploymentId: dernier.uid || dernier.id }),
  })
  return {
    id: deployment.id || deployment.uid || '',
    url: deployment.url || '',
    etat: deployment.readyState || deployment.state || 'QUEUED',
  }
  } catch (e) {
    if (envSaved) e.enregistre = true
    throw e
  }
}

/* ── L'ABONNEMENT — le même calcul que `backend/ADMIN/donnees.js` ──────────
 *
 *  Chaque compte peut porter `debut` et `fin` (AAAA-MM-JJ). Le serveur refuse
 *  la connexion quand la fin est passée, et ferme une session en cours qui
 *  dépasse la fin (un cookie de 12 h ne doit pas survivre à l'abonnement).
 *
 *  ⚠ VIDE = PAS DE LIMITE : un compte sans dates entre comme avant. C'est ce
 *    qui permet d'ajouter le champ sans casser le compte existant.
 *  ⚠ LA FIN EST INCLUSE, et tout est comparé en jours GMT (§26 du projet).   */
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/
const dateISO = (v) => {
  const s = String(v || '').trim()
  if (!DATE_ISO.test(s)) return ''
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10) === s ? s : ''
}

function abonnement(compte, maintenant = Date.now()) {
  const debut = dateISO(compte && compte.debut)
  const fin = dateISO(compte && compte.fin)
  if (!debut && !fin) return { etat: 'illimite', debut: '', fin: '', jours: null }
  const jour = new Date(maintenant).toISOString().slice(0, 10)
  const reste = fin ? Math.max(0, Math.ceil((Date.parse(fin + 'T23:59:59.999Z') - maintenant) / 86400000)) : null
  if (debut && jour < debut) return { etat: 'a-venir', debut, fin, jours: reste }
  if (fin && jour > fin) return { etat: 'expire', debut, fin, jours: 0 }
  return { etat: 'en-cours', debut, fin, jours: reste }
}

/** '2026-11-30' → '30/11/2026'. */
const dateFr = (iso) => {
  const d = dateISO(iso)
  return d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '—'
}

/* Un ralentisseur très simple : 8 échecs en 10 min par IP → 429.
 * Ce n'est pas un vrai anti-bruteforce (les instances Vercel sont éphémères) :
 * c'est juste de quoi rendre l'essai en boucle inutilement lent. */
const echecs = new Map()

function tropDessais(ip) {
  const m = echecs.get(ip)
  if (!m) return false
  if (Date.now() - m.t > 10 * 60000) { echecs.delete(ip); return false }
  return m.n >= 8
}
function noterEchec(ip) {
  const m = echecs.get(ip)
  if (!m || Date.now() - m.t > 10 * 60000) echecs.set(ip, { n: 1, t: Date.now() })
  else m.n++
}

/* ── LE JOURNAL DES CONNEXIONS (26/10/2026) ──────────────────────────────────
 *
 *  Une ligne par TENTATIVE, réussie ou non. C'est ce qui répond à « pourquoi
 *  0677889900 n'arrive pas à entrer ? » : on voit le nom, l'heure, l'IP,
 *  l'appareil — et le verdict.
 *
 *  ⚠ JAMAIS LE MOT DE PASSE, ni en clair ni haché : `motDePasse` n'entre
 *    jamais dans cette fonction, seulement le nom et le résultat.
 *  ⚠ JAMAIS BLOQUANT : `ecrire()` avale ses erreurs et abandonne au bout de
 *    2 s (voir api/_journal.js). Un journal en panne ne peut pas empêcher
 *    quelqu'un de se connecter.
 */
async function noterConnexion(req, entree) {
  const ctx = contexte(req)
  await ecrire('connexions', {
    t: new Date().toISOString(),
    nom: String(entree.nom || '').slice(0, 60),
    ip: ctx.ip,
    ua: ctx.ua,
    pays: ctx.pays,
    ville: ctx.ville,
    ok: !!entree.ok,
    motif: entree.motif || '',
  }, 1000)
}

async function noterSessionActive(req, nom) {
  const ctx = contexte(req)
  await ecrire('actifs', {
    t: new Date().toISOString(), nom: String(nom || '').slice(0, 60),
    ip: ctx.ip, ua: ctx.ua, pays: ctx.pays, ville: ctx.ville,
  }, 2000)
}

function poserCookieAppareil(req, res, valeur) {
  const https = String(req.headers['x-forwarded-proto'] || '').includes('https') || !!process.env.VERCEL
  const morceaux = [DEVICE_COOKIE + '=' + encodeURIComponent(valeur), 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=' + (365 * 24 * 3600)]
  if (https) morceaux.push('Secure')
  res.setHeader('Set-Cookie', [COOKIE + '=' + (cookies(req)[COOKIE] || '') + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + DUREE, morceaux.join('; ')])
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  const action = String((req.query && req.query.action) || '').trim()
  const arme = !!secret() && comptes().length > 0
  const ip = contexte(req).ip || '?'

  /* ── l'état : la page sait tout de suite si le login est armé ───────────── */
  if (!action || action === 'etat') {
    res.status(200).json({
      configure: arme,
      secret: !!secret(),
      comptes: comptes().length,
      login: arme,
      automatisation: !!String(process.env.VERCEL_TOKEN || '').trim(),
    })
    return
  }

  /* ── qui est connecté ───────────────────────────────────────────────────── */
  if (action === 'session') {
    const j = lireJeton(cookies(req)[COOKIE])
    if (!j) { res.status(200).json({ connecte: false, configure: arme }); return }
    const compte = comptes().find((c) => c.nom === j.n)
    if (!compte || compte.actif === false) {
      res.status(200).json({ connecte: false, configure: arme, suspendu: !!compte })
      return
    }
    /* ⭐ L'abonnement est revérifié à CHAQUE session : un cookie de 12 h ne
     * doit pas faire survivre un abonnement qui s'est terminé entre-temps. */
    const ab = abonnement(compte)
    if (ab.etat === 'expire' || ab.etat === 'a-venir') {
      res.status(200).json({ connecte: false, configure: arme, abonnement: ab })
      return
    }
    const deviceCookie = cookies(req)[DEVICE_COOKIE]
    if (!deviceCookie && await lireEtatAppareil(compte.nom)) {
      res.status(200).json({ connecte: false, configure: arme, appareilConnexionRequise: true })
      return
    }
    const deviceId = deviceCookie || crypto.randomBytes(32).toString('base64url')
    try {
      const lie = await enregistrerAppareil(compte.nom, deviceId)
      if (!lie.ok) {
        res.status(200).json({ connecte: false, configure: arme, appareilBloque: true })
        return
      }
      if (!cookies(req)[DEVICE_COOKIE]) poserCookieAppareil(req, res, deviceId)
    } catch {
      res.status(503).json({ connecte: false, configure: arme, erreur: 'Vérification de l’appareil indisponible' })
      return
    }
    await noterSessionActive(req, compte.nom)
    res.status(200).json({
      connecte: true, nom: j.n, pages: j.p || [], etudesFrance: compte.etudesFrance !== false, configure: arme, abonnement: ab,
      connexion: contexte(req),
    })
    return
  }

  /* ── se connecter ───────────────────────────────────────────────────────── */
  if (action === 'login') {
    if (req.method !== 'POST') { res.status(405).json({ erreur: 'POST attendu' }); return }
    if (!arme) {
      res.status(503).json({
        erreur: 'login non armé : ADMIN_COMPTES et ADMIN_SECRET ne sont pas posés sur le serveur',
        configure: false,
      })
      return
    }
    if (tropDessais(ip)) {
      res.status(429).json({ erreur: 'trop d\'essais — réessaie dans quelques minutes' })
      return
    }

    let corps = req.body
    if (typeof corps === 'string') { try { corps = JSON.parse(corps) } catch { corps = {} } }
    corps = corps || {}

    const nom = String(corps.nom || '').trim()
    const mdp = String(corps.motDePasse || '')

    const liste = comptes().filter((c) => c.actif !== false)
    const essais = nom
      ? liste.filter((c) => String(c.nom).toLowerCase() === nom.toLowerCase())
      : liste   /* sans nom : on essaie le compte unique (ou tous, cas rare) */

    let bon = null
    for (const c of essais) if (verifier(c, mdp)) { bon = c; break }

    if (!bon) {
      noterEchec(ip)
      /* le journal dit « ce nom n'existe pas » ou « le mot de passe est faux » :
       * c'est la différence entre un compte oublié et un mot de passe oublié. */
      await noterConnexion(req, {
        nom,
        ok: false,
        motif: essais.length ? 'mot de passe' : 'inconnu',
      })
      await new Promise((r) => setTimeout(r, 400))
      res.status(401).json({ erreur: 'nom ou mot de passe incorrect' })
      return
    }

    /* ⭐ L'ABONNEMENT : le mot de passe est bon, mais le compte n'est pas
     * (ou plus) couvert par une période valable. On refuse AVANT de poser le
     * cookie — sinon la session existerait quand même. Le mot de passe n'est
     * pas en cause : on ne compte donc pas d'échec (pas de 429 injuste). */
    const ab = abonnement(bon)
    if (ab.etat === 'expire') {
      await noterConnexion(req, { nom: bon.nom, ok: false, motif: 'abonnement expiré' })
      res.status(403).json({
        erreur: 'abonnement expiré le ' + dateFr(ab.fin) + ' — contacte l’administrateur',
        abonnement: ab,
      })
      return
    }
    if (ab.etat === 'a-venir') {
      await noterConnexion(req, { nom: bon.nom, ok: false, motif: 'abonnement pas commencé' })
      res.status(403).json({
        erreur: 'abonnement pas encore commencé (début le ' + dateFr(ab.debut) + ')',
        abonnement: ab,
      })
      return
    }

    const deviceId = cookies(req)[DEVICE_COOKIE] || crypto.randomBytes(32).toString('base64url')
    try {
      const lie = await enregistrerAppareil(bon.nom, deviceId)
      if (!lie.ok) {
        await noterConnexion(req, { nom: bon.nom, ok: false, motif: 'appareil différent — compte bloqué' })
        res.status(403).json({ erreur: 'Compte bloqué : connexion depuis un autre appareil. Contactez l’administrateur.', appareilBloque: true })
        return
      }
    } catch {
      res.status(503).json({ erreur: 'Vérification de l’appareil indisponible, réessayez plus tard' })
      return
    }

    const https = String(req.headers['x-forwarded-proto'] || '').includes('https') || !!process.env.VERCEL
    const deviceCookie = [DEVICE_COOKIE + '=' + encodeURIComponent(deviceId), 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=' + (365 * 24 * 3600)]
    if (https) deviceCookie.push('Secure')
    res.setHeader('Set-Cookie', [COOKIE + '=' + fabriquer(bon) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + DUREE + (https ? '; Secure' : ''), deviceCookie.join('; ')])
    await noterSessionActive(req, bon.nom)
    await noterConnexion(req, { nom: bon.nom, ok: true, motif: '' })
    res.status(200).json({
      ok: true, nom: bon.nom, pages: bon.pages || [], etudesFrance: bon.etudesFrance !== false, abonnement: ab,
      connexion: contexte(req),
    })
    return
  }

  /* ── se déconnecter ─────────────────────────────────────────────────────── */
  if (action === 'logout') {
    res.setHeader('Set-Cookie', COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
    res.status(200).json({ ok: true })
    return
  }

  /* ── la liste des comptes ───────────────────────────────────────────────── */
  /*  ⭐ 25/10/2026 — `sel` / `iter` / `hash` SONT renvoyés, et c'est voulu :
   *  sans eux la console ne peut pas reconstruire `ADMIN_COMPTES` quand un
   *  compte du brouillon n'a pas de mot de passe, et elle produisait une
   *  ligne SANS hash → le compte ne pouvait plus se connecter.
   *
   *  Ce n'est pas une fuite nouvelle : la console affiche déjà la valeur
   *  complète (hashes compris) pour que l'administrateur la colle sur Vercel.
   *  La session est `HttpOnly`, signée, et revérifiée à chaque appel. */
  if (action === 'comptes') {
    const session = await sessionValide(req)
    if (!session) { res.status(401).json({ erreur: 'session requise' }); return }
    if (!adminValide(session)) { res.status(403).json({ erreur: 'accès administrateur requis' }); return }

    if (req.method === 'POST') {
      let corps = req.body
      if (typeof corps === 'string') { try { corps = JSON.parse(corps) } catch { corps = {} } }
      try {
        const valeur = comptesValides(corps && corps.valeur)
        const deploiement = await enregistrerComptesVercel(valeur)
        res.status(200).json({ ok: true, enregistre: true, deploiement })
      } catch (e) {
        const configure = String(process.env.VERCEL_TOKEN || '').trim()
        const enregistre = !!(e && e.enregistre)
        res.status(configure ? 502 : 503).json({
          erreur: String((e && e.message) || 'enregistrement impossible'),
          enregistre,
        })
      }
      return
    }
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET, POST'); res.status(405).json({ erreur: 'GET ou POST attendu' }); return }
    res.status(200).json({
      comptes: await Promise.all(comptes().map(async (c) => ({
        nom: c.nom,
        sel: c.sel,
        iter: Number(c.iter) || 210000,
        hash: c.hash,
        pages: Array.isArray(c.pages) ? c.pages : [],
        actif: c.actif !== false,
        etudesFrance: c.etudesFrance !== false,
        /* ⭐ l'abonnement : les dates + l'état calculé par le serveur */
        debut: dateISO(c.debut),
        fin: dateISO(c.fin),
        abonnement: abonnement(c),
        appareilBloque: !!(await lireEtatAppareil(c.nom))?.bloque,
      }))),
    })
    return
  }

  if (action === 'appareil') {
    const session = await sessionValide(req)
    if (!session) { res.status(401).json({ erreur: 'session requise' }); return }
    if (!adminValide(session)) { res.status(403).json({ erreur: 'accès administrateur requis' }); return }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ erreur: 'POST attendu' }); return }
    let corps = req.body
    if (typeof corps === 'string') { try { corps = JSON.parse(corps) } catch { corps = {} } }
    const nom = String(corps?.nom || '').trim()
    const compte = comptes().find((c) => String(c.nom).toLowerCase() === nom.toLowerCase())
    if (!compte) { res.status(404).json({ erreur: 'compte introuvable' }); return }
    try {
      await reinitialiserAppareil(compte.nom)
      res.status(200).json({ ok: true })
    } catch { res.status(503).json({ erreur: 'réinitialisation impossible, vérifiez Redis' }) }
    return
  }

  res.status(400).json({ erreur: 'action inconnue : ' + action })
}
