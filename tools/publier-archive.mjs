/* ──────────────────────────────────────────────────────────────────────────
 * tools\publier-archive.mjs — LA SEULE PORTE DE SORTIE DES DONNÉES.
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
 *     1. force les fichiers de données dans git,
 *     2. commit s'ils ont changé,
 *     3. push sur main  →  Vercel redéploie automatiquement.
 *
 *  ⭐ CE QU'IL PUBLIE (18/10/2026 — il ne publiait QUE l'archive)
 *
 *  Le site lit ces fichiers par le réseau (`fetch('/data/…')`) : tant qu'ils
 *  ne sont pas dans le dépôt, la page affiche la version du dernier envoi.
 *  Les 6 familles qui suivent sont donc publiées ensemble :
 *
 *     public/data/synthese.json     l'archive : tickets, arrivées, x/5
 *     public/data/cotes.json        le marché Equidia (repli hors-ligne)
 *     public/data/fiabilite.json    les stats de l'onglet Statistiques
 *     public/data/ecarts.json       les écarts (page Quinté)
 *     public/data/choix.json        les choix (page Quinté)
 *     public/data/reu/              les fiches de courses + prog-{date}.json
 *
 *  UTILISATION
 *     node tools\publier-archive.mjs              publie
 *     node tools\publier-archive.mjs --dry-run    montre, ne publie pas
 *     node tools\publier-archive.mjs --auto       une seule ligne (le job)
 *     node tools\publier-archive.mjs --verifier   appelle l'API Vercel
 *
 *  ⚠ AUCUN deploy implicite ailleurs : tools\daily.mjs écrit bien les données,
 *    mais ne fait AUCUN commit / push (il APPELLE ce script, c'est tout).
 *    C'est voulu : le job collecte, ce script publie.
 *
 *  ⚠ LE COMMIT EST LIMITÉ À CES CHEMINS (`git commit -- <chemins>`) : le
 *    travail en cours de l'utilisateur (autre fichier modifié ou indexé) ne
 *    part JAMAIS avec. C'est la raison d'être du `--`.
 * ────────────────────────────────────────────────────────────────────────── */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F_PUB = path.join(RACINE, 'public', 'data', 'synthese.json')

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const VERIFIER = args.includes('--verifier')
const AUTO = args.includes('--auto')

/** [chemin, ce que c'est] — l'ordre est celui de l'affichage.
 *  ⚠ 23/10/2026 : la page COPLY est supprimée — ses artefacts (modèle,
 *    sélection contextuelle, tickets de groupe) ne voyagent plus. */
const A_PUBLIER = [
  ['public/data/synthese.json', "l'archive"],
  ['public/data/cotes.json', 'le marché'],
  ['public/data/fiabilite.json', 'les stats'],
  ['public/data/ecarts.json', 'les écarts'],
  ['public/data/choix.json', 'les choix'],
  ['public/data/reu', 'les fiches de courses'],
  ['public/data/empreinte.json', 'les empreintes'],
  ['public/data/empreinte-v3.json', 'les empreintes v3'],
  ['public/data/empreinte-v4.json', 'les empreintes v4'],
]

/* un chemin qui n'existe pas ferait échouer `git add` : on l'écarte d'abord */
const CHEMINS = A_PUBLIER.filter(([p]) => fs.existsSync(path.join(RACINE, p)))
const NOMS = CHEMINS.map(([p]) => p)

/* ------------------------------------------------------------------ helpers */
const g = (...a) => execFileSync('git', a, { cwd: RACINE, encoding: 'utf8' }).trim()
const log = (...a) => { if (!AUTO) console.log('  ' + a.join(' ')) }
const dire = (...a) => console.log('  ' + a.join(' '))
const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }

/** ce qui a bougé DANS ces chemins (fichiers ignorés compris) :
 *  « M » = modifié, « ?? » = nouveau, « !! » = nouveau mais ignoré par git */
function movantes() {
  const r = spawnSync('git',
    ['status', '--porcelain', '--ignored=matching', '--untracked-files=all', '--', ...NOMS],
    { cwd: RACINE, encoding: 'utf8' })
  return (r.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean)
}

/* --------------------------------------------------------------------- etat */
if (!fs.existsSync(F_PUB)) {
  console.error('\n  ✗ public/data/synthese.json introuvable — rien à publier.\n')
  process.exit(1)
}

const j = JSON.parse(lire(F_PUB))
const dates = Object.keys(j).sort()
const lignes = (() => {
  const t = ['  ' + 'DATE'.padEnd(12) + 'TICKET'.padEnd(26) + 'POSE LE'.padEnd(22) + 'BILAN',
    '  ' + '─'.repeat(74)]
  for (const d of dates) {
    const c = j[d]
    const ti = new Set(c.ticket || [])
    const b = c.arrivee && (c.ticket || []).length
      ? c.arrivee.filter((n) => ti.has(n)).length + '/5'
      : '—'
    t.push('  ' + d.padEnd(12)
      + ((c.ticket || []).join(' ') || '—').padEnd(26)
      + (c.ticketPoseLe ? c.ticketPoseLe.slice(0, 16).replace('T', ' ') : '—').padEnd(22)
      + b)
  }
  return t
})()

const change = movantes()

if (!AUTO) {
  log('archive :', dates.length, 'dates —', dates[0], '→', dates[dates.length - 1])
  console.log('')
  for (const l of lignes) console.log(l)
  console.log('')
  log('ce qui est publié :')
  for (const [p, quoi] of CHEMINS) {
    const n = change.filter((l) => l.slice(3).replace(/^"|"$/g, '').startsWith(p)).length
    log('  ' + (n ? '●' : '○'), p.padEnd(34), quoi, n ? `(${n} à envoyer)` : '(à jour)')
  }
  console.log('')
}

if (!change.length) {
  dire(AUTO ? 'donnees : deja a jour' : 'Rien à faire — le site est déjà à jour.')
  console.log('')
  process.exit(0)
}

/* ⚠ 28/10/2026 — LE PIÈGE DU DÉPLOIEMENT GIT, DIT AVANT LE PUSH.
 *
 *  Vercel est branché sur GitHub (intégration du dépôt LBAHJA-SA/bahja-turf) :
 *  le `git push` ci-dessous redéploie TOUT LE DÉPÔT, pas seulement les
 *  données. Du code modifié sur le disque mais non commité est donc ÉCRASÉ
 *  en production par la version du dernier commit — sans un mot.
 *
 *  C'est arrivé le 28/10 : le job de 04 h 35 a poussé l'archive et la
 *  production est revenue au code de la veille (le compte « sam » s'est
 *  retrouvé bloqué, le ticket 3-2-1-1-1 avait disparu). Le commit de données
 *  est limité aux données, mais le DÉPLOIEMENT, lui, ne l'est pas.
 *
 *  On le dit donc ici, avant de pousser, et dans les deux modes : `--auto`
 *  passe par `dire()` pour que l'avertissement finisse dans data/daily.log. */
function codeEnAttente() {
  const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: RACINE, encoding: 'utf8' })
  return (r.stdout || '').split('\n').filter(Boolean).filter((l) => {
    const p = l.slice(3).trim().replace(/^"|"$/g, '')
    return !/^(data\/|public\/data\/|dist\/|node_modules\/)/.test(p)
  })
}

const attente = codeEnAttente()
if (attente.length) {
  dire('')
  dire(`⚠ ${attente.length} fichier(s) de CODE non commité(s) : ce push va redéployer le dépôt`)
  dire('  et la production servira la version du dernier commit pour ces fichiers.')
  for (const l of attente.slice(0, 10)) dire('   ' + l)
  if (attente.length > 10) dire(`   … et ${attente.length - 10} autres`)
  dire('  → avant de publier :  git add -A -- . ":!data"   puis   git commit')
  dire('')
}

if (DRY) {
  console.log('')
  log(change.length + ' fichier(s) à publier :')
  for (const l of change.slice(0, 40)) console.log('     ' + l)
  if (change.length > 40) console.log('     … et ' + (change.length - 40) + ' autres')
  console.log('\n  --dry-run : rien n\'a été publié.\n')
  process.exit(1)
}

/* ------------------------------------------------------------------ publish */
const msg = `donnees : archive ${dates.length} dates (${dates[0]} → ${dates[dates.length - 1]})`
  + ` · ${change.length} fichier${change.length > 1 ? 's' : ''}`

try {
  g('add', '-f', '-A', '--', ...NOMS)
  g('commit', '-m', msg, '--', ...NOMS)
  g('push', 'origin', 'main')
} catch (e) {
  const detail = String((e && (e.stderr || e.stdout)) || e.message || e).trim().split('\n').slice(-3).join(' / ')
  console.error('\n  ✗ publication impossible : ' + detail + '\n')
  process.exit(2)
}

const autres = g('status', '--porcelain').split('\n').filter(Boolean)
if (AUTO) dire(`donnees : ${change.length} fichier(s) publie(s) → Vercel redeploie`)
else {
  log('commit :', g('log', '--oneline', '-1'))
  log('push   : main → origin/main')
  if (autres.length) {
    log('')
    log('⚠ travail en cours NON publié (le commit est limité aux données) :')
    for (const l of autres.slice(0, 12)) log('   ' + l)
    if (autres.length > 12) log('   … et ' + (autres.length - 12) + ' autres')
  }
  console.log('\n  ✓ Données publiées. Vercel redéploie tout seul (~30 s).')
}

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
