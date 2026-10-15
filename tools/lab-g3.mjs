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
// 15/10 : P = CASE du carnet (slotParNum de buildGrid, §11.13) — PARTOUT,
// comme computeStats, remplirGrille et l'affichage. Grilles en cache.
// P d'un numéro (mapping EXACT de computeStats, manquants inclus)
const gridCache = new Map()
const gridDe = (rr) => {
  const k = rr.date || JSON.stringify(rr.synthese)
  if (!gridCache.has(k)) {
    const syn = (rr.synthese || []).filter(Number.isFinite)
    gridCache.set(k, buildGrid(syn, rr.runners || []))
  }
  return gridCache.get(k)
}
const pDeRec = (rr, num) => gridDe(rr).slotParNum[num] ?? null
const GROUPES = [
  { id: 'G1', min: 1, max: 4 }, { id: 'G2', min: 5, max: 8 }, { id: 'G3', min: 9, max: 10 },
  { id: 'G4', min: 11, max: 12 }, { id: 'G5', min: 13, max: 20 },
]

const coteDe = (cotes, num) => {
  const v = cotes?.[num]
  const x = Number(typeof v === 'object' ? (v?.cote ?? null) : v)
  return Number.isFinite(x) && x > 0 ? x : null
}
// P = CASE du carnet (slotParNum) — voir ci-dessus.
const rangStats = (synthe, runners = []) => buildGrid(synthe.filter(Number.isFinite), runners).slotParNum

const closed = Object.values(db).filter((r) => r && (r.arrivee || []).length && (r.synthese || []).length)
console.log('courses fermées :', closed.map((r) => r.date).join(' '))

let tot1 = 0, tot2 = 0, tot3 = 0, tot4 = 0, tot5 = 0, tot6 = 0, tot7 = 0, tot12 = 0, tot13 = 0, tot8 = 0, tot14 = 0, tot15 = 0, win1 = 0, win2 = 0, win3 = 0, win4 = 0, win5 = 0, win6 = 0, win7 = 0, win12 = 0, win13 = 0, win8 = 0, win14 = 0, win15 = 0, n = 0
for (const rec of closed) {
  const syn = rec.synthese.filter(Number.isFinite)
  const cid = Object.keys(cache).find((k) => k.startsWith(rec.date + '_'))
  const cotes = cid && cache[cid].cotes ? Object.fromEntries(cache[cid].cotes.map((x) => [x.num, x])) : null
  if (!cotes) { console.log(`${rec.date} : pas de marché — sautée`); continue }
  // marché complet sur chaque bloc quota-1 ? sinon la comparaison est faussée
  const grille = buildGrid(syn, rec.runners || [])
  const stats = computeStats(closed.filter((r) => r.date !== rec.date)) // LOO : sans la course testée
  const parPlace = stats.parPlace || []
  const rs = rangStats(syn, rec.runners || [])
  const force = (num) => {
    const st = parPlace[(rs[num] ?? 0) - 1]
    if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return null
    let best = 0
    for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[best] ?? 0)) best = k
    return (st.p[best] ?? 0) > 0 ? { place: best, force: st.p[best] } : null
  }
  const sel1 = [], sel2 = [], sel3 = [], sel4 = [], sel5 = [], sel6 = [], sel7 = [], sel12 = [], sel13 = [], sel8 = [], sel14 = [], sel15 = []
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
    /* R12 (15/10) : G1 par FORCE-stats, G2 par COTES (les ratés G1 se
     * prennent 6× par les stats contre 3× par les cotes ; en G2 c'est
     * l'inverse : 0 par les stats, 1 par les cotes. Règle scindée.) */
    {
      const candF = cases.map((c) => ({ c, s: force(c.num) }))
        .sort((a, b) => ((b.s?.force ?? -1) - (a.s?.force ?? -1)) || (a.c.slot - b.c.slot))
      if (g.id === 'G1') candF.slice(0, q).forEach((x) => sel12.push(x.c.num))
      else if (g.id === 'G2') parCote.slice(0, q).forEach((c) => sel12.push(c.num))
      else sel12.push(candF[0].c.num)
    }
    /* R8-blend de référence + R14 (G1-force seul change) + R15 (G2-cotes seul change).
     * Le reste est IDENTIQUE (blend) : l'écart mesure le bloc seul. */
    {
      const pod = new Map()
      for (const b of stats.podiumBloc || []) for (const d of b.detail || []) pod.set(d.p, (d.n || 0) / Math.max(1, stats.nb))
      const scat = cases.map((c) => coteDe(cotes, c.num))
      const cMin = Math.min(...scat), cMax = Math.max(...scat)
      const mkt = (c) => {
        const v = coteDe(cotes, c.num)
        if (v == null || !(cMax > cMin)) return 0.5
        return (cMax - v) / (cMax - cMin)
      }
      const scoreB = (c) => 0.9 * (pod.get(c.slot) ?? 0) + 0.1 * mkt(c)
      cases.slice().sort((a, b) => (scoreB(b) - scoreB(a)) || (a.slot - b.slot)).slice(0, q).forEach((c) => sel8.push(c.num))
      const candF = cases.map((c) => ({ c, s: force(c.num) }))
        .sort((a, b) => ((b.s?.force ?? -1) - (a.s?.force ?? -1)) || (a.c.slot - b.c.slot))
      if (g.id === 'G1') candF.slice(0, q).forEach((x) => sel14.push(x.c.num))
      else cases.slice().sort((a, b) => (scoreB(b) - scoreB(a)) || (a.slot - b.slot)).slice(0, q).forEach((c) => sel14.push(c.num))
      if (g.id === 'G2') parCote.slice(0, q).forEach((c) => sel15.push(c.num))
      else cases.slice().sort((a, b) => (scoreB(b) - scoreB(a)) || (a.slot - b.slot)).slice(0, q).forEach((c) => sel15.push(c.num))
    }
    {
      const candF = cases.map((c) => ({ c, s: force(c.num) }))
        .sort((a, b) => ((b.s?.force ?? -1) - (a.s?.force ?? -1)) || (a.c.slot - b.c.slot))
      if (q === 1) {
        sel13.push(candF[0].c.num)
      } else {
        const pire = cases.slice().sort((a, b) =>
          (((force(a.num) == null) ? 0 : 1) - ((force(b.num) == null) ? 0 : 1)) ||
          (coteDe(cotes, b.num) - coteDe(cotes, a.num)))[0]
        const vivants = cases.filter((c) => c.num !== pire.num)
        vivants.map((c) => ({ c, s: force(c.num) }))
          .sort((a, b) => ((b.s?.force ?? -1) - (a.s?.force ?? -1)) || (a.c.slot - b.c.slot))
          .slice(0, q).forEach((x) => sel13.push(x.c.num))
      }
    }
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
    /* R7 (15/10) : 0.7 × taux_podium(P) + 0.3 × marché, TOUS les blocs
     * (y compris quota-1 : hors du if/else ci-dessus, au niveau du groupe).
     * taux_podium = podiums du P / N (stats LOO) ; marché = cote inversée
     * normalisée (1 = meilleure). Top quota, égalité → carnet. */
    {
      const pod = new Map()
      for (const b of stats.podiumBloc || []) for (const d of b.detail || []) pod.set(d.p, (d.n || 0) / Math.max(1, stats.nb))
      const scat = cases.map((c) => coteDe(cotes, c.num))
      const cMin = Math.min(...scat), cMax = Math.max(...scat)
      const mkt = (c) => (cMax > cMin ? (cMax - coteDe(cotes, c.num)) / (cMax - cMin) : 0.5)
      cases.slice()
        .sort((a, b) => ((0.7 * (pod.get(b.slot) ?? 0) + 0.3 * mkt(b)) - (0.7 * (pod.get(a.slot) ?? 0) + 0.3 * mkt(a))) || (a.slot - b.slot))
        .slice(0, q).forEach((c) => sel7.push(c.num))
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
  const h7 = arr.filter((x) => sel7.includes(x)).length
  const h12 = arr.filter((x) => sel12.includes(x)).length
  const h13 = arr.filter((x) => sel13.includes(x)).length
  const h8 = arr.filter((x) => sel8.includes(x)).length
  const h14 = arr.filter((x) => sel14.includes(x)).length
  const h15 = arr.filter((x) => sel15.includes(x)).length
  tot1 += h1; tot2 += h2; tot3 += h3; tot4 += h4; tot5 += h5; tot6 += h6; tot7 += h7; tot12 += h12; tot13 += h13; tot8 += h8; tot14 += h14; tot15 += h15
  if (sel1.includes(arr[0])) win1++
  if (sel2.includes(arr[0])) win2++
  if (sel3.includes(arr[0])) win3++
  if (sel4.includes(arr[0])) win4++
  if (sel5.includes(arr[0])) win5++
  if (sel6.includes(arr[0])) win6++
  if (sel7.includes(arr[0])) win7++
  if (sel12.includes(arr[0])) win12++
  if (sel13.includes(arr[0])) win13++
  if (sel8.includes(arr[0])) win8++
  if (sel14.includes(arr[0])) win14++
  if (sel15.includes(arr[0])) win15++
  console.log(`${rec.date}  R8ref ${h8}/5  |   R14(G1) ${h14}/5  |   R15(G2) ${h15}/5  |   R13 ${h13}/5  |   arr ${arr.join('-')}`)
}
console.log(`\nTOTAL ${n} courses : R1 = ${tot1}/${n * 5} · 1er ${win1}/${n}   |   R2 = ${tot2}/${n * 5} · 1er ${win2}/${n}   |   R5 = ${tot5}/${n * 5} · 1er ${win5}/${n}   |   R7 = ${tot7}/${n * 5} · 1er ${win7}/${n}   |   R12 = ${tot12}/${n * 5} · 1er ${win12}/${n}   |   R13 = ${tot13}/${n * 5} · 1er ${win13}/${n}   |   R8ref = ${tot8}/${n * 5}   |   R14(G1) = ${tot14}/${n * 5} · 1er ${win14}/${n}   |   R15(G2) = ${tot15}/${n * 5} · 1er ${win15}/${n}`)

/* R8 VRAIE (15/10, spec utilisateur LITTÉRALE) : 0.9 × FORCE(P) + 0.1 × marché.
 * FORCE(P) = max des P(1er..5e) de la case (table PLACES, pas podium —
 * l'ancienne version podium était MA FAUTE, corrigée ici). n<2 → 0,
 * égalité → carnet, cote absente → 0.5 (conventions visibles, à confirmer).
 * R9 = force seule. Référence GELÉ. Stats LOO par course. */
{
  console.log('\n══ R8 VRAIE : 0.9 force(P) + 0.1 marché, TOUTES les 14 vs GELÉ ══')
  console.log('══ R9 : force seule (tie → carnet) ══')
  let t8 = 0, w8 = 0, tF = 0, wF = 0, n8 = 0, t9 = 0, w9 = 0
  let flipOk = 0, flipKo = 0
  for (const rec of closed) {
    const syn = rec.synthese.filter(Number.isFinite)
    const cid = Object.keys(cache).find((k) => k.startsWith(rec.date + '_'))
    const cotes = cid && cache[cid].cotes ? Object.fromEntries(cache[cid].cotes.map((x) => [x.num, x])) : {}
    const stats = computeStats(closed.filter((r) => r.date !== rec.date))
    const parPlace = stats.parPlace || []
    const grille = buildGrid(syn, rec.runners || [])
    const ps = grille.slotParNum || {}
    const forceDe = (num) => {
      const st = parPlace[(ps[num] ?? 0) - 1]
      if (!st || !st.n || st.n < 2 || !Array.isArray(st.p)) return 0
      let best = 0
      for (let k = 1; k < 5; k++) if ((st.p[k] ?? 0) > (st.p[best] ?? 0)) best = k
      return (st.p[best] ?? 0) > 0 ? st.p[best] / 100 : 0
    }
    const sel = [], sel9 = []
    for (const g of GROUPES) {
      const cases = grille.groupes.flatMap((x) => x.cases).filter((c) => c.slot >= g.min && c.slot <= g.max)
      if (!cases.length) continue
      const q = Math.min(QUOTAS[g.id], cases.length)
      const connues = cases.filter((c) => coteDe(cotes, c.num) != null).map((c) => coteDe(cotes, c.num))
      const cMin = Math.min(...connues), cMax = Math.max(...connues)
      const mkt = (c) => {
        const v = coteDe(cotes, c.num)
        if (v == null || !(cMax > cMin)) return 0.5
        return (cMax - v) / (cMax - cMin)
      }
      cases.slice()
        .sort((a, b) => ((0.9 * forceDe(b.num) + 0.1 * mkt(b)) - (0.9 * forceDe(a.num) + 0.1 * mkt(a))) || (a.slot - b.slot))
        .slice(0, q).forEach((c) => sel.push(c.num))
      cases.slice()
        .sort((a, b) => (forceDe(b.num) - forceDe(a.num)) || (a.slot - b.slot))
        .slice(0, q).forEach((c) => sel9.push(c.num))
    }
    const arr = rec.arrivee.slice(0, 5)
    const froz = rec.ticket || []
    const h8 = arr.filter((x) => sel.includes(x)).length
    const h9 = arr.filter((x) => sel9.includes(x)).length
    const hF = arr.filter((x) => froz.includes(x)).length
    // picks changés par le 10% marché : bons ou mauvais ?
    const only8 = sel.filter((x) => !sel9.includes(x))
    const only9 = sel9.filter((x) => !sel.includes(x))
    const gain = only8.filter((x) => arr.includes(x)).length
    const perte = only9.filter((x) => arr.includes(x)).length
    flipOk += gain; flipKo += perte
    t8 += h8; t9 += h9; tF += hF; n8++
    if (sel.includes(arr[0])) w8++
    if (sel9.includes(arr[0])) w9++
    if (froz.includes(arr[0])) wF++
    console.log(`${rec.date}  R8 ${h8}/5${sel.includes(arr[0]) ? ' ★1er' : ''}  |  R9 ${h9}/5${sel9.includes(arr[0]) ? ' ★1er' : ''}${only8.length ? '  (marché: +' + only8.filter((x) => arr.includes(x)).join(',') + ' −' + only9.filter((x) => arr.includes(x)).join(',') + ')' : ''}  |  arr ${arr.join('-')}`)
  }
  console.log(`\nTOTAL ${n8} : R8 = ${t8}/${n8 * 5} · 1er ${w8}/${n8}  |  R9 (sans marché) = ${t9}/${n8 * 5} · 1er ${w9}/${n8}  |  GELÉ = ${tF}/${n8 * 5} · 1er ${wF}/${n8}`)
  console.log(`marché (10%) : picks gagnants ajoutés ${flipOk} · picks gagnants retirés ${flipKo} · NET ${flipOk >= flipKo ? '+' : ''}${flipOk - flipKo}`)
}

/* R11 (15/10) : VALUE = podium(P) − attendu(rang-marché). Le rang-marché
 * (1er/2e/3e/4e moins cher du bloc) a son propre taux LOO ; value = ce que
 * la case rapporte AU-DELÀ de ce que son rang promet. Top quota à value,
 * égalité → carnet. 6 courses à marché (même protocole). */
{
  console.log('\n══ R11 : value = podium(P) − attendu(rang-marché) ══')
  let t11 = 0, w11 = 0, n11 = 0
  for (const rec of closed) {
    const syn = rec.synthese.filter(Number.isFinite)
    const cid = Object.keys(cache).find((k) => k.startsWith(rec.date + '_'))
    const cotes = cid && cache[cid].cotes ? Object.fromEntries(cache[cid].cotes.map((x) => [x.num, x])) : null
    if (!cotes) continue
    const LOO = closed.filter((r) => r.date !== rec.date)
    const stats = computeStats(LOO)
    const pod = new Map()
    for (const b of stats.podiumBloc || []) for (const d of b.detail || []) pod.set(d.p, (d.n || 0) / Math.max(1, stats.nb))
    // attendu[rang-marché] sur le même LOO : le rang r du bloc podium combien ?
    const att = new Map()
    for (const rr of LOO) {
      const s2 = rr.synthese.filter(Number.isFinite)
      const c2 = Object.keys(cache).find((k) => k.startsWith(rr.date + '_'))
      const co2 = c2 && cache[c2].cotes ? Object.fromEntries(cache[c2].cotes.map((x) => [x.num, x.cote])) : null
      if (!co2) continue
      const g2 = buildGrid(s2, rr.runners || [])
      for (const gg of GROUPES) {
        const cs = g2.groupes.flatMap((x) => x.cases).filter((c) => c.slot >= gg.min && c.slot <= gg.max)
        if (cs.length < 2 || !cs.every((c) => coteDe(co2, c.num) != null)) continue
        const ord = cs.slice().sort((a, b) => coteDe(co2, a.num) - coteDe(co2, b.num))
        ord.forEach((c, i) => {
          const k = 'r' + (i + 1)
          if (!att.has(k)) att.set(k, { n: 0, hit: 0 })
          const e = att.get(k)
          e.n++
          if ((rr.arrivee || []).slice(0, 3).includes(c.num)) e.hit++
        })
      }
    }
    const exp = new Map([...att.entries()].map(([k, v]) => [k, v.hit / Math.max(1, v.n)]))
    const grille = buildGrid(syn, rec.runners || [])
    const sel = []
    for (const g of GROUPES) {
      const cases = grille.groupes.flatMap((x) => x.cases).filter((c) => c.slot >= g.min && c.slot <= g.max)
      if (!cases.length || !cases.every((c) => coteDe(cotes, c.num) != null)) continue
      const q = Math.min(QUOTAS[g.id], cases.length)
      const ord = cases.slice().sort((a, b) => coteDe(cotes, a.num) - coteDe(cotes, b.num))
      const rk = new Map(ord.map((c, i) => [c.num, i + 1]))
      cases.slice()
        .sort((a, b) => (((pod.get(b.slot) ?? 0) - (exp.get('r' + rk.get(b.num)) ?? 0)) - (((pod.get(a.slot) ?? 0) - (exp.get('r' + rk.get(a.num)) ?? 0)))) || (a.slot - b.slot))
        .slice(0, q).forEach((c) => sel.push(c.num))
    }
    if (!sel.length) continue
    const arr = rec.arrivee.slice(0, 5)
    const h = arr.filter((x) => sel.includes(x)).length
    t11 += h; n11++
    if (sel.includes(arr[0])) w11++
    console.log(`${rec.date}  R11 ${h}/5${sel.includes(arr[0]) ? ' ★1er' : ''} [${sel.join(' ')}]  |  arr ${arr.join('-')}`)
  }
  console.log(`\nTOTAL R11 = ${t11}/${n11 * 5} · 1er ${w11}/${n11}`)
}
