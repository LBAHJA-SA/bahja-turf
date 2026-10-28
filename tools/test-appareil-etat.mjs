/* L'ÉTAT DE SESSION (`action=session`) : le compte admin reste connecté sans
 * cookie d'appareil, le compte ordinaire est renvoyé au formulaire.
 */
import http from 'node:http'
import crypto from 'node:crypto'

const REDIS = 8896
const ETAT = JSON.stringify({ appareil: 'AUTRE', bloque: false })
const serveur = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => { corps += c })
  req.on('end', () => {
    let cmds = []
    try { cmds = JSON.parse(corps) } catch {}
    const out = (Array.isArray(cmds) ? cmds : [cmds]).map((c) => {
      const nom = String((c && c[0]) || '').toUpperCase()
      return { result: nom === 'GET' ? ETAT : null }
    })
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(out))
  })
})
await new Promise((r) => serveur.listen(REDIS, r))

const sel = 'a1b2c3d4'
const hash = crypto.pbkdf2Sync('motdepasse', Buffer.from(sel, 'hex'), 1000, 32, 'sha256').toString('hex')
const compte = (nom, pages) => ({ nom, pages, actif: true, sel, iter: 1000, hash })

process.env.ADMIN_SECRET = 'secret-de-test'
process.env.ADMIN_COMPTES = JSON.stringify([compte('boss', ['analyse', 'admin']), compte('client', ['analyse'])])
process.env.KV_REST_API_URL = 'http://127.0.0.1:' + REDIS
process.env.KV_REST_API_TOKEN = 'jeton'

const { default: handler } = await import('../api/admin.js')
const { fabriquer } = await import('../api/_session.js')

function appeler(nom) {
  return new Promise((resolve) => {
    const req = {
      query: { action: 'session' },
      method: 'GET',
      headers: { cookie: 'bahja_admin=' + fabriquer(compte(nom, ['analyse'])), 'x-forwarded-for': '127.0.0.1' },
      body: {},
    }
    const res = {
      code: 200, entetes: {}, corps: null,
      setHeader(k, v) { this.entetes[k.toLowerCase()] = v },
      status(c) { this.code = c; return this },
      json(j) { this.corps = j; resolve(this); return this },
      end() { resolve(this) },
    }
    handler(req, res).catch((e) => resolve({ code: 0, corps: { erreur: String(e) } }))
  })
}

const boss = await appeler('boss')
const client = await appeler('client')

console.log('boss   (admin)     →', boss.code, JSON.stringify(boss.corps))
console.log('client (ordinaire) →', client.code, JSON.stringify(client.corps))

const ok = boss.corps?.connecte === true && client.corps?.connecte === false && client.corps?.appareilConnexionRequise === true
console.log(ok ? '✅ session : admin libre, les autres verrouillés' : '❌ session : règle NON respectée')
serveur.close(function () { process.exitCode = ok ? 0 : 1 })
