/* ---------------------------------------------------------------
 * tools\ab-moteur.mjs  —  ⭐ LA PREUVE, SANS AUTO-FELICITATION
 *
 *   node tools\ab-moteur.mjs
 *
 * Corpus : `data\corpus\presse-carriere.json` — les seuls Quintés où la
 * SYNTHÈSE de la presse et le DÉTAIL des chevaux existent en même temps.
 *
 * Les variantes, une par une, sans les mélanger :
 *
 *   A  marché seul .................. les 8 meilleures cotes
 *   B  synthèse seule ............... quota 3-2-1-1-1, rempli par le RANG de presse
 *   C  synthèse + carrière ......... le quota, mais le remplissage suit la
 *                                    PHYSIQUE (forme, stats, valeur, poids, âge, corde)
 *   D  synthèse + carrière + marché  le moteur d'aujourd'hui : si le bloc a
 *                                    toutes les cotes, c'est elle qui remplit
 *
 * Et le test qui compte vraiment (§ 1 du demande) : **out-of-sample**.
 * On découpe le corpus en 5 plis. Le choix de variante se fait sur 4 plis,
 * la mesure se fait sur le 5e qu'elle n'a jamais vu. Une variante qui ne
 * tient pas hors échantillon, elle n'existe pas.
 *
 * ⭐ ET LA QUESTION FORTE : quand on trouve 3/5, QUEL CHEVAL MANQUAIT ?
 * C'est là qu'on voit s'il existe une zone de valeur.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreForme } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F_CORPUS = path.join(RACINE, 'data', 'corpus', 'presse-carriere.json')
const C = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return Math.round(x) }

/* ------------------------------------------------------------ la grille --- */
const BLOCS = [{ id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 }, { id: 'G3', min: 9, max: 10 }, { id: 'G4', min: 11, max: 12 }, { id: 'G5', min: 13, max: 99 }]
const QUOTA = [3, 2, 1, 1, 1]

/* ------------------------------------------------------------ le corpus --- */
if (!fs.existsSync(F_CORPUS)) {
  console.log('')
  console.log('  ⚠ data\\corpus\\presse-carriere.json n existe pas.')
  console.log('    Lance d\'abord :  node tools\\collecter-corpus.mjs')
  console.log('')
  process.exit(1)
}
const brut = JSON.parse(fs.readFileSync(F_CORPUS, 'utf8'))
const base = []
for (const k of Object.values(brut)) {
  if (!k.partants?.length || k.partants.length < 10) continue
  if (!k.arrivee?.length || k.arrivee.length < 5) continue
  // la presse ne cite pas tout le monde : l'arrivée donne les partants manquants
  const presse = (k.presse || []).filter((n) => k.arrivee.includes(n))
  const nums = presse.concat(k.arrivee.filter((n) => !presse.includes(n)))
  if (nums.length < 10) continue
  const pDe = new Map(nums.map((n, i) => [n, i + 1]))
  const cotes = k.cotes || {}
  const avecCotes = Object.keys(cotes).filter((x) => cotes[x] > 0).length
  const parNum = new Map(k.partants.map((p) => [p.num, p]))
  base.push({ ...k, nums, pDe, cotes, parNum, nb: nums.length, cotesOk: avecCotes >= k.nb - 2 })
}
const n = base.length

/* ------------------------------------------------------ les 6 variantes --- */
/* Le score physique de secours : ce qu'on PEUT mesurer sans carrières
 * détaillées — la forme compressée, les statistiques PMU, la valeur, le
 * poids, l'âge, la corde. Les 4 critères qui manquent (distance, piste,
 * terrain, niveau) ne sont PAS simulés : on ne les invente pas. */

const formeDe = (p, disc) => scoreForme(p.musique, disc).score
const statsDe = (p) => (p.nbVictoires || 0) * 3 + (p.nb2e || 0) * 2 + (p.nb3e || 0) * 1.5 + (p.nbPlaces || 0)
const scorePhysiqueLocal = (p, disc) => {
  const forme = formeDe(p, disc)
  const stats = statsDe(p)
  const valeur = (p.valeur || 36) - 30
  const poids = 60 - (p.poids || 56)
  const age = (p.age || 5) - 4
  const corde = p.corde || p.num
  return forme * 0.34 + stats * 0.10 + valeur * 0.30 + poids * 0.06 + age * 0.06
    + (corde <= 6 ? 1.4 : corde <= 11 ? 0.8 : corde <= 15 ? 0.2 : -0.4)
}

const parBloc = (k) => BLOCS.map((b) => k.nums.filter((num) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max }))

const parRang = (k, bloc) => bloc.slice().sort((a, b) => k.pDe.get(a) - k.pDe.get(b))
const parCote = (k, bloc) => bloc.slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999))

const variante = {
  'A  marché seul (top 8 cotes)': (k) => k.nums.slice().sort((a, b) => (k.cotes[a] || 999) - (k.cotes[b] || 999)).slice(0, 8),
  'B  synthèse seule (3-2-1-1-1, rang)': (k) => parBloc(k).flatMap((b, i) => parRang(k, b).slice(0, QUOTA[i])),
  'C1 synthèse + FORME': (k) => parBloc(k).flatMap((b, i) => b.slice().sort((a, b) => formeDe(k.parNum.get(b) || {}, k.discipline) - formeDe(k.parNum.get(a) || {}, k.discipline)).slice(0, QUOTA[i])),
  'C2 synthèse + STATS PMU': (k) => parBloc(k).flatMap((b, i) => b.slice().sort((a, b) => statsDe(k.parNum.get(b) || {}) - statsDe(k.parNum.get(a) || {})).slice(0, QUOTA[i])),
  'C3 synthèse + PHYSIQUE': (k) => parBloc(k).flatMap((b, i) => b.slice().sort((a, b) => scorePhysiqueLocal(k.parNum.get(b) || {}, k.discipline) - scorePhysiqueLocal(k.parNum.get(a) || {}, k.discipline)).slice(0, QUOTA[i])),
  'D  synthèse + physique + MARCHÉ': (k) => parBloc(k).flatMap((b, i) => (k.cotesOk ? parCote(k, b) : parRang(k, b)).slice(0, QUOTA[i])),
  'E  D + la SURPRISE (pire cote du bloc)': (k) => parBloc(k).flatMap((b, i) => {
    const ordre = (k.cotesOk ? parCote(k, b) : parRang(k, b))
    if (QUOTA[i] < b.length) ordre.push(ordre[ordre.length - 1])
    return ordre.slice(0, QUOTA[i] + (QUOTA[i] < b.length ? 1 : 0))
  }),
}

/* ⭐ LE MÊME PRIX, PLUS DE G2.
 * Le miss analysis dit : 0 manquant en P1-P4, 31 en P5-P8. Donc on ne
 * touche PAS à G1 (3 suffisent, le 4e par cote n'a jamais manqué) et on
 * donne à G2 ce qu'il demande. */
const avecQuota = (q) => (k) => parBloc(k).flatMap((b, i) => (k.cotesOk ? parCote(k, b) : parRang(k, b)).slice(0, q[i]))
variante['F  3-3-1-1-1  (+1 en G2)'] = avecQuota([3, 3, 1, 1, 1])
variante['G  3-4-1-1-1  (+2 en G2)'] = avecQuota([3, 4, 1, 1, 1])
variante['H  2-4-1-1-1  (-1 en G1)'] = avecQuota([2, 4, 1, 1, 1])
variante['I  4-4-1-1-1  (+1 G1 +2 G2)'] = avecQuota([4, 4, 1, 1, 1])
variante['J  3-3-2-1-1  (+1 G2 +1 G3)'] = avecQuota([3, 3, 2, 1, 1])
variante['K  2-2-2-1-1'] = avecQuota([2, 2, 2, 1, 1])
const noms = Object.keys(variante)

/* ------------------------------------------------------------ la mesure --- */
const mesure = (f) => base.map((k) => {
  const t = variante[f](k)
  return { n: t.length, hits: k.arrivee.slice(0, 5).filter((x) => t.includes(x)).length, ticket: t }
})

console.log('')
console.log(`  ⭐ A / B / C / D — ${n} Quintés avec la presse ET les chevaux`)
console.log('     (les 4 critères distance / piste / terrain / niveau ne sont PAS')
console.log('      simulés : sans carrières détaillées on ne les invente pas)')
console.log('')
console.log('  variante                              n   combi   0/5   1/5   2/5   3/5   4/5   5/5   moyen  ≥3/5  ≥4/5   5/5')
console.log('  ' + '-'.repeat(112))

const toutes = {}
for (const f of noms) {
  const t = mesure(f)
  toutes[f] = t
  const rep = [0, 0, 0, 0, 0, 0]
  t.forEach((x) => rep[x.hits]++)
  const moy = t.reduce((a, b) => a + b.hits, 0) / n
  const p = (x) => (t.filter((v) => v.hits >= x).length / n * 100).toFixed(0).padStart(5) + ' %'
  const nMoy = t.reduce((a, b) => a + b.n, 0) / n
  const combi = Math.round(t.reduce((a, b) => a + C(b.n, 5), 0) / n)
  console.log('  ' + f.padEnd(34) + String(Math.round(nMoy)).padStart(3) + String(combi >= 1000 ? (combi / 1000).toFixed(1) + 'k' : combi).padStart(8)
    + rep.map((v) => (v / n * 100).toFixed(0).padStart(6)).join('')
    + moy.toFixed(2).padStart(8) + p(3) + p(4) + p(5))
}

/* ------------------------------------------------------- OUT OF SAMPLE --- */
console.log('')
console.log('  ⭐⭐ OUT-OF-SAMPLE — 5 plis : on choisit sur 4, on mesure sur le 5e')
console.log('')
const K = 5
const idx = base.map((_, i) => i)
let total = 0
let meilleurNom = ''
for (let f = 0; f < K; f++) {
  const train = idx.filter((i) => i % K !== f)
  const test = idx.filter((i) => i % K === f)
  let best = null
  for (const nom of noms) {
    const moy = train.reduce((s, i) => s + toutes[nom][i].hits, 0) / train.length
    if (!best || moy > best.v) best = { nom, v: moy }
  }
  const ob = test.reduce((s, i) => s + toutes[best.nom][i].hits, 0)
  total += ob
  meilleurNom = best.nom
  console.log(`  pli ${f + 1}  gagnante sur l'entraînement : ${best.nom.padEnd(34)} (${best.v.toFixed(2)})  ->  test : ${(ob / test.length).toFixed(2)}`)
}
console.log('  ' + '-'.repeat(104))
console.log(`  HORS ÉCHANTILLON : ${total} arrivants sur ${n} courses  =  ${(total / n).toFixed(2)} par course`)
const hasards = base.map((k) => 8 * 5 / k.nb).reduce((a, b) => a + b, 0) / n
console.log(`  le hasard pour 8 chevaux : ${hasards.toFixed(2)}`)
console.log('')

/* ------------------------------------------------ ⭐ LA QUESTION FORTE --- */
console.log('  ⭐⭐⭐ QUAND ON FAIT 3/5 OU 4/5, QUEL CHEVAL MANQUAIT ?')
console.log('')
const manque = { presse: [0, 0, 0, 0, 0], cote: [0, 0, 0, 0, 0], absent: 0, total: 0 }
for (const i of idx) {
  const k = base[i]
  const t = toutes[meilleurNom][i]
  if (t.hits < 3 || t.hits >= 5) continue
  const manquant = k.arrivee.slice(0, 5).filter((x) => !t.ticket.includes(x))
  for (const num of manquant) {
    const p = k.pDe.get(num)
    const c = Object.keys(k.cotes).map(Number).filter((x) => k.cotes[x] > 0).sort((a, b) => k.cotes[a] - k.cotes[b]).indexOf(num) + 1
    if (p >= 1 && p <= 4) manque.presse[0]++
    else if (p <= 8) manque.presse[1]++
    else if (p <= 10) manque.presse[2]++
    else if (p <= 12) manque.presse[3]++
    else manque.presse[4]++
    if (c >= 1 && c <= 8) manque.cote[0]++
    else if (c <= 12) manque.cote[1]++
    else manque.cote[2]++
    manque.total++
  }
}
console.log(`  sur les courses où la meilleure variante fait 3/5 ou 4/5,`)
console.log(`  il y a ${manque.total} cheval(s) qui manquaient. Où étaient-ils ?`)
console.log('')
console.log('  rang de PRESSE :  P1-P4   P5-P8   P9-P10   P11-P12   P13+')
const tot = manque.total || 1
console.log('                   ' + manque.presse.map((v) => String(v).padStart(7)).join('') + `   (${manque.total})`)
console.log('                   ' + manque.presse.map((v) => ((v / tot * 100).toFixed(0) + '%').padStart(7)).join(''))
console.log('')
console.log('  rang de COTE   :  top 8    r9-12      r13+')
console.log('                   ' + manque.cote.map((v) => String(v).padStart(7)).join('') + `   (${manque.total})`)
console.log('                   ' + manque.cote.map((v) => ((v / tot * 100).toFixed(0) + '%').padStart(7)).join(''))
console.log('')
const zone = manque.presse.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v)[0]
console.log(`  ⭐ la zone la plus manquante : ${['P1-P4', 'P5-P8', 'P9-P10', 'P11-P12', 'P13+'][zone.i]}  avec ${zone.v} fois sur ${manque.total}.`)
console.log('')
