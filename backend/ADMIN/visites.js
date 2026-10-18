/* ══════════════════════════════════════════════════════════════════════════
 * backend/ADMIN/visites.js — LE PING DE VISITE (une ligne, côté page)
 *
 *  À chaque chargement de page, on prévient le serveur : « quelqu'un est là,
 *  sur /presse ». Le serveur ajoute L'IP (en-tête `x-forwarded-for`) et le
 *  pays, et l'écrit dans le journal. La page ne voit jamais rien de tout ça.
 *
 *  ⚠ TROIS GARDE-FOUS :
 *    ① jamais bloquant : `keepalive`, erreurs avalées — un journal en panne
 *       ne peut pas ralentir ni casser une page ;
 *    ② le PROPRIÉTAIRE n'est pas un visiteur : si la console est déverrouillée
 *       sur ce navigateur (clé d'accès présente), on n'enregistre pas — ses
 *       propres tournées ne polluent pas les statistiques ;
 *    ③ en développement, Vercel n'est pas là : l'appel tombe en 404 sans bruit.
 * ══════════════════════════════════════════════════════════════════════════ */

import { CLE_ACCES } from './donnees.js'

/** Vrai si ce navigateur est celui du propriétaire (console ouverte). */
function estProprietaire() {
  try { return !!localStorage.getItem(CLE_ACCES) } catch { return false }
}

/**
 * Prévenir le serveur qu'une page a été vue.
 * @param {string} chemin  le chemin affiché (par défaut celui du navigateur)
 * @param {{ test?: boolean, force?: boolean }} [options]
 */
export function pointerVisite(chemin, options = {}) {
  try {
    if (!options.force && !options.test && estProprietaire()) return
    const p = String(chemin || (typeof location !== 'undefined' ? location.pathname + (location.hash || '') : '/'))
    const q = '/api/visite?p=' + encodeURIComponent(p) + (options.test ? '&test=1' : '')
    fetch(q, { method: 'POST', keepalive: true, headers: { Accept: '*/*' } }).catch(() => {})
  } catch { /* jamais bloquant */ }
}
