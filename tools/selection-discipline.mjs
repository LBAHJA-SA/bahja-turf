/* =============================================================================
 * tools\selection-discipline.mjs — LA CASE P NE VAUT PAS LA MÊME CHOSE
 *                                   EN PLAT ET EN ATTELÉ (08/11/2026)
 *
 * Observation de l'utilisateur : « regarde Statistiques, il y a une grande
 * différence entre Plat et Attelé pour les P — c'est de là qu'on cherche ».
 *
 * Ce script :
 *
 *   ① SORT LES DEUX TABLES côte à côte (registre du site + corpus 96),
 *      discipline par discipline : quelle case P donne, et combien.
 *   ② MESURE UNE RÈGLE QUI EN TIENT COMPTE : dans G1 (4 cases, quota 3) et
 *      G2 (4 cases, quota 2), on coupe la case qui DONNE LE MOINS **dans la
 *      discipline du jour**, au lieu de couper le moins bien cité par la presse.
 *   ③ LE TEST EST ISOLÉ : seul l'ordre INTERNE de G1 (puis de G2) change.
 *      Tout le reste est au carnet, identique dans les deux bras. Aucun quota
 *      n'est touché (3-2-1-1-1 reste la constitution, §11.49).
 *
 * ⚠ LOO strict : pour juger une course, on n'utilise que les courses de la
 *   MÊME discipline qui la précèdent. Aucune fuite du futur.
 *
 *   node tools\selection-discipline.mjs
 * ========================================================================== */
import fs from 'node:fs'
import { buildGrid, GROUPES } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
const ligne = (c = '─', n = 92) => c.repeat(n)

const normDisc = (d) => {
  const s = String(d || '').toLowerCase().trim()
  if (s.startsWith('plat')) return 'plat'
  if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
  if (s.startsWith('mont')) return 'monté'
  if (s.startsWith('haie') || s.startsWith('steeple')) return 'haies'
  return s || 'autre'
}
const DISC = ['plat', 'attelé', 'haies']

/* ═════════════════════════════ LES DEUX CORPUS ════════════════════════════ */
function corpusRegistre() {
  const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
  return Object.values(SYN)
    .filter((r) => (r.arrivee || []).length >= 5 && (r.synthese || []).length >= 10)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => {
      const presse = (r.synthese || []).map(Number).filter(Number.isFinite)
      const runners = (r.runners || []).map(Number).filter(Number.isFinite)
      return {
        date: r.date, disc: normDisc(r.discipline),
        grille: buildGrid(presse, runners),
        arr: r.arrivee.slice(0, 5),
        source: 'registre',
      }
    })
}

function corpus96() {
  const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
  const out = []
  for (const q of TOUT) {
    const cotes = q.cotes
    if (!cotes || Object.keys(cotes).length < 12) continue
    if (!q.arrivee || q.arrivee.length < 5) continue
    const nums = Object.keys(cotes).map(Number)
    if (nums.some((n) => !(cotes[n] > 1))) continue
    const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
    if (syn.length < 10) continue
    out.push({
      date: q.date, disc: normDisc(q.discipline),
      grille: buildGrid(syn, nums),
      arr: q.arrivee.slice(0, 5),
      source: 'corpus96',
    })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

/* ═════════════ ① LES TABLES PAR DISCIPLINE ════════════════════════════════ */
function table(corpus, titre) {
  console.log('')
  console.log('① ' + titre + ' — ' + corpus.length + ' courses · P1..P12')
  console.log(ligne())
  const MAX = 12
  const head = []
  for (let p = 1; p <= MAX; p++) head.push(padL('P' + p, 6))
  console.log(pad('', 14) + head.join(''))

  for (const d of ['all', ...DISC]) {
    const list = d === 'all' ? corpus : corpus.filter((c) => c.disc === d)
    if (list.length < 4) continue
    const n5 = Array(MAX + 1).fill(0)
    const pod = Array(MAX + 1).fill(0)
    const n = Array(MAX + 1).fill(0)
    for (const c of list) {
      for (const g of c.grille.groupes) {
        for (const x of g.cases) {
          if (!x.slot || x.slot > MAX) continue
          const p = x.slot
          n[p]++
          if (c.arr.includes(x.num)) n5[p]++
          if (c.arr.slice(0, 3).includes(x.num)) pod[p]++
        }
      }
    }
    const cell = (v, den) => padL(den ? Math.round(100 * v / den) + '%' : '—', 6)
    console.log(pad(d + ' (' + list.length + ')', 14) + n5.slice(1).map((v, i) => cell(v, n[i + 1])).join(''))
  }
  console.log(pad('', 14) + '(part des courses où la case finit dans les 5)')
}

/* ═════════════ ② LA FORCE D'UNE CASE, PAR DISCIPLINE, EN LOO ══════════════ */
function forceLOO(corpus) {
  /* FEAT[i][p] = ce que la case p a donné dans la MÊME discipline, AVANT i. */
  const FEAT = []
  for (let i = 0; i < corpus.length; i++) {
    const c = corpus[i]
    const acc = Array.from({ length: 21 }, () => ({ n: 0, h5: 0, h3: 0 }))
    for (let j = 0; j < i; j++) {
      const cj = corpus[j]
      if (cj.disc !== c.disc) continue
      for (const g of cj.grille.groupes) {
        for (const x of g.cases) {
          if (!x.slot || x.slot > 20) continue
          const a = acc[x.slot]
          a.n++
          if (cj.arr.includes(x.num)) a.h5++
          if (cj.arr.slice(0, 3).includes(x.num)) a.h3++
        }
      }
    }
    const tab = []
    for (let p = 1; p <= 20; p++) tab[p] = { n: acc[p].n, pct5: acc[p].n ? acc[p].h5 / acc[p].n : null, pct3: acc[p].n ? acc[p].h3 / acc[p].n : null }
    FEAT.push(tab)
  }
  return FEAT
}

/* ═════════════ ③ LES RÈGLES, BLOC PAR BLOC, À QUOTAS CONSTANTS ════════════ */
const BASE_QUOTA = GROUPES.map((g) => g.quota) // 3-2-1-1-1, jamais touché

function ticket(corpus, FEAT, i, modes) {
  const c = corpus[i]
  const out = []
  c.grille.groupes.forEach((g, k) => {
    const quota = Math.min(BASE_QUOTA[k], g.cases.length)
    const mode = modes[k] || 'carnet'
    let ordre
    if (mode === 'carnet') {
      ordre = g.cases.slice().sort((a, b) => a.place - b.place)
    } else if (mode === 'case') {
      /* la force de la CASE dans la discipline du jour (LOO), puis le carnet.
       * Une case sans historique (n < 5) n'a pas d'avis : elle passe derrière. */
      const f = (x) => {
        const st = FEAT[i][x.slot]
        return st && st.n >= 5 && st.pct5 != null ? st.pct5 : -1
      }
      ordre = g.cases.slice().sort((a, b) => (f(b) - f(a)) || a.place - b.place)
    } else {
      ordre = g.cases.slice().sort((a, b) => a.place - b.place)
    }
    ordre.slice(0, quota).forEach((x) => out.push(x.num))
  })
  return [...new Set(out)]
}

function noter(corpus, FEAT, modes, filtre = null) {
  let pod = 0, qui = 0, q4 = 0, n = 0
  for (let i = 0; i < corpus.length; i++) {
    const c = corpus[i]
    if (filtre && c.disc !== filtre) continue
    n++
    const t = new Set(ticket(corpus, FEAT, i, modes))
    if (c.arr.slice(0, 3).every((x) => t.has(x))) pod++
    if (c.arr.slice(0, 5).every((x) => t.has(x))) qui++
    if (c.arr.slice(0, 5).filter((x) => t.has(x)).length >= 4) q4++
  }
  return { pod, qui, q4, n }
}

function compare(corpus, nom) {
  const FEAT = forceLOO(corpus)
  const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']
  const prod = ['carnet', 'carnet', 'carnet', 'carnet', 'carnet']
  const ref = noter(corpus, FEAT, prod)

  console.log('')
  console.log('③ ' + nom + ' — quotas 3-2-1-1-1 INCHANGÉS, seul l\'ordre interne de G1/G2 change')
  console.log(ligne())
  console.log(pad('règle', 34) + padL('podium', 10) + padL('quinté', 10) + padL('≥4', 8) + padL('gagné', 8))
  const show = (lib, r) => console.log(pad(lib, 34) + padL(pct(r.pod, r.n), 10) + padL(pct(r.qui, r.n), 10) +
    padL(pct(r.q4, r.n), 8) + padL((r.qui - ref.qui > 0 ? '+' : '') + (r.qui - ref.qui), 8))
  show('référence : carnet partout', ref)

  const essais = []
  for (const k of [0, 1]) {
    for (const mode of ['case']) {
      const modes = prod.slice(); modes[k] = mode
      essais.push({ k, mode, modes, r: noter(corpus, FEAT, modes) })
    }
  }
  /* les deux ensemble */
  const deux = prod.slice(); deux[0] = 'case'; deux[1] = 'case'
  essais.push({ k: '1+2', mode: 'case', modes: deux, r: noter(corpus, FEAT, deux) })

  for (const e of essais) show(`G${e.k === '1+2' ? '1+G2' : e.k + 1} → ${'la case qui donne (discipline)'}`, e.r)

  console.log('')
  console.log(pad('', 22) + padL('par discipline : quinté (5/5)', 30))
  for (const d of DISC) {
    const b = noter(corpus, FEAT, prod, d)
    if (b.n < 4) continue
    const allCase = prod.slice(); allCase[0] = 'case'; allCase[1] = 'case'
    const a = noter(corpus, FEAT, allCase, d)
    console.log(pad(d + ' (' + b.n + ')', 22) + padL(`carnet ${pct(b.qui, b.n)} → case ${pct(a.qui, a.n)}`, 30))
  }
  return { ref, essais, FEAT }
}

/* ═════════════ ④ OÙ LE 4ᵉ CITE PERD SES SIÈGES ════════════════════════════ */
function ouEstLeQuatrieme(corpus) {
  /* Le ticket coupe un des 4 de G1. DANS QUELLE CASE P tombe ce cheval ?
   * Si la case varie, la règle « couper le moins bien cité » n'est pas la même
   * que « couper la case la plus faible ». */
  console.log('')
  console.log('④ LE CHEVAL QUE G1 COUPE — dans quelle case P tombe-t-il ?')
  console.log(ligne())
  const parDisc = {}
  for (const c of corpus) {
    const g = c.grille.groupes[0]
    const ordre = g.cases.slice().sort((a, b) => a.place - b.place)
    const coupe = ordre[3]
    if (!coupe) continue
    const d = c.disc
    parDisc[d] = parDisc[d] || {}
    parDisc[d][coupe.slot] = (parDisc[d][coupe.slot] || 0) + 1
  }
  for (const [d, m] of Object.entries(parDisc)) {
    const tot = Object.values(m).reduce((a, b) => a + b, 0)
    const rep = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([p, v]) => `P${p} ${v} (${Math.round(100 * v / tot)}%)`).join(' · ')
    console.log(pad(d + ' (' + tot + ')', 16) + rep)
  }
}

/* ═════════════ ⑤ LA DÉCISION BINAIRE DE G1 : P3 OU P4 ? ═══════════════════ */
function binaire(corpus, nom) {
  /* Le quota de G1 est 3 sur 4 cases, et le cheval coupé tombe TOUJOURS dans
   * la case P3 ou la case P4 (§④). Le seul choix réel de G1 est donc :
   *          « je coupe le P3 » ou « je coupe le P4 ».
   * On mesure 4 règles, tout le reste du ticket identique. */
  const FEAT = forceLOO(corpus)
  const f = (i, x) => {
    const st = FEAT[i]?.[x.slot]
    return st && st.n >= 5 && st.pct5 != null ? st.pct5 : null
  }
  const regles = {
    'production : coupe le moins cité': (i, cases) => cases.slice().sort((a, b) => a.place - b.place),
    'coupe toujours le P4': (i, cases) => {
      const p4 = cases.find((x) => x.slot === 4)
      if (!p4) return cases.slice().sort((a, b) => a.place - b.place)
      return [p4, ...cases.filter((x) => x !== p4).sort((a, b) => a.place - b.place)]
    },
    'coupe toujours le P3': (i, cases) => {
      const p3 = cases.find((x) => x.slot === 3)
      if (!p3) return cases.slice().sort((a, b) => a.place - b.place)
      return [p3, ...cases.filter((x) => x !== p3).sort((a, b) => a.place - b.place)]
    },
    'coupe le plus faible P3/P4 (discipline)': (i, cases) => {
      const a = cases.find((x) => x.slot === 3)
      const b = cases.find((x) => x.slot === 4)
      const carnet = cases.slice().sort((x, y) => x.place - y.place)
      if (!a || !b) return carnet
      const fa = f(i, a), fb = f(i, b)
      if (fa == null || fb == null) return carnet
      const coupe = fa <= fb ? a : b            // le plus faible des deux sort
      return [coupe, ...cases.filter((x) => x !== coupe).sort((x, y) => x.place - y.place)]
    },
  }

  console.log('')
  console.log('⑤ G1 — LE SEUL VRAI CHOIX : COUPER P3 OU P4 ?   (' + nom + ')')
  console.log(ligne())
  console.log(pad('règle', 40) + padL('podium', 9) + padL('quinté', 9) + padL('≥4', 8) + padL('5/5 gagnés', 12))
  const base = { pod: 0, qui: 0, q4: 0, n: 0 }
  const res = {}
  for (const [lib, ordre] of Object.entries(regles)) {
    let pod = 0, qui = 0, q4 = 0, n = 0
    for (let i = 0; i < corpus.length; i++) {
      const c = corpus[i]
      const t = new Set()
      c.grille.groupes.forEach((g, k) => {
        const quota = Math.min(BASE_QUOTA[k], g.cases.length)
        const ord = k === 0 ? ordre(i, g.cases) : g.cases.slice().sort((a, b) => a.place - b.place)
        ord.slice(0, quota).forEach((x) => t.add(x.num))
      })
      n++
      if (c.arr.slice(0, 3).every((x) => t.has(x))) pod++
      if (c.arr.slice(0, 5).every((x) => t.has(x))) qui++
      if (c.arr.slice(0, 5).filter((x) => t.has(x)).length >= 4) q4++
    }
    res[lib] = { pod, qui, q4, n }
    if (lib.startsWith('production')) Object.assign(base, { pod, qui, q4, n })
  }
  for (const [lib, r] of Object.entries(res)) {
    console.log(pad(lib, 40) + padL(pct(r.pod, r.n), 9) + padL(pct(r.qui, r.n), 9) + padL(pct(r.q4, r.n), 8) +
      padL((r.qui - base.qui > 0 ? '+' : '') + (r.qui - base.qui), 12))
  }

  /* et par discipline */
  console.log('')
  console.log(pad('', 26) + padL('quinté 5/5 par discipline', 32))
  for (const d of DISC) {
    const part = corpus.map((c, i) => i).filter((i) => corpus[i].disc === d)
    if (part.length < 4) continue
    const ligneD = []
    for (const [lib, ordre] of Object.entries(regles)) {
      let qui = 0, n = 0
      for (const i of part) {
        const c = corpus[i]
        const t = new Set()
        c.grille.groupes.forEach((g, k) => {
          const quota = Math.min(BASE_QUOTA[k], g.cases.length)
          const ord = k === 0 ? ordre(i, g.cases) : g.cases.slice().sort((a, b) => a.place - b.place)
          ord.slice(0, quota).forEach((x) => t.add(x.num))
        })
        n++
        if (c.arr.slice(0, 5).every((x) => t.has(x))) qui++
      }
      ligneD.push(`${lib.split(' ')[0]} ${qui}/${n}`)
    }
    console.log(pad(d + ' (' + part.length + ')', 26) + padL(ligneD.join(' · '), 32))
  }
}

/* ═════════════ ⑥ LE VRAI ÉCART PLAT / ATTELÉ : LA LISIBILITÉ ══════════════ */
function lisibilite(corpus, nom) {
  /* Deux questions, mesurées séparément par discipline :
   *   a) le carnet range-t-il les chevaux ? (AUC)
   *   b) combien de chevaux faut-il pour tenir le quinté ? (courbe top-k)
   * Si (a) est bas et (b) monte vite, la discipline a besoin de PLUS de cases —
   * c'est le seul levier qui ne touche pas aux quotas. */
  console.log('')
  console.log('⑥ LISIBILITÉ PAR DISCIPLINE — ' + nom)
  console.log(ligne())

  /* a) AUC du carnet (rang de presse) dans chaque discipline */
  const auc = {}
  for (const d of ['all', ...DISC]) {
    let paires = 0, gagne = 0
    for (const c of corpus) {
      if (d !== 'all' && c.disc !== d) continue
      const parNum = c.grille.parNum
      const nums = Object.keys(parNum).map(Number)
      const arr = c.arr
      for (let a = 0; a < nums.length; a++) {
        for (let b = a + 1; b < nums.length; b++) {
          const ha = arr.includes(nums[a]), hb = arr.includes(nums[b])
          if (ha === hb) continue
          /* mieux cité = plus petit rang = doit être l'arrivant */
          const bon = ha ? parNum[nums[a]] < parNum[nums[b]] : parNum[nums[b]] < parNum[nums[a]]
          if (bon) gagne++
          paires++
        }
      }
    }
    auc[d] = paires ? gagne / paires : null
  }
  const f3 = (v) => (v == null ? '—' : v.toFixed(3).replace('.', ','))
  console.log(pad('AUC du carnet', 20) + ['all', ...DISC].map((d) => pad(d + ' ' + f3(auc[d]), 18)).join(''))

  /* b) couverture du quinté par un top-k de la presse */
  console.log('')
  console.log(pad('top-k par la presse', 20) + ['all', ...DISC].map((d) => pad(d, 16)).join(''))
  for (const k of [8, 9, 10, 11, 12]) {
    const cells = []
    for (const d of ['all', ...DISC]) {
      const list = d === 'all' ? corpus : corpus.filter((c) => c.disc === d)
      if (list.length < 6) { cells.push('—'); continue }
      let ok = 0
      for (const c of list) {
        const top = Object.entries(c.grille.parNum).sort((a, b) => a[1] - b[1]).slice(0, k).map((x) => Number(x[0]))
        if (c.arr.every((n) => top.includes(n))) ok++
      }
      cells.push(pct(ok, list.length))
    }
    console.log(pad('k = ' + k, 20) + cells.map((x) => pad(x, 16)).join(''))
  }
  console.log('')
  console.log('Lecture : un carnet très lisible (AUC haut) tient le quinté avec peu de cases ;')
  console.log('          un carnet brouillé (AUC bas) a besoin d\'une case de plus pour le même résultat.')
}

/* ═════════════ ⑦ LA DIFFÉRENCE PLAT / ATTELÉ EST-ELLE SOLIDE ? ════════════ */
function signification(REG, C96) {
  /* On réunit les deux corpus (128 courses) : c'est la seule façon de savoir si
   * l'écart Plat/Attelé vu sur 13 + 13 courses tient debout. z = écart / erreur
   * type. |z| < 1,96 → on ne peut pas conclure (95 %). */
  const TOUT = [...REG, ...C96]
  const par = {}
  for (const c of TOUT) {
    const d = c.disc
    par[d] = par[d] || {}
    for (const g of c.grille.groupes) {
      for (const x of g.cases) {
        if (!x.slot || x.slot > 12) continue
        const o = par[d][x.slot] = par[d][x.slot] || { n: 0, h5: 0 }
        o.n++
        if (c.arr.includes(x.num)) o.h5++
      }
    }
  }
  console.log('')
  console.log('⑦ LA DIFFÉRENCE PLAT / ATTELÉ EST-ELLE SOLIDE ? — 2 corpus réunis (' + TOUT.length + ' courses)')
  console.log(ligne())
  console.log(pad('case', 8) + padL('Plat', 16) + padL('Attelé', 16) + padL('écart', 10) + padL('z', 8) + '   verdict')
  console.log(ligne())
  let solide = 0
  for (let p = 1; p <= 12; p++) {
    const a = par.plat?.[p], b = par['attelé']?.[p]
    if (!a || !b || a.n < 5 || b.n < 5) continue
    const pa = a.h5 / a.n, pb = b.h5 / b.n
    const se = Math.sqrt(pa * (1 - pa) / a.n + pb * (1 - pb) / b.n)
    const z = se ? (pa - pb) / se : 0
    const verdict = Math.abs(z) >= 1.96 ? '✅ solide' : (Math.abs(z) >= 1.5 ? '… limite' : 'bruit')
    if (Math.abs(z) >= 1.96) solide++
    console.log(
      pad('P' + p, 8) +
      padL(`${a.h5}/${a.n} = ${pct(a.h5, a.n)}`, 16) +
      padL(`${b.h5}/${b.n} = ${pct(b.h5, b.n)}`, 16) +
      padL((pa > pb ? '+' : '') + Math.round(100 * (pa - pb)) + ' pts', 10) +
      padL(z.toFixed(2).replace('.', ','), 8) +
      '   ' + verdict
    )
  }
  console.log('')
  console.log(solide === 0
    ? '→ AUCUNE case ne montre un écart Plat/Attelé significatif. L\'écart vu sur la page est du bruit d\'échantillon.'
    : `→ ${solide} case(s) avec un écart significatif : à surveiller.`)
}

/* ══════════════════════════════════ MAIN ═════════════════════════════════ */
const REG = corpusRegistre()
const C96 = corpus96()

console.log('')
console.log('LA CASE P PAR DISCIPLINE — mesuré le ' + new Date().toISOString().slice(0, 10))
console.log('registre du site : ' + REG.length + ' courses · corpus 96 : ' + C96.length + ' courses')

table(REG, 'REGISTRE DU SITE (page Statistiques, Tout / Plat / Attelé)')
table(C96, 'CORPUS 96 (02 → 07/2026)')

compare(REG, 'REGISTRE DU SITE')
compare(C96, 'CORPUS 96')

ouEstLeQuatrieme(REG)
ouEstLeQuatrieme(C96)

binaire(REG, 'registre du site, 32 courses')
binaire(C96, 'corpus 96')

lisibilite(REG, 'registre du site (32 courses)')
lisibilite(C96, 'corpus 96')

signification(REG, C96)

console.log('')
console.log('⚠ 3-2-1-1-1 n\'est pas touché : on ne compare que QUI entre dans G1 et G2.')
console.log('')
