/* =============================================================================
 * tools\diag-discipline-ticket.mjs — LE TICKET, DISCIPLINE PAR DISCIPLINE
 * (08/11/2026)
 *
 * Question : « Statistiques montre un grand écart Plat / Attelé pour les P —
 * c'est de là qu'on cherche. »
 *
 * On ne juge PAS les quotas (3-2-1-1-1 reste la constitution, §11.49).
 * On compare, PAR DISCIPLINE, quatre tickets sur les deux corpus :
 *
 *   T1              le ticket de production (8)
 *   T1 + 4ᵉ presse  on ajoute le cheval que G1 coupe (9)  → le pari « Plat »
 *   T1 + 2ᵉ G5      TÉMOIN : n'importe quel cheval de plus (9)
 *   T1 + 4ᵉ + 3ᵉ G2 T1 élargi de deux (10)
 *
 * Le témoin est indispensable : ajouter un cheval est toujours un sur-ensemble,
 * donc ça ne peut jamais perdre. La seule question honnête est : le gain est-il
 * DIRIGÉ (le 4ᵉ de la presse) ou n'importe quel cheval ferait-il l'affaire ?
 *
 *   node tools\diag-discipline-ticket.mjs
 * ========================================================================== */
import fs from 'node:fs'
import { buildGrid, GROUPES, remplirGrille } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)

const norm = (d) => {
  const s = String(d || '').toLowerCase().trim()
  if (s.startsWith('plat')) return 'plat'
  if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
  if (s.startsWith('mont')) return 'monté'
  if (s.startsWith('haie') || s.startsWith('steeple') || s.startsWith('cross')) return 'haies'
  return s || 'autre'
}

/* le ticket de production, par le VRAI moteur */
function ticketProduction(grille, discipline, cotes) {
  const cl = grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const c = cotes
    ? Object.fromEntries(Object.entries(cotes).map(([n, v]) => [n, typeof v === 'object' ? v : { cote: v }]))
    : null
  return remplirGrille(grille, cl, discipline, c, null, null).ticket
}

/* un cheval de plus, choisi à une place précise du carnet */
const plus = (t, x) => (x == null || t.includes(x) ? t : [...t, x])

const SCEN = [
  { id: 'T1', f: () => null, plus: 0 },
  { id: 'T1 + 4ᵉ presse', f: (t, g) => plus(t, g.groupes[0].cases.slice().sort((a, b) => a.place - b.place)[3]?.num), plus: 1 },
  { id: 'T1 + 2ᵉ G5 (témoin)', f: (t, g) => plus(t, g.groupes[4].cases.slice().sort((a, b) => a.place - b.place)[1]?.num), plus: 1 },
  { id: 'T1 + 4ᵉ + 3ᵉ G2', f: (t, g) => {
    const a = g.groupes[0].cases.slice().sort((x, y) => x.place - y.place)[3]?.num
    const b = g.groupes[1].cases.slice().sort((x, y) => x.place - y.place)[2]?.num
    return plus(plus(t, a), b)
  }, plus: 2 },
]

function mesurer(corpus, titre) {
  const acc = {}
  for (const c of corpus) {
    /* sur le registre, le ticket RÉEL est archivé : c'est lui la référence */
    const t1 = (c.ticketReel && c.ticketReel.length) ? c.ticketReel : ticketProduction(c.grille, c.discipline, c.cotes)
    if (!t1.length) continue
    const d = norm(c.discipline)
    acc[d] = acc[d] || {}
    for (const s of SCEN) {
      const t = s.f(t1, c.grille) || t1
      const set = new Set(t)
      const a = acc[d][s.id] = acc[d][s.id] || { n: 0, qui: 0, pod: 0 }
      a.n++
      if (c.arr.slice(0, 5).every((x) => set.has(x))) a.qui++
      if (c.arr.slice(0, 3).every((x) => set.has(x))) a.pod++
    }
  }
  console.log('')
  console.log(titre + ' — ' + corpus.length + ' courses')
  console.log('─'.repeat(84))
  console.log(pad('ticket', 24) + padL('chev.', 7) + ['all', 'plat', 'attelé', 'haies'].map((x) => padL(x, 12)).join(''))
  for (const s of SCEN) {
    const cells = []
    let tn = 0, tq = 0
    for (const d of ['all', 'plat', 'attelé', 'haies']) {
      if (d === 'all') {
        let n = 0, q = 0
        for (const v of Object.values(acc)) { n += v[s.id].n; q += v[s.id].qui }
        tn = n; tq = q
        cells.push(pct(q, n))
      } else {
        const v = acc[d]?.[s.id]
        cells.push(v ? v.qui + '/' + v.n + ' ' + pct(v.qui, v.n) : '—')
      }
    }
    void tn; void tq
    console.log(pad(s.id, 24) + padL(8 + s.plus, 7) + cells.map((x) => padL(x, 12)).join(''))
  }
  console.log('')
  console.log(pad('', 24) + padL('', 7) + ['all', 'plat', 'attelé', 'haies'].map((x) => padL('podium', 12)).join(''))
  for (const s of SCEN) {
    const cells = []
    for (const d of ['all', 'plat', 'attelé', 'haies']) {
      if (d === 'all') {
        let n = 0, q = 0
        for (const v of Object.values(acc)) { n += v[s.id].n; q += v[s.id].pod }
        cells.push(pct(q, n))
      } else {
        const v = acc[d]?.[s.id]
        cells.push(v ? pct(v.pod, v.n) : '—')
      }
    }
    console.log(pad('   (podium) ' + s.id, 24) + padL('', 7) + cells.map((x) => padL(x, 12)).join(''))
  }
}

/* ── corpus 96 : presse réelle + cotes + arrivée ─────────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const C96 = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  C96.push({
    date: q.date, discipline: q.discipline, arr: q.arrivee.slice(0, 5),
    grille: buildGrid(syn, nums), cotes,
  })
}
C96.sort((a, b) => (a.date < b.date ? -1 : 1))

/* ── registre du site : tickets réels ────────────────────────────────────── */
const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const REG = Object.values(SYN)
  .filter((r) => (r.arrivee || []).length >= 5 && (r.ticket || []).length && (r.synthese || []).length >= 10)
  .sort((a, b) => (a.date < b.date ? -1 : 1))
  .map((r) => ({
    date: r.date, discipline: r.discipline, arr: r.arrivee.slice(0, 5),
    grille: buildGrid((r.synthese || []).map(Number), (r.runners || []).map(Number)),
    cotes: null, ticketReel: r.ticket,
  }))

console.log('')
console.log('LE TICKET PAR DISCIPLINE — mesuré le ' + new Date().toISOString().slice(0, 10))
console.log('quotas 3-2-1-1-1 INCHANGÉS · on n\'ajoute un cheval que pour le mesurer, pas pour le décider')

mesurer(C96, 'CORPUS 96 (presse réelle + marché)')
mesurer(REG, 'REGISTRE DU SITE (tickets réels)')

console.log('')
console.log('Lecture : « T1 + 4ᵉ presse » ne vaut que s\'il bat « T1 + 2ᵉ G5 (témoin) ».')
console.log('')
