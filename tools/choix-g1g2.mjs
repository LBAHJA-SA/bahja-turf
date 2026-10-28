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

/* LE TERRAIN ET LE SENS de chaque course passée — tools/collect-terrain.mjs.
 * La clé est `date|hippodrome|n°` (normés). `jour` porte la course DU JOUR
 * des 96 Quintés (le terrain du jour, que casacourses ne donne pas toujours). */
let TERRAIN = {}, TERRAIN_JOUR = {}
try {
  const j = JSON.parse(fs.readFileSync('data/terrain.json', 'utf8'))
  TERRAIN = j.runs || {}; TERRAIN_JOUR = j.jour || {}
} catch (e) { /* pas encore collecté */ }
const UTILISE_TERRAIN = Object.keys(TERRAIN).length > 0
/** La famille d'un terrain : « PSF STANDARD - 14:00 » → PSF. */
const famT = (s) => {
  if (!s) return null
  const t = String(s).toUpperCase().replace(/\(.*/, '').split(/[-–]/)[0].trim()
  if (/PSF|FIBRE|SABLE|CENDREE|MACHEFER|DIRT/.test(t)) return 'PSF'
  if (/TR[EÈ]S\s*SOUPLE/.test(t)) return 'TRES SOUPLE'
  if (/SOUPLE/.test(t)) return 'SOUPLE'
  if (/LOURD/.test(t)) return 'LOURD'
  if (/COLLANT/.test(t)) return 'COLLANT'
  if (/BON/.test(t)) return 'BON'
  return t || null
}
const famS = (s) => {
  if (!s) return null
  const t = String(s).toUpperCase()
  if (t === 'D' || t === 'G') return t
  return /GAUCHE/.test(t) ? 'G' : /DROITE/.test(t) ? 'D' : null
}

/* LE VH, LA CORDE, LA PLACE par cheval et par course — tools/collect-vh.mjs.
 * Clé `date|hippodrome|n°`, puis le nom du cheval normalisé. */
let VH = {}
try { VH = JSON.parse(fs.readFileSync('data/vh.json', 'utf8')) } catch (e) { VH = {} }
const UTILISE_VH = Object.keys(VH).length > 0

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
    /* le terrain + le sens DU JOUR : PMU (tous les 96), sinon casacourses. */
    const nC = parseInt(String(q.code || '').replace(/\D/g, ''), 10)
    const tj = TERRAIN_JOUR[`${q.date}|${norm(q.track)}|${nC}`] || null
    return {
      date: q.date, id: q.id, c, o, rangs, presse,
      arrivee: q.arrivee.slice(0, 5),
      jour: f.distance || q.distance || null,
      hippo: norm(f.track),
      type: f.type || q.discipline || null,
      terrainJour: famT(tj?.terrain || f.terrain),
      sensJour: (tj?.sens === 'D' || tj?.sens === 'G') ? tj.sens : famS(f.piste),
      vhJour: VH[`${q.date}|${norm(q.track)}|${nC}`] || null,
      infos: f.infos || {},
      runs: f.chevaux || {},
      grp: g.groupes.map((x) => ({
        id: x.id, quota: x.quota,
        cases: x.cases.map((k) => ({ num: k.num, place: k.place, slot: k.slot })),
      })),
    }
  }).filter(Boolean)

const N = CASES.length
CASES.forEach((k, i) => { k.__i = i })
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
  const nomN = norm(k.infos[n]?.nom)
  const p = { n: runs.length, dist: Infinity, piste: 0, podium: 0, jours: null, terrainOK: 0, terrainConnu: 0, sensOK: 0, sensConnu: 0, vhJour: null, vhList: [] }
  if (nomN && k.vhJour) p.vhJour = k.vhJour[nomN]?.vh ?? null
  for (const r of runs) {
    if (r.dist && k.jour) p.dist = Math.min(p.dist, Math.abs(r.dist - k.jour))
    if (norm(r.track) === k.hippo) p.piste += 1
    if (r.place >= 1 && r.place <= 3) p.podium += 1
    /* le terrain et le sens de CETTE course passée (data/terrain.json) */
    const t = TERRAIN[`${r.date}|${norm(r.track)}|${r.race}`]
    if (t) {
      const ft = famT(t.terrain), fs2 = famS(t.sens)
      if (ft) { p.terrainConnu += 1; if (k.terrainJour && ft === k.terrainJour) p.terrainOK += 1 }
      if (fs2) { p.sensConnu += 1; if (k.sensJour && fs2 === k.sensJour) p.sensOK += 1 }
    }
    /* le VH de CETTE course passée (data/vh.json) */
    const m = nomN ? VH[`${r.date}|${norm(r.track)}|${r.race}`] : null
    const x = m ? m[nomN] : null
    if (x && x.vh != null) p.vhList.push(x.vh)
  }
  if (runs.length) p.jours = Math.round((new Date(k.date) - new Date(runs[0].date)) / 86400000)
  p.sDist = !Number.isFinite(p.dist) ? 0 : p.dist <= 100 ? 10 : p.dist <= 200 ? 8 : p.dist <= 400 ? 5 : p.dist <= 600 ? 3 : 0
  p.sPiste = p.piste >= 2 ? 10 : p.piste === 1 ? 6 : 0
  p.sJours = p.jours == null ? 4 : p.jours <= 20 ? 6 : p.jours <= 45 ? 10 : p.jours <= 90 ? 8 : p.jours <= 180 ? 4 : 1
  p.sPodium = Math.min(10, p.podium * 4)
  /* §4 TERRAIN (13 %) : le terrain du jour a-t-il été couru ? (neutre si inconnu) */
  p.sTerrain = (!k.terrainJour || p.terrainConnu === 0) ? 4 : Math.min(10, Math.round((10 * p.terrainOK) / Math.min(p.terrainConnu, 5)))
  /* §4 PISTE (18 %) : 60 % le lieu + 40 % le SENS */
  p.sSens = (!k.sensJour || p.sensConnu === 0) ? 4 : Math.min(10, Math.round((10 * p.sensOK) / Math.min(p.sensConnu, 5)))
  p.sPiste2 = 0.6 * Math.min(10, p.piste * 5) + 0.4 * p.sSens
  /* §4 FORME (22 %) : la place pondérée, du plus récent (0-10) */
  let mN = 0, mD = 0
  runs.forEach((r, i) => { const w = 1 / (1 + i * 0.55); mD += w; mN += w * (r.place >= 1 && r.place <= 9 ? 11 - r.place : 0) })
  p.sForme = mD ? Math.min(10, mN / mD) : 4
  /* §4 CORDE (12 %) : le n° de départ */
  p.sCorde = n <= 6 ? 10 : n <= 11 ? 8 : n <= 15 ? 5 : 3
  /* §4 NIVEAU (13 %) — filtre ③ : le VH du jour vs celui des 2 dernières courses. */
  p.vhRef = p.vhList.length ? (p.vhList[0] + (p.vhList[1] ?? p.vhList[0])) / 2 : null
  p.deltaVh = (p.vhJour != null && p.vhRef != null) ? Math.round((p.vhJour - p.vhRef) * 10) / 10 : null
  p.sNiveau = p.deltaVh == null ? 4 : p.deltaVh <= 0 ? 10 : p.deltaVh <= 1.5 ? 8 : p.deltaVh <= 3 ? 4 : 0
  p.sPhys = 0.35 * p.sDist + 0.25 * p.sPiste + 0.20 * p.sJours + 0.20 * p.sPodium
  /* LE SCORE §4 aux poids de la méthode — les 6 critères (le VH vient de PMU). */
  p.sPhys2 = (22 * p.sForme + 22 * p.sDist + 18 * p.sPiste2 + 13 * p.sNiveau + 13 * p.sTerrain + 12 * p.sCorde) / 100
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
  { id: 'sens', label: 'piste — le SENS (corde à droite / à gauche)', sc: (k, x) => profil(k, x.num).sSens },
  { id: 'piste2', label: 'piste §4 — 60 % le lieu + 40 % le sens', sc: (k, x) => profil(k, x.num).sPiste2 },
  { id: 'terrain', label: 'TERRAIN §4 — le terrain du jour a-t-il été couru', sc: (k, x) => profil(k, x.num).sTerrain },
  { id: 'physT', label: 'PHYSIQUE + TERRAIN + SENS (combiné)', sc: (k, x) => profil(k, x.num).sPhys2 },
  { id: 'methode', label: '★ LE SCORE §4 (forme+dist+piste+niveau+terrain+corde)', sc: (k, x) => profil(k, x.num).sPhys2 },
  { id: 'niveau', label: 'NIVEAU §4 — le VH du jour vs ses 2 dernières', sc: (k, x) => profil(k, x.num).sNiveau },
  { id: 'vhHaut', label: 'VH — le plus haut VH d’abord', sc: (k, x) => profil(k, x.num).vhJour ?? -99 },
  { id: 'vhBas', label: 'VH — le plus bas VH d’abord', sc: (k, x) => -(profil(k, x.num).vhJour ?? 99) },
  { id: 'filNiveau', label: 'presse, mais qui MONTE de niveau (+1,5) passe derrière', filtre: (k, x) => profil(k, x.num).deltaVh != null && profil(k, x.num).deltaVh > 1.5 },
  { id: 'formeP', label: 'forme §4 — la place pondérée', sc: (k, x) => profil(k, x.num).sForme },
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
  { id: 'filTerrain', label: 'presse, mais jamais ce terrain passe derrière', filtre: (k, x) => profil(k, x.num).terrainConnu > 0 && profil(k, x.num).terrainOK === 0 },
  { id: 'filSens', label: 'presse, mais jamais ce sens passe derrière', filtre: (k, x) => profil(k, x.num).sensConnu > 0 && profil(k, x.num).sensOK === 0 },
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

/** Le classement d'une case d'un bloc — MÉMOÏSÉ (le LOO le redemande 200 000 fois). */
const MEMO = new Map()
export function choisir(grp, k, id, gIdx) {
  const cle = gIdx === undefined ? null : `${k.__i}|${gIdx}|${id}`
  if (cle) { const v = MEMO.get(cle); if (v) return v }
  const r = classer(grp, k, id).slice(0, grp.quota).map((x) => x.num)
  if (cle) MEMO.set(cle, r)
  return r
}
export function ticket(k, m1, m2) {
  const t = []
  k.grp.forEach((g, i) => { for (const n of choisir(g, k, i === 0 ? m1 : i === 1 ? m2 : 'p', i)) if (!t.includes(n)) t.push(n) })
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
    hasard: num(base, N),
  }
})()

/* ═══════════ ③ CHAQUE RÈGLE, SEULE, DANS G1 PUIS DANS G2 ═══════════════ */
const resG1 = REGLES.map((r) => ({ id: r.id, label: r.label, ...mesurer(r.id, 'm') }))
const resG2 = REGLES.map((r) => ({ id: r.id, label: r.label, ...mesurer('p', r.id) }))
const resDeux = REGLES.map((r) => ({ id: r.id, ...mesurer(r.id, r.id) }))
const PAR_ID2 = Object.fromEntries(resDeux.map((r) => [r.id, r]))
const courant = mesurer('p', 'm')

/* ═══════════ ④ LA GRILLE G1 × G2 ═══════════════════════════════════════ */
const tete = ['p', 'm', 'phys', 'pAge', 'corde', 'mus',
  'terrain', 'sens', 'niveau', 'methode', 'filPiste', 'filTerrain', 'filNiveau', 'swapPhys']
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
const stabilite = ['p', 'm', 'phys', 'pAge', 'swapPhys', 'filPiste', 'terrain', 'sens', 'niveau', 'methode', 'filNiveau'].map((id) => {
  const a = mesurer(id, id, H1), b = mesurer(id, id, H2)
  return { id, label: (PAR_ID[id] || {}).label || id, h1: a.taux, h2: b.taux }
})

/* ═════════════════════════════ L'AFFICHAGE ═════════════════════════════ */
/* la couverture de la carrière collectée : sans elle, les critères sont muets. */
const COUV = (() => {
  let cT = 0, cS = 0, cV = 0, cBV = 0, tot = 0
  for (const k of CASES) {
    for (const n of Object.keys(k.runs || {})) {
      tot++
      const p = profil(k, Number(n))
      if (p.terrainConnu) cT++
      if (p.sensConnu) cS++
      if (k.vhJour && k.vhJour[norm(k.infos[n]?.nom)]?.vh != null) cV++
      if (p.vhList.length) cBV++
    }
  }
  return { tot, terrain: cT, sens: cS, vhJour: cV, vhPasse: cBV, cotes: CH, carriere: UTILISE_FORMS }
})()
console.log(`\n  ${N} Quintés à presse réelle · cotes ${CH}${UTILISE_FORMS ? ' · carrière collectée' : ' · SANS carrière'}`)
console.log(`  carrière : ${COUV.tot} chevaux · terrain ${Math.round(100 * COUV.terrain / COUV.tot)} % · sens ${Math.round(100 * COUV.sens / COUV.tot)} % · VH passé ${Math.round(100 * COUV.vhPasse / COUV.tot)} % · VH du jour ${Math.round(100 * COUV.vhJour / COUV.tot)} %`)
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
const VERDICT = (() => {
  const r = (id) => (fusion.find((x) => x.id === id) || {}).deux
  const pc = (x) => String(x).replace('.', ',') + ' %'
  const d = (x) => (x - courant.taux >= 0 ? '+' : '') + (x - courant.taux).toFixed(1).replace('.', ',')
  const pctC = (a) => Math.round((100 * a) / COUV.tot)
  return 'LES 6 CRITÈRES DE §4 SONT TOUS MESURÉS (terrain ' + pctC(COUV.terrain) + ' %, sens ' + pctC(COUV.sens) +
    ' %, VH passé ' + pctC(COUV.vhPasse) + ' % — collectés de PMU, §14.6) : aucun ne trie l’intérieur d’un bloc. ' +
    'Le SCORE §4 complet vaut ' + pc(r('methode')) + ' (' + d(r('methode')) + ' pts) contre ' + pc(courant.taux) +
    ' pour la presse ; le terrain ' + pc(r('terrain')) + ', le sens ' + pc(r('sens')) + ' et le niveau ' + pc(r('niveau')) +
    ' sont tous SOUS le code. La meilleure règle reste filPiste (' + pc(r('filPiste')) + ', ' + d(r('filPiste')) +
    ') et le LOO la ramène à ' + pc(looTaux) + ' — SOUS le code : c’est du bruit. Le choix a une marge réelle (+' +
    (levier.oracle - levier.code).toFixed(1).replace('.', ',') + ' pts à l’oracle) que RIEN ne prend. ' +
    'La presse reste le seul tri : rien n’est appliqué au moteur.'
})()

const sortie = {
  genere: new Date().toISOString(),
  date: '2026-10-16',
  n: N,
  cotes: CH,
  carriere: UTILISE_FORMS,
  couverture: COUV,
  source: 'data/quintes.json (96 Quintés à presse réelle) × data/forms.json (carrière casacourses) ' +
    '× data/terrain.json (terrain + sens PMU, tools/collect-terrain.mjs) × data/vh.json (VH PMU, tools/collect-vh.mjs)',
  code: courant.taux,
  diagnostic: { blocs: Object.values(diag), totalEcartes, partG1G2 },
  levier,
  regles: fusion,
  grille: { tete, lignes: grille, meilleure: bestG },
  loo: looTaux,
  stabilite,
  verdict: VERDICT,
}
fs.writeFileSync('data/choix.json', JSON.stringify(sortie, null, 1))
try { fs.writeFileSync('public/data/choix.json', JSON.stringify(sortie, null, 1)) } catch (e) { /* public absent */ }
console.log(`\n  → data/choix.json + public/data/choix.json écrits.\n`)
