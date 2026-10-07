/* Backfill scores[] pour les courses déjà archivées (ne touche NI ticket NI arrivée).
   Usage : node tools/backfill-scores.mjs */
import fs from 'node:fs'
import path from 'node:path'
const R = process.cwd()
const q = await import('../src/lib/quinte.js')

const F = path.join(R, 'data', 'synthese.json')
const db = JSON.parse(fs.readFileSync(F, 'utf8'))
const carsDisk = (() => { try { return JSON.parse(fs.readFileSync(path.join(R, 'data', 'carriere.json'), 'utf8')) } catch (e) { return {} } })()

for (const date of Object.keys(db).sort()) {
  const rec = db[date]
  if (!rec.synthese?.length || (rec.scores?.length)) { console.log(date, ': déjà fait'); continue }
  try {
    const course = await q.chargerCourseCC(date, rec.synthese)
    if (!course?.participants?.length) { console.log(date, ': pas de course'); continue }
    const fid = course.raw?.reunion_code && course.raw?.code
      ? `${date}_${course.raw.reunion_code}_${course.raw.code}` : null
    let cars = carsDisk[date] || null
    let mode = 'manuel'
    if ((!cars || !Object.keys(cars).length) && fid) {
      try {
        const a = await q.autoCarriere(fid, () => {})
        cars = q.parseCarriere(a.texte)
        mode = 'auto-carriere'
      } catch (e) { console.log(date, ': carriere auto KO (' + e.message + ')'); continue }
    }
    if (!cars || !Object.keys(cars).length) { console.log(date, ': pas de carrière'); continue }
    const courseJour = { dist: course.distance || 2500, surf: /ATTELE|TROT/i.test(course.discipline || '') ? 'PSF' : 'Gazon', sens: 'D', discipline: course.discipline || 'PLAT', hippo: course.hippodrome || '' }
    const sc = []
    for (const p of course.participants) {
      const runs = cars[p.num]
      if (!runs?.length) continue
      sc.push({ p, s: q.scorePhysique(p, runs, courseJour), f: q.filtres(p, runs, courseJour) })
    }
    if (!sc.length) { console.log(date, ': aucun score'); continue }
    const pris = new Set(rec.ticket || [])
    rec.scores = sc.map((x) => ({ num: x.p.num, nom: x.p.horse || x.p.nom || '', global: x.s?.global ?? null, forme: x.s?.score ?? x.s?.forme ?? null, dist: x.s?.dist ?? null, piste: x.s?.piste ?? null, niveau: x.s?.niveau ?? null, terrain: x.s?.terrain ?? null, corde: x.s?.corde ?? null, filtres: (x.f || []).map((f) => !!f.ok), pris: pris.has(x.p.num) }))
    console.log(`${date} : ${rec.scores.length} scores (${mode}), ticket [${(rec.ticket || []).join(' ')}] vs arrivée [${(rec.arrivee || []).join('-') || '?'}]`)
  } catch (e) { console.log(date, ': ERREUR ' + e.message) }
}
fs.writeFileSync(F, JSON.stringify(db, null, 2), 'utf8')
try { fs.mkdirSync(path.join(R, 'public', 'data'), { recursive: true }); fs.writeFileSync(path.join(R, 'public', 'data', 'synthese.json'), JSON.stringify(db, null, 2), 'utf8') } catch (e) {}
console.log('TERMINE')
