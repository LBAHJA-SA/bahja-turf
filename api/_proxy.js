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
 *   Les trois points d'entrée : /api/pt  /api/tf  /api/eq
 * ========================================================================== */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/** Les 3 cibles — declaration UNIQUE (vite.config.js en reprend les memes). */
export const ORIGINES = {
  pt: 'https://www.pronostics-turf.info',   // la Synthese de la presse
  tf: 'https://www.turf-france.com',         // reu.php, tqqjour.php
  eq: 'https://www.equidia.fr',              // le marche
}

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

      const r = await fetch(cible, {
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'fr-FR,fr;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        },
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