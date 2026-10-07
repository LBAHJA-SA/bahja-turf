/**
 * SÉLECTION SANS LA FORME — laquelle des variables restantes fait le tri ?
 *
 * Les quotas restent 3-2-1-1-1 (§11.2, règle fermée). La FORME est écartée :
 * elle ne sert qu'à mesurer, pas à choisir.
 *
 * Variables ajoutées par tools/mesure.mjs : cote du marché, cote d'ouverture,
 * âge. (poids et valeur ne sont pas disponibles sur les courses closes.)
 *
 *   node tools\selection2.mjs
 */
import fs from 'node:fs'
import { buildGrid, GROUPES } from '../src/lib/quinte.js'

const db = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const mes = JSON.parse(fs.readFileSync('data/mesure.json', 'utf8'))

const courses = []
for (const d of Object.keys(db).sort()) {
  if (!db[d].arrivee?.length || !mes[d]?.cotes) continue
  const r = db[d]
  const g = buildGrid(r.synthese, r.runners)
  const sc = Object.fromEntries((r.scores || []).map((x) => [x.num, x]))
  const co = Object.fromEntries(mes[d].cotes.map((x) => [x.num, x]))
  courses.push({ d, blocs: g.groupes, sc, co, arrivee: r.arrivee.slice(0, 5) })
}

const nbKo = (x) => (x?.filtres || []).filter((v) => !v).length
const cote = (x) => x.co?.cote ?? null
const age = (x) => x.co?.age ?? null

const REGLES = {
  'cote ↑ (favori du marché)': (a, b) => {
    const ca = cote(a), cb = cote(b)
    if (ca != null && cb != null && ca !== cb) return ca - cb
    return (b.s?.global ?? 0) - (a.s?.global ?? 0)
  },
  'cote ↑ puis distance ↓': (a, b) => {
    const ca = cote(a), cb = cote(b)
    if (ca != null && cb != null && ca !== cb) return ca - cb
    return (b.s?.dist ?? 0) - (a.s?.dist ?? 0)
  },
  'cote ↑ puis piste ↓': (a, b) => {
    const ca = cote(a), cb = cote(b)
    if (ca != null && cb != null && ca !== cb) return ca - cb
    return (b.s?.piste ?? 0) - (a.s?.piste ?? 0)
  },
  'cote ↑ puis corde ↓': (a, b) => {
    const ca = cote(a), cb = cote(b)
    if (ca != null && cb != null && ca !== cb) return ca - cb
    return (b.s?.corde ?? 0) - (a.s?.corde ?? 0)
  },
  'cote ↑ puis 3/3 puis global': (a, b) => {
    const ca = cote(a), cb = cote(b)
    if (ca != null && cb != null && ca !== cb) return ca - cb
    return (nbKo(a.s) - nbKo(b.s)) || ((b.s?.global ?? 0) - (a.s?.global ?? 0))
  },
  '3/3 puis cote ↑ puis global': (a, b) =>
    (nbKo(a.s) - nbKo(b.s)) || (cote(a) ?? 1e9) - (cote(b) ?? 1e9) || ((b.s?.global ?? 0) - (a.s?.global ?? 0)),
  'presse ↑ (ordre du carnet)': (a, b) => a.rang - b.rang,
  'global ↓': (a, b) => (b.s?.global ?? 0) - (a.s?.global ?? 0),
  'distance ↓': (a, b) => (b.s?.dist ?? 0) - (a.s?.dist ?? 0),
  'piste ↓': (a, b) => (b.s?.piste ?? 0) - (a.s?.piste ?? 0),
  'corde ↓': (a, b) => (b.s?.corde ?? 0) - (a.s?.corde ?? 0),
  'niveau ↓': (a, b) => (b.s?.niveau ?? 0) - (a.s?.niveau ?? 0),
  'terrain ↓': (a, b) => (b.s?.terrain ?? 0) - (a.s?.terrain ?? 0),
  'âge ↑ (plus jeune)': (a, b) => {
    const aa = age(a), ab = age(b)
    if (aa != null && ab != null && aa !== ab) return aa - ab
    return a.rang - b.rang
  },
  'âge ↓ (plus âgé)': (a, b) => {
    const aa = age(a), ab = age(b)
    if (aa != null && ab != null && aa !== ab) return ab - aa
    return a.rang - b.rang
  },
  '— CONTRÔLE — cote ↓ (outsider)': (a, b) => {
    const ca = cote(a), cb = cote(b)
    if (ca != null && cb != null && ca !== cb) return cb - ca
    return a.rang - b.rang
  },
  '— CONTRÔLE — global ↑': (a, b) => (a.s?.global ?? 0) - (b.s?.global ?? 0),
  '— CONTRÔLE — presse ↓': (a, b) => b.rang - a.rang,
}

const classer = (bloc, cmp, cc) => {
  const tri = bloc.cases.map((c) => ({ num: c.num, rang: c.slot, s: cc.sc[c.num], co: cc.co[c.num] })).sort(cmp)
  return Object.fromEntries(tri.map((c, i) => [c.num, i + 1]))
}
const jouer = (cc, cmp) => {
  const pris = []
  for (const g of cc.blocs) {
    const r = classer(g, cmp, cc)
    pris.push(...g.cases.filter((c) => r[c.num] <= g.quota).map((c) => c.num))
  }
  return [...new Set(pris)]
}

/* ═══ A. le marché seul : les 5 favoris ─══ */
console.log('\n' + '='.repeat(112))
console.log('  LE MARCHÉ, SEUL — les 5 favoris par cote')
console.log('='.repeat(112))
let fav5 = 0
for (const cc of courses) {
  const parCote = Object.values(cc.co).filter((c) => c.cote != null).sort((a, b) => a.cote - b.cote).slice(0, 5).map((c) => c.num)
  const p = cc.arrivee.filter((n) => parCote.includes(n)).length
  fav5 += p
  console.log(`  ${cc.d}  top5 marché : ${String(parCote.join(' ')).padEnd(22)} ${p}/5   arrivée ${cc.arrivee.join(' ')}`)
}
console.log(`\n  → le marché seul : ${fav5}/20 sur les 5 favoris`)

/* ═══ B. toutes les règles, quotas figés ═══ */
console.log('\n' + '='.repeat(112))
console.log('  RÈGLES SANS LA FORME — quotas figés ' + GROUPES.map((g) => g.quota).join('-'))
console.log('='.repeat(112))

const mes2 = []
for (const [nom, cmp] of Object.entries(REGLES)) {
  const lgn = courses.map((cc) => cc.arrivee.filter((n) => jouer(cc, cmp).includes(n)).length)
  let somme = 0, n = 0, capte = 0
  for (const cc of courses) {
    for (const g of cc.blocs) {
      const r = classer(g, cmp, cc)
      for (const c of g.cases) {
        if (!cc.arrivee.includes(c.num)) continue
        n++; somme += r[c.num]; if (r[c.num] <= g.quota) capte++
      }
    }
  }
  mes2.push({ nom, lgn, tot: lgn.reduce((a, b) => a + b, 0), cinq: lgn.filter((x) => x === 5).length, capte, n, moy: somme / n })
}
mes2.sort((a, b) => b.tot - a.tot)
console.log('\n  règle                              01  02  03  04   TOTAL  5/5   captés   rang moyen')
for (const x of mes2) {
  console.log('  ' + x.nom.padEnd(34) + x.lgn.map((n) => String(n).padStart(4)).join('')
    + String(x.tot).padStart(9) + '/20' + (x.cinq ? String(x.cinq).padStart(6) : '     —')
    + String(x.capte).padStart(9) + '/' + String(x.n) + x.moy.toFixed(2).padStart(12))
}

let hasard = 0
for (const cc of courses) {
  for (const g of cc.blocs) {
    hasard += g.cases.filter((c) => cc.arrivee.includes(c.num)).length * (Math.min(g.quota, g.cases.length) / g.cases.length)
  }
}
console.log(`\n  → plafond du hasard : ${hasard.toFixed(1)}/20`)
console.log('  → toute règle sous ce chiffre est WORSE que le hasard.\n')

/* ═══ C. la cote apporte-t-elle quelque chose APRÈS la presse ? ═══ */
const cmpPresse = REGLES['presse ↑ (ordre du carnet)']
const cmpCote = REGLES['cote ↑ (favori du marché)']
console.log('='.repeat(112))
console.log('  C. LA COTE APPORTE-T-ELLE QUELQUE CHOSE APRÈS LA PRESSE ?')
console.log('='.repeat(112) + '\n')
let memes = 0, totalBlocs = 0
for (const cc of courses) {
  for (const g of cc.blocs) {
    const rp = g.cases.map((c) => c.num).sort((a, b) => classer(g, cmpPresse, cc)[a] - classer(g, cmpPresse, cc)[b])
    const rc = g.cases.map((c) => c.num).sort((a, b) => classer(g, cmpCote, cc)[a] - classer(g, cmpCote, cc)[b])
    const q = Math.min(g.quota, g.cases.length)
    const t = [...new Set([...rp.slice(0, q), ...rc.slice(0, q)])]
    if (t.length === q) memes++
    totalBlocs++
  }
}
console.log(`  blocs où les ${GROUPES.map((g) => g.quota).join('/')} cases retenues sont IDENTIQUES :`)
console.log(`      presse = cote   : ${memes}/${totalBlocs}`)
console.log('  → quand ils diffèrent, la cote regarde ailleurs que le carnet.')

const COMBOS = {
  'presse ↑ puis cote ↑': (a, b) => a.rang - b.rang || ((cote(a) ?? 1e9) - (cote(b) ?? 1e9)),
  'cote ↑ puis presse ↑': (a, b) => ((cote(a) ?? 1e9) - (cote(b) ?? 1e9)) || (a.rang - b.rang),
  'cote ↑ (puis global, égalité de cote)': cmpCote,
  '3/3 puis cote ↑': (a, b) => (nbKo(a.s) - nbKo(b.s)) || ((cote(a) ?? 1e9) - (cote(b) ?? 1e9)),
  'cote ↑ puis 3/3': (a, b) => ((cote(a) ?? 1e9) - (cote(b) ?? 1e9)) || (nbKo(a.s) - nbKo(b.s)),
}
console.log('\n  combinaisons presse × cote')
console.log('  règle                              01  02  03  04   TOTAL  5/5   captés   rang moyen')
const cs = []
for (const [nom, cmp] of Object.entries(COMBOS)) {
  const lgn = courses.map((cc) => cc.arrivee.filter((n) => jouer(cc, cmp).includes(n)).length)
  let somme = 0, n = 0, capte = 0
  for (const cc of courses) {
    for (const g of cc.blocs) {
      const r = classer(g, cmp, cc)
      for (const c of g.cases) {
        if (!cc.arrivee.includes(c.num)) continue
        n++; somme += r[c.num]; if (r[c.num] <= g.quota) capte++
      }
    }
  }
  cs.push({ nom, lgn, tot: lgn.reduce((a, b) => a + b, 0), cinq: lgn.filter((x) => x === 5).length, capte, n, moy: somme / n })
}
cs.sort((a, b) => b.tot - a.tot || a.moy - b.moy)
for (const x of cs) {
  console.log('  ' + x.nom.padEnd(34) + x.lgn.map((n) => String(n).padStart(4)).join('')
    + String(x.tot).padStart(9) + '/20' + (x.cinq ? String(x.cinq).padStart(6) : '     —')
    + String(x.capte).padStart(9) + '/' + String(x.n) + x.moy.toFixed(2).padStart(12))
}

/* ═══ D. la cote seule, en absolu ═══ */
console.log('\n' + '='.repeat(112))
console.log('  D. LA COTE EN ABSOLU — combien d\'arrivés were favourites ?')
console.log('='.repeat(112) + '\n')
const paliers = [[0, 2.5], [2.5, 4], [4, 6], [6, 10], [10, 20], [20, 999]]
console.log('  plage de cote    partants testés   arrivés dans la plage   taux')
for (const [lo, hi] of paliers) {
  let t = 0, a = 0
  for (const cc of courses) {
    for (const c of Object.values(cc.co)) {
      if (c.cote == null || c.cote < lo || c.cote >= hi) continue
      t++; if (cc.arrivee.includes(c.num)) a++
    }
  }
  if (!t) continue
  const bar = '\u2588'.repeat(Math.round(a / t * 20))
  console.log('  ' + (lo + ' – ' + (hi < 100 ? hi : '+')).padEnd(16) + String(t).padStart(10) + String(a).padStart(22) + '   '
    + (a / t * 100).toFixed(0).padStart(3) + '%  ' + bar)
}
console.log('')