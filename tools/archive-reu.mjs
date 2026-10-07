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

  /* ⚠ LE MAGHREB N'EST PAS SUR reu.php (07/10/2026). reu.php donne 7
   *   réunions (R1→R7) ; R9 (Khemisset, Maroc) n'y est pas — et
   *   `reu.php?view=detail&…&reunion=R9` répond 2 371 o : une page vide.
   *   Sans ce complément, le lien « R9 » du Programme mène à « course
   *   indisponible ». On complète donc avec l'API du programme, qui donne
   *   pays /hippodrome / courses. Le DÉTAIL des partants reste celui de
   *   reu.php quand il existe ; sinon l'API, et le fichier est marqué
   *   `source: programme` pour qu'on sache d'où viennent les chiffres. */
  try {
    const r = await fetch('https://pro.casacourses.com/api/programme?date=' + date, { headers: { Accept: 'application/json' } })
    const j = await r.json()
    for (const m of j.meetings || []) {
      if (!/^(MA|MAR|MAROC)$/i.test(String(m.country || ''))) continue
      const num = parseInt(String(m.reunion_code || '').replace(/\D+/g, ''), 10)
      if (!Number.isFinite(num)) continue
      const dejaVu = reunions.find((x) => x.courses.some((c) => Number(String(c.reunion).replace(/\D/g, '')) === num))
      if (dejaVu) continue   // reu.php l'a déjà publiée
      const courses = (m.races || []).map((rc) => ({
        date, reunion: 'R' + num, code: 'C' + String(rc.code || '').replace(/\D/g, ''),
        pays: 'MAROC', nom: rc.name || '', heure: rc.time_hm || '',
      })).filter((c) => c.code !== 'C0')
      if (courses.length) {
        reunions.push({ hippodrome: String(m.track || m.label || ''), pays: 'MAROC', courses })
        for (const c of courses) toutes.push({ ...c, hippo: m.track || m.label })
      }
    }
    ecrire(`reu/prog-${date}.json`, { date, reunions, collecteLe: new Date().toISOString() })
  } catch (e) { /* le Maghreb est un complément, jamais un bloquant */ }

  console.log(`  programme : ${reunions.length} réunions, ${toutes.length} courses`)

  let ok = 0, ko = 0
  for (const c of toutes) {
    const rNum = Number(String(c.reunion).replace(/\D/g, ''))
    const cNum = Number(String(c.code).replace(/\D/g, ''))
    const pays = c.pays || 'FRANCE'
    let obj = null
    // ① reu.php : la source de référence (elle donne les noms, les poids,
    //    la musique, les_RESULTATS_). Pour le Maghreb elle ne répond pas.
    try {
      const det = await chargerDetailReu(date, rNum, cNum, pays)
      obj = normaliserDetailReu(det, rNum, cNum, pays, 'Turf-France · reu.php')
    } catch (e) { /* on tente l'API */ }

    // ② l'API du programme, pour ce que reu.php ne publie pas (Maroc).
    //    ⚠ 07/10 : e-sorec d'abord (il donne le NOM du cheval, le jockey,
    //    l'entraîneur, le poids, la forme) ; casacourses ensuite (noms vides,
    //    donc on ne garde que ce qui existe, jamais de relleno — §7).
    if (!obj) {
      // ②a e-sorec : le seul qui nomme les chevaux du Maghreb
      try {
        const prog = await fetch('https://e-sorec.ma/api/meetings?date=' + date, { headers: { Accept: 'application/json' } }).then((x) => x.json())
        const ev = (prog?.content?.events || []).find((x) => Number(String(x.code || '').replace(/\D/g, '')) === rNum)
        const rc = ev && (ev.races || []).find((x) => Number(String(x.code || '').replace(/\D/g, '')) === cNum)
        if (rc?.id) {
          const det = await fetch('https://e-sorec.ma/api/races/' + rc.id, { headers: { Accept: 'application/json' } }).then((x) => x.json())
          const ct = det?.content || {}
          const partants = (ct.runners || []).filter((r2) => r2.startnr).map((r2) => ({
            num: r2.startnr,
            nom: String(r2.horse?.name || '').replace(/\s*\([^)]*\)\s*$/, ''),
            poids: r2.weight ?? null,
            jockey: r2.rider?.name || '',
            entraineur: r2.horse?.trainer || '',
            valeur: null,
            musique: (r2.horse?.forms || []).map((f) => `${f.pos || ''}${f.running || ''}`).join(' ') || '',
            place: r2.finishorder || null,
          }))
          if (partants.length) {
            obj = {
              v: 2, pv: 4, source: 'e-sorec (reu.php ne publie pas ce pays)',
              race: {
                numOrdre: cNum, nom: ct.name || rc.name || '', distance: ct.distance || null,
                type: ct.type || '', date, nbPartants: partants.length,
                meteo: ct.weather_temp != null ? String(ct.weather_temp) : null,
              },
              meeting: {
                num: rNum, hippodrome: String(ev.track || '').replace(/\s*\([^)]*\)\s*$/, ''),
                pays: String(ev.country || pays).trim().toUpperCase(),
              },
              participants: partants,
              arrivee: (ct.runners || []).filter((r2) => r2.finishorder)
                .sort((a, b) => a.finishorder - b.finishorder).map((r2) => r2.startnr),
              contenuBrut: null,
            }
          }
        }
      } catch (e2) { /* e-sorec indisponible : on tente casacourses */ }

      // ②b casacourses : les identifiants sont là, pas toujours les noms
      if (!obj) {
        try {
          const r = await fetch('https://pro.casacourses.com/api/programme?date=' + date, { headers: { Accept: 'application/json' } })
          const j = await r.json()
          const m = (j.meetings || []).find((x) => Number(String(x.reunion_code || '').replace(/\D/g, '')) === rNum)
          const rc = m && (m.races || []).find((x) => Number(String(x.code || '').replace(/\D/g, '')) === cNum)
          if (rc && rc.id) {
            const det = await fetch(`https://pro.casacourses.com/api/race/${rc.id}`, { headers: { Accept: 'application/json' } }).then((x) => x.json())
            const partants = (det.runners || []).filter((r2) => r2.number).map((r2) => ({
              num: r2.number, nom: r2.name || '', poids: r2.weight ?? null,
              jockey: r2.jockey || '', entraineur: r2.trainer || '', valeur: r2.value ?? null,
              musique: r2.musique || '', place: r2.finish ?? null,
            }))
            if (partants.length) {
              obj = {
                v: 2, pv: 4, source: 'API programme (noms indisponibles)',
                race: { numOrdre: cNum, nom: rc.name || '', distance: rc.distance || null, type: rc.type || '', date, nbPartants: partants.length },
                meeting: { num: rNum, hippodrome: String(m.track || m.label || ''), pays: String(m.country || pays).toUpperCase() },
                participants: partants,
                arrivee: (rc.finish_order || []).map(Number).filter(Number.isFinite),
                contenuBrut: null,
              }
            }
          }
        } catch (e3) { /* ni l'un ni l'autre : on compte un échec */ }
      }
    }

    if (obj && obj.participants?.length) {
      obj.collecteLe = new Date().toISOString()
      ecrire('reu/' + nomFichierCourse(date, rNum, cNum, pays), obj)
      ok++
      process.stdout.write(`  ✓ R${rNum}-C${cNum} ${(c.nom || '').slice(0, 34).padEnd(36)} ${obj.participants.length}p\r`)
    } else {
      ko++
      console.log(`\n  ✗ R${rNum}-C${cNum} ${(c.nom || '').slice(0, 30)} : aucune source`.slice(0, 130))
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
