/* =============================================================================
 * tools\selection-echarts.mjs — PEUT-ON CHOISIR MIEUX DANS LE BLOC AVEC
 *                                STATISTIQUES + ÉCARTS ? (08/11/2026)
 *
 * Demande de l'utilisateur : « cherche une méthode pour corriger la sélection
 * et dépasser les choix ratés, à partir de Statistiques, Écarts et Archive ».
 *
 * ⛔ Contrainte constitutionnelle (§11.49) : les quotas 3-2-1-1-1 NE BOUGENT
 *    PAS. On ne teste donc QUE le choix À L'INTÉRIEUR de chaque bloc.
 *
 * Ce que fait ce script, dans l'ordre :
 *
 *   ① L'AUTOPSIE DU REGISTRE (page Archive, 32 courses du site) : pour chaque
 *      arrivant perdu, il dit son bloc et si un quota l'a coupé.
 *   ② LE SIGNAL : parmi les cases qu'un bloc a COUPÉES, celles que la page
 *      Écarts dit « chaudes » arrivent-elles plus souvent que les autres ?
 *      (si non → Écarts ne peut pas servir à choisir, et on le dit)
 *   ③ LES RÈGLES : pour chaque bloc, on remplace le choix de production
 *      (carnet / marché / echange20) par une règle Écarts (série des 3
 *      dernières, % top-5, état) et on mesure — sur les 96 Quintés à presse
 *      réelle, puis sur chaque moitié chronologique.
 *
 * ⚠ Tout est calculé en LOO (leave-one-out) : les statistiques d'une course
 *   n'utilisent QUE les courses précédentes. La page, elle, affiche l'archive
 *   entière — c'est une fuite du futur ; ici on mesure ce qui sera jouable.
 *
 *   node tools\selection-echarts.mjs
 *   node tools\selection-echarts.mjs --detail
 * ========================================================================== */
import fs from 'node:fs'
import { buildGrid, GROUPES, remplirGrille } from '../src/lib/quinte.js'

const DETAIL = process.argv.includes('--detail')
const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
const ligne = (c = '─', n = 96) => c.repeat(n)

/* ═════════════════════════ ① LE REGISTRE DU SITE ══════════════════════════ */
const SYN = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const REG = Object.values(SYN).sort((a, b) => (a.date < b.date ? -1 : 1))
  .filter((r) => (r.arrivee || []).length >= 5 && (r.synthese || []).length >= 10)

const BLOC = (slot) => {
  const g = GROUPES.find((x) => slot >= x.min && slot <= x.max)
  return g ? g.id : '?'
}

function autopsie() {
  console.log('')
  console.log('① L\'AUTOPSIE DU REGISTRE — page Archive, ' + REG.length + ' courses avec arrivée')
  console.log(ligne())
  console.log(pad('date', 12) + pad('type', 9) + pad('arrivée', 20) + pad('P de l\'arrivée', 22) + 'perdus')
  console.log(ligne())

  const parBloc = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0, '?': 0 }
  const coupesParBloc = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0, '?': 0 }
  let totalPerdus = 0
  let totalArrivants = 0
  let coupes = 0
  const lignes = []

  for (const r of REG) {
    const presse = (r.synthese || []).map(Number).filter(Number.isFinite)
    const runners = (r.runners || []).map(Number).filter(Number.isFinite)
    const g = buildGrid(presse, runners)
    const ticket = new Set(r.ticket || [])
    if (!ticket.size) continue
    const arr = r.arrivee.slice(0, 5)
    totalArrivants += arr.length

    /* combien de cases le ticket a prises dans chaque bloc */
    const prisParBloc = {}
    for (const gr of g.groupes) {
      const prises = gr.cases.filter((c) => ticket.has(c.num))
      prisParBloc[gr.id] = prises.length
    }

    const ps = arr.map((n) => g.slotParNum[n])
    const perdus = []
    for (let k = 0; k < arr.length; k++) {
      const n = arr[k]
      if (ticket.has(n)) continue
      const slot = g.slotParNum[n]
      const bloc = slot ? BLOC(slot) : '?'
      parBloc[bloc]++
      totalPerdus++
      /* coupé = le bloc a atteint son quota et ce cheval n'est pas entré */
      const quotaBloc = (GROUPES.find((x) => x.id === bloc)?.quota) ?? 0
      const estCoupe = slot && (prisParBloc[bloc] >= quotaBloc)
      if (estCoupe) { coupes++; coupesParBloc[bloc]++ }
      perdus.push(`${n}·P${slot ?? '?'}·${bloc}${estCoupe ? '✂' : ''}`)
    }
    lignes.push({ r, arr, ps, perdus })
  }

  for (const L of lignes) {
    console.log(
      pad(L.r.date, 12) + pad(String(L.r.discipline || '—').slice(0, 8), 9) +
      pad(L.arr.join('-'), 20) +
      pad(L.ps.map((p) => (p == null ? '·' : 'P' + p)).join(' '), 22) +
      (L.perdus.length ? L.perdus.join('  ') : '—')
    )
  }

  console.log(ligne())
  console.log(`arrivants top-5 : ${totalArrivants} · perdus : ${totalPerdus} (${pct(totalPerdus, totalArrivants)}) · dont coupés par un quota : ${coupes} (${pct(coupes, totalPerdus)} des pertes)`)
  console.log('par bloc : ' + Object.entries(parBloc).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' · '))
  console.log('dont coupés : ' + Object.entries(coupesParBloc).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(' · '))
  console.log('✂ = le bloc avait déjà son quota rempli : le cheval était DANS la grille, choisi hors du bloc.')
  return { parBloc, coupesParBloc, totalPerdus, totalArrivants, coupes }
}

/* ═════════════════════ ② LE CORPUS DE MESURE (96) ═════════════════════════ */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const BRUT = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  BRUT.push({ q, nums, syn, cotes })
}

const C = BRUT.map((c) => {
  const grille = buildGrid(c.syn, c.nums)
  return { ...c, grille, arr: c.q.arrivee.slice(0, 5), date: c.q.date, disc: c.q.discipline }
})

/* ── les statistiques de case, en LOO (aucune course future) ─────────────── */
const FEAT = []
for (let i = 0; i < C.length; i++) {
  const acc = Array.from({ length: 21 }, () => ({ n: 0, h5: 0, h3: 0, h1: 0, serie: [] }))
  for (let j = 0; j < i; j++) {
    const c = C[j]
    for (const g of c.grille.groupes) {
      for (const x of g.cases) {
        if (!x.slot || x.slot > 20) continue
        const a = acc[x.slot]
        const ok5 = c.arr.includes(x.num)
        const ok3 = c.arr.slice(0, 3).includes(x.num)
        const ok1 = c.arr[0] === x.num
        a.n++
        if (ok5) a.h5++
        if (ok3) a.h3++
        if (ok1) a.h1++
        a.serie.push(ok5 ? 1 : 0)
      }
    }
  }
  const parSlot = []
  for (let p = 1; p <= 20; p++) {
    const a = acc[p]
    const s6 = a.serie.slice(-6)
    const s3 = a.serie.slice(-3)
    /* coursesDepuis : nombre de courses de cette case depuis son dernier top-5 */
    let depuis = null
    for (let k = a.serie.length - 1; k >= 0; k--) {
      if (a.serie[k]) { depuis = a.serie.length - 1 - k; break }
    }
    const pct5 = a.n ? a.h5 / a.n : null
    const etat = a.n < 2 ? 'neuf' : (depuis != null && depuis >= 5 ? 'froide'
      : ((pct5 != null && pct5 >= 0.4) || (depuis != null && depuis <= 1)) ? 'chaude' : 'tiede')
    parSlot[p] = { p, n: a.n, h5: a.h5, h3: a.h3, h1: a.h1, pct5, s3: s3.reduce((x, y) => x + y, 0), s6, depuis, etat }
  }
  FEAT.push(parSlot)
}

/* ── le choix d'un bloc, mode par mode ──────────────────────────────────── */
const ORDRE_ETAT = { chaude: 2, tiede: 1, froide: 0, neuf: 0 }
const cote = (c, n) => (c.cotes?.[n] > 1 ? c.cotes[n] : null)

function ordonner(c, i, cases, mode) {
  const f = (x) => FEAT[i][x.slot] || { n: 0, pct5: null, s3: 0, etat: 'neuf', depuis: null }
  const carnet = cases.slice().sort((a, b) => a.place - b.place)
  switch (mode) {
    case 'carnet':
      return carnet
    case 'marche': {
      const surMarche = cases.every((x) => cote(c, x.num) != null)
      if (!surMarche) return carnet
      return cases.slice().sort((a, b) => cote(c, a.num) - cote(c, b.num) || a.place - b.place)
    }
    case 'echange20': {
      const ordre = carnet.slice()
      if (cases.every((x) => cote(c, x.num) != null)) {
        for (let k = 0; k < ordre.length; k++) {
          let best = k
          for (let j = k + 1; j < ordre.length; j++) {
            const ci = cote(c, ordre[best].num) ?? 999
            const cj = cote(c, ordre[j].num) ?? 999
            if (cj * 2 <= ci) best = j
          }
          if (best !== k) { const x = ordre[k]; ordre[k] = ordre[best]; ordre[best] = x }
        }
      }
      return ordre
    }
    /* ── les règles issues d'ÉCARTS / STATISTIQUES ── */
    case 'serie':      /* la série des 3 dernières courses, puis le % top-5 */
      return cases.slice().sort((a, b) =>
        (f(b).s3 - f(a).s3) || ((f(b).pct5 ?? -1) - (f(a).pct5 ?? -1)) || a.place - b.place)
    case 'pct5':       /* le % de top-5 de la case, puis la série */
      return cases.slice().sort((a, b) =>
        ((f(b).pct5 ?? -1) - (f(a).pct5 ?? -1)) || (f(b).s3 - f(a).s3) || a.place - b.place)
    case 'etat':       /* chaude > tiède > froide, puis le carnet */
      return cases.slice().sort((a, b) =>
        ((ORDRE_ETAT[f(b).etat] ?? 0) - (ORDRE_ETAT[f(a).etat] ?? 0)) || a.place - b.place)
    case 'etat_pct':   /* chaud ET qui donne, puis le carnet */
      return cases.slice().sort((a, b) =>
        ((ORDRE_ETAT[f(b).etat] ?? 0) - (ORDRE_ETAT[f(a).etat] ?? 0)) ||
        ((f(b).pct5 ?? -1) - (f(a).pct5 ?? -1)) || a.place - b.place)
    /* ── la règle « ne coupe pas une chaude pour une froide » ── */
    default:
      return carnet
  }
}

/* ticket = la somme des quotas de chaque bloc, avec un mode par bloc */
function ticketDe(c, i, modes) {
  const out = []
  c.grille.groupes.forEach((g, k) => {
    const quota = Math.min(GROUPES[k].quota, g.cases.length)
    const ordre = ordonner(c, i, g.cases, modes[k])
    ordre.slice(0, quota).forEach((x) => out.push(x.num))
  })
  return [...new Set(out)]
}

/* la règle « anti-coupe », bloc par bloc : on ne sacrifie pas une case chaude
 * qui donne pour garder une case froide du même bloc. */
function ticketAntiCoupe(c, i, modes) {
  const out = []
  c.grille.groupes.forEach((g, k) => {
    const quota = Math.min(GROUPES[k].quota, g.cases.length)
    const ordre = ordonner(c, i, g.cases, modes[k])
    const pris = ordre.slice(0, quota)
    const reste = ordre.slice(quota)
    const f = (x) => FEAT[i][x.slot] || { pct5: null, s3: 0, etat: 'neuf', n: 0 }
    /* score de ce qu'on garde */
    const score = (x) => (ORDRE_ETAT[f(x).etat] ?? 0) * 10 + (f(x).s3 ?? 0) * 3 + (f(x).pct5 ?? 0)
    for (const cand of reste) {
      /* une case coupée qui donne mieux que le dernier pris */
      let pire = 0
      for (let k2 = 1; k2 < pris.length; k2++) if (score(pris[k2]) < score(pris[pire])) pire = k2
      if (score(cand) > score(pris[pire]) + 0.02) { pris[pire] = cand; break }
    }
    pris.forEach((x) => out.push(x.num))
  })
  return [...new Set(out)]
}

function noter(liste, fTicket) {
  let pod = 0, qui = 0, q4 = 0
  for (let i = 0; i < liste.length; i++) {
    const c = liste[i]
    const t = new Set(fTicket(c, i))
    if (c.arr.slice(0, 3).every((x) => t.has(x))) pod++
    if (c.arr.slice(0, 5).every((x) => t.has(x))) qui++
    if (c.arr.slice(0, 5).filter((x) => t.has(x)).length >= 4) q4++
  }
  return { pod, qui, q4, n: liste.length }
}

/* on mesure toujours sur la liste GLOBALE (l'index i sert au LOO) */
const idxDe = new Map(C.map((c, i) => [c, i]))

/* ── contrôle : ma réimplémentation reproduit-elle le vrai remplirGrille ? ── */
function verifProduction() {
  let identiques = 0
  for (let i = 0; i < C.length; i++) {
    const c = C[i]
    const cl = c.grille.groupes.flatMap((g) => g.cases).slice().sort((a, b) => a.slot - b.slot)
      .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
    const r = remplirGrille(c.grille, cl, c.disc, Object.fromEntries(Object.entries(c.cotes).map(([n, v]) => [n, { cote: v }])), null, null)
    const a = new Set(r.ticket)
    const b = new Set(ticketDe(c, i, ['carnet', 'carnet', 'echange20', 'marche', 'echange20']))
    if (a.size === b.size && [...a].every((x) => b.has(x))) identiques++
  }
  return identiques
}

/* ═══════════════════════════════ ② LE SIGNAL ══════════════════════════════ */
function signal() {
  /* Parmi les cases qu'un bloc a COUPÉES (au-delà du quota), celles qu'Écarts
   * dit « chaudes » arrivent-elles plus souvent ? Si le taux est le même que
   * pour les autres, la page Écarts ne peut pas servir à choisir. */
  const groupes = { chaude: [0, 0], tiede: [0, 0], froide: [0, 0], neuf: [0, 0] }
  let total = 0
  for (let i = 0; i < C.length; i++) {
    const c = C[i]
    c.grille.groupes.forEach((g, k) => {
      const quota = Math.min(GROUPES[k].quota, g.cases.length)
      const ordre = ordonner(c, i, g.cases, ['carnet', 'carnet', 'echange20', 'marche', 'echange20'][k])
      for (const x of ordre.slice(quota)) {
        const f = FEAT[i][x.slot]
        if (!f || f.n < 3) continue          // pas de statistique → non jugeable
        const e = f.etat
        groupes[e][1]++
        if (c.arr.includes(x.num)) groupes[e][0]++
        total++
      }
    })
  }
  console.log('')
  console.log('② LE SIGNAL — les cases COUPÉES par un quota, ' + total + ' cas sur 96 courses')
  console.log(ligne())
  console.log(pad('état (page Écarts)', 22) + padL('cas', 6) + padL('arrive top-5', 14) + padL('taux', 10))
  for (const [k, [hit, n]] of Object.entries(groupes)) {
    console.log(pad(k, 22) + padL(n, 6) + padL(hit, 14) + padL(pct(hit, n), 10))
  }
  const ch = groupes.chaude, fr = groupes.froide
  console.log('')
  console.log(`   chaude ${pct(ch[0], ch[1])} vs froide ${pct(fr[0], fr[1])} — c'est l'écart qui dirait si Écarts sait choisir.`)
  return groupes
}

/* ═══════════════════════════════ ③ LES RÈGLES ═════════════════════════════ */
const BASE = ['carnet', 'carnet', 'echange20', 'marche', 'echange20']
const AUTRES = ['marche', 'serie', 'pct5', 'etat', 'etat_pct', 'carnet']

function regles() {
  const mh = Math.floor(C.length / 2)
  const moities = [C.slice(0, mh), C.slice(mh)]
  const fBase = (c, i) => ticketDe(c, i, BASE)
  const base = noter(C, fBase)

  console.log('')
  console.log('③ LES RÈGLES — on ne change qu\'UN bloc à la fois (96 Quintés, LOO)')
  console.log(ligne())
  console.log(pad('production (référence)', 34) + padL('podium', 10) + padL('quinté', 10) + padL('≥4', 8) + padL('chev.', 8))
  console.log(pad('carnet · carnet · echange20 · marché · echange20', 34) +
    padL(pct(base.pod, base.n), 10) + padL(pct(base.qui, base.n), 10) + padL(pct(base.q4, base.n), 8) + padL('8', 8))

  const essais = []
  for (let k = 0; k < 5; k++) {
    for (const mode of AUTRES) {
      if (mode === BASE[k]) continue
      const modes = BASE.slice(); modes[k] = mode
      const r = noter(C, (c, i) => ticketDe(c, i, modes))
      const r1 = noter(moities[0], (c) => ticketDe(c, idxDe.get(c), modes))
      const r2 = noter(moities[1], (c) => ticketDe(c, idxDe.get(c), modes))
      const b1 = noter(moities[0], (c) => ticketDe(c, idxDe.get(c), BASE))
      const b2 = noter(moities[1], (c) => ticketDe(c, idxDe.get(c), BASE))
      essais.push({ k, mode, modes, r, r1, r2, b1, b2 })
    }
  }
  essais.sort((a, b) => (b.r.qui - a.r.qui) || (b.r.pod - a.r.pod))
  for (const e of essais) {
    const gainQ = e.r.qui - base.qui
    const gainP = e.r.pod - base.pod
    const signe = (x) => (x > 0 ? '+' + x : String(x))
    console.log(
      pad(`G${e.k + 1} → ${e.mode}`, 20) +
      padL(pct(e.r.pod, e.r.n), 12) + padL(pct(e.r.qui, e.r.n), 10) + padL(pct(e.r.q4, e.r.n), 8) +
      padL(signe(gainQ), 6) + padL(signe(gainP), 6)
    )
  }

  /* la règle anti-coupe, sur la base de production */
  const anti = noter(C, (c, i) => ticketAntiCoupe(c, i, BASE))
  const anti1 = noter(moities[0], (c) => ticketAntiCoupe(c, idxDe.get(c), BASE))
  const anti2 = noter(moities[1], (c) => ticketAntiCoupe(c, idxDe.get(c), BASE))
  console.log('')
  console.log(pad('anti-coupe (ne sacrifie pas une chaude)', 42) +
    padL(pct(anti.pod, anti.n), 12) + padL(pct(anti.qui, anti.n), 10) + padL(pct(anti.q4, anti.n), 8))
  console.log(pad('  1ʳᵉ moitié : production ' + pct(noter(moities[0], (c) => ticketDe(c, idxDe.get(c), BASE)).qui, moities[0].length) +
    ' → anti-coupe ' + pct(anti1.qui, anti1.n), 42))
  console.log(pad('  2ᵈᵉ moitié : production ' + pct(noter(moities[1], (c) => ticketDe(c, idxDe.get(c), BASE)).qui, moities[1].length) +
    ' → anti-coupe ' + pct(anti2.qui, anti2.n), 42))

  return { base, essais, anti }
}

/* ═════════════ ④ LE POUVOIR DE TRI D'UN SIGNAL (AUC) ══════════════════════ */
function aucs() {
  /* Pour chaque bloc et chaque signal : le signal sait-il ranger les cases du
   * bloc ? AUC = P(un arrivant top-5 mieux classé qu'un non-arrivant).
   *   0,50 = le hasard · 0,60 = un vrai pouvoir · 0,40 = il se trompe. */
  const SIGNAUX = [
    { id: 'carnet (place de presse)', sens: -1, f: (c, i, x) => x.place },
    { id: 'marché (la cote)', sens: -1, f: (c, i, x) => cote(c, x.num) ?? 999 },
    { id: 'série 3 dernières (Écarts)', sens: 1, f: (c, i, x) => (FEAT[i][x.slot]?.s3 ?? 0) },
    { id: '% top-5 de la case (Stats)', sens: 1, f: (c, i, x) => (FEAT[i][x.slot]?.pct5 ?? -1) },
    { id: 'état chaud/tiède/froid', sens: 1, f: (c, i, x) => ORDRE_ETAT[FEAT[i][x.slot]?.etat] ?? 0 },
    { id: 'victoires de la case', sens: 1, f: (c, i, x) => (FEAT[i][x.slot]?.h1 ?? 0) },
  ]
  console.log('')
  console.log('④ LE POUVOIR DE TRI DANS LE BLOC — AUC sur les 96 Quintés (0,50 = hasard)')
  console.log(ligne())
  console.log(pad('signal', 32) + ['G1', 'G2', 'G3', 'G4', 'G5'].map((x) => padL(x, 8)).join('') + padL('tout', 8))
  console.log(ligne())
  const res = {}
  for (const s of SIGNAUX) {
    res[s.id] = {}
    let tot = 0, totN = 0
    for (let k = 0; k < 5; k++) {
      let paires = 0, gagne = 0
      for (let i = 0; i < C.length; i++) {
        const c = C[i]
        const g = c.grille.groupes[k]
        if (!g) continue
        for (let a = 0; a < g.cases.length; a++) {
          for (let b = a + 1; b < g.cases.length; b++) {
            const x = g.cases[a], y = g.cases[b]
            const hx = c.arr.includes(x.num), hy = c.arr.includes(y.num)
            if (hx === hy) continue
            const sx = s.sens * s.f(c, i, x)
            const sy = s.sens * s.f(c, i, y)
            if (sx === sy) { gagne += 0.5; paires++; continue }
            const bon = hx ? sx > sy : sy > sx
            if (bon) gagne++
            paires++
          }
        }
      }
      res[s.id]['G' + (k + 1)] = paires ? gagne / paires : null
      tot += gagne; totN += paires
    }
    res[s.id].tout = totN ? tot / totN : null
    const f = (v) => (v == null ? '—' : v.toFixed(3).replace('.', ','))
    console.log(pad(s.id, 32) + ['G1', 'G2', 'G3', 'G4', 'G5'].map((x) => padL(f(res[s.id][x]), 8)).join('') + padL(f(res[s.id].tout), 8))
  }
  console.log('')
  console.log('Lecture : ≥ 0,60 = le signal range vraiment · 0,50–0,55 = bruit · < 0,50 = il se trompe.')
  return res
}

/* ═════════════ ⑤ ET SI ON JOUE DEUX TICKETS ? ════════════════════════════ */
function deuxTickets() {
  /* La seule façon de « rattraper » un cheval coupé sans élargir le ticket
   * unitaire : jouer un SECOND ticket de 8 qui échange UN cheval.
   * On mesure : « le 5/5 est dans au moins un des deux » — c'est-à-dire la
   * couverture réelle d'un joueur qui pose deux grilles. */
  const base = (c, i) => ticketDe(c, i, BASE)
  const echanger = (t, sortant, entrant) => [...t.filter((n) => n !== sortant), entrant]

  const scenarios = [
    { id: 'T1 seul (production)', f: (c, i) => [base(c, i)] },
    { id: 'T1 + le 4ᵉ de G2 (carnet)', f: (c, i) => {
      const t = base(c, i); const g = c.grille.groupes[1]
      const ordre = ordonner(c, i, g.cases, 'carnet'); const cand = ordre[Math.min(GROUPES[1].quota, g.cases.length)]
      if (!cand) return [t]
      const sortant = t.slice().sort((a, b) => (c.grille.parNum[b] - c.grille.parNum[a]))[0]
      return [t, echanger(t, sortant, cand.num)]
    } },
    { id: 'T1 + le 4ᵉ de G2 (Écarts)', f: (c, i) => {
      const t = base(c, i); const g = c.grille.groupes[1]
      const ordre = ordonner(c, i, g.cases, 'serie'); const cand = ordre[Math.min(GROUPES[1].quota, g.cases.length)]
      if (!cand) return [t]
      const sortant = t.slice().sort((a, b) => (c.grille.parNum[b] - c.grille.parNum[a]))[0]
      return [t, echanger(t, sortant, cand.num)]
    } },
    { id: 'T1 + le 4ᵉ de G1 (carnet)', f: (c, i) => {
      const t = base(c, i); const g = c.grille.groupes[0]
      const ordre = ordonner(c, i, g.cases, 'carnet'); const cand = ordre[Math.min(GROUPES[0].quota, g.cases.length)]
      if (!cand) return [t]
      const sortant = t.slice().sort((a, b) => (c.grille.parNum[b] - c.grille.parNum[a]))[0]
      return [t, echanger(t, sortant, cand.num)]
    } },
    { id: 'T1 + 4ᵉ G1 + 3ᵉ G2 (10)', f: (c, i) => {
      const t = base(c, i)
      const g1 = ordonner(c, i, c.grille.groupes[0].cases, 'carnet')[Math.min(GROUPES[0].quota, c.grille.groupes[0].cases.length)]
      const g2 = ordonner(c, i, c.grille.groupes[1].cases, 'carnet')[Math.min(GROUPES[1].quota, c.grille.groupes[1].cases.length)]
      const extra = [g1?.num, g2?.num].filter((x) => x != null && !t.includes(x))
      const out = [t, [...t, ...extra]]
      return out
    } },
    /* ── TÉMOIN : n'importe quel cheval de plus ─────────────────────────── */
    { id: 'T1 + le 2ᵉ de G5 (témoin)', f: (c, i) => {
      const t = base(c, i); const g = c.grille.groupes[4]
      const ordre = ordonner(c, i, g.cases, 'carnet'); const cand = ordre[Math.min(GROUPES[4].quota, g.cases.length)]
      if (!cand) return [t]
      const sortant = t.slice().sort((a, b) => (c.grille.parNum[b] - c.grille.parNum[a]))[0]
      return [t, echanger(t, sortant, cand.num)]
    } },
  ]

  console.log('')
  console.log('⑤ DEUX TICKETS AU LIEU D\'UN — le 5/5 est-il dans l\'un des deux ?')
  console.log(ligne())
  console.log(pad('scénario', 34) + padL('podium', 10) + padL('quinté', 10) + padL('≥4', 8) + padL('chevaux', 10))
  for (const s of scenarios) {
    let pod = 0, qui = 0, q4 = 0, ch = 0
    for (let i = 0; i < C.length; i++) {
      const c = C[i]
      const ts = s.f(c, i).map((t) => new Set(t))
      ch += ts[0].size
      if (ts.some((t) => c.arr.slice(0, 3).every((x) => t.has(x)))) pod++
      if (ts.some((t) => c.arr.slice(0, 5).every((x) => t.has(x)))) qui++
      if (ts.some((t) => c.arr.slice(0, 5).filter((x) => t.has(x)).length >= 4)) q4++
    }
    console.log(pad(s.id, 34) + padL(pct(pod, C.length), 10) + padL(pct(qui, C.length), 10) +
      padL(pct(q4, C.length), 8) + padL((ch / C.length).toFixed(1) + ' / ticket', 10))
  }
}

/* ═════════════ ⑥ VALIDATION SUR LE REGISTRE DU SITE (Oct–Nov) ════════════ */
function validerRegistre() {
  /* Corpus INDÉPENDANT de la mesure : les 32 courses du registre du site
   * (2026-10-01 → 2026-11-07), avec leur ticket RÉEL. On ajoute UN cheval,
   * le 4ᵉ de G1 ou le 3ᵉ de G2 au carnet, et on regarde si le 5/5 tombe.
   * Aucune statistique n'est utilisée : c'est un simple test de couverture. */
  const sc = { T1: 0, 'T1+4e G1': 0, 'T1+3e G2': 0, 'T1+4e G1+3e G2': 0, 'T1+4e G2': 0, 'T1+2e G5': 0 }
  let n = 0
  for (const r of REG) {
    if (!(r.ticket || []).length) continue
    const g = buildGrid((r.synthese || []).map(Number), (r.runners || []).map(Number))
    const t1 = new Set(r.ticket)
    const arr = r.arrivee.slice(0, 5)
    n++
    const sel = (gi, quota) => {
      const gr = g.groupes[gi]
      const ordre = gr.cases.slice().sort((a, b) => a.place - b.place)   // carnet
      return ordre[quota]?.num
    }
    const g1_4 = sel(0, 3)
    const g2_3 = sel(1, 2)
    const g2_4 = sel(1, 3)
    const ok = (s) => arr.every((x) => s.has(x))
    if (ok(t1)) sc.T1++
    if (g1_4 != null && ok(new Set([...t1, g1_4]))) sc['T1+4e G1']++
    if (g2_3 != null && ok(new Set([...t1, g2_3]))) sc['T1+3e G2']++
    if (g2_4 != null && ok(new Set([...t1, g2_4]))) sc['T1+4e G2']++
    if (g1_4 != null && g2_3 != null && ok(new Set([...t1, g1_4, g2_3]))) sc['T1+4e G1+3e G2']++
    const g5_2 = sel(4, 1)
    if (g5_2 != null && ok(new Set([...t1, g5_2]))) sc['T1+2e G5']++
  }
  console.log('')
  console.log('⑥ VALIDATION SUR LE REGISTRE DU SITE — ' + n + ' courses (2026-10-01 → 2026-11-07)')
  console.log(ligne())
  console.log(pad('ticket joué', 30) + padL('chevaux', 9) + padL('5/5', 8) + padL('taux', 9))
  const ordre = ['T1', 'T1+4e G1', 'T1+3e G2', 'T1+4e G2', 'T1+4e G1+3e G2', 'T1+2e G5']
  const taille = { T1: 8, 'T1+4e G1': 9, 'T1+3e G2': 9, 'T1+4e G2': 9, 'T1+4e G1+3e G2': 10, 'T1+2e G5': 9 }
  for (const k of ordre) {
    console.log(pad(k, 30) + padL(taille[k], 9) + padL(sc[k], 8) + padL(pct(sc[k], n), 9))
  }
}

/* ══════════════════════════════════ MAIN ═════════════════════════════════ */
console.log('')
console.log('SELECTION & ÉCARTS — mesuré le ' + new Date().toISOString().slice(0, 10))
console.log('corpus : ' + C.length + ' Quintés à presse réelle + cotes (' + C[0].date + ' → ' + C[C.length - 1].date + ')')
console.log('registre du site : ' + REG.length + ' courses avec arrivée')
console.log('production reproduite à l\'identique sur ' + verifProduction() + '/' + C.length + ' courses ✅')

autopsie()
signal()
regles()
aucs()
deuxTickets()
validerRegistre()

console.log('')
console.log('⚠ LOO : chaque course est jugée avec les statistiques des courses PRÉCÉDENTES seulement.')
console.log('')
