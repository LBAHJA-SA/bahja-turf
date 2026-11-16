/* tools/dna-index2.mjs — index enrichi de archives/ (LECTURE SEULE).
 *
 * Deux corrections par rapport à dna-archive-index.mjs :
 *   ① l'arrivée est aussi dans `course.arrivee` ([[num],[num],…]) : on la lit,
 *      au lieu de dépendre du seul `participant.rang` ;
 *   ② on garde les colonnes jetées : gain, nombreCourses/Victoires/Places,
 *      valeur, poids, corde, déferrage, aller/surface — donc la CLASSE du
 *      cheval, pas seulement sa musique.
 *
 * Écrit data/dna-index2.json (non versionné).
 */
import fs from 'node:fs'
import path from 'node:path'

const out = []
let files = 0, bad = 0, parRang = 0, parArrivee = 0

function walk(dir) {
  let ents
  try { ents = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of ents) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.isFile() && e.name.endsWith('.json')) readFile(p)
  }
}

const numOf = (x) => Number(Array.isArray(x) ? x[0] : x)

function readFile(p) {
  files++
  let j
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')) } catch { bad++; return }
  const c = j.course || {}
  const r = j.reunion || {}
  const parts = j.participants || []
  if (!parts.length) { bad++; return }
  const date = r.date || (p.match(/(\d{4}-\d{2}-\d{2})/) || [])[1]
  if (!date) { bad++; return }

  /* arrivée : [[8],[7],…] ou [8,7,…] */
  const arrivee = new Map()
  if (Array.isArray(c.arrivee) && c.arrivee.length) {
    c.arrivee.forEach((x, i) => { const n = numOf(x); if (Number.isFinite(n) && !arrivee.has(n)) arrivee.set(n, i + 1) })
  }

  const ps = []
  for (const x of parts) {
    const num = Number(x.num)
    let rang = Number(x.rang)
    if (Number.isFinite(rang) && rang > 0) parRang++
    else { const a = arrivee.get(num); rang = a || null; if (a) parArrivee++ }
    if (x.nonPartant || /NON_PARTANT/i.test(String(x.statut || ''))) continue
    ps.push({
      n: num,
      r: rang == null ? null : rang,
      c: Number(x.cote_pmu) || null,
      m: x.musique || '',
      a: Number(x.age) || null,
      g: Number(x.gain) || 0,
      nc: Number(x.nombreCourses) || 0,
      nv: Number(x.nombreVictoires) || 0,
      np: Number(x.nombrePlaces) || 0,
      v: x.valeur == null ? null : Number(x.valeur),
      p: x.poids == null ? null : Number(x.poids),
      cd: x.corde == null ? null : Number(x.corde),
      d: x.deferre || '',
      j: x.jockey || '',
      t: x.trainer || '',
      s: x.sexe || '',
    })
  }
  if (!ps.length) { bad++; return }

  out.push({
    file: p.replace(/\\/g, '/'),
    date,
    hippo: String(r.hippodrome || '').toUpperCase().trim(),
    disc: String(c.discipline || c.specialty || '').toUpperCase().trim(),
    distance: Number(c.distance) || 0,
    going: c.going == null ? '' : String(c.going),
    surface: c.surface == null ? '' : String(c.surface),
    classe: c.classe == null ? '' : String(c.classe),
    quinte: !!c.quinte,
    ps,
  })
}

walk('archives')
console.log('fichiers lus', files, '· ignorés', bad, '· courses', out.length)
console.log('rangs trouvés : par participant', parRang, '· par arrivee', parArrivee)

const withArr = out.filter((c) => c.ps.filter((p) => p.r != null).length >= 3)
console.log('courses avec arrivée (≥3) :', withArr.length)
const withGain = out.filter((c) => c.ps.filter((p) => p.g > 0).length >= 3).length
const withVal = out.filter((c) => c.ps.filter((p) => p.v != null).length >= 3).length
const withPds = out.filter((c) => c.ps.filter((p) => p.p != null).length >= 3).length
const withCd = out.filter((c) => c.ps.filter((p) => p.cd != null).length >= 3).length
console.log('courses avec gain', withGain, '· valeur', withVal, '· poids', withPds, '· corde', withCd)

const dates = out.map((c) => c.date).sort()
console.log('dates', dates[0], '->', dates[dates.length - 1])

fs.writeFileSync('data/dna-index2.json', JSON.stringify(out))
console.log('-> data/dna-index2.json (' + (fs.statSync('data/dna-index2.json').size / 1e6).toFixed(1) + ' Mo)')
