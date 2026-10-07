/**
 * LA SURPRISE — un moteur par bloc : q-1 forts + 1 surprise
 *
 * Idée : au lieu de prendre les q meilleurs d'un bloc (des chevaux corrélés,
 * tout ou rien), on prend les (q-1) meilleurs + LE CHEVAL QUE L'ANALYSE
 * ÉLIMINE. C'est la « case surprise » : le pari couvre l'imprévu.
 *
 *   G1  quota 3  →  2 forts + 1 surprise (celui du rang 4, celui qu'on écarte)
 *   G2  quota 2  →  1 fort   + 1 surprise (rang 3)
 *   G3  quota 1  →  le fort  (ou surprise pure, variante)
 *   G4  quota 1  →  le fort  (ou surprise pure, variante)
 *   G5  quota 1  →  le fort  (ou surprise pure, variante)
 *
 * Les QUOTAS ne bougent pas (§11.2). C'est le CHOIX à l'intérieur qui change.
 *
 *   node tools\surprise.mjs
 */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const mes = JSON.parse(fs.readFileSync('data/mesure.json', 'utf8'))
const pmu = fs.existsSync('data/pmu.json') ? JSON.parse(fs.readFileSync('data/pmu.json', 'utf8')) : {}
const eq = fs.existsSync('data/cotes.json') ? JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) : {}

/** la course PMU dont la liste de partants correspond a celle de la Synthese */
function pmuDe(d, nums) {
  for (const q of pmu[d]?.quintes || []) {
    if (q.partants.length === nums.length && q.partants.every((p) => nums.includes(p.num))) {
      return Object.fromEntries(q.cotes.map((c) => [c.num, c]))
    }
  }
  return {}
}

const courses = []
for (const d of Object.keys(db).sort()) {
  if (!db[d].arrivee?.length || !mes[d]?.cotes) continue
  const r = db[d]
  const ordrePresse = new Map()
  buildGrid(r.synthese, r.runners).groupes.forEach((g) => g.cases.forEach((c) => ordrePresse.set(c.num, ordrePresse.size)))
  courses.push({
    d,
    blocs: buildGrid(r.synthese, r.runners).groupes,
    sc: Object.fromEntries((r.scores || []).map((x) => [x.num, x])),
    co: Object.fromEntries(mes[d].cotes.map((x) => [x.num, x])),
    pm: pmuDe(d, r.runners.map((x) => x.num)),
    eq: Object.fromEntries((eq[r.courseId]?.cotes || []).map((x) => [x.num, x])),
    slot: ordrePresse,
    arrivee: r.arrivee.slice(0, 5),
  })
}
const nbKo = (x) => (x?.filtres || []).filter((v) => !v).length

/* override des quotas :  node tools\surprise.mjs 3,3,1,1,0 */
const OVERRIDE = process.argv[2]
if (OVERRIDE) {
  const q = OVERRIDE.split(',').map(Number)
  if (q.length !== 5 || q.some((x) => Number.isNaN(x))) {
    console.error('  quotas invalides : attends 5 nombres, ex. 3,3,1,1,0'); process.exit(1)
  }
  for (const cc of courses) cc.blocs.forEach((g, i) => { g.quota = Math.min(q[i], g.cases.length) })
  const detail = courses.map((cc) => cc.blocs.map((g) => g.quota + '/' + g.cases.length).join(' '))[0]
  console.log('\n  ⚠ QUOTAS FORCÉS : ' + q.join('-') + '   (' + detail + ')')
}
const QUOTAS = courses[0].blocs.map((g) => g.quota)
const NB = QUOTAS.reduce((a, b) => a + b, 0)

/* ═══ les règles de « force » — par quel critère on prend les q-1 premiers ═══ */
const FORTS = {
  'presse ↑': (a, b) => a.rang - b.rang,
  'cote ↑': (a, b) => (a.co?.cote ?? 1e9) - (b.co?.cote ?? 1e9),
  'Equidia ↑': (a, b) => (a.eq?.cote ?? 1e9) - (b.eq?.cote ?? 1e9),
  'Equidia ouverture ↑': (a, b) => (a.eq?.ouverture ?? 1e9) - (b.eq?.ouverture ?? 1e9),
  'cote ouverture ↑': (a, b) => (a.co?.ouverture ?? 1e9) - (b.co?.ouverture ?? 1e9),
  'Equidia ↑ puis presse ↑': (a, b) => (a.eq?.cote ?? 1e9) - (b.eq?.cote ?? 1e9) || (a.rang - b.rang),
  'cote ↑ puis Equidia ↑': (a, b) => (a.co?.cote ?? 1e9) - (b.co?.cote ?? 1e9) || (a.eq?.cote ?? 1e9) - (b.eq?.cote ?? 1e9),
  'Equidia ↑ puis cote ↑': (a, b) => (a.eq?.cote ?? 1e9) - (b.eq?.cote ?? 1e9) || (a.co?.cote ?? 1e9) - (b.co?.cote ?? 1e9),
  'PMU ↑': (a, b) => (a.pm?.cote ?? 1e9) - (b.pm?.cote ?? 1e9),
  'PMU ↑ puis presse ↑': (a, b) => (a.pm?.cote ?? 1e9) - (b.pm?.cote ?? 1e9) || (a.rang - b.rang),
  'forme ↓': (a, b) => (b.s?.forme ?? 0) - (a.s?.forme ?? 0),
  'global ↓': (a, b) => (b.s?.global ?? 0) - (a.s?.global ?? 0),
  'nb 3/3 puis cote ↑': (a, b) => (nbKo(a.s) - nbKo(b.s)) || ((a.co?.cote ?? 1e9) - (b.co?.cote ?? 1e9)),
}

/* ═══ les règles de « surprise » — qui on met dans la case imprévue ═══ */
const SURPRISES = {
  'rang q+1 (le 1er écarté)': null,                        // filled per block
  'le dernier du bloc': null,
  'le plus mal noté 3/3': (a, b) => nbKo(a.s) - nbKo(b.s),   // worst = most KO
  'le outsider de la presse': (a, b) => b.rang - a.rang,
  "l'outsider du marché": (a, b) => (b.co?.cote ?? 0) - (a.co?.cote ?? 0),
  "l'outsider Equidia": (a, b) => (b.eq?.cote ?? 0) - (a.eq?.cote ?? 0),
}

/** un bloc : renvoie num→rang selon cmp */
const classer = (bloc, cmp, cc) => {
  const tri = bloc.cases
    .map((c) => ({ num: c.num, rang: cc.slot.get(c.num), s: cc.sc[c.num], co: cc.co[c.num], pm: cc.pm[c.num], eq: cc.eq[c.num] }))
    .sort(cmp)
  return tri
}

/**
 * @param mode  'q'      → les q premiers (comportement actuel)
 *               'q-1+1'  → (q-1) forts + 1 surprise (rang q+1)
 *               'q-1+1fin'→ (q-1) forts + le dernier du bloc
 *               'q-1+sK' → (q-1) forts + le plus mal noté 3/3 parmi les écartés
 *               'q-1+sP' → (q-1) forts + l'outsider de la presse
 *               'q-1+sM' → (q-1) forts + l'outsider du marché
 *               'surprise'→ le worst du bloc, quel que soit le quota
 */
function jouer(cc, cmpFort, mode, surprisesPur = false) {
  const pris = []
  for (const g of cc.blocs) {
    const tri = classer(g, cmpFort, cc)
    const q = Math.min(g.quota, tri.length)
    // après (q-1) forts, les écartés sont les rangs q..fin — ou q-1..fin
    // selon qu'on compte le qᵉ comme « encore disponible » ou non
    const larges = /[b]$/.test(mode)
    const ecartes = tri.slice(larges ? q - 1 : q)
    if (mode === 'q' || surprisesPur || q < 2) {
      pris.push(...tri.slice(0, q).map((c) => c.num))
      continue
    }
    pris.push(...tri.slice(0, q - 1).map((c) => c.num))
    if (!ecartes.length) { pris.push(tri[tri.length - 1].num); continue }
    let s
    if (mode === 'q-1+1' || mode === 'q-1+1b') s = ecartes[0]
    else if (mode === 'q-1+1fin') s = tri[tri.length - 1]
    else if (mode === 'q-1+sK' || mode === 'q-1+sKb') s = ecartes.slice().sort((a, b) => nbKo(b.s) - nbKo(a.s))[0]
    else if (mode === 'q-1+sP' || mode === 'q-1+sPb') s = ecartes.slice().sort((a, b) => b.rang - a.rang)[0]
    else if (mode === 'q-1+sM' || mode === 'q-1+sMb') s = ecartes.slice().sort((a, b) => (b.co?.cote ?? 0) - (a.co?.cote ?? 0))[0]
    else if (mode === 'q-1+sE' || mode === 'q-1+sEb') s = ecartes.slice().sort((a, b) => (b.eq?.cote ?? 0) - (a.eq?.cote ?? 0))[0]
    if (s) pris.push(s.num)
  }
  return [...new Set(pris)]
}

const MODES = [
  ['q', 'q premiers — l\'actuel'],
  ['q-1+1', '(q-1) forts + le 1er écarté'],
  ['q-1+1b', '(q-1) forts + 1er écarté [large]'],
  ['q-1+1fin', '(q-1) forts + le dernier du bloc'],
  ['q-1+sK', '(q-1) forts + le plus mal 3/3'],
  ['q-1+sP', '(q-1) forts + l\'outsider presse'],
  ['q-1+sPb', '(q-1) forts + outsider presse [large]'],
  ['q-1+sM', '(q-1) forts + l\'outsider marché'],
  ['q-1+sMb', '(q-1) forts + outsider marché [large]'],
  ['q-1+sE', '(q-1) forts + l\'outsider Equidia'],
  ['q-1+sEb', '(q-1) forts + outsider Equidia [large]'],
]

/* ═══ A. toutes les combinaisons ═══ */
console.log('\n' + '='.repeat(122))
console.log('  A. LA SURPRISE — un moteur par bloc : (q-1) forts + 1 case imprévue')
console.log('     quotas figés 3-2-1-1-1 · 4 Quintés clôturés')
console.log('='.repeat(122) + '\n')
console.log('  forts              surprise                        01  02  03  04   TOTAL  5/5   captés')
const lignes = []
for (const [nomF, cmpF] of Object.entries(FORTS)) {
  for (const [mode, label] of MODES) {
    const lgn = courses.map((cc) => cc.arrivee.filter((n) => jouer(cc, cmpF, mode).includes(n)).length)
    let capte = 0, n = 0
    for (const cc of courses) {
      const t = jouer(cc, cmpF, mode)
      capte += cc.arrivee.filter((x) => t.includes(x)).length; n += cc.arrivee.length
    }
    lignes.push({ nomF, mode, label, lgn, tot: lgn.reduce((a, b) => a + b, 0), cinq: lgn.filter((x) => x === 5).length, capte, n })
  }
  // variante : G3/G4/G5 aussi en surprise pure
  const lgn = courses.map((cc) => cc.arrivee.filter((n) => jouer(cc, cmpF, 'q', true).includes(n)).length)
  let capte = 0
  for (const cc of courses) capte += cc.arrivee.filter((x) => jouer(cc, cmpF, 'q', true).includes(x)).length
  lignes.push({ nomF, mode: 'q!', label: 'G1-G2 surprise, G3-G4-G5 au pire', lgn, tot: lgn.reduce((a, b) => a + b, 0), cinq: lgn.filter((x) => x === 5).length, capte, n: 20 })
}
lignes.sort((a, b) => b.tot - a.tot)
for (const x of lignes) {
  console.log('  ' + x.nomF.padEnd(18) + x.label.padEnd(32) + x.lgn.map((v) => String(v).padStart(4)).join('')
    + String(x.tot).padStart(9) + '/20' + (x.cinq ? String(x.cinq).padStart(7) : '      —')
    + String(x.capte).padStart(9) + '/' + x.n)
}

/* ═══ B. le détail des meilleures ═══ */
console.log('\n' + '='.repeat(122))
console.log('  B. DÉTAIL — le ticket réel, course par course')
console.log('='.repeat(122) + '\n')
for (const x of lignes.slice(0, 5)) {
  const cmpF = FORTS[x.nomF]
  const mode = x.mode === 'q!' ? 'q' : x.mode
  console.log('  ▸ ' + x.nomF + '  +  ' + x.label + '   = ' + x.tot + '/20')
  for (const cc of courses) {
    const t = jouer(cc, cmpF, mode, mode === 'q')
    const p = cc.arrivee.filter((n) => t.includes(n)).length
    const manque = cc.arrivee.filter((n) => !t.includes(n))
    console.log('    ' + cc.d + '  ' + p + '/5   ticket ' + String(t.join(' ')).padEnd(24)
      + ' arrivée ' + String(cc.arrivee.join(' ')).padEnd(18)
      + (manque.length ? '  perdu : ' + manque.join(' ') : '  5/5'))
  }
  console.log('')
}

/* ═══ C. la distribution du hasard — combien de scénarios « gagnent » par pur hasard ═══ */
console.log('='.repeat(122))
console.log('  C. LE HASARD — si on mélange l\'ordre dans chaque bloc, combien de scores sont possibles ?')
console.log('='.repeat(122) + '\n')
const N = 20000
const totaux = []
for (let t = 0; t < N; t++) {
  let tot = 0
  for (const cc of courses) {
    const pris = []
    for (const g of cc.blocs) {
      const melange = g.cases.map((c) => ({ num: c.num }))
      for (let i = melange.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[melange[i], melange[j]] = [melange[j], melange[i]] }
      pris.push(...melange.slice(0, Math.min(g.quota, melange.length)).map((c) => c.num))
    }
    const s = new Set(pris)
    tot += cc.arrivee.filter((n) => s.has(n)).length
  }
  totaux.push(tot)
}
totaux.sort((a, b) => a - b)
const pct = (p) => totaux[(N * p) | 0]
const moy = totaux.reduce((a, b) => a + b, 0) / N
console.log('  ' + N.toLocaleString('fr-FR') + ' mélanges aléatoires des cases, quotas 3-2-1-1-1 :')
console.log('  moyenne ' + moy.toFixed(2) + '/20   ·   min ' + totaux[0] + '   ·   max ' + totaux[N - 1])
console.log('  P50 ' + pct(0.5) + '   P90 ' + pct(0.9) + '   P95 ' + pct(0.95) + '   P99 ' + pct(0.99) + '   P100 ' + pct(0.999))
console.log('\n  → ' + lignes.filter((x) => x.tot >= pct(0.95)).length + ' scénarios sur ' + lignes.length + ' atteignent le P95 du hasard.')
console.log('  → au-delà du P99, on peut parler de signal. En dessous, c\'est du bruit.')

/* ═══ D. LAISSER-UN-QUINTÉ-DE-CÔTÉ — la robustesse ═══ */
console.log('\n' + '='.repeat(122))
console.log('  D. ROBUSTESSE — on retire un Quinté, on recalcule sur les 3 autres. Ça tient ?')
console.log('='.repeat(122) + '\n')
const CLES = [
  ['Equidia ↑', 'q-1+sP', "Equidia FINAL + 1 presse"],
  ['Equidia ↑', 'q-1+sPb', "Equidia FINAL + 1 presse [large]"],
  ['Equidia ouverture ↑', 'q-1+sP', "Equidia OUVERTURE + 1 presse"],
  ['Equidia ouverture ↑', 'q-1+sPb', "Equidia OUVERTURE + 1 presse [large]"],
  ['cote ↑', 'q-1+sP', "casa FINAL + 1 presse"],
  ['cote ↑', 'q-1+sPb', "casa FINAL + 1 presse [large]"],
  ['cote ouverture ↑', 'q-1+sP', "casa OUVERTURE + 1 presse"],
  ['Equidia ↑', 'q', 'Equidia ↑ SANS surprise'],
  ['cote ↑', 'q-1+1', 'casa FINAL + le 1er écarté'],
  ['presse ↑', 'q', 'presse ↑  (le carnet, référence)'],
  ['global ↓', 'q', 'global ↓  (le moteur actuel)'],
]
const LBL = Object.fromEntries(MODES.map(([m, l]) => [m, l]))
function totalSur(sous, f, l) {
  return sous.reduce((acc, cc) => acc + cc.arrivee.filter((n) => jouer(cc, FORTS[f], l).includes(n)).length, 0)
}
console.log('  scénario                                4 courses   sans 01   sans 02   sans 03   sans 04   pire')
for (const [f, l, nom] of CLES) {
  const complet = totalSur(courses, f, l)
  const part = courses.map((c) => totalSur(courses.filter((z) => z.d !== c.d), f, l))
  console.log('  ' + nom.padEnd(36) + String(complet).padStart(8) + '/20'
    + part.map((p) => String(p).padStart(10) + '/15').join('')
    + String(Math.min(...part)).padStart(9) + '/15')
}
console.log('\n  → « sans 0X » = les 3 courses restantes. 15/15 = parfait, 11/15 = sous le hasard (11.25).')
console.log('  → un scénario qui s\'effondre dans une colonne ne tient que grâce à UNE course.')

/* ═══ E. À QUI RESSEMBLE LA CASE SURPRISE ? ═══ */
console.log('\n' + '='.repeat(122))
console.log('  E. LE TICKET RÉEL — la case surprise, son cote, son rang de presse')
console.log('='.repeat(122) + '\n')
const cmpStar = FORTS['Equidia ↑']
for (const cc of courses) {
  console.log('  ' + cc.d + '   arrivée : ' + cc.arrivee.join(' ') + '      (la case surprise est notée ★)')
  for (const g of cc.blocs) {
    const tri = classer(g, cmpStar, cc)
    const q = Math.min(g.quota, tri.length)
    if (q < 2) {
      const best = tri[0]
      console.log(`    ${g.id}  quota ${g.quota}/${g.cases.length}   (bloc simple : pas de case surprise possible)  → n°${best.num}  cote ${best.eq?.cote ?? '—'}`)
      continue
    }
    const ecartes = tri.slice(q)
    const s = ecartes.slice().sort((a, b) => b.rang - a.rang)[0]
    const forts = tri.slice(0, q - 1).map((c) => c.num)
    const cotes = g.cases.map((c) => cc.eq[c.num]?.cote ?? '—').sort((a, b) => (a - b))
    console.log(`    ${g.id}  quota ${g.quota}/${g.cases.length}   ${q - 1} fort(s) ${String(forts.join(' ')).padEnd(14)}`
      + ` + SURPRISE n°${String(s.num).padStart(2)}  cote ${String(s.eq?.cote ?? '—').padStart(6)}  presse P${s.rang + 1}`
      + `   ${cc.arrivee.includes(s.num) ? (cc.arrivee[0] === s.num ? '★ VICTOIRE !' : '★ arrivé ' + (cc.arrivee.indexOf(s.num) + 1) + 'e') : 'non arrivé'}`
      + `   | cotes du bloc ${cotes.join(' ')}`)
  }
}
