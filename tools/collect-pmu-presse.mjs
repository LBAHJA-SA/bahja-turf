/* =============================================================================
 * tools/collect-pmu-presse.mjs — LA PRESSE PMU, ARCHIVÉE (20/10/2026)
 *
 * Le trou de tout le travail précédent : la presse n'existe que sur 96 Quintés
 * (`data/quintes.json`). Toute mesure du CHOIX dans un bloc manque donc de
 * puissance — 4 blocs × 96 = trop peu pour départager des règles à ±5 points.
 *
 * Or PMU ARCHIVE ses pronostics, pour n'importe quelle date passée :
 *
 *   GET online.turfinfo.api.pmu.fr/rest/client/61
 *        /programme/{DDMMYYYY}/R{n}/C{m}/pronostics
 *   → { selection: [ { num_partant, rang, commentaire, cote_prob } ], source }
 *
 * Les fichiers d'archive sont nommés `race_R{n}_C{m}_{date}.json` : la clé est
 * déjà là. On collecte donc la sélection PMU de TOUS les Quintés+ français.
 *
 * Sortie : data/corpus/pmu-presse.json  (incrémental)
 *   { "2026-10-05|1|4": { date, R, C, hippo, source, rangs: { "4": 1, "9": 2 … } } }
 *
 *   node tools\collect-pmu-presse.mjs            (ne fait que les manquants)
 *   node tools\collect-pmu-presse.mjs --force    (refait tout)
 *   node tools\collect-pmu-presse.mjs --limit 40 (pour essayer)
 * ============================================================================= */
import fs from 'node:fs'
import path from 'node:path'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const SORTIE = 'data/corpus/pmu-presse.json'
const BASE = 'https://online.turfinfo.api.pmu.fr/rest/client/61/programme'
const force = process.argv.includes('--force')
const limIdx = process.argv.indexOf('--limit')
const LIMIT = limIdx > 0 ? Number(process.argv[limIdx + 1]) : 0

const N = (s) => String(s || '').toUpperCase().replace(/[_\s-]+/g, '').replace(/^HIPPODROMED?/, '').trim()
const jj = (iso) => { const [a, m, d] = iso.split('-'); return d + m + a }

/* ── ① les Quintés+ français des archives, avec leur R/C ─────────────────── */
const FICHIERS = []
for (const d of fs.readdirSync('archives', { withFileTypes: true })) {
  if (!d.isDirectory()) continue
  const dir = path.join('archives', d.name)
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^race_R(\d+)_C(\d+)_(\d{4}-\d{2}-\d{2})\.json$/)
    if (!m) continue
    let j
    try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) } catch { continue }
    const c = j.course || {}
    if (!(c.types_pari || []).includes('QUINTE_PLUS')) continue
    const p = (j.participants || []).filter((x) => Number(x.num) > 0 && Number(x.cote_pmu) > 0)
    if (p.length < 10) continue
    FICHIERS.push({
      R: Number(m[1]), C: Number(m[2]), date: m[3],
      hippo: d.name, num: c.num ?? Number(m[2]),
      arrivee: (c.arrivee || []).map((x) => (Array.isArray(x) ? x[0] : x)).map(Number).filter(Number.isFinite),
      cotes: Object.fromEntries(p.map((x) => [Number(x.num), Number(x.cote_pmu)])),
      corps: Object.fromEntries(p.map((x) => [Number(x.num), {
        age: Number(x.age) || null, poids: Number(x.poids) || null, valeur: Number(x.valeur) || null,
        corde: Number(x.corde) || null, musique: x.musique || '',
        nc: Number(x.nombreCourses) || 0, nv: Number(x.nombreVictoires) || 0,
        np: Number(x.nombrePlaces) || 0, gain: Number(x.gain) || 0, deferre: x.deferre || '',
      }])),
    })
  }
}
/* dédoublonnage sur date|R|C */
const vus = new Set()
const LISTE = FICHIERS.filter((f) => {
  const k = f.date + '|' + f.R + '|' + f.C
  if (vus.has(k)) return false
  vus.add(k)
  return true
})
console.log('')
console.log('  Quintés+ français dans les archives : ' + LISTE.length)

let cache = {}
try { cache = JSON.parse(fs.readFileSync(SORTIE, 'utf8')) } catch { cache = {} }
const aFaire = LISTE.filter((f) => force || !cache[f.date + '|' + f.R + '|' + f.C])
console.log('  déjà en cache : ' + (LISTE.length - aFaire.length) + ' · à collecter : ' + aFaire.length +
  (LIMIT ? '  (limité à ' + LIMIT + ')' : ''))
console.log('')

const get = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

let ok = 0, vide = 0, err = 0
const lot = LIMIT ? aFaire.slice(0, LIMIT) : aFaire
for (let i = 0; i < lot.length; i += 6) {
  await Promise.all(lot.slice(i, i + 6).map(async (f) => {
    const cle = f.date + '|' + f.R + '|' + f.C
    for (let essai = 0; essai < 3; essai++) {
      try {
        const j = await get(BASE + '/' + jj(f.date) + '/R' + f.R + '/C' + f.C + '/pronostics')
        const rangs = {}
        for (const s of j.selection || []) {
          const n = Number(s.num_partant)
          if (Number.isFinite(n) && s.rang != null) rangs[n] = Number(s.rang)
        }
        if (Object.keys(rangs).length < 5) { vide++; cache[cle] = { date: f.date, R: f.R, C: f.C, hippo: f.hippo, rangs: {} } }
        else { ok++; cache[cle] = { date: f.date, R: f.R, C: f.C, hippo: f.hippo, source: j.source || null, rangs } }
        return
      } catch (e) {
        if (essai === 2) { err++; cache[cle] = { date: f.date, R: f.R, C: f.C, hippo: f.hippo, rangs: {}, erreur: e.message } }
        else await new Promise((s) => setTimeout(s, 500 * (essai + 1)))
      }
    }
  }))
  if (i % 60 === 0) process.stdout.write('    ' + Math.min(i + 6, lot.length) + ' / ' + lot.length + '\r')
}
fs.mkdirSync('data/corpus', { recursive: true })
fs.writeFileSync(SORTIE, JSON.stringify(cache))
const remplies = Object.values(cache).filter((x) => Object.keys(x.rangs || {}).length >= 5).length
console.log('    collectés : ' + ok + ' · sans sélection : ' + vide + ' · erreurs : ' + err)
console.log('    cache : ' + Object.keys(cache).length + ' courses · ' + remplies + ' avec une sélection PMU')
console.log('')
