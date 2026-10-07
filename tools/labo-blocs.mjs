/* ---------------------------------------------------------------
 * tools\labo-blocs.mjs  —  ⭐⭐ LE LABO DES BLOCS, SÉLECTION PAR SÉLECTION
 *
 *   node tools\labo-blocs.mjs
 *
 * ⚠ NE CHANGE AUCUN SYSTÈME. Quotas 3-2-1-1-1 intacts (§11.16).
 *   Quotas, blocs, tout est lu tel quel. Ce fichier ne calcule QUE.
 *
 * ⭐ LE PROTOCOLE EST CELUI-LÀ, ET IL EST STRICT :
 *
 *   · À l'intérieur de G1 (P1..P4, quota 3) il n'y a que **4** choix.
 *     À l'intérieur de G2 (P5..P8, quota 2) il n'y en a que **6**.
 *     G3 : 2.  G4 : 2.  G5 : un par cheval.
 *     Donc on n'invente rien : on ÉNUMÈRE tous les choix possibles, et on
 *     regarde lequel est le bon, course par course.
 *
 *   · Pour chaque bloc on mesure l'ORACLE : si on choisissait toujours la
 *     même combinaison (P1+P2+P3 dans G1), combien de chevaux du podium
 *     attrape-t-on ? C'est le PLAFOND d'une règle fixe.
 *
 *   · Puis on cherche une RÈGLE calculable AVANT la course (cote,
 *     ouverture, écart, forme, stats, valeur, poids…) qui choisisse le bon
 *     trio. Elle est apprise sur les **70 plus anciennes** Quintés et testée
 *     sur les **24 plus récentes**, qu'elle n'a jamais vues.
 *
 *   · Si la règle s'effondre sur les 24, on l'écrit : ce n'est qu'un
 *     ajustement sur le passé.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreForme } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(RACINE, 'data', 'corpus', 'archive-94.json')

const BLOCS = [
  { id: 'G1', min: 1, max: 4, quota: 3 }, { id: 'G2', min: 5, max: 8, quota: 2 },
  { id: 'G3', min: 9, max: 10, quota: 1 }, { id: 'G4', min: 11, max: 12, quota: 1 },
  { id: 'G5', min: 13, max: 99, quota: 1 },
]

const fichier = JSON.parse(fs.readFileSync(F, 'utf8'))
const base = fichier.courses
  .map((k) => {
    const pDe = new Map(k.presse.map((x, i) => [x, i + 1]))
    const rangDe = new Map(k.presse.map((x, i) => [i + 1, x]))   // P1 → n° du cheval
    const avecC = Object.keys(k.cotes).map(Number).filter((x) => k.cotes[x] > 0).sort((a, b) => k.cotes[a] - k.cotes[b])
    return { ...k, pDe, rangDe, cDe: new Map(avecC.map((x, i) => [x, i + 1])), avecC, parNum: new Map(k.partants.map((p) => [p.num, p])) }
  })
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const n = base.length
const coupure = 70
const idxTrain = base.map((_, i) => i).slice(0, coupure)
const idxTest = base.map((_, i) => i).slice(coupure)
const blocDe = (k, num) => BLOCS.findIndex((b) => { const p = k.pDe.get(num); return p >= b.min && p <= b.max })
const numsDuBloc = (k, i) => k.presse.filter((x) => blocDe(k, x) === i)

/* ═════════════════ les combinaisons possibles de chaque bloc ═══════════ */
const combosDe = (m, k) => {
  const out = []
  const rec = (start, cur) => {
    if (cur.length === k) { out.push(cur.slice()); return }
    for (let i = start; i < m; i++) { cur.push(i); rec(i + 1, cur); cur.pop() }
  }
  rec(0, [])
  return out
}

/* ═════════════════════════ les règles AVANT la course ════════════════ */
const S = {
  cote: (k, num) => (k.cotes[num] || 999),
  ouverture: (k, num) => (k.ouverture[num] || 999),
  rangPresse: (k, num) => k.pDe.get(num),
  rangCote: (k, num) => k.cDe.get(num),
  evolution: (k, num) => (k.ouverture[num] && k.cotes[num] ? k.ouverture[num] - k.cotes[num] : 0),
  forme: (k, num) => scoreForme((k.parNum.get(num) || {}).musique, k.discipline).score,
  stats: (k, num) => { const p = k.partants.find((x) => x.num === num) || {}; return (p.nbVictoires || 0) * 3 + (p.nb2e || 0) * 2 + (p.nb3e || 0) * 1.5 + (p.nbPlaces || 0) },
  valeur: (k, num) => (k.partants.find((x) => x.num === num) || {}).valeur || 0,
  poids: (k, num) => (k.partants.find((x) => x.num === num) || {}).poids || 60,
  age: (k, num) => (k.partants.find((x) => x.num === num) || {}).age ?? 8,
  corde: (k, num) => (k.partants.find((x) => x.num === num) || {}).corde || num,
}

/** Score d'un CHOIX (ensemble de chevaux) — plus haut = meilleur. */
const scoreChoix = (k, choix, regles, sens) => {
  let s = 0
  regles.forEach((r, i) => {
    const vals = choix.map((num) => S[r](k, num))
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const moy = vals.reduce((a, b) => a + b, 0) / vals.length
    const v = (max === min ? 0.5 : (moy - min) / (max - min))
    s += (sens[i] === -1 ? 1 - v : v)
  })
  return s / regles.length
}

const REGLES = [
  [['cote'], [-1]],
  [['rangPresse'], [-1]],
  [['rangCote'], [-1]],
  [['valeur'], [1]],
  [['poids'], [-1]],
  [['age'], [-1]],
  [['corde'], [-1]],
  [['forme'], [1]],
  [['stats'], [1]],
  [['evolution'], [1]],
  [['cote', 'stats'], [-1, 1]],
  [['cote', 'forme'], [-1, 1]],
  [['cote', 'valeur'], [-1, 1]],
  [['cote', 'poids'], [-1, -1]],
  [['rangPresse', 'cote'], [-1, -1]],
  [['cote', 'stats', 'poids'], [-1, 1, -1]],
  [['cote', 'stats', 'valeur'], [-1, 1, 1]],
  [['cote', 'evolution', 'stats'], [-1, 1, 1]],
]

/** Le choix de la règle dans le bloc : celui qui attrape le plus, à l'entraînement. */
const choisirAvec = (k, bi, regles, sens) => {
  const nums = numsDuBloc(k, bi)
  const b = BLOCS[bi]
  const combos = combosDe(nums.length, b.quota)
  if (!combos.length) return []
  let best = null
  for (const c of combos) {
    const s = scoreChoix(k, c.map((i) => nums[i]), regles, sens)
    if (!best || s > best.s) best = { s, nums: c.map((i) => nums[i]) }
  }
  return best.nums
}

const attrape = (k, bi, numsChoisis) => {
  const numsBloc = new Set(numsDuBloc(k, bi))
  const pod = k.podium.filter((x) => numsBloc.has(x))
  const set = new Set(numsChoisis)
  return { pris: pod.filter((x) => set.has(x)).length, possibles: pod.length }
}

console.log('')
console.log('  ⭐⭐⭐ LABO DES BLOCS — AUCUNE MODIFICATION DU SYSTÈME')
console.log(`     quotas 3-2-1-1-1 intacts · ${n} Quintés`)
console.log(`     découpage CHRONOLOGIQUE : ${coupure} anciennes → apprentissage · ${n - coupure} récentes → test`)
console.log(`     apprentissage : ${base[0].date} → ${base[coupure - 1].date}`)
console.log(`     test          : ${base[coupure].date} → ${base[n - 1].date}`)
console.log('')

/* ══════════════════ ① L'ORACLE PAR BLOC ═════════════════════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ① SI ON CHOISISSAIT TOUJOURS LA MÊME COMBINAISON')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const oracle = {}
BLOCS.forEach((b, bi) => {
  const combinaisons = new Map()
  for (const i of [...idxTrain, ...idxTest]) {
    const k = base[i]
    const nums = numsDuBloc(k, bi)
    const combos = combosDe(nums.length, b.quota)
    if (!combos.length) continue
    for (const c of combos) {
      /* ⚠ la clé est faite des RANGS DE PRESSE (P1, P2, P3…), jamais des
       * numéros de chevaux : les numéros changent d'une course à l'autre,
       * les rangs de presse non. */
      const rangs = c.map((x) => k.pDe.get(nums[x])).sort((u, v) => u - v)
      const cle = rangs.join('+')
      if (!combinaisons.has(cle)) combinaisons.set(cle, { app: [0, 0], test: [0, 0] })
      const pod = k.podium.filter((x) => nums.includes(x))
      const pris = pod.filter((x) => c.some((y) => nums[y] === x)).length
      const e = combinaisons.get(cle)
      e[i < coupure ? 'app' : 'test'][0] += pris
      e[i < coupure ? 'app' : 'test'][1] += pod.length
    }
  }
  oracle[b.id] = combinaisons
  const nom = (cle) => cle.split('+').map((x) => 'P' + x).join('+')
  const lignes = [...combinaisons.entries()]
    .map(([cle, v]) => ({ cle, ...v }))
    .sort((x, y) => (y.app[0] - x.app[0]) || ((y.app[1] && y.app[0] / y.app[1]) - (x.app[1] && x.app[0] / x.app[1])))
  console.log(`  ${b.id} — ${b.quota} à prendre sur P${b.min}-P${b.max === 99 ? b.min + '+' : b.max}  ·  ${lignes.length} combinaisons possibles`)
  console.log('    combinaison        attrapé/possibles   APP     TEST')
  lignes.slice(0, 10).forEach((l) => {
    const ra = l.app[1] ? (l.app[0] / l.app[1] * 100).toFixed(0) + ' %' : '—'
    const rt = l.test[1] ? (l.test[0] / l.test[1] * 100).toFixed(0) + ' %' : '—'
    console.log('    ' + nom(l.cle).padEnd(17) + String(l.app[0] + '/' + l.app[1]).padStart(14) + ra.padStart(9) + rt.padStart(9))
  })
  console.log('')
})

/* ═════════════ ② LA RÈGLE APPRISE SUR LES 70 ANCIENNES ═════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ② UNE RÈGLE CALCULABLE AVANT LA COURSE')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const retenues = {}
BLOCS.forEach((b, bi) => {
  let best = null
  for (const [regles, sens] of REGLES) {
    let tot = 0
    let pos = 0
    for (const i of idxTrain) {
      const k = base[i]
      const a = attrape(k, bi, choisirAvec(k, bi, regles, sens))
      tot += a.pris
      pos += a.possibles
    }
    if (!pos) continue
    const taux = tot / pos * 100
    if (!best || taux > best.taux) best = { regles, sens, taux, cle: regles.join('+') }
  }
  retenues[b.id] = best
  const nom = best.regles.map((r, i) => (best.sens[i] === -1 ? '−' : '+') + r).join(' ')
  console.log(`  ${b.id}   règle retenue : ${nom.padEnd(34)} apprentissage ${best.taux.toFixed(0)} %`)
})
console.log('')
console.log('  ⭐ la même règle, sur les 24 courses RÉCENTES qu elle n a jamais vues')
console.log('')
console.log('  bloc    apprentissage    TEST      chute')
console.log('  ' + '-'.repeat(56))
BLOCS.forEach((b, bi) => {
  let tot = 0
  let pos = 0
  for (const i of idxTest) {
    const k = base[i]
    const a = attrape(k, bi, choisirAvec(k, bi, retenues[b.id].regles, retenues[b.id].sens))
    tot += a.pris
    pos += a.possibles
  }
  const te = pos ? tot / pos * 100 : 0
  const tr = retenues[b.id].taux
  const cotes = base[idxTrain[0]].pDe.size ? '' : ''
  console.log(`  ${b.id.padEnd(6)} ${(tr.toFixed(0) + ' %').padStart(12)}${(te.toFixed(0) + ' %').padStart(9)}   `
    + (tr - te > 15 ? '⚠ SUR-APPRENTISSAGE (-' + (tr - te).toFixed(0) + ')' : (tr - te > 7 ? 'léger (-' + (tr - te).toFixed(0) + ')' : 'stable')))
})
console.log('')

/* ═══════════════ ③ LE TICKET COMPLET, AVANT / APRÈS ═══════════════ */
console.log('  ══════════════════════════════════════════════════════════════')
console.log('  ║  ③ LE TICKET ENTIER (3-2-1-1-1, 8 chevaux)')
console.log('  ══════════════════════════════════════════════════════════════')
console.log('')

const ticketAvec = (k, mode) => BLOCS.flatMap((b, bi) => (mode === 'cote'
  ? numsDuBloc(k, bi).slice().sort((a, c) => (k.cotes[a] || 999) - (k.cotes[c] || 999)).slice(0, b.quota)
  : choisirAvec(k, bi, retenues[b.id].regles, retenues[b.id].sens)))

const mesureTicket = (idx, mode, cible) => idx.map((i) => {
  const k = base[i]
  const tk = new Set(ticketAvec(k, mode))
  return (cible === 3 ? k.podium : k.top5).filter((x) => tk.has(x)).length
})
const stat = (t, cible) => {
  const max = cible
  const rep = []
  for (let h = 0; h <= max; h++) rep.push(t.filter((v) => v === h).length)
  return {
    rep, moy: t.reduce((a, b) => a + b, 0) / t.length,
    plein: t.filter((v) => v === max).length / t.length * 100,
    ge3: t.filter((v) => v >= Math.min(3, max)).length / t.length * 100,
    ge2: t.filter((v) => v >= 2).length / t.length * 100,
  }
}

for (const cible of [3, 5]) {
  const lbl = cible === 3 ? 'PODIUM (3 premiers)' : 'QUINTÉ (5 premiers)'
  const tCoteA = mesureTicket(idxTrain, 'cote', cible)
  const tNewA = mesureTicket(idxTest, 'cote', cible)
  const tCoteT = mesureTicket(idxTrain, 'regle', cible)
  const tNewT = mesureTicket(idxTest, 'regle', cible)
  const sc = stat(tCoteA, cible)
  const sn = stat(tCoteT, cible)
  const vc = stat(tNewA, cible)
  const vn = stat(tNewT, cible)
  console.log('  ⭐ ' + lbl)
  console.log('')
  console.log('                          ' + Array.from({ length: cible + 1 }, (_, h) => (cible === 3 ? h + '/3' : h + '/5').padStart(7)).join('') + '    moyen   ≥2    ≥3   ' + (cible === 3 ? '3/3' : '5/5'))
  console.log('  ' + '-'.repeat(38 + (cible + 1) * 7 + 26))
  console.log('  rempli par COTE   app' + sc.rep.map((v) => String(v).padStart(7)).join('') + sc.moy.toFixed(2).padStart(9) + sc.ge2.toFixed(0).padStart(6) + sc.ge3.toFixed(0).padStart(6) + sc.plein.toFixed(0).padStart(6) + ' %')
  console.log('  nouveau moteur    app' + sn.rep.map((v) => String(v).padStart(7)).join('') + sn.moy.toFixed(2).padStart(9) + sn.ge2.toFixed(0).padStart(6) + sn.ge3.toFixed(0).padStart(6) + sn.plein.toFixed(0).padStart(6) + ' %')
  console.log('  rempli par COTE   TEST' + vc.rep.map((v) => String(v).padStart(7)).join('') + vc.moy.toFixed(2).padStart(9) + vc.ge2.toFixed(0).padStart(6) + vc.ge3.toFixed(0).padStart(6) + vc.plein.toFixed(0).padStart(6) + ' %')
  console.log('  nouveau moteur    TEST' + vn.rep.map((v) => String(v).padStart(7)).join('') + vn.moy.toFixed(2).padStart(9) + vn.ge2.toFixed(0).padStart(6) + vn.ge3.toFixed(0).padStart(6) + vn.plein.toFixed(0).padStart(6) + ' %')
  const gain = vn.moy - vc.moy
  console.log('')
  console.log('  ⭐ écart sur le TEST JAMAIS VU : ' + (gain > 0 ? '+' : '') + gain.toFixed(2) + '  '
    + (Math.abs(gain) < 0.10 ? '⚠ du bruit — aucune règle apprise' : gain > 0 ? '✓ réel' : '✗ pire que la cote'))
  console.log('')
}
