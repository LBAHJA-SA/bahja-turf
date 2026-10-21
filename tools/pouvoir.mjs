/* =============================================================================
 * tools/pouvoir.mjs — LE CHOIX DANS LE BLOC A-T-IL UN POUVOIR ? (20/10/2026)
 *
 * La question, posée une fois pour toutes :
 *   dans un bloc, les chevaux sont-ils TRIABLES, ou interchangeables ?
 *
 * Trois nombres par bloc, sur la vraie grille et les 96 Quintés à presse réelle :
 *
 *   BASE    la moyenne : chaque cheval du bloc arrive-t-il dans les 5 ? (%)
 *   SORTI   ce que coûte la règle : le cheval qu'elle jette arrive-t-il ?
 *   ORACLE  le plancher : le cheval qu'on jette n'arrive jamais — ça n'est
 *           possible que si TOUS les chevaux du bloc arrivent (alors on perd
 *           forcément). C'est la meilleure règle imaginable.
 *
 *   POUVOIR = (BASE − SORTI) / (BASE − ORACLE)
 *             0 %  → la règle ne trie RIEN (elle jette au hasard)
 *           100 %  → la règle est parfaite (elle jette toujours un non-arrivant)
 *
 * Si tous les pouvoirs sont autour de 0, le bloc est un tirage : aucune règle
 * ne peut choisir, quel que soit le nombre de variables essayées.
 *
 *   node tools\pouvoir.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const N = (s) => String(s || '').toUpperCase().replace(/[_\s-]+/g, '').trim()

const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CAR = JSON.parse(fs.readFileSync('data/corpus/carriere96.json', 'utf8'))
const VH = JSON.parse(fs.readFileSync('data/vh.json', 'utf8'))
const POIDS = JSON.parse(fs.readFileSync('data/corpus/poids-presse.json', 'utf8'))

const PTS = { 1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 }
const Wt = (i) => 1 / (1 + i * 0.55)

function notes(runs, dist, track) {
  if (!runs || !runs.length) return null
  let fN = 0, fD = 0, dN = 0, dD = 0, pN = 0, pD = 0, podN = 0
  runs.slice(0, 6).forEach((r, i) => {
    const w = Wt(i)
    fN += w * (PTS[r.place] ?? 0); fD += w
    if (dist && r.dist) {
      const e = Math.abs(r.dist - dist)
      dN += w * (e <= 100 ? 10 : e <= 200 ? 8 : e <= 400 ? 5 : e <= 600 ? 3 : 0); dD += w
    }
    pN += w * (N(r.track) === N(track) ? 1 : 0); pD += w
    if ([1, 2, 3].includes(r.place)) podN++
  })
  return {
    forme: fD ? fN / fD : null,
    distance: dD ? dN / dD : null,
    piste: pD ? pN / pD : null,
    podium: runs.length ? podN / runs.length : null,
    jours: runs[0]?.date ? Math.round((new Date('2026-10-20') - new Date(runs[0].date)) / 86400000) : null,
  }
}

const C = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  const car = CAR[q.date + '|' + q.id]
  const vh = VH[q.date + '|' + N(q.track) + '|' + q.num] || {}
  const poids = POIDS[q.id] || {}
  const parN = {}
  for (const n of nums) {
    const ch = car?.chevaux?.[n]
    /* le vh.json est indexé par NOM de cheval */
    const ligne = Object.values(vh).find((x) => Number(x.num) === n) || {}
    parN[n] = {
      carnet: syn.indexOf(n),
      marche: cotes[n],
      poids: poids[n] ?? null,
      vh: Number(ligne.vh) || null,
      corde: Number(ligne.corde) || null,
      ...(notes(ch?.runs, Number(q.distance) || null, q.track) || {}),
    }
  }
  const grille = buildGrid(syn, nums)
  /* 🔎 LE DÉSACCORD : écart entre le rang de presse et le rang de marché DANS le bloc.
     Un écart positif = la presse cite ce cheval mieux que le marché ne le cote.
     C'est le seul signal qui utilise les DEUX ordres sans les additionner. */
  for (const bloc of grille.groupes.map((g) => g.cases.map((x) => x.num))) {
    const rc = bloc.slice().sort((a, b) => parN[a].carnet - parN[b].carnet)
    const rm = bloc.slice().sort((a, b) => parN[a].marche - parN[b].marche)
    bloc.forEach((n) => {
      const e = rc.indexOf(n) - rm.indexOf(n)
      parN[n].ecart = e
      parN[n].ecartInv = -e
    })
  }
  C.push({ q, grille, parN, bloc: grille.groupes.map((g) => g.cases.map((x) => x.num)) })
}

const QUOTAS = [3, 3, 1, 1, 0]
const SIG = ['carnet', 'marche', 'forme', 'distance', 'piste', 'podium', 'jours', 'poids', 'vh', 'corde', 'ecart', 'ecartInv']
/* +1 = le plus PETIT est le meilleur · −1 = le plus GRAND est le meilleur */
const MEILLEUR = { carnet: 1, marche: 1, jours: 1, poids: 1, corde: 1, ecart: 1, ecartInv: 1, forme: -1, distance: -1, piste: -1, podium: -1, vh: -1 }

console.log('')
console.log('  LE POUVOIR DU CHOIX — ' + C.length + ' Quintés à presse réelle, vraie grille')
console.log('  BASE = chaque cheval du bloc arrive dans les 5 · SORTI = le cheval jeté arrive')
console.log('  ORACLE = le plancher absolu · POUVOIR = (BASE − SORTI) / (BASE − ORACLE)')
console.log('')

for (let b = 0; b < 4; b++) {
  const noms = ['G1', 'G2', 'G3', 'G4']
  let nBase = 0, tot = 0, nOracle = 0
  const stats = {}
  for (const k of C) {
    const bloc = k.bloc[b]
    if (bloc.length < 2) continue
    const a = k.q.arrivee.slice(0, 5)
    const q = Math.min(QUOTAS[b], bloc.length)
    tot += bloc.length
    nBase += bloc.filter((x) => a.includes(x)).length
    /* oracle : on garde les `q` arrivants s'il y en a assez, sinon on perd */
    const arr = bloc.filter((x) => a.includes(x)).length
    if (arr === bloc.length) nOracle++          /* tous arrivent → on jette un arrivant */
    for (const sig of SIG) {
      if (bloc.some((x) => k.parN[x]?.[sig] == null)) continue
      const tri = bloc.slice().sort((x, y) => MEILLEUR[sig] * (k.parN[x][sig] - k.parN[y][sig]))
      const dehors = tri.slice(q)
      if (!dehors.length) continue
      const s = stats[sig] || (stats[sig] = { n: 0, perdu: 0 })
      s.n++
      if (dehors.some((x) => a.includes(x))) s.perdu++
    }
  }
  const base = nBase / tot
  const oracle = nOracle / C.length
  console.log('  ── ' + noms[b] + '   BASE ' + pct(nBase, tot) + '   ·   ORACLE ' + pct(nOracle, C.length) +
    '   ·   marge ' + ((base - oracle) * 100).toFixed(1).replace('.', ',') + ' pts')
  const l = Object.entries(stats).map(([sig, s]) => ({
    sig, n: s.n, t: s.perdu / s.n,
    pouvoir: base > oracle ? (base - s.perdu / s.n) / (base - oracle) * 100 : 0,
  })).sort((x, y) => y.pouvoir - x.pouvoir)
  for (const r of l) {
    console.log('     ' + pad(r.sig, 12) + pad(pct(r.t * 1000, 1000), 10) +
      pad((r.pouvoir >= 0 ? '+' : '') + r.pouvoir.toFixed(0) + ' %', 10) + 'n = ' + r.n)
  }
  console.log('')
}
