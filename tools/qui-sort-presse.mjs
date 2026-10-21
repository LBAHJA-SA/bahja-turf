/* =============================================================================
 * tools/qui-sort-presse.mjs — QUI SORT, MESURÉ SUR LA VRAIE GRILLE (20/10/2026)
 *
 * C'EST L'EXPÉRIENCE DÉCISIVE.
 *
 * Tout ce qui précède mesurait des blocs qui n'étaient pas les blocs de la
 * méthode (tranches de marché). Ici on prend `buildGrid` — les vraies cases
 * P1..P20, les vrais groupes G1..G5 — sur les 96 Quintés à presse réelle, et on
 * demande, bloc par bloc :
 *
 *        LE CHEVAL QU'ON SORT ARRIVE-T-IL ?
 *
 * C'est une métrique DENSE (≈ 96 réponses par bloc, ~40 % de oui) : une règle
 * qui fait bouger de 5 points est lisible, contrairement au 5/5 qui ne compte
 * que 12 événements.
 *
 * Signaux testés, tous calculés sur la carrière réelle (data/corpus/carriere96.json) :
 *   carnet    le rang de presse — la règle de PRODUCTION
 *   marche    la cote
 *   forme     les places récentes, pondérées 1/(1+i·0,55)
 *   distance  l'aptitude à la distance du jour (±100 m = 10 pts … ±600 m = 3)
 *   piste     le nombre de courses sur le même hippodrome
 *   age       l'âge du cheval
 *
 *   node tools\qui-sort-presse.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const N = (s) => String(s || '').toUpperCase().replace(/[_\s-]+/g, '').trim()

/* ─────────── ① le corpus ────────────────────────────────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CAR = JSON.parse(fs.readFileSync('data/corpus/carriere96.json', 'utf8'))
const POIDS = JSON.parse(fs.readFileSync('data/corpus/poids-presse.json', 'utf8'))

const BRUT = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  BRUT.push({ q, nums, syn })
}

const PTS = { 1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 }
const W = (i) => 1 / (1 + i * 0.55)

function notes(runs, dist, track) {
  if (!runs || !runs.length) return null
  let fN = 0, fD = 0, dN = 0, dD = 0, pN = 0, pD = 0
  runs.slice(0, 6).forEach((r, i) => {
    const w = W(i)
    fN += w * (PTS[r.place] ?? 0); fD += w
    if (dist && r.dist) {
      const e = Math.abs(r.dist - dist)
      const q = e <= 100 ? 10 : e <= 200 ? 8 : e <= 400 ? 5 : e <= 600 ? 3 : 0
      dN += w * q; dD += w
    }
    pN += w * (N(r.track) === N(track) ? 1 : 0); pD += w
  })
  return { forme: fD ? fN / fD : null, distance: dD ? dN / dD : null, piste: pD ? pN / pD : null }
}

const C = []
for (const b of BRUT) {
  const car = CAR[b.q.date + '|' + b.q.id]
  const poids = POIDS[b.q.id] || {}
  const grille = buildGrid(b.syn, b.nums)
  const parNum = {}
  for (const n of b.nums) {
    const ch = car?.chevaux?.[n]
    const nt = notes(ch?.runs, Number(b.q.distance) || null, b.q.track)
    parNum[n] = {
      carnet: b.syn.indexOf(n),                       /* rang de presse, 0 = le plus cité */
      marche: b.q.cotes[n],
      poids: poids[n] ?? null,
      ...(nt || {}),
    }
  }
  C.push({ q: b.q, grille, parNum, bloc: grille.groupes.map((g) => g.cases.map((x) => x.num)) })
}
console.log('')
console.log('  QUI SORT ? — ' + C.length + ' Quintés à presse réelle, vraie grille buildGrid')
console.log('  métrique : le cheval sorti du bloc arrive-t-il dans les 5 ? (plus bas = meilleur choix)')
console.log('  « carnet » = la règle de production · « marche » = la cote (G4 en production)')
console.log('')

const QUOTAS = [3, 3, 1, 1, 0]
const SIG = ['carnet', 'marche', 'forme', 'distance', 'piste', 'poids']
const DROPS = ['carnet', 'marche', 'forme', 'distance', 'piste']
const annee = new Date('2026-10-20').getFullYear()

/** ce qui est sorti du bloc G1..G4 quand on garde les `quota` meilleurs au signal */
function sortiDe(k, b, sig) {
  const bloc = k.bloc[b]
  const q = QUOTAS[b]
  const vals = bloc.map((n) => k.parNum[n]?.[sig])
  if (vals.some((v) => v == null)) return null
  const tri = bloc.slice().sort((x, y) => {
    const a = k.parNum[x][sig], z = k.parNum[y][sig]
    return a - z
  })
  return tri.slice(q)          /* tout ce qui reste dehors */
}

const RES = {}
for (let b = 0; b < 4; b++) {
  const lignes = []
  for (const sig of SIG) {
    for (const sens of ['bas', 'haut']) {
      if (sig === 'carnet' && sens === 'haut') continue      /* carnet : les plus cités */
      if (sig === 'marche' && sens === 'haut') continue      /* marché : les cotes basses */
      let n = 0, t5 = 0, t3 = 0
      for (const k of C) {
        const bloc = k.bloc[b]
        if (bloc.length <= QUOTAS[b]) continue
        const vals = bloc.map((x) => k.parNum[x]?.[sig])
        if (vals.some((v) => v == null)) continue
        const tri = bloc.slice().sort((x, y) => {
          const a = k.parNum[x][sig], z = k.parNum[y][sig]
          return sens === 'bas' ? a - z : z - a
        })
        const dehors = tri.slice(QUOTAS[b])
        if (!dehors.length) continue
        n++
        if (dehors.some((x) => k.q.arrivee.slice(0, 5).includes(x))) t5++
        if (dehors.some((x) => k.q.arrivee.slice(0, 3).includes(x))) t3++
      }
      if (n < 40) continue
      lignes.push({ nom: sig + (sens === 'bas' ? '' : ' (inversé)'), n, t5, t3 })
    }
  }
  RES[b] = lignes.sort((x, y) => (x.t5 / x.n) - (y.t5 / y.n))
  console.log('  ── G' + (b + 1) + '   (' + QUOTAS[b] + ' gardés sur ' + C[b].bloc[b].length + ' max)')
  console.log('     ' + pad('signal', 20) + pad('sorti arrive top-5', 20) + pad('top-3', 10) + 'n')
  for (const l of RES[b]) {
    const marque = (l.nom === 'carnet' && b < 3) || (l.nom === 'marche' && b === 3) ? '   ← production' : ''
    console.log('     ' + pad(l.nom, 20) + pad(pct(l.t5, l.n), 20) + pad(pct(l.t3, l.n), 10) + pad(l.n, 5) + marque)
  }
  console.log('')
}

/* ─────────── ② bis LES COMBINAISONS — deux signaux dans la même décision ─── */
/* rang du cheval dans son bloc, 1 = le meilleur au signal (sens « meilleur ») */
const MEILLEUR = { carnet: -1, marche: -1, forme: 1, distance: 1, piste: 1, poids: -1 }
function rangs(k, b, sig) {
  const bloc = k.bloc[b]
  if (bloc.some((n) => k.parNum[n]?.[sig] == null)) return null
  const ord = bloc.slice().sort((x, y) => MEILLEUR[sig] * (k.parNum[x][sig] - k.parNum[y][sig]))
  const r = {}
  ord.forEach((n, i) => { r[n] = i })
  return r
}
function sortiCombo(k, b, a, c) {
  const ra = rangs(k, b, a), rc = rangs(k, b, c)
  if (!ra || !rc) return null
  const bloc = k.bloc[b]
  const tri = bloc.slice().sort((x, y) => (ra[x] + rc[x]) - (ra[y] + rc[y]))
  return tri.slice(QUOTAS[b])
}
console.log('  ── COMBINAISONS (deux signaux additionnés par leurs rangs de bloc)')
const COMBOS = [['carnet', 'forme'], ['carnet', 'distance'], ['carnet', 'marche'], ['carnet', 'piste'],
  ['marche', 'forme'], ['marche', 'distance'], ['marche', 'piste'], ['forme', 'distance']]
for (let b = 0; b < 4; b++) {
  const l = []
  for (const [a, c] of COMBOS) {
    let n = 0, t5 = 0
    for (const k of C) {
      const d = sortiCombo(k, b, a, c)
      if (!d || !d.length) continue
      n++
      if (d.some((x) => k.q.arrivee.slice(0, 5).includes(x))) t5++
    }
    if (n < 40) continue
    l.push({ nom: a + ' + ' + c, n, t5 })
  }
  l.sort((x, y) => x.t5 / x.n - y.t5 / y.n)
  const ref = RES[b].find((x) => x.nom === 'carnet')
  console.log('     ' + pad('G' + (b + 1), 5) + l.slice(0, 3).map((x) => pad(x.nom + ' ' + pct(x.t5, x.n), 26)).join('') +
    '   (carnet ' + pct(ref.t5, ref.n) + ')')
}
console.log('')

/* ─────────── ③ stabilité : les deux moitiés ─────────────────────────────── */
console.log('  STABILITÉ — le meilleur signal de chaque bloc, moitié par moitié')
const m = Math.floor(C.length / 2)
for (const [nom, lot] of [['1ʳᵉ moitié', C.slice(0, m)], ['2ᵈᵉ moitié', C.slice(m)]]) {
  const out = []
  for (let b = 0; b < 4; b++) {
    let best = null
    for (const sig of DROPS) {
      for (const sens of ['bas', 'haut']) {
        if (sig === 'carnet' && sens === 'haut') continue
        if (sig === 'marche' && sens === 'haut') continue
        let n = 0, t5 = 0
        for (const k of lot) {
          const bloc = k.bloc[b]
          if (bloc.length <= QUOTAS[b]) continue
          const vals = bloc.map((x) => k.parNum[x]?.[sig])
          if (vals.some((v) => v == null)) continue
          const tri = bloc.slice().sort((x, y) => {
            const a = k.parNum[x][sig], z = k.parNum[y][sig]
            return sens === 'bas' ? a - z : z - a
          })
          const dehors = tri.slice(QUOTAS[b])
          if (!dehors.length) continue
          n++
          if (dehors.some((x) => k.q.arrivee.slice(0, 5).includes(x))) t5++
        }
        if (n < 20) continue
        if (!best || t5 / n < best.t) best = { nom: sig + (sens === 'bas' ? '' : '↑'), t: t5 / n }
      }
    }
    out.push('G' + (b + 1) + ' ' + (best ? best.nom + ' ' + pct(best.t * 1000, 1000) : '—'))
  }
  console.log('  ' + pad(nom, 14) + out.join(' · '))
}
console.log('')
