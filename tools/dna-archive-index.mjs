/* tools/dna-archive-index.mjs — construit l'index des courses de archives/ (lecture seule)
 * pour mesurer une empreinte PAR TYPE DE COURSE. Ne modifie jamais archives/. */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'archives'
const out = []
let files = 0, bad = 0

function walk(dir) {
  let ents
  try { ents = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of ents) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.isFile() && e.name.endsWith('.json')) readFile(p)
  }
}

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
  const course = {
    file: p.replace(/\\/g, '/'),
    date,
    hippo: String(r.hippodrome || '').toUpperCase().trim(),
    r: r.num ?? null,
    c: c.num ?? null,
    disc: String(c.discipline || c.specialty || '').toUpperCase().trim(),
    distance: Number(c.distance) || 0,
    quinte: !!c.quinte,
    runners: parts.length,
    ps: [],
  }
  for (const x of parts) {
    const rang = Number(x.rang)
    course.ps.push({
      num: Number(x.num),
      id: String(x.horse_id || ''),
      nom: x.horse || '',
      age: Number(x.age) || null,
      sexe: x.sexe || null,
      musique: x.musique || '',
      cote: Number(x.cote_pmu) || null,
      rang: Number.isFinite(rang) && rang > 0 ? rang : null,
      deferre: x.deferre || null,
      jockey: x.jockey || '',
      trainer: x.trainer || '',
    })
  }
  out.push(course)
}

walk(ROOT)
console.log('fichiers lus :', files, '| ignorés :', bad, '| courses gardées :', out.length)

const byDisc = {}
for (const c of out) byDisc[c.disc] = (byDisc[c.disc] || 0) + 1
console.log('\npar discipline :')
for (const [k, v] of Object.entries(byDisc).sort((a, b) => b[1] - a[1])) console.log('  ' + k.padEnd(10) + v)

const dates = out.map((c) => c.date).sort()
console.log('\ndates :', dates[0], '->', dates[dates.length - 1])
const withRang = out.filter((c) => c.ps.filter((p) => p.rang != null).length >= 3).length
console.log('courses avec arrivée (rang) :', withRang)
const withCote = out.filter((c) => c.ps.filter((p) => p.cote != null).length >= 3).length
console.log('courses avec cotes :', withCote)
const withMusique = out.filter((c) => c.ps.filter((p) => /[0-9]/.test(p.musique || '')).length >= 3).length
console.log('courses avec musique :', withMusique)

fs.writeFileSync('data/dna-archive-index.json', JSON.stringify(out))
console.log('\n-> data/dna-archive-index.json (' + (fs.statSync('data/dna-archive-index.json').size / 1e6).toFixed(1) + ' Mo)')
