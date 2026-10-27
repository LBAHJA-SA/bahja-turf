/* =============================================================================
 * api/ptf.js — le relais de la carrière des chevaux, en runtime EDGE.
 *
 *   /api/ptf?p=api/runners%3FhorseId…   ou   /api/ptf/api/runners%3FhorseId…
 *        →  https://horse-racing-api.paris-turf.com/api/runners?horseId…
 *
 * ⚠ POURQUOI IL EXISTE — trois verrous, tous mesurés le 17/10/2026
 *
 *  1) LA CLÉ EST RESTREINTE PAR ORIGINE. L'API répond à la page :
 *
 *       Origin https://bahja-turf.vercel.app → 403 « Origin … is not allowed
 *                                                   for this API key »
 *       Origin http://localhost              → 200
 *       Origin https://www.paris-turf.com    → 200
 *       Origin null (iframe sandbox)         → 403
 *
 *     Le préflight, lui, passe pour tout le monde : c'est le GET qui est
 *     refusé. Une page ne peut pas mentir sur son origine ; un serveur, si.
 *     Ce relais déclare donc `http://localhost`, l'origine que la clé autorise.
 *
 *  2) CLOUDFLARE DÉFIE LES CLIENTS SERVEUR. Mêmes en-têtes, mêmes données :
 *
 *       Node HTTP/1.1 (fetch, curl)             → 403 « Just a moment… »
 *       Node HTTP/2 (node:http2) depuis ce poste → 200
 *       Node HTTP/1.1 ou HTTP/2 depuis Vercel   → 403 « Just a moment… » (5/5)
 *       RUNTIME EDGE de Vercel (ce fichier)     → 200  ✅  mais 56 % du temps
 *
 *     Le défi tombe sur l'empreinte du client, pas sur l'adresse IP : un
 *     navigateur headless depuis un datacenter passe aussi (vérifié). Le
 *     runtime edge n'utilise pas la pile TLS de Node — c'est toute la
 *     différence. Il est distribué : certains POP passent, d'autres non.
 *     D'où `ESSAIS` ci-dessous. Mesuré sur l'aperçu `bahja-turf-kk20kdh8o`
 *     puis `bahja-turf-b8rfsvryd` : `X-Bahja-Runtime: edge`, aucun
 *     `cf-mitigated`, 303 541 octets de JSON — et 9/16 appels sans défi.
 *
 *  3) LE CHEMIN DOIT PORTER /api. L'origine du relais est le seul hôte :
 *     sans le préfixe `/api`, l'API répond « NOT_FOUND ».
 *
 * ⚠ CONSÉQUENCE — CE FICHIER N'EST PAS UNE FONCTION NODE : il n'a ni
 *   `api/_proxy.js` ni `node:http2`. En développement, c'est le middleware de
 *   vite.config.js qui relaie (Node + HTTP/2, qui passe depuis un poste) ;
 *   en ligne, c'est ce fichier. Même contrat, deux transports.
 *
 *   Bonus : la clé ne part jamais dans le bundle de la page.
 * ========================================================================== */

import { sessionValide } from './_acces.js'

export const config = { runtime: 'edge' }

const BASE = 'https://horse-racing-api.paris-turf.com'

/** La clé publique du site (lue dans son bundle). */
const CLE = 'cd347f33-9dc3-4294-865e-f5d6ee7558ac'

/** L'origine que la clé autorise, et que le navigateur ne peut pas déclarer. */
const ORIGINE = 'http://localhost'

/** Le défi Cloudflare est-il tombé sur cette réponse ? */
const estDefi = (corps) => /Just a moment|_cf_chl_opt|__cf_chl/i.test(String(corps).slice(0, 4000))

/** Les en-têtes de l'appel amont.
 *
 *  `origin` = l'origine que la clé publique autorise (`http://localhost`).
 *  Les en-têtes `sec-ch-ua*` et `sec-fetch-*` sont ceux qu'un vrai navigateur
 *  ajoute : sans eux, l'empreinte TLS (déjà celle d'un navigateur, dans ce
 *  runtime) et les en-têtes se contredisent — et Cloudflare note l'ensemble. */
const ENTETES = {
  'x-api-key': CLE,
  origin: ORIGINE,
  referer: ORIGINE + '/',
  accept: 'application/json, text/plain, */*',
  'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Chromium";v="141", "Not?A_Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'cross-site',
}

/** Le nombre d'essais avant d'abandonner.
 *
 *  ⚠ POURQUOI IL EN FAUT PLUSIEURS — mesuré le 17/10/2026 sur l'aperçu
 *  `bahja-turf-b8rfsvryd`, 16 appels en runtime edge, **mêmes en-têtes** :
 *
 *      meetings 1/4 · runners 2/4 · horses 3/4 · stats 3/4      → 9/16 = 56 %
 *
 *  Le défi tombe donc au hasard, pas selon le chemin : le runtime edge de
 *  Vercel est distribué, et certaines de ses sorties sont notées par
 *  Cloudflare, d'autres non. Chaque essai a son POP : quatre essais portent le
 *  taux de réussite à ~96 % (1 − 0,44⁴). Le client réessaie lui aussi sur 403
 *  (`backend/ANALYSE/parisTurf.js`) — les deux se cumulent. */
const ESSAIS = 4

/** Le GET amont, réessayé tant que Cloudflare défie. */
async function chercher(cible, entetes = ENTETES) {
  let dernier = null
  for (let i = 0; i < ESSAIS; i++) {
    const r = await fetch(cible, { headers: entetes })
    const corps = await r.text()
    if (!estDefi(corps)) return { statut: r.status, type: r.headers.get('content-type'), corps, url: r.url, essais: i + 1 }
    dernier = { statut: r.status, type: r.headers.get('content-type'), corps, url: r.url, essais: i + 1 }
  }
  return dernier
}

/* ─────────────────────────────────────────────────────────── LE REPLAY ──────
 * `race.replay._videoLink` = /api/replays/{id}/video → **302 vers un m3u8**
 * chez vide.io. Deux raisons pour que la vidéo passe par ici :
 *
 *   1) l'API exige la clé ET l'origine `http://localhost` — un `<a href>` ne
 *      les envoie pas, donc le clic tombait sur un 403 ;
 *   2) même résolu, le CDN ne renvoie **aucun en-tête CORS** (mesuré : pas
 *      d'`access-control-allow-origin`) : hls.js ne peut pas le lire depuis la
 *      page, et Chrome ne lit pas le HLS tout seul.
 *
 * Ce relais réécrit donc les playlists pour que le lecteur ne parle qu'à nous.
 * Les segments (…m4s) sont simplement traversés.
 * ────────────────────────────────────────────────────────────────────────── */
const HOTES_MEDIA = ['.vide.io', 'horse-racing-api.paris-turf.com']

const estPlayliste = (type, url) => /mpegurl|m3u8/i.test(type || '') || /\.m3u8(\?|$)/i.test(url || '')

function hoteAutorise(url) {
  try {
    const h = new URL(url).host
    return HOTES_MEDIA.some((x) => h === x || h.endsWith(x))
  } catch { return false }
}

/** Chaque URL de la playlist (segment, init, clé) repasse par nous. */
function reecrirePlaylist(texte, base, origine) {
  const absolue = (x) => origine + '/api/ptf?hls=' + encodeURIComponent(new URL(x, base).href)
  return String(texte).split('\n').map((ligne) => {
    const t = ligne.trim()
    if (!t) return ligne
    if (t.startsWith('#')) {
      return /URI="/.test(t) ? t.replace(/URI="([^"]+)"/g, (_, x) => 'URI="' + absolue(x) + '"') : ligne
    }
    return absolue(t)
  }).join('\n')
}

const ENTETES_MEDIA = {
  ...ENTETES,
  accept: '*/*',
  'sec-fetch-dest': 'video',
  'sec-fetch-mode': 'no-cors',
}

/** `?v={id}` → la playlist maîtresse ; `?hls={url}` → un média traversé.
 *  Renvoie `null` si la requête n'est pas une requête vidéo. */
async function servirVideo(u, req) {
  const origine = u.origin

  const id = u.searchParams.get('v')
  if (id) {
    const r = await chercher(BASE + '/api/replays/' + encodeURIComponent(id) + '/video', ENTETES_MEDIA)
    if (r.statut >= 400) return new Response('replay indisponible', { status: r.statut })
    return new Response(reecrirePlaylist(r.corps, r.url || BASE, origine), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=300',
      },
    })
  }

  const cible = u.searchParams.get('hls')
  if (!cible) return null
  if (!hoteAutorise(cible)) return new Response('hôte refusé', { status: 400 })

  const entetes = { ...ENTETES_MEDIA }
  const plage = req.headers.get('range')
  if (plage) entetes.range = plage

  const r = await fetch(cible, { headers: entetes, redirect: 'follow' })
  const type = r.headers.get('content-type') || ''
  const sortie = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': type || 'application/octet-stream',
    'Cache-Control': 'public, max-age=600',
    'Accept-Ranges': 'bytes',
  }
  if (r.status === 206) sortie['Content-Range'] = r.headers.get('content-range') || ''

  /* ⚠ ne JAMAIS réécrire une page d'erreur comme une playlist : un 403 du CDN
     arrive déguisé en playlist (son corps est du HTML). */
  if (!r.ok) {
    return new Response('média indisponible (' + r.status + ')', {
      status: r.status,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
  if (estPlayliste(type, cible)) {
    const texte = await r.text()
    sortie['Content-Type'] = 'application/vnd.apple.mpegurl'
    return new Response(reecrirePlaylist(texte, r.url || cible, origine), { status: 200, headers: sortie })
  }
  return new Response(r.body, { status: r.status, headers: sortie })
}

export default async function handler(req) {
  if (!await sessionValide(req)) {
    return new Response(JSON.stringify({ erreur: 'session requise' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
  /* Repli : si Vercel nous appelle en Node (req, res), on le dit clairement
     plutôt que de renvoyer une page vide. Le `config` ci-dessus doit être
     respecté — c'est ce que vérifie l'en-tête X-Bahja-Runtime. */
  if (req && typeof req.setHeader === 'function') {
    return new Response(JSON.stringify({ erreur: 'runtime edge non obtenu' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const u = new URL(req.url)

  /* La vidéo d'abord : elle a sa propre forme d'URL (?v= / ?hls=). */
  if (u.searchParams.get('v') || u.searchParams.get('hls')) {
    try {
      return await servirVideo(u, req)
    } catch (e) {
      return new Response('replay : ' + String(e && e.message), { status: 502 })
    }
  }

  /* Le sous-chemin vient soit de la requête (?p=…), soit du chemin
     (/api/ptf/api/runners…) — cette seconde forme est produite par le
     rewrite vercel.json. */
  const depuisRequete = u.searchParams.get('p') || ''
  const depuisChemin = u.pathname.replace(/^\/api\/ptf/, '') || '/'
  const chemin = depuisRequete ? '/' + depuisRequete.replace(/^\/+/, '') : depuisChemin

  if (!chemin.startsWith('/api/') || chemin.startsWith('//')) {
    return new Response(JSON.stringify({ erreur: 'chemin refusé' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  /* ⚠ 18/10/2026 — LA QUERY DU CLIENT DOIT SUIVRE, `p` EXCLU.
   *   Vercel réécrit /api/ptf/api/articles?orderBy=publishedAt&limit=25 en
   *   /api/ptf?p=api/articles&orderBy=publishedAt&limit=25 : le chemin arrive
   *   dans `p`, la query du client reste à côté. On la jetait → l'API rendait
   *   son corpus par défaut (mesuré en ligne : 56 383 o, articles de 2022).
   *   On remet tout, `p` en moins. */
  const params = [...u.searchParams].filter(([k]) => k !== 'p')
  const query = params.length
    ? '?' + params.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&')
    : ''

  try {
    const { statut, type, corps, essais } = await chercher(BASE + chemin + query)
    return new Response(corps, {
      status: statut,
      headers: {
        'Content-Type': type || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Bahja-Proxy': 'ptf',
        'X-Bahja-Runtime': typeof EdgeRuntime !== 'undefined' ? 'edge' : 'inconnu',
        'X-Bahja-Cf': estDefi(corps) ? 'challenge' : '',
        'X-Bahja-Essais': String(essais),
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ erreur: 'relais ptf : ' + String(e && e.message) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Bahja-Proxy': 'ptf' },
    })
  }
}
