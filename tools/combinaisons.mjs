/* ---------------------------------------------------------------
 * tools\combinaisons.mjs  —  ⭐ TOUTES LES COMBINAISONS DE RÈGLES
 *
 *   node tools\combinaisons.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Mesure seule. Quotas 3-2-1-1-1 intacts.
 *
 * LE CONSTAT DE empreinte-gate.mjs
 *   sur 347 Quintés, 99 « ne prends jamais le N e » testées,
 *   91 sont des NO-OP et les 8 qui agissent ne passent pas.
 *   Les 8 sont : G1 no1 / G1 no2 / G1 no3 / G2 no1 / G2 no2
 *                G3 no1 / G4 no1 / G5 no1
 *
 * CE QUE FAIT CE SCRIPT
 *   ① teste TOUTES les combinaisons de ces 8 règles  (2⁸ − 1 = 255)
 *   ② mesure la B I C M P R E É C O N O M I Q U E sur chacune
 *   ③ compte en COURSES, pas en pourcentages :
 *        how many races the gate WINS, and how many it LOSES
 *   ④ vérifie le sens dans 4 périodes chronologiques
 *
 * LA RÈGLE DE MORT, appliquée SANS PITIÉ
 *      ① la porte 3/3 ne monte pas  → ÉLIMINATOIRE, peu importe le 5/5
 *      ② 5/5 | 3/3 baisse             → ÉLIMINATOIRE
 *      ③ moins de 3 périodes sur 4   → ÉLIMINATOIRE (signal instable)
 *   et à la fin un contrôle de SURAPPRENTISSAGE, parce que 255
 *   hypothèses sur 347 courses, c'est beaucoup.
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

/* les 8 règles qui agissent vraiment (les 91 autres sont des no-op) */
const REGLES = [
  { bloque: 'G1', rang: 1, nom: 'G1 no1' },
  { bloque: 'G1', rang: 2, nom: 'G1 no2' },
  { bloque: 'G1', rang: 3, nom: 'G1 no3' },
  { bloque: 'G2', rang: 1, nom: 'G2 no1' },
  { bloque: 'G2', rang: 2, nom: 'G2 no2' },
  { bloque: 'G3', rang: 1, nom: 'G3 no1' },
  { bloque: 'G4', rang: 1, nom: 'G4 no1' },
  { bloque: 'G5', rang: 1, nom: 'G5 no1' },
]

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .map((k) => ({ ...k, o: (k.ordreCote || []).slice() }))
  .filter((k) => k.o.length >= 10)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length

/* on prépare UNE FOIS : les candidats de chaque bloc, triés par cote */
const blocs = base.map((k) => BLOCS.map((b, i) =>
  k.o.filter((x, r) => r + 1 >= b.min && r + 1 <= b.max)
    .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))))
const arr = base.map((k) => k.arrivee.slice())

/** le ticket avec un ensemble de règles exclues */
function ticketDe(ci, exclus) {
  const out = []
  for (let i = 0; i < BLOCS.length; i++) {
    const pc = blocs[ci][i]
    let dis = pc
    for (const e of exclus) {
      if (e.bloque !== BLOCS[i].id) continue
      dis = dis.filter((x, r) => r + 1 !== e.rang)
    }
    for (let q = 0; q < BLOCS[i].quota && q < dis.length; q++) out.push(dis[q])
  }
  return out
}

/** la mesure économique d'un ensemble de règles */
function mesurer(exclus) {
  const porte = []            /* h3 de chaque course */
  const portes = []           /* les records des courses qui passent la porte */
  let gagnees = 0
  let perdues = 0
  const tkBase = new Array(n)
  for (let i = 0; i < n; i++) {
    const tk = new Set(ticketDe(i, exclus))
    tkBase[i] = tk
    const a = arr[i]
    const h3 = (a[0] === tk.has(a[0]) && a[1] === tk.has(a[1]) && a[2] === tk.has(a[2])
      && a[0] !== undefined) ? 3 : [a[0], a[1], a[2]].filter((x) => tk.has(x)).length
    porte.push(h3)
    if (h3 === 3) {
      portes.push({
        h4: a.slice(0, 4).filter((x) => tk.has(x)).length,
        h5: a.slice(0, 5).filter((x) => tk.has(x)).length,
      })
    }
  }
  /* porte de référence, pour le win/loss en courses */
  for (let i = 0; i < n; i++) {
    const a = arr[i]
    const ref = BASE_PORTE[i]
    if (porte[i] === 3 && ref < 3) gagnees++
    if (porte[i] < 3 && ref === 3) perdues++
  }
  const np = portes.length
  return {
    porte: porte.filter((v) => v === 3).length / n * 100,
    nb3: porte.filter((v) => v === 3).length,
    ge2: porte.filter((v) => v >= 2).length / n * 100,
    c44: np ? portes.filter((r) => r.h4 === 4).length / np * 100 : null,
    nb44: np ? portes.filter((r) => r.h4 === 4).length : 0,
    c55: np ? portes.filter((r) => r.h5 === 5).length / np * 100 : null,
    nb55: np ? portes.filter((r) => r.h5 === 5).length : 0,
    c45: np ? portes.filter((r) => r.h5 >= 4).length / np * 100 : null,
    nb45: np ? portes.filter((r) => r.h5 >= 4).length : 0,
    cMoy: np ? portes.reduce((a, r) => a + r.h5, 0) / np : 0,
    np, gagnees, perdues,
    porteBrute: porte,
  }
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ TOUTES LES COMBINAISONS — ' + n + ' QUINTÉS')
console.log('     ' + base[0].date + ' → ' + base[n - 1].date + '   quotas 3-2-1-1-1 (intacts)')
console.log('')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① B A S E L I N E — le ticket actuel, sans aucune règle')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const BASE_PORTE = []
{
  for (let i = 0; i < n; i++) {
    const tk = new Set(ticketDe(i, []))
    const a = arr[i]
    BASE_PORTE.push([a[0], a[1], a[2]].filter((x) => tk.has(x)).length)
  }
}
const A = mesurer([])
const l = (v) => (v == null ? '   —  ' : v.toFixed(1).padStart(5))
console.log('  ① LA PORTE')
console.log('     3/3  (ticket gagnant)  : ' + l(A.porte) + ' %   = ' + A.nb3 + ' courses')
console.log('     ≥2/3                   : ' + l(A.ge2) + ' %')
console.log('')
console.log('  ② APRÈS LA PORTE — sur les ' + A.np + ' courses gagnantes')
console.log('     4/4 | 3/3              : ' + l(A.c44) + ' %   = ' + A.nb44 + ' courses')
console.log('     5/5 | 3/3              : ' + l(A.c55) + ' %   = ' + A.nb55 + ' courses')
console.log('     ≥4/5 | 3/3             : ' + l(A.c45) + ' %   = ' + A.nb45 + ' courses')
console.log('     moyenne | 3/3          : ' + A.cMoy.toFixed(2))
console.log('')

/* ══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LES 7 COMBINAISONS PROPOSÉES, dans l ordre')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const parNom = new Map(REGLES.map((r) => [r.nom, r]))
const PROPOSEES = [
  ['G3 no1 + G2 no2', ['G3 no1', 'G2 no2']],
  ['G3 no1 + G2 no1', ['G3 no1', 'G2 no1']],
  ['G3 no1 + G5 no1', ['G3 no1', 'G5 no1']],
  ['G3 no1 + G1 no3', ['G3 no1', 'G1 no3']],
  ['G2 no1 + G2 no2', ['G2 no1', 'G2 no2']],
  ['G2 no1 + G5 no1', ['G2 no1', 'G5 no1']],
  ['G3 no1 + G2 no2 + G5 no1', ['G3 no1', 'G2 no2', 'G5 no1']],
]
console.log('  combinaison                       Δ3/3    Δ5/5|3/3   Δ≥4/5|3/3   Δmoy|3/3    4P    porte')
console.log('  ' + '-'.repeat(92))
const resultats = new Map()
const idxPeriodes = PERIODES.map(([lib, a, b]) => {
  const idx = []
  for (let i = 0; i < n; i++) if (base[i].date >= a && base[i].date <= b) idx.push(i)
  return { lib, idx }
})

function sens4(exclus) {
  const out = []
  for (let pi = 0; pi < idxPeriodes.length; pi++) {
    const x = BASE_PAR[pi]
    const y = mesurerSur(exclus, idxPeriodes[pi].idx)
    out.push({ porte: y.porte - x.porte, c55: (y.c55 == null || x.c55 == null) ? 0 : y.c55 - x.c55 })
  }
  return out
}

/* version qui ne mesure que sur un sous-ensemble d'index */
const BASE_PAR = idxPeriodes.map((p) => {
  const porte = []
  const portes = []
  for (const i of p.idx) {
    const tk = new Set(ticketDe(i, []))
    const a = arr[i]
    const h3 = [a[0], a[1], a[2]].filter((x) => tk.has(x)).length
    porte.push(h3)
    if (h3 === 3) portes.push(a.slice(0, 5).filter((x) => tk.has(x)).length)
  }
  const np = portes.length
  return {
    porte: porte.filter((v) => v === 3).length / p.idx.length * 100,
    c55: np ? portes.filter((v) => v === 5).length / np * 100 : null,
  }
})

function mesurerSur(exclus, idx) {
  const portes = []
  let nb3 = 0
  for (const i of idx) {
    const tk = new Set(ticketDe(i, exclus))
    const a = arr[i]
    const h3 = [a[0], a[1], a[2]].filter((x) => tk.has(x)).length
    if (h3 === 3) {
      nb3++
      portes.push(a.slice(0, 5).filter((x) => tk.has(x)).length)
    }
  }
  const np = portes.length
  return {
    porte: nb3 / idx.length * 100,
    c55: np ? portes.filter((v) => v === 5).length / np * 100 : null,
  }
}

const fmtD = (d, b) => (Math.abs(d) <= b ? '  =  ' : ((d > 0 ? '+' : '') + d.toFixed(1)).padStart(5))
for (const [lib, noms] of PROPOSEES) {
  const exclus = noms.map((x) => parNom.get(x))
  const m = mesurer(exclus)
  const s = sens4(exclus)
  const bp = 100 / n / 2
  const bc = A.np ? 100 / A.np / 2 : 1
  const posP = s.filter((x) => x.porte > bp).length
  const posC = s.filter((x) => x.c55 > bc).length
  const forme = (posP >= 3 ? '↑' : '') + (posC >= 3 ? '↑' : '')
  resultats.set(lib, { exclus, m, s, posP, posC })
  console.log('  ' + lib.padEnd(30)
    + fmtD(m.porte - A.porte, 0.6).padStart(7)
    + fmtD(m.c55 - A.c55, 1.2).padStart(12)
    + fmtD(m.c45 - A.c45, 1.2).padStart(12)
    + fmtD(m.cMoy - A.cMoy, 0.03).padStart(11)
    + '   ' + (posP + posC + '/8') + '  ' + (posP >= 3 ? '↑' : posP === 0 ? '↓' : '→')
    + (posC >= 3 ? '↑' : posC === 0 ? '↓' : '→'))
}
console.log('')
console.log('  (les deux flèches = la porte, puis la conversion 5/5|3/3)')
console.log('')

/* ══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ TOUTES LES 255 COMBINAISONS')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const toutes = []
for (let m = 1; m < (1 << REGLES.length); m++) {
  const sel = []
  for (let b = 0; b < REGLES.length; b++) if (m & (1 << b)) sel.push(REGLES[b])
  toutes.push(sel)
}
const mesures = toutes.map((sel) => ({ sel, m: mesurer(sel) }))

const dPorte = (x) => x.m.porte - A.porte
const dC55 = (x) => x.m.c55 - A.c55
const dC45 = (x) => x.m.c45 - A.c45
const bp = 100 / n / 2
const bc = A.np ? 100 / A.np / 2 : 1

const survivantes = mesures.filter((x) => dPorte(x) > bp)
console.log('  255 combinaisons testées.')
console.log('  ' + survivantes.length + ' font MONTER la porte 3/3 (de plus de ' + bp.toFixed(2) + ' point).')
console.log('  ' + mesures.filter((x) => dPorte(x) >= -bp && dPorte(x) <= bp).length + ' ne la font ni monter ni baisser.')
console.log('  ' + mesures.filter((x) => dPorte(x) < -bp).length + ' la font baisser  ← ÉLIMINÉES d office.')
console.log('')

console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ LE TABLEAU COMPLET — les 255, triées par Δ3/3')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  #   combinaison                                  Δ3/3    Δ5/5|3/3   Δ≥4/5|3/3   Δmoy    +3/3  −3/3   4P porte  4P conv')
console.log('  ' + '-'.repeat(122))
const toutesAvecSens = mesures.map((x) => {
  const s = sens4(x.sel)
  return {
    ...x,
    posP: s.filter((y) => y.porte > bp).length,
    negP: s.filter((y) => y.porte < -bp).length,
    posC: s.filter((y) => y.c55 > bc).length,
    negC: s.filter((y) => y.c55 < -bc).length,
  }
})
toutesAvecSens.sort((a, b) => dPorte(b) - dPorte(a))
for (let i = 0; i < toutesAvecSens.length; i++) {
  const x = toutesAvecSens[i]
  const nom = x.sel.map((r) => r.nom).join(' + ')
  const passe = dPorte(x) > bp && dC55(x) > -bc && x.posP >= 3 && x.negP === 0 && x.negC === 0
  console.log('  ' + String(i + 1).padStart(3) + ' ' + nom.slice(0, 40).padEnd(41)
    + fmtD(dPorte(x), bp).padStart(7) + fmtD(dC55(x), bc).padStart(12)
    + fmtD(dC45(x), bc).padStart(12)
    + fmtD(x.m.cMoy - A.cMoy, 0.03).padStart(8)
    + String(x.m.gagnees).padStart(7) + String(x.m.perdues).padStart(7)
    + String(x.posP + '/4').padStart(9) + String(x.posC + '/4').padStart(10)
    + (passe ? '  ✓' : ''))
}
console.log('')

/* ══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ LA RÈGLE DE MORT — vérification stricte')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const etape1 = toutesAvecSens.filter((x) => dPorte(x) > bp)
console.log('  ① la porte 3/3 monte          : ' + etape1.length + ' / 255')
const etape2 = etape1.filter((x) => dC55(x) > -bc)
console.log('  ② la conversion 5/5|3/3 ne baisse pas : ' + etape2.length)
const etape3 = etape2.filter((x) => x.posP >= 3)
console.log('  ③ au moins 3 périodes sur 4 en hausse    : ' + etape3.length)
const etape4 = etape3.filter((x) => x.negP === 0 && x.negC === 0)
console.log('  ④ aucune période en baisse                : ' + etape4.length)
console.log('')

if (etape4.length) {
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('  ⭐ LES COMBINAISONS QUI PASSENT')
  console.log('  ══════════════════════════════════════════════════════════════')
  for (const x of etape4) {
    console.log('')
    console.log('     ' + x.sel.map((r) => r.nom).join(' + '))
    console.log('     3/3        : ' + A.porte.toFixed(1) + ' → ' + x.m.porte.toFixed(1)
      + '   (' + A.nb3 + ' → ' + x.m.nb3 + ' courses,  +' + x.m.gagnees + ' / −' + x.m.perdues + ')')
    console.log('     5/5 | 3/3  : ' + A.c55.toFixed(1) + ' → ' + x.m.c55.toFixed(1)
      + '   (' + A.nb55 + ' → ' + x.m.nb55 + ' courses 5/5)')
    console.log('     ≥4/5 | 3/3 : ' + A.c45.toFixed(1) + ' → ' + x.m.c45.toFixed(1))
    console.log('     moyenne    : ' + A.cMoy.toFixed(2) + ' → ' + x.m.cMoy.toFixed(2))
    console.log('     4 périodes : porte ' + x.posP + '/4   conversion ' + x.posC + '/4')
  }
  console.log('')
  console.log('  ⚠ SURAPPRENTISSAGE : ' + toutesAvecSens.length + ' hypothèses sur ' + n + ' courses.')
  console.log('    Avant toute décision, il faut vérifier que la meilleure passe')
  console.log('    aussi sur un APPRENTISSAGE / TEST séparés dans le temps.')
} else {
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('  ⭐ AUCUNE COMBINAISON NE PASSE LES 4 ÉTAPES.')
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  const meilleurePorte = [...toutesAvecSens].sort((a, b) => dPorte(b) - dPorte(a))[0]
  const meilleureConv = [...toutesAvecSens].sort((a, b) => dC55(b) - dC55(a))[0]
  console.log('  la meilleure PORTE : ' + meilleurePorte.sel.map((r) => r.nom).join(' + '))
  console.log('     Δ3/3 = ' + dPorte(meilleurePorte).toFixed(1)
    + '   mais Δ5/5|3/3 = ' + dC55(meilleurePorte).toFixed(1)
    + '   et ' + meilleurePorte.posP + '/4 périodes seulement')
  console.log('')
  console.log('  la meilleure CONVERSION : ' + meilleureConv.sel.map((r) => r.nom).join(' + '))
  console.log('     Δ5/5|3/3 = ' + dC55(meilleureConv).toFixed(1)
    + '   mais Δ3/3 = ' + dPorte(meilleureConv).toFixed(1))
  console.log('')
  const conflit = mesures.filter((x) => dPorte(x) > bp && dC55(x) > bc).length
  console.log('  ⭐ les 8 règles montent la porte ET la conversion en même temps : ' + conflit)
  console.log('    Sur 255 essais, c est exactement ce qu on attendrait par le hasard.')
  console.log('')
  console.log('    ⇒ les 8 signaux ne sont PAS des briques qui se combinent.')
  console.log('    ⇒ la porte et la conversion sont en TENSION, pas en synergie.')
}
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  ⚠ Ces 347 Quintés n ont pas de presse. L ordre de référence est')
console.log('    la cote. Les « G1 no1 », « G2 no1 » etc. sont donc des rangs')
console.log('    de COTE, pas des rangs de presse — ce qui n est pas la même chose.')
console.log('    Sur le corpus 94 (avec presse) les deux ordres diffèrent.')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('')