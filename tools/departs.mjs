/* =============================================================================
 * tools/departs.mjs — LE TYPE DE DÉPART DU TROT (05/11/2026)
 *
 * Demande de l'utilisateur :
 *   « وفي إحصائيات الأتلي، إن أمكن، أضف الفرز بين سباقات الأوتوستارت والموتطي »
 *   → dans les statistiques ATTELÉ, séparer AUTOSTART et MONTÉ (§ « Trot »).
 *
 * ⚠ LE PROBLÈME : ni `data/quintes.json` ni `data/synthese.json` ne portent le
 *   type de départ. Les archives locales (`archives/`) ont un champ `depart`
 *   rempli 17 fois sur 4 526 — inutilisable. La SEULE source fiable est le
 *   programme PMU, qui écrit le départ dans `categorieParticularite`
 *   (« EUROPEENNE_AUTOSTART », « AUTOSTART »…) et la discipline dans
 *   `discipline` (ATTELE / MONTE).
 *
 *   → data/departs.json + public/data/departs.json
 *
 *   Clés (les deux formes, pour que la page trouve toujours) :
 *     « 2026-11-05_R1_C1 »            ← la forme `cle` de l'archive
 *     « 2026-11-05|C1|VINCENNES »     ← la forme de data/quintes.json
 *
 *   Valeur : { r, c, hippodrome, discipline, depart, conditions }
 *     depart = 'autostart' | 'volté' | null (inconnu)
 *     discipline = 'attelé' | 'monté' | 'plat' | 'haies' | 'autre'
 *
 *   node tools\departs.mjs
 * ============================================================================= */
import fs from 'node:fs'

const PMU = 'https://online.turfinfo.api.pmu.fr/rest/client/61/programme/'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const norm = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '')

const famDisc = (d, specialite) => {
  const s = (String(d || '') + ' ' + String(specialite || '')).toUpperCase()
  if (s.includes('MONTE')) return 'monté'
  if (s.includes('ATTELE') || s.includes('TROT')) return 'attelé'
  if (s.includes('HAIE') || s.includes('STEEPLE') || s.includes('CROSS')) return 'haies'
  if (s.includes('PLAT')) return 'plat'
  return 'autre'
}

/* le départ : la PARTICULARITÉ d'abord, le texte des conditions ensuite */
const lireDepart = (c) => {
  const t = [c.categorieParticularite, c.conditions, c.libelle].filter(Boolean).join(' ').toUpperCase()
  if (/AUTOSTART/.test(t)) return 'autostart'
  if (/VOLTE|VOLTÉ/.test(t)) return 'volté'
  return null
}

/* ── les dates à couvrir : les deux registres ─────────────────────────────── */
const dates = new Set()
const quintes = JSON.parse(fs.readFileSync('data/quintes.json', 'utf8'))
for (const q of quintes) dates.add(q.date)
try {
  const syn = JSON.parse(fs.readFileSync('data/synthese.json', 'utf8'))
  for (const d of Object.keys(syn)) if (syn[d].synthese?.length) dates.add(d)
} catch (e) { /* pas de registre : les quintés suffisent */ }

const liste = [...dates].sort()
console.log(`\n  ${liste.length} dates à lire sur le programme PMU\n`)

const out = { genere: new Date().toISOString(), outil: 'tools/departs.mjs', source: 'PMU programme', courses: {} }
let ok = 0, vides = 0

for (const date of liste) {
  const [y, m, d] = date.split('-')
  const url = PMU + `${d}${m}${y}`
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(25000) })
    if (!r.ok) { vides++; continue }
    const j = await r.json()
    const reunions = j.programme?.reunions || []
    if (!reunions.length) { vides++; continue }
    for (const re of reunions) {
      const h = re.hippodrome || {}
      for (const c of re.courses || []) {
        const fiche = {
          r: re.numOfficiel,
          c: c.numOrdre,
          hippodrome: h.libelleCourt || '',
          discipline: famDisc(c.discipline, c.specialite),
          depart: lireDepart(c),
          conditions: String(c.conditions || '').slice(0, 160),
        }
        out.courses[`${date}_R${re.numOfficiel}_C${c.numOrdre}`] = fiche
        out.courses[`${date}|C${c.numOrdre}|${norm(h.libelleCourt)}`] = fiche
        /* « Paris-Vincennes » s'écrit parfois « Vincennes » et vice-versa */
        const lp = norm(h.libelleCourt)
        out.courses[`${date}|C${c.numOrdre}|PARIS${lp}`] = fiche
        out.courses[`${date}|C${c.numOrdre}|${lp.replace(/^PARIS/, '')}`] = fiche
      }
    }
    ok++
  } catch (e) {
    vides++
    console.log(`  ! ${date} — ${e.message}`)
  }
  await new Promise((res) => setTimeout(res, 120))
}

const valeurs = Object.values(out.courses)

/* ⭐ les alias « date|C{n} » — la forme de data/quintes.json quand son
 * `track` ne s'écrit pas comme l'hippodrome PMU (« Paris-Vincennes » contre
 * « VINCENNES »). On n'ajoute l'alias que s'il ne désigne QU'UNE course :
 * deux réunions le même jour peuvent porter le même n° de course. */
const parDateC = new Map()
for (const [k, v] of Object.entries(out.courses)) {
  if (k.includes('_R')) continue
  const [date, c] = k.split('|')
  const alias = `${date}|${c}`
  if (!parDateC.has(alias)) parDateC.set(alias, [])
  parDateC.get(alias).push(v)
}
let alias = 0
for (const [cle, arr] of parDateC) {
  if (new Set(arr.map((x) => x.r + '|' + x.c)).size !== 1) continue
  if (out.courses[cle]) continue
  out.courses[cle] = arr[0]
  alias++
}

out.resume = {
  dates: liste.length,
  lues: ok,
  vides,
  courses: valeurs.length,
  autostart: valeurs.filter((x) => x.depart === 'autostart').length,
  volte: valeurs.filter((x) => x.depart === 'volté').length,
  monte: valeurs.filter((x) => x.discipline === 'monté').length,
}

fs.writeFileSync('data/departs.json', JSON.stringify(out, null, 1))
try { fs.writeFileSync('public/data/departs.json', JSON.stringify(out, null, 1)) } catch (e) { /* public absent */ }

console.log(`  → ${valeurs.length} courses (${ok}/${liste.length} dates lues)`)
console.log(`     autostart ${out.resume.autostart} · volté ${out.resume.volte} · monté ${out.resume.monte}`)
console.log('  → data/departs.json + public/data/departs.json\n')
