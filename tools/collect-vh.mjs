/* =============================================================================
 * tools/collect-vh.mjs — LE VH, LA CORDE, LA PLACE (16/10/2026)
 *
 * PMU porte, PAR CHEVAL ET PAR COURSE, dans `…/R{n}/C{m}/participants` :
 *
 *     handicapValeur  →  LE VH (§4 : NIVEAU 13 %, filtre ③ « ne monte pas de
 *                         niveau » : +1,5 max vs le VH des 2 dernières courses)
 *     placeCorde      →  la corde (le n° de départ)
 *     ordreArrivee    →  la place
 *     nom             →  pour joindre avec les `forms` de casacourses
 *
 * Il faut le n° de RÉUNION (R) : le programme du jour le donne
 * (`reunions[].numReunion`). D'où : 1 appel programme par JOURNÉE, puis 1 appel
 * participants par COURSE.
 *
 * → `data/vh.json` : { date|hippodrome|n°  →  { nomNorm: { vh, place, corde, num } } }
 *
 *   node tools\collect-vh.mjs            ne refait que ce qui manque
 *   node tools\collect-vh.mjs --force    refait tout
 * ============================================================================= */
import fs from 'node:fs'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const FORCE = process.argv.includes('--force')
const FICHIER = 'data/vh.json'
const BASE = 'https://online.turfinfo.api.pmu.fr/rest/client/61/programme/'

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')
/** Les tokens d'un nom d'hippodrome : « HIPPODROME DE CAGNES/MER » → {cagnes, mer}. */
const STOP = new Set(['hippodrome', 'hippodromes', 'de', 'du', 'des', 'd', 'la', 'le', 'les', 'sur', 'en', 'et', 'au', 'aux', 'a', 'l', 'st'])
const toks = (s) => new Set(String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter((x) => x && !STOP.has(x)))
const memes = (a, b) => {
  if (!a.size || !b.size) return false
  const sub = (x, y) => [...x].every((t) => y.has(t))
  return sub(a, b) || sub(b, a)
}
const tokensDe = (h) => { const r = toks(h.libelleLong); for (const t of toks(h.libelleCourt)) r.add(t); return r }
const ddmmyyyy = (d) => { const [y, m, j] = d.split('-'); return j + m + y }

/* ── 1. toutes les courses dont on veut les partants ──────────────────── */
const besoin = new Map()      // clé → { date, hippo, track, race }
const parDate = new Map()     // date → Map(hippo → nom brut)
const demander = (date, track, race) => {
  const hippo = norm(track)
  besoin.set(`${date}|${hippo}|${race}`, { date, hippo, track, race })
  if (!parDate.has(date)) parDate.set(date, new Map())
  parDate.get(date).set(hippo, track)
}

/* les courses passées de chaque cheval (data/forms.json) */
const F = JSON.parse(fs.readFileSync('data/forms.json', 'utf8'))
for (const k of Object.keys(F)) {
  const c = F[k]; if (c.erreur) continue
  for (const n of Object.keys(c.chevaux || {})) {
    for (const r of c.chevaux[n]) {
      if (!r.date || !r.track || !r.race) continue
      demander(r.date, r.track, r.race)
    }
  }
}
/* les 96 Quintés eux-mêmes (le VH du jour) */
const Q = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
for (const k of Object.keys(Q)) {
  const q = Q[k]
  if (!q.presse || q.presse.length < 10 || !(q.arrivee || []).length || !q.track) continue
  const n = parseInt(String(q.code || '').replace(/\D/g, ''), 10)
  if (Number.isFinite(n)) demander(q.date, q.track, n)
}

let DB = {}
if (!FORCE && fs.existsSync(FICHIER)) { try { DB = JSON.parse(fs.readFileSync(FICHIER, 'utf8')) } catch (e) { DB = {} } }
const manquants = [...besoin.keys()].filter((k) => DB[k] === undefined)
const dates = [...new Set(manquants.map((k) => besoin.get(k).date))].sort()
console.log(`\n  ${besoin.size} courses · ${manquants.length} à lire · ${dates.length} journées\n`)

const get = async (u, essai = 0) => {
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (r.status === 420 || r.status === 429) {
    if (essai < 3) { await new Promise((s) => setTimeout(s, 900 * (essai + 1))); return get(u, essai + 1) }
    throw new Error('rate-limited')
  }
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

/* ── 2. par journée : le programme (pour les R), puis les partants ─────── */
let f = 0
const PAR = 5
for (let i = 0; i < dates.length; i += PAR) {
  await Promise.all(dates.slice(i, i + PAR).map(async (date) => {
    const voulus = parDate.get(date)
    let prog = null
    try { prog = await get(BASE + ddmmyyyy(date)) } catch (e) { prog = null }
    const reunions = prog?.programme?.reunions || []
    for (const [h, track] of voulus) {
      const reu = reunions.find((r) => memes(toks(track), tokensDe(r.hippodrome || {})))
      const R = reu?.numOfficiel
      const nums = [...besoin.values()].filter((b) => b.date === date && b.hippo === h)
      if (!R) { for (const b of nums) DB[`${b.date}|${b.hippo}|${b.race}`] = null; continue }
      await Promise.all(nums.map(async (b) => {
        const cle = `${b.date}|${b.hippo}|${b.race}`
        if (DB[cle] !== undefined) return
        try {
          const p = await get(`${BASE}${ddmmyyyy(b.date)}/R${R}/C${b.race}/participants`)
          const parts = {}
          for (const x of p.participants || []) {
            const nom = norm(x.nom)
            if (!nom) continue
            parts[nom] = {
              vh: x.handicapValeur === undefined ? null : x.handicapValeur,
              place: x.ordreArrivee === undefined ? null : parseInt(x.ordreArrivee, 10) || null,
              corde: x.placeCorde === undefined ? null : parseInt(x.placeCorde, 10) || null,
              num: x.numPmu === undefined ? null : parseInt(x.numPmu, 10) || null,
              nom: x.nom || null,
            }
          }
          DB[cle] = Object.keys(parts).length ? parts : null
        } catch (e) { DB[cle] = null }
      }))
    }
  }))
  f = Math.min(dates.length, i + PAR)
  process.stdout.write(`\r  journées ${f}/${dates.length}…`)
  fs.writeFileSync(FICHIER, JSON.stringify(DB))
  /* petits fichiers → écriture régulière */
}
console.log('\n')

/* ── 3. le bilan ───────────────────────────────────────────────────────── */
let ok = 0, nul = 0, avecVh = 0, chevaux = 0
for (const v of Object.values(DB)) {
  if (v == null) { nul++; continue }
  ok++
  for (const x of Object.values(v)) { chevaux++; if (x.vh != null) avecVh++ }
}
console.log(`  data/vh.json — ${ok + nul} courses · ${ok} avec partants · ${nul} introuvables`)
console.log(`  ${chevaux} partants · ${avecVh} avec un VH (${chevaux ? Math.round(100 * avecVh / chevaux) : 0} %)`)
console.log('')
