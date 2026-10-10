/* =============================================================================
 * tools/lab-g3.mjs — LABO (10/10/2026). Ne change AUCUNE règle, ne montre
 * qu'un résultat.
 *
 * Question de l'utilisateur : le moteur est « lâche » — il prend la plus
 * petite cote, et le 10/10 ça a coûté le gagnant (G3 : 8@13 pris, 9@14
 * écarté, et c'est le 9 qui gagne).
 *
 * R1 (actuelle) : bloc de quota 1 → la meilleure cote.
 * R2 (candidate) : bloc de quota 1 → le plus fort aux STATISTIQUES
 *   (signature : argmax du P, force = p[place], n≥2 ; égalité → cote ;
 *   aucune force → cote). Les blocs de quota ≥ 2 sont inchangés.
 *
 * Protocole anti-fuite : pour chaque course testée, les stats sont
 * calculées SANS elle (leave-one-out). Les deux règles voient le même
 * marché. ⚠ Les cotes 01→05 sont des lectures uniques (instant inconnu,
 * possiblement après-course) : ça favorise R1. Si R2 gagne quand même,
 * le signal est fort.
 *
 * R3 (ajouté 10/10, même protocole) : la SEULE variante qui attrape le
 * n°3 du 10/10 (4e de G1 par la cote ET par la force) — la surprise
 * [large] rejetée : quota≥2 → (q-1) meilleures cotes + le MOINS CITÉ
 * de TOUT le bloc (max rang presse). Si R3 paie son 3 au prix fort
 * ailleurs, le chiffre le dira.
 *
 * R4 (ajouté 10/10, même protocole) : surprise [large] SEULEMENT en G1
 * (là où le 3 est sorti) ; G2 et autres quota≥2 restent aux meilleures
 * cotes ; quota-1 = R2. Cible : attraper le 3 sans perdre le 13 du 05/10.
 *
 * R5 (ajouté 10/10, même protocole) : même squelette que R4, mais le siège
 * tournant de G1 va au cas en DROUGHT le plus long (le plus de courses
 * fermées consécutives sans arrivée à ce P ; égalité → cote) au lieu du
 * moins cité. Le principe de l'utilisateur (« chaque P attend son tour »)
 * lu au sens littéral : celui qui attend depuis le plus longtemps entre.
 *
 * R6 (ajouté 10/10, même protocole) : « G2 aussi » (instruction
 * utilisateur). Tous les blocs multi-places (G1+G2, les seuls à quota>1) :
 * (q-1) meilleures cotes + drought le plus long (égalité → cote).
 * Quota-1 inchangé (R2-stats). Compare R6 vs R5 : le drought en G2 paie ?
 * ============================================================================= */

import { buildGrid, computeStats } from '../src/lib/quinte.js'
import { readFileSync } from 'node:fs'

const db = JSON.parse(readFileSync('./data/synthese.json', 'utf8'))
const cache = JSON.parse(readFileSync('./data/cotes.json', 'utf8'))

const QUOTAS = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
// P d'un numéro (mapping EXACT de computeStats, manquants inclus)
const pDeRec = (rr, num) => {
  const syn = (rr.synthese || []).filter(Number.isFinite)
  const m = {}
  syn.filter((n) => n % 2 === 0).forEach((n, i) => { m[n] = 2 * i + 1 })
  syn.filter((n) => n % 2 !== 0).forEach((n, i) => { m[n] = 2 * i + 2 })
  if (m[num] != null) return m[num]
  const cites = new Set(syn)
  const manq = ((rr.runners || []).filter((n) => Number.isFinite(n) && !cites.has(n))).sort((a, b) => a - b)
  const apres = Math.max(0, ...Object.values(m))
  const k = manq.indexOf(num)
  return k >= 0 ? apres + 1 + k : null
}
const GROUPES = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 }, { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 }, { id: 'G5', min: 13, max: 20 },
]

const coteDe = (cotes, num) => {
  const v = cotes?.[num]
  const x = Number(typeof v === 'object' ? (v?.cote ?? null) : v)
  return Number.isFinite(x) && x > 0 ? x : null
}
// mapping P EXACT de computeStats : pairs en haut (P1, P3…), impairs en bas
const rangStats = (synthe) => {
  const m = {}
  synthe.filter((n) => n % 2 === 0).forEach((n, i) => { m[n] = 2 * i + 1 })
  synthe.filter((n) => n % 2 !== 0).forEach((n, i) => { m[n] = 2 * i + 2 })
  return m
}

const closed = Object.values(db).filter((r) => r && (r.arrivee || []).length && (r.synthese || []).length)
console.log('courses fermées :', closed.map((r) => r.date).join(' '))

let tot1 = 0, tot2 = 0, tot3 = 0, tot4 = 0, tot5 = 0, tot6 = 0, win1 = 0, win2 = 0, win3 = 0, win4 = 0, win5 = 0, win6 = 0, n = 0
for (const rec of closed) {
  const syn = rec.synthese.filter(Number.isFinite)
  const cid = Object.keys(cache).find((k) => k.startsWith(rec.date + '_'))
  const cotes = cid && cache[cid].cotes ? Object.fromEntries(cache[cid].cotes.map((x) => [x.num, x])) : null
  if (!cotes) { console.log(`${rec.date} : pas de marché — sautée`); continue }
  // marché complet sur chaque bloc quota-1 ? sinon la comparaison est faussée
  const grille = buildGrid(syn, rec.runners || [])
  const stats = computeStats(closed.filter((r) => r.date !== rec.date)) // LOO : sans la course testée
  const parPlace = stats.parPlace || []
  const rs = rangStats(syn)
  const force = (num) => {
    const st = parPlace[(rs[num] ?? 0) - 1]
    if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return null
    let best = 0
    for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[best] ?? 0)) best = k
    return (st.p[best] ?? 0) > 0 ? { place: best, force: st.p[best] } : null
  }
  const sel1 = [], sel2 = [], sel3 = [], sel4 = [], sel5 = [], sel6 = []
  let complet = true
  // droughts causaux : courses fermées AVANT la course testée (jamais elle, jamais après)
  const avant = closed.filter((r) => r.date < rec.date)
  const droughtDe = (slot) => {
    let d = 0
    const triées = avant.slice().sort((a, b) => (a.date < b.date ? 1 : -1))
    for (const rr of triées) {
      const pl = (rr.arrivee || []).slice(0, 5).map((n) => pDeRec(rr, n))
      if (pl.includes(slot)) break
      d++
    }
    return d
  }
  for (const g of GROUPES) {
    const cases = grille.groupes.flatMap((x) => x.cases).filter((c) => c.slot >= g.min && c.slot <= g.max)
    if (!cases.length) continue
    if (!cases.every((c) => coteDe(cotes, c.num) != null)) { complet = false; break }
    const q = Math.min(QUOTAS[g.id], cases.length)
    const parCote = cases.slice().sort((a, b) => coteDe(cotes, a.num) - coteDe(cotes, b.num))
    const rangPresse = {}
    syn.forEach((num, i) => { rangPresse[num] = i + 1 })
    const moinsCite = cases.slice().sort((a, b) => (rangPresse[b.num] ?? 0) - (rangPresse[a.num] ?? 0))[0]
    parCote.slice(0, q).forEach((c) => sel1.push(c.num))
    if (q === 1) {
      // R2 : le plus fort aux stats, égalité → cote, rien → cote
      const cand = cases.map((c) => ({ c, s: force(c.num) }))
        .sort((a, b) => ((b.s?.force ?? -1) - (a.s?.force ?? -1)) || (coteDe(cotes, a.c.num) - coteDe(cotes, b.c.num)))
      sel2.push(cand[0].c.num)
      sel3.push(cand[0].c.num)
      sel4.push(cand[0].c.num)
      sel5.push(cand[0].c.num) // R5 : quota-1 identique à R2, seul G1 change
      sel6.push(cand[0].c.num) // R6 : quota-1 identique, seuls G1+G2 changent
    } else {
      parCote.slice(0, q).forEach((c) => sel2.push(c.num))
      // R3 : (q-1) meilleures cotes + le moins cité DE TOUT LE BLOC
      parCote.slice(0, q - 1).forEach((c) => sel3.push(c.num))
      if (!sel3.includes(moinsCite.num)) sel3.push(moinsCite.num)
      else parCote.slice(q - 1, q).forEach((c) => sel3.push(c.num))
      // R4 : surprise [large] SEULEMENT en G1, le reste aux cotes
      if (g.id === 'G1') {
        parCote.slice(0, q - 1).forEach((c) => sel4.push(c.num))
        if (!sel4.includes(moinsCite.num)) sel4.push(moinsCite.num)
        else parCote.slice(q - 1, q).forEach((c) => sel4.push(c.num))
      } else {
        parCote.slice(0, q).forEach((c) => sel4.push(c.num))
      }
      // R5 : comme R4, mais le siège tournant de G1 va au plus LONG DROUGHT
      if (g.id === 'G1') {
        parCote.slice(0, q - 1).forEach((c) => sel5.push(c.num))
        const parDrought = cases.slice().sort((a, b) =>
          (droughtDe(b.slot) - droughtDe(a.slot)) || (coteDe(cotes, a.num) - coteDe(cotes, b.num)))
        const elu = parDrought[0]
        if (!sel5.includes(elu.num)) sel5.push(elu.num)
        else parCote.slice(q - 1, q).forEach((c) => sel5.push(c.num))
      } else if (q === 1) {
        const cand = cases.map((c) => ({ c, s: force(c.num) }))
          .sort((a, b) => ((b.s?.force ?? -1) - (a.s?.force ?? -1)) || (coteDe(cotes, a.c.num) - coteDe(cotes, b.c.num)))
        sel5.push(cand[0].c.num)
      } else {
        parCote.slice(0, q).forEach((c) => sel5.push(c.num))
      }
      // R6 : G1 ET G2 : (q-1) cotes + drought (le q===1 est plus haut ;
      // ici q>1 garanti par le else externe, comme R4/R5)
      if (g.id === 'G1' || g.id === 'G2') {
        parCote.slice(0, q - 1).forEach((c) => sel6.push(c.num))
        const parDr = cases.slice().sort((a, b) =>
          (droughtDe(b.slot) - droughtDe(a.slot)) || (coteDe(cotes, a.num) - coteDe(cotes, b.num)))
        const elu6 = parDr[0]
        if (!sel6.includes(elu6.num)) sel6.push(elu6.num)
        else parCote.slice(q - 1, q).forEach((c) => sel6.push(c.num))
      } else {
        parCote.slice(0, q).forEach((c) => sel6.push(c.num))
      }
    }
  }
  if (!complet) { console.log(`${rec.date} : marché incomplet — sautée`); continue }
  n++
  const arr = rec.arrivee.slice(0, 5)
  const h1 = arr.filter((x) => sel1.includes(x)).length
  const h2 = arr.filter((x) => sel2.includes(x)).length
  const h3 = arr.filter((x) => sel3.includes(x)).length
  const h4 = arr.filter((x) => sel4.includes(x)).length
  const h5 = arr.filter((x) => sel5.includes(x)).length
  const h6 = arr.filter((x) => sel6.includes(x)).length
  tot1 += h1; tot2 += h2; tot3 += h3; tot4 += h4; tot5 += h5; tot6 += h6
  if (sel1.includes(arr[0])) win1++
  if (sel2.includes(arr[0])) win2++
  if (sel3.includes(arr[0])) win3++
  if (sel4.includes(arr[0])) win4++
  if (sel5.includes(arr[0])) win5++
  if (sel6.includes(arr[0])) win6++
  console.log(`${rec.date}  R1 ${h1}/5${sel1.includes(arr[0]) ? ' ★1er' : ''}  |   R2 ${h2}/5${sel2.includes(arr[0]) ? ' ★1er' : ''}  |   R3 ${h3}/5${sel3.includes(arr[0]) ? ' ★1er' : ''}  |   R4 ${h4}/5${sel4.includes(arr[0]) ? ' ★1er' : ''}  |   R5 ${h5}/5${sel5.includes(arr[0]) ? ' ★1er' : ''}  |   R6 ${h6}/5${sel6.includes(arr[0]) ? ' ★1er' : ''} [${sel6.join(' ')}]   |   arr ${arr.join('-')}`)
}
console.log(`\nTOTAL ${n} courses : R1 = ${tot1}/${n * 5} · 1er ${win1}/${n}   |   R2 = ${tot2}/${n * 5} · 1er ${win2}/${n}   |   R3 = ${tot3}/${n * 5} · 1er ${win3}/${n}   |   R4 = ${tot4}/${n * 5} · 1er ${win4}/${n}   |   R5 = ${tot5}/${n * 5} · 1er ${win5}/${n}   |   R6 = ${tot6}/${n * 5} · 1er ${win6}/${n}`)
