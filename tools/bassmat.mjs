/* =============================================================================
 * tools/bassmat.mjs — LA BASSMAT DE LA COURSE (28/10/2026)
 *
 * Demande de l'utilisateur :
 *   « Quinté → Archive · Statistiques · Écarts · Choix : بغيت نخرج منهم بصمة
 *     للسباق لان الاختيارات الحالية ضعيفة جدا »
 *
 * CE QUE CE FICHIER PRODUIT — une seule table, lisible pour UNE course :
 *
 *   ① la FORME DU MARCHÉ de la course (fermé / normal / ouvert) — le seul
 *      découpage qui change la lecture des cases, et il est mesuré ici même ;
 *   ② ce que chaque CASE P donne (top-5, top-3), globalement ET par forme ;
 *   ③ la COMPOSITION attendue du podium et du quinté (combien de G1, G2, G3,
 *      G4, G5), globalement ET par forme ;
 *   ④ l'AUDIT DES DÉCISIONS : dans chaque bloc où le quota est plus petit que
 *      le nombre de cases (G2 3/4 · G3 1/2 · G4 1/2), le taux de la case
 *      GARDÉE contre celui de la case JETÉE. C'est là que se joue le choix ;
 *   ⑤ la CALIBRATION : la somme des taux des cases du ticket contre les
 *      arrivées réellement vues — pour savoir si le modèle ment ;
 *   ⑥ la COURBE « combien de cases pour tout tenir » (podium / quinté).
 *
 * CE QUE CE FICHIER NE FAIT PAS — et c'est mesuré, pas supposé :
 *   aucune règle de choix dans le bloc ne bat le carnet (AGENTS.md §11.24,
 *   §11.29, §11.30, tools/bloc-pm.mjs). Ce fichier ne cherche donc PAS une
 *   règle : il décrit la course. Le ticket reste celui de `GROUPES`
 *   (3-2-1-1-1 depuis le 28/10/2026, §11.40).
 *
 *   node tools\bassmat.mjs
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'
import {
  buildGrid, remplirGrille, bandeMarche, formeMarche, FORME_MARCHE, GROUPES,
} from '../src/lib/quinte.js'

const RACINE = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const lire = (p) => JSON.parse(fs.readFileSync(path.join(RACINE, p), 'utf8'))
const arr = (x) => (Array.isArray(x) ? x : [])
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0)
const r1 = (x) => Math.round(10 * x) / 10
const coteDe = (cotes, n) => {
  const v = cotes?.[n]
  const x = Number(typeof v === 'object' ? v?.cote : v)
  return Number.isFinite(x) && x > 0 ? x : null
}
const blocDeCase = (p) => (p <= 4 ? 'G1' : p <= 8 ? 'G2' : p <= 10 ? 'G3' : p <= 12 ? 'G4' : 'G5')
const FORME_CLES = ['ferme', 'normal', 'ouvert']

/* ── 1. LE CORPUS — les 96 Quintés à presse RÉELLE ───────────────────────── */
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
  const forme = formeMarche(cotes)
  if (!forme) continue
  const ordre = nums.slice().sort((a, b) => coteDe(cotes, a) - coteDe(cotes, b) || a - b)
  const rangM = Object.fromEntries(ordre.map((n, i) => [n, i + 1]))

  const chevaux = nums.map((n) => ({
    n,
    place: g.parNum[n] ?? null,
    case: g.slotParNum[n] ?? null,
    bande: bandeMarche(rangM[n]),
    t3: arrivee.slice(0, 3).includes(n),
    t5: arrivee.slice(0, 5).includes(n),
  })).filter((c) => c.case != null && c.place != null)

  /* le ticket de PRODUCTION — le vrai `remplirGrille`, classement au carnet */
  const parCarnet = nums.slice().sort((a, b) => (g.parNum[a] ?? 99) - (g.parNum[b] ?? 99) || a - b)
  const classement = parCarnet.map((n) => ({ p: { num: n }, s: null, ok: true }))
  const cotesObj = Object.fromEntries(nums.map((n) => [n, { cote: coteDe(cotes, n) }]))
  let ticket = []
  try { ticket = remplirGrille(g, classement, q.discipline || 'PLAT', cotesObj, null).ticket } catch { continue }

  courses.push({
    date: q.date, discipline: q.discipline, forme: forme.cle, g, chevaux,
    arrivee, ticket, nums, nb: nums.length,
  })
}
courses.sort((a, b) => String(a.date).localeCompare(String(b.date)))
const N = courses.length
if (!N) throw new Error('aucune course exploitable')

/* ── 2. CE QUE DONNE CHAQUE CASE ─────────────────────────────────────────── */
const caseDe = (c, p) => c.chevaux.find((h) => h.case === p) || null
const agregat = (liste) => {
  const n = liste.length
  const t5 = liste.filter((h) => h.t5).length
  const t3 = liste.filter((h) => h.t3).length
  return { n, t5, t3, pc5: pct(t5, n), pc3: pct(t3, n) }
}
const CASES = Array.from({ length: 20 }, (_, i) => i + 1)
const cases = CASES.map((p) => {
  const tous = courses.map((c) => caseDe(c, p)).filter(Boolean)
  const parForme = Object.fromEntries(FORME_CLES.map((f) => {
    const l = courses.filter((c) => c.forme === f).map((c) => caseDe(c, p)).filter(Boolean)
    return [f, agregat(l)]
  }))
  return { p, bloc: blocDeCase(p), ...agregat(tous), parForme }
})
const pc5De = (p) => cases.find((x) => x.p === p)?.pc5 ?? 0
const pc3De = (p) => cases.find((x) => x.p === p)?.pc3 ?? 0

/* ── 3. LA COMPOSITION (podium = top-3 · quinté = top-5) ─────────────────── */
const motif = (c, places) => {
  const m = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
  const cibles = c.chevaux.filter((h) => (places === 3 ? h.t3 : h.t5))
  for (const h of cibles) m[blocDeCase(h.case)]++
  return m
}
const composition = (liste, places) => {
  const par = liste.map((c) => motif(c, places))
  const moyenne = { G1: 0, G2: 0, G3: 0, G4: 0, G5: 0 }
  const compte = new Map()
  for (const m of par) {
    for (const k of Object.keys(moyenne)) moyenne[k] += m[k]
    const cle = ['G1', 'G2', 'G3', 'G4', 'G5'].map((k) => m[k]).join('·')
    compte.set(cle, (compte.get(cle) || 0) + 1)
  }
  for (const k of Object.keys(moyenne)) moyenne[k] = r1(moyenne[k] / (par.length || 1))
  const motifs = [...compte.entries()]
    .map(([mo, n]) => ({ motif: mo, n, pct: pct(n, par.length) }))
    .sort((a, b) => b.n - a.n || String(a.motif).localeCompare(String(b.motif)))
  return { n: par.length, moyenne, motifs, distinctes: motifs.length }
}
const compositionGlobale = {
  podium: composition(courses, 3),
  quinte: composition(courses, 5),
}
const formes = FORME_CLES.map((cle) => {
  const liste = courses.filter((c) => c.forme === cle)
  const jete = liste.map((c) => caseDe(c, 8)).filter(Boolean)
  return {
    cle,
    lib: FORME_MARCHE[cle].lib,
    n: liste.length,
    part: pct(liste.length, N),
    podium: composition(liste, 3),
    quinte: composition(liste, 5),
    /* le 4e de G2 (P8) : c'est LUI que le carnet jette — arrive-t-il plus
     * souvent quand le marché est ouvert ? c'est la question du §11.26. */
    jeteG2: agregat(jete),
  }
})

/* ── 4. L'AUDIT DES DÉCISIONS — la case gardée contre la case jetée ──────── */
const blocs = GROUPES.map((g) => {
  const quota = g.obligatoire ? Math.max(1, g.quota) : g.quota
  const ps = CASES.filter((p) => p >= g.min && p <= g.max)
  const gardes = ps.slice(0, quota).map((p) => ({ p, pc5: pc5De(p), pc3: pc3De(p) }))
  const jetes = ps.slice(quota).map((p) => ({ p, pc5: pc5De(p), pc3: pc3De(p) }))
  const moy = (l) => (l.length ? r1(l.reduce((s, x) => s + x.pc5, 0) / l.length) : null)
  const ecart = gardes.length && jetes.length ? r1(moy(gardes) - moy(jetes)) : null
  return {
    id: g.id, label: g.label, taille: ps.length, quota, cases: ps,
    gardes, jetes, moyGarde: moy(gardes), moyJete: moy(jetes), ecart,
  }
}).filter((b) => b.quota > 0 && b.taille > b.quota)   // là où il y a vraiment un choix

/* ── 5. LA CALIBRATION — la somme des taux ment-elle ? ───────────────────── */
/* Pour chaque course : la somme des taux LOO des cases de SON ticket, contre
 * le nombre d'arrivants réellement vus. Un modèle honnête doit donner ≈ 0. */
const tauxSans = (i) => {
  const m = new Map()
  for (let j = 0; j < N; j++) {
    if (j === i) continue
    for (const h of courses[j].chevaux) {
      const e = m.get(h.case) || { n: 0, t5: 0 }
      e.n++; if (h.t5) e.t5++
      m.set(h.case, e)
    }
  }
  return m
}
let sommeAttendue = 0, vus = 0
courses.forEach((c, i) => {
  const t = tauxSans(i)
  const casesTicket = [...new Set(c.ticket)].map((n) => c.g.slotParNum[n]).filter((p) => p != null)
  sommeAttendue += casesTicket.reduce((s, p) => { const e = t.get(p); return s + (e && e.n ? e.t5 / e.n : 0) }, 0)
  vus += c.chevaux.filter((h) => h.t5 && c.ticket.includes(h.n)).length
})
const calibrage = {
  n: N,
  sommeTaux: r1(sommeAttendue / N),      // ce que les cases promettent, en moyenne
  moyenneVue: r1(vus / N),               // ce qui arrive VRAIMENT dans le ticket
  chevaux: Math.round(courses.reduce((s, c) => s + new Set(c.ticket).size, 0) / N),
  note: 'les cases ne sont pas indépendantes : la somme de leurs taux est un MAJORANT. '
    + '« vus » = les arrivants réellement contenus dans le ticket (x/5).',
}

/* ce que le ticket de production tient VRAIMENT — même métrique que §11.25 */
const tient = {
  podium: pct(courses.filter((c) => c.chevaux.filter((h) => h.t3).every((h) => c.ticket.includes(h.n))).length, N),
  quinte: pct(courses.filter((c) => c.chevaux.filter((h) => h.t5).every((h) => c.ticket.includes(h.n))).length, N),
  x5: r1(vus / N),
}

/* ── 6. LA COURBE — combien de cases pour tout tenir ─────────────────────── */
const courbe = Array.from({ length: 8 }, (_, i) => i + 5).map((k) => {
  const pod = courses.filter((c) => c.chevaux.filter((h) => h.t3).every((h) => h.case <= k)).length
  const qui = courses.filter((c) => c.chevaux.filter((h) => h.t5).every((h) => h.case <= k)).length
  return { k, podium: pct(pod, N), quinte: pct(qui, N) }
})

/* ── 7. LE TICKET DE PRODUCTION, CASE PAR CASE ───────────────────────────── */
/* Le ticket 4-3-1-1-0 est construit ICI depuis GROUPES (et non depuis `blocs`,
 * qui ne garde que les blocs où il y a un choix). */
const dansLeTicket = (p) => {
  const g = GROUPES.find((x) => p >= x.min && p <= x.max)
  if (!g) return false
  const quota = g.obligatoire ? Math.max(1, g.quota) : g.quota
  const idx = CASES.filter((x) => x >= g.min && x <= g.max).indexOf(p)
  return idx >= 0 && idx < quota
}
const ticketProduction = CASES.filter(dansLeTicket)
  .map((p) => ({ p, bloc: blocDeCase(p), pc5: pc5De(p), pc3: pc3De(p) }))
const faible = ticketProduction.slice().sort((a, b) => a.pc5 - b.pc5)[0] || null
const meilleureHorsTicket = cases
  .filter((x) => !ticketProduction.some((t) => t.p === x.p) && x.n >= 30)
  .sort((a, b) => b.pc5 - a.pc5)[0] || null

/* ── 8. LE VERDICT — écrit à partir des chiffres, jamais à la main ───────── */
const g2 = blocs.find((b) => b.id === 'G2')
const k12 = courbe.find((c) => c.k === 12) || {}
const ecartCal = r1(Math.abs(calibrage.sommeTaux - calibrage.moyenneVue))
const texte = [
  `Les ${ticketProduction.length} cases du ticket pèsent ${calibrage.sommeTaux} arrivants attendus `
  + `et ${calibrage.moyenneVue} arrivent vraiment : `
  + (ecartCal <= 0.4
    ? `le modèle des cases est calibré (écart ${ecartCal}).`
    : `l'écart de ${ecartCal} dit que les cases ne s'additionnent pas.`),
  `Le ticket tient le podium entier ${tient.podium} % du temps et le quinté entier ${tient.quinte} % (x/5 = ${tient.x5}).`,
  g2 && g2.ecart != null
    ? `Dans G2 le carnet garde P${g2.gardes.map((x) => x.p).join('·P')} (${g2.moyGarde} %) et jette P${g2.jetes.map((x) => x.p).join('·P')} (${g2.moyJete} %) : ${g2.ecart > 0 ? 'il garde bien les cases fortes' : 'il garde les cases faibles'}.`
    : '',
  faible ? `La case la plus faible du ticket est P${faible.p} (${faible.pc5} % de top-5).` : '',
  meilleureHorsTicket ? `La meilleure case absente du ticket est P${meilleureHorsTicket.p} (${meilleureHorsTicket.pc5} %).` : '',
  `La marge n'est pas dans le choix : 12 cases tiendraient le quinté ${k12.quinte} % du temps.`,
].filter(Boolean).join(' ')

/* ── 9. ÉCRIRE ───────────────────────────────────────────────────────────── */
const sortie = {
  outil: 'tools/bassmat.mjs',
  le: new Date().toISOString().slice(0, 10),
  source: 'data/quintes.json — Quinté Global PMU France, presse réelle + cotes + arrivée',
  n: N,
  periode: { debut: courses[0].date, fin: courses[N - 1].date },
  definition: 'Une CASE P donne quand le cheval qui l\'occupe finit dans les 5 (ou les 3) premiers. P = rang de presse, exactement la case de la grille.',
  forme: {
    regle: 'fermé : favori ≤ 3,2 et ≤ 5 chevaux sous 10/1 · ouvert : favori ≥ 4,4 ou ≥ 9 chevaux sous 10/1 · normal : entre les deux',
    seaux: formes,
  },
  composition: compositionGlobale,
  cases,
  blocs,
  ticketProduction,
  tient,
  calibrage,
  courbe,
  verdict: texte,
}
const ecrire = (p, obj) => {
  fs.mkdirSync(path.dirname(path.join(RACINE, p)), { recursive: true })
  fs.writeFileSync(path.join(RACINE, p), JSON.stringify(obj, null, 1))
}
ecrire('data/bassmat.json', sortie)
ecrire('public/data/bassmat.json', sortie)

/* ── 10. LE RÉSUMÉ À L'ÉCRAN ─────────────────────────────────────────────── */
console.log(`\nBASSMAT — ${N} Quintés (${sortie.periode.debut} → ${sortie.periode.fin})`)
console.log('\nla forme du marché')
for (const f of formes) console.log(`  ${f.cle.padEnd(7)} ${String(f.n).padStart(3)} courses (${String(f.part).padStart(5)} %) · P8 jeté : ${String(f.jeteG2.pc5).padStart(5)} %`)
console.log('\nce que donne chaque case')
for (const c of cases.slice(0, 12)) console.log(`  P${String(c.p).padStart(2)} ${String(c.pc5).padStart(5)} % top-5 · ${String(c.pc3).padStart(5)} % top-3 · n=${c.n}`)
console.log('\nla composition (moyenne par course)')
console.log('  podium', JSON.stringify(compositionGlobale.podium.moyenne))
console.log('  quinté', JSON.stringify(compositionGlobale.quinte.moyenne))
console.log('\nl\'audit des décisions')
for (const b of blocs) if (b.jetes.length) console.log(`  ${b.id} garde ${b.gardes.map((x) => 'P' + x.p).join('·')} (${b.moyGarde} %) · jette ${b.jetes.map((x) => 'P' + x.p).join('·')} (${b.moyJete} %) · écart ${b.ecart > 0 ? '+' : ''}${b.ecart}`)
console.log('\nla calibration')
console.log(`  ${calibrage.chevaux} chevaux · promis ${calibrage.sommeTaux} · vus ${calibrage.moyenneVue}`)
console.log(`  le ticket tient : podium ${tient.podium} % · quinté ${tient.quinte} % · x/5 ${tient.x5}`)
console.log('\nla courbe')
for (const c of courbe) console.log(`  P1..P${String(c.k).padStart(2)} podium ${String(c.podium).padStart(5)} % · quinté ${String(c.quinte).padStart(5)} %`)
console.log('\nVERDICT\n  ' + texte + '\n')
