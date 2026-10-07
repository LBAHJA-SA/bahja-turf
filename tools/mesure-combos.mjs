/* ---------------------------------------------------------------
 * tools\mesure-combos.mjs  —  ⭐ LE PODIUM COMME UNE SEULE UNITÉ
 *
 *   node tools\mesure-combos.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *   Ici on ne lit rien d'autre que `data\corpus\archive-94.json`.
 *
 * LA MÉTHODE, telle qu'elle est fixée :
 *
 *   1. l'unité analysée = le PODIUM ENTIER (1er + 2e + 3e), jamais séparé
 *   2. chaque podium est converti en une COMBINAISON de groupes
 *        P2 – P6 – P11  →  G1 + G2 + G4
 *   3. on compte ces combinaisons sur les 94 Quintés
 *   4. et on regarde si 3-2-1-1-1 attrape 3/3, 2/3, 1/3 ou 0/3
 *
 * ⭐ LE POINT CLÉ DU TABLEAU : certaines combinaisons sont
 * **structurellement impossibles**. G3+G3+G3 demande 3 chevaux dans G3,
 * alors que le quota de G3 est 1. Aucun sélecteur, aucun marché, aucune
 * improves ne peut donner 3/3 là-dessus. Ce n'est pas une faute du moteur :
 * c'est la forme de la méthode. On le sépare donc explicitement.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 }, { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 }, { id: 'G5', min: 13, max: 99 },
]
const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = []
for (const k of fichier.courses) {
  const nums = k.presse
  const pDe = new Map(nums.map((x, i) => [x, i + 1]))
  const blocs = BLOCS.map((b) => nums.filter((num) => { const p = pDe.get(num); return p >= b.min && p <= b.max }))
  base.push({ ...k, pDe, blocs, podium: k.podium })
}
const n = base.length
const blocDe = (k, num) => BLOCS.findIndex((b) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max })

const remplir = {
  cote: (k, bloc) => bloc.slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999)),
  presse: (k, bloc) => bloc.slice().sort((a, b) => k.pDe.get(a) - k.pDe.get(b)),
}
const ticket = (k, mode) => BLOCS.flatMap((b, i) => remplir[mode](k, k.blocs[i]).slice(0, QUOTA[b.id]))

const clef = (combo) => combo.join('+')
const p = (v) => (v / n * 100).toFixed(1)

/* ═══════════════════════ TOUTES LES COMBINAISONS ═══════════════════════ */
const combos = []
for (let a = 0; a < 5; a++) for (let b = a; b < 5; b++) for (let c = b; c < 5; c++) {
  const liste = [a, b, c].sort((x, y) => x - y)
  const compte = {}
  liste.forEach((i) => { compte[BLOCS[i].id] = (compte[BLOCS[i].id] || 0) + 1 })
  const possible = Object.entries(compte).every(([id, v]) => v <= QUOTA[id])
  combos.push({ cle: liste.map((i) => BLOCS[i].id).join('+'), possible, compte })
}

/* ═════════════════════ le tableau principal ════════════════════════════ */
const lignes = combos.map((c) => {
  const idx = BLOCS.map((b) => b.id)
  const cleBlocs = c.cle.split('+')
  const courses = base.filter((k) => clef(k.podium.map((x) => BLOCS[blocDe(k, x)].id).sort((a, b) => idx.indexOf(a) - idx.indexOf(b))) === c.cle)
  const r = { ...c, nb: courses.length, parMode: {} }
  for (const mode of ['cote', 'presse']) {
    const rep = [0, 0, 0, 0]
    const perdusParBloc = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
    for (const k of courses) {
      const tk = new Set(ticket(k, mode))
      const h = k.podium.filter((x) => tk.has(x)).length
      rep[h]++
      k.podium.forEach((x) => { if (!tk.has(x)) perdusParBloc[BLOCS[blocDe(k, x)].id]++ })
    }
    r.parMode[mode] = { rep, perdusParBloc }
  }
  return r
}).filter((x) => x.nb > 0).sort((a, b) => b.nb - a.nb)

console.log('')
console.log(`  ⭐ LE PODIUM COMME UNE UNITÉ — ${n} Quintés, quotas 3-2-1-1-1 intacts`)
console.log('')
console.log('  ⭐ une combinaison marquée IMPOSSIBLE demande plus de chevaux dans un bloc')
console.log('     que son quota. Aucun remplissage ne peut la gagner — même parfait.')
console.log('')
console.log('  combinaison du podium        nb   impossible   3/3    2/3    1/3    0/3   |  ≥2/3    attrapé')
console.log('  ' + '-'.repeat(94))
let totImpossible = 0
let totPossible = 0
for (const l of lignes) {
  const r = l.parMode.cote.rep
  /* ⚠ `rep` est indexé par le NOMBRE TROUVÉ : rep[0]=0/3 … rep[3]=3/3.
   * L'ordre d'affichage est donc l'inverse de l'ordre naturel. */
  const ge2 = ((r[3] + r[2]) / l.nb * 100).toFixed(0).padStart(5) + ' %'
  const att = (r.reduce((s, v) => s + v, 0) / (l.nb * 3) * 100).toFixed(0).padStart(8) + ' %'
  const marque = l.possible ? '          ' : '   OUI    '
  console.log('  ' + l.cle.padEnd(26) + String(l.nb).padStart(3) + marque
    + String(r[3]).padStart(4) + String(r[2]).padStart(6) + String(r[1]).padStart(6) + String(r[0]).padStart(6)
    + '  |  ' + ge2 + att)
  if (l.possible) totPossible += l.nb
  else totImpossible += l.nb
}
console.log('  ' + '-'.repeat(94))
console.log('  courses ATTEIGNABLES par 3-2-1-1-1 : ' + totPossible + '  ·  STRUCTURELLEMENT IMPOSSIBLES : ' + totImpossible
  + '  (' + (totImpossible / n * 100).toFixed(0) + ' %)')
console.log('')

/* ═══════════ les ATTEIGNABLES où l'on échoue ═══════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  LES COMBINAISIONS ATTEIGNABLES OÙ 3-2-1-1-1 ÉCHOUE           ║')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const echecs = lignes.filter((l) => l.possible && l.parMode.cote.rep[3] < l.nb)
  .sort((a, b) => (b.parMode.cote.rep[2] + b.parMode.cote.rep[1] + b.parMode.cote.rep[0]) - (a.parMode.cote.rep[2] + a.parMode.cote.rep[1] + a.parMode.cote.rep[0]))
if (!echecs.length) console.log('  (aucune)')
for (const l of echecs) {
  const [a, b, d] = l.parMode.cote.rep
  const [ap, bp] = l.parMode.presse.rep
  const perd = l.parMode.cote.perdusParBloc
  const totalPerd = Object.values(perd).reduce((s, v) => s + v, 0)
  console.log('  ' + l.cle.padEnd(26) + l.nb + ' courses   3/3 ' + a + ' · 2/3 ' + b + ' · 1/3 ' + d + ' · 0/3 ' + l.parMode.cote.rep[0])
  console.log('  ' + ''.padEnd(26) + '   avec la presse : 3/3 ' + ap + ' · 2/3 ' + bp)
  console.log('  ' + ''.padEnd(26) + '   où sont les ' + totalPerd + ' perdus : '
    + BLOCS.map((x) => x.id + ' ' + perd[x.id]).join(' · '))
  console.log('  ' + ''.padEnd(26) + '   ' + BLOCS.map((x) => (totalPerd ? (perd[x.id] / totalPerd * 100).toFixed(0).padStart(3) + '%' : '  —')).join(' '))
  console.log('')
}

console.log('  (les 5 colonnes de droite : G1 · G2 · G3 · G4 · G5)')
console.log('')
