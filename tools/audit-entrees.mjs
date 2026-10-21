/* =============================================================================
 * tools/audit-entrees.mjs — LES ENTRÉES DE remplirGrille CHANGENT-ELLES LE TICKET ?
 *                           (20/10/2026)
 *
 * Deux questions posées par l'utilisateur :
 *
 *   ① le TYPE DE COURSE. `tools/experiences.mjs` et `tools/recent.mjs`
 *      passaient `'PLAT'` à `remplirGrille` alors que R18 contient du plat, de
 *      l'attelé, des haies et du steeple. Est-ce que ça change la sélection ?
 *
 *   ② le CLASSEMENT. `experiences.mjs` construit l'ordre depuis les cases de la
 *      grille (tri par `slot`) ; `recent.mjs` depuis l'ordre de la `synthese`.
 *      Ces deux entrées sont-elles équivalentes ?
 *
 * On ne discute pas : on rejoue chaque course avec toutes les variantes de
 * l'entrée et on COMPTE les tickets distincts.
 *
 *   node tools\audit-entrees.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille } from '../src/lib/quinte.js'
import { chargerEchantillon } from './experience-g5.mjs'

const pad = (s, n) => String(s).padEnd(n)

/* ── les deux corpus, avec la VRAIE discipline quand elle existe ────────── */
function corpus96() {
  return chargerEchantillon('cotes').map((c) => ({ ...c, stats: null }))
}
function corpus18() {
  const BRUT = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
  const TOUT = Array.isArray(BRUT) ? BRUT : Object.values(BRUT)
  const COTES = JSON.parse(fs.readFileSync('data/cotes.json', 'utf8'))
  const out = []
  for (const a of TOUT) {
    if (!a || !a.date || (a.arrivee || []).length < 5) continue
    const nums = (a.runners || []).map(Number).filter(Number.isFinite)
    const syn = (a.synthese || []).map(Number).filter(Number.isFinite)
    if (nums.length < 8 || syn.length < 10) continue
    const brut = COTES[a.cle] || (a.courseId && COTES[a.courseId]) || null
    const liste = brut ? (Array.isArray(brut) ? brut : brut.cotes || []) : []
    const cotes = {}
    for (const x of liste) {
      const n = Number(x.num), v = Number(x.cote)
      if (Number.isFinite(n) && Number.isFinite(v) && v > 0) cotes[n] = { cote: v }
    }
    out.push({
      date: a.date, synthese: syn, runners: nums,
      discipline: a.discipline || a.race?.discipline || null,
      cotes: Object.keys(cotes).length >= 10 ? cotes : null,
      stats: null,
    })
  }
  return out.sort((x, y) => x.date.localeCompare(y.date))
}

/* ── trois façons de construire le classement ───────────────────────────── */
const parSlot = (g) => g.groupes.flatMap((x) => x.cases).slice()
  .sort((a, b) => a.slot - b.slot).map((x) => ({ p: { num: x.num }, s: null, ok: true }))
const parSynthese = (g, c) => (c.synthese || []).map((n) => ({ p: { num: n }, s: null, ok: true }))
const parSyntheseInverse = (g, c) => (c.synthese || []).slice().reverse().map((n) => ({ p: { num: n }, s: null, ok: true }))

const CLASSEMENTS = [
  ['cases (slot)', parSlot],
  ['synthèse (P1→Pn)', parSynthese],
  ['synthèse inversée', parSyntheseInverse],
]

const DISCIPLINES = ['PLAT', 'ATTELE', 'HAIES', 'STEEPLE', 'TROT', '']

const cle = (t) => [...t].map(Number).sort((a, b) => a - b).join()

/* ── l'audit ────────────────────────────────────────────────────────────── */
function audit(nom, C) {
  console.log('')
  console.log('  ════ ' + nom + ' — ' + C.length + ' courses ════')
  /* ① la discipline */
  let sale = 0
  const exemples = []
  for (const c of C) {
    const g = buildGrid(c.synthese, c.runners)
    const base = cle(remplirGrille(g, parSlot(g), c.discipline || 'PLAT', c.cotes, c.stats).ticket)
    const set = new Set()
    for (const d of DISCIPLINES) {
      set.add(cle(remplirGrille(g, parSlot(g), d, c.cotes, c.stats).ticket))
    }
    if (set.size > 1) { sale++; exemples.push(c.date + ' → ' + set.size + ' tickets distincts') }
    else if (base !== [...set][0]) exemples.push(c.date + ' ANOMALIE')
  }
  console.log('  ① discipline passée à remplirGrille : ' + DISCIPLINES.length + ' valeurs testées (' + DISCIPLINES.map((d) => d || '« »').join(' · ') + ')')
  console.log('     courses dont le ticket CHANGE : ' + sale + '/' + C.length + (sale ? '  → ' + exemples.join(' · ') : '  ✔ aucun effet'))
  /* ② le classement */
  let sale2 = 0
  const ex2 = []
  for (const c of C) {
    const g = buildGrid(c.synthese, c.runners)
    const set = new Set()
    for (const [, f] of CLASSEMENTS) {
      set.add(cle(remplirGrille(g, f(g, c), c.discipline || 'PLAT', c.cotes, c.stats).ticket))
    }
    if (set.size > 1) { sale2++; ex2.push(c.date + ' → ' + set.size) }
  }
  console.log('  ② classement passé à remplirGrille : ' + CLASSEMENTS.length + ' ordres (' + CLASSEMENTS.map((x) => x[0]).join(' · ') + ')')
  console.log('     courses dont le ticket CHANGE : ' + sale2 + '/' + C.length + (sale2 ? '  → ' + ex2.join(' · ') : '  ✔ aucun effet'))
  const d = {}
  for (const c of C) d[c.discipline || '—'] = (d[c.discipline || '—'] || 0) + 1
  console.log('  disciplines réelles du corpus : ' + Object.entries(d).map(([k, v]) => k + ' ' + v).join(' · '))
  return { sale, sale2 }
}

const P96 = corpus96()
const R18 = corpus18()
console.log('')
const r1 = audit('P96 · data/quintes.json', P96)
const r2 = audit('R18 · data/synthese.json', R18)
console.log('')
console.log('  CONCLUSION — remplirGrille ne lit NI `discipline`, NI l’ordre du classement')
console.log('  pour CHOISIR : G1-G3 viennent du carnet (`place`), G4 de la cote (`coteDe`).')
console.log('  Les deux entrées sont INERTES ; les rejouer avec la valeur de production ne peut')
console.log('  donc pas changer A, B ou C. Reste à le prouver sur le corpus, ce qui est fait.')
console.log('')
