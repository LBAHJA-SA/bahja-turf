/* Vérification de session utilisable par les fonctions Node, Edge et le middleware Vercel. */

export async function sessionValide(req) {
  const secret = String(process.env.ADMIN_SECRET || '').trim()
  const liste = (() => { try { const j = JSON.parse(String(process.env.ADMIN_COMPTES || '')); return Array.isArray(j) ? j : (j.comptes || []) } catch { return [] } })()
  if (!secret || !liste.length || !globalThis.crypto || !crypto.subtle) return null

  const h = req?.headers
  const cookie = String(h?.get ? h.get('cookie') || '' : h?.cookie || '')
  const item = cookie.split(';').map((x) => x.trim()).find((x) => x.startsWith('bahja_admin='))
  if (!item) return null
  let value
  try { value = decodeURIComponent(item.slice('bahja_admin='.length)) } catch { return null }
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null

  try {
    const decode = (x) => Uint8Array.from(
      atob(x.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - x.length % 4) % 4)),
      (c) => c.charCodeAt(0),
    )
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    )
    if (!await crypto.subtle.verify('HMAC', key, decode(signature), new TextEncoder().encode(payload))) return null
    const session = JSON.parse(new TextDecoder().decode(decode(payload)))
    if (!session?.exp || Number(session.exp) < Date.now()) return null

    const compte = liste.find((c) => String(c?.nom || '').toLowerCase() === String(session.n || '').toLowerCase())
    if (!compte || compte.actif === false) return null
    const jour = new Date().toISOString().slice(0, 10)
    const date = (s) => {
      if (!s) return ''
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
      const d = new Date(s + 'T00:00:00Z')
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null
    }
    const debut = date(compte.debut), fin = date(compte.fin)
    if (debut === null || fin === null || (debut && jour < debut) || (fin && jour > fin)) return null
    /* ⭐ 27/10/2026 — le verrou d'appareil ne s'applique PAS à l'administration
     * (voir `compteAdmin`). On saute donc la lecture Redis : plus de
     * comparaison, plus de blocage — et, au passage, un compte admin n'est plus
     * refusé quand Redis est injoignable. */
    if (compteAdmin(compte)) {
      return {
        nom: String(compte.nom),
        pages: Array.isArray(compte.pages) ? compte.pages : [],
        etudesFrance: compte.etudesFrance !== false,
        sansVerrou: true,
      }
    }
    const deviceItem = cookie.split(';').map((x) => x.trim()).find((x) => x.startsWith('bahja_device='))
    let device = ''
    try { device = deviceItem ? decodeURIComponent(deviceItem.slice('bahja_device='.length)) : '' } catch { return null }
    const redisUrl = String(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '')
    const redisToken = String(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '')
    if (redisUrl && redisToken) {
      const key = 'bahja:device-lock:' + encodeURIComponent(String(compte.nom).trim().toLowerCase())
      const response = await fetch(redisUrl + '/pipeline', {
        method: 'POST', headers: { Authorization: 'Bearer ' + redisToken, 'Content-Type': 'application/json' },
        body: JSON.stringify([['GET', key]]), signal: AbortSignal.timeout(2000),
      })
      if (!response.ok) return null
      const result = await response.json()
      const stateText = result?.[0]?.result
      if (stateText) {
        const state = JSON.parse(stateText)
        if (state.bloque || !device || state.appareil !== device) return null
      }
    }
    return {
      nom: String(compte.nom),
      pages: Array.isArray(compte.pages) ? compte.pages : [],
      etudesFrance: compte.etudesFrance !== false,
    }
  } catch { return null }
}

export function adminValide(session) {
  return !!session && Array.isArray(session.pages) && session.pages.includes('admin')
}

/** ⭐ 27/10/2026 — LE COMPTE D'ADMINISTRATION EST EXEMPTÉ DU VERROU D'APPAREIL.
 *
 *  Demande de l'utilisateur : « exclus les comptes qui portent la permission
 *  Administration du verrou d'appareil, au login comme à la vérification de
 *  session — ainsi le compte d'administration peut entrer depuis plusieurs
 *  appareils, le verrou restant pour les autres ».
 *
 *  Un compte « administration » est un compte dont `pages` contient « admin »
 *  (c'est déjà ce que vérifie `adminValide`). Il en faut toujours un actif
 *  (voir la validation de `ADMIN_COMPTES` dans `api/admin.js`).
 *
 *  ⚠ Ce n'est pas l'appareil qui est oublié, c'est la LIAISON : le cookie
 *    `bahja_device` continue d'exister, mais on ne compare plus et on ne
 *    bloque plus. Les autres comptes gardent le verrou intact.
 */
export function compteAdmin(compte) {
  return !!compte && compte.actif !== false && Array.isArray(compte.pages) && compte.pages.includes('admin')
}
