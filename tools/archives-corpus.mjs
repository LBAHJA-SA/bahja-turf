/* =============================================================================
 * tools/archives-corpus.mjs — LES QUINTÉS FRANÇAIS DE C:\bahja-TURF\archives
 *                             (20/10/2026)
 *
 * Demande de l'utilisateur :
 *   « cherche les Quintés sur les hippodromes français et fais un test sur le
 *     1er, 2e et 3e ensemble, et un test sur le quinté complet. Le test ne
 *     vaut pas cheval par cheval. »
 *
 * On extrait donc des archives locaux les courses qui sont :
 *   · un vrai Quinté+        (types_pari contient QUINTE_PLUS)
 *   · sur un hippodrome FR   (liste blanche — les archives mélangent Suède,
 *                             Singapour, Hong Kong, Belgique…)
 *   · avec une ARRIVÉE       (≥ 5 numéros) — sinon rien n'est mesurable
 *   · avec les cotes          (≥ 10 partants cotés)
 *
 * Sortie : data/corpus/archives-quinte.json
 *
 *   node tools\archives-corpus.mjs
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'archives'
const SORTIE = 'data/corpus/archives-quinte.json'

/* les hippodromes français présents dans les archives (dossiers en MAJ) */
const FR = new Set([
  'PARIS VINCENNES', 'VINCENNES', 'CAGNES SUR MER', 'CAGNES MIDI', 'CHANTILLY',
  'AUTEUIL', 'PAU', 'CAEN', 'DEAUVILLE', 'PARISLONGCHAMP', 'COMPIEGNE', 'LAVAL',
  'AMIENS', 'ENGHIEN', 'SAINT CLOUD', 'LA CAPELLE', 'AGEN LA GARENNE', 'ANGERS',
  'BEAUMONT DE LOMAGNE', 'CLAIREFONTAINE', 'CRAON', 'FEURS', 'LYON PARILLY',
  'MARSEILLE', 'MARSEILLE BORELY', 'MARSEILLE VIVAUX', 'TOULOUSE', 'BORDEAUX',
  'BORDEAUX LE BOUSCAT', 'NANTES', 'REIMS', 'VIRE', 'VIENNE', 'VICHY',
  'MAUQUENCHY', 'GRAIGNES', 'CHERBOURG', 'LES SABLES', 'PONTCHATEAU',
  'SAINT BRIEUC', 'SAINT MALO', 'LE CROISE LAROCHE', 'LE LION', 'CHOLET',
  'ANGOULEME', 'LYON LA SOIE', 'MONTLUCON', 'NIMES', 'SALON DE PROVENCE',
  'HYERES', 'CAVAILLON', 'SABLE SUR SARTHE', 'GEMOZAC', 'ERBRAY',
  'SAINT GALMIER', 'LYON', 'BEAUVAIS', 'MELUN', 'AUCH', 'ALBERT', 'BERNAY',
  'BLAIN', 'DURTAL', 'LIGNIERES', 'JARNAC', 'SAINT YAN', 'PARAY LE MONIAL',
])

const N = (s) => String(s || '').toUpperCase().replace(/[_\s]+/g, ' ').trim()

if (!fs.existsSync(ROOT)) { console.error('dossier ' + ROOT + ' introuvable'); process.exit(1) }

const courses = []
const vus = new Set()
let fichiers = 0, rejetes = { piste: 0, quinte: 0, arrivee: 0, cotes: 0, doublon: 0 }

for (const dir of fs.readdirSync(ROOT)) {
  const p = path.join(ROOT, dir)
  if (!fs.statSync(p).isDirectory()) continue
  const hippo = N(dir)
  if (!FR.has(hippo)) { rejetes.piste++; continue }

  for (const f of fs.readdirSync(p)) {
    if (!f.endsWith('.json')) continue
    fichiers++
    let j
    try { j = JSON.parse(fs.readFileSync(path.join(p, f), 'utf8')) } catch { continue }
    const c = j.course || {}
    const tp = c.types_pari || []
    if (!tp.includes('QUINTE_PLUS') && !c.quinte) { rejetes.quinte++; continue }

    const arrivee = (c.arrivee || [])
      .map((x) => (Array.isArray(x) ? x[0] : x))
      .filter((x) => Number.isFinite(Number(x)))
      .map(Number)
    if (arrivee.length < 5) { rejetes.arrivee++; continue }

    const parts = (j.participants || []).filter((x) => Number(x.cote_pmu) > 0 && Number.isFinite(Number(x.num)))
    if (parts.length < 10) { rejetes.cotes++; continue }

    const date = (j.reunion && j.reunion.date) || (f.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null
    const cle = date + '|' + hippo + '|' + (c.num ?? f)
    if (vus.has(cle)) { rejetes.doublon++; continue }
    vus.add(cle)

    /* on ne garde que les arrivants qui ont réellement une cote */
    const nums = new Set(parts.map((x) => Number(x.num)))
    const arr = arrivee.filter((n) => nums.has(n))
    if (arr.length < 5) { rejetes.cotes++; continue }

    courses.push({
      date, track: hippo, num: c.num ?? null,
      discipline: c.discipline || c.specialty || null,
      distance: Number(c.distance) || null,
      runners: parts.length,
      arrivee: arr,
      cotes: Object.fromEntries(parts.map((x) => [Number(x.num), Number(x.cote_pmu)])),
    })
  }
}

courses.sort((a, b) => String(a.date).localeCompare(String(b.date)))
fs.mkdirSync(path.dirname(SORTIE), { recursive: true })
fs.writeFileSync(SORTIE, JSON.stringify(courses, null, 0))

console.log('\n  ARCHIVES LOCALES — Quintés français exploitables')
console.log('     fichiers lus                ' + fichiers)
console.log('     retenus                     ' + courses.length)
console.log('     rejetés : autre pays ' + rejetes.piste + ' · pas Quinté+ ' + rejetes.quinte +
  ' · sans arrivée ' + rejetes.arrivee + ' · cotes incomplètes ' + rejetes.cotes + ' · doublons ' + rejetes.doublon)
if (courses.length) {
  console.log('     période                     ' + courses[0].date + ' → ' + courses[courses.length - 1].date)
  const parT = {}
  for (const c of courses) parT[c.track] = (parT[c.track] || 0) + 1
  console.log('     hippodromes                 ' + Object.entries(parT).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => k + ' ' + v).join(' · '))
}
console.log('     → ' + SORTIE + '\n')
