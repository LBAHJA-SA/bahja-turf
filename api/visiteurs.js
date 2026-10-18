/* =============================================================================
 * api/visiteurs.js — LE JOURNAL DES VISITES (lecture), réservé au propriétaire.
 *
 *   GET /api/visiteurs?jeton=XXXXXXXX   →  { configure, total, visites: [...] }
 *
 * ⚠ CE FICHIER REND DES ADRESSES IP : il est FERMÉ PAR DÉFAUT.
 *   Il faut la variable d'environnement `ADMIN_JETON` (un mot de passe de ton
 *   choix, posé dans Vercel → Settings → Environment Variables). Sans elle, la
 *   route répond 403 : personne ne peut lire le journal, même en connaissant
 *   l'adresse. Le jeton se compare à temps constant (pas de fuite par timing).
 *
 * ⚠ SANS BASE, la route répond `{ configure: false }` — la console explique
 *   alors comment la brancher, sans jamais afficher d'erreur rouge.
 *
 * Renvoie au plus 300 visites (les plus récentes d'abord) + des compteurs :
 * total, aujourd'hui, IP distinctes, pays distincts.
 * ========================================================================== */

const base = () => String(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '')
const jetonBase = () => String(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '')

/** Comparaison à temps constant : on ne laisse pas mesurer le jeton. */
function memeChaine(a, b) {
  const x = String(a || ''), y = String(b || '')
  if (!x || x.length !== y.length) return false
  let d = 0
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return d === 0
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const attendu = String(process.env.ADMIN_JETON || '')
  if (!attendu) { res.status(403).json({ erreur: 'journal fermé : ADMIN_JETON non configuré' }); return }
  if (!memeChaine((req.query && req.query.jeton) || '', attendu)) {
    res.status(403).json({ erreur: 'jeton invalide' })
    return
  }

  if (!base() || !jetonBase()) { res.status(200).json({ configure: false }); return }

  try {
    const r = await fetch(base() + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jetonBase(), 'Content-Type': 'application/json' },
      body: JSON.stringify([['LRANGE', 'visites', '0', '-1']]),
    })
    if (!r.ok) throw new Error('base : HTTP ' + r.status)
    const j = await r.json()
    const brut = (j && j[0] && j[0].result) || []
    const toutes = brut
      .map((s) => { try { return JSON.parse(s) } catch { return null } })
      .filter(Boolean)
      .reverse()   // la plus récente d'abord

    const jour = new Date().toISOString().slice(0, 10)
    const ips = new Set(), pays = new Set()
    let auj = 0
    for (const v of toutes) {
      if (v.ip) ips.add(v.ip)
      if (v.pays) pays.add(v.pays)
      if (String(v.t || '').slice(0, 10) === jour) auj++
    }

    res.status(200).json({
      configure: true,
      total: toutes.length,
      aujourdhui: auj,
      ipDistinctes: ips.size,
      paysDistincts: pays.size,
      visites: toutes.slice(0, 300),
    })
  } catch (e) {
    res.status(200).json({ configure: true, erreur: String(e.message || e).slice(0, 140), visites: [] })
  }
}
