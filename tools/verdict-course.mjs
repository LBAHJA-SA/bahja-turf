/* =============================================================================
 * tools/verdict-course.mjs — LA BASSMAT JUGE LE MOTEUR À CHAQUE COURSE
 * (29/10/2026)
 *
 * Demande de l'utilisateur : « البصمة خاصها تحكم على الموتور فكل كينتي » —
 * la bassmat doit juger le moteur à CHAQUE Quinté, pas seulement en fin de mois.
 *
 * ── CE QUE « JUGER » VEUT DIRE, ET RIEN D'AUTRE ────────────────────────────
 *
 * La bassmat des courses PASSÉES donne, pour chaque case du carnet (P1..P20),
 * deux fréquences :
 *
 *     taux5(P) = courses où le cheval de la case P finit dans les 5 / courses
 *     taux3(P) = idem pour les 3 premiers
 *
 * Un ticket de 8 chevaux réclame donc, selon la bassmat :
 *
 *     attendu5 = Σ taux5(case du cheval)      ← « ce ticket vaut 3,4 arrivants »
 *
 * Trois jugements sont mesurés séparément, jamais mélangés :
 *
 *   ① CALIBRATION — le juge dit-il vrai ? (attendu contre réalisé)
 *   ② FAUTES DE CHOIX — dans chaque bloc où le quota coupe, la bassmat
 *      compare la case GARDÉE et la case JETÉE. Si la jetée vaut mieux,
 *      c'est une faute, et son prix est l'écart des deux taux.
 *   ③ VALEUR DE LA COURSE — combien d'arrivants ce Quinté-là peut-il donner ?
 *      C'est un filtre de course, pas un choix de cheval.
 *
 * ⚠ AUCUNE TRICHE. Pour la course i, le juge est construit sur les courses
 *   STRICTEMENT ANTÉRIEURES. La course jugée ne sert jamais à construire le
 *   juge — autrement la mesure ne vaut rien (§11.24).
 *
 * Deux corpus, dans l'ordre du calendrier :
 *   ① 96 Quintés à presse réelle (février → juillet) — le juge démarre après
 *      20 courses, comme dans la vraie vie.
 *   ② 26 Quintés d'octobre (l'archive) — le juge dispose des 96 + du mois
 *      déjà écoulé : c'est le vrai usage en production.
 *
 *   node tools\verdict-course.mjs
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid, computeStats, formeMarche, remplirGrille, GROUPES } from '../src/lib/quinte.js'

const pct = (a, b) => (b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '—')
const pad = (s, n) => String(s).padEnd(n)
const r2 = (x) => Math.round(100 * x) / 100
const nr = (x) => String(r2(x)).replace('.', ',')
const eq = (a, b) => a.slice().sort((x, y) => x - y).join() === b.slice().sort((x, y) => x - y).join()
const MIN_PRIOR = 20

/* ────────────────────────────── les deux corpus ────────────────────────── */
const TOUT = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
const CTRL = []
for (const q of TOUT) {
  const cotes = q.cotes
  if (!cotes || Object.keys(cotes).length < 12) continue
  if (!q.arrivee || q.arrivee.length < 5) continue
  const nums = Object.keys(cotes).map(Number)
  if (nums.some((n) => !(cotes[n] > 1))) continue
  const syn = (q.presse?.length >= 10 ? [...q.presse] : []).filter((n) => cotes[n] > 1)
  if (syn.length < 10) continue
  CTRL.push({
    date: q.date, discipline: q.discipline, syn, nums, synthese: syn, runners: nums,
    arrivee: q.arrivee.slice(0, 5),
    cotes: Object.fromEntries(nums.map((n) => [n, { cote: cotes[n] }])),
  })
}
CTRL.sort((a, b) => String(a.date).localeCompare(String(b.date)))

const ARCH = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
const COTES = (() => { try { return JSON.parse(fs.readFileSync('data/cotes.json', 'utf8')) } catch { return {} } })()
const MOIS = []
for (const d of Object.keys(ARCH).sort().filter((x) => x >= '2026-10-01' && x <= '2026-10-31')) {
  const e = ARCH[d]
  const syn = (e.synthese || []).filter((n) => Number.isFinite(n) && n > 0)
  const arr = (e.arrivee || []).filter((n) => Number.isFinite(n) && n > 0)
  if (syn.length < 8 || arr.length < 5) continue
  const nums = (e.runners && e.runners.length ? e.runners : syn).map(Number)
  const c = COTES[e.courseId]
  let cotes = null
  if (c && Array.isArray(c.cotes)) {
    const o = {}
    for (const x of c.cotes) if (x && x.cote > 1) o[x.num] = { cote: x.cote }
    if (Object.keys(o).length >= 10) cotes = o
  }
  MOIS.push({ date: d, discipline: e.discipline, syn, nums, synthese: syn, runners: nums, arrivee: arr.slice(0, 5), cotes })
}
MOIS.sort((a, b) => String(a.date).localeCompare(String(b.date)))

/* ─────────────────────────── le juge (bassmat) ─────────────────────────── */
/* ⚠ 29/10/2026 — `computeStats().parPlace` est indexé à PARTIR DE 0 :
 *   parPlace[0] = case P1, parPlace[11] = case P12.
 *   Et `top5` / `top3` sont déjà des POURCENTAGES (64 = 64 %), pas des
 *   comptes : la première version les divisait par `courses_valides` et le juge
 *   prédisait 14 arrivants au lieu de 3,5. Deux erreurs, un seul symptôme. */
function taux(st) {
  const out = {}
  for (let p = 1; p <= 20; p++) {
    const x = st?.parPlace?.[p - 1]
    if (!x || !x.courses_valides) continue
    /* ⚠ `top3` est CONDITIONNEL : c'est la part de podiums PARMI les top-5
     *   (81 % pour P1, alors que top5 = 66 %). Le podium d'une case vaut donc
     *   le PRODUIT des deux : (top5/100) × (top3/100). Les additionner, ou
     *   lire top3 seul, donnait 4,7 arrivants sur le podium au lieu de 1,2. */
    const p5 = x.top5 / 100
    const p3 = p5 * (x.top3 / 100)
    out[p] = { t5: p5, t3: p3, n: x.courses_valides }
  }
  return out
}
function juge(priors, forme) {
  const global = taux(computeStats(priors))
  let parForme = null
  let nForme = 0
  if (forme) {
    const l = priors.filter((c) => c.forme === forme)
    nForme = l.length
    if (l.length >= 12) parForme = taux(computeStats(l))
  }
  return { global, parForme, nGlobal: priors.length, nForme, source: parForme ? 'forme' : 'global' }
}
const somme = (ticket, grille, T, cle) => {
  let s = 0
  for (const n of ticket) {
    const x = T?.[grille.slotParNum[n]]
    if (!x) return null
    s += cle === 't3' ? x.t3 : x.t5
  }
  return s
}

/* ─────────────────────── des compositions à 8 chevaux ──────────────────── */
function compositions() {
  const out = []
  for (let q1 = 2; q1 <= 4; q1++)
    for (let q2 = 2; q2 <= 4; q2++)
      for (let q3 = 1; q3 <= 2; q3++)
        for (let q4 = 0; q4 <= 2; q4++)
          for (let q5 = 0; q5 <= 1; q5++)
            if (q1 + q2 + q3 + q4 + q5 === 8) out.push([q1, q2, q3, q4, q5])
  return out
}
const COMPOS = compositions()
const PROD = GROUPES.map((g) => g.quota)

/* ───────────────────────────── le moteur ───────────────────────────────── */
function jouer(course, quotas, choix = null) {
  const g = buildGrid(course.syn, course.nums)
  const grille = { ...g, groupes: g.groupes.map((x, k) => ({ ...x, quota: Math.min(quotas[k], x.cases.length) })) }
  const cl = g.groupes.flatMap((x) => x.cases).slice().sort((a, b) => a.slot - b.slot)
    .map((x) => ({ p: { num: x.num }, s: null, ok: true }))
  const r = remplirGrille(grille, cl, course.discipline || 'PLAT', course.cotes, null, choix)
  return { ticket: r.ticket, grille: g, detail: r.detail }
}

/** ② les fautes de choix : dans un bloc où le quota coupe, la case JETÉE
 *  vaut-elle mieux que la case GARDÉE selon la bassmat ? */
function fautesDe(detail, T) {
  const out = []
  for (const g of detail) {
    if (!T) break
    const pris = g.cases.filter((c) => c.pris)
    const jete = g.cases.filter((c) => !c.pris)
    if (!pris.length || !jete.length) continue
    const tPris = Math.min(...pris.map((c) => T[g.cases.find((x) => x.num === c.num)?.slot]?.t5 ?? 0))
    const tJete = Math.max(...jete.map((c) => T[g.cases.find((x) => x.num === c.num)?.slot]?.t5 ?? 0))
    if (tJete > tPris + 0.005) out.push({ bloc: g.id, ecart: +(tJete - tPris).toFixed(3), jete: jete.length })
  }
  return out
}

/* ─────────────────────────────── la boucle ─────────────────────────────── */
function juger(corpus, priorsInitiaux) {
  const lignes = []
  const priors = priorsInitiaux.slice()
  for (const c of corpus) {
    c.forme = c.cotes ? (formeMarche(c.cotes)?.cle || null) : null
    if (priors.length < MIN_PRIOR) { priors.push(c); continue }

    const J = juge(priors, c.forme)
    const T = J.parForme || J.global
    const prod = jouer(c, PROD)
    const a5 = somme(prod.ticket, prod.grille, T, 't5')
    const a3 = somme(prod.ticket, prod.grille, T, 't3')
    if (a5 == null) { priors.push(c); continue }

    const f = fautesDe(prod.detail, T)

    /* ③ l'arbitrage : quelle composition la bassmat attend-elle le plus ? */
    let meilleur = null
    for (const q of COMPOS) {
      const t = jouer(c, q)
      const v = somme(t.ticket, t.grille, T, 't5')
      if (v == null) continue
      const d = Math.abs(q[0] - PROD[0]) + Math.abs(q[1] - PROD[1]) + Math.abs(q[2] - PROD[2]) +
        Math.abs(q[3] - PROD[3]) + Math.abs(q[4] - PROD[4])
      if (!meilleur || v > meilleur.attendu + 1e-9 || (Math.abs(v - meilleur.attendu) < 1e-9 && d < meilleur.dist)) {
        meilleur = { q, ticket: t.ticket, attendu: v, dist: d }
      }
    }

    const x5 = c.arrivee.filter((n) => prod.ticket.includes(n)).length
    const p3n = c.arrivee.slice(0, 3).filter((n) => prod.ticket.includes(n)).length
    const rates = prod.ticket.map((n) => T[prod.grille.slotParNum[n]]?.t5).filter((v) => v != null)
    lignes.push({
      date: c.date, forme: c.forme, source: J.source, nPrior: J.nGlobal, nForme: J.nForme,
      attendu5: a5, attendu3: a3, x5, p3n,
      faible: rates.length ? Math.min(...rates) : null,
      pod: c.arrivee.slice(0, 3).every((n) => prod.ticket.includes(n)),
      fautes: f.length, prix: f.reduce((s, x) => s + x.ecart, 0), blocs: f.map((x) => x.bloc),
      quotas: meilleur.q, attenduMeilleur: meilleur.attendu,
      meme: eq(prod.ticket, meilleur.ticket),
      x5meil: c.arrivee.filter((n) => meilleur.ticket.includes(n)).length,
      podMeil: c.arrivee.slice(0, 3).every((n) => meilleur.ticket.includes(n)),
    })
    priors.push(c)
  }
  return lignes
}

const L_CTRL = juger(CTRL, [])
const L_MOIS = juger(MOIS, CTRL)

const moy = (l, f) => (l.length ? l.reduce((s, x) => s + f(x), 0) / l.length : 0)

/* ─────────────────────────────── les rapports ──────────────────────────── */
function bloc(lignes, titre) {
  const n = lignes.length
  if (!n) { console.log('\n  ' + titre + ' : aucune course jugée'); return null }
  const att = moy(lignes, (x) => x.attendu5)
  const rea = moy(lignes, (x) => x.x5)
  const att3 = moy(lignes, (x) => x.attendu3)
  const pod3 = moy(lignes, (x) => x.p3n)
  const q5 = lignes.filter((x) => x.x5 === 5).length
  const podc = lignes.filter((x) => x.pod).length
  const q5m = lignes.filter((x) => x.x5meil === 5).length
  const podm = lignes.filter((x) => x.podMeil).length
  const pareils = lignes.filter((x) => x.meme).length

  console.log('\n  ' + titre + ' — ' + n + ' courses jugées')
  console.log('  ' + '-'.repeat(80))
  console.log('  ① CALIBRATION')
  console.log('     ' + pad('le juge prédit (5 arrivants)', 36) + nr(att) + '  ·  réalisé ' + nr(rea) + '   écart ' + (rea - att >= 0 ? '+' : '') + nr(rea - att))
  console.log('     ' + pad('le juge prédit (3 premiers)', 36) + nr(att3) + '  ·  réalisé ' + nr(pod3))

  /* ② les fautes de choix */
  const sans = lignes.filter((x) => x.fautes === 0)
  const une = lignes.filter((x) => x.fautes === 1)
  const deux = lignes.filter((x) => x.fautes >= 2)
  console.log('\n  ② FAUTES DE CHOIX (la bassmat juge la sélection de chaque bloc)')
  console.log('     ' + pad('verdict', 26) + pad('courses', 10) + pad('x/5', 8) + pad('5/5', 10) + 'podium')
  for (const [nom, l] of [['aucune faute', sans], ['1 faute', une], ['2 fautes et +', deux]]) {
    console.log('     ' + pad(nom, 26) + pad(l.length + ' (' + Math.round(100 * l.length / n) + '%)', 10) +
      pad(nr(moy(l, (x) => x.x5)), 8) + pad(pct(l.filter((x) => x.x5 === 5).length, l.length), 10) +
      pct(l.filter((x) => x.pod).length, l.length))
  }

  /* ③ la valeur de la course */
  const tri = lignes.slice().sort((a, b) => a.attendu5 - b.attendu5)
  const tiers = [tri.slice(0, Math.ceil(n / 3)), tri.slice(Math.ceil(n / 3), Math.ceil(2 * n / 3)), tri.slice(Math.ceil(2 * n / 3))]
  console.log('\n  ③ VALEUR DE LA COURSE (deux tiers bas / tiers haut de l’attendu)')
  console.log('     ' + pad('tranche', 26) + pad('courses', 10) + pad('x/5', 8) + pad('5/5', 10) + 'podium')
  ;['bas (à éviter ?)', 'milieu', 'haut (à jouer ?)'].forEach((nom, k) => {
    const t = tiers[k]
    console.log('     ' + pad(nom, 26) + pad(t.length + '', 10) + pad(nr(moy(t, (x) => x.x5)), 8) +
      pad(pct(t.filter((x) => x.x5 === 5).length, t.length), 10) + pct(t.filter((x) => x.pod).length, t.length))
  })
  const bas = tiers[0].concat(tiers[1])
  console.log('     ' + pad('en ne jouant que le tiers haut', 26) + pad('', 10) + pad(nr(moy(tiers[2], (x) => x.x5)), 8) +
    pad(pct(tiers[2].filter((x) => x.x5 === 5).length, tiers[2].length), 10) + pct(tiers[2].filter((x) => x.pod).length, tiers[2].length))
  void bas

  /* ② bis le MAILLON FAIBLE — le cheval du ticket que la bassmat attend le moins */
  const tf = lignes.filter((x) => x.faible != null).slice().sort((a, b) => a.faible - b.faible)
  const m = Math.ceil(tf.length / 3)
  const tm = tf.length ? [tf.slice(0, m), tf.slice(m, 2 * m), tf.slice(2 * m)] : [[], [], []]
  console.log('\n  ② bis LE MAILLON FAIBLE (le cheval du ticket le moins attendu par la bassmat)')
  console.log('     ' + pad('tranche', 26) + pad('courses', 10) + pad('x/5', 8) + pad('5/5', 10) + 'podium')
  ;['faible très bas', 'faible moyen', 'faible haut'].forEach((nom, k) => {
    const t = tm[k]
    console.log('     ' + pad(nom, 26) + pad(t.length + '', 10) + pad(nr(moy(t, (x) => x.x5)), 8) +
      pad(pct(t.filter((x) => x.x5 === 5).length, t.length), 10) + pct(t.filter((x) => x.pod).length, t.length))
  })

  console.log('\n  ③ bis L’ARBITRAGE (le juge choisit la composition)')
  console.log('     ' + pad('le ticket change', 36) + pct(n - pareils, n) + '  (' + (n - pareils) + '/' + n + ')')
  console.log('     ' + pad('ticket du moteur', 36) + pct(q5, n) + ' de 5/5  ·  ' + pct(podc, n) + ' de podium')
  console.log('     ' + pad('ticket choisi par la bassmat', 36) + pct(q5m, n) + ' de 5/5  ·  ' + pct(podm, n) + ' de podium')

  const dist = {}
  for (const x of lignes) dist[x.quotas.join('-')] = (dist[x.quotas.join('-')] || 0) + 1
  console.log('     ' + pad('compositions choisies', 36) + Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([q, c]) => q + ' ×' + c).join(' · '))

  return {
    n, attendu5: r2(att), realise5: r2(rea), attendu3: r2(att3), realise3: r2(pod3),
    fautes: {
      aucune: { n: sans.length, x5: r2(moy(sans, (x) => x.x5)), q5: r2(100 * sans.filter((x) => x.x5 === 5).length / (sans.length || 1)), pod: r2(100 * sans.filter((x) => x.pod).length / (sans.length || 1)) },
      une: { n: une.length, x5: r2(moy(une, (x) => x.x5)), q5: r2(100 * une.filter((x) => x.x5 === 5).length / (une.length || 1)), pod: r2(100 * une.filter((x) => x.pod).length / (une.length || 1)) },
      deux: { n: deux.length, x5: r2(moy(deux, (x) => x.x5)), q5: r2(100 * deux.filter((x) => x.x5 === 5).length / (deux.length || 1)), pod: r2(100 * deux.filter((x) => x.pod).length / (deux.length || 1)) },
    },
    tiers: tiers.map((t) => ({ n: t.length, x5: r2(moy(t, (x) => x.x5)), q5: r2(100 * t.filter((x) => x.x5 === 5).length / t.length), pod: r2(100 * t.filter((x) => x.pod).length / t.length) })),
    arbitrage: { pareils, change: n - pareils, q5: r2(100 * q5 / n), pod: r2(100 * podc / n), q5meil: r2(100 * q5m / n), podm: r2(100 * podm / n) },
  }
}

console.log('\n  ══ LA BASSMAT JUGE LE MOTEUR, COURSE PAR COURSE ══')
console.log('  juge = bassmat des courses STRICTEMENT antérieures (jamais celle qu’on juge)')
console.log('  corpus ① ' + CTRL.length + ' Quintés à presse réelle (' + CTRL[0].date + ' → ' + CTRL[CTRL.length - 1].date + ')')
console.log('  corpus ② ' + MOIS.length + ' Quintés d’octobre (' + (MOIS[0]?.date || '—') + ' → ' + (MOIS[MOIS.length - 1]?.date || '—') + ')')
console.log('  quotas du moteur : ' + PROD.join('-') + '  ·  compositions possibles : ' + COMPOS.length)

const R1 = bloc(L_CTRL, '① CONTRÔLE (96)')
const R2 = bloc(L_MOIS, '② LE MOIS (octobre)')

function moities(lignes, titre) {
  const n = lignes.length
  if (n < 8) return
  const A = lignes.slice(0, Math.floor(n / 2)), B = lignes.slice(Math.floor(n / 2))
  const f = (l) => pct(l.filter((x) => x.x5 === 5).length, l.length) + ' / ' + pct(l.filter((x) => x.pod).length, l.length)
  console.log('\n  stabilité — ' + titre + '   (5/5 / podium)')
  console.log('  ' + pad('le moteur', 26) + pad(f(A), 18) + f(B))
  const g = (l) => pct(l.filter((x) => x.x5meil === 5).length, l.length) + ' / ' + pct(l.filter((x) => x.podMeil).length, l.length)
  console.log('  ' + pad('l’arbitrage bassmat', 26) + pad(g(A), 18) + g(B))
  const s = (l) => nr(moy(l, (x) => x.x5))
  console.log('  ' + pad('x/5 moyen', 26) + pad(s(A), 18) + s(B))
}
moities(L_CTRL, '① CONTRÔLE')
moities(L_MOIS, '② LE MOIS')

/* ─────────────────────────────── le verdict ────────────────────────────── */
const verdict = (() => {
  if (!R1 || !R2) return { ok: false }
  const calib = Math.abs(R1.realise5 - R1.attendu5) <= 0.4 && Math.abs(R2.realise5 - R2.attendu5) <= 0.6
  /* les fautes prédisent-elles ? il faut les DEUX métriques, sur les DEUX corpus */
  const fautesInforment =
    R1.fautes.aucune.x5 > R1.fautes.deux.x5 + 0.05 && R1.fautes.aucune.pod > R1.fautes.deux.pod + 5 &&
    R2.fautes.aucune.x5 > R2.fautes.deux.x5 + 0.05 && R2.fautes.aucune.pod >= R2.fautes.deux.pod
  const arbitrageGagne = R1.arbitrage.q5meil > R1.arbitrage.q5 && R2.arbitrage.q5meil >= R2.arbitrage.q5
  const valeurTrie = R1.tiers[2].x5 > R1.tiers[0].x5 + 0.1 && R2.tiers[2].x5 >= R2.tiers[0].x5
  return { calib, fautesInforment, arbitrageGagne, valeurTrie, arbitragePerd: R1.arbitrage.q5meil < R1.arbitrage.q5 }
})()

console.log('\n  ── VERDICT')
console.log('  ' + pad('① le juge est calibré', 34) + (verdict.calib ? 'OUI' : 'NON'))
console.log('  ' + pad('② les fautes prédisent', 34) + (verdict.fautesInforment ? 'OUI' : 'NON'))
console.log('  ' + pad('③ la valeur trie la course', 34) + (verdict.valeurTrie ? 'OUI' : 'NON'))
console.log('  ' + pad('l’arbitrage gagne le quinté', 34) + (verdict.arbitrageGagne ? 'OUI' : 'NON'))

fs.writeFileSync('data/verdict-course.json', JSON.stringify({
  quand: new Date().toISOString(),
  protocole: 'bassmat des courses strictement antérieures · juge à partir de ' + MIN_PRIOR + ' courses',
  quotasProduction: PROD,
  compositions: COMPOS.length,
  controle: R1,
  mois: R2,
  verdict,
  lignes: { controle: L_CTRL.map((x) => ({ ...x, fautes: x.fautes, prix: r2(x.prix) })), mois: L_MOIS.map((x) => ({ ...x, prix: r2(x.prix) })) },
}, null, 1))
try { fs.writeFileSync('public/data/verdict-course.json', JSON.stringify(JSON.parse(fs.readFileSync('data/verdict-course.json', 'utf8')), null, 1)) } catch { /* pas de page */ }
console.log('\n  artefact : data/verdict-course.json\n')
