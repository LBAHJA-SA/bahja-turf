/**
 * MOTEUR PAR G — une règle DIFFÉRENTE pour chaque bloc.
 *
 * Les quotas restent 3-2-1-1-1 (§11.2, règle fermée). Ce qu'on cherche, c'est
 * si chaque bloc a sa propre façon de choisir — parce que les blocs n'ont pas
 * le même taux de base :
 *
 *   G1  P1-P4   le marché dit que 1 de 4 arrive  →  100 %
 *   G2  P5-P8                                            93 %
 *   G3  P9-P10                                           40 %
 *   G4  P11-P12                                          30 %
 *   G5  P13-P20                                          20 %
 *
 * ⚠ n = 4 Quintés. G4 n'a qu'UNE arrivée, G5 en a DEUX : ces deux blocs
 *   ne sont PAS mesurables. Le tableau le dira. On ne fabrique pas de règle
 *   sur une seule observation.
 *
 *   node tools\moteurG.mjs
 */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const mes = JSON.parse(fs.readFileSync('data/mesure.json', 'utf8'))

const nbKo = (x) => (x?.filtres || []).filter((v) => !v).length
const nbOk = (x) => (x?.filtres || []).filter((v) => v).length

/* ═══ toutes les règles candidates, sans la forme ═══ */
const REGLES = {
  'presse ↑ (carnet)': (a, b) => a.rang - b.rang,
  'cote ↑ (marché)': (a, b) => (a.cote ?? 1e9) - (b.cote ?? 1e9),
  'cote ↑ puis presse ↑': (a, b) => (a.cote ?? 1e9) - (b.cote ?? 1e9) || (a.rang - b.rang),
  'presse ↑ puis cote ↑': (a, b) => a.rang - b.rang || (a.cote ?? 1e9) - (b.cote ?? 1e9),
  'tendance ↑ (cote baisse)': (a, b) => (b.ouv != null && a.cote ? b.ouv / b.cote - a.ouv / a.cote : 0),
  'tendance ↓ (cote monte)': (a, b) => (b.ouv != null && a.cote ? a.ouv / a.cote - b.ouv / b.cote : 0),
  '3/3 puis presse ↑': (a, b) => (nbOk(b.s) - nbOk(a.s)) || (a.rang - b.rang),
  '3/3 puis cote ↑': (a, b) => (nbOk(b.s) - nbOk(a.s)) || ((a.cote ?? 1e9) - (b.cote ?? 1e9)),
  'cote ↑ puis 3/3': (a, b) => ((a.cote ?? 1e9) - (b.cote ?? 1e9)) || (nbOk(b.s) - nbOk(a.s)),
  'aucun filtre 3/3 d\'abord': (a, b) => nbOk(a.s) - nbOk(b.s),
  'global ↓': (a, b) => (b.s?.global ?? 0) - (a.s?.global ?? 0),
  'distance ↓': (a, b) => (b.s?.dist ?? 0) - (a.s?.dist ?? 0),
  'piste ↓': (a, b) => (b.s?.piste ?? 0) - (a.s?.piste ?? 0),
  'niveau ↓': (a, b) => (b.s?.niveau ?? 0) - (a.s?.niveau ?? 0),
  'terrain ↓': (a, b) => (b.s?.terrain ?? 0) - (a.s?.terrain ?? 0),
  'corde ↓': (a, b) => (b.s?.corde ?? 0) - (a.s?.corde ?? 0),
  'âge ↑ (jeune)': (a, b) => ((a.age ?? 99) - (b.age ?? 99)) || (a.rang - b.rang),
  'âge ↓ (vieux)': (a, b) => ((b.age ?? 0) - (a.age ?? 0)) || (a.rang - b.rang),
  '— CTRL — presse ↓': (a, b) => b.rang - a.rang,
  '— CTRL — cote ↓': (a, b) => (b.cote ?? 0) - (a.cote ?? 0),
  '— CTRL — global ↑': (a, b) => (a.s?.global ?? 0) - (b.s?.global ?? 0),
}

/* ═══ les données, bloc par bloc ═══ */
const races = []
for (const d of Object.keys(db).sort()) {
  if (!db[d].arrivee?.length || !mes[d]?.cotes) continue
  const r = db[d]
  const sc = Object.fromEntries((r.scores || []).map((x) => [x.num, x]))
  const co = Object.fromEntries(mes[d].cotes.map((x) => [x.num, x]))
  races.push({
    d, sc, co, arrivee: r.arrivee.slice(0, 5),
    blocs: buildGrid(r.synthese, r.runners).groupes.map((g) => ({
      id: g.id, quota: g.quota,
      cases: g.cases.map((c) => ({
        num: c.num, rang: c.slot, s: sc[c.num] ?? null,
        cote: co[c.num]?.cote ?? null, ouv: co[c.num]?.ouverture ?? null,
        age: co[c.num]?.age ?? null,
      })),
    })),
  })
}

const BLOCS = ['G1', 'G2', 'G3', 'G4', 'G5']
const prend = (g, cmp) => {
  const t = g.cases.slice().sort(cmp)
  return t.slice(0, Math.min(g.quota, g.cases.length)).map((c) => c.num)
}

/** pour un bloc donné, sur un sous-ensemble de courses : captés / base */
function evalue(idBloc, cmp, lot) {
  let captes = 0, base = 0, n = 0
  for (const r of lot) {
    const g = r.blocs.find((x) => x.id === idBloc)
    if (!g) continue
    const t = prend(g, cmp)
    for (const c of g.cases) {
      if (!r.arrivee.includes(c.num)) continue
      n++
      if (t.includes(c.num)) captes++
      base += Math.min(g.quota, g.cases.length) / g.cases.length
    }
  }
  return { captes, base, n, ratio: base > 0 ? captes / base : 0 }
}

/* ═══ 1. le taux de base de chaque bloc ═══ */
console.log('\n' + '='.repeat(118))
console.log('  1. LE TAUX DE BASE DE CHAQUE BLOC — combien d\'arrivés il contient, et combien le quota peut en prendre')
console.log('='.repeat(118) + '\n')
console.log('  bloc   quota   cases   arrivés dans le bloc   plafond du quota   part du 5/5')
const infoBloc = {}
for (const id of BLOCS) {
  const { captes, base, n } = evalue(id, REGLES['presse ↑ (carnet)'], races)
  infoBloc[id] = n
  const part = (n / 20 * 100).toFixed(0)
  console.log('  ' + id.padEnd(6) + String(races[0].blocs.find((b) => b.id === id).quota).padStart(5)
    + String(races.reduce((a, r) => a + r.blocs.find((b) => b.id === id).cases.length, 0)).padStart(8)
    + String(n).padStart(22) + base.toFixed(1).padStart(19) + part.padStart(14) + ' %'
    + (n < 4 ? '   ⚠ NON MESURABLE' : ''))
}

/* ═══ 2. la meilleure règle PAR BLOC ═══ */
console.log('\n' + '='.repeat(118))
console.log('  2. LA MEILLEURE RÈGLE PAR BLOC — captés ÷ plafond du hasard.   > 1,00 = elle bat le hasard')
console.log('='.repeat(118) + '\n')
const choix = {}
for (const id of BLOCS) {
  const n = infoBloc[id]
  const lignes = []
  for (const [nom, cmp] of Object.entries(REGLES)) {
    const e = evalue(id, cmp, races)
    lignes.push({ nom, ...e, ctrl: nom.startsWith('—') })
  }
  lignes.sort((a, b) => (b.ctrl - a.ctrl) || (b.ratio - a.ratio))
  console.log('  ' + id + '  (' + n + ' arrivés' + (n < 4 ? '  ⚠ trop peu pour conclure' : '') + ')')
  for (const x of lignes.slice(0, 5)) {
    const bar = '\u2588'.repeat(Math.min(20, Math.round(x.ratio * 10)))
    console.log('    ' + (x.ctrl ? 'ctrl ' : '     ') + x.nom.padEnd(28)
      + String(x.captes).padStart(3) + '/' + String(x.n).padEnd(3)
      + x.ratio.toFixed(2).padStart(7) + '  ' + bar)
  }
  const propres = lignes.filter((x) => !x.ctrl)
  choix[id] = propres[0].nom
  console.log('    → retenu : ' + propres[0].nom + '  (' + propres[0].ratio.toFixed(2) + ')\n')
}

/* ═══ 3. VALIDATION — le test qui compte ═══ */
console.log('='.repeat(118))
console.log('  3. VALIDATION SORTIE-D\'ÉCHANTILLON — on choisit la règle sur 3 courses, on la teste sur la 4ᵉ')
console.log('     (si un moteur par G est meilleur QUE le hasard ici, il est réel. Sinon c\'est du sur-apprentissage.)')
console.log('='.repeat(118) + '\n')

const GLOBAL = 'presse ↑ (carnet)'
let totParG = 0, totUnSeul = 0, totHasard = 0
console.log('  course retirée   moteur par G (règle choisie sur les 3 autres)     une règle unique')
for (let i = 0; i < races.length; i++) {
  const autres = races.filter((_, k) => k !== i)
  const teste = races[i]
  let p = 0, u = 0, h = 0
  for (const id of BLOCS) {
    // choisir la meilleure règle sur les 3 autres courses
    let best = GLOBAL, bestR = -1
    for (const [nom, cmp] of Object.entries(REGLES)) {
      if (nom.startsWith('—')) continue
      const r = evalue(id, cmp, autres).ratio
      if (r > bestR) { bestR = r; best = nom }
    }
    const g = teste.blocs.find((x) => x.id === id)
    const t = prend(g, REGLES[best])
    p += g.cases.filter((c) => teste.arrivee.includes(c.num) && t.includes(c.num)).length
    h += g.cases.filter((c) => teste.arrivee.includes(c.num)).length * (Math.min(g.quota, g.cases.length) / g.cases.length)

    const tu = prend(g, REGLES[GLOBAL])
    u += g.cases.filter((c) => teste.arrivee.includes(c.num) && tu.includes(c.num)).length
  }
  totParG += p; totUnSeul += u; totHasard += h
  console.log('  ' + teste.d + String(p).padStart(12) + ' / 5' + String(h.toFixed(1)).padStart(28)
    + '     ' + u + ' / 5   (' + GLOBAL + ')')
}
console.log('\n  TOTAL (hors échantillon)   moteur par G : ' + totParG + '/20'
  + '     une règle unique : ' + totUnSeul + '/20     hasard : ' + totHasard.toFixed(1) + '/20')

/* ═══ 4. le moteur par G assemblé, tel qu'il tournerait demain ═══ */
console.log('\n' + '='.repeat(118))
console.log('  4. LE MOTEUR PAR G ASSEMBLÉ  (règles choisies sur les 4 courses — donc optimistes, §3 dit la vérité)')
console.log('='.repeat(118) + '\n')
const parBloc = Object.fromEntries(BLOCS.map((id) => [id, choix[id]]))
console.log('  ' + BLOCS.map((id) => id + ' → ' + parBloc[id]).join('\n  '))
console.log()
let tot = 0
const detail = []
for (const r of races) {
  const t = []
  for (const id of BLOCS) {
    const g = r.blocs.find((x) => x.id === id)
    t.push(...prend(g, REGLES[parBloc[id]]))
  }
  const uniq = [...new Set(t)]
  const p = r.arrivee.filter((n) => uniq.includes(n)).length
  tot += p
  detail.push('  ' + r.d + '  ' + String(p) + '/5   ticket : ' + uniq.join(' · '))
}
console.log(detail.join('\n'))
console.log('\n  TOTAL : ' + tot + '/20'
  + (tot > totHasard ? '   au-dessus du hasard' : '   sous le hasard'))
console.log('')
