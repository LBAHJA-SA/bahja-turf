/* =============================================================================
 * tools/pertes.mjs — OÙ SONT LES CHEVAUX QU'ON PERD, ET POURQUOI (20/10/2026)
 *
 * Demande de l'utilisateur : « il faut analyser les chiffres qu'on a perdus et
 * demander pourquoi on les a perdus ».
 *
 * On ne compte plus les 5/5 : on prend CHAQUE arrivant du podium et du quinté,
 * et on lui donne un DESTIN dans le ticket de 8 (3-3-1-1-0) :
 *
 *   pris            il est dans le ticket
 *   coupe_G1..G4    il est dans le bloc, mais le quota l'a laissé dehors
 *   sans_siege_G5   il est dans G5 — et G5 n'a plus de siège (§11.26)
 *   hors_grille     la presse ne le cite pas et il n'est pas partant connu
 *
 * Deux corpus, deux lectures :
 *   ① les 96 Quintés à presse RÉELLE — le vrai buildGrid, le vrai moteur ;
 *   ② les 123 Quintés français des archives — blocs = tranches de marché
 *     (G1 = rangs 1-4 … G5 = 13+), donc la STRUCTURE seule.
 *
 *   node tools\pertes.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, remplirGrille } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)

/* ───────────────────────────── ① le corpus presse ──────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const PRESSE = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  PRESSE.push({ q, nums, syn, cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])) })
}
const REC = PRESSE.map((c) => ({
  date: c.q.date, discipline: c.q.discipline,
  synthese: c.syn, runners: c.nums, arrivee: c.q.arrivee.slice(0, 5),
}))

/* ─────────────────────────── ② le corpus archives ──────────────────────── */
const ARCH = JSON.parse(fs.readFileSync('data/corpus/archives-quinte.json', 'utf8'))
const N = (s) => String(s || '').toUpperCase().replace(/[_\\s]+/g, ' ').trim()
const statsCles = new Set(TOUT.filter((x) => x.date).map((x) => x.date + '|' + N(x.track)))
const ARCHIVES = ARCH.filter((c) => !statsCles.has(c.date + '|' + N(c.track)))

/* ─────────────────────────────── ① le destin ───────────────────────────── */
const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']

function destinsPresse() {
  const bilan = { n: 0, podium: [], quinte: [], blocs: {}, coupes: {}, rangs: [] }
  PRESSE.forEach((c, i) => {
    const grille = buildGrid(c.syn, c.nums)
    const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
      .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
    const stats = computeStats(REC.filter((_, k) => k !== i))
    const { ticket, detail } = remplirGrille(grille, cl, c.q.discipline, c.cotes, stats)
    const blocDe = {}
    for (const g of detail) for (const cs of g.cases) blocDe[cs.num] = { id: g.id, pris: cs.pris, place: cs.place }
    const rangMarche = Object.fromEntries(c.nums.slice().sort((a, b) => c.cotes[a].cote - c.cotes[b].cote || a - b).map((x, k) => [x, k + 1]))

    bilan.n++
    const arr = c.q.arrivee
    arr.slice(0, 5).forEach((num, k) => {
      const b = blocDe[num]
      const destin = !b ? 'hors_grille' : b.pris ? 'pris' : b.id === 'G5' ? 'sans_siege_G5' : 'coupe_' + b.id
      const ligne = { num, destin, bloc: b?.id ?? null, rang: rangMarche[num] ?? null }
      bilan.quinte.push(ligne)
      if (k < 3) bilan.podium.push(ligne)
      const cle = (b?.id ?? 'hors') + '|' + destin
      bilan.blocs[cle] = (bilan.blocs[cle] || 0) + 1
      if (destin !== 'pris') bilan.rangs.push(rangMarche[num] ?? 99)
    })
    /* le cheval coupé de chaque bloc : celui qui arrive le plus près du quota */
    for (const g of detail) {
      const coupes = g.cases.filter((x) => !x.pris).sort((a, b) => a.place - b.place)[0]
      const prisArrive = g.cases.filter((x) => x.pris)
      if (coupes) {
        const e = (bilan.coupes[g.id] = bilan.coupes[g.id] || { n: 0, arrive: 0, gagne: 0 })
        e.n++
        if (arr.slice(0, 5).includes(coupes.num)) e.arrive++
        if (arr.slice(0, 3).includes(coupes.num)) e.gagne++
        // ce que le coupé aurait remplacé : le dernier pris du bloc
        e.dernierPris = prisArrive.length
      }
    }
  })
  return bilan
}

/* ─────────────────────────── ② destin, marché seul ─────────────────────── */
function destinsArchives() {
  const bilan = { n: 0, podium: [], quinte: [], coupes: {} }
  for (const c of ARCHIVES) {
    const ordre = Object.keys(c.cotes).map(Number).sort((a, b) => c.cotes[a] - c.cotes[b] || a - b)
    const rang = Object.fromEntries(ordre.map((x, k) => [x, k + 1]))
    const bloc = (r) => (r <= 4 ? 'G1' : r <= 5 ? 'G1' : r <= 8 ? 'G2' : r <= 10 ? 'G3' : r <= 12 ? 'G4' : 'G5')
    // remplissage 3-3-1-1-0 : les meilleures cotes de chaque bloc
    const quota = { G1: 3, G2: 3, G3: 1, G4: 1, G5: 0 }
    const parBloc = { G1: [], G2: [], G3: [], G4: [], G5: [] }
    for (const num of ordre) parBloc[bloc(rang[num])].push(num)
    const pris = new Set()
    for (const id of IDS) for (const num of parBloc[id].slice(0, quota[id])) pris.add(num)

    bilan.n++
    c.arrivee.slice(0, 5).forEach((num, k) => {
      const r = rang[num]
      if (r == null) return
      const id = bloc(r)
      const destin = pris.has(num) ? 'pris' : id === 'G5' ? 'sans_siege_G5' : 'coupe_' + id
      const ligne = { num, destin, bloc: id, rang: r }
      bilan.quinte.push(ligne)
      if (k < 3) bilan.podium.push(ligne)
    })
    for (const id of IDS) {
      const coupe = parBloc[id].filter((x) => !pris.has(x))[0]
      if (coupe != null) {
        const e = (bilan.coupes[id] = bilan.coupes[id] || { n: 0, arrive: 0, gagne: 0 })
        e.n++
        if (c.arrivee.slice(0, 5).includes(coupe)) e.arrive++
        if (c.arrivee.slice(0, 3).includes(coupe)) e.gagne++
      }
    }
  }
  return bilan
}

/* ──────────────────────────────── le rapport ───────────────────────────── */
function rapport(titre, b, avecBlocs) {
  const totQ = b.quinte.length
  const totP = b.podium.length
  console.log('\n  ' + titre + ' — ' + b.n + ' courses')

  const compter = (liste) => {
    const c = { pris: 0, sans_siege_G5: 0, hors_grille: 0 }
    for (const x of liste) {
      if (x.destin === 'pris') c.pris++
      else if (x.destin === 'sans_siege_G5') c.sans_siege_G5++
      else if (x.destin === 'hors_grille') c.hors_grille++
      else c[x.destin] = (c[x.destin] || 0) + 1
    }
    return c
  }

  const L = (nom, liste, tot) => {
    const c = compter(liste)
    const perdus = tot - c.pris
    console.log('  ' + pad(nom, 6) + pad(tot, 7) + pad(pct(c.pris, tot), 10) + pad(perdus, 8) +
      pad(c.coupe_G1 || 0, 10) + pad(c.coupe_G2 || 0, 10) + pad(c.coupe_G3 || 0, 10) +
      pad(c.coupe_G4 || 0, 10) + pad(c.sans_siege_G5 || 0, 12) + (c.hors_grille || 0))
  }

  console.log('  ' + pad('', 6) + pad('arr.', 7) + pad('pris', 10) + pad('perdus', 8) +
    pad('coupé G1', 10) + pad('coupé G2', 10) + pad('coupé G3', 10) + pad('coupé G4', 10) +
    pad('sans siège G5', 12) + 'hors')
  L('podium', b.podium, totP)
  L('quinté', b.quinte, totQ)

  const cQ = compter(b.quinte)
  console.log('  ' + pad('', 6) + '— répartition des ' + (totQ - cQ.pris) + ' perdus du quinté : ' +
    pct(cQ.sans_siege_G5 || 0, totQ - cQ.pris) + ' sans siège G5 · ' +
    pct((cQ.coupe_G1 || 0), totQ - cQ.pris) + ' coupés G1 · ' +
    pct((cQ.coupe_G2 || 0), totQ - cQ.pris) + ' coupés G2 · ' +
    pct((cQ.coupe_G3 || 0), totQ - cQ.pris) + ' coupés G3 · ' +
    pct((cQ.coupe_G4 || 0), totQ - cQ.pris) + ' coupés G4')

  console.log('\n  LE CHEVAL COUPÉ — celui qui était dans le bloc et qui est sorti')
  console.log('  ' + pad('bloc', 8) + pad('courses', 10) + pad('arrive top-5', 15) + 'arrive top-3')
  for (const id of IDS) {
    const e = b.coupes[id]
    if (!e || !e.n) continue
    console.log('  ' + pad(id, 8) + pad(e.n, 10) + pad(pct(e.arrive, e.n), 15) + pct(e.gagne, e.n))
  }
  console.log('  (le « coupé » = la 1re case non prise du bloc, donc celle qu’un quota de plus aurait fait entrer)')
}

/* ─────────────────────── ③ le rang de marché des perdus ────────────────── */
function rangsPerdus(titre, b) {
  const perdus = b.quinte.filter((x) => x.destin !== 'pris' && x.rang != null)
  const t = (min, max) => perdus.filter((x) => x.rang >= min && x.rang <= max).length
  console.log('\n  ' + titre + ' — les perdus étaient-ils visibles au marché ?')
  console.log('     top-8 du marché : ' + pct(t(1, 8), perdus.length) + '  ·  9-12 : ' + pct(t(9, 12), perdus.length) +
    '  ·  13+ : ' + pct(t(13, 99), perdus.length) + '   (' + perdus.length + ' perdus)')
}

/* ─────────── ③ CONTRE-FACTUEL — où mettre UN siège de plus (9) ─────────── */
/* Le ticket de 8 est la règle. Mais chaque « perdu » dit où le siège manque :
 * on ajoute UN siège, bloc par bloc, et on regarde ce qu'il rapporte. */
function contreFactuel() {
  const QUOTAS = {
    '3-3-1-1-0 (production)': { G1: 3, G2: 3, G3: 1, G4: 1, G5: 0 },
    '+1 en G1 → 4-3-1-1-0': { G1: 4, G2: 3, G3: 1, G4: 1, G5: 0 },
    '+1 en G2 → 3-4-1-1-0': { G1: 3, G2: 4, G3: 1, G4: 1, G5: 0 },
    '+1 en G3 → 3-3-2-1-0': { G1: 3, G2: 3, G3: 2, G4: 1, G5: 0 },
    '+1 en G4 → 3-3-1-2-0': { G1: 3, G2: 3, G3: 1, G4: 2, G5: 0 },
    '+1 en G5 → 3-3-1-1-1': { G1: 3, G2: 3, G3: 1, G4: 1, G5: 1 },
  }
  const res = {}
  for (const nom of Object.keys(QUOTAS)) res[nom] = { pod: 0, qui: 0, qui4: 0, ch: 0, n: 0 }
  PRESSE.forEach((c, i) => {
    const grille = buildGrid(c.syn, c.nums)
    const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
      .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
    const stats = computeStats(REC.filter((_, k) => k !== i))
    for (const [nom, q] of Object.entries(QUOTAS)) {
      const g2 = { groupes: grille.groupes.map((g) => ({ ...g, quota: Math.min(q[g.id] ?? g.quota, g.cases.length) })) }
      const t = remplirGrille(g2, cl, c.q.discipline, c.cotes, stats).ticket
      const s = new Set(t)
      const r = res[nom]
      r.n++; r.ch += t.length
      if (c.q.arrivee.slice(0, 3).every((x) => s.has(x))) r.pod++
      if (c.q.arrivee.slice(0, 5).every((x) => s.has(x))) r.qui++
      if (c.q.arrivee.slice(0, 5).filter((x) => s.has(x)).length >= 4) r.qui4++
    }
  })
  console.log('\n  ③ ET SI ON AJOUTAIT UN SIÈGE ? — 96 Quintés à presse réelle')
  console.log('  ' + pad('répartition', 26) + pad('chev.', 7) + pad('podium entier', 15) + pad('quinté entier', 15) + '≥4 quinté')
  for (const [nom, r] of Object.entries(res)) {
    console.log('  ' + pad(nom, 26) + pad((r.ch / r.n).toFixed(1), 7) + pad(pct(r.pod, r.n), 15) +
      pad(pct(r.qui, r.n), 15) + pct(r.qui4, r.n))
  }
}

const B1 = destinsPresse()
rapport('① 96 QUINTÉS À PRESSE RÉELLE — ticket 3-3-1-1-0', B1)
rangsPerdus('① presse', B1)
contreFactuel()

const B2 = destinsArchives()
rapport('② 123 QUINTÉS FRANÇAIS DES ARCHIVES — blocs = tranches de marché', B2)
rangsPerdus('② archives', B2)
console.log('')
