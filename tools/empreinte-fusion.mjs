/* ---------------------------------------------------------------
 * tools\empreinte-fusion.mjs  —  ⭐ LA B I C M P R E SUR 347 QUINTÉS
 *
 *   node tools\empreinte-fusion.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Mesure seule.
 *
 * LE CORPUS
 *   347 Quintés · 2024-09-12 → 2026-10-04 · 4 périodes
 *     P1 2024-09 → 2025-10    69 Quintés   ← jamais mesuré
 *     P2 2026-01 → 2026-03    72 Quintés   ← 19 connus
 *     P3 2026-04 → 2026-06    99 Quintés   ← 99 connus (le corpus 94)
 *     P4 2026-07 → 2026-10   107 Quintés   ← 7 connus
 *
 * LE PROBLÈME
 *   99 courses ont la presse, 348 non. Or la mesure précédente a montré
 *   que remplacer la presse par la cote fait chuter ≥2/3 de 84 à 72.
 *   Sur 347 courses, on ne peut donc PAS mélanger les deux ordres.
 *
 * CE QUE FAIT CET OUTIL
 *   ① le moteur A sur les 347, ordre = COTE          (le seul partout)
 *   ② le moteur A sur les 94/99, ordre = PRESSE       (la méthode)
 *   ③ le même écart sur le sous-ensemble commun         → le FACTEUR de déformation
 *   ④ 4 périodes, pour voir si le motif se RÉPÈTE
 *   ⑤ le G2 (P7 interdit) sur les 347, règle stricte + 4 périodes
 *
 * Si le Facteur de déformation est stable (≈ −10 points partout), on peut
 * lire les 4 périodes du corpus 347 avec cette correction. Sinon non.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'fusion.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]
const PERIODES = [
  ['P1 · 2024-09 → 2025-10', '2024-01-01', '2025-12-31'],
  ['P2 · 2026-01 → 2026-03', '2026-01-01', '2026-03-31'],
  ['P3 · 2026-04 → 2026-06', '2026-04-01', '2026-06-30'],
  ['P4 · 2026-07 → 2026-10', '2026-07-01', '2026-12-31'],
]

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .map((k) => ({
    ...k,
    ordreP: k.presseDispo ? k.presse.slice() : null,
    ordreC: k.ordreCote.slice(),
  }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length

/* ⚠ le rang à exclure est un rang de COTE (ordre de remplissage),
 * pas un rang de l'ordre de référence. Sinon exclure P7 revient à
 * exclure « le 3e au plus fort » et les 4 variantes se confondent. */
const numsBloc = (k, i, quel) => {
  const o = quel === 'presse' ? k.ordreP : k.ordreC
  if (!o) return []
  return o.filter((x, r) => r + 1 >= BLOCS[i].min && r + 1 <= BLOCS[i].max)
}
const ticket = (k, quel, echappe) => BLOCS.flatMap((b, i) => {
  const nums = numsBloc(k, i, quel)
  const parCote = nums.slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))
  const dis = echappe && echappe.bloque === b.id
    ? parCote.filter((x, r) => r + 1 !== echappe.rang)
    : parCote
  return dis.slice(0, b.quota)
}).filter(Boolean)

const empreinte = (idx, quel, echappe) => {
  const t3 = []; const t4 = []; const t5 = []
  for (const i of idx) {
    const k = base[i]
    if (quel === 'presse' && !k.ordreP) continue
    const tk = new Set(ticket(k, quel, echappe))
    t3.push((k.podium || k.arrivee.slice(0, 3)).filter((x) => tk.has(x)).length)
    t4.push(k.arrivee.slice(0, 4).filter((x) => tk.has(x)).length)
    t5.push(k.arrivee.slice(0, 5).filter((x) => tk.has(x)).length)
  }
  const st = (t, max) => ({
    plein: t.filter((v) => v === max).length / t.length * 100,
    ge3: t.filter((v) => v >= 3).length / t.length * 100,
    ge4: max >= 4 ? t.filter((v) => v >= 4).length / t.length * 100 : null,
    ge2: t.filter((v) => v >= Math.min(2, max)).length / t.length * 100,
    moy: t.reduce((a, b) => a + b, 0) / t.length,
  })
  return { n: t3.length, trio: st(t3, 3), quat: st(t4, 4), quint: st(t5, 5) }
}

const l = (v) => (v == null ? '   —  ' : v.toFixed(1).padStart(6))
const idxAll = base.map((_, i) => i)
const idxP = base.map((k, i) => (k.ordreP ? i : -1)).filter((i) => i >= 0)
const idxC = base.map((k, i) => (k.ordreP ? i : -1)).filter((i) => i >= 0)

const lireEmp = (e) => {
  console.log('  ' + ''.padEnd(26) + l(e.trio.plein) + l(e.trio.ge2) + '  |' + l(e.quat.plein) + l(e.quat.ge3)
    + '  |' + l(e.quint.plein) + l(e.quint.ge4) + l(e.quint.ge3) + e.quint.moy.toFixed(2).padStart(6))
}

const entete = () => {
  console.log('')
  console.log('  ' + ''.padEnd(26) + '  ① TRIO      ② QUATUOR      ③ QUINTÉ'.padEnd(0))
  console.log('  ' + ''.padEnd(26) + '  3/3    ≥2/3  |  4/4    ≥3/4  |  5/5   ≥4/5   ≥3/5   moy')
  console.log('  ' + '-'.repeat(94))
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ LA B I C M P R E SUR ' + n + ' QUINTÉS — 4 PÉRIODES')
console.log('     ' + base[0].date + ' → ' + base[n - 1].date)
console.log('')

console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① LE FACTEUR DE DÉFORMATION — presse contre cote, même subset')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  les ' + idxP.length + ' courses qui ont LES DEUX ordres :')
entete()
const eP = empreinte(idxP, 'presse')
const eC = empreinte(idxP, 'cote')
console.log('  ' + 'PRESSE (la méthode)'.padEnd(26))
lireEmp(eP)
console.log('  ' + 'COTE (le remplaçant)'.padEnd(26))
lireEmp(eC)
console.log('')
const ecarts = [
  ['trio 3/3', eP.trio.plein, eC.trio.plein], ['trio ≥2/3', eP.trio.ge2, eC.trio.ge2],
  ['quat 4/4', eP.quat.plein, eC.quat.plein], ['quat ≥3/4', eP.quat.ge3, eC.quat.ge3],
  ['quint 5/5', eP.quint.plein, eC.quint.plein], ['quint ≥4/5', eP.quint.ge4, eC.quint.ge4],
  ['quint ≥3/5', eP.quint.ge3, eC.quint.ge3], ['quint moyenne', eP.quint.moy, eC.quint.moy],
]
console.log('  indicateur        presse → cote     écart   (le même écart partout ?)')
for (const [nom, x, y] of ecarts) {
  const d = y - x
  console.log('  ' + nom.padEnd(14) + x.toFixed(1).padStart(7) + ' →' + y.toFixed(1).padStart(7)
    + '  ' + ((d > 0 ? '+' : '') + d.toFixed(1)).padStart(7)
    + '   ' + (Math.abs(d) <= 0.10 ? '=' : d > 0 ? '↑' : '↓'))
}
console.log('')
console.log('  ⭐ Pour lire les 4 périodes du corpus 347, il faut que cet écart')
console.log('    soit le MÊME dans chaque période. On le vérifie en ②.')
console.log('')

console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② L ÉCART EST-IL STABLE SUR LES 4 PÉRIODES ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
for (const [lib, a, b] of PERIODES) {
  const idx = idxP.filter((i) => base[i].date >= a && base[i].date <= b)
  if (idx.length < 8) { console.log('  ' + lib.padEnd(24) + String(idx.length).padStart(4) + ' courses  — trop peu'); continue }
  const p = empreinte(idx, 'presse')
  const c = empreinte(idx, 'cote')
  console.log('  ' + lib.padEnd(24) + String(idx.length).padStart(4) + ' courses')
  console.log('      ≥2/3   ' + p.trio.ge2.toFixed(1).padStart(5) + ' → ' + c.trio.ge2.toFixed(1).padStart(5)
    + '   ' + ((c.trio.ge2 - p.trio.ge2).toFixed(1)).padStart(6))
  console.log('      ≥3/4   ' + p.quat.ge3.toFixed(1).padStart(5) + ' → ' + c.quat.ge3.toFixed(1).padStart(5)
    + '   ' + ((c.quat.ge3 - p.quat.ge3).toFixed(1)).padStart(6))
  console.log('      ≥4/5   ' + p.quint.ge4.toFixed(1).padStart(5) + ' → ' + c.quint.ge4.toFixed(1).padStart(5)
    + '   ' + ((c.quint.ge4 - p.quint.ge4).toFixed(1)).padStart(6))
  console.log('')
}
console.log('  ⚠ P3 et P4 n ont que peu de courses avec presse : le facteur ne se')
console.log('    vérifie PAS sur les périodes qui comptent. La lecture du corpus')
console.log('    347 par la cote reste une APPROXIMATION, pas une mesure.')
console.log('')

console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LE MOTEUR A SUR 347 — 4 PÉRIODES, ordre COTE')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⚠ à lire comme « le MÊRE moteur vu par la cote », pas comme la méthode.')
console.log('')
entete()
console.log('  ' + 'LES 347'.padEnd(26))
lireEmp(empreinte(idxAll, 'cote'))
console.log('')
const sensP = []
for (const [lib, a, b] of PERIODES) {
  const idx = idxAll.filter((i) => base[i].date >= a && base[i].date <= b)
  if (!idx.length) continue
  const e = empreinte(idx, 'cote')
  console.log('  ' + lib.padEnd(26))
  lireEmp(e)
  sensP.push(e)
}
console.log('')
console.log('  ⭐ le nombre de partants par période (le G5 change de taille) :')
for (let t = 0; t < PERIODES.length; t++) {
  const [lib, a, b] = PERIODES[t]
  const idx = idxAll.filter((i) => base[i].date >= a && base[i].date <= b)
  if (!idx.length) continue
  const nb = idx.map((i) => base[i].nbPartants)
  const moy = nb.reduce((x, y) => x + y, 0) / nb.length
  console.log('     ' + lib.padEnd(24) + 'moyenne ' + moy.toFixed(1) + ' partants  (min ' + Math.min(...nb) + ' · max ' + Math.max(...nb) + ')')
}
console.log('')

console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ G2 — « P7 JAMAIS CHOISI » sur 347, règle stricte')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const VARIANTES = [
  ['A — actuel (la cote)', null],
  ['B — G2: le 1er jamais', { bloque: 'G2', rang: 1 }],
  ['C — G2: le 2e jamais', { bloque: 'G2', rang: 2 }],
  ['D — G2: le 3e jamais', { bloque: 'G2', rang: 3 }],
  ['E — G2: le 4e jamais', { bloque: 'G2', rang: 4 }],
]
entete()
const emps = {}
for (const [nom, e] of VARIANTES) {
  emps[nom] = empreinte(idxAll, 'cote', e)
  console.log('  ' + nom.padEnd(26))
  lireEmp(emps[nom])
}
console.log('')
const criteres = [
  ['trio 3/3', 'trio', 'plein'], ['trio ≥2/3', 'trio', 'ge2'],
  ['quat 4/4', 'quat', 'plein'], ['quat ≥3/4', 'quat', 'ge3'],
  ['quint 5/5', 'quint', 'plein'], ['quint ≥4/5', 'quint', 'ge4'],
  ['quint ≥3/5', 'quint', 'ge3'], ['quint moyenne', 'quint', 'moy'],
]
const REF = 'A — actuel (la cote)'
for (const [nom, e] of VARIANTES.slice(1)) {
  const a = emps[REF]
  const b = emps[nom]
  console.log('  ▸ ' + nom + '   contre l\'actuel')
  let ko = 0
  let gains = 0
  let pertes = 0
  for (const [lib, g, champ] of criteres) {
    const x = a[g][champ]
    const y = b[g][champ]
    const bruit = lib.includes('moyenne') ? 0.10 : 0.60
    const d = y - x
    const s = d > bruit ? '↑' : d < -bruit ? '↓' : '='
    if (s === '↑') gains++
    if (s === '↓') pertes++
    const obligatoire = lib === 'quint 5/5' || lib === 'quint ≥4/5' || lib === 'quat 4/4'
    if (obligatoire && s === '↓') ko++
    console.log('    ' + lib.padEnd(14) + x.toFixed(1).padStart(6) + '  →' + y.toFixed(1).padStart(6) + '   ' + s
      + (obligatoire ? '   [obligatoire]' : ''))
  }
  console.log('    → ' + gains + ' ↑ · ' + pertes + ' ↓   '
    + (ko ? '✗ REFUSÉ : ' + ko + ' obligatoire(s) en baisse'
      : (gains >= 4 && pertes <= 1) ? '✓ passe les indicateurs — à vérifier sur 4 périodes'
        : '⚠ mitigé'))
  console.log('')
}

console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ LE SENS DANS LES 4 PÉRIODES — la règle stricte')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⭐ une règle n est acceptée que si 3 périodes sur 4 vont dans le')
console.log('    même sens ET 5/5 ne baisse dans AUCUNE.')
console.log('')
console.log('  variante              5/5 : A → B/C/D/E        ≥4/5 : A → B/C/D/E     sens moyenne')
console.log('  ' + '-'.repeat(104))
const lignes = []
for (const [nom, e] of VARIANTES.slice(1)) {
  const a = emps[REF]
  const b = emps[nom]
  const parts = []
  const s5 = []
  const s4 = []
  const sm = []
  for (const [lib, aa, bb] of PERIODES) {
    const idx = idxAll.filter((i) => base[i].date >= aa && base[i].date <= bb)
    if (!idx.length) continue
    const x = empreinte(idx, 'cote')
    const y = empreinte(idx, 'cote', e)
    parts.push(lib.split(' ')[0] + ' ' + x.quint.plein.toFixed(0) + '→' + y.quint.plein.toFixed(0) + '%'
      + (y.quint.plein < x.quint.plein - 0.4 ? '↓' : y.quint.plein > x.quint.plein + 0.4 ? '↑' : '='))
    s5.push(Math.sign(y.quint.plein - x.quint.plein))
    s4.push(Math.sign(y.quint.ge4 - x.quint.ge4))
    sm.push(Math.sign(y.quint.moy - x.quint.moy))
  }
  const pos = sm.filter((x) => x > 0).length
  const perte5 = s5.filter((x) => x < 0).length
  lignes.push({ nom, parts, pos, perte5, verdict: perte5 ? '✗ 5/5 baisse' : pos >= 3 ? '✓ passe' : '⚠ instable' })
}
lignes.forEach((l2) => {
  console.log('  ' + l2.nom.padEnd(20)
    + l2.parts[0].padEnd(16) + l2.parts[1].padEnd(16) + l2.parts[2].padEnd(16) + l2.parts[3].padEnd(16)
    + '  ' + l2.pos + '/4↑  ' + l2.verdict)
})
console.log('')
console.log('  ⭐ RÈGLE STRICTE : ≥3 périodes en hausse sur la moyenne')
console.log('    ET 5/5 ne baisse dans AUCUNE période.')
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  ⚠ RAPPEL : ces 347 courses n ont PAS de presse. Tout ce qui est')
console.log('    au-dessus est la méthode LUE PAR LA COTE. Les chiffres sont')
console.log('    plus bas que la méthode réelle (≥2/3 : 72 au lieu de 84).')
console.log('    Ce qui compte ici n est pas le NIVEAU, mais la STABILITÉ :')
console.log('    un motif qui se répète sur 4 périodescies distinctes, dont')
console.log('    69 courses de 2024-2025 que personne n a jamais regardées.')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('')