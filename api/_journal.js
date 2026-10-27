/* =============================================================================
 * api/_journal.js — LA PETITE BASE (Redis REST), PARTAGÉE (26/10/2026)
 *
 *   Trois journaux, une seule base :
 *      `visites`     qui vient, d'où, sur quelle page      (api/visite.js)
 *      `connexions`  qui se connecte, avec quel appareil   (api/admin.js)
 *
 * ⚠ SANS BASE, IL NE SE PASSE RIEN — ET C'EST VOULU. Sans
 *   `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Vercel les pose tout seul quand
 *   on relie un Redis au projet), `ecrire()` rend `false` sans rien faire et
 *   `lire()` rend `null`. Le site marche exactement comme avant.
 *
 * ⚠ UNE PANNE DE JOURNAL NE DOIT JAMAIS FAIRE TOMBER UNE PAGE : tout est
 *   avalé, l'appelant décide (une visite perdue n'est pas un incident).
 *
 *   L'IP EST UNE DONNÉE PERSONNELLE (RGPD) : plafond de 2000 lignes par
 *   journal (`LTRIM`), rien ne part ailleurs, et seul le propriétaire lit.
 * ========================================================================== */

export const base = () => String(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '')
export const jetonBase = () => String(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '')

/** La base est-elle branchée ? (sans elle, on n'écrit pas, on ne lit pas) */
export function journalConfigure() {
  return !!base() && !!jetonBase()
}

/** Le protocole REST d'Upstash : un POST, une liste de commandes. */
export async function rediser(commandes) {
  const r = await fetch(base() + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + jetonBase(), 'Content-Type': 'application/json' },
    body: JSON.stringify(commandes),
    /* ⚠ une base lente ne doit pas retenir une page : 2 s, puis on abandonne */
    signal: AbortSignal.timeout(2000),
  })
  if (!r.ok) throw new Error('base : HTTP ' + r.status)
  return r.json()
}

/** Opérations Redis simples utilisées par l'épinglage du compte à un appareil. */
export async function lireCleRedis(cle) {
  if (!journalConfigure()) throw new Error('stockage Redis non configuré')
  const r = await rediser([['GET', cle]])
  return r && r[0] ? r[0].result : null
}

export async function ecrireCleRedis(cle, valeur, options = {}) {
  if (!journalConfigure()) throw new Error('stockage Redis non configuré')
  const args = ['SET', cle, String(valeur)]
  if (options.nx) args.push('NX')
  if (Number.isInteger(options.ex) && options.ex > 0) args.push('EX', String(options.ex))
  const r = await rediser([args])
  return r && r[0] ? r[0].result : null
}

export async function supprimerCleRedis(cle) {
  if (!journalConfigure()) throw new Error('stockage Redis non configuré')
  const r = await rediser([['DEL', cle]])
  return Number(r && r[0] && r[0].result) || 0
}

/**
 * Ajoute UNE ligne en fin de journal, et coupe au plafond.
 * @returns {Promise<boolean>} true si la ligne est écrite.
 */
export async function ecrire(nom, entree, plafond = 2000) {
  if (!journalConfigure()) return false
  try {
    await rediser([
      ['RPUSH', nom, JSON.stringify(entree)],
      ['LTRIM', nom, -Math.abs(plafond), -1],
    ])
    return true
  } catch { return false }
}

/**
 * Lit un journal, LA PLUS RÉCENTE D'ABORD.
 * @returns {Promise<Array|null>} null si la base n'est pas branchée.
 */
export async function lire(nom) {
  if (!journalConfigure()) return null
  const r = await fetch(base() + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + jetonBase(), 'Content-Type': 'application/json' },
    body: JSON.stringify([['LRANGE', nom, '0', '-1']]),
    signal: AbortSignal.timeout(3000),
  })
  if (!r.ok) throw new Error('base : HTTP ' + r.status)
  const j = await r.json()
  const brut = (j && j[0] && j[0].result) || []
  return brut
    .map((s) => { try { return JSON.parse(s) } catch { return null } })
    .filter(Boolean)
    .reverse()
}

/* ─────────────────────────────────────── CE QUE LE SERVEUR SAIT D'UN APPELANT
 *
 *  Vercel pose gratuitement : `x-forwarded-for` (l'IP), `x-vercel-ip-country`
 *  (le pays), `x-vercel-ip-city` (la ville). Le navigateur, lui, envoie son
 *  `user-agent` — c'est de là que vient « Chrome · Mobile » (voir `appareil()`
 *  dans backend/ADMIN/donnees.js).
 *
 *  ⚠ LA PAGE NE VOIT JAMAIS L'IP : elle ne l'envoie pas, elle ne la reçoit
 *    pas. C'est ici, côté serveur, qu'elle est lue. Un visiteur ne peut donc
 *    pas la falsifier depuis la console du navigateur.
 */
export function contexte(req) {
  let ville = String(req.headers['x-vercel-ip-city'] || '')
  try { ville = decodeURIComponent(ville) } catch { /* ville illisible : on garde le brut */ }
  return {
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
    pays: String(req.headers['x-vercel-ip-country'] || ''),
    ville: ville.slice(0, 80),
    ua: String(req.headers['user-agent'] || '').slice(0, 220),
  }
}
