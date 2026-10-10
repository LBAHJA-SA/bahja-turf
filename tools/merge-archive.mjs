/* =============================================================================
 * tools/merge-archive.mjs — REMÈDE AU « DEUX ARCHIVES » (10/10/2026).
 *
 * Le navigateur collecte des courses que le disque rate (08/10 jamais
 * collecté, 09/10 fermé à la main via turf-france). Résultat : la page et
 * les tests ne parlent plus de la même archive, et les tickets « ne
 * correspondent à rien ». Le remède :
 *
 *   1) page → bouton « ⬇ archive.json » (telechargerArchive) → le fichier
 *      est posé dans data/archive-import.json ;
 *   2) CE MODULE fusionne l'import dans data/synthese.json (+ copie
 *      public/data/synthese.json), avec des règles de sécurité strictes ;
 *   3) tools/daily.mjs l'appelle tout seul à chaque cycle quand le
 *      fichier est présent, puis le range en archive-import.traite-<ts>.
 *
 * RÈGLES (par date) :
 *   - date absente du disque → ajoutée telle quelle (source page).
 *   - arrivée : le disque gagne s'il en a une ; sinon on prend celle de
 *     l'import. On n'écrase JAMAIS une arrivée du disque.
 *   - ticket : si le disque n'en a pas, on prend celui de l'import
 *     (+ source/heure/mode/groupes/surprises). Si les deux en ont un et
 *     qu'ils diffèrent : le MANUEL gagne toujours (choix explicite de
 *     l'utilisateur) ; sinon on garde celui du disque (marché frais du
 *     FINAL > provisoire de la page) et on le signale dans le journal.
 *   - synthèse : le disque gagne ; si les deux existent et diffèrent, on
 *     garde le disque et on le signale (le ticket a été calculé dessus).
 *   - méta (hippodrome/discipline/distance/runners/...) : on comble les
 *     trous du disque, on n'écrase rien d'existant.
 * ============================================================================= */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const F_SYN = path.join(RACINE, 'data', 'synthese.json')
const F_PUB = path.join(RACINE, 'public', 'data', 'synthese.json')
const F_IMPORT = path.join(RACINE, 'data', 'archive-import.json')

const lire = (f, defaut) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return defaut }
}
const ecrire = (f, obj) => {
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, JSON.stringify(obj, null, 2))
}
const trier = (db) => {
  const tri = {}
  for (const k of Object.keys(db).sort().reverse()) tri[k] = db[k]
  return tri
}

export function fusionnerImport(cheminImport = F_IMPORT, cheminBase = F_SYN) {
  const rapport = []
  const imp = lire(cheminImport, null)
  if (!imp || typeof imp !== 'object' || !Object.keys(imp).length) {
    return { ok: false, rapport: ['import vide ou illisible — rien à fusionner'] }
  }
  const db = lire(cheminBase, {})
  let ajoutees = 0, arrivees = 0, tickets = 0, manuelGagne = 0
  for (const [date, src] of Object.entries(imp)) {
    if (!src || typeof src !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      rapport.push(`  ${date} : ignorée (forme invalide)`)
      continue
    }
    const dst = db[date]
    if (!dst) {
      db[date] = { ...src, date, sourceImport: 'page' }
      ajoutees++
      rapport.push(`  ${date} : AJOUTÉE (course que le disque n'avait pas)`)
      continue
    }
    // arrivée : le disque gagne, sinon on comble
    if ((!dst.arrivee || !dst.arrivee.length) && src.arrivee && src.arrivee.length) {
      dst.arrivee = src.arrivee
      dst.cloture = dst.cloture || src.cloture || new Date().toISOString()
      arrivees++
      rapport.push(`  ${date} : arrivée complétée (${src.arrivee.join('-')})`)
    }
    // ticket : le disque gagne, sauf MANUEL explicite de la page
    const aT = Array.isArray(dst.ticket) && dst.ticket.length
    const bT = Array.isArray(src.ticket) && src.ticket.length
    if (!aT && bT) {
      for (const k of ['ticket', 'ticketSource', 'ticketPoseLe', 'ticketMode', 'groupes', 'surprises']) {
        if (src[k] !== undefined) dst[k] = src[k]
      }
      tickets++
      rapport.push(`  ${date} : ticket repris de la page (${src.ticket.join(' ')})`)
    } else if (aT && bT && dst.ticket.join(',') !== src.ticket.join(',')) {
      if (src.ticketSource === 'manuel' && dst.ticketSource !== 'manuel') {
        for (const k of ['ticket', 'ticketSource', 'ticketPoseLe', 'ticketMode', 'groupes', 'surprises']) {
          if (src[k] !== undefined) dst[k] = src[k]
        }
        manuelGagne++
        rapport.push(`  ${date} : ticket MANUEL de la page repris (intouchable)`)
      } else {
        rapport.push(`  ${date} : ticket différent — disque gardé (${dst.ticket.join(' ')})`)
      }
    }
    // synthèse : le disque gagne, on signale les divergences
    if ((!dst.synthese || !dst.synthese.length) && src.synthese && src.synthese.length) {
      dst.synthese = src.synthese
      rapport.push(`  ${date} : synthèse reprise de la page`)
    } else if (dst.synthese && src.synthese && dst.synthese.join(',') !== src.synthese.join(',')) {
      rapport.push(`  ${date} : ⚠ synthèse différente — disque gardé`)
    }
    // méta : on comble les trous, on n'écrase rien
    for (const k of ['hippodrome', 'discipline', 'distance', 'runners', 'nbPartants', 'courseId', 'cle']) {
      if ((dst[k] === undefined || dst[k] === null) && src[k] !== undefined && src[k] !== null) {
        dst[k] = src[k]
      }
    }
  }
  // sauvegarde + écriture (disque + copie publique pour la page)
  const horo = new Date().toISOString().replace(/[:.]/g, '-')
  try { ecrire(path.join(RACINE, 'data', `synthese.bak.${horo}.json`), lire(cheminBase, {})) } catch { /* rien */ }
  const tri = trier(db)
  ecrire(cheminBase, tri)
  if (path.resolve(cheminBase) === path.resolve(F_SYN)) {
    try { ecrire(F_PUB, tri) } catch { /* rien */ }
  }
  // l'import est rangé (preuve), jamais rejoué
  try { fs.renameSync(cheminImport, cheminImport.replace(/\.json$/, `.traite-${horo}.json`)) } catch { /* rien */ }
  rapport.unshift(`fusion : +${ajoutees} course(s), +${arrivees} arrivée(s), +${tickets} ticket(s), ${manuelGagne} manuel(s) repris`)
  return { ok: true, rapport }
}

function estLanceur() {
  return !!process.argv[1] && path.resolve(process.argv[1]) === path.join(ICI, 'merge-archive.mjs')
}

if (estLanceur()) {
  const r = fusionnerImport()
  for (const l of r.rapport) console.log(l)
}
