/* =============================================================================
 * tools/diagnostic.mjs — LE TABLEAU DE DIAGNOSTIC DEMANDÉ (20/10/2026)
 *
 * Question de l'utilisateur : « هل عمود Bilan يُحسب من مقارنة Ticket مع Arrivée
 * مباشرةً، أم أنه ناتج عن معيار آخر ؟ » — et : « sortir un tableau qui dit, pour
 * chaque arrivant : son rang de presse, son groupe, s'il est au ticket, et sinon
 * QUI a pris sa place ».
 *
 * Ce que fait l'outil :
 *   ① recalcule le Bilan de chaque course comme la page le fait
 *      (`|arrivée ∩ ticket|`, une simple intersection d'ensembles) ;
 *   ② pour chaque ARRIVANT : rang de presse P, groupe G, présent au ticket ? ;
 *   ③ si absent : le cheval du MÊME groupe qui a pris le siège, et la règle
 *      qui l'a choisi (carnet = rang de presse · marché = cote) ;
 *   ④ les totaux (x/5, Top3, distribution).
 *
 *   node tools\diagnostic.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, ticketValide } from '../src/lib/quinte.js'

const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')

const BRUT = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const TOUT = Array.isArray(BRUT) ? BRUT : Object.values(BRUT)
const COURSES = TOUT
  .filter((a) => a && a.date && (a.arrivee || []).length >= 3 && (a.ticket || []).length)
  .sort((a, b) => String(a.date).localeCompare(String(b.date)))

/* ── ① le bilan, exactement comme la page le calcule ────────────────────── */
const LIGNES = COURSES.map((a) => {
  const ticket = ticketValide(a).map(Number)
  const set = new Set(ticket)
  const arrivee = (a.arrivee || []).map(Number)
  const pris = arrivee.filter((n) => set.has(n))
  return {
    date: a.date,
    hippo: (a.hippodrome || a.race?.hippodrome || '—').toLowerCase(),
    arrivee,
    ticket,
    pris,
    bilan: pris.length,
    top3: arrivee.slice(0, 3).filter((n) => set.has(n)).length,
    top3Entier: arrivee.slice(0, 3).every((n) => set.has(n)),
    premier: set.has(arrivee[0]),
    source: a.ticketSource || null,
  }
})

/* ── ② le détail par arrivant : P, groupe, pris / qui a pris le siège ───── */
const DETAIL = []
for (const a of COURSES) {
  const syn = (a.synthese || []).map(Number)
  const runners = (a.runners || []).map(Number)
  if (syn.length < 5) continue
  const grille = buildGrid(syn, runners)
  const set = new Set(ticketValide(a).map(Number))
  const rangsP = new Map(syn.map((n, i) => [n, i + 1]))
  const blocDe = new Map()
  grille.groupes.forEach((g, gi) => g.cases.forEach((c) => blocDe.set(c.num, { g: gi + 1, P: c.place, nom: g.nom })))
  for (const n of (a.arrivee || []).slice(0, 5)) {
    const b = blocDe.get(n)
    const pris = set.has(n)
    /* qui occupe le siège de ce groupe dans le ticket ? */
    let remplacant = null
    if (!pris && b) {
      const g = grille.groupes[b.g - 1]
      const occupes = g.cases.filter((c) => set.has(c.num)).map((c) => ({ num: c.num, P: c.place }))
      const cote = (m) => a.cotes?.[m] ?? null
      const parCote = occupes.slice().sort((x, y) => (cote(x.num) ?? 999) - (cote(y.num) ?? 999))
      remplacant = {
        dansLeBloc: occupes,
        meilleureCote: parCote[0]?.num ?? null,
        regle: b.g <= 3 ? 'carnet (rang de presse)' : 'marché (cote)',
      }
    }
    DETAIL.push({
      date: a.date, num: n, P: b?.P ?? rangsP.get(n) ?? null, groupe: b?.g ?? null,
      pris, remplacant,
    })
  }
}

/* ── ③ les totaux ───────────────────────────────────────────────────────── */
const n = LIGNES.length
const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }
LIGNES.forEach((l) => { dist[l.bilan] = (dist[l.bilan] || 0) + 1 })
const ge4 = LIGNES.filter((l) => l.bilan >= 4).length
const t3 = LIGNES.filter((l) => l.top3Entier).length
const range = LIGNES.filter((l) => l.bilan <= 2).length
const premier = LIGNES.filter((l) => l.premier).length

console.log('')
console.log('  ① LE BILAN = | ticket ∩ arrivée |   —  ' + n + ' courses clôturées')
console.log('')
console.log('  ' + pad('date', 11) + pad('hippodrome', 15) + pad('arrivée', 18) + pad('ticket', 26) + pad('communs', 9) + 'bilan')
for (const l of LIGNES) {
  console.log('  ' + pad(l.date, 11) + pad(l.hippo, 15) + pad(l.arrivee.join('-'), 18) +
    pad(l.ticket.join(' '), 26) + pad(l.pris.join(' ') || '—', 9) + l.bilan + '/5')
}
console.log('')
console.log('  distribution   ' + [5, 4, 3, 2, 1, 0].map((k) => k + '/5 : ' + (dist[k] || 0)).join('  ·  '))
console.log('  ≥ 4/5          ' + ge4 + '/' + n + '  ' + pct(ge4, n))
console.log('  exactement 3/5 ' + (dist[3] || 0) + '/' + n + '  ' + pct(dist[3] || 0, n))
console.log('  ≤ 2/5          ' + range + '/' + n + '  ' + pct(range, n))
console.log('  Top3 ENTIER    ' + t3 + '/' + n + '  ' + pct(t3, n))
console.log('  1er au ticket  ' + premier + '/' + n + '  ' + pct(premier, n))
console.log('  somme bilans   ' + LIGNES.reduce((s, l) => s + l.bilan, 0) + ' / ' + (5 * n) +
  '  (' + pct(LIGNES.reduce((s, l) => s + l.bilan, 0), 5 * n) + ' des arrivants)')
console.log('')

/* ── ③ bis LE TEST DE LA SYNTHÈSE — les arrivants sont-ils dans la presse ? */
let arrTot = 0, arrPresse = 0
const horsPresse = []
for (const a of COURSES) {
  const S = new Set((a.synthese || []).map(Number))
  for (const n of (a.arrivee || []).slice(0, 5)) {
    arrTot++
    if (S.has(n)) arrPresse++
    else horsPresse.push(a.date + ' n°' + n)
  }
}
console.log('  ③ TEST DE LA SYNTHÈSE — les arrivants sont-ils dans la liste de presse ?')
console.log('')
console.log('     arrivants              ' + arrTot)
console.log('     dans la Synthèse       ' + arrPresse + '  ' + pct(arrPresse, arrTot))
console.log('     hors Synthèse          ' + (arrTot - arrPresse) + (horsPresse.length ? '  → ' + horsPresse.join(' · ') : '  (aucun)'))
console.log('     longueur de la Synthèse ' + Math.min(...COURSES.map((a) => (a.synthese || []).length)) +
  ' → ' + Math.max(...COURSES.map((a) => (a.synthese || []).length)) + ' numéros')
console.log('')

/* ── ④ le diagnostic par arrivant ──────────────────────────────────────── */
const pasPris = DETAIL.filter((d) => !d.pris)
console.log('  ② LES ARRIVANTS PERDUS — ' + pasPris.length + ' sur ' + DETAIL.length + ' arrivants')
console.log('')
console.log('  ' + pad('date', 11) + padL('n°', 3) + '  ' + padL('P', 3) + '  ' + pad('G', 4) + pad('qui a pris le siège du bloc', 40) + 'règle')
for (const d of pasPris) {
  const occ = d.remplacant?.dansLeBloc?.map((x) => x.num + '(P' + x.P + ')').join(' ') || '—'
  console.log('  ' + pad(d.date, 11) + padL(d.num, 3) + '  ' + padL(d.P ?? '?', 3) + '  ' +
    pad(d.groupe ? 'G' + d.groupe : '?', 4) + pad(occ, 40) + (d.remplacant?.regle || '—'))
}
console.log('')

const parG = {}
pasPris.forEach((d) => { if (d.groupe) parG['G' + d.groupe] = (parG['G' + d.groupe] || 0) + 1 })
const totG = {}
DETAIL.forEach((d) => { if (d.groupe) totG['G' + d.groupe] = (totG['G' + d.groupe] || 0) + 1 })
console.log('  où sont les perdus   ' + Object.keys(totG).sort().map((k) => k + ' ' + (parG[k] || 0) + '/' + totG[k]).join('  ·  '))
console.log('')

fs.writeFileSync('data/diagnostic.json', JSON.stringify({ lignes: LIGNES, detail: DETAIL, totaux: { n, dist, ge4, t3, range, premier } }, null, 1))
console.log('  → data/diagnostic.json')
console.log('')
