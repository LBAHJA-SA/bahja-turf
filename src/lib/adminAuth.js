/* =============================================================================
 * src/lib/adminAuth.js — LA SESSION DE LA CONSOLE, côté page (25/10/2026)
 *
 *   Le mot de passe n'est JAMAIS vérifié ici : la page l'envoie à
 *   `/api/admin?action=login`, le serveur répond, et le navigateur reçoit un
 *   cookie `HttpOnly` qu'aucun script ne peut lire. Tout ce fichier fait donc
 *   trois choses : demander, attendre, rapporter.
 *
 *   ⚠ `credentials: 'same-origin'` n'est pas décoratif : sans lui le cookie de
 *     session ne serait ni envoyé ni posé, et `session` répondrait toujours
 *     « pas connecté ».
 * ========================================================================== */

const MESSAGE_RESEAU = 'serveur injoignable — réessaie dans un instant'

async function appel(action, options = {}) {
  const entetes = { Accept: 'application/json', ...(options.headers || {}) }
  if (options.body) entetes['Content-Type'] = 'application/json'

  let r
  try {
    r = await fetch('/api/admin?action=' + encodeURIComponent(action), {
      credentials: 'same-origin',
      ...options,
      headers: entetes,
    })
  } catch {
    return { statut: 0, erreur: MESSAGE_RESEAU }
  }

  let j = null
  try { j = await r.json() } catch { /* réponse non JSON : on la signale */ }
  if (!j) return { statut: r.status, erreur: 'réponse illisible (HTTP ' + r.status + ')' }
  return { statut: r.status, ...j }
}

/** La console est-elle armée sur ce serveur ? (les deux variables posées) */
export const etatAdmin = () => appel('etat')

/** Qui est connecté, d'après le cookie — jamais d'après le navigateur. */
export const sessionAdmin = () => appel('session')

/** Vérifie le mot de passe côté serveur et pose le cookie. */
export const connexionAdmin = (nom, motDePasse) =>
  appel('login', { method: 'POST', body: JSON.stringify({ nom, motDePasse }) })

/** Efface le cookie. */
export const deconnexionAdmin = () => appel('logout', { method: 'POST' })

/** Les comptes configurés sur le serveur (nom + pages, jamais le hash). */
export const comptesServeur = () => appel('comptes')

/** Débloque un compte et lui demande de se reconnecter sur son nouvel appareil. */
export const reinitialiserAppareilServeur = (nom) =>
  appel('appareil', { method: 'POST', body: JSON.stringify({ nom }) })

/** Enregistre les comptes chiffrés sur Vercel et lance le redéploiement. */
export const sauvegarderComptesServeur = (valeur) =>
  appel('comptes', { method: 'POST', body: JSON.stringify({ valeur }) })
