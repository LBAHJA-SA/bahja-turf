// ============================================================================
//  COLLECTEUR — pronostics-turf.info  ->  archive JSON sur le disque
//
//  pronostics-turf.info n'a pas d'archive : chaque jour la page ne montre
//  QUE la course du jour et du lendemain, puis c'est fini. Ce script sauvegarde
//  ce qu'il voit, chaque jour, dans  C:\bahja-TURF\data\synthese.json
//
//  Usage :   node tools/collect-synthese.mjs          (une fois)
//            node tools/collect-synthese.mjs --watch  (toutes les 30 min)
//
//  Option :  node tools/collect-synthese.mjs 2026-09   (remplir un mois)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = path.resolve('data')
const PUBLIC_DIR = path.resolve('public', 'data')
const OUT = path.join(DATA_DIR, 'synthese.json')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------ fetching --- */

async function getHtml(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}


/* ---------------------------------------------------------------------------
 * ⚠ GARDE-FOU DATE — pose le 04/10/2026 apres un bug reel.
 *
 * pronostics-turf.info ne publie QUE la course en cours, et il bascule
 * souvent des l'aube pour le lendemain. Sans controle, une collecte ecrivait
 * la Synthese du 04/10 SOUS LA DATE DU 03/10 : l'archive devenait fausse
 * et la page affichait le mauvais jour.
 * ------------------------------------------------------------------------- */
const MOIS_FR = ['janvier', 'février', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'aout', 'septembre', 'octobre', 'novembre', 'décembre', 'decembre']

/** La date affichee par la page, lue dans son propre HTML → « JJ-MM-AAAA ». */
export function dateDansPage(html) {
  const sansAccent = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const CANON = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const num = {}
  CANON.forEach((m, i) => { num[sansAccent(m)] = i + 1 })
  const variantes = [...new Set(MOIS_FR.map(sansAccent))]
  const pat = new RegExp('\\b(\\d{1,2})\\s+(' + variantes.join('|') + ')\\b', 'gi')
  const h = String(html)
  // on ne retient que les années plausibles : sinon « 2000 » vient d'un width
  const candAnnee = [...h.matchAll(/\b(20[2-9]\d)\b/g)].map((m) => m[1])
  const annee = candAnnee.includes(String(new Date().getFullYear()))
    ? String(new Date().getFullYear())
    : (candAnnee[0] || String(new Date().getFullYear()))
  const jjmm = (j, m) => String(j).padStart(2, '0') + '-' + String(m).padStart(2, '0')
  for (const m of h.matchAll(pat)) {
    const j = parseInt(m[1], 10)
    const mois = num[sansAccent(m[2])]
    if (j >= 1 && j <= 31 && mois) return jjmm(j, mois) + '-' + annee
  }
  const iso = h.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) return iso[3] + '-' + iso[2] + '-' + iso[1]
  const fr = h.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (fr) return String(fr[1]).padStart(2, '0') + '-' + String(fr[2]).padStart(2, '0') + '-' + fr[3]
  return null
}

/** « 2026-10-03 » ou « 03-10-2026 » ou « 03/10 » → « 03-10 ». */
export function enJJMM(x) {
  const t = String(x).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(8, 10) + '-' + t.slice(5, 7)
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})/)
  return m ? m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : t.slice(0, 5)
}

/** Extrait la Récapitulative de la presse : P1..P18 → numéros. */
export function parseRecap(html) {
  const i = html.toUpperCase().indexOf('RECAPITULATIVE')
  if (i < 0) return { rows: [], titre: null, arrivee: null }

  const seg = html.slice(i, i + 9000)
  const rows = []
  for (const m of seg.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((x) => x[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/\s+/g, ' ').trim())
    // cellule 1 = image (Pronostic N) : on ne garde que les deux suivantes
    const nums = cells.slice(1).map(Number).filter(Number.isFinite)
    if (nums.length >= 2) rows.push({ num: nums[0], fois: nums[1] })
    if (rows.length >= 20) break
  }

  // titre de la course
  const avant = html.slice(Math.max(0, i - 3000), i)
  const tm = avant.match(/QUINTE\s+([A-Z0-9À-ÿ'’ \-]{6,80}?)\s*(?:R\d\s*C\d|<\/?(?:b|strong|h\d))/i)
  const titre = tm ? tm[1].trim() : null

  // arrivée publiée sur la page
  const am = html.match(/R[ée]sultat\s+QUINTE[^:]*:\s*([\d\s\-–]{5,40})/i)

  return { rows, titre, arrivee: am ? am[1].trim() : null, datePage: dateDansPage(html) }
}

/* -------------------------------------------------------------- archive --- */

function lire() {
  try { return JSON.parse(fs.readFileSync(OUT, 'utf8')) } catch (e) { return {} }
}
function ecrire(obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tri = {}
  for (const k of Object.keys(obj).sort().reverse()) tri[k] = obj[k]
  const json = JSON.stringify(tri, null, 2)
  fs.writeFileSync(OUT, json, 'utf8')
  // copie servie par Vite : la page peut la lire en /data/synthese.json
  try {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true })
    fs.writeFileSync(path.join(PUBLIC_DIR, 'synthese.json'), json, 'utf8')
  } catch (e) { /* le dossier public peut être absent */ }
  return tri
}

function aujourdhui() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* --------------------------------------------------------- une collecte --- */

export async function collecter(date = aujourdhui()) {
  const html = await getHtml('https://www.pronostics-turf.info/')
  const { rows, titre, arrivee, datePage } = parseRecap(html)
  const db = lire()
  const cle = date
  const synthese = rows.map((r) => r.num)

  // ⚠ LE SITE NE MONTRE QUE LA COURSE EN COURS. Il bascule souvent dès l'aube
  //   pour le lendemain : sans ce contrôle, le backfill 2026-09 écrivait la
  //   Synthèse d'aujourd'hui sous chaque date du mois.
  if (synthese.length && datePage && enJJMM(datePage) !== enJJMM(cle)) {
    console.error(`  ✗ ${cle}  REFUSÉ — le site affiche la course du ${datePage}, pas du ${cle}. Rien n'est écrit.`)
    return null
  }
  const avant = db[cle] || null

  // ⚠ RÈGLE ABSOLUE : on n'écrase JAMAIS une archive avec une collecte vide.
  //   pronostics-turf.info n'affiche que la course du jour ; le lendemain la
  //   page ne contient plus rien et renvoie un HTML vide ou une erreur.
  if (!synthese.length) {
    if (avant && (avant.synthese || []).length) {
      return { date, nb: avant.synthese.length, conserve: true, message: 'Page vide — archive conservée' }
    }
    return { date, nb: 0, conserve: false, message: 'Page vide — rien à enregistrer' }
  }

  db[cle] = {
    date,
    titre: titre || avant?.titre || null,
    synthese,
    fois: rows.map((r) => r.fois),
    arrivee: arrivee || avant?.arrivee || null,
    nb: synthese.length,
    source: 'pronostics-turf.info',
    collecte: new Date().toISOString(),
  }
  ecrire(db)

  return { date, nb: synthese.length, synthese, titre, arrivee, conserve: false }
}

/* --------------------------------------------------------------- CLI --- */

const args = process.argv.slice(2)
const watch = args.includes('--watch')

// node tools/collect-synthese.mjs 2026-09   -> remonte le mois (archives du site)
const mois = args.find((a) => /^\d{4}-\d{2}$/.test(a))

if (mois) {
  const [A, M] = mois.split('-').map(Number)
  const jours = new Date(A, M, 0).getDate()
  console.log(`Remonte ${mois} — ${jours} jours (le site ne garde que le jour J et J+1)`)
  console.log('En pratique seuls les 2 derniers jours seront trouvables.\n')
  for (let d = jours; d >= 1; d--) {
    const date = `${A}-${String(M).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    try {
      const r = await collecter(date)
      console.log(`  ${date}  ${String(r.nb).padStart(2)} numéros  ${r.synthese.join(' ')}`)
    } catch (e) {
      console.log(`  ${date}  ERR ${e.message}`)
    }
    await sleep(1200)
  }
} else {
  const r = await collecter().catch((e) => { console.error('ERREUR :', e.message); process.exit(1) })
  if (r.conserve) {
    console.log(`\n${r.date} — ${r.message}`)
    console.log('Aucune donnée écrasée. Le site ne montre plus cette course.')
  } else if (!r.nb) {
    console.log(`\n${r.date} — ${r.message}`)
  } else {
    console.log(`\n${r.date} — ${r.nb} numéros (source: pronostics-turf.info)`)
    console.log(`  ${r.synthese.join(' · ')}`)
    console.log(`\nArrivée publiée sur la page : ${r.arrivee || '—'}`)
  }
  console.log(`Fichier : ${OUT}`)
}

if (watch) {
  console.log('\nMode watch : collecte toutes les 30 minutes. Ctrl+C pour arrêter.')
  setInterval(async () => {
    try {
      const r = await collecter()
      console.log(`[${new Date().toLocaleTimeString('fr-FR')}] ${r.date} — ${r.nb} numéros : ${r.synthese.join(' ')}`)
    } catch (e) { console.error('échec :', e.message) }
  }, 30 * 60 * 1000)
}