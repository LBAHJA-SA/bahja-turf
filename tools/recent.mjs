/* =============================================================================
 * tools/recent.mjs — LE MOTEUR D'AUJOURD'HUI SUR LES 18 DERNIÈRES COURSES
 *                    (20/10/2026)
 *
 * Les 96 Quintés de référence (data/quintes.json) vont de février à juillet.
 * Les 18 courses clôturées de l'archive (2 → 19 octobre) sont donc un vrai
 * HORS ÉCHANTILLON : elles n'ont servi à choisir NI les quotas 4-2-1-1-0, NI
 * la règle « G1-G3 carnet · G4 marché ».
 *
 * On rejoue le VRAI moteur (`buildGrid` + `remplirGrille`), avec les cotes
 * réelles d'Equidia (`data/cotes.json`), et on compare :
 *   ① le ticket ARCHIVÉ (celui qui a été joué)
 *   ② le ticket du MOTEUR ACTUEL (4-2-1-1-0)
 *
 *   node tools\recent.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, ticketValide } from '../src/lib/quinte.js'

const pad = (s, n) => String(s).padEnd(n)
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')

const BRUT = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const TOUT = Array.isArray(BRUT) ? BRUT : Object.values(BRUT)
const COTES = JSON.parse(fs.readFileSync('data/cotes.json', 'utf8'))

function cotesDe(a) {
  const c = COTES[a.cle] || (a.courseId && COTES[a.courseId]) || null
  if (!c) return null
  const liste = Array.isArray(c) ? c : c.cotes || []
  if (liste.length < 10) return null
  const out = {}
  for (const x of liste) {
    const n = Number(x.num)
    const v = Number(x.cote)
    if (Number.isFinite(n) && Number.isFinite(v) && v > 0) out[n] = { cote: v, ouverture: x.ouverture ?? null }
  }
  return Object.keys(out).length >= 10 ? out : null
}

const COURSES = TOUT
  .filter((a) => a && a.date && (a.arrivee || []).length >= 5 && (a.ticket || []).length)
  .sort((x, y) => String(x.date).localeCompare(String(y.date)))

const res = []
for (const a of COURSES) {
  const nums = (a.runners || []).map(Number).filter(Number.isFinite)
  const syn = (a.synthese || []).map(Number).filter(Number.isFinite)
  if (nums.length < 8 || syn.length < 8) continue
  const grille = buildGrid(syn, nums)
  /* ⚠ 20/10/2026 — MÊME classement que tools/experiences.mjs (cases par slot),
     et la VRAIE discipline du jour. Les deux entrées sont inertes dans
     `remplirGrille` (tools/audit-entrees.mjs) ; on les aligne pour que la seule
     différence entre les deux outils soit le corpus. */
  const classement = grille.groupes.flatMap((g) => g.cases).slice()
    .sort((x, y) => x.slot - y.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const discipline = a.discipline || a.race?.discipline || ''
  const cotes = cotesDe(a)
  const rempli = remplirGrille(grille, classement, discipline, cotes, null)
  const moteur = rempli.ticket.map(Number)
  const archive = ticketValide(a).map(Number)
  const arr = (a.arrivee || []).map(Number)
  const noter = (t) => {
    const s = new Set(t)
    return {
      n: t.length,
      x5: arr.filter((n) => s.has(n)).length,
      podium: arr.slice(0, 3).every((n) => s.has(n)),
      top3: arr.slice(0, 3).filter((n) => s.has(n)).length,
      ge4: arr.filter((n) => s.has(n)).length >= 4,
      premier: s.has(arr[0]),
    }
  }
  res.push({ date: a.date, arr, moteur, archive, cotes: cotes ? 'oui' : 'non', A: noter(archive), M: noter(moteur) })
}

const N = res.length
const s = (k, f = (x) => x) => res.reduce((t, r) => t + (f(r[k]) ? 1 : 0), 0)
const sum = (k, f) => res.reduce((t, r) => t + f(r[k]), 0)

console.log('')
console.log('  LE MOTEUR ACTUEL (4-2-1-1-0) SUR LES ' + N + ' DERNIÈRES COURSES — hors échantillon')
console.log('  cotes Equidia disponibles : ' + res.filter((r) => r.cotes === 'oui').length + '/' + N)
console.log('')
console.log('  ' + pad('date', 11) + pad('arrivée', 17) + pad('ticket moteur', 26) + pad('x/5', 6) + pad('ticket archivé', 26) + 'x/5')
for (const r of res) {
  console.log('  ' + pad(r.date, 11) + pad(r.arr.join('-'), 17) + pad(r.moteur.join(' ') + ' (' + r.M.n + ')', 26) +
    pad(r.M.x5 + '/5', 6) + pad(r.archive.join(' '), 26) + r.A.x5 + '/5')
}
console.log('')
console.log('  ' + pad('', 22) + pad('MOTEUR 4-2-1-1-0', 20) + 'ARCHIVE (joué)')
console.log('  ' + pad('podium entier', 22) + pad(pct(s('M', (x) => x.podium), N), 20) + pct(s('A', (x) => x.podium), N))
console.log('  ' + pad('quinté entier', 22) + pad(pct(s('M', (x) => x.x5 === 5), N), 20) + pct(s('A', (x) => x.x5 === 5), N))
console.log('  ' + pad('≥ 4/5', 22) + pad(pct(s('M', (x) => x.ge4), N), 20) + pct(s('A', (x) => x.ge4), N))
console.log('  ' + pad('1er trouvé', 22) + pad(pct(s('M', (x) => x.premier), N), 20) + pct(s('A', (x) => x.premier), N))
console.log('  ' + pad('arrivants couverts', 22) + pad(sum('M', (x) => x.x5) + ' / ' + 5 * N, 20) + sum('A', (x) => x.x5) + ' / ' + 5 * N)
console.log('  ' + pad('longueur du ticket', 22) + pad((sum('M', (x) => x.n) / N).toFixed(2), 20) + (sum('A', (x) => x.n) / N).toFixed(2))
console.log('')
