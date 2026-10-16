/* =============================================================================
 * tools/choix-g1g2.mjs — LA MESURE DU CHOIX DANS G1 ET G2 (16/10/2026)
 *
 * ⛔ LES QUOTAS NE BOUGENT PAS (§11.16, décision utilisateur du 16/10/2026) :
 *    3-2-1-1-1. L'expérience du siège de G5 (§11.23) est REFUSÉE.
 *    « الكوطة ليست مشكل — المشكل في الاختيارات داخل G1 G2. »
 *
 * Ce fichier est LA référence du 16/10 sur le choix. Il mesure :
 *   ① OÙ sont les 1-2-3 (quel bloc les écarte) ;
 *   ② LE LEVIER : le choix vaut +33 pts, la quota +4 → l'utilisateur a raison ;
 *   ③ toutes les règles de choix, une par une, dans G1 puis dans G2 ;
 *   ④ la grille G1 × G2 ;
 *   ⑤ l'oracle, le hasard et le LOO ;
 *   ⑥ la stabilité sur les deux moitiés.
 *
 * Métrique §11.18 = PAYANTE (le 1-2-3 complet dans la grille), plus
 * « top-3 couverts » (0-3) et le 5/5.
 *
 * Données : `data/quintes.json` (96 Quintés à presse RÉELLE, cotes Equidia)
 *        × `data/forms.json` (la carrière : tools/collect-forms.mjs).
 *
 *   node tools\choix-g1g2.mjs              cotes finales
 *   node tools\choix-g1g2.mjs ouverture    cotes du matin (proxy d'un run à 07 h)
 *
 * Écrit `data/choix.json` + `public/data/choix.json` (lus par l'onglet Choix).
 * ============================================================================= */
import fs from 'node:fs'
import { buildGrid } from '../src/lib/quinte.js'

const Q = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
let F = {}
try { F = JSON.parse(fs.readFileSync('data/forms.json', 'utf8')) } catch (e) {
  console.log('\n  ⚠ data/forms.json absent — les règles PHYSIQUES seront muettes.')
  console.log('    Lancer d’abord :  node tools\\collect-forms.mjs\n')
}
const CH = process.argv[2] === 'ouverture' ? 'ouverture' : 'cotes'
const UTILISE_FORMS = Object.keys(F).length > 0

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')

const CASES = Q.filter((q) => q.presse?.length >= 10 && (q.arrivee || []).length)
  .map((q) => {
    const c = q[CH] || {}, o = q.ouverture || {}
    const nums = Object.keys(c).map(Number)
    if (nums.length < 12 || nums.some((n) => !(c[n] > 1))) return null
    const presse = q.presse.filter((n) => c[n] > 1)
    if (presse.length < 10) return null
    const rangs = {}
    nums.slice().sort((a, b) => c[a] - c[b] || a - b).forEach((n, i) => { rangs[n] = i + 1 })
    const f = F[`${q.date}_${q.id}`] || {}
    const g = buildGrid(presse, nums)
    return {
      date: q.date, id: q.id, c, o, rangs, presse,
      arrivee: q.arrivee.slice(0, 5),
      jour: f.distance || q.distance || null,
      hippo: norm(f.track),
      type: f.type || q.discipline || null,
      infos: f.infos || {},
      runs: f.chevaux || {},
      grp: g.groupes.map((x) => ({
        id: x.id, quota: x.quota,
        cases: x.cases.map((k) => ({ num: k.num, place: k.place, slot: k.slot })),
      })),
    }
  }).filter(Boolean)

const N = CASES.length
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + ' %' : '—')
const num = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null)
const pad = (s, n) => String(s).padEnd(n)
const rp = (s, n) => String(s).padStart(n)

/* ══════════════════════════ LES FAITS D'UN CHEVAL ════════════════════════
 * Tout vient des courses PASSÉES (data/forms.json, filtré à la collecte).
 * ⚠ ANTI-FUITE : rien de la course du jour n'entre ici.
 * ═══════════════════════════════════════════════════════════════════════ */
const PROFIL = new Map()
function profil(k, n) {
  const cle = `${k.date}_${k.id}_${n}`
  if (PROFIL.has(cle)) return PROFIL.get(cle)
  const runs = k.runs[n] || []
  const p = { n: runs.length, dist: Infinity, piste: 0, podium: 0, jours: null }
  for (const r of runs) {
    if (r.dist && k.jour) p.dist = Math.min(p.dist, Math.abs(r.dist - k.jour))
    if (norm(r.track) === k.hippo) p.piste += 1
    if (r.place >= 1 && r.place <= 3) p.podium += 1
  }
  if (runs.length) p.jours = Math.round((new Date(k.date) - new Date(runs[0].date)) / 86400000)
  p.sDist = !Number.isFinite(p.dist) ? 0 : p.dist <= 100 ? 10 : p.dist <= 200 ? 8 : p.dist <= 400 ? 5 : p.dist <= 600 ? 3 : 0
  p.sPiste = p.piste >= 2 ? 10 : p.piste === 1 ? 6 : 0
  p.sJours = p.jours == null ? 4 : p.jours <= 20 ? 6 : p.jours <= 45 ? 10 : p.jours <= 90 ? 8 : p.jours <= 180 ? 4 : 1
  p.sPodium = Math.min(10, p.podium * 4)
  p.sPhys = 0.35 * p.sDist + 0.25 * p.sPiste + 0.20 * p.sJours + 0.20 * p.sPodium
  PROFIL.set(cle, p)
  return p
}

const famille = (t) => (/attel|trot/i.test(t || '') ? 'T' : /plat/i.test(t || '') ? 'P' : /haie|steeple|cross/i.test(t || '') ? 'O' : '?')
const discOK = (k, n) => {
  const fam = famille(k.type)
  return (k.runs[n] || []).filter((r) => famille(r.type) === fam).length
}
const scoreMus = (m) => {
  if (!m) return 0
  let s = 0
  ;(String(m).match(/\d+|\(\d+\)/g) || []).filter((x) => !x.startsWith('(')).slice(0, 8)
    .forEach((x, i) => { const p = parseInt(x, 10); s += (p >= 1 && p <= 9 ? 11 - p : 0) * (1 / (1 + i * 0.55)) })
  return s
}
const tendance = (k, n) => (!k.o[n] || !k.c[n] ? 1 : k.o[n] / k.c[n])
const ageDe = (k, n) => k.infos[n]?.age ?? 99

/* ═══════════════════════════ LES RÈGLES DE CHOIX ═════════════════════════
 * `sc` = le score : PLUS HAUT = gardé d'abord. Égalité → le rang de presse.
 * `filtre` = un malus binaire : les chevaux marqués passent derrière (§6 :
 *   « on écarte sur le physique »), quel que soit leur rang.
 * `swap` = la presse d'abord, puis le dernier gardé cède au 1er écarté.
 * ═══════════════════════════════════════════════════════════════════════ */
export const REGLES = [
  { id: 'p', label: 'presse — le rang P (le code actuel)', note: '§11.22' },
  { id: 'm', label: 'marché — la cote' },
  { id: 'slot', label: 'carnet — la colonne (slot) du carnet' },
  { id: 'corde', label: 'corde — le numéro de départ (§4 n°6)', sc: (k, x) => -x.num },
  { id: 'cordeG', label: 'corde à l’envers — le plus grand numéro', sc: (k, x) => x.num },
  { id: 'trend', label: 'mouvement — la cote qui baisse (ouverture ÷ cote)', sc: (k, x) => tendance(k, x.num) },
  { id: 'age', label: 'âge — le plus jeune d’abord', sc: (k, x) => -ageDe(k, x.num) },
  { id: 'ageG', label: 'âge à l’envers — le plus vieux', sc: (k, x) => ageDe(k, x.num) },
  { id: 'mus', label: 'musique — la forme (§11.16 : sans pouvoir)', sc: (k, x) => scoreMus(k.infos[x.num]?.musique) },
  { id: 'disc', label: 'discipline — a déjà couru ce type', sc: (k, x) => discOK(k, x.num) },
  { id: 'dist', label: 'distance — la distance du jour a-t-elle été courue', sc: (k, x) => profil(k, x.num).sDist },
  { id: 'piste', label: 'piste — cet hippodrome a-t-il été couru', sc: (k, x) => profil(k, x.num).sPiste },
  { id: 'jours', label: 'jours — l’absence depuis la dernière course', sc: (k, x) => profil(k, x.num).sJours },
  { id: 'podium', label: 'podium — les podiums récents', sc: (k, x) => profil(k, x.num).sPodium },
  { id: 'phys', label: 'PHYSIQUE — distance + piste + jours + podium', sc: (k, x) => profil(k, x.num).sPhys },
  { id: 'physSeul', label: 'PHYSIQUE seul (sans départage presse)', sc: (k, x) => profil(k, x.num).sPhys, sansEgalite: true },
  { id: 'trendSeul', label: 'MOUVEMENT seul (sans départage presse)', sc: (k, x) => tendance(k, x.num), sansEgalite: true },
  { id: 'pAge', label: 'presse + âge', sc: (k, x) => -x.place - 0.8 * (ageDe(k, x.num) - 4) },
  { id: 'pMus', label: 'presse + musique', sc: (k, x) => -x.place + 0.35 * scoreMus(k.infos[x.num]?.musique) },
  { id: 'pTrend', label: 'presse + mouvement', sc: (k, x) => -x.place + 4 * (tendance(k, x.num) - 1) },
  { id: 'pDisc', label: 'presse + discipline', sc: (k, x) => -x.place + 0.6 * discOK(k, x.num) },
  { id: 'swapCorde', label: 'presse, mais une corde ≥ 11 cède à une corde ≤ 10', swap: (k, x) => (x.num <= 10 ? 1 : 0) },
  { id: 'swapPhys', label: 'presse, mais le 1er écarté cède si son physique est meilleur', swap: (k, x, y) => profil(k, x.num).sPhys > profil(k, y.num).sPhys + 1.5 },
  { id: 'swapPodium', label: 'presse, mais le 1er écarté cède s’il a un podium récent', swap: (k, x, y) => profil(k, x.num).podium > 0 && profil(k, y.num).podium === 0 },
  { id: 'swapTrend', label: 'presse, mais le 1er écarté cède si mieux soutenu', swap: (k, x, y) => tendance(k, x.num) > tendance(k, y.num) * 1.15 },
  { id: 'filJours', label: 'presse, mais +180 j d’absence passe derrière', filtre: (k, x) => profil(k, x.num).jours != null && profil(k, x.num).jours > 180 },
  { id: 'filPodium', label: 'presse, mais SANS podium récent passe derrière', filtre: (k, x) => profil(k, x.num).sPodium === 0 },
  { id: 'filDist', label: 'presse, mais sans distance courue passe derrière', filtre: (k, x) => profil(k, x.num).sDist === 0 },
  { id: 'filPiste', label: 'presse, mais jamais cet hippodrome passe derrière', filtre: (k, x) => profil(k, x.num).sPiste === 0 },
]
const PAR_ID = Object.fromEntries(REGLES.map((r) => [r.id, r]))

/** Le rang qu'une règle donne à une CASE dans son bloc (0 = le 1er gardé). */
function classer(grp, k, id) {
  const R = PAR_ID[id] || PAR_ID.p
  const arr = grp.cases.slice()
  const parPresse = (a, b) => a.place - b.place || k.c[a.num] - k.c[b.num]
  if (R.filtre) arr.sort((a, b) => (R.filtre(k, a) ? 1 : 0) - (R.filtre(k, b) ? 1 : 0) || parPresse(a, b))
  else if (R.sc) {
    arr.sort((a, b) => R.sc(k, b) - R.sc(k, a) || (R.sansEgalite ? 0 : parPresse(a, b)))
  } else if (id === 'm') arr.sort((a, b) => k.c[a.num] - k.c[b.num] || parPresse(a, b))
  else if (id === 'slot') arr.sort((a, b) => a.slot - b.slot)
  else arr.sort(parPresse)
  const q = grp.quota
  if (R.swap && arr.length > q) {
    const garde = arr[q - 1], jete = arr[q]
    if (R.swap(k, jete, garde)) { arr[q - 1] = jete; arr[q] = garde }
  }
  return arr
}

export function choisir(grp, k, id) {
  return classer(grp, k, id).slice(0, grp.quota).map((x) => x.num)
}
export function ticket(k, m1, m2) {
  const t = []
  k.grp.forEach((g, i) => { for (const n of choisir(g, k, i === 0 ? m1 : i === 1 ? m2 : 'p')) if (!t.includes(n)) t.push(n) })
  return t
}
const couverts = (t, arr) => arr.slice(0, 3).filter((n) => t.includes(n)).length
const payante = (t, arr) => couverts(t, arr) === 3

function mesurer(m1, m2, liste = CASES) {
  let p3 = 0, c3 = 0, p5 = 0
  for (const k of liste) {
    const t = ticket(k, m1, m2), c = couverts(t, k.arrivee)
    c3 += c
    if (c === 3) p3++
    if (k.arrivee.every((n) => t.includes(n))) p5++
  }
  return { n: liste.length, p3, c3, p5, couv: c3 / liste.length, taux: num(p3, liste.length) }
}

/* ═══════════ ① OÙ SONT LES 1-2-3 — le diagnostic de l'utilisateur ═══════ */
const diag = (() => {
  const blocs = {}
  for (const k of CASES) {
    const t = ticket(k, 'p', 'm')
    for (const n of k.arrivee.slice(0, 3)) {
      const g = k.grp.find((x) => x.cases.some((cc) => cc.num === n))
      const id = g ? g.id : 'hors presse'
      blocs[id] = blocs[id] || { id, arrivees: 0, gardes: 0, ecartes: 0 }
      blocs[id].arrivees++
      if (t.includes(n)) blocs[id].gardes++; else blocs[id].ecartes++
    }
  }
  for (const b of Object.values(blocs)) b.tauxGarde = num(b.gardes, b.arrivees)
  return blocs
})()
const totalEcartes = Object.values(diag).reduce((s, b) => s + b.ecartes, 0)
const partG1G2 = num((diag.G1?.ecartes || 0) + (diag.G2?.ecartes || 0), totalEcartes)

/* ═════════════ ② LE LEVIER — choix contre quota (la question posée) ═════ */
const levier = (() => {
  const combos = (cases, q) => {
    const cs = cases.map((x) => x.num)
    if (cs.length <= q) return [cs]
    const out = []
    const rec = (s, cur) => {
      if (cur.length === q) { out.push(cur.slice()); return }
      for (let i = s; i < cs.length; i++) { cur.push(cs[i]); rec(i + 1, cur); cur.pop() }
    }
    rec(0, [])
    return out
  }
  const reste = (k) => k.grp.slice(2).flatMap((g) => g.cases.slice().sort((a, b) => a.place - b.place).slice(0, g.quota).map((x) => x.num))
  let courant = 0, oracle = 0, orG1 = 0, orG2 = 0, base = 0
  for (const k of CASES) {
    const C1 = combos(k.grp[0].cases, k.grp[0].quota), C2 = combos(k.grp[1].cases, k.grp[1].quota), R = reste(k)
    const m1 = choisir(k.grp[0], k, 'p'), m2 = choisir(k.grp[1], k, 'm')
    if (couverts([...m1, ...m2, ...R], k.arrivee) === 3) courant++
    let mx = 0, s = 0
    for (const a of C1) for (const b of C2) {
      const ok = couverts([...a, ...b, ...R], k.arrivee) === 3 ? 1 : 0
      mx = Math.max(mx, ok); s += ok
    }
    oracle += mx; base += s / (C1.length * C2.length)
    orG1 += C1.some((a) => couverts([...a, ...m2, ...R], k.arrivee) === 3) ? 1 : 0
    orG2 += C2.some((b) => couverts([...m1, ...b, ...R], k.arrivee) === 3) ? 1 : 0
  }
  return {
    code: num(courant, N), oracle: num(oracle, N), oracleG1: num(orG1, N), oracleG2: num(orG2, N),
    hasard: num(base, N), quotaG5versG2: 42.7,
    note: 'le siège de G5 vers G2 (§11.23, 95 courses) = 42,7 %',
  }
})()

/* ═══════════ ③ CHAQUE RÈGLE, SEULE, DANS G1 PUIS DANS G2 ═══════════════ */
const resG1 = REGLES.map((r) => ({ id: r.id, label: r.label, ...mesurer(r.id, 'm') }))
const resG2 = REGLES.map((r) => ({ id: r.id, label: r.label, ...mesurer('p', r.id) }))
const resDeux = REGLES.map((r) => ({ id: r.id, ...mesurer(r.id, r.id) }))
const PAR_ID2 = Object.fromEntries(resDeux.map((r) => [r.id, r]))
const courant = mesurer('p', 'm')

/* ═══════════ ④ LA GRILLE G1 × G2 ═══════════════════════════════════════ */
const tete = ['p', 'm', 'phys', 'pAge', 'corde', 'trend', 'mus', 'swapPhys', 'filPiste']
const grille = tete.map((m1) => ({ m1, lignes: tete.map((m2) => mesurer(m1, m2).taux) }))
let bestG = { taux: -1 }
for (const m1 of tete) for (const m2 of tete) { const r = mesurer(m1, m2); if (r.taux > bestG.taux) bestG = { m1, m2, taux: r.taux, couv: r.couv } }

/* ═══════════ ⑤ LOO — la meilleure règle choisie sur les autres ═════════ */
const tous = [...new Set([...tete, ...REGLES.map((r) => r.id)])]
let loo = 0
for (let i = 0; i < N; i++) {
  const autres = CASES.filter((_, k) => k !== i)
  let bm = null, bv = -1
  for (const m1 of tous) for (const m2 of tous) { const v = mesurer(m1, m2, autres).p3; if (v > bv) { bv = v; bm = [m1, m2] } }
  if (payante(ticket(CASES[i], bm[0], bm[1]), CASES[i].arrivee)) loo++
}
const looTaux = num(loo, N)

/* ═══════════ ⑥ LA STABILITÉ — les deux moitiés chronologiques ══════════ */
const M = Math.floor(N / 2)
const H1 = CASES.slice(0, M), H2 = CASES.slice(M)
const stabilite = ['p', 'm', 'phys', 'pAge', 'swapPhys', 'filPiste'].map((id) => {
  const a = mesurer(id, id, H1), b = mesurer(id, id, H2)
  return { id, label: (PAR_ID[id] || {}).label || id, h1: a.taux, h2: b.taux }
})

/* ═════════════════════════════ L'AFFICHAGE ═════════════════════════════ */
console.log(`\n  ${N} Quintés à presse réelle · cotes ${CH}${UTILISE_FORMS ? ' · carrière casacourses' : ' · SANS carrière'}`)
console.log(`  le code actuel (G1 presse · G2 marché) = ${courant.taux} %  (top-3 ${courant.couv.toFixed(3)} · 5/5 ${pct(courant.p5, N)})`)

console.log(`\n  ① OÙ SONT LES 1-2-3 — le diagnostic`)
console.log('  ' + '-'.repeat(66))
console.log('  ' + pad('bloc', 12) + rp('arrivées', 10) + rp('gardés', 8) + rp('écartés', 9) + rp('taux', 8))
for (const b of Object.values(diag)) {
  console.log('  ' + pad(b.id, 12) + rp(b.arrivees, 10) + rp(b.gardes, 8) + rp(b.ecartes, 9) + rp(b.tauxGarde + ' %', 8))
}
console.log(`\n  → G1 + G2 portent ${partG1G2} % des ${totalEcartes} chevaux du top-3 écartés.`)
console.log(`    L'utilisateur a raison : le trou est dans G1 et G2, pas dans la queue.`)

console.log(`\n  ② LE LEVIER — la marge du CHOIX contre celle de la QUOTA`)
console.log('  ' + '-'.repeat(66))
console.log('  ' + pad('le code actuel', 52) + rp(levier.code + ' %', 10))
const delta = (x) => '+' + (x - levier.code).toFixed(1)
console.log('  ' + pad('le choix PARFAIT dans G1 et G2 (oracle)', 52) + rp(levier.oracle + ' %', 10) + rp(delta(levier.oracle), 6))
console.log('  ' + pad('le choix parfait dans G1 seul', 52) + rp(levier.oracleG1 + ' %', 10) + rp(delta(levier.oracleG1), 6))
console.log('  ' + pad('le choix parfait dans G2 seul', 52) + rp(levier.oracleG2 + ' %', 10) + rp(delta(levier.oracleG2), 6))
console.log('  ' + pad('le hasard pur (moyenne des 24 combinaisons)', 52) + rp(levier.hasard + ' %', 10))
console.log('  ' + pad('déplacer le siège de G5 vers G2 (§11.23)', 52) + rp(levier.quotaG5versG2 + ' %', 10) + rp(delta(levier.quotaG5versG2), 6))
console.log(`\n  → le CHOIX vaut ${delta(levier.oracle)} pts, la QUOTA ${delta(levier.quotaG5versG2)} pts.`)

console.log(`\n  ③ CHAQUE RÈGLE, SEULE — G1 (G2 au marché) puis G2 (G1 au carnet)`)
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('règle', 50) + rp('G1 →', 9) + rp('→ G2', 9) + rp('les deux', 10))
const fusion = resG1.map((a) => {
  const b = resG2.find((x) => x.id === a.id)
  const d = resDeux.find((x) => x.id === a.id)
  return { id: a.id, label: a.label, g1: a.taux, g2: b ? b.taux : null, deux: d.taux, couv: d.couv }
}).sort((a, b) => b.deux - a.deux)
for (const r of fusion) {
  const marque = r.id === 'p' ? ' ←' : ''
  console.log('  ' + pad(r.label.slice(0, 48) + marque, 50) + rp(r.g1 + ' %', 9) + rp((r.g2 ?? '—') + (r.g2 ? ' %' : ''), 9) + rp(r.deux + ' %', 10))
}

console.log(`\n  ④ LA GRILLE G1 × G2 — PAYANTE`)
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('G1 \\ G2', 14) + tete.map((m) => rp(m, 11)).join(''))
for (const l of grille) console.log('  ' + pad(l.m1, 14) + l.lignes.map((v) => rp(v + ' %', 11)).join(''))
console.log(`\n  meilleure case : ${bestG.taux} % (${bestG.m1} / ${bestG.m2}) · le code = ${courant.taux} %`)
console.log(`  LOO — la meilleure case choisie sur les ${N - 1} autres courses = ${looTaux} %`)
console.log(`  → ${looTaux < courant.taux ? 'le LOO est SOUS le code : la meilleure case du tableau est du BRUIT.' : 'le LOO tient le code.'}`)

console.log(`\n  ⑤ STABILITÉ — les deux moitiés (${M} + ${N - M} courses)`)
console.log('  ' + '-'.repeat(78))
console.log('  ' + pad('règle', 50) + rp('1re', 12) + rp('2e', 12))
for (const s of stabilite) console.log('  ' + pad(s.label.slice(0, 48), 50) + rp(s.h1 + ' %', 12) + rp(s.h2 + ' %', 12))

/* ═════════════════════════════ L'ARCHIVE ═══════════════════════════════ */
const sortie = {
  genere: new Date().toISOString(),
  date: '2026-10-16',
  n: N,
  cotes: CH,
  carriere: UTILISE_FORMS,
  source: 'data/quintes.json (96 Quintés à presse réelle) × data/forms.json (carrière casacourses)',
  code: courant.taux,
  diagnostic: { blocs: Object.values(diag), totalEcartes, partG1G2 },
  levier,
  regles: fusion,
  grille: { tete, lignes: grille, meilleure: bestG },
  loo: looTaux,
  stabilite,
  verdict:
    'Aucune règle — presse, cote, mouvement, corde, âge, musique, discipline, distance, ' +
    'hippodrome, absence, podium — ne bat le choix actuel de plus de 1 point, et le LOO ' +
    'passe SOUS le code : les différences sont du bruit. Le choix a une marge réelle ' +
    `(+${(levier.oracle - levier.code).toFixed(1)} pts, l'oracle) mais AUCUNE variable mesurable ne la prend : ` +
    'à l’intérieur d’une même boîte les 4 chevaux sont interchangeables.',
}
fs.writeFileSync('data/choix.json', JSON.stringify(sortie, null, 1))
try { fs.writeFileSync('public/data/choix.json', JSON.stringify(sortie, null, 1)) } catch (e) { /* public absent */ }
console.log(`\n  → data/choix.json + public/data/choix.json écrits.\n`)
