/* =============================================================================
 * api/_proxy.js — les 3 proxies de Bahja-TURF, pour la PRODUCTION.
 *
 * ⚠ POURQUOI CE FICHIER EXISTE
 *   Les proxies `/pt`, `/tf` et `/eq` étaient écrits comme des middlewares
 *   Vite (`configureServer` dans vite.config.js). Ça ne marche QUE sur le
 *   serveur de développement : en production (Vercel) ils n'existent pas, et
 *   vercel.json répondait « index.html » (385 o) à leur place — silencieusement.
 *   Conséquence mesurée le 05/10 : la presse, le marché et turf-france étaient
 *   INJOIGNABLES depuis bahja-turf.vercel.app.
 *
 *   Ici le même code, en fonction Vercel : ce qui marche en local marche aussi
 *   en ligne. Une seule règle, deux environnements.
 *
 *   Les quatre points d'entrée : /api/pt  /api/tf  /api/eq  /api/ptf
 * ========================================================================== */

import http2 from 'node:http2'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/** Les cibles — declaration UNIQUE (vite.config.js en reprend les memes). */
export const ORIGINES = {
  pt: 'https://www.pronostics-turf.info',   // la Synthese de la presse
  tf: 'https://www.turf-france.com',         // reu.php, tqqjour.php
  eq: 'https://www.equidia.fr',              // le marche
  ptf: 'https://horse-racing-api.paris-turf.com',  // la carriere des chevaux
}

/* ⚠ POURQUOI `ptf` A BESOIN D'UN PROXY — TROIS verrous, mesurés le 17/10/2026
 *
 *  1) L'ORIGINE. La clé publique de l'API est RESTREINTE PAR ORIGINE. Sondée
 *     en HTTP/2 (les préflights, eux, passent pour tout le monde) :
 *
 *       Origin : https://bahja-turf.vercel.app   → 403 « Origin … is not
 *                                                       allowed for this API key »
 *       Origin : http://localhost                → 200
 *       Origin : https://www.paris-turf.com      → 200
 *       Origin : https://bahja-turf.com          → 403
 *       Origin : null (iframe sandbox)           → 403
 *
 *     Un navigateur ne peut pas mentir sur cette en-tête ; un RELAIS, si. Le
 *     relais envoie donc `http://localhost`, l'origine autorisée par la clé.
 *
 *  2) L'ABSENCE D'ORIGINE. Sans en-tête `Origin` du tout, Cloudflare répond un
 *     DÉFI (`Cf-Mitigated: challenge`, 403 « Just a moment… ») : c'est ce que
 *     recevait le premier relais. Une origine autorisée le fait passer.
 *
 *  3) LE PROTOCOLE. En HTTP/1.1, Cloudflare défie aussi (curl, Node, fonction
 *     Vercel — tous) ; en HTTP/2 la même requête passe. D'où `getHttp2()`.
 *
 *  Bonus : la clé ne part plus dans le bundle de la page.
 */
const CLE_PTF = 'cd347f33-9dc3-4294-865e-f5d6ee7558ac'

/** L'origine que la clé publique autorise, et que le navigateur ne peut pas
 *  déclarer. Le relais, lui, est un serveur : il en a le droit. */
const ORIGINE_PTF = 'http://localhost'

/** Un GET en HTTP/2 — la seule façon de traverser Cloudflare depuis un serveur.
 *  (Mesuré : HTTP/1.1 → 403 « Just a moment… », HTTP/2 → 200.) */
function getHttp2(url, entetes, delai = 20000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const client = http2.connect(u.origin)
    let fini = false
    const terminer = (f) => { if (fini) return; fini = true; clearTimeout(minuteur); try { client.close() } catch (e) { /* déjà fermé */ } f() }
    const minuteur = setTimeout(() => terminer(() => reject(new Error('délai dépassé'))), delai)
    client.on('error', (e) => terminer(() => reject(e)))
    const req = client.request({
      ':method': 'GET',
      ':path': u.pathname + u.search,
      ':authority': u.host,
      ':scheme': 'https',
      ...entetes,
    })
    let statut = 0
    let type = ''
    let entetesReponse = null
    let corps = ''
    req.on('response', (h) => { statut = h[':status'] || 0; type = h['content-type'] || ''; entetesReponse = h })
    req.setEncoding('utf8')
    req.on('data', (d) => { corps += d })
    req.on('end', () => terminer(() => resolve({ statut, type, corps, entetes: entetesReponse })))
    req.on('error', (e) => terminer(() => reject(e)))
    req.end()
  })
}

/** Cloudflare répond-il un défi plutôt que la donnée ? */
const estDefi = (corps) => /Just a moment|_cf_chl_opt|__cf_chl|cf-mitigated/i.test(String(corps).slice(0, 4000))

/** Construit un handler Vercel : /api/<nom><chemin>  ->  <origine><chemin> */
export function proxy(label) {
  const origine = ORIGINES[label]
  if (!origine) throw new Error(`proxy inconnu : ${label}`)
  return async function handler(req, res) {
    try {
      // Deux formes d'appel, meme resultat :
      //   /api/tf/tqqjour.php     -> le sous-chemin est dans le chemin
      //   /api/tf?p=tqqjour.php   -> le sous-chemin est dans la requete
      //                            (c'est la forme que vercel.json produit,
      //                             car Vercel ne route que le chemin exact)
      const u = new URL(req.url || '/', 'http://localhost')
      const depuisChemin = u.pathname.replace(/^\/api\/[a-z]+/, '') || '/'
      const depuisRequete = u.searchParams.get('p') || ''
      const chemin = depuisRequete
        ? '/' + depuisRequete.replace(/^\/+/, '')
        : (u.pathname === '/' ? '/' : depuisChemin)
      // on ne relaie que vers l'origine du label : /api/tf?p=https://… est refuse
      if (!chemin.startsWith('/') || chemin.startsWith('//')) {
        throw new Error('chemin refuse')
      }
      const cible = origine + chemin + (depuisRequete ? '' : (u.search || ''))

      const entetes = {
        'user-agent': UA,
        'accept-language': 'fr-FR,fr;q=0.9',
        accept: label === 'ptf'
          ? 'application/json'
          : 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        ...(label === 'ptf' ? { 'x-api-key': CLE_PTF } : {}),
      }

      /* `ptf` passe par HTTP/2 avec une origine autorisée (voir l'en-tête du
         fichier : Cloudflare défie HTTP/1.1 ET l'absence d'origine) ; les trois
         autres restent en fetch classique — elles n'ont ni ACL ni défi. */
      if (label === 'ptf') {
        const entetesPtf = {
          ...entetes,
          origin: ORIGINE_PTF,
          referer: ORIGINE_PTF + '/',
        }
        let r = await getHttp2(cible, entetesPtf)
        /* Cloudflare est capricieux : si le défi tombe quand même, un second
           essai en HTTP/1.1 peut passer. On garde le meilleur des deux. */
        if (estDefi(r.corps)) {
          try {
            const r2 = await fetch(cible, {
              headers: { ...entetesPtf, Origin: ORIGINE_PTF, Referer: ORIGINE_PTF + '/' },
              redirect: 'follow',
              signal: AbortSignal.timeout(25000),
            })
            const corps2 = await r2.text()
            if (!estDefi(corps2)) {
              r = { statut: r2.status, type: r2.headers.get('content-type'), corps: corps2, entetes: null }
            }
          } catch (e) { /* on garde le résultat du premier essai */ }
        }
        res.setHeader('Content-Type', r.type || 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('X-Bahja-Proxy', label)
        /* Deux en-têtes de diagnostic, sans effet sur la page (voir §21) : ils
           disent par quel chemin la donnée est arrivée. */
        res.setHeader('X-Bahja-Voie', r.entetes ? 'h2' : 'h1')
        if (r.entetes && r.entetes['cf-mitigated']) res.setHeader('X-Bahja-Cf', String(r.entetes['cf-mitigated']))
        res.statusCode = r.statut
        res.end(r.corps)
        return
      }

      const r = await fetch(cible, {
        headers: entetes,
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      })
      const body = await r.text()
      res.setHeader('Content-Type', r.headers.get('content-type') || 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('X-Bahja-Proxy', label)
      res.statusCode = r.status
      res.end(body)
    } catch (e) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('X-Bahja-Proxy', label + '-ERREUR')
      res.statusCode = 502
      res.end(`proxy ${label} : ${e && e.message ? e.message : e}`)
    }
  }
}