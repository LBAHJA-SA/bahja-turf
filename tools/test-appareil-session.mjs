/* Vérifie la règle du 27/10/2026 : le compte « admin » échappe au verrou
 * d'appareil, les autres non. Redis est simulé par un serveur local qui dit
 * « l'appareil enregistré est AUTRE » : tout compte non-admin doit être refusé.
 */
import http from 'node:http'
import crypto from 'node:crypto'

const REDIS = 8898
const serveur = http.createServer((req, res) => {
  let corps = ''
  req.on('data', (c) => { corps += c })
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    // pipeline [['GET', clé]] → l'appareil enregistré est « AUTRE »
    res.end(JSON.stringify([{ result: JSON.stringify({ appareil: 'AUTRE', bloque: false }) }]))
  })
})
await new Promise((r) => serveur.listen(REDIS, r))

process.env.ADMIN_SECRET = 'secret-de-test'
process.env.ADMIN_COMPTES = JSON.stringify([
  { nom: 'boss', pages: ['analyse', 'admin'], actif: true, sel: 'x', iter: 1, hash: 'x' },
  { nom: 'client', pages: ['analyse'], actif: true, sel: 'x', iter: 1, hash: 'x' },
])
process.env.KV_REST_API_URL = 'http://127.0.0.1:' + REDIS
process.env.KV_REST_API_TOKEN = 'jeton'

const { sessionValide, compteAdmin } = await import('../api/_acces.js')

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function biscuit(nom) {
  const payload = b64({ n: nom, p: ['analyse'], exp: Date.now() + 3600_000 })
  const sig = crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(payload).digest('base64url')
  return `bahja_admin=${payload}.${sig}; bahja_device=MON-APPAREIL`
}
const req = (cookie) => ({ headers: { get: (k) => (k.toLowerCase() === 'cookie' ? cookie : '') } })

const boss = await sessionValide(req(biscuit('boss')))
const client = await sessionValide(req(biscuit('client')))

console.log('compteAdmin(boss)   =', compteAdmin({ pages: ['analyse', 'admin'], actif: true }))
console.log('compteAdmin(client) =', compteAdmin({ pages: ['analyse'], actif: true }))
console.log('session boss   (admin, autre appareil) =', boss ? 'ACCEPTÉE ' + JSON.stringify(boss.sansVerrou === true) : 'REFUSÉE')
console.log('session client (non-admin, autre appareil) =', client ? 'ACCEPTÉE' : 'REFUSÉE')

const ok = !!boss && !client
console.log(ok ? '✅ règle respectée' : '❌ règle NON respectée')
serveur.close(function () { process.exitCode = ok ? 0 : 1 })
