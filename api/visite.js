/* =============================================================================
 * api/visite.js — enregistre UNE visite. L'IP est ajoutée ICI, côté serveur.
 *
 *   POST /api/visite?p=%2Fpresse        →  204, rien à lire
 *
 * ⚠ LA PAGE NE VOIT JAMAIS L'IP : elle ne l'envoie pas, elle ne la reçoit pas.
 *   C'est le serveur qui la lit dans `x-forwarded-for` (posé par Vercel) et
 *   l'écrit dans la base. Le navigateur n'a donc rien à cacher, et le journal
 *   reste fiable même si quelqu'un bricole la page.
 *
 *   Vercel ajoute aussi, gratuitement :
 *       x-vercel-ip-country   le pays      x-vercel-ip-city   la ville
 *
 * ⚠ SANS BASE, IL NE SE PASSE RIEN — ET C'EST VOULU. Sans les variables
 *   KV_REST_API_URL / KV_REST_API_TOKEN, l'appel répond 204 sans écrire : le
 *   site marche exactement comme avant, la console affiche « base non
 *   configurée ». Rien n'est cassé, rien n'est écrit.
 *
 * ⚠ L'IP EST UNE DONNÉE PERSONNELLE (RGPD). Le journal sert à VOIR QUI VIENT,
 *   il est plafonné aux 2000 dernières visites (`LTRIM`) et ne part nulle part
 *   ailleurs. Prévoir une durée de conservation et une mention sur le site.
 *
 * LA BASE : un Redis compatible Upstash (Vercel KV en fournit un). On lui parle
 * en REST : AUCUNE dépendance npm, deux `fetch`, c'est tout.
 * ========================================================================== */

const base = () => String(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '')
const jeton = () => String(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '')

const PLAFOND = 2000

async function rediser(commandes) {
  const r = await fetch(base() + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + jeton(), 'Content-Type': 'application/json' },
    body: JSON.stringify(commandes),
  })
  if (!r.ok) throw new Error('base : HTTP ' + r.status)
  return r.json()
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!base() || !jeton()) { res.status(204).end(); return }

  const entree = {
    t: new Date().toISOString(),
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
    p: String((req.query && req.query.p) || '/').slice(0, 120),
    pays: String(req.headers['x-vercel-ip-country'] || ''),
    ville: decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')).slice(0, 80),
    ua: String(req.headers['user-agent'] || '').slice(0, 220),
    ref: String(req.headers['referer'] || '').slice(0, 180),
    test: String((req.query && req.query.test) || '') === '1' || undefined,
  }

  try {
    await rediser([['RPUSH', 'visites', JSON.stringify(entree)], ['LTRIM', 'visites', -PLAFOND, -1]])
    res.status(204).end()
  } catch (e) {
    /* un journal qui tombe ne doit JAMAIS faire tomber la page du visiteur */
    res.status(200).json({ enregistre: false, erreur: String(e.message || e).slice(0, 120) })
  }
}
