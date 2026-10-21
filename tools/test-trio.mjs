/* =============================================================================
 * tools/test-trio.mjs — LES TESTS DU TRIO (19/10/2026)
 *
 *   node tools\test-trio.mjs
 *
 * Deux étages :
 *   A. les FONCTIONS de src/lib/trio.js — l'ordre, les combinaisons, les zones ;
 *   B. la MESURE de data/trio.json — on la rejoue sur data/corpus/fusion.json
 *      et on vérifie qu'elle est identique au fichier publié.
 *
 * Aucun test n'appelle le réseau : tout est sur disque.
 * ============================================================================= */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ordreDuCarnet, zoneDe, combinaisons, jeuxDe, fusionner, positionsDe,
  construireJeu, coteDe, ordreDesCases,
} from '../src/lib/trio.js'
import { rangsMarche, buildGrid } from '../src/lib/quinte.js'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0
const echecs = []

function test(nom, fn) {
  try {
    fn()
    ok++
    console.log('  ✓ ' + nom)
  } catch (e) {
    echecs.push(nom + ' — ' + e.message)
    console.log('  ✗ ' + nom + '  → ' + e.message)
  }
}
const egal = (a, b, lib) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error((lib || '') + ' attendu ' + JSON.stringify(b) + ', obtenu ' + JSON.stringify(a))
  }
}
const proche = (a, b, tol = 0.05) => {
  if (Math.abs(Number(a) - Number(b)) > tol) throw new Error('attendu ' + b + ' ± ' + tol + ', obtenu ' + a)
}
const vrai = (x, lib) => { if (!x) throw new Error(lib || 'faux') }

/* ─────────────────────────── A. les fonctions ─────────────────────────── */

console.log('\n  A. LES FONCTIONS (src/lib/trio.js)')

test('C(n,k) : 8→56, 12→220, 14→364, 14/5→2002', () => {
  egal(combinaisons(8, 3), 56)
  egal(combinaisons(12, 3), 220)
  egal(combinaisons(14, 3), 364)
  egal(combinaisons(14, 5), 2002)
  egal(combinaisons(8, 2), 28)
})
test('C(n,k) : k > n → 0, et C(n,0) = 1', () => {
  egal(combinaisons(2, 3), 0)
  egal(combinaisons(5, 0), 1)
})
test('jeuxDe : les 4 trios de 4 chevaux, tous distincts', () => {
  const l = jeuxDe([1, 2, 3, 4], 3)
  egal(l.length, 4)
  egal(new Set(l.map((x) => x.join('-'))).size, 4)
  vrai(l.every((x) => x.length === 3))
})
test('jeuxDe : aucun doublon interne', () => {
  for (const x of jeuxDe([5, 6, 7, 8, 9], 3)) vrai(new Set(x).size === 3, 'doublon dans ' + x)
})
test('zoneDe : 1-3 → Z1, 4-8 → Z2, 9+ → Z3', () => {
  egal([1, 3].map(zoneDe), ['Z1', 'Z1'])
  egal([4, 8].map(zoneDe), ['Z2', 'Z2'])
  egal([9, 12, 20].map(zoneDe), ['Z3', 'Z3', 'Z3'])
  egal(zoneDe(null), null)
})
test('fusionner : la moyenne des deux rangs ordonne', () => {
  // 1 : 1+3=4 · 2 : 2+1=3 · 3 : 3+2=5  →  2, 1, 3
  egal(fusionner([1, 2, 3], { 1: 3, 2: 1, 3: 2 }), [2, 1, 3])
})
test('fusionner : un cheval absent de la presse compte quand même', () => {
  // 1 : 2 · 2 : 4 · 3 (hors presse) : 3+3=6
  egal(fusionner([1, 2], { 1: 1, 2: 2, 3: 3 }), [1, 2, 3])
})
test('fusionner : sans marché, l’ordre de la presse est gardé', () => {
  egal(fusionner([7, 3, 9], {}), [7, 3, 9])
})
test('fusionner : un seul cheval connu ne disparaît pas', () => {
  egal(fusionner([4], { 4: 2 }), [4])
})
test('ordreDuCarnet : les cases se lisent P1, P2, …', () => {
  const detail = [
    { id: 'G1', cases: [{ num: 8, slot: 2 }, { num: 4, slot: 1 }] },
    { id: 'G2', cases: [{ num: 1, slot: 3 }] },
  ]
  egal(ordreDuCarnet(detail), [4, 8, 1])
  egal(ordreDuCarnet(null), [])
})
test('positionsDe : rang de chaque numéro', () => {
  egal(positionsDe([9, 4, 7]), { 9: 1, 4: 2, 7: 3 })
  egal(positionsDe(null), {})
})
test('construireJeu : chevaux, combinaisons et taux mesuré', () => {
  const j = construireJeu([1, 2, 3, 4, 5], 4, 3, [{ n: 4, presse: 11.1, marche: 7.8 }])
  egal(j.n, 4)
  egal(j.chevaux, [1, 2, 3, 4])
  egal(j.combinaisons, 4)
  egal(j.liste.length, 4)
  egal(j.taux.presse, 11.1)
  egal(j.taux.marche, 7.8)
})
test('construireJeu : N plus grand que l’ordre ne plante pas', () => {
  const j = construireJeu([1, 2], 10, 3, [])
  egal(j.n, 2)
  egal(j.combinaisons, 0)
  egal(j.liste, [])
})
test('coteDe : {cote}, nombre, et rien', () => {
  egal(coteDe({ 3: { cote: 4.2 } }, 3), 4.2)
  egal(coteDe({ 3: 7 }, 3), 7)
  egal(coteDe({}, 3), null)
  egal(coteDe({ 3: 0 }, 3), null)
})
test('rangsMarche : le rang 1 est la plus petite cote', () => {
  egal(rangsMarche({ 5: { cote: 9 }, 2: { cote: 3 }, 9: { cote: 15 } }), { 2: 1, 5: 2, 9: 3 })
})

/* ──────────────────────────── B. la mesure ───────────────────────────── */

console.log('\n  B. LA MESURE PUBLIÉE (data/trio.json)')

const F = path.join(RACINE, 'data', 'trio.json')
const fusion = path.join(RACINE, 'data', 'corpus', 'fusion.json')
vrai(fs.existsSync(F), 'data/trio.json absent — lancer node tools\\trio.mjs')
const mesure = JSON.parse(fs.readFileSync(F, 'utf8'))
const corpus = JSON.parse(fs.readFileSync(fusion, 'utf8')).courses

/* ⚠ même règle que tools/trio.mjs : la PRESSE vient de data/quintes.json
   (fusion.json reconstitue un ordre qui ne reproduit pas les cases réelles). */
const PRESSE_REELLE = new Map()
try {
  const qs = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'quintes.json'), 'utf8'))
  for (const q of qs) {
    const presse = (q.presse || []).filter((n) => Number.isFinite(n))
    if (presse.length >= 8 && (q.arrivee || []).length) PRESSE_REELLE.set(q.date + '|' + q.code, presse)
  }
} catch { /* pas d'archive → repli sur fusion */ }

const base = corpus
  .map((c) => {
    const cotes = c.cotes && Object.keys(c.cotes).length ? c.cotes : null
    const rangs = cotes ? rangsMarche(cotes)
      : Object.fromEntries((c.ordreCote || []).map((n, i) => [n, i + 1]))
    const ordreM = Object.keys(rangs).map(Number).sort((a, b) => rangs[a] - rangs[b] || a - b)
    const code = String(c.cle || '').split('_').pop()
    const reelle = PRESSE_REELLE.get(c.date + '|' + code) || null
    const ordreP = (reelle || (c.presseDispo ? (c.ordrePresse?.length ? c.ordrePresse : c.presse) : []))
      .filter((n) => Number.isFinite(n))
      .filter((n) => !reelle || rangs[n] != null)
    return { arrivee: c.arrivee || [], rangs, ordreM, ordreP, presseReelle: !!reelle }
  })
  .filter((c) => c.arrivee.length >= 5 && c.ordreM.length >= 8)

test('le corpus rejoué fait le même nombre de courses', () => {
  egal(base.length, mesure.mesure.courses)
})
test('le 2e hors du top 8 : même chiffre que le fichier', () => {
  const n = base.filter((c) => (c.rangs[c.arrivee[1]] ?? 99) > 8).length
  proche((100 * n) / base.length, mesure.derniers.secondHors8, 0.06)
})
test('le 3e hors du top 8 : même chiffre que le fichier', () => {
  const n = base.filter((c) => (c.rangs[c.arrivee[2]] ?? 99) > 8).length
  proche((100 * n) / base.length, mesure.derniers.troisiemeHors8, 0.06)
})
test('un des trois hors du top 8 (le fait central)', () => {
  const n = base.filter((c) => c.arrivee.slice(0, 3).some((x) => (c.rangs[x] ?? 99) >= 9)).length
  proche((100 * n) / base.length, mesure.derniers.unDesTrois, 0.06)
})
test('le Trio « 3 plus petites cotes » est bien rare (< 6 %)', () => {
  const n = base.filter((c) => c.arrivee.slice(0, 3).every((x) => (c.rangs[x] ?? 99) <= 3)).length
  proche((100 * n) / base.length, mesure.bassmatTrio.find((x) => x.compo === '3·0·0').pct, 0.06)
  vrai((100 * n) / base.length < 6, 'le Trio 3·0·0 ne devrait pas dépasser 6 %')
})
test('la bassmat du Trio couvre 100 % des courses', () => {
  const s = mesure.bassmatTrio.reduce((a, x) => a + x.n, 0)
  egal(s, mesure.mesure.courses)
})
test('l’ancre G3 : un cheval des rangs 9-10 dans le top 5', () => {
  const n = base.filter((c) => c.arrivee.slice(0, 5).some((x) => {
    const r = c.rangs[x] ?? 99
    return r >= 9 && r <= 10
  })).length
  proche((100 * n) / base.length, mesure.ancre.g3Top5, 0.06)
})
test('le Trio sur 10 chevaux de la presse : taux du fichier', () => {
  const presse = base.filter((c) => c.presseReelle && c.ordreP.length >= 8)
  const n = presse.filter((c) => {
    const s = new Set(c.ordreP.slice(0, 10))
    return c.arrivee.slice(0, 3).every((x) => s.has(x))
  }).length
  proche((100 * n) / presse.length, mesure.courbes.trio.find((x) => x.n === 10).presse, 0.06)
})
test('les courbes du Trio montent avec N (presse et marché)', () => {
  const t = mesure.courbes.trio
  for (let i = 1; i < t.length; i++) {
    vrai(t[i].presse >= t[i - 1].presse - 0.001, 'presse baisse à N=' + t[i].n)
    vrai(t[i].marche >= t[i - 1].marche - 0.001, 'marché baisse à N=' + t[i].n)
  }
})
test('les combinaisons suivent C(N,3)', () => {
  for (const x of mesure.courbes.trio) egal(x.combinaisons, combinaisons(x.n, 3))
  for (const x of mesure.courbes.couple) egal(x.combinaisons, combinaisons(x.n, 2))
})
test('la presse bat le marché sur le Trio à N=10 (à jeu égal, mêmes courses)', () => {
  const x = mesure.courbes.trio.find((y) => y.n === 10)
  vrai(x.presse > x.marchePresse, 'presse ' + x.presse + ' vs marché ' + x.marchePresse)
})
test('l’archive de la presse fait bien 96 courses (data/quintes.json)', () => {
  const presse = base.filter((c) => c.presseReelle && c.ordreP.length >= 8)
  egal(presse.length, mesure.mesure.coursesPresse)
})
test('« G3∪G4∪G5 » couvre une partie des trios, pas tous', () => {
  const B = mesure.blocsTrio
  vrai(B && B.n === mesure.mesure.coursesPresse, 'blocsTrio absent ou sur un autre échantillon')
  const u = (nom) => B.unions.find((x) => x.nom === nom).pct
  vrai(u('G3∪G4∪G5') > 50 && u('G3∪G4∪G5') < 80, 'G3∪G4∪G5 = ' + u('G3∪G4∪G5'))
  vrai(u('G1∪G2') > 95, 'G1∪G2 = ' + u('G1∪G2'))
})
test('le Trio en euros : le ROI est négatif à tous les N (aucune martingale)', () => {
  const E = mesure.euros
  vrai(E && E.n >= 80, 'euros absent')
  for (const l of E.presse) vrai(l.roi < 0, 'ROI positif à N=' + l.n)
  vrai(E.presse.find((l) => l.n === 4).combinaisons === 4, 'C(4,3) = 4')
})

/* ── l'ordre du carnet : la mesure et la PAGE doivent lire le même ──────── */
test('ordreDesCases reproduit les CASES du vrai buildGrid (chaque synthèse)', () => {
  const fichier = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'synthese.json'), 'utf8'))
  let n = 0
  for (const rec of Object.values(fichier)) {
    const syn = (rec?.synthese || []).filter((x) => Number.isFinite(x) && x > 0)
    const runners = (rec?.runners || []).filter((x) => Number.isFinite(x) && x > 0)
    if (syn.length < 6) continue
    const g = buildGrid(syn, runners)
    const ordreP = Object.keys(g.numAtPlace).map(Number).sort((a, b) => a - b).map((k) => g.numAtPlace[k])
    egal(ordreDuCarnet(g.groupes), ordreDesCases(ordreP), 'sur ' + rec.date + ' : ')
    n++
  }
  vrai(n >= 5, 'trop peu de synthèses testées (' + n + ')')
})
test('ordreDesCases : c’est une permutation de l’entrée, rien ne se perd', () => {
  const entree = [2, 1, 4, 10, 3, 13, 14, 5, 9, 8, 12, 11, 15, 6, 16, 7]
  const sortie = ordreDesCases(entree)
  egal(sortie.length, entree.length)
  egal(sortie.slice().sort((a, b) => a - b), entree.slice().sort((a, b) => a - b))
})
test('ordreDesCases : le cas de référence (P1 = 2, pair)', () => {
  egal(ordreDesCases([2, 1, 4, 10, 3, 13, 14, 5, 9, 8]), [2, 1, 4, 3, 10, 13, 14, 5, 8, 9])
})

/* ───────────────────────────── le bilan ──────────────────────────────── */

console.log('\n  ' + ok + ' test(s) passé(s) · ' + echecs.length + ' échec(s)')
if (echecs.length) {
  for (const e of echecs) console.log('    ✗ ' + e)
  process.exit(1)
}
console.log('')
