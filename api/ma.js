/* =============================================================================
 * api/ma.js — le relais de la SOREC (e-sorec.ma), en runtime EDGE.
 *
 *   /api/ma/api/meetings?date=2026-10-23
 *   /api/ma?p=api/meetings&date=2026-10-23      (la forme du rewrite vercel.json)
 *        →  https://e-sorec.ma/api/meetings?date=2026-10-23
 *
 * ⚠ POURQUOI IL EXISTE
 *   e-sorec.ma n'envoie AUCUN en-tête CORS (mesuré le 23/10/2026 : ni
 *   `Access-Control-Allow-Origin`, ni préflight). La page `/dna` ne peut donc
 *   pas lire la réunion marocaine en direct — d'où ce relais, comme `/api/eq`
 *   pour equidia.
 *
 * ⚠ POURQUOI EN RUNTIME EDGE ET PAS DANS `api/_proxy.js`
 *   La version Node (`proxy('ma')`) répondait **502 sur Vercel**, alors que le
 *   MÊME appel passait depuis le poste (48 104 o de JSON) et que le relais
 *   Node marchait encore pour lagazettedescourses (`/api/gz` → 200, vérifié
 *   dans le même run). e-sorec répond `Server: nginx` avec
 *   `Vary: Accept-Encoding, User-Agent` : il note l'empreinte du client, et
 *   celle de la pile TLS de Node depuis un datacenter ne lui plaît pas.
 *   Le runtime edge n'utilise pas cette pile — c'est exactement la leçon de
 *   `api/ptf.js` (Cloudflare défiait Node, pas l'edge).
 *
 * ⚠ CE FICHIER N'EST PAS UNE FONCTION NODE : ni `api/_proxy.js`, ni `req/res`.
 *   En développement, c'est le middleware de `vite.config.js` qui relaie
 *   (Node, qui passe depuis un poste) ; en ligne, c'est ce fichier.
 *   Même contrat, deux transports.
 * ========================================================================== */

import { sessionValide } from './_acces.js'

export const config = { runtime: 'edge' }

const BASE = 'https://e-sorec.ma'

/** Les en-têtes d'un vrai navigateur : e-sorec varie sur le User-Agent. */
const ENTETES = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  origin: BASE,
  referer: BASE + '/',
  'sec-ch-ua': '"Chromium";v="141", "Not?A_Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
}

/** Le GET amont, réessayé : le runtime edge est distribué, une sortie peut
 *  être notée et l'autre non (même mesure que `api/ptf.js`). */
async function chercher(cible) {
  let dernier = null
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(cible, { headers: ENTETES, signal: AbortSignal.timeout(9000) })
      const corps = await r.text()
      dernier = { statut: r.status, type: r.headers.get('content-type'), corps, essais: i + 1 }
      if (r.ok && corps.trim()) return dernier
    } catch (e) {
      const cause = e && e.cause ? String(e.cause.message || e.cause.code || e.cause) : ''
      dernier = {
        statut: 502,
        type: 'application/json; charset=utf-8',
        corps: JSON.stringify({ erreur: 'sorec injoignable', nom: String(e && e.name), detail: String(e && e.message), cause }),
        essais: i + 1,
      }
    }
  }
  return dernier
}

export default async function handler(req) {
  if (!await sessionValide(req)) {
    return new Response(JSON.stringify({ erreur: 'session requise' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
  /* Repli : si Vercel nous appelle en Node, on le dit clairement. */
  if (req && typeof req.setHeader === 'function') {
    return new Response(JSON.stringify({ erreur: 'runtime edge non obtenu' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const u = new URL(req.url)

  /* Le sous-chemin vient soit de la requête (?p=…), soit du chemin
     (/api/ma/api/meetings…) — cette seconde forme est produite par le
     rewrite vercel.json. */
  const depuisRequete = u.searchParams.get('p') || ''
  const depuisChemin = u.pathname.replace(/^\/api\/ma/, '') || '/'
  const chemin = depuisRequete ? '/' + depuisRequete.replace(/^\/+/, '') : depuisChemin

  if (!chemin.startsWith('/api/') || chemin.startsWith('//')) {
    return new Response(JSON.stringify({ erreur: 'chemin refusé' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  /* La query du client suit, `p` exclu (même règle qu'`api/_proxy.js`). */
  const params = [...u.searchParams].filter(([k]) => k !== 'p')
  const query = params.length
    ? '?' + params.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&')
    : ''

  try {
    const r = await chercher(BASE + chemin + query)
    if (!r) throw new Error('aucune réponse')
    return new Response(r.corps, {
      status: r.statut,
      headers: {
        'Content-Type': r.type || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Bahja-Proxy': 'ma',
        'X-Bahja-Runtime': typeof EdgeRuntime !== 'undefined' ? 'edge' : 'inconnu',
        'X-Bahja-Essais': String(r.essais),
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ erreur: 'relais sorec : ' + String(e && e.message) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Bahja-Proxy': 'ma' },
    })
  }
}
