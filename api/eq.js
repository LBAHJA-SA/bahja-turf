/* /api/eq       -> www.equidia.fr (le marche : rapp_evol = la cote en direct).
   /api/eq/api/* -> api.equidia.fr avec Referer equidia.fr (les déclarations,
                    les pronostics, l'analyse) — depuis fin octobre l'API refuse
                    les requêtes sans Referer equidia.fr (HTTP 403).
   Un seul function ici : le plan Hobby n'en tolère que 12 par déploiement. */
import { proxy } from './_proxy.js'
const eq = proxy('eq')
const eqa = proxy('eqa')

export default function handler(req, res) {
  const u = new URL(req.url || '/', 'http://localhost')
  /* vercel.json réécrit /api/eq/x en /api/eq?p=x : la forme avec chemin et la
   * forme avec requête existent des deux côtés. */
  const suite = u.pathname.match(/^\/api\/eq(\/.*)?$/)
  const p = u.searchParams.get('p') || ''
  const api = (suite && suite[1] && suite[1].startsWith('/api/')) || p.startsWith('api/')
  return (api ? eqa : eq)(req, res)
}