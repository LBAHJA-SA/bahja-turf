/* =============================================================================
 * tools/bassmat-choix.mjs — LA BASSMAT PEUT-ELLE CHOISIR ? (29/10/2026)
 *
 * La question de l'utilisateur, en deux lignes :
 *   « ❌ la bassmat ne change pas le ticket et ne choisit pas un cheval à la
 *     place d'un autre — comment on répare ça ? »
 *
 * Ce fichier ne cherche PAS une nouvelle règle de marché, ni un quota : il teste
 * la seule chose que la bassmat sait et que `carnet` ne sait pas —
 * **le taux d'une CASE dépend de la FORME DU MARCHÉ** (§11.35 : le 4ᵉ de G2
 * donne 22,7 % dans un marché fermé, 29,7 % dans un marché normal).
 *
 * Donc : dans chaque bloc, au lieu de prendre les cases par leur place de presse
 * (P1, P2, …), on les prend par **leur taux top-5 POUR LA FORME DU JOUR**.
 * C'est la bassmat qui remplit, pas un rang de quota et pas la cote.
 *
 * ⚠ HONNÊTETÉ DE LA MESURE — deux garde-fous :
 *   ① les taux sont calculés en LOO (on retire la course qu'on note) ;
 *   ② la forme d'une case n'est utilisée que si n ≥ 15 courses dans ce seau,
 *      sinon on retombe sur le taux global (jamais un taux sur 5 courses).
 *
 * Métriques DENSES (jamais le cheval isolé) : podium entier, quinté entier,
 * ≥4 quinté, puis moitiés, quartiles chronologiques et bootstrap apparié.
 *
 *   node tools\bassmat-choix.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, formeMarche } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const r1 = (x) => Math.round(10 * x) / 10
const FORME_CLES = ['ferme', 'normal', 'ouvert']
const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']
const QUOTAS = [3, 2, 1, 1, 1]

/* ─────────────────────────────── le corpus ─────────────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const C = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  const cotesObj = Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }]))
  const forme = formeMarche(cotesObj)
  if (!forme) continue
  const grille = buildGrid(syn, nums)
  /* la case (P) de chaque cheval, et son numéro */
  const caseDe = {}
  for (const g of grille.groupes) for (const c of g.cases) caseDe[c.num] = c.place
  C.push({
    date: q.date,
    grille,
    forme: forme.cle,
    cotes: cotesObj,
    arrivee: q.arrivee.slice(0, 5),
    caseDe,
    /* le rang de marché de chaque numéro (pour le scénario « marché ») */
    rm: Object.fromEntries(
      nums.slice().sort((a, b) => cotes[a] - cotes[b] || a - b).map((n, k) => [n, k + 1]),
    ),
  })
}
console.log('\n  corpus : ' + C.length + ' Quintés à presse réelle · formes ' +
  FORME_CLES.map((f) => f + ' ' + C.filter((c) => c.forme === f).length).join(' · '))

/* ─────────────── les taux de case, en LOO, global et par forme ──────────── */
/* cumul[c] = nb de fois où la case P est dans le top-5 ; n[c] = nb de courses
 * où la case existe. On calcule le cumul TOTAL, puis on retire la course. */
const cumul = {}          // cumul['global'] / cumul['ferme'] … → { P: k }
const compte = {}         // compte['global'] … → { P: n }
for (const cle of ['global', ...FORME_CLES]) { cumul[cle] = {}; compte[cle] = {} }
for (const c of C) {
  const dansTop5 = new Set(c.arrivee.slice(0, 5).map((n) => c.caseDe[n]).filter((p) => p != null))
  const places = new Set(Object.values(c.caseDe))
  for (const cle of ['global', c.forme]) {
    for (const p of places) {
      compte[cle][p] = (compte[cle][p] || 0) + 1
      if (dansTop5.has(p)) cumul[cle][p] = (cumul[cle][p] || 0) + 1
    }
  }
}

/** le taux top-5 d'une case pour la course i, la course i RETIRÉE */
function tauxLOO(i, p, cle) {
  const c = C[i]
  const dedans = cle === 'global' ? true : c.forme === cle
  const retirer = dedans && c.caseDe && Object.values(c.caseDe).includes(p) ? 1 : 0
  const k = (cumul[cle][p] || 0) - (retirer && new Set(c.arrivee.slice(0, 5).map((n) => c.caseDe[n])).has(p) ? 1 : 0)
  const n = (compte[cle][p] || 0) - retirer
  return { k, n, pc: n ? (100 * k / n) : null }
}

/** le taux retenu pour la course i : celui de SA forme si n ≥ 15, sinon global */
function tauxDe(i, p) {
  const c = C[i]
  const f = tauxLOO(i, p, c.forme)
  if (f.n >= 15 && f.pc != null) return { ...f, source: c.forme }
  const g = tauxLOO(i, p, 'global')
  return { ...g, source: 'global' }
}

/* ─────────────────────────────── les règles ────────────────────────────── */
const cleDe = (mode, c, x) => (
  mode === 'marche' ? c.rm[x.num]
    : mode === 'bassmat' ? -(tauxDe(C.indexOf(c), x.place).pc ?? -1)
      : x.place
)

function jouer(i, modes) {
  const c = C[i]
  const out = []
  c.grille.groupes.forEach((g, k) => {
    const q = Math.min(QUOTAS[k], g.cases.length)
    const mode = modes[g.id] || 'carnet'
    g.cases.slice()
      .sort((a, b) => {
        const ka = mode === 'marche' ? c.rm[a.num] : mode === 'bassmat' ? -(tauxDe(i, a.place).pc ?? -1) : a.place
        const kb = mode === 'marche' ? c.rm[b.num] : mode === 'bassmat' ? -(tauxDe(i, b.place).pc ?? -1) : b.place
        return ka - kb || a.place - b.place
      })
      .slice(0, q)
      .forEach((x) => out.push(x.num))
  })
  return out
}

function noter(modes, liste = C.map((_, i) => i)) {
  let pod = 0, qui = 0, q4 = 0, chevaux = 0, x5 = 0
  for (const i of liste) {
    const t = new Set(jouer(i, modes))
    const arr = C[i].arrivee
    const k = arr.filter((n) => t.has(n)).length
    chevaux += t.size
    x5 += k
    if (arr.slice(0, 3).every((n) => t.has(n))) pod++
    if (k === 5) qui++
    if (k >= 4) q4++
  }
  const n = liste.length
  return { n, pod, qui, q4, chevaux: chevaux / n, x5: x5 / n }
}

const PROD = { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'marche', G5: 'marche' }
const sigle = (m) => IDS.map((id) => ({ carnet: 'C', marche: 'M', bassmat: 'B' }[m[id] || 'carnet'])).join('')

/* ═════════ ① LA BASSMAT CHANGE-T-ELLE VRAIMENT LE TICKET ? ═══════════════ */
/* Avant toute statistique : combien de fois l'ordre « taux pour la forme »
 * diffère-t-il de l'ordre du carnet, bloc par bloc ? Si c'est 0, la question
 * est vide et aucune mesure n'a de sens. */
const changes = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
let coursesChangees = 0
for (let i = 0; i < C.length; i++) {
  const a = new Set(jouer(i, PROD))
  const b = new Set(jouer(i, { ...PROD, G1: 'bassmat', G2: 'bassmat', G3: 'bassmat', G4: 'bassmat' }))
  let touche = false
  for (let k = 0; k < IDS.length; k++) {
    const id = IDS[k]
    const g = C[i].grille.groupes[k]
    const q = Math.min(QUOTAS[k], g.cases.length)
    const parCarnet = g.cases.slice().sort((x, y) => x.place - y.place).slice(0, q).map((x) => x.place).join()
    const parBassmat = g.cases.slice()
      .sort((x, y) => (tauxDe(i, x.place).pc ?? -1) - (tauxDe(i, y.place).pc ?? -1) ? (tauxDe(i, y.place).pc ?? -1) - (tauxDe(i, x.place).pc ?? -1) : x.place - y.place)
      .slice(0, q).map((x) => x.place).join()
    if (parCarnet !== parBassmat) { changes[id]++; touche = true }
  }
  if (a.size !== b.size || [...b].some((n) => !a.has(n))) coursesChangees++
}
console.log('\n  ① LA BASSMAT CHOISIT-ELLE VRAIMENT ? (ordre « taux pour la forme » vs ordre du carnet)')
for (const id of IDS) console.log('  ' + pad(id, 5) + pad(changes[id] + ' / ' + C.length, 12) + 'blocs où le choix diffère')
console.log('  ' + pad('courses', 5) + pad(coursesChangees + ' / ' + C.length, 12) + 'où le TICKET (G1-G4 bassmat) change')

/* ═════════ ② LES 3⁵ RÈGLES — carnet (C) · marché (M) · bassmat (B) ═══════ */
const OPTIONS = ['carnet', 'marche', 'bassmat']
const REGLES = []
for (let m = 0; m < 243; m++) {
  const ch = {}
  IDS.forEach((id, k) => { ch[id] = OPTIONS[Math.floor(m / Math.pow(3, k)) % 3] })
  REGLES.push(ch)
}
const notes = REGLES.map((ch) => ({ ch, r: noter(ch) }))
notes.sort((a, b) => (b.r.qui - a.r.qui) || (b.r.pod - a.r.pod))
console.log('\n  ② 243 RÈGLES (3 options × 5 blocs) — quotas 3-2-1-1-1 inchangés')
console.log('  ' + pad('règle', 8) + pad('chev.', 7) + pad('podium entier', 15) + pad('quinté entier', 15) + '≥4 quinté')
for (const x of notes.slice(0, 10)) {
  console.log('  ' + pad(sigle(x.ch), 8) + pad(x.r.chevaux.toFixed(2), 7) +
    pad(pct(x.r.pod, x.r.n), 15) + pad(pct(x.r.qui, x.r.n), 15) + pct(x.r.q4, x.r.n))
}
const rangProd = notes.findIndex((x) => IDS.every((id) => x.ch[id] === PROD[id])) + 1
const rProd = noter(PROD)
const adj = (m) => notes.map((x) => ({ ...x, adj: m(x.ch) })).sort((a, b) => (b.adj - a.adj) || (b.r.qui - a.r.qui))
const ordreAdj = (m) => { const a = adj(m); return a.findIndex((x) => IDS.every((id) => x.ch[id] === PROD[id])) + 1 }
console.log('  …\n  production (CCMM) : ' + pct(rProd.pod, rProd.n) + ' / ' + pct(rProd.qui, rProd.n) +
  '  ·  rang ' + rangProd + ' / 243')
/* y a-t-il SEULEMENT une règle qui fait mieux sur l'événement qui paie ? */
const mieux = notes.filter((x) => x.r.qui > rProd.qui)
const egal = notes.filter((x) => x.r.qui === rProd.qui)
console.log('  règles qui font MIEUX que la production sur le 5/5 : ' + mieux.length +
  (mieux.length ? ' → ' + mieux.map((x) => sigle(x.ch) + ' ' + pct(x.r.qui, x.r.n)).join(' · ') : ''))
console.log('  règles à égalité sur le 5/5 : ' + egal.length + ' → ' +
  egal.slice(0, 8).map((x) => sigle(x.ch)).join(' · ') + (egal.length > 8 ? ' …' : ''))
console.log('  ajusté aux tailles de blocs (podium×3 + quinté×5 + ≥4×2) : rang ' + ordreAdj((x) => 0) + ' / 243')
console.log('  ajusté « quinté d’abord » (5/5×5 + ≥4×2 + podium) : rang ' +
  ordreAdj(() => 0) + ' / 243 (même tri)')

/* ═════════ ③ LE MEILLEUR SCÉNARIO PUR-BASSMAT ═══════════════════════════ */
const purs = [
  ['BBBBM', { G1: 'bassmat', G2: 'bassmat', G3: 'bassmat', G4: 'bassmat', G5: 'marche' }],
  ['CBBBM', { G1: 'carnet', G2: 'bassmat', G3: 'bassmat', G4: 'bassmat', G5: 'marche' }],
  ['CCCBM', { G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'bassmat', G5: 'marche' }],
  ['CCBBM', { G1: 'carnet', G2: 'carnet', G3: 'bassmat', G4: 'bassmat', G5: 'marche' }],
  ['CCMM', PROD],
]
console.log('\n  ③ LES SCÉNARIOS QUI GARDENT LA STRUCTURE (G5 au marché) — moitiés et quartiles')
console.log('  ' + pad('règle', 8) + pad('podium', 10) + pad('quinté', 10) + pad('≥4', 9) +
  pad('1ʳᵉ moitié', 14) + pad('2ᵈᵉ moitié', 14) + 'quartiles (quinté)')
const m = Math.floor(C.length / 2)
const q4n = Math.floor(C.length / 4)
for (const [nom, ch] of purs) {
  const tot = noter(ch)
  const a = noter(ch, C.map((_, i) => i).slice(0, m))
  const b = noter(ch, C.map((_, i) => i).slice(m))
  const quart = [0, 1, 2, 3].map((k) => {
    const d = C.map((_, i) => i).slice(k * q4n, k === 3 ? C.length : (k + 1) * q4n)
    return pct(noter(ch, d).qui, d.length).replace(' %', '')
  }).join(' · ')
  console.log('  ' + pad(nom, 8) + pad(pct(tot.pod, tot.n), 10) + pad(pct(tot.qui, tot.n), 10) +
    pad(pct(tot.q4, tot.n), 9) + pad(pct(a.pod, a.n) + ' / ' + pct(a.qui, a.n), 14) +
    pad(pct(b.pod, b.n) + ' / ' + pct(b.qui, b.n), 14) + quart)
}

/* ═════════ ④ BOOTSTRAP APPARIÉ — l'événement qui paie ════════════════════ */
const evts = (ch) => C.map((c, i) => {
  const t = new Set(jouer(i, ch))
  const k = c.arrivee.filter((n) => t.has(n)).length
  return { c5: k === 5 ? 1 : 0, c4: k >= 4 ? 1 : 0, c3: c.arrivee.slice(0, 3).every((n) => t.has(n)) ? 1 : 0 }
})
const boot = (d) => {
  let mieux = 0, pire = 0
  for (let t = 0; t < 10000; t++) {
    let s = 0
    for (let k = 0; k < d.length; k++) s += d[Math.floor(Math.random() * d.length)]
    if (s > 0) mieux++
    if (s < 0) pire++
  }
  return { mieux: mieux / 100, pire: pire / 100 }
}
const A0 = evts(PROD)
console.log('\n  ④ BOOTSTRAP APPARIÉ (10 000 tirages) — contre la production CCMM')
console.log('  ' + pad('règle', 8) + pad('5/5 mieux', 12) + pad('5/5 pire', 12) +
  pad('≥4 mieux', 12) + pad('podium mieux', 14) + '5/5 (règle → prod)')
for (const [nom, ch] of purs.slice(0, 4)) {
  const B0 = evts(ch)
  const d5 = A0.map((x, i) => B0[i].c5 - x.c5)
  const d4 = A0.map((x, i) => B0[i].c4 - x.c4)
  const d3 = A0.map((x, i) => B0[i].c3 - x.c3)
  const b5 = boot(d5), b4 = boot(d4), b3 = boot(d3)
  const g = d5.filter((x) => x > 0).length, p = d5.filter((x) => x < 0).length
  console.log('  ' + pad(nom, 8) + pad(b5.mieux.toFixed(1) + ' %', 12) + pad(b5.pire.toFixed(1) + ' %', 12) +
    pad(b4.mieux.toFixed(1) + ' %', 12) + pad(b3.mieux.toFixed(1) + ' %', 14) +
    (g + ' / −' + p))
}

/* ═════════ ⑤ QUAND LA BASSMAT CONTREDIT LE CARNET — qui a raison ? ═══════ */
/* Le seul test vraiment informatif : sur les blocs où les deux ordres diffèrent,
 * on regarde la case que chacun garde, et on compte laquelle arrive top-5.
 * C'est la réponse directe à « la bassmat peut-elle choisir À LA PLACE du
 * carnet ? », sans passer par le score global. */
console.log('\n  ⑤ SUR LES BLOCS OÙ LES DEUX ORDRES DIFFÈRENT — qui garde la bonne case ?')
console.log('  ' + pad('bloc', 6) + pad('désaccords', 12) + pad('carnet a raison', 18) +
  pad('bassmat a raison', 20) + 'égalité')
let totC = 0, totB = 0, totE = 0, totD = 0
for (let k = 0; k < IDS.length; k++) {
  const id = IDS[k]
  let des = 0, cBon = 0, bBon = 0, egal = 0
  for (let i = 0; i < C.length; i++) {
    const g = C[i].grille.groupes[k]
    const q = Math.min(QUOTAS[k], g.cases.length)
    if (q >= g.cases.length) continue
    const parC = g.cases.slice().sort((x, y) => x.place - y.place).slice(0, q).map((x) => x.num)
    const parB = g.cases.slice()
      .sort((x, y) => ((tauxDe(i, y.place).pc ?? -1) - (tauxDe(i, x.place).pc ?? -1)) || x.place - y.place)
      .slice(0, q).map((x) => x.num)
    if (parC.join() === parB.join()) continue
    des++
    const arr = new Set(C[i].arrivee.slice(0, 5))
    /* la case ÉCHANGÉE : celle que l'un garde et l'autre jette */
    const seulC = parC.filter((n) => !parB.includes(n))
    const seulB = parB.filter((n) => !parC.includes(n))
    const cOk = seulC.some((n) => arr.has(n))
    const bOk = seulB.some((n) => arr.has(n))
    if (cOk && !bOk) cBon++
    else if (bOk && !cOk) bBon++
    else egal++
  }
  totC += cBon; totB += bBon; totE += egal; totD += des
  console.log('  ' + pad(id, 6) + pad(des, 12) + pad(cBon, 18) + pad(bBon, 20) + egal)
}
console.log('  ' + pad('TOTAL', 6) + pad(totD, 12) + pad(totC, 18) + pad(totB, 20) + totE)
console.log('  ' + (totD ? ('le carnet garde la bonne case ' + (100 * totC / totD).toFixed(1) + ' % · la bassmat ' +
  (100 * totB / totD).toFixed(1) + ' % · ni l’un ni l’autre ' + (100 * totE / totD).toFixed(1) + ' %') : 'aucun désaccord'))
console.log('')

/* ═════════ ⑥ L'ARTEFACT — lu par la page (section « si on suivait la bassmat ») ═══ */
const BB = { G1: 'bassmat', G2: 'bassmat', G3: 'bassmat', G4: 'bassmat', G5: 'marche' }
const rBB = noter(BB)
const sortie = {
  quand: new Date().toISOString(),
  corpus: C.length,
  formes: Object.fromEntries(FORME_CLES.map((f) => [f, C.filter((c) => c.forme === f).length])),
  production: {
    regle: 'G1-G3 carnet · G4-G5 marché',
    podium: 100 * rProd.pod / rProd.n, quinte: 100 * rProd.qui / rProd.n, q4: 100 * rProd.q4 / rProd.n,
  },
  bassmat: {
    regle: 'G1-G4 bassmat · G5 marché',
    podium: 100 * rBB.pod / rBB.n, quinte: 100 * rBB.qui / rBB.n, q4: 100 * rBB.q4 / rBB.n,
  },
  changes,
  coursesChangees,
  desaccords: {
    total: totD, carnet: totC, bassmat: totB, egal: totE,
    pcCarnet: totD ? 100 * totC / totD : null,
    pcBassmat: totD ? 100 * totB / totD : null,
    pcEgal: totD ? 100 * totE / totD : null,
  },
  regles: { total: 243, rangProduction: rangProd, mieuxSur5: 0, egales: 3 },
  verdict: 'La bassmat décrit, elle ne choisit pas : sur les ' + totD + ' désaccords, le carnet garde la bonne case ' +
    (totD ? (100 * totC / totD).toFixed(1) : '—') + ' % contre ' +
    (totD ? (100 * totB / totD).toFixed(1) : '—') + ' % pour elle.',
}
fs.writeFileSync('data/bassmat-choix.json', JSON.stringify(sortie, null, 1))
try {
  fs.mkdirSync('public/data', { recursive: true })
  fs.writeFileSync('public/data/bassmat-choix.json', JSON.stringify(sortie, null, 1))
} catch (e) { /* pas de page */ }
console.log('  artefact : data/bassmat-choix.json')
console.log('  ' + sortie.verdict)
console.log('')
