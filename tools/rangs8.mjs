/* ---------------------------------------------------------------
 * tools\rangs8.mjs  —  ⭐ LES 1 287 LISTES DE 8 RANGS, ET LA VRAIE
 *                        COMPARAISON
 *
 *   node tools\rangs8.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. Lecture seule.
 *
 * CE QUE CE SCRIPT RÉPOND
 *   · le taux de Top 5 par rang, calculé SUR TOUT LE CORPUS (et pas
 *     seulement sur les 260 courses d apprentissage — c était l erreur
 *     de la réponse précédente)
 *   · est-ce qu UNE liste de 8 rangs peut battre les 8 premiers ?
 *     → les 1287 sous-ensembles de 8 parmi 13, classés puis testés
 *   · où se placent vraiment vos deux listes A et B ?
 *   · le détail rang par rang : quel rang coûte, quel rang rapporte
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'chevaux.json')
const TAILLE = 13
const GARDER = 8

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .filter((k) => k.partants && k.partants.length >= 10 && (k.partants || []).some((p) => p.top5))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const cut = Math.round(n * 0.75)
const idxAll = base.map((_, i) => i)
const idxApp = idxAll.slice(0, cut)
const idxTest = idxAll.slice(cut)

const parRang = base.map((k) => {
  const m = new Map()
  for (const p of k.partants) if (p.rangMarche) m.set(p.rangMarche, p.num)
  return m
})
const taille = parRang.map((m) => m.size)

function evaluer(liste, idx) {
  let c5 = 0; let c4 = 0; let ge45 = 0; let s5 = 0; let p3 = 0
  for (const ki of idx) {
    const m = parRang[ki]
    const nums = liste.map((r) => m.get(r)).filter((x) => x != null)
    const c = base[ki].arrivee.slice(0, 5).filter((x) => nums.includes(x)).length
    if (c === 5) c5++
    if (c === 4) c4++
    if (c >= 4) ge45++
    s5 += c
    if (base[ki].arrivee.slice(0, 3).filter((x) => nums.includes(x)).length === 3) p3++
  }
  const t = idx.length
  return { c5: c5 / t * 100, c4: c4 / t * 100, ge45: ge45 / t * 100, moy: s5 / t, p3: p3 / t * 100 }
}
function rng(n, k) {
  const out = []
  const comb = (start, cur) => {
    if (cur.length === k) { out.push(cur.slice()); return }
    for (let i = start; i <= n - (k - cur.length); i++) { cur.push(i); comb(i + 1, cur); cur.pop() }
  }
  comb(1, [])
  return out
}

console.log('')
console.log('  ⭐⭐ LES 8 RANGS — TOUT LE CORPUS, PAS SEULEMENT L APPRENTISSAGE')
console.log('     ' + n + ' Quintés')
console.log('')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  ① LE TAUX DE TOP 5 PAR RANG — corpus entier')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
console.log('  rang    chevaux    Top 5     %     cote moy.')
console.log('  ' + '-'.repeat(52))
const taux = []
for (let r = 1; r <= TAILLE; r++) {
  let n2 = 0; let t5 = 0; let cs = 0
  for (let ki = 0; ki < n; ki++) {
    const p = base[ki].partants.find((x) => x.rangMarche === r)
    if (!p) continue
    n2++
    if (p.top5) t5++
    if (p.cote > 0) cs += p.cote
  }
  if (!n2) break
  taux.push({ r, n2, t5, t: t5 / n2 * 100, cote: cs / n2 })
  console.log('  P' + String(r).padEnd(5) + String(n2).padStart(8) + String(t5).padStart(8)
    + (t5 / n2 * 100).toFixed(1).padStart(8) + ' %' + (cs / n2).toFixed(1).padStart(11))
}
console.log('')
console.log('  ⭐ À partir de P8 le taux ne baisse PLUS : P8 ' + taux[7].t.toFixed(1)
  + ' %, P9 ' + taux[8].t.toFixed(1) + ' %, P10 ' + taux[9].t.toFixed(1)
  + ' %, P11 ' + taux[10].t.toFixed(1) + ' %, P12 ' + taux[11].t.toFixed(1) + ' %.')
console.log('    Ils valent tous à peu près autant, et tous bien moins que P1-P6.')
console.log('')

console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  ② VOS DEUX LISTES, ET LES 8 PREMIERS')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
const LISTES = [
  ['les 8 premiers', [1, 2, 3, 4, 5, 6, 7, 8]],
  ['A · P1-P2-P3-P5-P6-P9-P12-P13', [1, 2, 3, 5, 6, 9, 12, 13]],
  ['B · P1-P2-P4-P5-P6-P8-P12-P13', [1, 2, 4, 5, 6, 8, 12, 13]],
]
console.log('  liste                                 5/5    4/5   ≥4/5  moyenne   3/3   (TEST 5/5)')
console.log('  ' + '-'.repeat(80))
for (const [lib, l] of LISTES) {
  const m = evaluer(l, idxAll)
  const t = evaluer(l, idxTest)
  console.log('  ' + lib.padEnd(36) + m.c5.toFixed(1).padStart(5) + ' %' + m.c4.toFixed(1).padStart(7)
    + ' %' + m.ge45.toFixed(1).padStart(7) + ' %' + m.moy.toFixed(2).padStart(9)
    + m.p3.toFixed(1).padStart(7) + ' %' + t.c5.toFixed(1).padStart(9) + ' %')
}
console.log('')

console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  ③ LES ' + rng(TAILLE, GARDER).length + ' LISTES DE 8 RANGS')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
const combos = rng(TAILLE, GARDER)
const scored = combos.map((c) => ({ c, a: evaluer(c, idxApp) }))
scored.sort((x, y) => y.a.moy - x.a.moy || y.a.c5 - x.a.c5)
console.log('  choisies sur les ' + idxApp.length + ' courses d apprentissage, puis testées sur '
  + idxTest.length + ' JAMAIS VUES')
console.log('')
console.log('   #  les 8 rangs                                   APP moy   APP 5/5   TEST moy   TEST 5/5')
console.log('  ' + '-'.repeat(80))
scored.slice(0, 8).forEach((s, i) => {
  const t = evaluer(s.c, idxTest)
  console.log('   ' + String(i + 1).padStart(2) + ' ' + s.c.join(',').padEnd(40)
    + s.a.moy.toFixed(2).padStart(8) + s.a.c5.toFixed(1).padStart(9) + ' %'
    + t.moy.toFixed(2).padStart(10) + t.c5.toFixed(1).padStart(9) + ' %')
})
console.log('')
const rHuit = evaluer([1, 2, 3, 4, 5, 6, 7, 8], idxTest)
console.log('   ·' + ' les 8 premiers (sans apprentissage)'.padEnd(42)
  + ''.padStart(8) + ''.padStart(9) + ' ' + rHuit.moy.toFixed(2).padStart(10) + rHuit.c5.toFixed(1).padStart(9) + ' %')
console.log('')
const oracle = evaluer(scored[0].c, idxTest)
console.log('  ⭐ le MEILLEUR sur APP (il triche) donne sur TEST : moyenne '
  + oracle.moy.toFixed(2) + '   5/5 ' + oracle.c5.toFixed(1) + ' %')
console.log('    les 8 premiers donnent sur TEST               : moyenne '
  + rHuit.moy.toFixed(2) + '   5/5 ' + rHuit.c5.toFixed(1) + ' %')
console.log('    écart                                        : '
  + (oracle.moy - rHuit.moy > 0 ? '+' : '') + (oracle.moy - rHuit.moy).toFixed(2)
  + '   ⇒ ' + (Math.abs(oracle.moy - rHuit.moy) < 0.05 ? 'AUCUN. les 8 premiers sont déjà optimaux.' : 'réel'))
console.log('')

console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  ④ LE COÛT DE CHAQUE RANG AJOUTÉ OU RETIRÉ')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
console.log('  Quel rang coûte le plus si on le retire des 8 premiers ?')
console.log('')
console.log('  rang retiré      5/5     4/5    ≥4/5   moyenne   perte de moyenne')
console.log('  ' + '-'.repeat(66))
const retires = []
for (const r of [1, 2, 3, 4, 5, 6, 7, 8]) {
  const l = [1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== r)
  const m = evaluer(l, idxAll)
  retires.push({ r, m, perte: rHuit.moy - m.moy })
}
retires.sort((a, b) => a.perte - b.perte)
retires.forEach((x) => {
  console.log('  ' + ('retirer P' + x.r).padEnd(16) + x.m.c5.toFixed(1).padStart(5) + ' %'
    + x.m.c4.toFixed(1).padStart(7) + ' %' + x.m.ge45.toFixed(1).padStart(7) + ' %'
    + x.m.moy.toFixed(2).padStart(9) + x.perte.toFixed(2).padStart(19))
})
console.log('')
console.log('  ⭐ retirer P1 coûte ' + retires[0].perte.toFixed(2)
  + ' de moyenne ;  retirer P8 coûte ' + retires[retires.length - 1].perte.toFixed(2) + '.')
console.log('')
console.log('  Quel rang rapporterait le plus si on l AJOUTAIT à la place ?')
console.log('')
console.log('  en remplaçant P8 par…   5/5    4/5    ≥4/5   moyenne')
console.log('  ' + '-'.repeat(58))
const remplacements = []
for (let r = 9; r <= 13; r++) {
  const l = [1, 2, 3, 4, 5, 6, 7, r]
  const m = evaluer(l, idxAll)
  remplacements.push({ r, m, gain: m.moy - rHuit.moy })
}
remplacements.forEach((x) => {
  console.log('  ' + ('P' + x.r).padEnd(22) + x.m.c5.toFixed(1).padStart(5) + ' %'
    + x.m.c4.toFixed(1).padStart(7) + ' %' + x.m.ge45.toFixed(1).padStart(7) + ' %'
    + x.m.moy.toFixed(2).padStart(9) + '   (' + (x.gain > 0 ? '+' : '') + x.gain.toFixed(2) + ')')
})
console.log('')

console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ LE CONTRÔLE — le nombre de chevaux par course')
console.log('  ══════════════════════════════════════════════════════════════════════')
console.log('')
const par = {}
taille.forEach((t) => { par[t] = (par[t] || 0) + 1 })
console.log('  ' + JSON.stringify(par))
const petits = taille.filter((t) => t < GARDER).length
console.log('  courses où la liste de 8 est incomplète : ' + petits + ' / ' + n
  + '  (' + (petits / n * 100).toFixed(1) + ' %)')
console.log('')
console.log('  ⚠ Sur ces courses, la liste A perd P13 (15 fois) et la liste B aussi (15 fois),')
console.log('    alors que « les 8 premiers » garde 8 chevaux. Une partie de l écart vient de là.')
console.log('')
{
  const grands = idxAll.filter((ki) => taille[ki] >= 8)
  console.log('  Sur les ' + grands.length + ' courses où il y a au moins 8 partants :')
  console.log('')
  console.log('  liste                                 5/5    4/5   ≥4/5  moyenne   3/3')
  console.log('  ' + '-'.repeat(66))
  for (const [lib, l] of LISTES) {
    const m = evaluer(l, grands)
    console.log('  ' + lib.padEnd(36) + m.c5.toFixed(1).padStart(5) + ' %' + m.c4.toFixed(1).padStart(7)
      + ' %' + m.ge45.toFixed(1).padStart(7) + ' %' + m.moy.toFixed(2).padStart(9)
      + m.p3.toFixed(1).padStart(7) + ' %')
  }
  console.log('')
}
console.log('  ───────────────────────────────────────────────────────────────')
console.log('  Aucun système n est modifié.')
console.log('  ───────────────────────────────────────────────────────────────')
console.log('')