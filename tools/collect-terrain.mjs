/* =============================================================================
 * tools/collect-terrain.mjs — LE TERRAIN ET LE SENS DES COURSES PASSÉES (16/10/2026)
 *
 * §14.2 : les `forms` de casacourses ne donnent ni terrain ni sens (§4 : TERRAIN
 * 13 %, PISTE 18 % dont 40 % de sens). Il faut les retrouver ailleurs.
 *
 *   casacourses : le détail d'une course les porte (track_condition / track_type)
 *                 MAIS seulement ~10 mois en arrière (avant → 0 meeting).
 *   PMU          : `programme/{JJMMAAAA}` porte, pour CHAQUE course et sur TOUT
 *                 l'historique :
 *                     penetrometre.intitule  →  le terrain  (« PSF STANDARD »,
 *                                               « Très souple », « Collant »…)
 *                     corde                  →  le SENS     (« CORDE_DROITE » /
 *                                               « CORDE_GAUCHE »)
 *                     distance, discipline
 *                 → 1 appel par JOURNÉE (toutes les réunions d'un coup).
 *
 * → `data/terrain.json` : { date|hippodrome|n°  →  { terrain, sens, type, dist } }
 *
 *   node tools\collect-terrain.mjs            ne refait que ce qui manque
 *   node tools\collect-terrain.mjs --force    refait tout
 * ============================================================================= */
import fs from 'node:fs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const FORCE = process.argv.includes('--force')
const FICHIER = 'data/terrain.json'
const BASE = 'https://online.turfinfo.api.pmu.fr/rest/client/61/programme/'

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')
/** Les tokens d'un nom d'hippodrome : « HIPPODROME DE CAGNES/MER » → {cagnes, mer}. */
const STOP = new Set(['hippodrome', 'hippodromes', 'de', 'du', 'des', 'd', 'la', 'le', 'les', 'sur', 'en', 'et', 'au', 'aux', 'a', 'l', 'st'])
const toks = (s) => new Set(String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter((x) => x && !STOP.has(x)))
/** Deux hippodromes identiques : l'un des ensembles de tokens contient l'autre.
 *  (« Cagnes-Sur-Mer » {cagnes,mer} ↔ « CAGNES/MER » {cagnes,mer} · « Bordeaux »
 *   {bordeaux} ⊂ « HIPPODROME BORDEAUX LE BOUSCAT » · « Vincennes » ⊂ « PARIS-VINCENNES ».) */
const memes = (a, b) => {
  if (!a.size || !b.size) return false
  const sub = (x, y) => [...x].every((t) => y.has(t))
  return sub(a, b) || sub(b, a)
}
const tokensDe = (h) => { const r = toks(h.libelleLong); for (const t of toks(h.libelleCourt)) r.add(t); return r }
const ddmmyyyy = (d) => { const [y, m, j] = d.split('-'); return j + m + y }

const F = JSON.parse(fs.readFileSync('data/forms.json', 'utf8'))

/* ── 1. toutes les courses à retrouver ─────────────────────────────────── */
/*  kind 'run' = une course PASSÉE d'un cheval (§4 : son terrain, son sens)
 *  kind 'jour' = la course DU JOUR d'un Quinté archivé (le terrain du jour). */
const besoin = new Map()                       // clé → { date, hippo, track, race, kind }
const parDate = new Map()                      // date → Map(hippo → nom brut)
const demander = (date, track, race, kind) => {
  const hippo = norm(track)
  besoin.set(`${date}|${hippo}|${race}`, { date, hippo, track, race, kind })
  if (!parDate.has(date)) parDate.set(date, new Map())
  parDate.get(date).set(hippo, track)
}
for (const k of Object.keys(F)) {
  const c = F[k]
  if (c.erreur) continue
  for (const n of Object.keys(c.chevaux || {})) {
    for (const r of c.chevaux[n]) {
      if (!r.date || !r.track || !r.race) continue
      demander(r.date, r.track, r.race, 'run')
    }
  }
}
/* les 96 Quintés : leur `code` = « C2 » → le n° de course, `track` = l'hippodrome. */
const Q = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
for (const k of Object.keys(Q)) {
  const q = Q[k]
  if (!q.presse || q.presse.length < 10 || !(q.arrivee || []).length) continue
  const n = parseInt(String(q.code || '').replace(/\D/g, ''), 10)
  if (!Number.isFinite(n) || !q.track) continue
  demander(q.date, q.track, n, 'jour')
}

let DB = { runs: {}, jour: {} }
if (!FORCE && fs.existsSync(FICHIER)) {
  try { const old = JSON.parse(fs.readFileSync(FICHIER, 'utf8')); DB.runs = old.runs || {}; DB.jour = old.jour || {} } catch (e) { /* on repart */ }
}
if (FORCE) DB = { runs: {}, jour: {} }

const manquants = [...besoin.keys()].filter((k) => (besoin.get(k).kind === 'run' ? DB.runs[k] : DB.jour[k]) === undefined)
const dates = [...new Set(manquants.map((k) => besoin.get(k).date))].sort()
console.log(`\n  ${besoin.size} courses passées distinctes · ${manquants.length} à retrouver · ${dates.length} journées PMU à lire\n`)

const get = async (u) => {
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

/* ── 2. une journée PMU → toutes ses courses ───────────────────────────── */
const poser = (b, val) => {
  const cle = `${b.date}|${b.hippo}|${b.race}`
  if (b.kind === 'run') DB.runs[cle] = val; else DB.jour[cle] = val
}
const deja = (b) => {
  const cle = `${b.date}|${b.hippo}|${b.race}`
  return (b.kind === 'run' ? DB.runs[cle] : DB.jour[cle]) !== undefined
}

let f = 0
const PAR = 6
for (let i = 0; i < dates.length; i += PAR) {
  await Promise.all(dates.slice(i, i + PAR).map(async (date) => {
    const voulus = parDate.get(date)
    let prog
    try { prog = await get(BASE + ddmmyyyy(date)) } catch (e) { prog = null }
    const reunions = prog?.programme?.reunions || []
    /* quel meeting PMU correspond à chaque hippodrome voulu ? */
    const reuDe = new Map()
    for (const [h, track] of voulus) {
      reuDe.set(h, reunions.find((r) => memes(toks(track), tokensDe(r.hippodrome || {}))) || null)
    }
    for (const b of besoin.values()) {
      if (b.date !== date || deja(b)) continue
      const reu = reuDe.get(b.hippo)
      if (!reu) { poser(b, null); continue }
      const c = (reu.courses || []).find((x) => x.numOrdre === b.race)
      if (!c) { poser(b, null); continue }
      const pen = c.penetrometre || {}
      const surf = (String(c.parcours || '').match(/\(([^)]+)\)/)?.[1] || '').trim()
      poser(b, {
        terrain: pen.intitule || surf || c.typePiste || null,
        sens: c.corde === 'CORDE_DROITE' ? 'D' : c.corde === 'CORDE_GAUCHE' ? 'G' : null,
        type: c.discipline || null,
        dist: c.distance || null,
        pmu: true,
      })
    }
  }))
  f = Math.min(dates.length, i + PAR)
  process.stdout.write(`\r  journées PMU ${f}/${dates.length}…`)
  fs.writeFileSync(FICHIER, JSON.stringify(DB))
}
console.log('\n')

/* ── 3. le bilan ───────────────────────────────────────────────────────── */
const bilan = (obj, nom) => {
  let ok = 0, terrain = 0, sens = 0, nul = 0
  const T = {}
  for (const v of Object.values(obj)) {
    if (v == null) { nul++; continue }
    ok++
    if (v.terrain) { terrain++; const t = String(v.terrain).toUpperCase().split(' - ')[0]; T[t] = (T[t] || 0) + 1 }
    if (v.sens) sens++
  }
  console.log(`  ${nom} — ${ok + nul} entrées · ${ok} retrouvées · ${terrain} avec terrain · ${sens} avec sens · ${nul} introuvables`)
  return T
}
const T = bilan(DB.runs, 'passées  ')
const TJ = bilan(DB.jour, 'du jour  ')
console.log('  terrains (passées) : ' + Object.entries(T).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
console.log('  terrains (du jour) : ' + Object.entries(TJ).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '))
console.log('')
