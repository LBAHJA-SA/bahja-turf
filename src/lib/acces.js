/* =============================================================================
 * src/lib/acces.js — QUI A LE DROIT D'ENTRER (25/10/2026)
 *
 *   ⭐ Demande de l'utilisateur : « sam كايدخل لكن راه مايمكنش نذخل 0677889900
 *   لانه الصفحة مازال مفتوحة للجميع » — le login existait, mais il n'ouvrait
 *   que la console : les pages du site restaient lisibles par n'importe qui.
 *   Un abonnement qui n'ouvre rien ne sert à rien.
 *
 *   CE FICHIER NE VÉRIFIE AUCUN MOT DE PASSE. Il ne fait que deux choses :
 *     ① demander au serveur QUI est connecté (`/api/admin?action=session`) ;
 *     ② garder la réponse en mémoire pour que tous les écrans la partagent
 *        sans refaire un appel à chaque lien cliqué.
 *
 *   ⚠ LE COOKIE EST `HttpOnly` : la page ne peut ni le lire ni le fabriquer.
 *     Donc tout ce qu'on sait vient du serveur, jamais du navigateur.
 * ========================================================================== */

import { useSyncExternalStore } from 'react'
import { sessionAdmin, connexionAdmin, deconnexionAdmin } from './adminAuth.js'

/* L'état partagé. `pret: false` = on n'a pas encore demandé. */
let etat = {
  pret: false,
  connecte: false,
  configure: null,      // false = le serveur n'a pas ADMIN_COMPTES
  nom: '',
  pages: [],
  etudesFrance: true,
  abonnement: null,     // { etat: 'illimite' | 'en-cours' | 'a-venir' | 'expire', debut, fin, jours }
  erreur: '',
}

const abonnes = new Set()
let enVol = null

function poser(patch) {
  etat = { ...etat, ...patch }
  for (const f of abonnes) f()
}

export function lireAcces() {
  return etat
}

function suivre(f) {
  abonnes.add(f)
  return () => { abonnes.delete(f) }
}

/**
 * Demander au serveur qui est connecté.
 * `force` = refaire l'appel même si on a déjà une réponse (après un login).
 */
export async function rafraichirAcces(force = false) {
  if (enVol) return enVol
  if (etat.pret && !force) return etat
  enVol = (async () => {
    const r = await sessionAdmin()
    if (r && r.connecte) {
      poser({
        pret: true, connecte: true, configure: r.configure !== false,
        nom: r.nom || '', pages: r.pages || [], etudesFrance: r.etudesFrance !== false, abonnement: r.abonnement || null, erreur: '',
      })
    } else {
      poser({
        pret: true, connecte: false, nom: '', pages: [], etudesFrance: true,
        configure: r ? r.configure !== false : null,
        abonnement: (r && r.abonnement) || null,
        erreur: (r && r.erreur) || '',
      })
    }
    return etat
  })()
  try { return await enVol } finally { enVol = null }
}

/** Se connecter. → { ok: true } ou { ok: false, erreur, abonnement } */
export async function connecter(nom, motDePasse) {
  const r = await connexionAdmin(String(nom || '').trim(), motDePasse)
  if (r && r.ok) {
    poser({
      pret: true, connecte: true, configure: true,
      nom: r.nom || '', pages: r.pages || [], etudesFrance: r.etudesFrance !== false, abonnement: r.abonnement || null, erreur: '',
    })
    return { ok: true }
  }
  return {
    ok: false,
    statut: (r && r.statut) || 0,
    erreur: (r && r.erreur) || 'connexion impossible',
    abonnement: (r && r.abonnement) || null,
  }
}

/** Se déconnecter — le serveur efface le cookie, puis on vide la mémoire. */
export async function deconnecter() {
  await deconnexionAdmin()
  poser({ pret: true, connecte: false, nom: '', pages: [], etudesFrance: true, abonnement: null, erreur: '' })
}

/**
 * Le compte a-t-il le droit d'ouvrir cette page ?
 *   · `admin` dans `pages[]` = tous les droits (le propriétaire) ;
 *   · sinon il faut la clé exacte de la page (voir PAGES dans donnees.js).
 */
export function aDroit(pages, cle) {
  if (!cle) return true
  const p = Array.isArray(pages) ? pages : []
  if (p.includes('admin')) return true
  return p.includes(cle)
}

/** Le premier lien autorisé du compte — pour proposer une sortie. */
export function premierePage(pages) {
  const p = Array.isArray(pages) ? pages : []
  const ordre = [
    ['analyse', '/'], ['quinte', '/quinte'], ['presse', '/presse'],
    ['lives', '/lives'], ['dna', '/dna'], ['resultats', '/resultats'],
  ]
  const trouve = ordre.find(([cle]) => p.includes(cle) || p.includes('admin'))
  return trouve ? { cle: trouve[0], to: trouve[1] } : null
}

/* ── le hook React : l'état, et le rafraîchissement automatique ──────────── */
export function useAcces() {
  const snapshot = useSyncExternalStore(suivre, lireAcces, lireAcces)
  return snapshot
}
