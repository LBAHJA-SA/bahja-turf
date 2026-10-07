/* ──────────────────────────────────────────────────────────────────────────
 * tools\publier-archive.mjs — LE SEULendroit d'où part l'archive.
 *
 *  ⭐ POURQUOI CE SCRIPT
 *
 *  public/data/synthese.json est l'archive de la presse : les tickets,
 *  les arrivées, les bilans. Elle ne se recalcule pas (pronostics-turf.info
 *  ne publie que la course du jour), donc elle ne se régénère pas.
 *
 *  Elle est IGNORÉE par git (voir .gitignore). Conséquence : un commit de
 *  code n'embarque jamais l'archive, et un deploy de code ne remplace pas
 *  le site par surprise. Pour que le site soit à jour, il faut le dire.
 *
 *  C'est ce script qui le dit. Il :
 *     1. force `public/data/synthese.json` dans git,
 *     2. commit s'il a changé,
 *     3. push sur main  →  Vercel redéploie automatiquement.
 *
 *  UTILISATION
 *     node tools\publier-archive.mjs              publie l'archive locale
 *     node tools\publier-archive.mjs --dry-run    montre, ne publie pas
 *     node tools\publier-archive.mjs --verifier   appelle l'API Vercel
 *
 *  ⚠ AUCUN deploy implicite ailleurs : tools\daily.mjs écrit bien
 *    public/data/synthese.json, mais ne fait AUCUN commit / push.
 *    C'est voulu : le job collecte, ce script publie.
 * ────────────────────────────────────────────────────────────────────────── */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F_PUB = path.join(RACINE, 'public', 'data', 'synthese.json')

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const VERIFIER = args.includes('--verifier')

/* ------------------------------------------------------------------ helpers */
const g = (...a) => execFileSync('git', a, { cwd: RACINE, encoding: 'utf8' }).trim()
const log = (...a) => console.log('  ' + a.join(' '))
const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }

/* --------------------------------------------------------------------- etat */
if (!fs.existsSync(F_PUB)) {
  console.error('\n  ✗ public/data/synthese.json introuvable — rien à publier.\n')
  process.exit(1)
}

const j = JSON.parse(lire(F_PUB))
const dates = Object.keys(j).sort()
log('archive :', dates.length, 'dates —', dates[0], '→', dates[dates.length - 1])
log('')
console.log('  ' + 'DATE'.padEnd(12) + 'TICKET'.padEnd(26) + 'POSE LE'.padEnd(22) + 'BILAN')
console.log('  ' + '─'.repeat(74))
for (const d of dates) {
  const c = j[d]
  const t = new Set(c.ticket || [])
  const b = c.arrivee && (c.ticket || []).length
    ? c.arrivee.filter((n) => t.has(n)).length + '/5'
    : '—'
  console.log('  ' + d.padEnd(12)
    + ((c.ticket || []).join(' ') || '—').padEnd(26)
    + (c.ticketPoseLe ? c.ticketPoseLe.slice(0, 16).replace('T', ' ') : '—').padEnd(22)
    + b)
}
console.log('')

/* ------------------------------------------------------------- etat de git */
const dejaPubliee = (() => {
  try { return g('show', 'HEAD:public/data/synthese.json') } catch { return '' }
})()
const locale = lire(F_PUB).replace(/\r\n/g, '\n').trimEnd()
const enLigne = dejaPubliee.replace(/\r\n/g, '\n').trimEnd()
const change = locale !== enLigne

log('archive en ligne  :', enLigne ? (Object.keys(JSON.parse(enLigne)).length + ' dates') : '— (jamais publiée)')
log('archive locale    :', dates.length, 'dates')
log('changement        :', change ? 'OUI — à publier' : 'non — déjà identique')
log('')

if (DRY) {
  console.log('  --dry-run : rien n\'a été publié.\n')
  process.exit(change ? 1 : 0)
}
if (!change) {
  console.log('  Rien à faire — le site est déjà à jour.\n')
  process.exit(0)
}

/* ------------------------------------------------------------------ publish */
console.log('  Publication de l\'archive…\n')
g('add', '-f', 'public/data/synthese.json')

// s'il y a d'autres modifications en attente, on ne les melange pas
const autres = g('status', '--porcelain')
  .split('\n')
  .filter((l) => l && !l.includes('public/data/synthese.json'))
if (autres.length) {
  console.log('\n  ⚠ Autres fichiers modifiés en attente — ils ne partent PAS :')
  for (const l of autres) console.log('     ' + l)
  console.log('     (publie l\'archive seule ; commite le reste a part)\n')
}

const msg = `archive : ${dates.length} dates (${dates[0]} → ${dates[dates.length - 1]})`
g('commit', '-m', msg)
log('commit :', g('log', '--oneline', '-1'))
g('push', 'origin', 'main')
log('push   : main → origin/main')
console.log('\n  ✓ Archive publiée. Vercel redéploie tout seul (~30 s).')

/* --------------------------------------------------------- verifier (option) */
if (VERIFIER) {
  console.log('\n  Attente du déploiement Vercel…')
  const token = (/^VERCEL_TOKEN=(.*)$/m.exec(lire(path.join(RACINE, '.deploy-env'))) || [])[1]
  const proj = JSON.parse(lire(path.join(RACINE, '.vercel', 'project.json')))
  if (!token || !proj.projectId) {
    console.log('  (pas de token Vercel — vérification manuelle sur le site)')
  } else {
    const d = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${proj.projectId}&limit=1`,
      { headers: { Authorization: 'Bearer ' + token.trim() } }
    ).then((r) => r.json())
    const dep = (d.deployments || [])[0]
    if (dep) log('deploy :', dep.state, (dep.meta.githubCommitSha || '').slice(0, 7))
  }
}
console.log('')