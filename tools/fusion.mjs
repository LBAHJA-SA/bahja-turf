/* ---------------------------------------------------------------
 * tools\fusion.mjs  —  ⭐ FUSION DES TROIS SOURCES EN UN CORPUS UNIQUE
 *
 *   node tools\fusion.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Construit un fichier de travail, rien d'autre.
 *
 * LES TROIS SOURCES
 *
 *   A  data\corpus\archive-94.json     94 Quintés  2026-02→07   ✓ PRESSE
 *   B  data\quintes.json               280 Quintés  2026-01→10   ✗ presse
 *   C  Desktop\archive\*.json          69 Quintés  2024-09→2025-10  ✗ presse
 *
 *   A est déjà le produit des deux autres. B le recouvre en grande partie.
 *   On ne garde donc que ce qui est VRAIMENT nouveau, et on marque
 *   chaque course par sa source pour pouvoir mesurer séparément.
 *
 * CE QUI EST NORMALISÉ (identique partout)
 *   cle · date · hippodrome · discipline · distance · nbPartants
 *   cotes {num: cote} · ouverture {num: cote} · arrivee [] · presse [] | null
 *
 * ⚠ L'ORDRE DE RÉFÉRENCE
 *   99 courses sur 443 ont la presse. Les 344 autres non.
 *   Mélanger les deux rendrait la mesure illisible.
 *   On produit donc DEUX colonnes d'ordre :
 *     ordrePresse  — la méthode, quand la presse existe
 *     ordreCote    — le remplaçant, toujours disponible
 *   Et la mesure dira Which one keeps the fingerprint.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DESKTOP = 'C:/Users/sam/Desktop/archive'
const SORTIE = path.join(RACINE, 'data', 'corpus', 'fusion.json')

const lire = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }

/* ═══════════════ source A — le corpus 94 (avec presse) ═══════════ */
const A = lire(path.join(RACINE, 'data', 'corpus', 'archive-94.json'))
const srcA = (A.courses || []).map((c) => ({
  cle: c.cle, date: c.date, hippodrome: c.hippodrome || '',
  discipline: c.discipline || '', distance: c.distance || null,
  nbPartants: c.nbPartants || (c.presse || []).length,
  cotes: c.cotes || {}, ouverture: c.ouverture || {},
  arrivee: c.arrivee || [], presse: (c.presse || []).slice(),
  source: 'A', presseDispo: true,
}))

/* ═══════════════ source B — data\quintes.json ════════════════════ */
const B = lire(path.join(RACINE, 'data', 'quintes.json')) || {}
const srcB = Object.values(B).map((c) => {
  const p = Array.isArray(c.presse) ? c.presse.slice() : []
  return {
    cle: c.date + '_' + (c.code || ''), date: c.date, hippodrome: c.track || '',
    discipline: c.discipline || '', distance: c.distance || null,
    nbPartants: c.nb || (c.arrivee || []).length,
    cotes: c.cotes || {}, ouverture: c.ouverture || {},
    arrivee: c.arrivee || [], presse: p,
    source: 'B', presseDispo: p.length >= 5,
  }
})

/* ═══════════════ source C — Desktop\archive ═════════════════════ */
const RE = /^race_R(\d+)_C(\d+)_(\d{4}-\d{2}-\d{2})\.json$/
const srcC = []
if (fs.existsSync(DESKTOP)) {
  for (const f of fs.readdirSync(DESKTOP)) {
    const m = f.match(RE)
    if (!m) continue
    const j = lire(path.join(DESKTOP, f))
    if (!j || !j.course) continue
    const co = j.course
    if (!/QUINTE_PLUS|quinte/i.test(JSON.stringify(co.types_pari || []))) continue
    const ps = (j.participants || []).filter((p) => !p.nonPartant)
    const cotes = {}
    const partants = []
    for (const p of ps) {
      if (!p.num) continue
      partants.push(p.num)
      if (p.cote_pmu > 0) cotes[p.num] = p.cote_pmu
    }
    /* l'arrivéeDesktop vient en [[5],[16],...] : on aplatit */
    const arrivee = []
    for (const x of (co.arrivee || [])) {
      const v = Array.isArray(x) ? x[0] : x
      if (v != null) arrivee.push(Number(v))
    }
    srcC.push({
      cle: m[3] + '_R' + m[1] + '_C' + m[2], date: m[3],
      hippodrome: ((j.reunion || {}).libelle) || '', discipline: co.discipline || '',
      distance: co.distance || null, nbPartants: co.runners || partants.length,
      cotes, ouverture: {}, arrivee, presse: [],
      source: 'C', presseDispo: false,
    })
  }
}

/* ═══════════════════════ dédoublonnage ═══════════════════════════ */
const tous = [...srcA, ...srcB, ...srcC]
const parDate = new Map()
for (const c of tous) {
  const av = c.arrivee.slice(0, 5)
  if (av.length < 5) continue
  if (Object.keys(c.cotes).length < 5) continue
  if (!c.presse.length) c.ordreCote = Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a] - c.cotes[b])
  else c.ordreCote = Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a] - c.cotes[b])
  c.ordrePresse = c.presse.slice()
  const cleD = c.date + '|' + av.join('-')
  const ancien = parDate.get(cleD)
  /* priorité : A (presse) > B > C */
  const rang = { A: 3, B: 2, C: 1 }
  if (!ancien || rang[c.source] > rang[ancien.source]) parDate.set(cleD, c)
}
const fusion = [...parDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  FUSION DES TROIS SOURCES')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  A  archive-94.json      ' + String(srcA.length).padStart(4) + ' Quintés   avec presse')
console.log('  B  data\\quintes.json    ' + String(srcB.length).padStart(4) + ' Quintés   ' + srcB.filter((c) => c.presseDispo).length + ' avec presse')
console.log('  C  Desktop\\archive      ' + String(srcC.length).padStart(4) + ' Quintés   sans presse')
console.log('  ' + '-'.repeat(62))
console.log('  brut                     ' + String(tous.length).padStart(4))
console.log('  retenus (arrivée+cotes)  ' + String(fusion.length).padStart(4))
console.log('')

const parSrc = { A: 0, B: 0, C: 0 }
const parMois = {}
let avecPresse = 0
for (const c of fusion) {
  parSrc[c.source]++
  const m = c.date.slice(0, 7)
  parMois[m] = (parMois[m] || 0) + 1
  if (c.presseDispo) avecPresse++
}
console.log('  après dédoublonnage, course par source :')
console.log('     A (corpus 94)   ' + String(parSrc.A).padStart(4))
console.log('     B (quintes)     ' + String(parSrc.B).padStart(4))
console.log('     C (Desktop)     ' + String(parSrc.C).padStart(4) + '   ← tout est nouveau')
console.log('')
console.log('  ⭐ avec presse : ' + avecPresse + ' / ' + fusion.length
  + '   (' + (avecPresse / fusion.length * 100).toFixed(0) + ' %)')
console.log('')
console.log('  par mois :')
const mois = Object.keys(parMois).sort()
for (const m of mois) {
  const v = parMois[m]
  const an = m.slice(0, 4)
  console.log('     ' + m + '  ' + String(v).padStart(3) + '  ' + '█'.repeat(Math.ceil(v / 2))
    + (an === '2024' || an === '2025' ? '   ← période INCONNUE' : ''))
}
console.log('')

/* les périodes qu'on va utiliser */
const periodes = [
  ['P1 · 2024-09 → 2025-10', '2024-01-01', '2025-12-31'],
  ['P2 · 2026-01 → 2026-03', '2026-01-01', '2026-03-31'],
  ['P3 · 2026-04 → 2026-06', '2026-04-01', '2026-06-30'],
  ['P4 · 2026-07 → 2026-10', '2026-07-01', '2026-12-31'],
]
console.log('  les 4 périodes :')
for (const [lib, a, b] of periodes) {
  const v = fusion.filter((c) => c.date >= a && c.date <= b)
  const av = v.filter((c) => c.date <= '2026-07-07' && c.date >= '2026-02-09').length
  console.log('     ' + lib.padEnd(24) + String(v.length).padStart(4) + ' Quintés'
    + '   dont ' + av + ' déjà connus (corpus 94)')
}
console.log('')

fs.mkdirSync(path.dirname(SORTIE), { recursive: true })
fs.writeFileSync(SORTIE, JSON.stringify({
  meta: {
    genere: new Date().toISOString().slice(0, 10),
    nb: fusion.length,
    avecPresse,
    periode: [fusion[0].date, fusion[fusion.length - 1].date],
    note: 'ordrePresse = la méthode · ordreCote = le remplaçant, toujours là',
  },
  courses: fusion,
}, null, 0), 'utf8')
console.log('  → ' + SORTIE)
console.log('')