/* ---------------------------------------------------------------
 * tools\labo-selecteurs.mjs  —  ⭐⭐⭐ LE LABO DES SELECTEURS
 *
 *   node tools\labo-selecteurs.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Les quotas restent 3-2-1-1-1 (§11.16).
 *   Ici on ne lit rien d'autre que `data\corpus\presse-carriere.json`.
 *
 * LE PROBLÈME, RÉDUIT À SA FORMULE LA PLUS SIMPLE :
 *
 *   G1 : 4 chevaux  → on en prend 3  ⇒  LA SEULE DÉCISION EST : lequel exclure ?
 *   G2 : 4 chevaux  → on en prend 2  ⇒  lesquels prendre ?
 *   G3 : 2 chevaux  → on en prend 1  ⇒  lequel ?
 *   G4 : 2 chevaux  → on en prend 1  ⇒  lequel ?   ← baseline à protéger
 *   G5 : m chevaux → on en prend 1  ⇒  lequel ?
 *
 * Donc tout se ramène à une question par bloc : **lequel de ces chevaux
 * est-il dans le TOP 5 ?** C'est un problème de CLASSIFICATION par cheval,
 * pas un score global.
 *
 * ⭐ AUCUNE FUITURE : le corpus est coupé 70 / 24. Tout ce qui est appris
 * (les poids, la force de la presse, le choix du sélecteur) vient des 70.
 * Les 24 ne sont vues qu'APRÈS, une seule fois. Si le résultat chute sur
 * les 24, on l'écrit noir sur blanc : on a appris le 70, pas une règle.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreForme } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'presse-carriere.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4, k: 3, objectif: 90 },
  { id: 'G2', min: 5, max: 8, k: 2, objectif: 90 },
  { id: 'G3', min: 9, max: 10, k: 1, objectif: 75 },
  { id: 'G4', min: 11, max: 12, k: 1, objectif: 90 },
  { id: 'G5', min: 13, max: 99, k: 1, objectif: 0 },
]
const QUOTA = { G1: 3, G2: 2, G3: 1, G4: 1, G5: 1 }
const CIBLE = 3   // podium pour le test 1, le quinté pour le test 2

/* ------------------------------------------------------------- le corpus --- */
const brut = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = []
for (const k of Object.values(brut)) {
  if (!k.partants?.length || k.partants.length < 10) continue
  if (!k.arrivee?.length || k.arrivee.length < 5) continue
  const presse = (k.presse || []).filter((x) => k.arrivee.includes(x))
  const nums = presse.concat(k.arrivee.filter((x) => !presse.includes(x)))
  if (nums.length < 10) continue
  const avecC = Object.keys(k.cotes || {}).map(Number).filter((x) => k.cotes[x] > 0)
  if (avecC.length < 8) continue
  const pDe = new Map(nums.map((x, i) => [x, i + 1]))
  const cDe = new Map(avecC.sort((a, b) => k.cotes[a] - k.cotes[b]).map((x, i) => [x, i + 1]))
  base.push({
    cle: k.cle, nums, pDe, cDe, cotes: k.cotes, ouverture: k.ouverture || {},
    parNum: new Map(k.partants.map((p) => [p.num, p])),
    discipline: k.discipline, distance: k.distance,
    top3: k.arrivee.slice(0, 3), top5: k.arrivee.slice(0, 5),
  })
}
const n = base.length
const blocsDe = (k) => BLOCS.map((b) => k.nums.filter((num) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max }))

/* ---------------------------------------------------------------Unsigned --- */
/* Toutes les normalisation se font À L'INTÉRIEUR du bloc : c'est la seule
 * comparaison qui a du sens (« est-il le meilleur de MON bloc »). */
const norm = (nums, f) => {
  const vals = nums.map(f)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return (x) => (max === min ? 0.5 : (f(x) - min) / (max - min))   // 0 = pire, 1 = mieux
}

const SIGNAUX = {
  /* A — la force du MARCHÉ */
  'cote': { sens: -1, f: (k, num) => k.cotes[num] || 999 },
  'cote ouverture': { sens: -1, f: (k, num) => k.ouverture[num] || 999 },
  /* le cheval se fait-il缩短or raccourcit ?  ouverture - finale : plus c'est grand, plus il monte */
  'evolution (ouv-finq)': { sens: 1, f: (k, num) => ((k.ouverture[num] || 0) && (k.cotes[num] || 0) ? k.ouverture[num] - k.cotes[num] : 0) },
  'ecart au bloc': { sens: -1, f: (k, num) => k.cotes[num] || 999 },   // même chose, gardée pour la lecture

  /* B — la force de la PRESSE */
  'rang presse': { sens: -1, f: (k, num) => k.pDe.get(num) },
  'rang cote': { sens: -1, f: (k, num) => k.cDe.get(num) },

  /* C — compatibilité (partielle : pas de carrières détaillées, §16.7) */
  'valeur': { sens: 1, f: (k, num) => (k.parNum.get(num) || {}).valeur || 0 },
  'poids': { sens: -1, f: (k, num) => (k.parNum.get(num) || {}).poids || 60 },
  'age': { sens: -1, f: (k, num) => (k.parNum.get(num) || {}).age ?? 8 },
  'gains': { sens: 1, f: (k, num) => (k.parNum.get(num) || {}).gains || 0 },
  'corde': { sens: -1, f: (k, num) => (k.parNum.get(num) || {}).corde || num },

  /* D — la FORME */
  'forme (musique)': { sens: 1, f: (k, num) => scoreForme((k.parNum.get(num) || {}).musique, k.discipline).score },
  'stats PMU': { sens: 1, f: (k, num) => { const p = k.parNum.get(num) || {}; return (p.nbVictoires || 0) * 3 + (p.nb2e || 0) * 2 + (p.nb3e || 0) * 1.5 + (p.nbPlaces || 0) } },
  'taux de victoire': { sens: 1, f: (k, num) => { const p = k.parNum.get(num) || {}; return p.nbCourses ? (p.nbVictoires || 0) / p.nbCourses : 0 } },

  /* E — la CONTRA-DICTION marché / reste */
  'cote - presse': { sens: 1, f: (k, num) => -(k.cDe.get(num) || 99) + (k.pDe.get(num) || 99) },
}

const nomsSignaux = Object.keys(SIGNAUX)

/* ═══════════════════════════ le COUPAGE 70 / 24 ════════════════════════ */
const iTrain = base.map((_, i) => i).filter((i) => i % 4 !== 0)   // 70-ish
const iTest = base.map((_, i) => i).filter((i) => i % 4 === 0)     // 24
const part = (idx, arr) => idx.map((i) => arr[i])

/* ═════════════════ la FORCE DE LA PRESSE, apprise sur le TRAIN ════════ */
const forcePress = () => {
  const tab = {}
  for (const i of iTrain) {
    const k = base[i]
    for (const b of BLOCS) {
      const numsBloc = blocsDe(k)[BLOCS.indexOf(b)]
      for (const num of numsBloc) {
        const pR = k.pDe.get(num)
        const cle = pR >= 13 ? '13+' : String(pR)
        if (!tab[cle]) tab[cle] = { top3: 0, top5: 0, n: 0 }
        tab[cle].n++
        if (k.top3.includes(num)) tab[cle].top3++
        if (k.top5.includes(num)) tab[cle].top5++
      }
    }
  }
  return tab
}
const FP = forcePress()
const fPress = (k, num) => {
  const pR = k.pDe.get(num)
  const cle = pR >= 13 ? '13+' : String(pR)
  const e = FP[cle]
  return e && e.n >= 5 ? e.top5 / e.n : 0.25
}

/* ═══════════════════ le SÉLECTEUR : somme de signaux normalisés ═══════ */
const scoreDansBloc = (k, nums, combinaison) => {
  const norms = combinaison.map((nom) => {
    const s = SIGNAUX[nom]
    return norm(nums, (x) => s.f(k, x))     // 0..1, 1 = meilleur du bloc
  })
  const fp = nums.length >= 2 && combinaison.includes('force presse') ? norm(nums, (x) => fPress(k, x)) : null
  const out = {}
  for (const num of nums) {
    let s = 0
    combinaison.forEach((nom, i) => { s += SIGNAUX[nom].sens > 0 ? norms[i](num) : 1 - norms[i](num) })
    if (fp) s += fp(num)
    out[num] = s / (combinaison.length + (fp ? 1 : 0))
  }
  return out
}

const choisir = (k, blocId, combinaison) => {
  const i = BLOCS.findIndex((b) => b.id === blocId)
  const nums = blocsDe(k)[i]
  const s = scoreDansBloc(k, nums, combinaison)
  return nums.slice().sort((a, b) => s[b] - s[a]).slice(0, QUOTA[blocId])
}

/* ═════════════════════ le TEST D'UNE COMBINAISON ════════════════════════ */
const evaluerBloc = (idx, blocId, combinaison, cible) => {
  const i = BLOCS.findIndex((b) => b.id === blocId)
  const poss = []
  for (const j of idx) {
    const k = base[j]
    const numsBloc = blocsDe(k)[i]
    const tk = new Set(choisir(k, blocId, combinaison))
    const podBloc = cible === 3 ? k.top3 : k.top5
    for (const num of numsBloc) {
      if (!podBloc.includes(num)) continue
      poss.push(tk.has(num) ? 1 : 0)
    }
  }
  return poss.length ? poss.reduce((a, b) => a + b, 0) / poss.length * 100 : 0
}

/* ═══════════════════ recherche du meilleur sur le TRAIN ════════════════ */
const CANDIDATS = [
  ['cote'], ['rang presse'], ['forme (musique)'], ['stats PMU'], ['valeur'],
  ['poids'], ['age'], ['gains'], ['corde'], ['taux de victoire'],
  ['evolution (ouv-finq)'], ['cote - presse'],
  ['cote', 'stats PMU'], ['cote', 'forme (musique)'], ['cote', 'valeur'], ['cote', 'poids'],
  ['cote', 'age'], ['rang presse', 'cote'],
  ['cote', 'stats PMU', 'valeur'],
  ['cote', 'forme (musique)', 'stats PMU'],
  ['cote', 'poids', 'age'],
  ['cote', 'stats PMU', 'poids', 'age'],
  ['cote', 'rang presse', 'forme (musique)', 'stats PMU'],
]

console.log('')
console.log(`  ⭐⭐⭐ LABO DES SELECTEURS — aucune modification du système`)
console.log(`     quotas 3-2-1-1-1 intacts. ${n} Quintés.`)
console.log(`     découpage : ${iTrain.length} à l'entraînement / ${iTest.length} au test, jamais mélangés`)
console.log('')

for (const cible of [3, 5]) {
  const titre = cible === 3 ? 'LE PODIUM (3 premiers)' : 'LE QUINTÉ (5 premiers)'
  console.log(`  ══════════════════════════════════════════════════════════════`)
  console.log(`  ║  ${titre}`.padEnd(66) + '║')
  console.log('  ' + '═'.repeat(64))
  console.log('')
  console.log('  bloc   sélecteur retenu (appris sur l ENTRAÎNEMENT)')
  console.log('  ' + '-'.repeat(78))
  const retenus = {}
  BLOCS.forEach((b, bi) => {
    let best = null
    for (const combi of CANDIDATS) {
      const v = evaluerBloc(iTrain, b.id, combi, cible)
      if (!best || v > best.v) best = { combi, v }
    }
    retenus[b.id] = best.combi
    console.log('  ' + b.id.padEnd(6) + best.combi.join(' + ').padEnd(46)
      + 'train ' + best.v.toFixed(0).padStart(3) + ' %   (objectif ' + (b.objectif || '—') + ' %)')
  })
  console.log('  ' + '-'.repeat(78))
  console.log('')
  console.log('  ⭐ CAPTURE PAR BLOC — entraînement (70) contre test (24), jamais vu')
  console.log('')
  console.log('  bloc    entrainement    TEST      objectif    verdict')
  console.log('  ' + '-'.repeat(62))
  BLOCS.forEach((b) => {
    const tr = evaluerBloc(iTrain, b.id, retenus[b.id], cible)
    const te = evaluerBloc(iTest, b.id, retenus[b.id], cible)
    const chute = tr - te
    const verdict = chute > 15 ? '⚠ SUR-APPRENTISSAGE' : chute > 7 ? 'léger overestimate' : 'stable'
    console.log('  ' + b.id.padEnd(6) + (tr.toFixed(0) + ' %').padStart(11) + (te.toFixed(0) + ' %').padStart(10)
      + String(b.objectif || '—').padStart(12) + '    ' + verdict + (chute > 7 ? '  (-' + chute.toFixed(0) + ' pts)' : ''))
  })
  console.log('')

  /* ---- la vraie question : le TICKET entier ---- */
  const ticketAvec = (j, combos) => {
    const k = base[j]
    return BLOCS.flatMap((b) => choisir(k, b.id, combos[b.id]))
  }
  const avecTrain = (idx) => idx.map((j) => {
    const k = base[j]
    const tk = ticketAvec(j, retenus)
    return (cible === 3 ? k.top3 : k.top5).filter((x) => tk.includes(x)).length
  })
  const avecCote = (idx) => idx.map((j) => {
    const k = base[j]
    const tk = BLOCS.flatMap((b) => blocsDe(k)[BLOCS.findIndex((x) => x.id === b.id)]
      .slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999)).slice(0, QUOTA[b.id]))
    return (cible === 3 ? k.top3 : k.top5).filter((x) => tk.includes(x)).length
  })
  const tTr = avecTrain(iTrain)
  const tTe = avecTrain(iTest)
  const cTr = avecCote(iTrain)
  const cTe = avecCote(iTest)
  const moy = (a) => a.reduce((x, y) => x + y, 0) / a.length
  const plein = (a) => (cible === 3 ? a.filter((v) => v === 3).length / a.length : a.filter((v) => v === 5).length / a.length) * 100
  const ge = (a, x) => a.filter((v) => v >= x).length / a.length * 100
  console.log('  ⭐ LE TICKET ENTIER (3-2-1-1-1, 8 chevaux) — moteur nouveau contre cote')
  console.log('')
  console.log('                          ' + 'entraînement' + '        TEST')
  console.log('  nouveau moteur   moyen ' + moy(tTr).toFixed(2) + '    ' + (cible === 3 ? '3/3 ' : '5/5 ') + plein(tTr).toFixed(0) + ' %'
    + '        ' + moy(tTe).toFixed(2) + '    ' + (cible === 3 ? '3/3 ' : '5/5 ') + plein(tTe).toFixed(0) + ' %')
  console.log('  rempli par COTE   moyen ' + moy(cTr).toFixed(2) + '    ' + (cible === 3 ? '3/3 ' : '5/5 ') + plein(cTr).toFixed(0) + ' %'
    + '        ' + moy(cTe).toFixed(2) + '    ' + (cible === 3 ? '3/3 ' : '5/5 ') + plein(cTe).toFixed(0) + ' %')
  console.log('')
  const gain = moy(tTe) - moy(cTe)
  console.log('  ⭐ GAIN SUR LE TEST JAMAIS VU : ' + (gain > 0 ? '+' : '') + gain.toFixed(2) + ' found sur 5  '
    + (Math.abs(gain) < 0.10 ? '  ⚠ c est du bruit' : '  ✓ au-dessus du bruit'))
  console.log('')
  console.log('  ⭐ G4 (le bloc à protéger) : le sélecteur retenu est « '
    + retenus.G4.join(' + ') + ' » — à vérifier qu\'il ne FAIT PAS chuter le 92 %')
  console.log('')
}
