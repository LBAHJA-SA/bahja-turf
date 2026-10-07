/* Test des 3 proxies — appelle le VRAI handler avec de faux req/res.
 *
 * On teste les DEUX formes d'appel, parce que la production ne reçoit que la
 * seconde : Vercel ne route que le chemin EXACT (/api/eq), son rewrite
 * transforme /api/eq/<suite> en /api/eq?p=<suite>.
 *
 *   node tools\test-proxy.mjs
 */
import { proxy } from '../api/_proxy.js'

const fauxRes = () => ({
  h: {},
  corps: '',
  setHeader(k, v) { this.h[k] = v },
  end(t) { this.corps = t },
})

const CAS = [
  ['pt', '/api/pt/', '/'],
  ['pt', '/api/pt/?p=', ''],
  ['tf', '/api/tf/php/tqqjour.php?date=0', '/api/tf?p=php/tqqjour.php%3Fdate=0'],
  ['eq', '/api/eq/courses/2026-10-05/R1/C1', '/api/eq?p=courses/2026-10-05/R1/C1'],
  ['eq', '/api/eq/', '/api/eq?p='],
]

let ko = 0
let bloquees = 0
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
for (const [label, formeChemin, formeRequete] of CAS) {
  for (const url of [formeChemin, formeRequete]) {
    // pronostics-turf.info a un Crawl-delay de 10 s (§13.3 règle 3) : sans
    // cette pause, le test se bloque lui-meme et affiche un faux échec.
    if (label === 'pt') { console.log('  (pause 11 s — Crawl-delay du site)'); await pause(11000) }
    const res = fauxRes()
    try {
      await proxy(label)({ url }, res)
      const t = res.corps || ''
      const reels = t.length > 2000 && !t.includes('<div id="root">')
      // 31 octets = le site nous bloque (Crawl-delay), §13.3 règle 3. Ce n'est
      // PAS un défaut du proxy : on le dit, on ne le compte pas comme un échec.
      const bloque = !reels && t.length < 500
      const etat = reels ? 'CONTENU REEL' : bloque ? 'SITE BLOQUE (pas un defaut)' : 'ECHEC'
      if (!reels && !bloque) ko++
      console.log(`  ${url.padEnd(44)} ${String(t.length).padStart(7)} o  proxy=${res.h['X-Bahja-Proxy'] || '-'}  ${etat}`)
      if (bloque) bloquees++
    } catch (e) {
      ko++
      console.log(`  ${url.padEnd(44)} EXCEPTION : ${e.message}`)
    }
  }
}
console.log(`\n  ${ko === 0 ? 'OK' : ko + ' ECHEC(S)'} — les deux formes doivent rendre le site cible`)
if (bloquees) console.log(`  ${bloquees} appel(s) ignores : le site cible nous bloque (Crawl-delay). Les proxies, eux, sont bons — vérifier sur https://bahja-turf.vercel.app/api/…`)
process.exit(ko ? 1 : 0)