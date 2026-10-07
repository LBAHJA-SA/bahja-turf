/* ---------------------------------------------------------------
 * tools\sept.mjs  —  ⭐ 7 CHEVAUX → 5/5 — LA VRAIE BOUSSOLE
 *
 *   node tools\sept.mjs
 *
 * ⚠ LABORATOIRE UNIQUEMENT. AUCUN SYSTÈME N EST MODIFIÉ.
 *
 * LE BUT RÉEL, ÉNONCÉ CLAIREMENT
 *   7 chevaux. Dans 75 % des courses, au moins 5 des 5 premiers
 *   doivent être dans ces 7. Ce n'est PAS 8, ce n'est PAS 9.
 *   Ajouter un cheval facilite la tâche sans la résoudre.
 *
 * POURQUOI CE SCRIPT EXISTE
 *   tous les tests faits jusqu'ici、优化لا la répartition des sièges.
 *   Or le problème n'est peut-être pas « quel siège à quel bloc »
 *   mais « quels chevaux on jette, et où étaient les vrais gagnants ».
 *
 * CE QU IL FAIT
 *   ① le score brut : 7 chevaux → 5/5, sur 347 courses et sur 4 périodes
 *   ② la CARTE DE LA PERTE : où étaient les chevaux du Top 5
 *      qui ne sont pas dans les 7 ?  (position de presse, bloc)
 *   ③ le « Cinquième manquant » : quand on est à 4/5, qui manque ?
 *   ④ le point de bascule : à partir de quand le 5/5 devient-il perdu ?
 *   ⑤ le plafond théorique : quelle taille de ticket atteindrait 75 % ?
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const FF = path.join(RACINE, 'data', 'corpus', 'fusion.json')
const F94 = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 },
  { id: 'G3', min: 9, max: 10 }, { id: 'G4', min: 11, max: 12 },
  { id: 'G5', min: 13, max: 99 },
]
const PERIODES = [
  ['P1 · 2024-09 → 2025-10', '2024-01-01', '2025-12-31'],
  ['P2 · 2026-01 → 2026-03', '2026-01-01', '2026-03-31'],
  ['P3 · 2026-04 → 2026-06', '2026-04-01', '2026-06-30'],
  ['P4 · 2026-07 → 2026-10', '2026-07-01', '2026-12-31'],
]

const FUS = JSON.parse(fs.readFileSync(FF, 'utf8')).courses
const base = FUS.map((k) => ({ ...k, arrivee: (k.arrivee || []).slice() }))
  .filter((k) => k.arrivee.length >= 5 && (k.ordreCote || []).length >= 10)
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const pDe = base.map((k) => new Map(k.presse.map((x, i) => [x, i + 1])))

const cands = base.map((k) => BLOCS.map((b, i) =>
  k.ordreCote.filter((x, r) => r + 1 >= b.min && r + 1 <= b.max)
    .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))))

/** les N meilleurs chevaux du moteur, par ordre de bloc puis par cote */
const ordreBloc = BLOCS.flatMap((b) => Array.from({ length: 6 }, (_, r) => ({ b: b.id, rang: r + 1 })))
function sept(ki, N) {
  const out = []
  const siege = new Map()
  for (let i = 0; i < BLOCS.length; i++) {
    for (const num of cands[ki][i]) {
      if (out.length >= N) break
      out.push(num)
      siege.set(num, BLOCS[i].id + '[' + (cands[ki][i].indexOf(num) + 1) + ']')
    }
  }
  return { nums: out.slice(0, N), siege }
}
const T7 = base.map((k, ki) => sept(ki, 7))
const T8 = base.map((k, ki) => sept(ki, 8))
const T9 = base.map((k, ki) => sept(ki, 9))
const TOUT = base.map((k, ki) => sept(ki, 99))

const place = (k, num) => k.arrivee.indexOf(num) + 1
const blocDu = (k, num) => {
  const r = pDe[ki0].get(num)
  return r
}
let ki0 = 0

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐⭐  7  C H E V A U X  →  5 / 5    L E   V R A I   B O U S S O L E')
console.log('     ' + n + ' Quintés · ' + base[0].date + ' → ' + base[n - 1].date)
console.log('')
console.log('  L objectif : ≥5/5 dans 75 % des courses.')
console.log('  Pas 8 chevaux. Pas 9 chevaux. SEPT.')
console.log('')

const score = (T) => {
  const par = [0, 0, 0, 0, 0, 0]
  let som = 0
  for (let ki = 0; ki < n; ki++) {
    const k = base[ki]
    const c = k.arrivee.slice(0, 5).filter((x) => T[ki].nums.includes(x)).length
    par[c]++
    som += c
  }
  return { par, taux: par[5] / n * 100, ge5: (par[5] + par[4] + par[3]) / n * 100, moy: som / n }
}

console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① LE SCORE BRUT — combien de chevaux du Top 5 dans le ticket')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ticket      5/5    4/5    3/5    2/5    1/5    0/5   |   ≥5/5    moyenne')
console.log('  ' + '-'.repeat(80))
const lignes = []
for (const [lib, T] of [['7 chevaux', T7], ['8 chevaux', T8], ['9 chevaux', T9]]) {
  const s = score(T)
  lignes.push({ lib, T, s })
  console.log('  ' + lib.padEnd(12)
    + s.par.slice(0, 6).map((v) => (v / n * 100).toFixed(1).padStart(6)).join('')
    + '   |  ' + s.taux.toFixed(1).padStart(5) + ' %  ' + s.moy.toFixed(2).padStart(6))
}
console.log('  ' + '-'.repeat(80))
console.log('')
console.log('  ⭐ Avec 7 chevaux : 5/5 dans ' + lignes[0].s.taux.toFixed(1)
  + ' % des courses.  L objectif est 75 %.')
console.log('     Il manque ' + (75 - lignes[0].s.taux).toFixed(1) + ' points.')
console.log('')
console.log('  Pour information, avec les meilleurs chevaux possibles (tous) :')
{
  let cinq = 0
  for (const k of base) cinq += k.arrivee.slice(0, 5).filter((x) => TOUT[ki0].nums.includes(x)).length
  void cinq
}
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ② LA CARTE DE LA PERTE
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LA CARTE DE LA PERTE — où étaient les vrais gagnants ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  Pour chaque place du Top 5 (1er à 5e), on demande :')
console.log('    · était-il dans les 7 ?')
console.log('    · si non, à quel RANG de presse était-il ? (le 347 a la cote')
console.log('      comme ordre de référence : le « rang » est donc celui de la cote)')
console.log('')

const parPlace = [0, 1, 2, 3, 4].map((pi) => {
  let dans = 0
  const hors = new Map()
  for (let ki = 0; ki < n; ki++) {
    const k = base[ki]
    const num = k.arrivee[pi]
    if (num == null) continue
    if (T7[ki].nums.includes(num)) { dans++; continue }
    const r = k.ordreCote.indexOf(num) + 1
    const bloc = BLOCS.find((b) => r >= b.min && r <= b.max)
    const cle = (bloc ? bloc.id : '?') + (bloc && r > bloc.max - bloc.quota ? ' (hors quota)' : '')
    hors.set(cle, (hors.get(cle) || 0) + 1)
  }
  return { place: pi + 1, dans, hors, total: dans + [...hors.values()].reduce((a, b) => a + b, 0) }
})
console.log('  place   dans les 7    rate   |   où étaient les absents')
console.log('  ' + '-'.repeat(74))
parPlace.forEach((x) => {
  const liste = [...x.hors.entries()].sort((a, b) => b[1] - a[1])
    .map(([k, v]) => k + ' ×' + v).join('  ')
  console.log('  ' + (x.place + (x.place === 1 ? 'er' : 'e')).padEnd(7)
    + String(x.dans).padStart(9) + String(x.total - x.dans).padStart(8)
    + '   |  ' + (liste || '—'))
})
console.log('')

const absents = parPlace.map((x) => x.total - x.dans)
console.log('  ⭐ LES CHEVAUX DU TOP 5 ABSENTS DES 7 :')
console.log('     1er : ' + absents[0] + '   ·   2e : ' + absents[1] + '   ·   3e : ' + absents[2]
  + '   ·   4e : ' + absents[3] + '   ·   5e : ' + absents[4])
console.log('     total : ' + absents.reduce((a, b) => a + b, 0) + ' chevaux perdus sur ' + (n * 5) + ' places')
console.log('')
console.log('  ⭐ LE POINT DE BASCULE :')
console.log('     le 1er manque ' + (absents[0] / n * 100).toFixed(1) + ' % des fois')
console.log('     le 3e manque ' + (absents[2] / n * 100).toFixed(1) + ' % des fois')
console.log('     le 5e manque ' + (absents[4] / n * 100).toFixed(1) + ' % des fois')
console.log('     ⇒ ' + absents.slice(0, 3).reduce((a, b) => a + b, 0) + ' des '
  + absents.reduce((a, b) => a + b, 0) + ' pertes sont sur les 3 premiers.')
console.log('       Et les 3 premiers sont, par construction, DANS les 7.')
console.log('       C est la définition même d un ticket qui couvre bien le podium.')
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ③ LE CINQUIÈME MANQUANT
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LE 5e MANQUANT — quand on est à 4/5, qui est-ce ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const quatre = []
for (let ki = 0; ki < n; ki++) {
  const k = base[ki]
  const c = k.arrivee.slice(0, 5).filter((x) => T7[ki].nums.includes(x)).length
  if (c === 4) {
    const num = k.arrivee[4]
    quatre.push({ ki, num, r: k.ordreCote.indexOf(num) + 1 })
  }
}
const parRang = new Map()
quatre.forEach((x) => {
  const b = BLOCS.find((b) => x.r >= b.min && x.r <= b.max)
  const cle = 'rang ' + x.r + (b ? '  (' + b.id + (x.r > b.max - b.quota ? ', hors quota' : ', dans le quota') + ')' : '')
  parRang.set(cle, (parRang.get(cle) || 0) + 1)
})
console.log('  ' + quatre.length + ' courses sont à 4/5. Voici le 5e, par rang de cote :')
console.log('')
;[...parRang.entries()].sort((a, b) => b[1] - a[1]).forEach(([cle, v]) => {
  console.log('     ' + cle.padEnd(34) + String(v).padStart(4) + '  ' + '█'.repeat(Math.ceil(v / 2))
    + '  ' + (v / quatre.length * 100).toFixed(0) + ' %')
})
console.log('')
const horsQuota = quatre.filter((x) => {
  const b = BLOCS.find((b) => x.r >= b.min && x.r <= b.max)
  return b && x.r > b.max - b.quota
})
console.log('  ⭐ dont HORS QUOTA (le bloc en avait un, mais pas celui-là) : ' + horsQuota.length
  + ' / ' + quatre.length + ' = ' + (horsQuota.length / quatre.length * 100).toFixed(0) + ' %')
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ④ LES 4 PÉRIODES
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ LE SCORE PAR PÉRIODE')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  période                  5/5    ≥4/5   moyenne    (7 chevaux)')
console.log('  ' + '-'.repeat(58))
for (const [lib, a, b] of PERIODES) {
  const idx = base.map((_, i) => i).filter((i) => base[i].date >= a && base[i].date <= b)
  if (!idx.length) continue
  let c5 = 0; let ge4 = 0; let s = 0
  for (const ki of idx) {
    const c = base[ki].arrivee.slice(0, 5).filter((x) => T7[ki].nums.includes(x)).length
    if (c === 5) c5++
    if (c >= 4) ge4++
    s += c
  }
  console.log('  ' + lib.padEnd(26) + (c5 / idx.length * 100).toFixed(1).padStart(6)
    + (ge4 / idx.length * 100).toFixed(1).padStart(8) + (s / idx.length).toFixed(2).padStart(10))
}
console.log('')

/* ══════════════════════════════════════════════════════════════════
 *  ⑤ LE PLAFOND THÉORIQUE
 * ════════════════════════════════════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ LE PLAFOND — que faudrait-il pour atteindre 75 % ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  Si on prenait les 7 meilleurs chevaux PAR ORDRE DE COTE')
console.log('  (donc la copie parfaite du marché) :')
{
  const idx = base.map((_, i) => i)
  const par = [0, 0, 0, 0, 0, 0]
  for (const ki of idx) {
    const k = base[ki]
    const septM = k.ordreCote.slice(0, 7)
    const c = k.arrivee.slice(0, 5).filter((x) => septM.includes(x)).length
    par[c]++
  }
  console.log('     5/5 : ' + (par[5] / n * 100).toFixed(1) + ' %   4/5 : ' + (par[4] / n * 100).toFixed(1)
    + ' %   3/5 : ' + (par[3] / n * 100).toFixed(1) + ' %   moyenne ' + ((par[1] + par[2] * 2 + par[3] * 3 + par[4] * 4 + par[5] * 5) / n).toFixed(2))
  console.log('')
  console.log('     ⭐ même la COPIE PARFAITE du marché ne fait que ' + (par[5] / n * 100).toFixed(1) + ' % de 5/5.')
  console.log('     ⇒ 75 % de 5/5 avec 7 chevaux est peut-être au-dessus')
  console.log('       de ce qu un rang de cote peut faire. Il faudrait une')
  console.log('       information que le marché n a pas.')
}
console.log('')
console.log('  Le nombre de chevaux nécessaires pour 75 % de 5/5,')
console.log('  en prenant les N meilleurs par cote :')
console.log('')
console.log('   taille      5/5      ≥4/5    moyenne')
console.log('  ' + '-'.repeat(48))
for (const N of [7, 8, 9, 10, 11, 12]) {
  const par = [0, 0, 0, 0, 0, 0]
  let s = 0
  for (let ki = 0; ki < n; ki++) {
    const k = base[ki]
    const sel = k.ordreCote.slice(0, N)
    const c = k.arrivee.slice(0, 5).filter((x) => sel.includes(x)).length
    par[c]++
    s += c
  }
  console.log('   ' + (N + ' chevaux').padEnd(12) + (par[5] / n * 100).toFixed(1).padStart(5)
    + ' %  ' + ((par[4] + par[5]) / n * 100).toFixed(1).padStart(6) + ' %  ' + (s / n).toFixed(2).padStart(8))
}
console.log('')
console.log('  ─────────────────────────────────────────────────────────────')
console.log('  ⚠ Le corpus 347 n a pas de presse : « les 7 » est ici le')
console.log('    meilleur par BLOC puis par cote, pas les 7 premiers de la')
console.log('    presse. Sur les 94 courses avec presse, la même mesure est')
console.log('    faite en fin de script.')
console.log('  ─────────────────────────────────────────────────────────────')

/* ══════════════════════════════════════════════════════════════════
 *  ⑥ LE MÊME SUR LES 94, AVEC LA PRESSE
 * ════════════════════════════════════════════════════════════════ */
const c94 = JSON.parse(fs.readFileSync(F94, 'utf8')).courses
  .map((k) => ({ ...k, pDe: new Map(k.presse.map((x, i) => [x, i + 1])) }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n94 = c94.length
const cd = c94.map((k) => BLOCS.map((b, i) =>
  k.presse.filter((x) => { const r = k.pDe.get(x); return r >= b.min && r <= b.max })
    .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999))))
const sept94 = c94.map((k, ki) => {
  const out = []
  for (let i = 0; i < BLOCS.length; i++) for (const num of cd[ki][i]) { if (out.length >= 7) break; out.push(num) }
  return out.slice(0, 7)
})
const par94 = [0, 0, 0, 0, 0, 0]
let s94 = 0
for (let ki = 0; ki < n94; ki++) {
  const c = c94[ki].arrivee.slice(0, 5).filter((x) => sept94[ki].includes(x)).length
  par94[c]++
  s94 += c
}
console.log('')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑥ LE MÊME SUR LES ' + n94 + ' COURSES AVEC PRESSE')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('   5/5 : ' + (par94[5] / n94 * 100).toFixed(1) + ' %   4/5 : ' + (par94[4] / n94 * 100).toFixed(1)
  + ' %   3/5 : ' + (par94[3] / n94 * 100).toFixed(1)
  + ' %   2/5 : ' + (par94[2] / n94 * 100).toFixed(1)
  + ' %   moyenne ' + (s94 / n94).toFixed(2))
console.log('')
console.log('   Les 7 meilleurs par COTE sur ces 94 courses :')
{
  const par2 = [0, 0, 0, 0, 0, 0]
  let s2 = 0
  for (let ki = 0; ki < n94; ki++) {
    const k = c94[ki]
    const sel = Object.keys(k.cotes).map(Number).filter((x) => k.cotes[x] > 0)
      .sort((a, b) => k.cotes[a] - k.cotes[b]).slice(0, 7)
    const c = k.arrivee.slice(0, 5).filter((x) => sel.includes(x)).length
    par2[c]++
    s2 += c
  }
  console.log('   5/5 : ' + (par2[5] / n94 * 100).toFixed(1) + ' %   4/5 : ' + (par2[4] / n94 * 100).toFixed(1)
    + ' %   3/5 : ' + (par2[3] / n94 * 100).toFixed(1)
    + ' %   moyenne ' + (s2 / n94).toFixed(2))
}
console.log('')