/* ---------------------------------------------------------------
 * tools\positions.mjs  —  ⭐ م L E   P O S I T I O N   N O N   L ' E N T R É E
 *
 *   node tools\positions.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Mesure seule. Quotas 3-2-1-1-1 intacts.
 *
 * LA MÉTHODE DE L UTILISATEUR, EN UNE PHRASE
 *   le ticket ne doit PAS être « les 7 meilleures probabilités ».
 *   il doit être  4 chevaux CHERCHÉS  (G2/G3/G4/G5)  qui visent
 *   le 2e, le 3e et le 5e,  +  3 chevaux de G1  qui couvrent le troupeau.
 *
 *   donc la question n est pas « qui a le plus de chances de gagner »
 *   mais « QUI PRODUIT LE 2e, LE 3e ET LE 5e ».
 *
 * CE QUE CE SCRIPT FAIT
 *   ① la provenance des VARÉS : de quel bloc sort le 2e, le 3e, le 5e ?
 *   ② le profil DE CHAQUE RANG de presse, une fois dans le ticket :
 *      1er / 2e / 3e / 4e / 5e / 6e et plus.
 *      « 12 % de Top 5 » ne dit rien. « 9 % de 2e » dit beaucoup.
 *   ③ le classement des rangs par CONVERSION vers le 2e/3e et vers le 5e
 *   ④ la construction à 7 : 3 de G1 + 4 choisis par cette conversion
 *   ⑤ Append/test : le choix des 4 se fait sur les 70 premières courses,
 *      on le vérifie sur les 24 dernières JAMAIS VUES.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')
const COUPURE = 70

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]

const corpus = JSON.parse(fs.readFileSync(F, 'utf8')).courses
  .map((k) => ({ ...k, pDe: new Map(k.presse.map((x, i) => [x, i + 1])) }))
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = corpus.length

const numsBloc = (k, i) => k.presse.filter((x) => { const r = k.pDe.get(x); return r >= BLOCS[i].min && r <= BLOCS[i].max })
const parCote = (k, i) => numsBloc(k, i).slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999))
const ticketA = (k) => BLOCS.flatMap((b, i) => parCote(k, i).slice(0, b.quota))
const TICKETS = corpus.map((k) => new Set(ticketA(k)))
const blocDe = (r) => BLOCS.findIndex((b) => r >= b.min && r <= b.max)
const rangDe = (k, num) => k.pDe.get(num)
const place = (k, num) => k.arrivee.indexOf(num) + 1

const vide = () => ({ n: 0, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, hors: 0 })
const ajouter = (c, p) => { c.n++; if (p >= 1 && p <= 5) c['p' + p]++; else c.hors++ }

/* ══════════════════════════════════════════════════════════════════ */
console.log('')
console.log('  ⭐⭐ D O Ù   V I E N N E N T   L E S   G A G N A N T S ?')
console.log('     ' + n + ' Quintés avec presse · ' + corpus[0].date + ' → ' + corpus[n - 1].date)
console.log('')

/* ═══ ① la provenance des places ══════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① LE PODIUM ET LA 5e PLACE — de quel bloc ils sortent ?')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⭐ On ne se demande pas « qui a le plus de chances de gagner ».')
console.log('    On se demande QUI PRODUIT le 2e, le 3e et le 5e.')
console.log('')

const prov = BLOCS.map(() => vide())
const provHors = vide()
for (let ki = 0; ki < n; ki++) {
  const k = corpus[ki]
  for (let p = 1; p <= 5; p++) {
    const num = k.arrivee[p - 1]
    if (num == null) continue
    const r = rangDe(k, num)
    const bi = blocDe(r)
    ajouter(prov[bi] < undefined ? provHors : prov[bi], p)
  }
}
/* G5 = tout ce qui est au-delà de P12 */
const prov5 = vide()
const autres = []
for (let ki = 0; ki < n; ki++) {
  const k = corpus[ki]
  for (let p = 1; p <= 5; p++) {
    const num = k.arrivee[p - 1]
    if (num == null) continue
    const r = rangDe(k, num)
    const bi = blocDe(r)
    if (bi < 4) ajouter(prov[bi], p)
    else { ajouter(prov5, p); autres.push({ r, p }) }
  }
}

console.log('  bloc   dans le      1er     2e      3e      4e      5e      % de la place')
console.log('         ticket                                    (part de toutes les places 1-5)')
console.log('  ' + '-'.repeat(88))
let totN = 0
prov.forEach((c, i) => { totN += c.n })
totN += prov5.n
prov.forEach((c, i) => {
  const tot = c.n + (i === 3 ? prov5.n : 0)
  const sel = BLOCS[i].quota
  const dispo = BLOCS[i].max - BLOCS[i].min + 1
  console.log('  ' + BLOCS[i].id.padEnd(6) + (sel + '/' + dispo).padStart(9)
    + String(c.p1).padStart(8) + String(c.p2).padStart(8) + String(c.p3).padStart(8)
    + String(c.p4).padStart(8) + String(c.p5).padStart(8)
    + '   ' + (c.n / totN * 100).toFixed(1).padStart(5) + ' %'
    + (BLOCS[i].id === 'G1' ? '   ← le troupeau' : ''))
})
console.log('  ' + '-'.repeat(88))
console.log('  ' + 'toutes'.padEnd(15) + String(prov.reduce((a, c) => a + c.p1, 0)).padStart(8)
  + String(prov.reduce((a, c) => a + c.p2, 0)).padStart(8)
  + String(prov.reduce((a, c) => a + c.p3, 0)).padStart(8)
  + String(prov.reduce((a, c) => a + c.p4, 0)).padStart(8)
  + String(prov.reduce((a, c) => a + c.p5, 0)).padStart(8)
  + '   ' + '100.0 %')
console.log('')

console.log('  ⭐ LE 2e ET LE 3e :')
for (let i = 0; i < 4; i++) {
  const tot = prov.slice(0, 4).reduce((a, c) => a + c.n, 0)
  const c23 = prov[i].p2 + prov[i].p3
  console.log('     ' + BLOCS[i].id + '  ' + String(c23).padStart(3) + ' places 2e+3e sur ' + (tot + prov5.p2 + prov5.p3)
    + '  = ' + (c23 / (tot + prov5.p2 + prov5.p3) * 100).toFixed(1).padStart(5) + ' %'
    + (i >= 2 ? '   ← « les cachés »' : ''))
}
console.log('')
console.log('  ⭐ LA 5e PLACE :')
for (let i = 0; i < 4; i++) {
  const tot5 = prov.slice(0, 4).reduce((a, c) => a + c.p5, 0) + prov5.p5
  console.log('     ' + BLOCS[i].id + '  ' + String(prov[i].p5).padStart(3) + ' cinquièmes sur ' + tot5
    + '  = ' + (prov[i].p5 / tot5 * 100).toFixed(1).padStart(5) + ' %'
    + (i >= 1 ? '   ← « les cachés »' : ''))
}
console.log('')

/* ═══ ② le profil par rang de presse ══════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② LE PROFIL DE CHAQUE RANG — une fois DANS le ticket')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⭐ « 12 % de Top 5 » ne dit rien. « 9 % de 2e » dit beaucoup.')
console.log('')
console.log('  rang   dans le    1er    2e    3e    4e    5e    6e+   |  2e+3e    5e     Top5')
console.log('         ticket    ---- la conversion une fois dans le ticket ----|  -------- la conversion')
console.log('  ' + '-'.repeat(94))
const parRang = []
for (let r = 1; r <= 16; r++) {
  const c = vide()
  for (let ki = 0; ki < n; ki++) {
    const k = corpus[ki]
    const num = k.presse[r - 1]
    if (num == null) continue
    if (!TICKETS[ki].has(num)) continue
    ajouter(c, place(k, num))
  }
  if (!c.n) continue
  const bi = blocDe(r)
  const retenu = r <= BLOCS[bi].min + BLOCS[bi].quota - 1
  parRang.push({ r, ...c, c23: (c.p2 + c.p3) / c.n * 100, c5: c.p5 / c.n * 100, cT5: (c.p1 + c.p2 + c.p3 + c.p4 + c.p5) / c.n * 100 })
  console.log('  ' + ('P' + r).padEnd(6) + String(c.n).padStart(8)
    + String(c.p1).padStart(6) + String(c.p2).padStart(6) + String(c.p3).padStart(6)
    + String(c.p4).padStart(6) + String(c.p5).padStart(6) + String(c.hors).padStart(6)
    + '   |' + parRang[parRang.length - 1].c23.toFixed(1).padStart(8)
    + parRang[parRang.length - 1].c5.toFixed(1).padStart(7)
    + parRang[parRang.length - 1].cT5.toFixed(1).padStart(8)
    + (retenu ? '' : '   ← hors quota'))
}
console.log('')

/* ═══ ③ le classement par conversion ══════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ QUI PRODUIT LE 2e/3e ET LE 5e — le classement')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⚠ Attention : un rang « hors quota » n entre jamais dans le')
console.log('    ticket actuel, donc sa conversion n est pas comparable. On')
console.log('    ne classe QUE les rangs que la méthode prend déjà.')
console.log('')
const retenus = parRang.filter((x) => { const bi = blocDe(x.r); return x.r <= BLOCS[bi].min + BLOCS[bi].quota - 1 && x.n >= 20 })
console.log('  A · par la CONVERSION vers le 2e + 3e')
console.log('     rang   bloc   2e+3e %    n      dans le ticket')
;[...retenus].sort((a, b) => b.c23 - a.c23).forEach((x) => {
  console.log('     ' + ('P' + x.r).padEnd(7) + BLOCS[blocDe(x.r)].id.padEnd(7)
    + x.c23.toFixed(1).padStart(7) + '%' + String(x.n).padStart(6) + '   '
    + (blocDe(x.r) >= 1 ? '🔵 caché' : '🟡 G1'))
})
console.log('')
console.log('  B · par la CONVERSION vers le 5e')
console.log('     rang   bloc    5e %    n')
;[...retenus].sort((a, b) => b.c5 - a.c5).forEach((x) => {
  console.log('     ' + ('P' + x.r).padEnd(7) + BLOCS[blocDe(x.r)].id.padEnd(7)
    + x.c5.toFixed(1).padStart(6) + '%' + String(x.n).padStart(6) + '   '
    + (blocDe(x.r) >= 1 ? '🔵 caché' : '🟡 G1'))
})
console.log('')

/* ═══ ④ + ⑤ la construction à 7 ══════════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ④ LA CONSTRUCTION À 7 — 3 de G1 + 4 cherchés')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
console.log('  ⚠ APP/TEST : les 4 rangs sont choisis sur les ' + COUPURE
  + ' premières courses,')
console.log('    puis vérifiés sur les ' + (n - COUPURE) + ' dernières JAMAIS VUES.')
console.log('')

const idxTrain = corpus.map((_, i) => i).slice(0, COUPURE)
const idxTest = corpus.map((_, i) => i).slice(COUPURE)

/** le profil par rang, calculé sur un sous-ensemble */
function profil(idx) {
  const p = {}
  for (let r = 1; r <= 16; r++) p[r] = vide()
  for (const ki of idx) {
    const k = corpus[ki]
    for (let r = 1; r <= 16; r++) {
      const num = k.presse[r - 1]
      if (num == null) continue
      if (!TICKETS[ki].has(num)) continue
      ajouter(p[r], place(k, num))
    }
  }
  return p
}
const profTrain = profil(idxTrain)

const G1 = BLOCS[0]
const rangsG1 = profTrain
  ? Object.keys(profTrain).map(Number).filter((r) => r <= 4)
  : [1, 2, 3]
const prisG1 = [1, 2, 3]     /* les 3 premiers rangs de G1 : la couverture du troupeau */

/** les 4 rangs « cachés » : 2 pour le 2e/3e, 2 pour le 5e, parmi G2..G5 */
function rangsChoisis(p) {
  const dispo = []
  for (let r = 5; r <= 16; r++) {
    const c = p[r]
    if (!c || c.n < 10) continue
    dispo.push({ r, c23: (c.p2 + c.p3) / c.n * 100, c5: c.p5 / c.n * 100 })
  }
  const pour23 = [...dispo].sort((a, b) => b.c23 - a.c23).slice(0, 2).map((x) => x.r)
  const pour5 = [...dispo].filter((x) => !pour23.includes(x.r)).sort((a, b) => b.c5 - a.c5).slice(0, 2).map((x) => x.r)
  return { pour23, pour5 }
}
const choixTrain = rangsChoisis(profTrain)
console.log('  sur APPRENTISSAGE : 2 pour le 2e/3e = P' + choixTrain.pour23.join(' + P')
  + '   ·   2 pour le 5e = P' + choixTrain.pour5.join(' + P'))
console.log('')

/** le ticket « 7 » : 3 de G1 par cote + les 4 rangs choisis */
function ticket7(k, pris, pour23, pour5) {
  const t = []
  for (const r of pris) { const num = k.presse[r - 1]; if (num != null) t.push(num) }
  for (const r of [...pour23, ...pour5]) { const num = k.presse[r - 1]; if (num != null && !t.includes(num)) t.push(num) }
  return t
}
const A_ = []
for (const ki of idxAll(idxTrain, idxTest)) A_.push(TICKETS[ki])

function idxAll(a, b) { return [...a, ...b] }
function mesurer(idx, tk) {
  const portes = []
  let n3 = 0
  let n5 = 0
  for (const ki of idx) {
    const k = corpus[ki]
    const s = tk(ki)
    const h3 = k.arrivee.slice(0, 3).filter((x) => s.has(x)).length
    if (h3 === 3) {
      n3++
      portes.push(k.arrivee.slice(0, 5).filter((x) => s.has(x)).length)
    }
    if (k.arrivee.slice(0, 5).every((x) => s.has(x))) n5++
  }
  const np = portes.length
  return {
    porte: n3 / idx.length * 100, nb3: n3, np,
    c55: np ? portes.filter((v) => v === 5).length / np * 100 : null,
    nb55: np ? portes.filter((v) => v === 5).length : 0,
    c45: np ? portes.filter((v) => v >= 4).length / np * 100 : null,
    brut5: n5 / idx.length * 100,
    cMoy: np ? portes.reduce((a, v) => a + v, 0) / np : 0,
  }
}

const tkActuel = (ki) => TICKETS[ki]
const tk7 = (ki) => new Set(ticket7(corpus[ki], prisG1, choixTrain.pour23, choixTrain.pour5))

const lignes = []
for (const [lib, idx] of [['TOUT LE CORPUS', idxTrain.concat(idxTest)], ['APPRENTISSAGE', idxTrain], ['TEST — JAMAIS VU', idxTest]]) {
  const a = mesurer(idx, tkActuel)
  const b = mesurer(idx, tk7)
  lignes.push({ lib, idx, a, b })
  console.log('  ' + lib + '  (' + idx.length + ' courses)')
  console.log('    ' + ''.padEnd(26) + 'porte 3/3    5/5|3/3    ≥4/5|3/3    5/5 brut    moyenne')
  const l = (v) => (v == null ? '   —  ' : v.toFixed(1).padStart(6))
  console.log('    ' + 'actuel (3-2-1-1-1, 8)'.padEnd(26) + l(a.porte) + l(a.c55) + l(a.c45) + l(a.brut5) + a.cMoy.toFixed(2).padStart(9))
  console.log('    ' + '7 = 3 G1 + 4 cherchés'.padEnd(26) + l(b.porte) + l(b.c55) + l(b.c45) + l(b.brut5) + b.cMoy.toFixed(2).padStart(9))
  console.log('    ' + 'Δ'.padEnd(26) + ((b.porte - a.porte > 0 ? '+' : '') + (b.porte - a.porte).toFixed(1)).padStart(6)
    + ((b.c55 - a.c55 > 0 ? '+' : '') + (b.c55 - a.c55).toFixed(1)).padStart(9)
    + ((b.c45 - a.c45 > 0 ? '+' : '') + (b.c45 - a.c45).toFixed(1)).padStart(11)
    + ((b.brut5 - a.brut5 > 0 ? '+' : '') + (b.brut5 - a.brut5).toFixed(1)).padStart(12)
    + ((b.cMoy - a.cMoy > 0 ? '+' : '') + (b.cMoy - a.cMoy).toFixed(2)).padStart(11))
  console.log('')
}

console.log('  ⭐ LECTURE DU TEST (jamais vu) :')
const t = lignes.find((x) => x.lib.startsWith('TEST'))
if (t) {
  const dP = t.b.porte - t.a.porte
  const d5 = t.b.c55 - t.a.c55
  console.log('     porte 3/3      : ' + t.a.porte.toFixed(1) + ' → ' + t.b.porte.toFixed(1)
    + '   ' + (dP > 0 ? '+' : '') + dP.toFixed(1))
  console.log('     5/5 | 3/3      : ' + (t.a.c55 == null ? '—' : t.a.c55.toFixed(1)) + ' → '
    + (t.b.c55 == null ? '—' : t.b.c55.toFixed(1)) + '   ' + (d5 > 0 ? '+' : '') + (d5 || 0).toFixed(1))
  console.log('     5/5 toutes     : ' + t.a.brut5.toFixed(1) + ' → ' + t.b.brut5.toFixed(1)
    + '   ' + ((t.b.brut5 - t.a.brut5 > 0 ? '+' : '') + (t.b.brut5 - t.a.brut5).toFixed(1))
    + '   ← « 7 chevaux » vaut mieux ou moins que 8 ?')
  console.log('')
  console.log('     ⚠ ' + t.idx.length + ' courses : 1 course = ' + (100 / t.idx.length).toFixed(1)
    + ' point. Ne pas lire plus fin.')
}
console.log('')

/* ═══ la question du compte de chevaux ═══════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ⑤ 7 OU 8 ? — le compte se paie')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')
const all = lignes.find((x) => x.lib.startsWith('TOUT'))
console.log('     ticket actuel : 8 chevaux   porte ' + all.a.porte.toFixed(1) + ' %')
console.log('     construction  : 7 chevaux   porte ' + all.b.porte.toFixed(1) + ' %')
console.log('')
console.log('  ⚠ Deuxquerêtes différentes : la porte 3/3, et la conversion.')
console.log('    Elles ne vont pas dans le même sens depuis le début.')
console.log('')