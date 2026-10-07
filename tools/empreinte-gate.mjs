/* ---------------------------------------------------------------
 * tools\empreinte-gate.mjs  —  ⭐ LA B I C M P R E É C O N O M I Q U E
 *
 *   node tools\empreinte-gate.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Mesure seule. Quotas 3-2-1-1-1 intacts.
 *
 * LE PROBLÈME ÉNONCÉ
 *   si on ne tient pas le 1er + 2e + 3e, le ticket est perdu
 *   économiquement — même s il.attrsape 4/5. Donc 4/5 et 5/5 ne
 *   peuvent pas être lus « à plat ». Il faut deux couches.
 *
 *   couche ①  LA P O R T E      3/3 = on passe
 *   couche ②  APRÈS LA PORTE    parmi les 3/3 seulement :
 *                                 → 4/4 ?  5/5 ?  ≥4/5 ?  moyenne ?
 *
 *   c est la CONVERSION qu on cherche :
 *        3/3 → 4/5      et      3/3 → 5/5
 *
 * ⚠ POINT DE MESURE, À LIRE AVEC SOIN
 *   les 347 Quintés n ont PAS de presse (§16.6). L ordre de référence
 *   est donc la COTE, et le bloc est ensuite rempli par la cote aussi.
 *   Conséquence : exclure un rang de COTE dans un bloc est souvent un
 *   NO-OP (les 2 premiers du bloc sont déjà pris). Il faut donc
 *   mesurer le nombre de tickets RÉELLEMENT CHANGÉS, sinon on croit
 *   à une règle qui ne fait rien.
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
  .map((k) => ({ ...k, o: (k.ordreCote || []).slice() }))
  .filter((k) => k.o.length >= 10)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length

const numsBloc = (k, i) => k.o.filter((x, r) => r + 1 >= BLOCS[i].min && r + 1 <= BLOCS[i].max)
const parCote = (k, i) => numsBloc(k, i).slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))

/** le ticket, avec éventuellement un rang écarté dans un bloc */
function ticket(k, excl) {
  return BLOCS.flatMap((b, i) => {
    const pc = parCote(k, i)
    const dis = excl && excl.bloque === b.id ? pc.filter((x, r) => r + 1 !== excl.rang) : pc
    return dis.slice(0, b.quota)
  }).filter(Boolean)
}

const res = (k, tk) => {
  const t3 = k.arrivee.slice(0, 3)
  const t4 = k.arrivee.slice(0, 4)
  const t5 = k.arrivee.slice(0, 5)
  const h3 = t3.filter((x) => tk.has(x)).length
  return {
    t3, t4, t5, h3,
    h4: t4.filter((x) => tk.has(x)).length,
    h5: t5.filter((x) => tk.has(x)).length,
  }
}

/**
 * LA MESURE. Deux couches, exactement comme demandé.
 * @param {number[]} idx
 * @param {object|null} excl
 */
function empreinte(idx, excl) {
  const portes = []
  const parmiPortes = []
  const brut = []
  let changees = 0
  for (const i of idx) {
    const k = base[i]
    const tk = new Set(ticket(k, excl))
    const r = res(k, tk)
    portes.push(r.h3)
    brut.push(r)
    if (r.h3 === 3) parmiPortes.push(r)
    if (excl) {
      const ref = new Set(ticket(k, null))
      if (ref.size !== tk.size || [...ref].some((x) => !tk.has(x))) changees++
    }
  }
  const nb = idx.length
  const n3 = parmiPortes.length
  const moy = (t, f) => (t.length ? t.reduce((a, r) => a + f(r), 0) / t.length : 0)
  return {
    nb, n3,
    porte: portes.filter((v) => v === 3).length / nb * 100,
    ge2: portes.filter((v) => v >= 2).length / nb * 100,
    brutMoy: brut.reduce((a, r) => a + r.h5, 0) / nb,
    parmiN: n3,
    c44: n3 ? parmiPortes.filter((r) => r.h4 === 4).length / n3 * 100 : null,
    c55: n3 ? parmiPortes.filter((r) => r.h5 === 5).length / n3 * 100 : null,
    c45: n3 ? parmiPortes.filter((r) => r.h5 >= 4).length / n3 * 100 : null,
    cMoy: moy(parmiPortes, (r) => r.h5),
    ge35: brut.filter((r) => r.h5 >= 3).length / nb * 100,
    changees,
  }
}

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ LA B I C M P R E É C O N O M I Q U E — ' + n + ' QUINTÉS')
console.log('     2024-09-12 → ' + base[n - 1].date + '   quotas 3-2-1-1-1 (intacts)')
console.log('')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① LA BASE — où en est le ticket aujourd hui')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const idxAll = base.map((_, i) => i)
const A = empreinte(idxAll, null)
console.log('  ① LA PORTE — les 3 premiers, sur ' + A.nb + ' Quintés')
console.log('     3/3 (ticket gagnant)  : ' + A.porte.toFixed(1) + ' %   = ' + Math.round(A.porte / 100 * A.nb) + ' courses')
console.log('     ≥2/3                  : ' + A.ge2.toFixed(1) + ' %')
console.log('')
console.log('  ② APRÈS LA PORTE — sur les ' + A.parmiN + ' courses qui passent la porte')
console.log('     4/4 parmi les 3/3    : ' + A.c44.toFixed(1) + ' %   = ' + Math.round(A.c44 / 100 * A.parmiN) + ' courses')
console.log('     5/5 parmi les 3/3    : ' + A.c55.toFixed(1) + ' %   = ' + Math.round(A.c55 / 100 * A.parmiN) + ' courses')
console.log('     ≥4/5 parmi les 3/3   : ' + A.c45.toFixed(1) + ' %   = ' + Math.round(A.c45 / 100 * A.parmiN) + ' courses')
console.log('     moyenne parmi les 3/3: ' + A.cMoy.toFixed(2))
console.log('')
console.log('  ③ TOUT À PLAT (pour mémoire)')
console.log('     5/5 toutes courses   : ' + (brut5(idxAll)).toFixed(1) + ' %')
console.log('     ≥4/5 toutes courses  : ' + (brut4(idxAll)).toFixed(1) + ' %')
console.log('     ≥3/5 toutes courses  : ' + A.ge35.toFixed(1) + ' %')
console.log('')
function brut5(idx) {
  let s = 0
  for (const i of idx) { const k = base[i]; const tk = new Set(ticket(k, null)); if (res(k, tk).h5 === 5) s++ }
  return s / idx.length * 100
}
function brut4(idx) {
  let s = 0
  for (const i of idx) { const k = base[i]; const tk = new Set(ticket(k, null)); s += res(k, tk).h5 >= 4 ? 1 : 0 }
  return s / idx.length * 100
}
console.log('')

/* ══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② TOUTES LES ÉLIMINATIONS DE RANG, bloc par bloc')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⚠ « tickets changés » = combien de courses changent RÉELLEMENT.')
console.log('    0 signifie que la règle ne peut rien faire, quel que soit son nom.')
console.log('')
console.log('  variante               changées   3/3      4/4|3/3   5/5|3/3   ≥4/5|3/3   moy|3/3')
console.log('  ' + '-'.repeat(88))
const toutes = [['— aucune —', null]]
BLOCS.forEach((b, i) => {
  for (let r = 1; r <= b.max - b.min + 1; r++) toutes.push([b.id + ' : jamais le ' + r + 'e', { bloque: b.id, rang: r }])
})
const emps = new Map()
for (const [nom, e] of toutes) {
  const x = empreinte(idxAll, e)
  emps.set(nom, x)
  const fleche = nom === '— aucune —' ? '' : (x.changees === 0 ? '   ← NO-OP' : '')
  console.log('  ' + nom.padEnd(22) + String(e ? x.changees : A.nb).padStart(8)
    + x.porte.toFixed(1).padStart(8) + x.c44.toFixed(1).padStart(9) + x.c55.toFixed(1).padStart(9)
    + x.c45.toFixed(1).padStart(10) + x.cMoy.toFixed(2).padStart(9) + fleche)
}
console.log('')
console.log('  la référence « aucune » :')
console.log('  ' + '— aucune —'.padEnd(22) + String(A.nb).padStart(8)
  + A.porte.toFixed(1).padStart(8) + A.c44.toFixed(1).padStart(9) + A.c55.toFixed(1).padStart(9)
  + A.c45.toFixed(1).padStart(10) + A.cMoy.toFixed(2).padStart(9))
console.log('')

const actives = toutes.filter((t) => t[1] && emps.get(t[0]).changees > 0)
console.log('  ⭐ ' + actives.length + ' règles sur ' + (toutes.length - 1) + ' changent vraiment le ticket.')
console.log('    Les ' + (toutes.length - 1 - actives.length) + ' autres sont des NO-OP : dans un bloc rempli')
console.log('    par la cote, écarter un rang au-delà de la quota ne peut rien changer.')
console.log('')

/* ══════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LA RÈGLE STRICTE — sur les règles qui agissent vraiment')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log(' ① 3/3 (la porte)      ne doit PAS baisser        → c est le seuil d existence')
console.log(' ② 5/5 parmi 3/3       ne doit PAS baisser        → obligatoire')
console.log(' ③ ≥3 périodes sur 4    doivent aller dans le même sens')
console.log('')
const bruitP = 100 / A.nb / 2
const bruitC = 100 / A.parmiN / 2
const candidats = []
for (const [nom, e] of actives) {
  const a = A
  const b = emps.get(nom)
  const sens = []
  for (const [lib, d1, d2] of PERIODES) {
    const idx = idxAll.filter((i) => base[i].date >= d1 && base[i].date <= d2)
    if (idx.length < 12) continue
    const x = empreinte(idx, null)
    const y = empreinte(idx, e)
    /* la conversion, celle qui compte vraiment */
    sens.push({
      porte: y.porte - x.porte,
      c55: (y.c55 == null || x.c55 == null) ? 0 : y.c55 - x.c55,
      c45: (y.c45 == null || x.c45 == null) ? 0 : y.c45 - x.c45,
      cMoy: y.cMoy - x.cMoy,
    })
  }
  const dPorte = b.porte - a.porte
  const d55 = b.c55 - a.c55
  const d45 = b.c45 - a.c45
  const dMoy = b.cMoy - a.cMoy
  const posC55 = sens.filter((s) => s.c55 > bruitC).length
  const negC55 = sens.filter((s) => s.c55 < -bruitC).length
  const posP = sens.filter((s) => s.porte > bruitP).length
  const negP = sens.filter((s) => s.porte < -bruitP).length
  const porteOk = dPorte > -bruitP
  const c55Ok = d55 > -bruitC
  const stable = negC55 === 0 && negP === 0 && (posC55 >= 3 || posP >= 3)
  candidats.push({ nom, dPorte, d55, d45, dMoy, posC55, negC55, posP, negP, porteOk, c55Ok, stable, sens })
}
console.log('  règle                    3/3        5/5|3/3    ≥4/5|3/3   moy|3/3    4 périodes 5/5↑  porte↓  VERDICT')
console.log('  ' + '-'.repeat(112))
for (const c of candidats.sort((a, b) => (b.d55 - a.d55) || (b.dPorte - a.dPorte))) {
  const v = !c.porteOk ? '✗ porte baisse'
    : !c.c55Ok ? '✗ 5/5|3/3 baisse'
      : c.stable ? '✓ PASSE'
        : c.posC55 >= 2 ? '⚠ signal instable' : '✗ aucun gain'
  console.log('  ' + c.nom.padEnd(22)
    + ((c.dPorte > 0 ? '+' : '') + c.dPorte.toFixed(1)).padStart(7)
    + ((c.d55 > 0 ? '+' : '') + c.d55.toFixed(1)).padStart(11)
    + ((c.d45 > 0 ? '+' : '') + c.d45.toFixed(1)).padStart(12)
    + ((c.dMoy > 0 ? '+' : '') + c.dMoy.toFixed(2)).padStart(11)
    + String(c.posC55 + '/4').padStart(10)
    + String(c.negP).padStart(9)
    + '  ' + v)
}
console.log('')

const gagnantes = candidats.filter((c) => c.stable && c.porteOk && c.c55Ok)
console.log('  ══════════════════════════════════════════════════════════════')
if (gagnantes.length) {
  console.log('  ⭐ ' + gagnantes.length + ' règle(s) passent la règle stricte :')
  gagnantes.forEach((c) => console.log('     ' + c.nom))
} else {
  console.log('  ⭐ AUCUNE règle ne passe. Sur ' + n + ' Quintés, dans 4 périodes,')
  console.log('    avec la porte 3/3 comme seuil et la conversion 5/5|3/3 comme')
  console.log('    juge : aucune façon de choisir UN cheval de moins dans un bloc')
  console.log('    n améliore le ticket de façon stable.')
  console.log('')
  const meilleur = candidats.filter((c) => c.porteOk && c.c55Ok).sort((a, b) => b.d55 - a.d55)[0]
  if (meilleur) {
    console.log('    la moins mauvaise : ' + meilleur.nom
      + '  (3/3 ' + ((meilleur.dPorte > 0 ? '+' : '') + meilleur.dPorte.toFixed(1))
      + ' · 5/5|3/3 ' + ((meilleur.d55 > 0 ? '+' : '') + meilleur.d55.toFixed(1))
      + ' · ' + meilleur.posC55 + '/4 périodes)')
  }
}
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⚠ RAPPEL : ces 347 courses n ont pas de presse. L ordre de référence')
console.log('    est la cote, et le remplissage est la cote. Une règle « ne prends')
console.log('    jamais le N e par cote » dans un bloc de quota q n agit que si')
console.log('    N ≤ q. C est une propriété de la mesure, pas une découverte.')
console.log('    Sur le corpus 94 (avec presse) le même test est possible et')
console.log('    l ordre de référence et l ordre de remplissage sont DIFFÉRENTS.')
console.log('')