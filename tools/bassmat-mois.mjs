/* =============================================================================
 * tools/bassmat-mois.mjs — LA BASSMAT DU MOIS, PAS CELLE DU CORPUS (29/10/2026)
 *
 * Demande de l'utilisateur : « la bassmat du Quinté, je la veux d'ICI
 * seulement, parce que c'est elle qui montre les mauvais choix qu'on a faits
 * ce mois-ci ».
 *
 * La bassmat de référence (§11.35) est calculée sur 96 Quintés de février à
 * juillet : elle décrit un régime de course, pas NOS choix. Celle-ci prend
 * l'archive du mois — les courses réellement jouées, avec leur ticket réel —
 * et répond à trois questions que le corpus ne peut pas poser :
 *
 *   ① Où sont les cases de CE mois (P1..P20) : quelles cases ont produit.
 *   ② Quelle empreinte (motif G1..G5) le podium et le quinté ont eue.
 *   ③ ⭐ OÙ LE TICKET A PERDU : chaque arrivant, sa case, son bloc, s'il était
 *      pris — et, s'il ne l'était pas, QUI était pris à sa place, et si ce
 *      remplaçant est arrivé.
 *
 * Rien n'est saisi à la main : tout vient de `data/synthese.json` (l'archive)
 * et de `data/cotes.json` (le marché), croisés avec `buildGrid`/`remplirGrille`
 * du VRAI moteur.
 *
 *   node tools\bassmat-mois.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, remplirGrille, GROUPES } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const r1 = (x) => Math.round(10 * x) / 10
const IDS = ['G1', 'G2', 'G3', 'G4', 'G5']

/* ─────────────────────────────── l'archive du mois ─────────────────────── */
const ARCH = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const COTES = (() => { try { return JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) } catch { return {} } })()

const MOIS = Object.keys(ARCH).sort().filter((d) => d >= '2026-10-01' && d <= '2026-10-31')
const C = []
const ecartees = []
for (const d of MOIS) {
  const e = ARCH[d]
  const syn = (e.synthese || []).filter((n) => Number.isFinite(n) && n > 0)
  const arr = (e.arrivee || []).filter((n) => Number.isFinite(n) && n > 0)
  if (syn.length < 8) { ecartees.push({ date: d, quoi: 'synthèse trop courte (' + syn.length + ')' }); continue }
  if (arr.length < 5) { ecartees.push({ date: d, quoi: 'pas d’arrivée' }); continue }
  const nums = (e.runners && e.runners.length ? e.runners : syn).map(Number)
  const grille = buildGrid(syn, nums)

  /* ⚠ LE TICKET RÉEL — c'est lui qu'on ausculte. S'il n'est pas archivé, on
   * reconstruit celui du moteur sur les scores archivés, et on le DIT. */
  let ticket = (e.ticket || []).map(Number).filter((n) => n > 0)
  let ticketReel = ticket.length > 0
  const cotesObj = (() => {
    const c = COTES[e.courseId]
    if (!c || !Array.isArray(c.cotes)) return null
    const o = {}
    for (const x of c.cotes) if (x && x.cote > 1) o[x.num] = { cote: x.cote, ouverture: x.ouverture }
    return Object.keys(o).length >= 10 ? o : null
  })()
  if (!ticketReel) {
    const classement = nums.map((n, i) => ({ p: { num: n }, place: i + 1 }))
    ticket = remplirGrille(grille, classement, null, cotesObj).ticket
  }

  /* la case de chaque cheval + son bloc */
  const caseDe = {}, blocDe = {}, quotaDe = {}
  for (const g of grille.groupes) {
    quotaDe[g.id] = g.obligatoire ? Math.max(1, g.quota) : g.quota
    for (const c of g.cases) { caseDe[c.num] = c.place; blocDe[c.num] = g.id }
  }
  const pris = new Set(ticket)
  const top5 = arr.slice(0, 5)
  const top3 = arr.slice(0, 3)
  const rm = cotesObj
    ? Object.fromEntries(nums.filter((n) => cotesObj[n]).sort((a, b) => cotesObj[a].cote - cotesObj[b].cote).map((n, k) => [n, k + 1]))
    : null
  const bandeDe = (n) => {
    if (!rm || rm[n] == null) return null
    const r = rm[n]
    return r <= 3 ? 'fort' : r <= 5 ? 'bon' : r <= 12 ? 'moyen' : 'faible'
  }

  /* ⭐ L'AUTOPSIE — chaque arrivant : pris ou coupé, et par qui */
  const detail = []
  for (const n of top5) {
    const g = blocDe[n] || null
    const dansTicket = pris.has(n)
    let remplacants = []
    if (!dansTicket && g) {
      remplacants = ticket.filter((t) => blocDe[t] === g)
    }
    detail.push({
      num: n,
      place: caseDe[n] ?? null,
      bloc: g,
      bande: bandeDe(n),
      pris: dansTicket,
      remplacants,
      remplacantsArrives: remplacants.filter((t) => top5.includes(t)),
      rang: top5.indexOf(n) + 1,
      podium: top3.includes(n),
    })
  }

  C.push({
    date: d,
    hippodrome: e.hippodrome,
    discipline: e.discipline,
    distance: e.distance,
    n: nums.length,
    grille,
    arrivee: top5,
    ticket,
    ticketReel,
    caseDe, blocDe, quotaDe,
    rm,
    detail,
    bilan: top5.filter((x) => pris.has(x)).length,
    bilan3: top3.filter((x) => pris.has(x)).length,
  })
}

console.log('\n  ══ LA BASSMAT DU MOIS — archive réelle ══')
console.log('  ' + C.length + ' Quintés joués (' + (C[0]?.date || '—') + ' → ' + (C[C.length - 1]?.date || '—') + ')' +
  (ecartees.length ? ' · ' + ecartees.length + ' écartée(s) : ' + ecartees.map((x) => x.date + ' (' + x.quoi + ')').join(', ') : ''))
console.log('  tickets réels archivés : ' + C.filter((c) => c.ticketReel).length + ' / ' + C.length)
const incomplets = C.filter((c) => c.ticket.length !== 8).map((c) => ({ date: c.date, n: c.ticket.length }))
if (incomplets.length) console.log('  ⚠ tickets qui ne font pas 8 chevaux dans l’archive : ' +
  incomplets.map((x) => x.date + ' (' + x.n + ')').join(', '))

/* ───────────────────────── ① les cases du mois ─────────────────────────── */
const MAXP = 20
const cases = Array.from({ length: MAXP }, (_, i) => ({ p: i + 1, n: 0, top5: 0, top3: 0, victoires: 0, pos: [0, 0, 0, 0, 0] }))
for (const c of C) {
  for (const p of new Set(Object.values(c.caseDe))) {
    if (p >= 1 && p <= MAXP) cases[p - 1].n++
  }
  c.arrivee.forEach((num, i) => {
    const p = c.caseDe[num]
    if (!p || p > MAXP) return
    const k = cases[p - 1]
    k.top5++
    if (i < 3) k.top3++
    if (i === 0) k.victoires++
    k.pos[i]++
  })
}
const pcTop5 = (k) => (k.n ? 100 * k.top5 / k.n : null)
const pcTop3 = (k) => (k.n ? 100 * k.top3 / k.n : null)
const pcPodTop5 = (k) => (k.top5 ? 100 * k.top3 / k.top5 : null)

console.log('\n  ① LES CASES DE CE MOIS (' + C.length + ' courses)')
console.log('  ' + pad('P', 4) + pad('courses', 9) + pad('top5', 7) + pad('top3', 7) + pad('1er', 6) + pad('%top5', 9) + '%top3')
for (const k of cases) {
  if (!k.n) continue
  console.log('  ' + pad('P' + k.p, 4) + pad(k.n, 9) + pad(k.top5, 7) + pad(k.top3, 7) + pad(k.victoires, 6) +
    pad(pct(k.top5, k.n), 9) + pct(k.top3, k.n))
}

/* ───────────────────────── ② les blocs du mois ─────────────────────────── */
const groupes = IDS.map((id) => ({ id, presence: 0, victoires: 0, podiums: 0, places45: 0, chevaux: 0, pris: 0, arrives: 0, coupes: 0 }))
for (const c of C) {
  const g5 = new Set(c.arrivee.map((n) => c.blocDe[n]))
  for (const g of groupes) if (g5.has(g.id)) g.presence++
  c.arrivee.forEach((num, i) => {
    const id = c.blocDe[num]
    const g = groupes.find((x) => x.id === id)
    if (!g) return
    if (i === 0) g.victoires++
    if (i < 3) g.podiums++
    if (i >= 3) g.places45++
  })
  /* les sièges réellement utilisés, par bloc */
  for (const g of groupes) g.chevaux += c.ticket.filter((n) => c.blocDe[n] === g.id).length
}
console.log('\n  ② LES BLOCS DE CE MOIS — sièges utilisés et rendement')
console.log('  ' + pad('bloc', 6) + pad('présence', 10) + pad('1ers', 7) + pad('podiums', 9) + pad('4e-5e', 8) + pad('sièges', 9) + 'arrivants pris / coupés')
for (const g of groupes) {
  let p = 0, co = 0
  for (const c of C) for (const d of c.detail) if (d.bloc === g.id) (d.pris ? p++ : co++)
  g.pris = p; g.coupes = co
  console.log('  ' + pad(g.id, 6) + pad(g.presence + '/' + C.length, 10) + pad(g.victoires, 7) + pad(g.podiums, 9) +
    pad(g.places45, 8) + pad(g.chevaux, 9) + p + ' / ' + co)
}

/* ───────────────────── ③ les empreintes du mois ────────────────────────── */
const motif = (c, ls) => IDS.map((id) => ls.filter((n) => c.blocDe[n] === id).length).join('·')
const compteMotif = (ls) => {
  const m = new Map()
  for (const c of C) {
    const k = motif(c, ls(c))
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()].map(([k, n]) => ({ k, n, pc: r1(100 * n / C.length) })).sort((a, b) => b.n - a.n)
}
const pod = compteMotif((c) => c.arrivee.slice(0, 3))
const qui = compteMotif((c) => c.arrivee.slice(0, 5))
const moyDe = (k) => Object.fromEntries(IDS.map((id) => {
  let s = 0
  for (const c of C) s += c.arrivee.slice(0, k).filter((n) => c.blocDe[n] === id).length
  return [id, r1(s / C.length)]
}))
const moyPod = moyDe(3)
const moyQui = moyDe(5)

console.log('\n  ③ L’EMPREINTE DU MOIS — le podium')
for (const x of pod.slice(0, 6)) console.log('  ' + pad(x.k, 14) + pad(x.n, 5) + x.pc + ' %')
console.log('  moyenne : ' + IDS.map((id) => id + ' ' + String(moyPod[id]).replace('.', ',')).join(' · '))
console.log('  L’EMPREINTE DU MOIS — le quinté')
for (const x of qui.slice(0, 6)) console.log('  ' + pad(x.k, 14) + pad(x.n, 5) + x.pc + ' %')
console.log('  moyenne : ' + IDS.map((id) => id + ' ' + String(moyQui[id]).replace('.', ',')).join(' · '))

/* ───────────────── ④ combien de cases pour tout tenir ───────────────────── */
const kTable = []
for (let k = 3; k <= 14; k++) {
  let np = 0, nq = 0
  for (const c of C) {
    const dedans = (n) => (c.caseDe[n] || 99) <= k
    if (c.arrivee.slice(0, 3).every(dedans)) np++
    if (c.arrivee.every(dedans)) nq++
  }
  kTable.push({ k, podium: r1(100 * np / C.length), quinte: r1(100 * nq / C.length) })
}
console.log('\n  ④ COMBIEN DE CASES POUR TOUT TENIR (ce mois)')
console.log('  ' + pad('P1..Pk', 8) + pad('podium', 9) + 'quinté')
for (const x of kTable) if ([8, 10, 12, 14].includes(x.k)) console.log('  ' + pad(x.k, 8) + pad(x.podium + ' %', 9) + x.quinte + ' %')

/* ───────────── ⑤ ⭐ OÙ LE TICKET A PERDU — l'autopsie du mois ──────────── */
let arrTot = 0, arrPris = 0, arrCoupes = 0, siegesMorts = 0, coupesAvecRemplacantMort = 0, coupesAvecRemplacantArrive = 0
const parBloc = Object.fromEntries(IDS.map((id) => [id, { coupes: 0, remplacantMort: 0, remplacantArrive: 0 }]))
const coupes = []
for (const c of C) {
  for (const d of c.detail) {
    arrTot++
    if (d.pris) { arrPris++; continue }
    arrCoupes++
    const b = d.bloc ? parBloc[d.bloc] : null
    const remplaceArrive = d.remplacantsArrives.length > 0
    if (b) {
      b.coupes++
      if (remplaceArrive) b.remplacantArrive++
      else b.remplacantMort++
    }
    if (remplaceArrive) coupesAvecRemplacantArrive++
    else { coupesAvecRemplacantMort++; siegesMorts++ }
    coupes.push({ date: c.date, num: d.num, place: d.place, bloc: d.bloc, bande: d.bande, remplacants: d.remplacants, remplacantsArrives: d.remplacantsArrives })
  }
}
console.log('\n  ⑤ ⭐ OÙ LE TICKET A PERDU (les 5 premiers de chaque course)')
console.log('  arrivants dans les 5 : ' + arrTot + ' · pris : ' + arrPris + ' (' + pct(arrPris, arrTot) + ') · coupés : ' + arrCoupes + ' (' + pct(arrCoupes, arrTot) + ')')
console.log('  parmi les coupés, le siège du bloc était occupé par un cheval NON arrivé : ' +
  coupesAvecRemplacantMort + ' (' + pct(coupesAvecRemplacantMort, arrCoupes) + ')')
console.log('\n  ' + pad('bloc', 6) + pad('coupés', 9) + pad('remplaçant mort', 17) + 'remplaçant arrivé')
for (const id of IDS) {
  const b = parBloc[id]
  console.log('  ' + pad(id, 6) + pad(b.coupes, 9) + pad(b.remplacantMort, 17) + b.remplacantArrive)
}

/* le bilan réel du mois */
const bilans = [0, 0, 0, 0, 0, 0]
for (const c of C) bilans[c.bilan]++
console.log('\n  BILAN RÉEL DES TICKETS — ' + C.map((c) => c.bilan).join(' '))
console.log('  ' + bilans.map((n, k) => k + '/5 : ' + n).join(' · ') +
  ' · moyenne ' + r1(C.reduce((s, c) => s + c.bilan, 0) / C.length))

/* ─────────────────── ⑥ case × bande du marché (si les cotes) ────────────── */
const BANDES = ['fort', 'bon', 'moyen', 'faible']
const bandes = []
for (const id of IDS) {
  const ligne = { id, cellules: [] }
  for (const b of BANDES) {
    let n = 0, n5 = 0
    for (const c of C) {
      for (const [num, bl] of Object.entries(c.blocDe)) {
        if (bl !== id) continue
        const bande = (() => {
          if (!cotesDispo(c)) return null
          const r = c.rm[num]
          return r == null ? null : r <= 3 ? 'fort' : r <= 5 ? 'bon' : r <= 12 ? 'moyen' : 'faible'
        })()
        if (bande !== b) continue
        n++
        if (c.arrivee.includes(Number(num))) n5++
      }
    }
    ligne.cellules.push({ bande: b, n, n5, pc: n ? r1(100 * n5 / n) : null })
  }
  bandes.push(ligne)
}
function cotesDispo(c) { return c.rm != null }

/* ─────────────────────────────── le verdict ─────────────────────────────── */
const pireBloc = IDS.map((id) => ({ id, ...parBloc[id] })).sort((a, b) => b.remplacantMort - a.remplacantMort)[0]
const verdict = 'Sur ' + C.length + ' Quintés joués, ' + arrPris + ' arrivants sur ' + arrTot + ' étaient dans le ticket (' +
  pct(arrPris, arrTot) + '). Les ' + arrCoupes + ' autres étaient DANS la grille : ' + coupesAvecRemplacantMort +
  ' fois (' + pct(coupesAvecRemplacantMort, arrCoupes) + '), le siège du bloc était pris par un cheval qui n’est pas arrivé — ' +
  'c’est exactement « le mauvais choix », et il se concentre en ' + pireBloc.id + ' (' + pireBloc.remplacantMort + ' cas).'

console.log('\n  ✓ ' + verdict + '\n')

/* ─────────────────────────────── l'artefact ────────────────────────────── */
const sortie = {
  quand: new Date().toISOString(),
  periode: { debut: C[0]?.date || null, fin: C[C.length - 1]?.date || null },
  n: C.length,
  ecartees,
  ticketsReels: C.filter((c) => c.ticketReel).length,
  ticketsIncomplets: incomplets,
  quotas: GROUPES.map((g) => g.quota),
  cases: cases.map((k) => ({
    p: k.p, n: k.n, top5: k.top5, top3: k.top3, victoires: k.victoires, pos: k.pos,
    pc_top5: r1(pcTop5(k) ?? 0), pc_top3: r1(pcTop3(k) ?? 0), pc_podium_top5: r1(pcPodTop5(k) ?? 0),
  })),
  groupes: groupes.map((g) => ({
    id: g.id, presence: g.presence, pcPresence: r1(100 * g.presence / C.length),
    victoires: g.victoires, podiums: g.podiums, places45: g.places45,
    sieges: g.chevaux, pris: g.pris, coupes: g.coupes,
    remplacantMort: parBloc[g.id].remplacantMort, remplacantArrive: parBloc[g.id].remplacantArrive,
  })),
  empreinte: { podium: pod, quinte: qui, moyPod, moyQui },
  k: kTable,
  bandes,
  pertes: {
    arrivees: arrTot, pris: arrPris, coupes: arrCoupes,
    remplacantMort: coupesAvecRemplacantMort, remplacantArrive: coupesAvecRemplacantArrive,
    pcPris: r1(100 * arrPris / arrTot), pcCoupes: r1(100 * arrCoupes / arrTot),
    pcRemplacantMort: r1(100 * coupesAvecRemplacantMort / arrCoupes),
    liste: coupes,
  },
  bilans,
  moyenneBilan: r1(C.reduce((s, c) => s + c.bilan, 0) / C.length),
  courses: C.map((c) => ({
    date: c.date, hippodrome: c.hippodrome, discipline: c.discipline, distance: c.distance,
    arrivee: c.arrivee, ticket: c.ticket, ticketReel: c.ticketReel, bilan: c.bilan,
    detail: c.detail,
  })),
  verdict,
}
fs.writeFileSync('data/bassmat-mois.json', JSON.stringify(sortie, null, 1))
try {
  fs.mkdirSync('public/data', { recursive: true })
  fs.writeFileSync('public/data/bassmat-mois.json', JSON.stringify(sortie, null, 1))
} catch { /* pas de page */ }
console.log('  artefact : data/bassmat-mois.json')
