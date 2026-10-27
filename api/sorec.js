/* =============================================================================
 * api/sorec.js — LE DIRECT DE LA SOREC (les courses du Maroc), runtime NODE.
 *
 *   GET /api/sorec?flux=auto    → la playlist du direct        (OutStream1)
 *   GET /api/sorec?flux=dvr     → la même, en « retour sur image » (?DVR)
 *   GET /api/sorec?flux=cotes   → les côtes et rapports        (myStream_2)
 *   GET /api/sorec?hls=<url>    → un média traversé (playlist, .ts)
 *
 * ⚠ POURQUOI CE RELAIS EXISTE — deux verrous, mesurés le 23/10/2026
 *
 *  1) LE CERTIFICAT HTTPS A EXPIRÉ. Le site de la SOREC présente un certificat
 *     Let's Encrypt valable du 24/06/2025 au 22/09/2025 : tout navigateur
 *     refuse la connexion (« votre connexion n'est pas privée »). Le flux
 *     n'existe donc qu'en **http** — et une page servie en **https** (celle de
 *     Vercel) ne peut pas lire un média http : le navigateur bloque le contenu
 *     mixte. On relaie, et c'est notre origine (https) qui parle.
 *
 *  2) LE FLUX N'EST PAS GÉOBLOQUÉ, lui : la playlist et les segments répondent
 *     depuis ce poste comme depuis un serveur. Aucun en-tête particulier n'est
 *     demandé — on en met quand même un de navigateur, par prudence.
 *
 *  ⚠ RUNTIME NODE, PAS EDGE. Mesuré le 23/10/2026 : en edge, `fetch` vers une
 *    URL **http://** échoue (« internal error »), donc 502 sur les trois flux.
 *    En Node, la même requête passe. C'est l'inverse d'`api/ptf.js`, où
 *    Cloudflare impose l'edge : ici il n'y a pas de Cloudflare, juste un
 *    serveur Wowza en clair.
 *
 *  La playlist maîtresse renvoie une variante (`chunklist_w….m3u8`) puis des
 *  segments (`media_w…_1952.ts`, ~650 Ko). On RÉÉCRIT chaque URL pour que le
 *  lecteur ne parle qu'à nous — exactement comme `api/ptf.js` pour le replay.
 *
 *  Même contrat en développement : le middleware `/api/sorec` de
 *  vite.config.js fait le même travail.
 * ========================================================================== */

/** L'hôte du direct de la SOREC. */
const HOTE = 'sorec-streaming.archostechnology.net'
import { sessionValide } from './_acces.js'

/** ⚠ http, pas https : voir (1) ci-dessus. */
const BASE = 'http://' + HOTE

/** Les trois flux que la page de la SOREC propose elle-même. */
const FLUX = {
  auto: '/live/OutStream1/playlist.m3u8',
  dvr: '/live/OutStream1/playlist.m3u8?DVR',
  cotes: '/live/myStream_2/playlist.m3u8',
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

const ENTETES = { 'user-agent': UA, accept: '*/*', referer: BASE + '/' }

const estPlayliste = (type, url) =>
  /mpegurl|m3u8/i.test(type || '') || /\.m3u8(\?|$)/i.test(url || '')

/** On ne relaie QUE vers le direct de la SOREC (pas de proxy ouvert). */
function hoteAutorise(url) {
  try {
    const u = new URL(url)
    return u.host === HOTE && /^https?:$/.test(u.protocol)
  } catch { return false }
}

/** Chaque URL de la playlist (variante, segment, clé) repasse par nous. */
function reecrirePlaylist(texte, base, origine) {
  const absolue = (x) => origine + '/api/sorec?hls=' + encodeURIComponent(new URL(x, base).href)
  return String(texte).split('\n').map((ligne) => {
    const t = ligne.trim()
    if (!t) return ligne
    if (t.startsWith('#')) {
      return /URI="/.test(t) ? t.replace(/URI="([^"]+)"/g, (_, x) => 'URI="' + absolue(x) + '"') : ligne
    }
    return absolue(t)
  }).join('\n')
}

function texte(res, code, corps) {
  res.statusCode = code
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(corps)
}

/**
 * ?diag=1 — d'où vient un « fetch failed » ? DNS, TCP, puis la requête.
 * ⚠ Sert à prouver si la SOREC est injoignable depuis l'étranger (mesure du
 *   23/10/2026) ou si c'est notre code qui se trompe.
 */
async function diagnostic() {
  const dns = await import('node:dns')
  const net = await import('node:net')
  const out = { hote: HOTE, base: BASE }
  try {
    out.dns = (await dns.promises.lookup(HOTE, { all: true })).map((x) => x.address)
  } catch (e) { out.dns = 'ERREUR ' + e.code }
  out.tcp80 = await new Promise((ok) => {
    const s = net.connect({ host: HOTE, port: 80 })
    const fin = (v) => { try { s.destroy() } catch (e) { /* rien */ } ok(v) }
    s.setTimeout(8000, () => fin('timeout'))
    s.on('connect', () => fin('ok'))
    s.on('error', (e) => fin('erreur ' + e.code))
  })
  try {
    const r = await fetch(BASE + FLUX.auto, { headers: ENTETES })
    out.fetch = r.status
  } catch (e) {
    out.fetch = 'ERREUR ' + (e && e.message) + ' / cause : ' +
      (e && e.cause ? (e.cause.code || e.cause.message || String(e.cause)) : 'aucune')
  }
  return out
}

export default async function handler(req, res) {
  if (!await sessionValide(req)) {
    res.status(401).json({ erreur: 'session requise' })
    return
  }
  const u = new URL(req.url || '/', 'https://' + (req.headers.host || 'bahja-turf.vercel.app'))
  const origine = u.origin

  if (u.searchParams.get('diag')) {
    const d = await diagnostic()
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(d, null, 2))
    return
  }

  try {
    /* ① la playlist d'un des trois flux : c'est le point d'entrée du lecteur */
    const flux = u.searchParams.get('flux')
    if (flux) {
      const chemin = FLUX[flux]
      if (!chemin) return texte(res, 400, 'flux inconnu')
      const r = await fetch(BASE + chemin, { headers: ENTETES })
      if (!r.ok) return texte(res, 502, 'direct indisponible (' + r.status + ')')
      const corps = await r.text()
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('X-Bahja-Proxy', 'sorec')
      res.end(reecrirePlaylist(corps, BASE + chemin, origine))
      return
    }

    /* ② un média traversé (variante, segment) */
    const cible = u.searchParams.get('hls')
    if (!cible) return texte(res, 400, 'rien à relayer')
    if (!hoteAutorise(cible)) return texte(res, 400, 'hôte refusé')

    const r = await fetch(cible, { headers: ENTETES, redirect: 'follow' })
    const type = r.headers.get('content-type') || 'application/octet-stream'

    /* ⚠ ne jamais réécrire une page d'erreur comme si c'était une playlist */
    if (!r.ok) return texte(res, r.status, 'média indisponible (' + r.status + ')')

    const playlist = estPlayliste(type, cible)
    const buf = Buffer.from(await r.arrayBuffer())

    res.statusCode = 200
    res.setHeader('Content-Type', playlist ? 'application/vnd.apple.mpegurl' : type)
    res.setHeader('Cache-Control', playlist ? 'no-store' : 'public, max-age=600')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('X-Bahja-Proxy', 'sorec')
    res.end(playlist ? reecrirePlaylist(buf.toString('utf8'), r.url || cible, origine) : buf)
  } catch (e) {
    texte(res, 502, 'relais sorec : ' + String(e && e.message))
  }
}
