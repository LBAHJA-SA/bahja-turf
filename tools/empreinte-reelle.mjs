/* =============================================================================
 * tools/empreinte-reelle.mjs — LA VRAIE EMPREINTE (méthode utilisateur, 11/10/2026).
 *
 * AUCUNE moyenne, AUCUNE famille, AUCUN mélange : les RANGS de cote (1,2,3…
 * par cote croissante, non-partants exclus) face aux places réelles.
 *   test P12 : (rang du 1er, rang du 2e)      — ex. (2,5)
 *   test P13 : (rang du 1er, rang du 3e)
 *   test P23 : (rang du 2e, rang du 3e)
 *   test trio : (r1, r2, r3) ORDONNÉ — (2,5,1) ≠ (1,2,5), jamais moyennés.
 * Chaque test a son N valide (un top3 sans cote = course invalide POUR CE
 * TEST). Extraction 70% chrono → vérification 30% (2 moitiés : stabilité),
 * baselines favori + hasard, ÉCHECS enregistrés. Sortie : console +
 * artefact JSON data/empreinte-reelle/empreinte-reelle.json (moteur).
 * (11/10 : export CSV refusé par l'utilisateur — supprimé.)
 * Usage : node tools/empreinte-reelle.mjs
 * ============================================================================= */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { charger } from './empreinte-couple.mjs'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = path.join(RACINE, 'data', 'empreinte-reelle')

const rangsDe = (partants) => {
  const ordre = partants
    .map((p) => ({ num: p.num, c: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.c))
    .sort((a, b) => a.c - b.c || a.num - b.num)
  return new Map(ordre.map((x, i) => [x.num, i + 1]))
}

const tout = charger().filter((c) => (c.arrivee || []).length >= 3 && (c.partants || []).length >= 8)
const coupe = Math.floor(tout.length * 0.7)
const extraction = tout.slice(0, coupe)
const verif1 = tout.slice(coupe, coupe + Math.floor((tout.length - coupe) / 2))
const verif2 = tout.slice(coupe + Math.floor((tout.length - coupe) / 2))
console.log('extraction : ' + extraction.length + ' · vérif A : ' + verif1.length + ' · vérif B : ' + verif2.length)

const cles = {
  p12: (r) => r[0] + ',' + r[1],
  p13: (r) => r[0] + ',' + r[2],
  p23: (r) => r[1] + ',' + r[2],
  trio: (r) => r.join(','),
}
const valide = {
  p12: (r) => r[0] != null && r[1] != null,
  p13: (r) => r[0] != null && r[2] != null,
  p23: (r) => r[1] != null && r[2] != null,
  trio: (r) => r.every((x) => x != null),
}
const rangsCourse = (c) => {
  const m = rangsDe(c.partants)
  return c.arrivee.slice(0, 3).map((n) => m.get(n) ?? null)
}

// extraction : config -> {n, exemples[]}
const tables = { p12: new Map(), p13: new Map(), p23: new Map(), trio: new Map() }
const N = { p12: 0, p13: 0, p23: 0, trio: 0 }
for (const c of extraction) {
  const r = rangsCourse(c)
  for (const t of Object.keys(tables)) {
    if (!valide[t](r)) continue
    N[t]++
    const k = cles[t](r)
    let e = tables[t].get(k)
    if (!e) { e = { n: 0, exemples: [] }; tables[t].set(k, e) }
    e.n++
    if (e.exemples.length < 5) e.exemples.push(c.date + ' ' + c.cle)
  }
}
// vérification : hits par config, par moitié (stabilité) + échecs
const ver = {}
for (const t of Object.keys(tables)) ver[t] = new Map()
const Nv = { v1: { p12: 0, p13: 0, p23: 0, trio: 0 }, v2: { p12: 0, p13: 0, p23: 0, trio: 0 } }
const passe = (lot, tag) => {
  for (const c of lot) {
    const r = rangsCourse(c)
    for (const t of Object.keys(tables)) {
      if (!valide[t](r)) continue
      Nv[tag][t]++
      const k = cles[t](r)
      const e = tables[t].get(k)
      if (!e) continue
      e[tag] = (e[tag] || 0) + 1
    }
  }
}
passe(verif1, 'v1')
passe(verif2, 'v2')
// baselines sur la vérification : favori + hasard
let fav = 0, nFav = 0, espHasard = 0, nH = 0
for (const c of [...verif1, ...verif2]) {
  const ordre = c.partants
    .map((p) => ({ num: p.num, cote: Number(p.cote_pmu ?? Infinity) }))
    .filter((x) => Number.isFinite(x.cote))
    .sort((a, b) => a.cote - b.cote || a.num - b.num)
  if (ordre.length < 3) continue
  nFav++
  const a = c.arrivee.slice(0, 3)
  if (ordre[0].num === a[0] && ordre[1].num === a[1] && ordre[2].num === a[2]) fav++
  nH++
  espHasard += 1 / (ordre.length * (ordre.length - 1) * (ordre.length - 2))
}

fs.mkdirSync(SORTIE, { recursive: true })
const artefact = { genere: new Date().toISOString(), corpus: tout.length, N, tests: {} }
const pct = (x, n) => (x / Math.max(1, n) * 100).toFixed(2) + '%'
for (const t of Object.keys(tables)) {
  const nom = { p12: 'P1-P2', p13: 'P1-P3', p23: 'P2-P3', trio: 'trio P1-P2-P3' }[t]
  const lignes = [...tables[t].entries()].sort((a, b) => b[1].n - a[1].n)
  console.log('')
  console.log('══ ' + nom + ' (extraction n=' + N[t] + ') : ' + lignes.length + ' configs ══')
  artefact.tests[t] = { n: N[t], configs: lignes.map(([k, e]) => ({
    config: k, n: e.n, taux: pct(e.n, N[t]),
    verifA: e.v1 || 0, verifB: e.v2 || 0, exemples: e.exemples,
  })) }
  for (const [k, e] of lignes.slice(0, 25)) {
    const nV = (e.v1 || 0) + (e.v2 || 0)
    console.log('  (' + k + ')  ext ' + e.n + ' ' + pct(e.n, N[t])
      + '  |  vérif ' + nV + ' (A:' + (e.v1 || 0) + ' B:' + (e.v2 || 0) + ')')
  }
}
console.log('')
console.log('══ VÉRIFICATION GLOBALE ══')
console.log('  favori exact (trio rangs 1-2-3) : ' + fav + '/' + nFav + ' = ' + pct(fav, nFav))
console.log('  hasard théorique exact : ' + pct(espHasard, nH))
artefact.baselines = { favori: { n: nFav, exact: fav }, hasard: { n: nH, espérance: espHasard } }
fs.writeFileSync(path.join(SORTIE, 'empreinte-reelle.json'), JSON.stringify(artefact))
console.log('')
console.log('  artefact : data/empreinte-reelle/empreinte-reelle.json')
console.log('')
