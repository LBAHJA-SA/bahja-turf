// ============================================================================
//  JOB QUOTIDIEN — enregistre la Synthèse, le ticket et le résultat
//
//    node tools/daily.mjs            → cycle complet (aujourd'hui + clôture d'hier)
//    node tools/daily.mjs --watch    → toutes les 20 min
//    node tools/daily.mjs --install  → affiche la commande planificateur Windows
//
//  Données écrites :
//    data/synthese.json   la Synthèse + le ticket + l'arrivée, jour par jour
//    data/carriere.json   les carrières saisies (clé = date)
//    data/daily.log       journal
//
//  ⭐ CE JOB NE PUBLIE RIEN. Il écrit public/data/synthese.json (le site le
//    lit en direct), mais ne fait NI commit NI push : l'archive ne part sur
//    le site que par `node tools\publier-archive.mjs`. Sans ça, chaque run
//    du matin remplacerait le site sans que personne l'ait demandé.
// ============================================================================
import fs, { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  buildGrid, classerPartants, classerPhysique, remplirGrille, parseCarriere, scorePhysique, filtres,
  autoCarriere, chargerCourseCC, computeStats,
} from '../src/lib/quinte.js'
import { chargerCotes, chargerEquidia, lireCourse } from './cotes.mjs'

const DATA = path.resolve('data')
const F_SYN = path.join(DATA, 'synthese.json')
const F_CAR = path.join(DATA, 'carriere.json')
const F_LOG = path.join(DATA, 'daily.log')
const F_COT = path.join(DATA, 'cotes.json')
const PUB = path.resolve('public', 'data')
/* Les ENTREES figees au moment ou la ticket a ete posee : sans elles, on ne
 * peut pas rejouer une ticket (le marche bouge, les carrieres arrivent). */
const REPLAY = path.resolve('data', 'replay')
const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const log = (...a) => {
  const line = `[${new Date().toISOString()}] ` + a.join(' ')
  console.log(line.replace(/^\[[^\]]+\]\s*/, ''))
  try { fs.mkdirSync(DATA, { recursive: true }); fs.appendFileSync(F_LOG, line + '\n') } catch (e) {}
}
const lire = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { return def } }
const ecrire = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2), 'utf8') }

function aujourdhui(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function hier(d = new Date()) { const x = new Date(d); x.setDate(x.getDate() - 1); return aujourdhui(x) }
function decale(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return aujourdhui(d) }
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

/* --------------------------------------------------------------- sources --- */

async function getJSON(u) {
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  const j = await r.json().catch(() => null)
  if (!r.ok) throw new Error((j && j.error) || `HTTP ${r.status}`)
  return j
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

/** Récapitulative de la presse, lue directement sur le site.
 *
 *  Le site a un Crawl-delay de 10 s et BLOQUE l'IP au bout de quelques
 *  appels répétés (31 octets, §13.3 règle 3). Le 05/10/2026 le job s'est fait
 *  couper de cette façon. Donc :
 *
 *    1. trois tentatives directes, avec pause croissante (20 / 60 / 180 s)
 *    2. si le site nous bloque encore → le PROPRE proxy de production
 *       `/api/pt/`, qui part de l'IP de Vercel et n'est pas bloqué
 *
 *  Rien n'est écrit tant qu'on n'a pas une vraie Récapitulative.
 */
async function syntheseDuSite() {
  const PATIENCES = [0, 20000, 60000]
  let dernier = null
  for (const [i, ms] of PATIENCES.entries()) {
    if (ms) { log(`     site bloque, nouvelle tentative dans ${Math.round(ms / 1000)} s`); await new Promise((r) => setTimeout(r, ms)) }
    try {
      const r = await fetch('https://www.pronostics-turf.info/', { headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' } })
      if (!r.ok) throw new Error(`site HTTP ${r.status}`)
      const html = await r.text()
      if (html.length < 2000) throw new Error(`page trop courte (${html.length} o) — le site bloque`)
      const s = lireSynthese(html)
      if (i) log(`     site repond a la tentative ${i + 1} — ${s.synthese.length} numeros`)
      return s
    } catch (e) { dernier = e; log(`     tentative ${i + 1} : ${e.message}`) }
  }

  // le site nous coupe : on passe par notre propre proxy, sur l'IP de Vercel
  const REPLIS = ['https://bahja-turf.vercel.app/api/pt/']
  for (const url of REPLIS) {
    try {
      log(`     repli : on passe par le proxy de production (${url})`)
      const r = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!r.ok) throw new Error(`proxy HTTP ${r.status}`)
      const html = await r.text()
      if (html.length < 2000) throw new Error(`proxy a rendu ${html.length} o`)
      const s = lireSynthese(html)
      log(`     repli OK : ${s.synthese.length} numeros via le proxy de production`)
      return s
    } catch (e) { log(`     repli KO : ${e.message}`) }
  }

  throw dernier || new Error('site inaccessible')
}

/** Extrait la Récapitulative d'une page déjà téléchargée. */
function lireSynthese(html) {
  const i = html.toUpperCase().indexOf('RECAPITULATIVE')
  if (i < 0) throw new Error('Récapitulative absente de la page')
  const rows = []
  for (const m of html.slice(i, i + 9000).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((x) => x[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/\s+/g, ' ').trim())
    const nums = cells.slice(1).map(Number).filter(Number.isFinite)   // 1re cellule = <img alt="Pronostic N">
    if (nums.length >= 2) rows.push({ num: nums[0], fois: nums[1] })
    if (rows.length >= 20) break
  }
  if (!rows.length) throw new Error('tableau vide')
  return { synthese: rows.map((r) => r.num), fois: rows.map((r) => r.fois), datePage: dateDansPage(html) }
}

/* ⚠ 10/10/2026 — casacourses N'A PAS toutes les réunions (aujourd'hui il ne
 * sort que Pontchâteau R12 alors que le Quinté est à CAEN R1 C4 → ticket
 * null le matin). Equidia, lui, publie la redirection `quinte` dans le JSON
 * de toute page : on identifie la course (R/C) puis on la recharge. */
async function cleQuinteEquidia(date) {
  const candidats = [
    `https://www.equidia.fr/programme-courses/${date}`,
    `https://www.equidia.fr/courses/${date}/R1/C1`,
  ]
  for (const u of candidats) {
    try {
      const rep = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
      if (rep.status >= 500) continue
      const html = await rep.text()
      const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
      if (!m) continue
      const txt = m[1]
        .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
      const j = JSON.parse(txt)
      const redir = j?.quinte?.redirection || ''
      const mm = redir.match(/\/courses\/\d{4}-\d{2}-\d{2}\/R(\d+)\/C(\d+)/)
      if (mm) return { r: mm[1], c: mm[2] }
    } catch { /* candidat suivant */ }
  }
  return null
}

async function trouverCourseEquidia(date) {
  const cle = await cleQuinteEquidia(date)
  if (!cle) { log(`     equidia : pas de clé Quinté pour ${date}`); return null }
  const { r, c } = cle
  const courseId = `${date}_R${r}_C${c}`
  let etat = null
  try { etat = await chargerEquidia(date, r, c) } catch (e) { log(`     equidia KO : ${e.message}`); return null }
  if (!etat) { log(`     equidia : page illisible`); return null }
  const v = etat[`v2/courses/${date}/R${r}/C${c}`]
  if (!v) { log(`     equidia : fiche course absente`); return null }
  const course = v.course || v
  const partants = (course.partants || []).map((p) => ({
    num: Number(p.num_partant),
    horse: p.cheval?.nom_cheval || '',
    corde: Number(p.num_partant),
  }))
  if (!partants.length) { log(`     equidia : pas de partants`); return null }
  const hippo = v.reunion?.lib_reunion || v.reunion?.hippodrome?.name || '?'
  const reelle = (course.real_heure_course || '').match(/T(\d{2}:\d{2})/)
  const heure = reelle ? reelle[1] : (course.heure_depart_course || null)
  log(`     equidia : ${hippo} C${c} · ${partants.length} partants · ${course.distance}m · départ ${heure} (Paris)`)
  return {
    courseId,
    heure,
    arrivee: null,
    participants: partants,
    discipline: course.discipline || 'PLAT',
    distance: Number(course.distance) || 0,
    nbPartants: partants.length,
    hippodrome: hippo,
    cover: null,
    source: 'equidia',
  }
}

export async function trouverCourse(date, synthese, courseIdForce) {
  let det = null
  try { det = await chargerCourseCC(date, synthese) } catch (e) { log(`     casacourses KO : ${e.message}`) }
  const parts = det?.participants || []
  if (!parts.length) {
    /* plan B (10/10/2026) : la réunion du Quinté peut manquer chez
     * casacourses (CAEN absent aujourd'hui → ticket null le matin). On
     * bascule sur equidia — jamais de données inventées : si equidia ne
     * donne rien non plus, on retourne null et le moteur dit « pas de
     * ticket » plutôt que de fabriquer un ordre fantaisiste. */
    return trouverCourseEquidia(date)
  }
  // autoCarriere veut un id « AAAA-MM-JJ_Rn_Cm » : on le reconstruit
  const fid = det.raw?.reunion_code && det.raw?.code ? `${date}_${det.raw.reunion_code}_${det.raw.code}` : (det.courseId || null)
  log(`     casacourses : ${det.hippodrome} ${det.raw?.code || '? '} · ${det.nbPartants} partants · ${det.distance}m · cover ${det.cover}`)
  return {
    courseId: fid,
    heure: det.raw?.time_hm || det.raw?.time || det.heure || null,
    arrivee: det.arrivee,
    participants: parts,
    discipline: det.discipline,
    distance: det.distance,
    nbPartants: det.nbPartants,
    hippodrome: det.hippodrome,
    cover: det.cover,
  }
}
/* ------------------------------------------------------------- le ticket --- */

export async function construireTicket(synthese, course, carriere, courseId, opts = {}) {
  if (!course) return null
  const grid = buildGrid(synthese, course.participants.map((p) => p.num))
  const courseJour = {
    dist: course.distance || 2500,
    surf: /ATTELE|TROT/i.test(course.discipline || '') ? 'PSF' : 'Gazon',
    sens: 'D',
    discipline: course.discipline || 'PLAT',
    hippo: course.hippodrome || '',
  }

  let mode = 'defaut'
  // ① la carrière saisie par l'utilisateur (data/carriere.json)
  let cars = carriere
  // ② sinon on va la chercher automatiquement (pro.casacourses)
  if ((!cars || !Object.keys(cars).length) && courseId) {
    try {
      const a = await autoCarriere(courseId, () => {})
      cars = parseCarriere(a.texte)
      mode = 'auto'
      log(`     carriere auto : ${a.couverture.chevaux} chevaux, ${a.couverture.hippoConnus}/${a.couverture.forms} hippodromes`)
    } catch (e) {
      log(`     carriere auto impossible (${e.message}) — on garde l'ordre de la Synthese`)
    }
  }

  let classement
  let detailScores = []
  if (cars && Object.keys(cars).length) {
    const sc = []
    for (const p of course.participants) {
      const runs = cars[p.num]
      if (!runs || !runs.length) continue
      const s = scorePhysique(p, runs, courseJour)
      const f = filtres(p, runs, courseJour)
      sc.push({ p, s, f, ok: f.filter((x) => x.ok).length })
    }
    if (sc.length) {
      classement = classerPhysique(sc)
      mode = mode === 'auto' ? 'auto' : 'physique'
      // ⚠ dataset de réglage : TOUT par cheval (scores + critères + filtres).
      //   Sans ça, impossible de comprendre un 3/5 après coup — ni de régler un jour.
      detailScores = sc.map((x) => ({ num: x.p.num, nom: x.p.horse || x.p.nom || '', global: x.s?.global ?? null, forme: x.s?.score ?? x.s?.forme ?? null, dist: x.s?.dist ?? null, piste: x.s?.piste ?? null, niveau: x.s?.niveau ?? null, terrain: x.s?.terrain ?? null, corde: x.s?.corde ?? null, filtres: (x.f || []).map((f) => !!f.ok), ok: x.ok ?? null }))
    }
  }
  if (!classement) { classement = classerPartants(course.participants, courseJour.discipline); mode = 'defaut' }

  // 📈 LE MARCHÉ — equidia.fr. S'il a la cote de tous les partants, c'est
  //    elle qui remplit les quotas (les quota meilleures cotes).
  //    Sinon on retombe sur le classement physique.
  //    ⚠ 10/10/2026 : `opts.frais` (re-gel FINAL) FORCE la relecture du
  //    marché — sinon chargerCotes renvoie le cache du matin et le FINAL
  //    ne change jamais rien (le marché devient un décor).
  const cotes = opts.sansMarche ? {} : await chargerCotes(courseId, { force: !!opts.frais })
  if (Object.keys(cotes).length >= 4) mode += '+marche'

  // 📊 l'ORDRE du ticket vient des probabilités de place de l'archive.
  //    On ne compte que les courses DÉJÀ clôturées (avec une arrivée).
  const archiveLue = JSON.parse(fs.readFileSync(F_SYN, 'utf8'))
  const stats = computeStats(Object.values(archiveLue).filter((x) => x.arrivee?.length))

  const r = remplirGrille(grid, classement, courseJour.discipline, cotes, stats)
  const prisSet = new Set(r.ticket)
  const surprises = []
  return {
    ticket: r.ticket, mode, surprises,
    groupes: r.detail.map((g) => ({ id: g.id, pris: g.cases.filter((c) => c.pris).map((c) => c.num) })),
    scores: detailScores.map((d) => ({ ...d, pris: prisSet.has(d.num) })),
    /* ⭐ LES ENTREES, pour pouvoir REJOUER la ticket plus tard (§13.3.4).
     * Sans ça, on ne peut pas reproduire un résultat : le marché bouge, les
     * carrières arrivent, les stats changent. Avec ça, n'importe quel changement
     * du moteur se voit immédiatement sur une course déjà jouée. */
    inputs: {
      synthese: grid.synthe,
      nums: course.participants.map((p) => p.num),
      courseJour,
      classement: classement.map((x) => ({ num: x.p.num, s: x.s || null, ok: x.ok ?? null })),
      cotes, stats, cars: cars || null,
      discipline: courseJour.discipline,
    },
  }
}

/* ------------------------------------------------------------------ cycle --- */


/** Clôture d'une date passée : on récupère le RÉSULTAT, jamais la Synthèse. */
async function cloturer(date) {
  const db = lire(F_SYN, {})
  const avant = db[date]
  if (!avant || !avant.synthese || !avant.synthese.length) { log(`  ${date}  rien à clôturer`); return null }
  let course = null
  try { course = await trouverCourse(date, avant.synthese, avant.courseId) } catch (e) { log(`  ${date}  course introuvable : ${e.message}`) }
  if (!course) return null
  if (!course.arrivee) { log(`  ${date}  pas encore disputée — on repassera`); return null }
  const rec = { ...avant,
    runners: course.participants.map((p) => p.num).sort((a, b) => a - b),
    nbPartants: course.nbPartants, discipline: course.discipline, distance: course.distance,
    hippodrome: course.hippodrome || avant.hippodrome || avant.race?.hippodrome || null,
    courseId: course.courseId, arrivee: course.arrivee, cloture: new Date().toISOString() }
  /* 🔒 LE GEL AU MOMENT DE LA CLÔTURE : si la ticket n'a pas été posée le jour
   *    J (le moteur n'était pas prêt / pas de carrière), on la fige MAINTENANT
   *    à partir du moteur avant d'écrire l'arrivée. Sinon la course est
   *    classée SANS ticket (pas de x/5) — ce qui est arrivé le 06/10.
   *    Si un ticket existe déjà (choix du job du matin), ON NE Y TOUCHE PAS. */
  if (!Array.isArray(avant.ticket) || !avant.ticket.length) {
    try {
      const t = await construireTicket(
        avant.synthese, course, lire(F_CAR, {})[date] || null, avant.courseId || course.courseId
      )
      const fige = figerTicket(avant, t)
      if (fige.ticket && fige.ticket.length) {
        rec.ticket = fige.ticket
        rec.ticketMode = fige.ticketMode
        rec.groupes = fige.groupes
        rec.ticketSource = fige.ticketSource
        rec.surprises = fige.surprises
        rec.ticketPoseLe = fige.ticketPoseLe
        for (const l of fige.log || []) log(l)
        log(`  ${date}  ticket figé à la clôture : ${fige.ticket.join(' ')}  (${fige.ticketMode})`)
      } else {
        log(`  ${date}  pas de ticket à la clôture (moteur indisponible)`)
      }
    } catch (e) {
      log(`  ${date}  construction du ticket impossible : ${e.message}`)
    }
  }
  db[date] = rec
  const tri = {}
  for (const k of Object.keys(db).sort().reverse()) tri[k] = db[k]
  ecrire(F_SYN, tri)
  try { fs.mkdirSync(PUB, { recursive: true }); fs.writeFileSync(path.join(PUB, 'synthese.json'), JSON.stringify(tri, null, 2)) } catch (e) {}
  let bilan = ''
  if (rec.ticket) {
    const t = new Set(rec.ticket)
    const p = rec.arrivee.filter((n) => t.has(n)).length
    bilan = `  ->  ${p}/5` + (p < 5 ? `   manquants : ${rec.arrivee.filter((n) => !t.has(n)).join(', ')}` : '')
  } else bilan = `   (pas de ticket)  arrivee ${rec.arrivee.join('-')}`
  log(`  ${date}  arrivee ${rec.arrivee.join('-')}${bilan}`)
  return rec
}

/* ------------------------------------------------------------- le gel --- */

/**
 * ⭐ LE GEL DE LA TICKET (§13.3.4)
 *
 * `avant` = la ligne d'archive telle qu'elle est deja ecrite sur le disque.
 * `t`     = ce que le moteur donne AUJOURD'HUI (null si la course est introuvable).
 *
 * Renvoie la ligne a ecrire, plus les messages a journaliser. Regle unique :
 *
 *   - pas de ticket encore -> on pose celui du moteur, et on note l'heure.
 *   - ticket deja pose     -> ON NE Y TOUCHE PAS. `ticketMoteur` rappelle ce que
 *                             le moteur dirait aujourd'hui, pour comparaison.
 *   - ticket `manuel`      -> intouchable, comme toujours.
 *
 * Ce qui est interdit, et qui se produisait : reecrire la ticket parce que le
 * marche vient d'arriver. Le 05/10/2026 la ticket est passee de 5/5 (00 h 32)
 * a 4/5 (08 h 45) sans que personne ne decide quoi que ce soit.
 *
 * @returns {{ticket:number[]|null, ticketMode:string|null, groupes:any,
 *            ticketSource:string|null, surprises:number[], ticketPoseLe:string|null,
 *            ticketMoteur:number[]|null, log:string[]}}
 */
export function figerTicket(avant, t, opts = {}) {
  const dejaPose = Array.isArray(avant.ticket) && avant.ticket.length > 0
  const out = {
    ticket: avant.ticket || null,
    ticketMode: avant.ticketMode || null,
    groupes: avant.groupes || null,
    ticketSource: avant.ticketSource || null,
    surprises: avant.surprises || [],
    ticketPoseLe: avant.ticketPoseLe || null,
    ticketMoteur: avant.ticketMoteur || null,
    ticketMatin: avant.ticketMatin || null,
    log: [],
  }
  if (t) out.ticketMoteur = t.ticket

  /* ⭐ LE REGEL D'AVANT-COURSE (09/10/2026) : UNE fois, pas plus.
   *   Le gel du matin fige un marché de nuit (01:55, 02:33…) qui n'a aucune
   *   valeur. Entre 90 et 10 min avant le départ, on RE-gèle UNE fois avec
   *   le marché du moment — puis c'est verrouillé comme le reste.
   *   Écrasable : rien / auto / page. Intouchable : manuel / final. */
  const ecrasable = !out.ticketSource || out.ticketSource === 'auto' || out.ticketSource === 'page'
  if (opts.final && dejaPose && t && ecrasable && out.ticketSource !== 'manuel' && out.ticketSource !== 'final') {
    if (!out.ticketMatin) out.ticketMatin = avant.ticket
    out.ticket = t.ticket
    out.ticketMode = t.mode
    out.groupes = t.groupes
    out.ticketSource = 'final'
    out.surprises = t.surprises || []
    out.ticketPoseLe = new Date().toISOString()
    out.log.push(`     ticket FINAL : ${t.ticket.join(' ')}  (${t.mode})`)
    out.log.push(`     ticket matin conserve : ${(out.ticketMatin || []).join(' ')}`)
    return out
  }

  if (!dejaPose && t) {
    out.ticket = t.ticket
    out.ticketMode = t.mode
    out.groupes = t.groupes
    out.ticketSource = opts.final ? 'final' : 'auto'
    out.surprises = t.surprises || []
    out.ticketPoseLe = new Date().toISOString()
  }

  const same = t && JSON.stringify(t.ticket) === JSON.stringify(avant.ticket)
  if (out.ticketSource === 'manuel') {
    out.log.push('     ticket manuel conserve')
  } else if (out.ticketSource === 'final' && !opts.final) {
    out.log.push(`     ticket FINAL conserve : ${(out.ticket || []).join(' ')}`)
  } else if (dejaPose && t && !same) {
    out.log.push(`     ticket conserve    : ${(avant.ticket || []).join(' ')}`)
    out.log.push(`     moteur aujourd'hui : ${t.ticket.join(' ')}  (${t.mode}) - NON ecrase`)
  } else if (/marche/.test(out.ticketMode || '')) {
    out.log.push(`     marche lu - surprises ${(out.surprises || []).join(' ') || '-'}`)
  }
  return out
}

/* Heure actuelle à Paris (fuseau du Quinté), en minutes depuis minuit. */
function minutesParis(d = new Date()) {
  const p = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  return p.getHours() * 60 + p.getMinutes()
}

/* ⭐ TOUT S'AFFICHE EN GMT (09/10/2026, instruction utilisateur).
 *   Les heures de course arrivent en heure de Paris : on convertit pour
 *   l'affichage. La fenêtre [départ-90, départ-10] se calcule en Paris
 *   (fuseau de la course), mais se LIT en GMT. */
function minutesGMT(d = new Date()) {
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

function parisVersGMT(minParis, d = new Date()) {
  const decalage = (new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Paris' })) - d) / 60000
  return Math.round(minParis - decalage)
}

/* ⭐ LES 3 INSTANTS DU MARCHÉ (09/10/2026, instruction utilisateur).
 *   Pour savoir QUEL timing donne les meilleurs tickets, on photographie
 *   le marché 3 fois par course : à l'ouverture (04:30, tâche dédiée),
 *   à H-3 et à H-2 (runs --final qui passent par là).
 *   Stockage : data/cotes.json[courseId].snapshots.{ouverture,h_moins_3,
 *   h_moins_2} = {heure, cotes}. La racine `cotes` suit TOUJOURS le dernier
 *   marché lu (compat : chargerCotes + repli page inchangés) — seuls les
 *   snapshots s'accumulent, jamais écrasés. */
export async function snapshotMarche(date, label) {
  const db = lire(F_SYN, {})
  const avant = db[date]
  if (!avant || !avant.synthese || !avant.synthese.length) { log(`  ${date}  snapshot ${label} : pas de Synthèse`); return null }
  let courseId = avant.courseId || null
  if (!courseId) {
    try {
      const course = await trouverCourse(date, avant.synthese, null)
      courseId = course?.courseId || null
    } catch (e) { /* ci-dessous */ }
  }
  const m = String(courseId || '').match(/^(\d{4}-\d{2}-\d{2})_R(\d+)_C(\d+)$/)
  if (!m) { log(`  ${date}  snapshot ${label} : courseId illisible`); return null }
  const [, d, r, c] = m
  let etat = null
  try { etat = await chargerEquidia(d, r, c) } catch (e) { log(`  ${date}  snapshot ${label} : equidia KO (${e.message})`); return null }
  if (!etat) { log(`  ${date}  snapshot ${label} : page Equidia illisible`); return null }
  const cotes = lireCourse(etat, d, r, c)
  if (cotes.length <= 4) { log(`  ${date}  snapshot ${label} : marché insuffisant (${cotes.length})`); return null }
  const cache = lire(F_COT, {})
  const prec = cache[courseId] || {}
  if (prec.snapshots?.[label]?.cotes?.length > 4) { log(`  ${date}  snapshot ${label} : déjà pris à ${(prec.snapshots[label].heure || '').slice(11, 16)} GMT`); return prec.snapshots[label] }
  const snap = { heure: new Date().toISOString(), cotes }
  cache[courseId] = {
    ...prec,
    source: 'equidia.fr',
    favori: cotes.find((x) => x.favori)?.num ?? prec.favori ?? null,
    snapshots: { ...(prec.snapshots || {}), [label]: snap },
    cotes,
  }
  ecrire(F_COT, cache)
  try { fs.mkdirSync(PUB, { recursive: true }); fs.copyFileSync(F_COT, path.join(PUB, 'cotes.json')) } catch (e) {}
  log(`  ${date}  snapshot ${label} : ${cotes.length} cotes @ ${snap.heure.slice(11, 16)} GMT`)
  return snap
}

function enMinutes(hhmm) {
  const m = String(hhmm || '').match(/(\d{1,2})[:hH]?(\d{2})/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Re-gel d'avant-course : UNE fois, dans la fenêtre [départ-90, départ-10].
 *  Le gel du matin fige un marché de nuit sans valeur (01:55, 02:33…) : on
 *  re-gèle avec le marché du moment, puis c'est verrouillé (final > auto).
 *  Hors fenêtre, course déjà courue, déjà final ou manuel : on ne touche à
 *  rien et on le dit. */
async function finaliserJour(date) {
  const db = lire(F_SYN, {})
  const avant = db[date]
  if (!avant || !avant.synthese || !avant.synthese.length) { log(`  ${date}  rien à finaliser (pas de Synthèse)`); return null }
  if (avant.arrivee && avant.arrivee.length) { log(`  ${date}  déjà courue (${avant.arrivee.join('-')}) — pas de re-gel`); return null }
  if (avant.ticketSource === 'final') { log(`  ${date}  déjà FINAL (${(avant.ticket || []).join(' ')}) — verrouillé`); return null }
  if (avant.ticketSource === 'manuel') { log(`  ${date}  ticket manuel — intouchable`); return null }

  let heure = avant.heure || null
  let course = null
  try {
    course = await trouverCourse(date, avant.synthese, avant.courseId)
    if (course && !heure) heure = course.heure || null
  } catch (e) { log(`  ${date}  course introuvable : ${e.message}`); return null }
  if (!course) return null
  const depart = enMinutes(heure)
  if (depart == null) { log(`  ${date}  heure de départ inconnue — pas de re-gel`); return null }
  const now = minutesParis()
  const hh = (m) => String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0') + ':' + String(((m % 1440) + 1440) % 1440 % 60).padStart(2, '0')
  /* Les 2 snapshots intermédiaires : fenêtres de 30 min (cadence des runs),
   * bornes incluses — un run tombe toujours dedans. Un seul snapshot par
   * label (le premier qui passe) : après, c'est verrouillé comme le reste. */
  if (now >= depart - 195 && now <= depart - 165) await snapshotMarche(date, 'h_moins_3')
  if (now >= depart - 135 && now <= depart - 105) await snapshotMarche(date, 'h_moins_2')
  if (now < depart - 90 || now > depart - 10) {
    log(`  ${date}  hors fenêtre (départ ${hh(parisVersGMT(depart))} GMT, il est ${hh(minutesGMT())} GMT — fenêtre ${hh(parisVersGMT(depart - 90))}→${hh(parisVersGMT(depart - 10))} GMT)`)
    return null
  }

  const cars = lire(F_CAR, {})
  const t = await construireTicket(avant.synthese, course, cars[date] || null, avant.courseId || course.courseId, { frais: true })
  if (!t) { log(`  ${date}  moteur indisponible — pas de re-gel`); return null }
  const f = figerTicket(avant, t, { final: true })
  for (const l of f.log) log(l)
  if (f.ticketSource !== 'final') { log(`  ${date}  re-gel refusé (source ${avant.ticketSource})`); return null }

  const rec = {
    ...avant, date,
    ticket: f.ticket, ticketMode: f.ticketMode, groupes: f.groupes,
    ticketSource: f.ticketSource, surprises: f.surprises, ticketPoseLe: f.ticketPoseLe,
    ticketMatin: f.ticketMatin, ticketMoteur: f.ticketMoteur,
    scores: (t.scores && t.scores.length ? t.scores : avant.scores) || null,
    collecte: new Date().toISOString(),
  }
  db[date] = rec
  const tri = {}
  for (const k of Object.keys(db).sort().reverse()) tri[k] = db[k]
  ecrire(F_SYN, tri)
  try { fs.mkdirSync(PUB, { recursive: true }); fs.writeFileSync(path.join(PUB, 'synthese.json'), JSON.stringify(tri, null, 2)) } catch (e) {}
  log(`  ${date}  FINAL gelé à ${hh(minutesGMT())} GMT (départ ${hh(parisVersGMT(depart))} GMT)`)
  return rec
}

/** Journée du jour : lit la Synthèse sur le site, construit le ticket, enregistre. */
async function collecterJour(date) {
  const db = lire(F_SYN, {})
  const cars = lire(F_CAR, {})
  const avant = db[date] || {}
  let syn = null, source = '', placeholder = false
  try {
    const s = await syntheseDuSite()
    if (!s.synthese.length) throw new Error('vide')
    // ⚠ LE SITE NE MONTRE QUE LA COURSE EN COURS. S'il affiche déjà celle de
    //   demain, sa Synthèse n'a rien à faire sous la date d'aujourd'hui.
    if (enJJMM(s.datePage) !== enJJMM(date)) {
      throw new Error(`le site affiche la course du ${s.datePage}, pas du ${date}`)
    }
    syn = s.synthese; source = 'pronostics-turf.info'
    log(`  ${date}  site : ${syn.length} numeros - ${syn.join(' ')}`)
  } catch (e) {
    log(`  ${date}  site indisponible (${e.message})`)
    // Ordre de priorite STRICT : site > archive. Plus de 3e source :
    // Bahja-TURF ne parle a aucun autre backend. Si le site bloque, on garde
    // l'archive (elle a ete collectee sur le site) - sinon rien n'est ecrit.
    if (avant.synthese && avant.synthese.length) { syn = avant.synthese; source = avant.source; log('     -> archive existante conservee') }
    else { log(`  ${date}  ECHEC : site indisponible et archive vide - rien ecrit`); return null }
  }
  if (!syn || !syn.length) { log(`  ${date}  page vide - rien ecrit`); return null }

  let course = null
  try { course = await trouverCourse(date, syn, avant.courseId) } catch (e) { log(`     course introuvable : ${e.message}`) }

  const dejaPose = Array.isArray(avant.ticket) && avant.ticket.length > 0
  const forcerMoteur = process.argv.includes('--moteur')

  /* ⭐⭐ LE MOTEUR NE TOURNE QU'UNE SEULE FOIS PAR DATE.
   *
   * Objectif : des resultats stables, pour qu'un changement du moteur se voie
   * exactement sur la course ou il casse. Si la ticket etait recalculee a
   * chaque run, le marche qui bouge, la carriere qui arrive et les stats qui
   * changent masqueraient le probleme — on ne saurait plus ou est le defaut.
   *
   * Donc : si une ticket est deja posee, on NE LA RECALCULE PAS. Elle reste.
   * `--moteur` force le calcul quand on veut comparer (page, mise au point). */
  let t = null
  if (dejaPose && !forcerMoteur) {
    log(`     moteur NON relance — ticket deja pose le ${(avant.ticketPoseLe || avant.collecte || '').slice(0, 16).replace('T', ' ')} (--moteur pour comparer)`)
  } else {
    t = await construireTicket(syn, course, cars[date] || null, avant.courseId || course?.courseId)
  }

  /* UN TICKET DEJA POSE N EST JAMAIS ECRASE.
   *
   * Regle simple, §13.3.4 : la PREMIERE ticket que le moteur donne pour cette
   * date EST celle de l'archive. Les runs suivants ne font que la comparer.
   *
   * Ce qui se passait avant (05/10/2026) : la condition portait sur
   * `/marche/.test(t.mode)`, donc CHAQUE run ou le marche etait complet
   * reecrivait la ticket. Trois fois dans la meme matinee :
   *
   *     00 h 32   9 11  8  5 13  3  7  4   ->  5/5   *
   *     05 h 39   9 12  8  5  6  3  7  1   ->  3/5
   *     08 h 45   9 12 13  3  7  8  5  1   ->  4/5   <- celle de l'archive
   *
   * n°11 (2e de l'arrivee, 3e case du carnet) sortait de G1 quand le marche
   * est arrive : 8@7,1 est meilleur que 11@8,7. Le 5/5 du matin est mort.
   *
   * Le marche continue de bouger (§11.17) et la PAGE continue de le suivre :
   * c'est elle qu'on joue. Mais l'archive dit ce que le moteur a donne, et
   * `ticketMoteur` garde la derniere lecture pour qu'on puisse comparer.
   *
   * → `figerTicket()`, teste par tools\test-gel.mjs.
   */
  /* La ticket n'est posee qu'une fois : on garde alors une photo EXACTE de
   * ce que le moteur a vu (marche compris). C'est ce qui permet a
   * `tools\rejouer.mjs` de reproduire la ticket meme apres que tout a bouge.
   * Voir §13.3.4. */
  if (!dejaPose && t) {
    try {
      fs.mkdirSync(REPLAY, { recursive: true })
      fs.writeFileSync(path.join(REPLAY, `${date}.json`),
        JSON.stringify({ date, ticket: t.ticket, mode: t.mode, le: new Date().toISOString(), inputs: t.inputs }, null, 2), 'utf8')
      log(`     entrees figees : ${path.relative(RACINE, path.join(REPLAY, `${date}.json`))}`)
    } catch (e) { log(`     entrees non figees : ${e.message}`) }
  }

  const f = figerTicket(avant, t)
  const { ticket, ticketMode, groupes, ticketSource, surprises, ticketPoseLe, ticketMoteur } = f
  for (const l of f.log) log(l)
  const rec = { ...avant,
    date, found: !placeholder, placeholder, source, synthese: syn,
    runners: course ? course.participants.map((p) => p.num).sort((a, b) => a - b) : (avant.runners || []),
    nbPartants: course ? course.nbPartants : (avant.nbPartants || null),
    discipline: course ? course.discipline : avant.discipline,
    hippodrome: course ? course.hippodrome : (avant.hippodrome || avant.race?.hippodrome || null),
    distance: course ? course.distance : avant.distance,
    courseId: course ? course.courseId : avant.courseId,
    arrivee: (course && course.arrivee) || avant.arrivee || null,
    ticket, ticketMode, groupes, ticketSource, surprises, ticketPoseLe, ticketMoteur,
    cloture: (course && course.arrivee && !avant.arrivee) ? new Date().toISOString() : (avant.cloture || null),
    scores: (t && t.scores && t.scores.length ? t.scores : avant.scores) || null,
    collecte: new Date().toISOString() }
  db[date] = rec
  const tri = {}
  for (const k of Object.keys(db).sort().reverse()) tri[k] = db[k]
  ecrire(F_SYN, tri)
  try { fs.mkdirSync(PUB, { recursive: true }); fs.writeFileSync(path.join(PUB, 'synthese.json'), JSON.stringify(tri, null, 2)) } catch (e) {}
  // 📈 le marché, pour la page (repli hors-ligne si le proxy /eq est coupé)
  try { fs.mkdirSync(PUB, { recursive: true }); fs.copyFileSync(path.join(DATA, 'cotes.json'), path.join(PUB, 'cotes.json')) } catch (e) {}
  log(`     ${rec.nbPartants || '?'} partants - ticket [${rec.ticketSource || rec.ticketMode}] ${(rec.ticket || []).join(' ') || '-'}`)
  // La course est finie : on ferme la ligne du jour sur-le-champ. Avant, la
  // ligne du jour restait sans ARRIVEE ni BILAN jusqu'au run du lendemain
  // (cloture() ne ferme que HIER) — l'archive etait donc fausse la soiree.
  if (rec.arrivee && rec.ticket) {
    const set = new Set(rec.ticket)
    const pris = rec.arrivee.filter((n) => set.has(n)).length
    log(`     course finie : arrivee ${rec.arrivee.join('-')}  ->  ${pris}/5` +
      (pris < 5 ? `   manquants : ${rec.arrivee.filter((n) => !set.has(n)).join(', ')}` : '  ★ 5/5'))
  } else if (course && !course.arrivee) {
    log('     pas encore disputee - ARRIVEE et BILAN vides pour le moment')
  }
  return rec
}

/** Archive le programme + le detail de chaque course du jour dans
 *  public/data/reu/ — c'est la source ② de la page /r/:slug, et la SEULE qui
 *  marche en production (le proxy /tf y existe aussi, mais il ne doit pas etre
 *  la seule porte de sortie). Sans ce fichier, l'Article affiche « course
 *  indisponible » sur bahja-turf.vercel.app.
 *  ⚠ ne fait jamais tomber le job : on log, on passe. */
function archiverLesCourses(date) {
  return new Promise((res) => {
    log(' archive-reu (page /r/:slug)')
    const p = spawn(process.execPath, [path.join(ICI, 'archive-reu.mjs'), date], {
      stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true,
    })
    const fini = (code) => {
      const f = path.join(PUB, 'reu', `${date}_R1_C1_FRANCE.json`)
      if (existsSync(f)) log(`     archive-reu ok (code ${code})`)
      else log('     archive-reu : aucun fichier — l Article tombera sur /tf')
      res()
    }
    p.on('close', fini)
    p.on('error', (e) => { log(`     archive-reu impossible : ${e.message}`); res() })
  })
}

/** Publie le site (Vercel) : c'est ce qui fait que « ce qui marche en local
 *  marche en ligne ». Sans ce pas, le job collecte et le site reste figé.
 *
 *  `deploy.mjs` compare l'empreinte des SOURCES avec `data/deploy.json` :
 *  si rien n'a changé il sort sans rien publier. Il construit (`npm run build`)
 *  avant cette comparaison — d'où le build inutile quand rien n'a bougé, ~10 s.
 *
 *  ⚠ ne fait jamais tomber le job : c'est le dernier pas, après l'écriture
 *  de public/data/* ; un échec de deploy ne peut pas casser l'archive. */
function publier() {
  return new Promise((res) => {
    if (process.env.BAHJA_SANS_DEPLOY === '1') { log(' publication : sautee (BAHJA_SANS_DEPLOY=1)'); return res() }
    log(' publication (Vercel)')
    const p = spawn(process.execPath, [path.join(ICI, 'deploy.mjs')], {
      cwd: RACINE, stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true,
    })
    p.on('close', (code) => {
      log(code === 0
        ? '     deploy ok'
        : `     deploy ECHEC (code ${code}) — le site est perime ; relancer : node tools\\deploy.mjs`)
      res()
    })
    p.on('error', (e) => { log(`     deploy impossible : ${e.message}`); res() })
  })
}

async function cycle() {
  log('===== cycle =====')
  log(` cloture ${hier()}`)
  await cloturer(hier())
  log(` jour ${aujourdhui()}`)
  await collecterJour(aujourdhui())
  await archiverLesCourses(aujourdhui())
  await publier()
  const db = lire(F_SYN, {})
  const avec = Object.values(db).filter((r) => r.ticket && r.arrivee)
  let bon = 0
  for (const r of avec) { const t = new Set(r.ticket); if (r.arrivee.every((n) => t.has(n))) bon++ }
  log(` archive : ${Object.keys(db).length} courses - ${avec.length} avec resultat - ${bon} en 5/5`)
}


/* -------------------------------------------------------------------- CLI --- */

/* Un IMPORT ne lance jamais le cycle.
 *
 * tools\test-gel.mjs appelle figerTicket() pour tester le gel. Si l'import
 * declenchait le cycle, le test publierait l'archive sur Vercel -- c'est
 * arrive une fois. Le cycle ne part que si CE FICHIER est le lanceur. */
function estLanceur() {
  return !!process.argv[1] && path.resolve(process.argv[1]) === path.join(ICI, 'daily.mjs')
}

async function cli() {
const args = process.argv.slice(2)

if (args.includes('--install')) {
  const bat = path.resolve('tools', 'quinte-daily.bat')
  console.log('')
  console.log("Pour que l'archive se remplisse TOUT SEUL chaque jour :")
  console.log('')
  console.log('  1) le matin 08:45  (la Synth\u00e9se du jour est publi\u00e9e) :')
  console.log('     schtasks /Create /TN "Quinte AM" /TR "' + bat + '" /SC DAILY /ST 08:45')
  console.log('')
  console.log('  2) le soir 20:30   (on r\u00e9cup\u00e8re le r\u00e9sultat, on calcule le bilan) :')
  console.log('     schtasks /Create /TN "Quinte PM" /TR "' + bat + '" /SC DAILY /ST 20:30')
  console.log('')
  console.log('  3) ouverture 04:35     (photo du march\u00e9 \u00e0 l\u2019ouverture) :')
  console.log('     schtasks /Create /TN "Quinte Cotes" /TR "' + bat + ' --cotes" /SC DAILY /ST 04:35')
  console.log('')
  console.log('  4) avant-course     (on re-g\u00e8le le ticket avec le march\u00e9 du moment, UNE fois) :')
  console.log('     schtasks /Create /TN "Quinte Final" /TR "' + bat + ' --final" /SC DAILY /ST 08:00 /RI 30 /DU 13:00')
  console.log('     (toutes les 30 min 11:00->20:00 ; le job ne g\u00e8le que dans [depart-90, depart-10])')
  console.log('')
  console.log('  Pour tout effacer :')
  console.log('     schtasks /Delete /TN "Quinte AM" /F')
  console.log('     schtasks /Delete /TN "Quinte PM" /F')
  console.log('')
  console.log('  Ou alors, sans rien installer : double-clique sur')
  console.log('     ' + bat)
  console.log('')
  process.exit(0)
}

if (args.includes('--final')) {
  log('===== final (re-gel avant-course) =====')
  await finaliserJour(aujourdhui())
} else if (args.includes('--cotes')) {
  log('===== cotes (snapshot ouverture) =====')
  await snapshotMarche(aujourdhui(), 'ouverture')
} else if (args.includes('--watch')) {
  console.log('Mode watch : toutes les 20 minutes. Ctrl+C pour arreter.' + nl)
  await cycle()
  setInterval(async () => { try { await cycle() } catch (e) { log('echec : ' + e.message) } }, 20 * 60 * 1000)
} else {
  await cycle()
}
}

if (estLanceur()) await cli()
