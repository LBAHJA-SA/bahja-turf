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
 *
 *   `/api/ptf` (la carrière des chevaux) n'est PAS ici : c'est `api/ptf.js`,
 *   en runtime EDGE. Cloudflare défie tout client Node depuis Vercel — HTTP/1.1
 *   comme HTTP/2, avec ou sans en-tête `Origin` — et ne défie pas le runtime
 *   edge. Mesuré le 17/10/2026 ; le détail est en tête de `api/ptf.js`.
 * ========================================================================== */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/** Les cibles — declaration UNIQUE (vite.config.js en reprend les memes). */
export const ORIGINES = {
  pt: 'https://www.pronostics-turf.info',   // la Synthese de la presse
  tf: 'https://www.turf-france.com',         // reu.php, tqqjour.php
  eq: 'https://www.equidia.fr',              // le marche
  lv: 'https://www.leveinard.com',           // LE VEINARD — les actualites des courses
  yt: 'https://www.youtube.com',             // la revue de presse EN VIDEO
  gz: 'https://www.lagazettedescourses.fr',  // le papier du jour, en texte (WordPress REST)
}

/**
 * Décode un corps selon le VRAI jeu de caractères annoncé.
 * ⚠ `r.text()` décode toujours en UTF-8 : la revue de presse est en
 *   windows-1252, « Assiduité » y devenait « Assiduit� ». Même code que
 *   `vite.config.js`.
 */
function decoderTexte(octets, type = '') {
  const declare = /charset\s*=\s*["']?([\w-]+)/i.exec(type || '')
  if (declare) {
    try { return new TextDecoder(declare[1]).decode(octets) } catch (e) { /* charset inconnu */ }
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(octets)
  } catch (e) {
    return new TextDecoder('windows-1252').decode(octets)
  }
}

/**
 * `base=1` — la page d'origine servie SOUS notre origine (un aperçu dans la
 * page). Sans <base>, ses chemins relatifs se résoudraient chez NOUS et la
 * page sortirait nue.
 */
function injecterBase(html, origine) {
  const s = String(html)
  if (!/<head[^>]*>/i.test(s)) return s
  return s.replace(/<head([^>]*)>/i, `<head$1><base href="${origine}/">`)
}

/**
 * LE NOM DE LA SOURCE NE DOIT JAMAIS APPARAÎTRE (règle de l'utilisateur,
 * 17/10/2026) : il s'affiche « LBAHJA-TURF ».
 *
 * On réécrit le TEXTE AFFICHÉ, jamais les URL :
 *   · le contenu des <script> / <style> est laissé INTACT (il porte les URL) ;
 *   · dans une balise, seuls title / alt / value / placeholder / content sont
 *     touchés, et seulement s'ils ne contiennent aucun « / » (donc pas une
 *     adresse) ;
 *   · un mot précédé de « / . : » est une URL → intact ; précédé d'une LETTRE
 *     (« RépartiTurf-France »), on met une espace : « Réparti LBAHJA-TURF ».
 *
 * ⚠ Réservé à `base=1` (§22). Les parseurs de la page cherchent des marqueurs
 *   LITTÉRAUX (« Pronostic, une analyse Turf-France et IA ») : relire la page
 *   en mode habillé les casserait.
 */
function habiller(html) {
  const MOT = /(^|[^/.:])turf[\s-]?france(\.com)?/gi
  const HABIT = (t) => String(t).replace(MOT, (m, avant) => (/[\w]/.test(avant) ? avant + ' ' : avant) + 'LBAHJA-TURF')
  return String(html)
    .split(/(<script[\s\S]*?<\/script\s*>|<style[\s\S]*?<\/style\s*>)/gi)
    .map((bloc) => {
      if (/^<(script|style)/i.test(bloc)) return bloc            // intact
      return bloc.split(/(<[^>]*>)/).map((part) => {
        if (!part) return part
        if (part[0] === '<') {
          return part.replace(/\b(title|alt|value|placeholder|content)=(["'])([\s\S]*?)\2/gi,
            (m, attr, q, val) => (val.includes('/') ? m : `${attr}=${q}${HABIT(val)}${q}`))
        }
        return HABIT(part)
      }).join('')
    })
    .join('')
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

      const entetes = {
        'user-agent': UA,
        'accept-language': 'fr-FR,fr;q=0.9',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      }

      const r = await fetch(cible, {
        headers: entetes,
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      })
      let body = decoderTexte(await r.arrayBuffer(), r.headers.get('content-type') || '')
      const type = r.headers.get('content-type') || 'text/html; charset=utf-8'
      if (u.searchParams.get('base') === '1' && /text\/html/i.test(type)) {
        body = injecterBase(habiller(body), origine)
      }
      /* le corps est une chaîne écrite en UTF-8 : l'en-tête doit le dire */
      let typeSortie = type
      if (/^(text\/|application\/json)/i.test(typeSortie)) {
        typeSortie = typeSortie.replace(/;\s*charset=[^;]*/i, '') + '; charset=utf-8'
      }
      res.setHeader('Content-Type', typeSortie)
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