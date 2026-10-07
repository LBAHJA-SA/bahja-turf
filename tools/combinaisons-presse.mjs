/* ---------------------------------------------------------------
 * tools\combinaisons-presse.mjs  —  LE MÊME TEST, SUR LES 94 AVEC PRESSE
 *
 *   node tools\combinaisons-presse.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Mesure seule. Quotas 3-2-1-1-1 intacts.
 *
 * POURQUOI CE SCRIPT EXISTE
 *   Sur les 347 Quintés il n'y a PAS de presse : l'ordre de référence
 *   est la cote, donc « G2 no1 » veut dire « le plus favorite de G2 »
 *   et les 255 combinaisons ne teste qu'une seule famille de règles.
 *   Sur les 94 courses du corpus on a la VRAIE Synthèse : l'ordre de
 *   référence (presse) et l'ordre de remplissage (cote) sont
 *   DIFFÉRENTS, donc « ne prends jamais P7 » veut dire quelque chose.
 *
 *   C'est le seul terrain où l'hypothèse « quel P garder » est testable.
 *
 * CE QUE ÇA TESTE
 *   ① la porte 3/3  (le seuil économique)
 *   ② la conversion 4/4|3/3 · 5/5|3/3 · ≥4/5|3/3 · moyenne|3/3
 *   ③ TOUTES les combinaisons d'exclusions de rangs de PRESSE
 *      dans G1 (4 rangs) · G2 (4) · G3 (2) · G4 (2) · G5 (le 1er)
 *      = 2^15 = 32768 … on se limite aux combinaisons de 1 et 2
 *      règles, plus toutes celles qui touchent G1/G2.
 *   ④ la stabilité sur 4 tranches chronologiques
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]
const TRANCHES = 4

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .map((k) => ({ ...k, pDe: new Map(k.presse.map((x, i) => [x, i + 1])) }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length

/* les rangs de presse de chaque bloc, une fois pour toutes */
const rangsDe = base.map((k) => BLOCS.map((b) =>
  k.presse.filter((x) => k.pDe.get(x) >= b.min && k.pDe.get(x) <= b.max)))

const cands = base.map((k, ki) => BLOCS.map((b, i) =>
  rangsDe[ki][i].slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))))
const arr = base.map((k) => (k.arrivee || k.top5 || []).slice())

/** le ticket : exclusion de rangs de PRESSE (rang dans l'ordre presse du bloc) */
function ticketDe(ci, excl) {
  const out = []
  for (let i = 0; i < BLOCS.length; i++) {
    let pc = cands[ci][i]
    for (const e of excl) {
      if (e.bloque !== BLOCS[i].id) continue
      const aRetirer = rangsDe[ci][i][e.rang - 1]
      pc = pc.filter((x) => x !== aRetirer)
    }
    for (let q = 0; q < BLOCS[i].quota && q < pc.length; q++) out.push(pc[q])
  }
  return out
}

function mesurerSur(idx, excl) {
  const portes = []
  let nb3 = 0
  let porte = 0
  for (const ci of idx) {
    const tk = new Set(ticketDe(ci, excl))
    const a = arr[ci]
    if (!a || a.length < 5) continue
    const h3 = [a[0], a[1], a[2]].filter((x) => tk.has(x)).length
    if (h3 === 3) {
      nb3++
      portes.push({
        h4: a.slice(0, 4).filter((x) => tk.has(x)).length,
        h5: a.slice(0, 5).filter((x) => tk.has(x)).length,
      })
    }
  }
  const nn = idx.length
  const np = portes.length
  return {
    porte: nb3 / nn * 100, nb3, np,
    c44: np ? portes.filter((r) => r.h4 === 4).length / np * 100 : null,
    c55: np ? portes.filter((r) => r.h5 === 5).length / np * 100 : null,
    c45: np ? portes.filter((r) => r.h5 >= 4).length / np * 100 : null,
    cMoy: np ? portes.reduce((a, r) => a + r.h5, 0) / np : 0,
  }
}

const idxAll = base.map((_, i) => i)
const A = mesurerSur(idxAll, [])

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ LE MÊME TEST SUR LES ' + n + ' COURSES QUI ONT LA PRESSE')
console.log('     ' + base[0].date + ' → ' + base[n - 1].date)
console.log('     l ordre de RÉFÉRENCE est la presse, le REMPLISSAGE est la cote')
console.log('')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① B A S E L I N E')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const l = (v) => (v == null ? '   —  ' : v.toFixed(1).padStart(5))
console.log('  ① LA PORTE')
console.log('     3/3                : ' + l(A.porte) + ' %   = ' + A.nb3 + ' courses')
console.log('')
console.log('  ② APRÈS LA PORTE — sur les ' + A.np + ' courses gagnantes')
console.log('     4/4 | 3/3          : ' + l(A.c44) + ' %   = ' + Math.round((A.c44 || 0) / 100 * A.np))
console.log('     5/5 | 3/3          : ' + l(A.c55) + ' %   = ' + Math.round((A.c55 || 0) / 100 * A.np))
console.log('     ≥4/5 | 3/3         : ' + l(A.c45) + ' %   = ' + Math.round((A.c45 || 0) / 100 * A.np))
console.log('     moyenne | 3/3      : ' + A.cMoy.toFixed(2))
console.log('')

/* ══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② TOUTES LES COMBINAISONS D EXCLUSIONS DE RANGS DE PRESSE')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const REGLES = []
BLOCS.forEach((b) => {
  const taille = Math.min(b.max - b.min + 1, 4)
  for (let r = 1; r <= taille; r++) REGLES.push({ bloque: b.id, rang: r, nom: b.id + ' noP' + r })
})
console.log('  règles possibles : ' + REGLES.length + '   (' + REGLES.map((r) => r.nom).join(' · ') + ')')
console.log('')

const combos = []
/* 1 règle */
for (const r of REGLES) combos.push([r])
/* 2 règles de blocs différents */
for (let i = 0; i < REGLES.length; i++) {
  for (let j = i + 1; j < REGLES.length; j++) {
    if (REGLES[i].bloque === REGLES[j].bloque) continue
    combos.push([REGLES[i], REGLES[j]])
  }
}
/* toutes les paires à l'intérieur de G1 et de G2 (même bloc) */
for (const bloc of ['G1', 'G2']) {
  const rs = REGLES.filter((r) => r.bloque === bloc)
  for (let i = 0; i < rs.length; i++) {
    for (let j = i + 1; j < rs.length; j++) combos.push([rs[i], rs[j]])
  }
}
/* 3 règles, sur G1 + G2 + un autre — les plus promising d'après le §2 */
for (const a of REGLES.filter((r) => r.bloque === 'G1')) {
  for (const b of REGLES.filter((r) => r.bloque === 'G2')) {
    for (const c of REGLES.filter((r) => r.bloque === 'G3' || r.bloque === 'G4' || r.bloque === 'G5')) {
      combos.push([a, b, c])
    }
  }
}
console.log('  combinaisons testées : ' + combos.length)
console.log('')

const bp = 100 / n / 2
const bc = A.np ? 100 / A.np / 2 : 1

/* les 4 tranches */
const taille = Math.ceil(n / TRANCHES)
const idxTranches = []
for (let t = 0; t < TRANCHES; t++) {
  const idx = idxAll.slice(t * taille, Math.min((t + 1) * taille, n))
  if (idx.length) idxTranches.push({ lib: base[idx[0]].date + '→' + base[idx[idx.length - 1]].date, idx })
}
const BASE_TR = idxTranches.map((t) => mesurerSur(t.idx, []))

const lignes = combos.map((sel) => {
  const m = mesurerSur(idxAll, sel)
  const s = idxTranches.map((t, ti) => {
    const y = mesurerSur(t.idx, sel)
    const x = BASE_TR[ti]
    return {
      porte: y.porte - x.porte,
      c55: (y.c55 == null || x.c55 == null) ? 0 : y.c55 - x.c55,
    }
  })
  return {
    sel, m, s,
    nom: sel.map((r) => r.nom).join(' + '),
    dPorte: m.porte - A.porte, d55: m.c55 - A.c55, d45: m.c45 - A.c45, dMoy: m.cMoy - A.cMoy,
    posP: s.filter((x) => x.porte > bp).length, negP: s.filter((x) => x.porte < -bp).length,
    posC: s.filter((x) => x.c55 > bc).length, negC: s.filter((x) => x.c55 < -bc).length,
  }
})

const survivantes = lignes.filter((x) => x.dPorte > bp)
console.log('  ① la porte 3/3 monte (de plus de ' + bp.toFixed(2) + ' pt) : ' + survivantes.length + ' / ' + lignes.length)
console.log('  ② … et la conversion 5/5|3/3 ne baisse pas            : '
  + survivantes.filter((x) => x.d55 > -bc).length)
console.log('  ③ … et ≥3 tranches sur 4 en hausse                    : '
  + survivantes.filter((x) => x.d55 > -bc && x.posP >= 3).length)
console.log('  ④ … et aucune tranche en baisse                       : '
  + survivantes.filter((x) => x.d55 > -bc && x.posP >= 3 && x.negP === 0 && x.negC === 0).length)
console.log('')

const finales = survivantes.filter((x) => x.d55 > -bc && x.posP >= 3 && x.negP === 0 && x.negC === 0)
const vus = new Set()
const detail = lignes.filter((x) => {
  if (vus.has(x.nom)) return false
  vus.add(x.nom)
  return true
}).sort((a, b) => (b.dPorte - a.dPorte) || (b.d55 - a.d55))

console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LE CLASSEMENT COMPLET')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  combinaison                                 Δ3/3    Δ5/5|3/3   Δ≥4/5|3/3   Δmoy    4P↑ porte  4P↑ conv')
console.log('  ' + '-'.repeat(104))
detail.slice(0, 30).forEach((x) => {
  const passe = finales.includes(x)
  console.log('  ' + x.nom.slice(0, 38).padEnd(40)
    + fmtD(x.dPorte, bp).padStart(7) + fmtD(x.d55, bc).padStart(12) + fmtD(x.d45, bc).padStart(12)
    + fmtD(x.dMoy, 0.03).padStart(8)
    + String(x.posP + '/4').padStart(8) + String(x.posC + '/4').padStart(11)
    + (passe ? '   ✓ PASSE' : ''))
})
function fmtD(d, b) { return Math.abs(d) <= b ? '  =  ' : ((d > 0 ? '+' : '') + d.toFixed(1)).padStart(5) }
console.log('')
console.log('  (les 30 premières sur ' + detail.length + ' règles distinctes)')
console.log('')

if (finales.length) {
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('  ⭐ ' + finales.length + ' COMBINAISON(S) PASSENT LA RÈGLE STRICTE')
  console.log('  ══════════════════════════════════════════════════════════════')
  finales.forEach((x) => {
    console.log('')
    console.log('     ' + x.nom)
    console.log('     3/3        : ' + A.porte.toFixed(1) + ' → ' + x.m.porte.toFixed(1)
      + '   (' + A.nb3 + ' → ' + x.m.nb3 + ' courses)')
    console.log('     4/4 | 3/3  : ' + l(A.c44) + ' → ' + l(x.m.c44))
    console.log('     5/5 | 3/3  : ' + l(A.c55) + ' → ' + l(x.m.c55)
      + '   (' + Math.round((A.c55 || 0) / 100 * A.np) + ' → ' + Math.round((x.m.c55 || 0) / 100 * x.m.np) + ' courses)')
    console.log('     ≥4/5 | 3/3 : ' + l(A.c45) + ' → ' + l(x.m.c45))
    console.log('     moyenne    : ' + A.cMoy.toFixed(2) + ' → ' + x.m.cMoy.toFixed(2))
    console.log('     4 tranches : porte ' + x.posP + '/4   conversion ' + x.posC + '/4')
  })
  console.log('')
  console.log('  ⚠ SURAPPRENTISSAGE : ' + lignes.length + ' hypothèses sur ' + n + ' courses.')
  console.log('    Prochaine étape obligatoire : rejouer la meilleure sur un')
  console.log('    APPRENTISSAGE (70 premières) / TEST (24 dernières) séparés.')
} else {
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('  ⭐ AUCUNE COMBINAISON NE PASSE, SUR LES 94 COURSES AVEC PRESSE.')
  console.log('  ══════════════════════════════════════════════════════════════')
  console.log('')
  const p = [...lignes].sort((a, b) => b.dPorte - a.dPorte)[0]
  const c = [...lignes].sort((a, b) => b.d55 - a.d55)[0]
  console.log('  la meilleure PORTE : ' + p.nom)
  console.log('     Δ3/3 = ' + p.dPorte.toFixed(1) + '   Δ5/5|3/3 = ' + p.d55.toFixed(1) + '   ' + p.posP + '/4 tranches')
  console.log('')
  console.log('  la meilleure CONVERSION : ' + c.nom)
  console.log('     Δ5/5|3/3 = ' + c.d55.toFixed(1) + '   Δ3/3 = ' + c.dPorte.toFixed(1) + '   ' + c.posP + '/4 tranches')
  console.log('')
  const avecPorte = lignes.filter((x) => x.dPorte > bp && x.d55 > bc).length
  console.log('  ⭐ règles qui montent la porte ET la conversion : ' + avecPorte + ' / ' + lignes.length)
  console.log('')
  console.log('    Sur 347 (sans presse) : 0 / 255.')
  console.log('    Sur  94 (avec presse) : ' + avecPorte + ' / ' + lignes.length + '.')
  console.log('')
  console.log('    ⇒ la porte et la conversion sont en TENSION dans les deux corpus.')
  console.log('    ⇒ ce n est pas un problème d échantillon : c est structurel.')
}
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  ⚠ Rappel du sens des rangs : « G1 noP2 » = ne jamais choisir le')
console.log('    2e cheval de G1 DANS L ORDRE DE LA PRESSE, pas dans l ordre')
console.log('    de la cote. Les deux ordres sont différents, donc la règle')
console.log('    agit même quand elle ne change pas le ticket par la cote.')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('')