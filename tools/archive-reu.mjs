/* ============================================================================
 * tools/archive-reu.mjs — LE COLLECTEUR de notre archive.
 *
 * Remplit data/reu/ (+ public/data/reu/ pour la page) : le programme du jour
 * + le détail de CHAQUE course. Après son passage, la page /r/:slug trouve
 * tout CHEZ NOUS sans toucher au site.
 *
 *   node tools/archive-reu.mjs 2026-10-04        (un jour)
 *   node tools/archive-reu.mjs 2026-10-04 2026-10-03   (plusieurs jours)
 *
 * Poli : 1,2 s entre deux appels (le site n'aime pas la précipitation).
 * ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.join(ICI, '..')
const { chargerDetailReu, chargerProgrammeReu, normaliserDetailReu, nomFichierCourse } =
  await import('../backend/ARTICLE/turfFrance.js')

const pause = (ms) => new Promise((r) => setTimeout(r, ms))

function ecrire(relatif, obj) {
  for (const base of ['data', path.join('public', 'data')]) {
    const f = path.join(RACINE, base, relatif)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, JSON.stringify(obj, null, 1), 'utf8')
  }
}

async function collecterJour(date) {
  console.log('══ ' + date + ' ══')
  const t0 = Date.now()
  let reunions
  try {
    reunions = await chargerProgrammeReu(date)
  } catch (e) {
    console.error('  programme : ' + e.message)
    return { date, ok: 0, ko: 0 }
  }
  ecrire(`reu/prog-${date}.json`, { date, reunions, collecteLe: new Date().toISOString() })
  const toutes = []
  for (const r of reunions) for (const c of r.courses) toutes.push({ ...c, hippo: r.hippodrome })
  console.log(`  programme : ${reunions.length} réunions, ${toutes.length} courses`)

  let ok = 0, ko = 0
  for (const c of toutes) {
    const rNum = Number(String(c.reunion).replace(/\D/g, ''))
    const cNum = Number(String(c.code).replace(/\D/g, ''))
    try {
      const det = await chargerDetailReu(date, rNum, cNum, c.pays || 'FRANCE')
      const obj = normaliserDetailReu(det, rNum, cNum, c.pays || 'FRANCE', 'Turf-France · reu.php')
      obj.collecteLe = new Date().toISOString()
      ecrire('reu/' + nomFichierCourse(date, rNum, cNum, c.pays || 'FRANCE'), obj)
      ok++
      process.stdout.write(`  ✓ R${rNum}-C${cNum} ${c.nom.slice(0, 34).padEnd(36)} ${obj.participants.length}p\r`)
    } catch (e) {
      ko++
      console.log(`\n  ✗ R${rNum}-C${cNum} : ${e.message}`.slice(0, 120))
    }
    await pause(1200)
  }
  console.log(`\n  ${ok} courses archivées, ${ko} échecs (${((Date.now() - t0) / 1000).toFixed(0)} s)`)
  return { date, ok, ko }
}

const jours = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
if (!jours.length) {
  console.error('usage : node tools/archive-reu.mjs AAAA-MM-JJ [AAAA-MM-JJ …]')
  process.exit(1)
}
for (const j of jours) await collecterJour(j)
console.log('\nTERMINE — fichiers dans data/reu/ (+ public/data/reu/ pour la page)')
