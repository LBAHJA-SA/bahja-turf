/* =============================================================================
 * tools/bloc-pm.mjs — LA BASSMAT DU BLOC : (case × bande de marché)  21/10/2026
 *
 * Demande de l'utilisateur :
 *   « نبنيو بصمة (P × bande M) ديال البلوگ و نقيسوها على 96 كورس
 *     (podium entier / quinté entier). »
 *
 * POURQUOI CE N'EST PAS LA BASSMAT DE §15.8.
 *   §15.8 compte les chevaux par GROUPE (G1..G5) : « le podium prend 1,5 de G1 ».
 *   Ici on croise la CASE (P1..P20, le P de la grille) avec la BANDE DU MARCHÉ
 *   (`bandeMarche` : M≤3 · M≤5 · M6-12 · M13+). C'est la seule table qui dit
 *   QUI prendre À L'INTÉRIEUR d'un bloc :
 *
 *       dans G1, la case P2 en bande « moyen » arrive-t-elle plus souvent
 *       que la case P3 en bande « fort » ?
 *
 *   §11.16 avait mesuré la case SEULE (sur 4 courses) et n'avait rien trouvé.
 *   Le croisement avec le marché est l'information qui manquait.
 *
 * CE QUI EST MESURÉ — le PODIUM ENSEMBLE et le QUINTÉ ENSEMBLE (§11.25).
 *   Jamais cheval par cheval : l'événement dense se lit, l'événement rare paie.
 *   Les 3 premiers tous dans le ticket · les 5 premiers tous dans le ticket.
 *
 * LA RÈGLE ÉPROUVÉE (le vote, façon ALFARAJ) :
 *   score(cheval) = rétrécissement bayésien de son taux de top-5 mesuré sur
 *   les AUTRES courses (leave-one-out), avec le taux du bloc comme a priori :
 *
 *       score = (K · taux_bloc + n · taux_cellule) / (K + n)        K = 10
 *
 *   Puis le bloc est rempli par ce score, départagé par le carnet (place de
 *   presse). Sans marché complet sur le bloc, la règle retombe sur le carnet.
 *
 * PROTOCOLE — les mêmes garde-fous que §11.24 / §11.26 :
 *   · leave-one-out : la table d'une course ne contient JAMAIS cette course ;
 *   · deux moitiés chronologiques : une règle doit gagner des DEUX côtés ;
 *   · hors échantillon : la règle choisie sur une moitié est notée sur l'autre ;
 *   · bootstrap apparié (10 000) sur l'événement qui PAIE — le quinté complet.
 *
 * ⚠ 96 courses = 96 événements. §11.24 a montré qu'on ne peut PAS apprendre une
 *   règle sur ça : ce fichier mesure 6 règles déclarées d'avance, il n'en
 *   cherche pas 3 000. Le verdict est « battue ou pas », jamais « trouvée ».
 *
 *   node tools\bloc-pm.mjs
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'
import { buildGrid, remplirGrille, bandeMarche, GROUPES } from '../src/lib/quinte.js'

const RACINE = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const lire = (p) => JSON.parse(fs.readFileSync(path.join(RACINE, p), 'utf8'))
const arr = (x) => (Array.isArray(x) ? x : [])
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
const coteDe = (cotes, n) => {
  const v = cotes?.[n]
  const x = Number(typeof v === 'object' ? v?.cote : v)
  return Number.isFinite(x) && x > 0 ? x : null
}

const K = 10                       // le poids de l'a priori (rétrécissement bayésien)
const BANDES = ['fort', 'bon', 'moyen', 'faible']
const BLOCS = ['G1', 'G2', 'G3', 'G4', 'G5']
const blocDeCase = (p) => (p <= 4 ? 'G1' : p <= 8 ? 'G2' : p <= 10 ? 'G3' : p <= 12 ? 'G4' : 'G5')

/* ── 1. LE CORPUS — les 96 Quintés à presse RÉELLE (même filtre que §15.8) ── */
const TOUT = lire('data/quintes.json')
const courses = []
for (const q of TOUT) {
  const presse = arr(q.presse).filter(Number.isFinite)
  const arrivee = arr(q.arrivee).filter((n) => Number.isFinite(n) && n > 0)
  const cotes = q.cotes || {}
  const nums = Object.keys(cotes).map(Number).filter((n) => coteDe(cotes, n) != null)
  if (presse.length < 10 || arrivee.length < 5 || nums.length < 10) continue
  const presseU = presse.filter((n) => nums.includes(n))
  if (presseU.length < 10) continue
  let g
  try { g = buildGrid(presseU, nums) } catch { continue }
  const ordreMarche = nums.slice().sort((a, b) => coteDe(cotes, a) - coteDe(cotes, b) || a - b)
  const rangM = Object.fromEntries(ordreMarche.map((n, i) => [n, i + 1]))
  const chevaux = nums.map((n) => ({
    n,
    place: g.parNum[n] ?? null,        // le CARNET : place de presse P1..P20
    case: g.slotParNum[n] ?? null,     // la CASE de la grille (le P affiché)
    bande: bandeMarche(rangM[n]),
    bloc: blocDeCase(g.slotParNum[n]),
    t3: arrivee.slice(0, 3).includes(n),
    t5: arrivee.slice(0, 5).includes(n),
  })).filter((c) => c.case != null && c.bande && c.place != null)
  courses.push({ date: q.date, discipline: q.discipline, g, cotes, nums, arrivee, chevaux })
}
courses.sort((a, b) => String(a.date).localeCompare(String(b.date)))
const N = courses.length

/* ── 2. LES DEUX TABLES (la bassmat) — cellule = n · %top3 · %top5 ────────── */
const table = (cles, filtre) => {
  const m = new Map()
  for (const c of courses) for (const h of c.chevaux) {
    if (filtre && !filtre(h)) continue
    const k = cles(h)
    if (k == null) continue
    const e = m.get(k) || { n: 0, t3: 0, t5: 0 }
    e.n++; if (h.t3) e.t3++; if (h.t5) e.t5++
    m.set(k, e)
  }
  return m
}
/* leave-one-out : la table construite SANS la course `i` */
const tableSans = (cles, i, filtre) => {
  const m = new Map()
  for (let j = 0; j < N; j++) {
    if (j === i) continue
    for (const h of courses[j].chevaux) {
      if (filtre && !filtre(h)) continue
      const k = cles(h)
      if (k == null) continue
      const e = m.get(k) || { n: 0, t3: 0, t5: 0 }
      e.n++; if (h.t3) e.t3++; if (h.t5) h.t5 && e.t5++
      m.set(k, e)
    }
  }
  return m
}

const cleBloc = (h) => (h.bloc && h.bande ? h.bloc + '|' + h.bande : null)
const cleCase = (h) => (h.case != null && h.bande ? h.case + '|' + h.bande : null)
const cleBlocSeul = (h) => h.bloc || null

const T_BLOC = table(cleBloc)
const T_CASE = table(cleCase)
const T_BLOC_SEUL = table(cleBlocSeul)

/* ── 3. LES RÈGLES DÉCLARÉES D'AVANCE ─────────────────────────────────────── */
const classementDe = (c, ordre) => ordre.map((n) => ({ p: { num: n }, s: null, ok: true }))
/* l'ordre « carnet » : la place de presse */
const parCarnet = (c) => c.chevaux.slice().sort((a, b) => a.place - b.place).map((h) => h.n)
const parMarche = (c) => c.nums.slice().sort((a, b) => coteDe(c.cotes, a) - coteDe(c.cotes, b) || a - b)

/**
 * Le score d'une cellule, rétréci vers l'a priori.
 * `taux(t, k, champ)` → (K·pct_bloc + n·pct_cellule) / (K + n)
 */
const tauxReel = (t, k, champ, aPriori) => {
  const e = k != null ? t.get(k) : null
  const n = e?.n || 0
  const cell = n ? e[champ] / n : 0
  return (K * aPriori + n * cell) / (K + n)
}
const aPrioriBloc = (tBlocSeul, h) => {
  const e = tBlocSeul.get(h.bloc)
  return e && e.n ? e.t5 / e.n : 0.3
}
/* l'ordre par la bassmat : score décroissant, puis le carnet (place) */
const parBassmat = (c, i, cles, champ, aPrioriCellule) => {
  const tb = tableSans(cles, i)
  const ts = tableSans(cleBlocSeul, i)
  const tbCellules = aPrioriCellule ? tableSans(cleBloc, i) : null
  return c.chevaux.slice().sort((x, y) => {
    const prio = (h) => (aPrioriCellule ? tauxReel(tbCellules, cleBloc(h), champ, aPrioriBloc(ts, h)) : aPrioriBloc(ts, h))
    const sx = tauxReel(tb, cles(x), champ, prio(x))
    const sy = tauxReel(tb, cles(y), champ, prio(y))
    return sy - sx || x.place - y.place
  }).map((h) => h.n)
}

const REGLES = [
  { code: 'production', nom: `le moteur — ${GROUPES.map((g) => g.quota).join('-')} (G1-G3 carnet · G4-G5 marché)`, f: () => null },
  { code: 'carnet', nom: 'le carnet partout, G5 compris', f: () => ({ G1: 'carnet', G2: 'carnet', G3: 'carnet', G4: 'carnet', G5: 'carnet' }) },
  { code: 'marche', nom: 'le marché partout (la cote)', f: () => ({ G1: 'marche', G2: 'marche', G3: 'marche', G4: 'marche', G5: 'marche' }) },
  { code: 'blocM', nom: 'BASSMAT bloc × bande (top-5, LOO)', f: (c, i) => ({ G1: 'ordre', G2: 'ordre', G3: 'ordre', G4: 'ordre', G5: 'ordre' }), ordre: (c, i) => parBassmat(c, i, cleBloc, 't5', false) },
  { code: 'caseM', nom: 'BASSMAT case × bande (top-5, LOO)', f: () => ({ G1: 'ordre', G2: 'ordre', G3: 'ordre', G4: 'ordre', G5: 'ordre' }), ordre: (c, i) => parBassmat(c, i, cleCase, 't5', true) },
  { code: 'caseM3', nom: 'BASSMAT case × bande (top-3, LOO)', f: () => ({ G1: 'ordre', G2: 'ordre', G3: 'ordre', G4: 'ordre', G5: 'ordre' }), ordre: (c, i) => parBassmat(c, i, cleCase, 't3', true) },
  /* ⚠ Les cellules de G3/G4/G5 « fort »/« bon » ont n = 2 à 14 : trop peu pour
   * voter. La bassmat n'est utilisée QUE là où elle est mesurée — G1 et G2. */
  { code: 'blocM12', nom: 'BASSMAT bloc × bande — seulement G1·G2', f: () => ({ G1: 'ordre', G2: 'ordre' }), ordre: (c, i) => parBassmat(c, i, cleBloc, 't5', false) },
  { code: 'caseM12', nom: 'BASSMAT case × bande — seulement G1·G2', f: () => ({ G1: 'ordre', G2: 'ordre' }), ordre: (c, i) => parBassmat(c, i, cleCase, 't5', true) },
]

/* ── 4. LE TICKET DE CHAQUE COURSE POUR CHAQUE RÈGLE (le VRAI remplirGrille) ─ */
const tickets = {}   // code → [ Set(num) par course ]
const details = {}   // code → [ detail du remplirGrille ] — pour l'autopsie des échanges
for (const r of REGLES) {
  tickets[r.code] = []
  details[r.code] = []
  courses.forEach((c, i) => {
    const choix = r.f(c, i)
    const ordre = r.ordre ? r.ordre(c, i) : parCarnet(c)
    const cls = classementDe(c, ordre)
    const cotes = Object.fromEntries(c.nums.map((n) => [n, { cote: coteDe(c.cotes, n) }]))
    try {
      const { ticket, detail } = remplirGrille(c.g, cls, c.discipline, cotes, null, choix)
      tickets[r.code].push(new Set(ticket))
      details[r.code].push(detail)
    } catch (e) {
      tickets[r.code].push(new Set())
      details[r.code].push(null)
    }
  })
}

/* ── 5. LA MESURE — podium ENTIER, quinté ENTIER (§11.25) ────────────────── */
const mesureDe = (code, idx) => {
  let pod = 0, qui = 0, q4 = 0, ch = 0
  for (const i of idx) {
    const t = tickets[code][i]
    const a = courses[i].arrivee
    ch += t.size
    if (a.slice(0, 3).every((x) => t.has(x))) pod++
    if (a.slice(0, 5).every((x) => t.has(x))) qui++
    if (a.slice(0, 5).filter((x) => t.has(x)).length >= 4) q4++
  }
  const n = idx.length || 1
  return { chevaux: +(ch / n).toFixed(2), podium: pct(pod, n), quinte: pct(qui, n), quatre: pct(q4, n) }
}
const tous = [...Array(N).keys()]
const mid = Math.floor(N / 2)
const MOITIE1 = tous.slice(0, mid)
const MOITIE2 = tous.slice(mid)

const mesure = REGLES.map((r) => {
  const f = mesureDe(r.code, tous)
  const m1 = mesureDe(r.code, MOITIE1)
  const m2 = mesureDe(r.code, MOITIE2)
  return {
    code: r.code, nom: r.nom,
    ...f,
    m1p: m1.podium, m1q: m1.quinte, m2p: m2.podium, m2q: m2.quinte,
  }
})

/* ── 6. BOOTSTRAP APPARIÉ sur l'événement qui PAIE (le quinté complet) ────── */
const boot = (code) => {
  const ref = tickets.production, alt = tickets[code]
  let mieux = 0, pire = 0, egal = 0
  const diffs = []
  const T = 10000
  for (let t = 0; t < T; t++) {
    let a = 0, b = 0, dAlt = 0, dRef = 0
    for (let i = 0; i < N; i++) {
      const k = (Math.random() * N) | 0
      const cours = courses[k]
      const q = cours.arrivee.slice(0, 5)
      if (q.every((x) => alt[k].has(x))) a++
      if (q.every((x) => ref[k].has(x))) b++
      dAlt += q.filter((x) => alt[k].has(x)).length
      dRef += q.filter((x) => ref[k].has(x)).length
    }
    if (a > b) mieux++; else if (a < b) pire++; else egal++
    diffs.push((dAlt - dRef) / N)
  }
  diffs.sort((x, y) => x - y)
  const moy = diffs.reduce((s, x) => s + x, 0) / T
  return {
    code,
    mieux: pct(mieux, T), pire: pct(pire, T), egal: pct(egal, T),
    chevauxMoy: +moy.toFixed(3),
    chevauxIC90: [+diffs[Math.floor(T * 0.05)].toFixed(3), +diffs[Math.floor(T * 0.95)].toFixed(3)],
  }
}
const bootstraps = REGLES.filter((r) => r.code !== 'production').map((r) => boot(r.code))

/* ── 7. HORS ÉCHANTILLON — choisi sur une moitié, noté sur l'autre ───────── */
const meilleurSur = (idx) => REGLES.filter((r) => r.code !== 'production')
  .map((r) => ({ code: r.code, nom: r.nom, m: mesureDe(r.code, idx) }))
  .sort((a, b) => b.m.quinte - a.m.quinte || b.m.podium - a.m.podium)[0]
const hA = meilleurSur(MOITIE1), hB = meilleurSur(MOITIE2)
const horsEchantillon = {
  moitie1: { choisi: hA.nom, code: hA.code, surSaMoitie: hA.m.quinte, surLAutre: mesureDe(hA.code, MOITIE2).quinte },
  moitie2: { choisi: hB.nom, code: hB.code, surSaMoitie: hB.m.quinte, surLAutre: mesureDe(hB.code, MOITIE1).quinte },
  production: { moitie1: mesureDe('production', MOITIE1).quinte, moitie2: mesureDe('production', MOITIE2).quinte },
}

/* ── 7 bis. L'AUTOPSIE DES ÉCHANGES — la bassmat change-t-elle le bloc ? ───
 * Si un bloc est rempli à l'identique par la bassmat et par la production, la
 * règle ne peut RIEN gagner : elle ne fait que confirmer. C'est le premier
 * chiffre à lire avant de conclure « la bassmat ne sert à rien ».
 * Pour les courses où les deux divergent, on compte les arrivants du top 5
 * couverts par chacune : c'est le seul endroit où l'échange se juge. */
const autopsie = (code) => {
  const parBloc = {}
  for (const b of BLOCS) parBloc[b] = { bloc: b, changes: 0, bassmat: 0, production: 0, arrives: 0 }
  const coursesTouchees = new Set()
  if (!details[code] || !details.production) return { blocs: [], cours: N, coursesChangees: 0, blocsChanges: 0 }
  for (let i = 0; i < N; i++) {
    const da = details[code][i], dp = details.production[i]
    if (!da || !dp) continue
    for (const b of BLOCS) {
      const ga = da.find((g) => g.id === b), gp = dp.find((g) => g.id === b)
      if (!ga || !gp) continue
      const setA = new Set(ga.cases.filter((c) => c.pris).map((c) => c.num))
      const setP = new Set(gp.cases.filter((c) => c.pris).map((c) => c.num))
      const ka = [...setA].sort((x, y) => x - y).join(','), kp = [...setP].sort((x, y) => x - y).join(',')
      if (ka === kp) continue
      const q = courses[i].arrivee.slice(0, 5)
      parBloc[b].changes++
      parBloc[b].bassmat += q.filter((x) => setA.has(x)).length
      parBloc[b].production += q.filter((x) => setP.has(x)).length
      parBloc[b].arrives += q.length
      coursesTouchees.add(i)
    }
  }
  const blocs = Object.values(parBloc).map((x) => ({ ...x, cours: N }))
  return {
    blocs,
    cours: N,
    coursesChangees: coursesTouchees.size,
    blocsChanges: blocs.reduce((s, x) => s + x.changes, 0),
  }
}
const autopsies = REGLES.filter((r) => r.ordre).map((r) => ({ code: r.code, nom: r.nom, ...autopsie(r.code) }))

/* ── 8. L'ARTEFACT ───────────────────────────────────────────────────────── */
const cellulesDe = (t, cles, clesPossibles) => clesPossibles.map((k) => {
  const e = t.get(k)
  return { cle: k, n: e?.n || 0, top3: pct(e?.t3 || 0, e?.n || 0), top5: pct(e?.t5 || 0, e?.n || 0) }
}).filter((x) => x.n > 0)

const out = {
  outil: 'tools/bloc-pm.mjs',
  le: new Date().toISOString().slice(0, 10),
  source: 'data/quintes.json — la presse réelle (presse ≥ 10 citations + cotes complètes + arrivée)',
  legende: 'P = la CASE de la grille (P1..P20, le même P que la page) · bande = bandeMarche(rang de cote) : M≤3 fort · M≤5 bon · M6-12 moyen · M13+ faible.',
  n: N,
  periode: { debut: courses[0]?.date || null, fin: courses[N - 1]?.date || null },
  bassmatBloc: cellulesDe(T_BLOC, cleBloc, BLOCS.flatMap((b) => BANDES.map((x) => b + '|' + x))),
  bassmatCase: cellulesDe(T_CASE, cleCase, Array.from({ length: 20 }, (_, k) => k + 1)
    .flatMap((p) => BANDES.map((x) => p + '|' + x))),
  bassmatBlocSeul: cellulesDe(T_BLOC_SEUL, cleBlocSeul, BLOCS),
  mesure,
  horsEchantillon,
  bootstrap: bootstraps,
  autopsies,
  verdict: null,
}
{
  const prod = mesure.find((m) => m.code === 'production')
  const b = bootstraps.find((x) => x.code === 'caseM') || bootstraps[0]
  const bat = (m) => m.podium > prod.podium && m.quinte > prod.quinte
  const tient = mesure.filter((m) => m.code !== 'production' && bat(m)
    && (m.m1p > prod.m1p || m.m1q > prod.m1q) && (m.m2p > prod.m2p || m.m2q > prod.m2q))
  out.verdict = {
    production: { podium: prod.podium, quinte: prod.quinte },
    vainqueurs_toutes_metriques: tient.map((m) => m.code),
    meilleur_quinte: mesure.filter((m) => m.code !== 'production')
      .slice().sort((a, b2) => b2.quinte - a.quinte)[0].code,
    horsEchantillon_le_choix_perd: horsEchantillon.moitie1.surLAutre < horsEchantillon.production.moitie2
      || horsEchantillon.moitie2.surLAutre < horsEchantillon.production.moitie1,
    texte: tient.length
      ? 'Au moins une règle de bassmat bat la production sur le podium ET le quinté, dans les deux moitiés.'
      : 'Aucune règle de bassmat ne bat la production sur le podium ET le quinté dans les deux moitiés — la mesure ne permet pas de conclure.',
  }
}

fs.writeFileSync(path.join(RACINE, 'data', 'bloc-pm.json'), JSON.stringify(out))
fs.writeFileSync(path.join(RACINE, 'public', 'data', 'bloc-pm.json'), JSON.stringify(out))

/* ── 9. LE RAPPORT ───────────────────────────────────────────────────────── */
const L = (s, n) => String(s).padEnd(n)
const R = (s, n) => String(s).padStart(n)
const nb = (x) => String(x).replace('.', ',')

console.log('\n  BASSMAT DU BLOC (case × bande de marché) — ' + N + ' Quintés à presse réelle')
console.log('  ' + out.periode.debut + ' → ' + out.periode.fin + '\n')

console.log('  LA BASSMAT — par BLOC et par bande du marché')
console.log('  ' + L('', 8) + BANDES.map((b) => R(b, 18)).join(''))
for (const b of BLOCS) {
  let ligne = '  ' + L(b, 8)
  for (const x of BANDES) {
    const c = out.bassmatBloc.find((y) => y.cle === b + '|' + x)
    ligne += R(c ? nb(c.n) + ' · ' + nb(c.top5) + ' %' : '—', 18)
  }
  console.log(ligne)
}
console.log('  (n · % arrivés dans les 5)')

console.log('\n  LA BASSMAT — par CASE (P1..P20) et par bande du marché')
console.log('  ' + L('', 8) + BANDES.map((b) => R(b, 18)).join(''))
for (let p = 1; p <= 20; p++) {
  const l = out.bassmatCase.filter((c) => c.cle.startsWith(p + '|'))
  if (!l.length) continue
  let ligne = '  P' + L(p, 7)
  for (const x of BANDES) {
    const c = out.bassmatCase.find((y) => y.cle === p + '|' + x)
    ligne += R(c ? nb(c.n) + ' · ' + nb(c.top5) + ' %' : '—', 18)
  }
  console.log(ligne)
}

console.log('\n  LA MESURE — les mêmes quotas (' + GROUPES.map((g) => g.quota).join('-') + '), seule la règle de choix change')
console.log('  ' + L('règle', 44) + R('chev.', 7) + R('podium entier', 15) + R('quinté entier', 15) + R('≥4', 8) + R('1re moitié', 14) + R('2ᵉ moitié', 14))
for (const m of mesure) {
  console.log('  ' + L(m.nom, 44) + R(nb(m.chevaux), 7) + R(nb(m.podium) + ' %', 15) + R(nb(m.quinte) + ' %', 15)
    + R(nb(m.quatre) + ' %', 8) + R(nb(m.m1q) + ' %', 14) + R(nb(m.m2q) + ' %', 14))
}
console.log('  (les deux dernières colonnes = le quinté ENTIER, moitié par moitié)')

console.log('\n  BOOTSTRAP APPARIÉ (10 000 tirages) — contre la production, sur l’événement qui paie')
for (const b of bootstraps) {
  console.log('  ' + L(b.code, 12) + 'quinté mieux ' + R(nb(b.mieux) + ' %', 8) + ' · pire ' + R(nb(b.pire) + ' %', 8)
    + ' · chevaux trouvés ' + R((b.chevauxMoy > 0 ? '+' : '') + nb(b.chevauxMoy), 7) + '  IC90 [' + nb(b.chevauxIC90[0]) + ' ; ' + nb(b.chevauxIC90[1]) + ']')
}

console.log('\n  OÙ LA BASSMAT CHANGE QUELQUE CHOSE — les courses où elle remplace la production')
for (const a of autopsies) {
  const bl = a.blocs.filter((x) => x.changes)
    .map((x) => x.bloc + ' ' + x.changes + ' (' + nb(x.bassmat) + ' vs ' + nb(x.production) + ')').join(' · ')
  console.log('  ' + L(a.code, 10) + R(nb(a.coursesChangees), 4) + ' courses · ' + R(a.blocsChanges, 3) + ' blocs  ' + (bl || '—'))
}
console.log('  (courses touchées · blocs modifiés · par bloc : courses changées · arrivants du top 5 couverts par la bassmat vs par la production)')

console.log('\n  HORS ÉCHANTILLON — la règle choisie sur une moitié, notée sur l’autre')
console.log('     ' + horsEchantillon.moitie1.choisi)
console.log('        sur sa moitié ' + nb(horsEchantillon.moitie1.surSaMoitie) + ' % → sur l’autre ' + nb(horsEchantillon.moitie1.surLAutre) + ' %')
console.log('     ' + horsEchantillon.moitie2.choisi)
console.log('        sur sa moitié ' + nb(horsEchantillon.moitie2.surSaMoitie) + ' % → sur l’autre ' + nb(horsEchantillon.moitie2.surLAutre) + ' %')
console.log('     production   : 1ʳᵉ moitié ' + nb(horsEchantillon.production.moitie1) + ' % · 2ᵈᵉ moitié ' + nb(horsEchantillon.production.moitie2) + ' %')

console.log('\n  VERDICT — ' + out.verdict.texte)
console.log('  → data/bloc-pm.json + public/data/bloc-pm.json\n')
