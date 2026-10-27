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
