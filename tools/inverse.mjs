/**
 * tools/inverse.mjs — « JE PRENDS L'INVERSE DU MOTEUR DANS CHAQUE G »
 * ===================================================================
 *
 * Hypothèse de l'utilisateur (20/10/2026) :
 *
 *   « Quand le moteur donne ses mauvais choix, je garde les 3 meilleurs et
 *     parfois 4, puis DANS CHAQUE G je prends l'inverse du moteur — et
 *     j'obtiens le quinté à plus de 80 %. »
 *
 * On mesure exactement ça. Le moteur remplit chaque groupe par le DÉBUT de sa
 * liste (carnet = P croissant, marché = cote croissante). « L'inverse » =
 * prendre la FIN de la liste du groupe.
 *
 *   G1 : quota 4 = 4 cases → rien à inverser (le moteur prend tout).
 *   G2 : quota 2 sur 4      → moteur P5-P6   · inverse P7-P8
 *   G3 : quota 1 sur 2      → moteur P9      · inverse P10
 *   G4 : quota 1 sur 2      → moteur P11     · inverse P12
 *   G5 : quota 0            → le moteur ne prend rien · inverse = 1 cheval
 *
 * Le ticket reste donc à 8 chevaux : 4 + 2 + 1 + 1 (+ 0).
 *
 * Métriques (jamais le cheval isolé, §11.25) :
 *   podium entier  = les 3 premiers sont dans le ticket
 *   quinté entier  = les 5 premiers sont dans le ticket
 *   ≥4 du quinté
 *
 *   node tools\inverse.mjs
 */
import fs from 'node:fs'
import { buildGrid, GROUPES } from '../src/lib/quinte.js'
import { chargerEchantillon } from './experience-g5.mjs'

// ── corpus : 96 Quintés à presse réelle + les courses de data/synthese.json ──
const C = chargerEchantillon('cotes').map((c) => ({
  date: c.date,
  synthese: c.synthese.map(Number),
  runners: c.runners.map(Number),
  arrivee: c.arrivee.map(Number),
  cotes: c.cotes || {},
}))
const B = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
;(Array.isArray(B) ? B : Object.values(B)).forEach((a) => {
  if (!a || !a.date) return
  if ((a.arrivee || []).length < 5) return
  if ((a.runners || []).length < 8) return
  if ((a.synthese || []).length < 10) return
  C.push({
    date: a.date,
    synthese: a.synthese.map(Number),
    runners: a.runners.map(Number),
    arrivee: a.arrivee.map(Number),
    cotes: a.cotes || {},
  })
})

/** Les cases d'un groupe, dans l'ordre du carnet (P croissant). */
function casesDe(g) {
  return (g.cases || []).slice().sort((a, b) => a.slot - b.slot)
}

/** Les mêmes cases, triées par la cote (marché). Sans cote → ordre du carnet. */
function casesMarche(g, cotes) {
  const cs = casesDe(g)
  if (!cs.every((c) => cotes && cotes[c.num] && cotes[c.num].cote > 1)) return cs
  return cs.slice().sort((a, b) => cotes[a.num].cote - cotes[b.num].cote || a.slot - b.slot)
}

/**
 * Construit un ticket à partir d'une politique par groupe.
 * `politique` = { G1: 'debut'|'fin', G2: ..., G5: 'rien'|'debut'|'fin' }
 * `ordre` = 'carnet' | 'marche'
 */
function ticketSelon(grille, politique, ordre, cotes) {
  const out = []
  for (const g of grille.groupes) {
    const q = g.obligatoire ? Math.max(1, GROUPES.find((z) => z.id === g.id)?.quota ?? 1) : (GROUPES.find((z) => z.id === g.id)?.quota ?? 0)
    const quota = politique.__quota?.[g.id] ?? q
    if (!quota) continue
    const base = ordre === 'marche' ? casesMarche(g, cotes) : casesDe(g)
    const pol = politique[g.id] || 'debut'
    const pris = pol === 'fin' ? base.slice(-quota) : base.slice(0, quota)
    pris.forEach((c) => out.push(c.num))
  }
  return out
}

function kpi(ticket, arrivee) {
  const t = new Set(ticket)
  const a = arrivee.slice(0, 5)
  const pris = a.filter((n) => t.has(n)).length
  const podium = a.slice(0, 3).filter((n) => t.has(n)).length
  return { pris, podium }
}

const scenarios = []
for (const ordre of ['carnet', 'marche']) {
  for (const g2 of ['debut', 'fin']) {
    for (const g3 of ['debut', 'fin']) {
      for (const g4 of ['debut', 'fin']) {
        const nom = `G2:${g2 === 'debut' ? 'P5P6' : 'P7P8'} G3:${g3 === 'debut' ? 'P9' : 'P10'} G4:${g4 === 'debut' ? 'P11' : 'P12'}`
        scenarios.push({ nom, ordre, politique: { G1: 'debut', G2: g2, G3: g3, G4: g4, G5: 'rien' } })
      }
    }
  }
  // variante « on descend jusqu'à G5 » : G2 = 1, G5 = 1 (toujours 8)
  for (const g5 of ['debut', 'fin']) {
    scenarios.push({
      nom: `G2:1 seul · G5:${g5 === 'debut' ? 'P13' : 'dernier'}`,
      ordre,
      politique: { G1: 'debut', G2: 'debut', G3: 'debut', G4: 'debut', G5: g5, __quota: { G2: 1, G5: 1 } },
    })
  }
}

const res = []
for (const s of scenarios) {
  let n = 0, cinq = 0, quatre = 0, trois = 0, podium = 0, taille = 0
  let h1n = 0, h1c = 0, h1p = 0, h2n = 0, h2c = 0, h2p = 0
  C.forEach((c, idx) => {
    const g = buildGrid(c.synthese, c.runners)
    const t = ticketSelon(g, s.politique, s.ordre, c.cotes)
    if (t.length !== 8) return
    const k = kpi(t, c.arrivee)
    n++
    taille += t.length
    if (k.pris === 5) cinq++
    if (k.pris >= 4) quatre++
    if (k.pris >= 3) trois++
    if (k.podium === 3) podium++
    const moitie = idx < C.length / 2
    if (moitie) { h1n++; if (k.pris === 5) h1c++; if (k.podium === 3) h1p++ } else { h2n++; if (k.pris === 5) h2c++; if (k.podium === 3) h2p++ }
  })
  res.push({ ...s, n, taille: taille / n, cinq, quatre, trois, podium, h1n, h1c, h1p, h2n, h2c, h2p })
}

// la production, pour comparaison
let pn = 0, p5 = 0, p4 = 0, p3 = 0, ppod = 0
for (const c of C) {
  const { remplirGrille } = await import('../src/lib/quinte.js')
  const g = buildGrid(c.synthese, c.runners)
  const cls = g.groupes.flatMap((x) => casesDe(x)).map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const r = remplirGrille(g, cls, c.discipline || '', null, null)
  const k = kpi(r.ticket, c.arrivee)
  pn++
  if (k.pris === 5) p5++
  if (k.pris >= 4) p4++
  if (k.pris >= 3) p3++
  if (k.podium === 3) ppod++
}

const pc = (a, b) => (100 * a / b).toFixed(1).replace('.', ',') + ' %'

console.log(`\ncorpus : ${C.length} Quintés · ${pn} rejoués\n`)
console.log('scénario                                        podium   quinté   ≥4      ≥3      x/5')
console.log('production (G1-G4 carnet, 4-2-1-1-0)            ' +
  [pc(ppod, pn), pc(p5, pn), pc(p4, pn), pc(p3, pn)].map((x) => x.padStart(7)).join(' ') +
  '   ' + ((5 * p5 + 4 * (p4 - p5) + 3 * (p3 - p4)) / pn).toFixed(2).padStart(5))

const tri = res.slice().sort((a, b) => b.cinq - a.cinq || b.podium - a.podium)
console.log('\nscénario                                        quinté   1ʳᵉ moitié   2ᵈᵉ moitié   podium')
for (const r of tri) {
  const nom = `${r.ordre === 'marche' ? 'M' : 'C'} ${r.nom}`
  console.log(nom.padEnd(46) +
    pc(r.cinq, r.n).padStart(7) + '  ' +
    (pc(r.h1c, r.h1n) + ' / ' + pc(r.h1p, r.h1n)).padStart(16) + '  ' +
    (pc(r.h2c, r.h2n) + ' / ' + pc(r.h2p, r.h2n)).padStart(16) + '  ' +
    pc(r.podium, r.n).padStart(7))
}
