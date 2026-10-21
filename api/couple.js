/* ══════════════════════════════════════════════════════════════════════════
 *  api/couple.js — LES COURSES DU JOUR, UNE PAR UNE.
 *
 *  La page Couplé montre les courses du jour avec tous leurs partants.
 *  Cette fonction Serverless est sa SEULE source :
 *
 *    GET /api/couple?date=AAAA-MM-JJ
 *      → { date, source, nb, courses: [{ cle, reunion, code, pays,
 *          hippodrome, nom, heure, distance, partants, type }] }
 *      La liste vient de `public/data/reu/prog-{date}.json` quand le
 *      collecteur l'a écrit (elle a déjà distance + partants), sinon de
 *      reu.php en direct (nom + heure seulement, §7 : on ne comble rien).
 *
 *    GET /api/couple?date=AAAA-MM-JJ&course=R1_C1_FRANCE
 *      → { course: { cle, date, reunion, code, pays, hippodrome, nom,
 *          heure, distance, discipline, arrivee: [], partants: [...] } }
 *      Le détail vient du fichier d'archive quand il existe, sinon de
 *      reu.php ?view=detail lu PAR LE NOM DES COLONNES (jamais par
 *      position : chaque réunion a sa mise en page).
 *
 *  ⚠ LABORATOIRE (§18.4) — lecture seule. Aucun POST, aucune écriture.
 *  Ce fichier ne partage RIEN avec les autres pages : ni import, ni
 *  fonction, ni constante. Tout ce qu'il lui faut est écrit ici.
 * ══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'

const RACINE = process.cwd()
const REU = path.join(RACINE, 'public', 'data', 'reu')
const TF = 'https://www.turf-france.com'
const EQ = 'https://www.equidia.fr'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/* ──────────────────────────────────────────────────────────── Equidia ───── */

const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl'
function curlTexte(url, delai = 55000) {
  return new Promise((resolve) => {
    execFile(CURL_BIN, ['-sS', '-m', String(Math.ceil(delai / 1000)), '-A', UA, '--compressed', url],
      { timeout: delai, maxBuffer: 12 * 1024 * 1024 }, (err, stdout) => {
        if (err) resolve(null)
        else resolve(String(stdout || ''))
      })
  })
}
async function fetchEquidia(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(20000) })
    if (!r.ok) return null
    return await r.text()
  } catch { return curlTexte(url) }
}

function extraireProgrammeEquidia(html, date) {
  const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  let txt = m[1].replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>').replace(/&nbsp;/g, ' ').replace(/'/g, "'").replace(/&/g, '&')
  try {
    const st = JSON.parse(txt)
    for (const key of Object.keys(st)) {
      if (key.startsWith('courses/') && key.includes(date)) {
        const data = st[key]
        if (data && data.meetings) return data.meetings
      }
    }
    return null
  } catch { return null }
}

/* Equidia renvoie parfois des OBJETS ({nom_entraineur}, {nom_monte}…)
 * là où on attend une chaîne : le crash React « Objects are not valid as
 * a React child » du 13/10 vient de là. On extrait toujours une chaîne. */
function txtNom(x) {
  if (x == null) return ''
  if (typeof x === 'string') return x
  if (typeof x === 'object') {
    for (const k of ['name', 'nom', 'nom_entraineur', 'nom_monte', 'nom_cheval', 'nom_jockey', 'valeur']) {
      if (typeof x[k] === 'string' && x[k]) return x[k]
    }
    for (const v of Object.values(x)) if (typeof v === 'string' && v) return v
    return ''
  }
  return String(x)
}

function extraireDetailEquidia(html, date, rNum, cNum) {
  const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  let txt = m[1].replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>').replace(/&nbsp;/g, ' ').replace(/'/g, "'").replace(/&/g, '&')
  try {
    const st = JSON.parse(txt)
    // La clé principale avec les partants détaillés : v2/courses/{date}/R{n}/C{m}
    const courseKey = `v2/courses/${date}/R${rNum}/C${cNum}`
    if (st[courseKey] && st[courseKey].partants) {
      return st[courseKey]
    }
    // Fallback : toute clé v2/courses d'abord, pari_simple en dernier
    // (marché seul : pas de noms/musiques).
    const tag = `/R${rNum}/C${cNum}`
    for (const key of Object.keys(st)) {
      if (key.includes(tag) && key.includes('v2/courses')) return st[key]
    }
    return null
  } catch { return null }
}

function parserDetailEquidia(data, date, rNum, cNum, pays) {
  if (!data) return null
  
  // Equidia structure: data = { partants: [...], ... } from v2/courses/{date}/R{n}/C{m}
  const partantsData = data.partants || (Array.isArray(data) ? data : (data.runners || data.participants || []))
  if (!Array.isArray(partantsData) || !partantsData.length) return null

  const partants = partantsData
    .filter((r) => r.num_partant || r.numero || r.num)
    .map((r) => {
      const num = Number(r.num_partant || r.numero || r.num)
      const cheval = txtNom(r.cheval?.nom_cheval || r.cheval?.nom || r.name || r.horse?.name || '')
      // Musique is directly on the partant object in Equidia
      const musique = txtNom(r.musique || r.short_musique || r.cheval?.musique || '')
      const driv = txtNom(r.monte || r.cheval?.driver || r.driver || r.jockey || r.rider || '')
      const entr = txtNom(r.entraineur || r.cheval?.trainer || r.trainer || r.horse?.trainer || '')
      const prop = txtNom(r.proprietaire || r.cheval?.owner || r.horse?.owner || '')
      return {
        num, cheval, nom: cheval,
        poids: r.pds_calc_hand_partant ?? r.pds_cond_monte_partant ?? r.poids ?? r.weight ?? null,
        driver: driv,
        jockey: driv,
        entraineur: entr,
        valeur: r.valeur ?? r.cheval?.valeur ?? null,
        sexe: txtNom(r.sexe_cheval ?? r.cheval?.sexe ?? ''),
        age: r.age_cheval ?? r.cheval?.age ?? null,
        couleur: txtNom(r.couleur ?? r.cheval?.couleur ?? ''),
        proprietaire: prop,
        cote: r.cote ?? r.rapp_evol ?? r.rapp_ref ?? r.odd ?? r.cote_pmu ?? null,
        coteRef: r.coteRef ?? r.rapp_ref ?? r.rapp_evol ?? r.startodd ?? null,
        depart: r.place_corde_partant ?? r.cheval?.corde ?? r.startbox ?? null,
        def: txtNom(r.deferrer_partant ?? r.cheval?.ferrure ?? r.horseshoe ?? r.blinkers ?? ''),
        silk: r.silks_path || r.cheval?.silk?.url || r.jockeycolorfile || r.jockeycolour || null,
        dernierPassage: txtNom(r.previousDistPartant ?? r.cheval?.lastPerformance ?? r.shortperformance ?? ''),
        gains: r.gains_carriere ?? r.cheval?.gains ?? r.horse?.gains ?? null,
        musique: txtNom(r.musique || r.short_musique || r.cheval?.musique || ''),
        place: r.place_corde_partant ?? r.finishorder ?? r.finish ?? r.place ?? null,
      }
    }).filter((p) => p.num)

  if (!partants.length) return null

  const arrivee = []

  const hippodrome = data.meeting?.hippodrome || data.track || data.hippodrome || ''
  const nom = data.race?.nom || data.name || ''

  return {
    v: 2, pv: 4,
    source: 'Equidia',
    race: {
      numOrdre: cNum, nom,
      distance: data.distance ?? data.race?.distance ?? null,
      type: data.type ?? data.discipline ?? data.type_course ?? '',
      date: date,
      nbPartants: partants.length,
      meteo: null,
    },
    meeting: { num: rNum, hippodrome, pays: String(pays).trim().toUpperCase() },
    participants: partants,
    arrivee,
    collecteLe: new Date().toISOString(),
  }
}

/* ──────────────────────────────────────────────────────────── texte ───── */

function texte(x) {
  return String(x || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&eacute;/gi, 'e').replace(/&egrave;/gi, 'e').replace(/&agrave;/gi, 'a')
    .replace(/&ccedil;/gi, 'c').replace(/&ugrave;/gi, 'u').replace(/&ocirc;/gi, 'o')
    .replace(/&icirc;/gi, 'i').replace(/&ecirc;/gi, 'e').replace(/&acirc;/gi, 'a')
    .replace(/\s+/g, ' ')
    .trim()
}

function nombre(x) {
  if (x == null) return null
  const m = String(x).replace(/\s+/g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

/* ─────────────────────────────────────────────────────── programme ────── */

async function fetchTF(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' },
      signal: AbortSignal.timeout(25000),
    })
    return await r.text()
  } catch { /* repli curl ci-dessous */ }
  return curlTexte(url)
}

/* ─────────────────────────────────────────────────────── programme ────── */

/* ─────────────────────────────────────────────────────── programme ────── */

function lireProgrammeArchive(date) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(REU, `prog-${date}.json`), 'utf8'))
    const reunions = Array.isArray(j.reunions) ? j.reunions : []
    if (!reunions.length) return null
    return reunions.map((r) => ({
      hippodrome: r.hippodrome || '',
      pays: r.pays || '',
      courses: (r.courses || []).map((c) => ({
        date,
        reunion: c.reunion, code: c.code, pays: c.pays || r.pays || '',
        nom: c.nom || '', heure: c.heure || '',
        distance: c.dist ?? null,
        partants: c.partants ?? null,
        type: c.type || '',
      })),
    }))
  } catch { return null }
}

async function lireProgrammeDirect(date) {
  const html = await fetchTF(`${TF}/php/reu.php?view=program&date=${date}`)
  if (!html) throw new Error('programme indisponible')
  // §18.2 ① : la page d'accueil fait 3 935 o et passe pour un HTTP 200
  if (!/view=detail/i.test(html) || html.length < 20000) throw new Error('programme indisponible')
  const reunions = []
  let cur = null
  for (const m of html.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi)) {
    const idm = m[1].match(/id="([^"]+)"/)
    if (idm) { cur = { hippodrome: idm[1].replace(/_/g, ' '), pays: '', courses: [] }; reunions.push(cur); continue }
    if (!cur) continue
    const lien = m[2].match(/\?view=detail&(amp;)?date=(\d{4}-\d{2}-\d{2})&(amp;)?reunion=(R\d+)&(amp;)?course=(C\d+)&(amp;)?pays=([A-Z ]+)/)
    if (!lien) continue
    if (cur.courses.some((c) => c.code === lien[6])) continue
    const cells = [...m[2].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => texte(c[1]))
    const ih = cells.findIndex((c) => /^\d{1,2}:\d{2}$/.test(c))
    if (!cur.pays) cur.pays = lien[8]
    cur.courses.push({
      date: lien[2], reunion: lien[4], code: lien[6], pays: lien[8],
      nom: ih >= 0 ? (cells[ih + 1] || '') : '', heure: ih >= 0 ? cells[ih] : '',
      distance: null, partants: null, type: '',
    })
  }
  const garde = reunions.filter((x) => x.courses.length)
  if (!garde.length) throw new Error('programme vide')
  return garde
}

/* ───────────────────────────────────────────────────────── détail ─────── */

function lireDetailArchive(date, rNum, cNum, pays) {
  const noms = [
    `${date}_R${rNum}_C${cNum}_${String(pays || 'FRANCE').replace(/\s+/g, '')}.json`,
  ]
  for (const nom of noms) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(REU, nom), 'utf8'))
      const parts = Array.isArray(j.participants) ? j.participants : []
      if (!parts.length) continue
      return {
        hippodrome: j.meeting?.hippodrome || '',
        nom: j.race?.nom || '',
        distance: j.race?.distance ?? null,
        discipline: j.race?.type || '',
        partants: parts.map((p) => normaliserPartant(p)),
        arrivee: Array.isArray(j.arrivee) ? j.arrivee.slice(0, 5) : [],
      }
    } catch { /* fichier absent : on tente le direct */ }
  }
  return null
}

/* Les deux vocabulaires (reu.php dit `driver`, les archives disent
 * `jockey`) sont ramenés à UN SEUL : celui que la page Couplé affiche.
 * Cf. le piège ③ du §18 : une page qui lit un champ absent affiche « — ». */
function normaliserPartant(p) {
  /* ⚠ QUELLE COTE ? (08/10/2026) Les archives n'ont que `cote_pmu`, les
   *   courses du jour ont `cote` (colonne « Cotes ») + `coteRef (« Ref »).
   *   Mesuré : 74% des paires diffèrent de ×1.5 ou plus — ce ne sont pas
   *   les mêmes cotes. Seule `coteRef` est du même type que `cote_pmu` :
   *   c'est elle qui remplit `cote` (le moteur lit `coteRef` d'abord). */
  const ref = p.coteRef ?? p.cote_pmu ?? null
  const cote = ref != null && ref > 1 ? ref : null
  const num = Number(p.num)
  return {
    num: Number.isFinite(num) && num > 0 ? num : p.num,
    cheval: txtNom(p.cheval || p.nom || p.horse || ''),
    driver: txtNom(p.driver || p.jockey || ''),
    entraineur: txtNom(p.entraineur || p.trainer || ''),
    poids: p.poids ?? null,
    cote, coteRef: ref,
    gains: p.gains ?? p.gain ?? null,
    musique: txtNom(p.musique || ''),
    corde: p.corde ?? null,
    valeur: p.valeur ?? null,
    proprietaire: txtNom(p.proprietaire || p.owner || ''),
    sexe: txtNom(p.sexe || ''),
    age: p.age ?? null,
    def: txtNom(p.def || ''),
  }
}

async function lireDetailDirect(date, rNum, cNum, pays) {
  const html = await fetchTF(`${TF}/php/reu.php?view=detail&date=${date}&reunion=R${rNum}&course=C${cNum}&pays=${pays}`)
  if (!html) throw new Error('détail indisponible')
  // la carte des colonnes, lue PAR LEUR NOM — jamais par position, car
  // chaque réunion a sa mise en page (R1-C1 ≠ R1-C2, mesuré le 07/10)
  let carte = null
  const iT = html.search(/<table[^>]*id=['"]lstpartant['"]/i)
  if (iT >= 0) {
    const finHead = html.indexOf('</thead>', iT)
    const noms = [...html.slice(iT, finHead > 0 ? finHead : iT + 3000).matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
      .map((x) => texte(x[1]).toLowerCase().replace(/\./g, ''))
    if (noms.length >= 10) {
      carte = {}
      let refs = 0
      noms.forEach((t, i) => {
        if (/^n°$|numero/.test(t)) carte.num = i
        else if (/cheval/.test(t)) carte.cheval = i
        else if (/cotes ref/.test(t)) { refs++; carte[refs === 1 ? 'coteRef' : 'coteRef2'] = i }
        else if (/^age$/.test(t)) carte.age = i
        else if (/sexe/.test(t)) carte.sexe = i
        else if (/musique/.test(t)) carte.musique = i
        else if (/gains/.test(t)) carte.gains = i
        else if (/corde/.test(t)) carte.corde = i
        else if (/poids/.test(t)) carte.poids = i
        else if (/valeur/.test(t)) carte.valeur = i
        else if (/^cotes?\s*$/.test(t)) carte.cote = i
        else if (/jockey|driver/.test(t)) carte.driver = i
        else if (/entrain/.test(t)) carte.entraineur = i
        else if (/propri/.test(t)) carte.proprietaire = i
        else if (/^def/.test(t)) carte.def = i
      })
      if (carte.num == null) carte = null
    }
  }
  if (!carte) throw new Error('tableau des partants introuvable')
  const besoin = Math.max(...Object.values(carte).filter((x) => Number.isFinite(x)))
  const lit = (c, k) => (carte[k] != null ? (c[carte[k]] ?? '') : '')
  const sortie = []
  for (const m of html.matchAll(/<tr[^>]*data-num=['"](\d+)['"][^>]*>([\s\S]*?)<\/tr>/gi)) {
    const c = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => texte(x[1]))
    if (c.length <= besoin) continue
    const n = Number(c[carte.num])
    if (!Number.isFinite(n) || n < 1) continue
    /* ⚠ SEULE coteRef (08/10/2026) : la colonne « Cotes » du jour est d'un
     *   autre type (74% éloignées de ×1.5, parfois inversées) — on ne la lit
     *   même plus. Et on la PASSE en coteRef à normaliserPartant, sinon elle
     *   recalcule depuis des champs absents et la cote tombe à null (le bug
     *   qui vidait toutes les cotes du jour : 0/15). */
    const cRef = carte.coteRef != null ? nombre(c[carte.coteRef]) : null
    const cote = cRef != null && cRef > 1 ? cRef : null
    sortie.push(normaliserPartant({
      num: n,
      cheval: lit(c, 'cheval'),
      driver: lit(c, 'driver'),
      entraineur: lit(c, 'entraineur'),
      poids: carte.poids != null ? nombre(c[carte.poids]) : null,
      coteRef: cote,
      gains: carte.gains != null ? nombre(c[carte.gains]) : null,
      musique: lit(c, 'musique'),
      corde: carte.corde != null ? nombre(c[carte.corde]) : null,
      valeur: carte.valeur != null ? nombre(c[carte.valeur]) : null,
      proprietaire: lit(c, 'proprietaire'),
      sexe: lit(c, 'sexe'),
      age: carte.age != null ? nombre(c[carte.age]) : null,
      def: lit(c, 'def') || null,
    }))
  }
  if (!sortie.length) throw new Error('aucun partant lu')
  sortie.sort((a, b) => a.num - b.num)
  /* L'arrivée quand la course est finie (« - Arrivée - 2 - 4 - 3 - 5 »).
   * reu.php l'affiche même quand les cotes ont été effacées — c'est elle
   * qui permet la vérification d'un trio sur une course terminée. */
  let arrivee = []
  const mArr = html.match(/-\s*Arriv[eé]e\s*-\s*([\d\s\-/]+)/i)
  if (mArr) {
    arrivee = mArr[1].split(/[\s-]+/).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0).slice(0, 5)
  }
  return { partants: sortie, arrivee }
}

/* ─────────────────────────────────────────────── remplissage Equidia ──── */
/* 11/10/2026 — reu.php publie coteRef PROGRESSIVEMENT (0/12 le matin =
 * verdict impossible : « re-clique plus tard », refusé par l'utilisateur
 * car inacceptable). Le marché Equidia ouvre à 04h00 GMT : on bouche les
 * trous avec rapp_evol (même type : PMU simple gagnant — pas la colonne
 * « Cotes » de reu.php, prouvée d'un autre type le 08/10). On n'écrase
 * JAMAIS une cote lue (coteRef comme cote_pmu). Garde-fou : ≥50% des noms
 * de chevaux doivent coïncider (sinon ce n'est pas la même course).
 * Chaque cote bouchée est marquée coteEq:true → la page affiche
 * « provisoire ». Enrichissement en mémoire seulement : aucun fichier
 * d'archive n'est réécrit (y compris quand la réponse vient d'une archive
 * collectée sans cotes — 10/10 : 0/13 cote_pmu). */

function normNom(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
}

/* Bouche les coteRef manquantes avec le marché Equidia (même type : PMU
 * simple gagnant). N'écrase JAMAIS une coteRef lue. Garde-fou : ≥50% des
 * noms doivent coïncider, sinon ce n'est pas la même course → 0.
 * `lire` injectable pour les tests (jamais de réseau dans les tests). */
export async function boucherCotesEquidia(partants, date, rNum, cNum, lire = lireMarcheEquidia) {
  if (!Array.isArray(partants) || !partants.some((p) => p.coteRef == null)) return 0
  let eq = null
  try { eq = await lire(date, rNum, cNum) } catch { return 0 }
  const nomsReu = partants.map((p) => normNom(p.cheval)).filter(Boolean)
  const nomsEq = new Set((eq?.noms || []))
  const communs = nomsReu.filter((n) => nomsEq.has(n)).length
  if (!eq || !nomsReu.length || communs / nomsReu.length < 0.5) return 0
  let n = 0
  for (const p of partants) {
    if (p.coteRef == null && eq.cotes[p.num] != null) {
      p.coteRef = eq.cotes[p.num]
      p.cote = eq.cotes[p.num]
      p.coteEq = true
      n++
    }
  }
  return n
}

async function lireMarcheEquidia(date, rNum, cNum) {
  try {
    const r = await fetch(`${EQ}/courses/${date}/R${rNum}/C${cNum}`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) return null
    const html = await r.text()
    const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
    if (!m) return null
    const txt = m[1]
      .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    const st = JSON.parse(txt)
    const brut = st[`courses/${date}/R${rNum}/C${cNum}/pari_simple`] || []
    const cotes = {}, noms = []
    for (const x of brut) {
      const n = Number(x.num_partant), c = Number(x.rapp_evol)
      if (Number.isFinite(n) && n > 0 && Number.isFinite(c) && c > 0) cotes[n] = c
      const nm = normNom(x.cheval?.nom_cheval || '')
      if (nm) noms.push(nm)
    }
    return { cotes, noms }
  } catch { return null }
}

/* ────────────────────────────────────────── turfomania (musique) ──────── */
/* 13/10/2026 — turfomania.fr accessible (pas de blocage) et son tableau
 * partants donne la MUSIQUE inline (« HOTTOT (215j) 4p (25) 4p 1p 3p »),
 * le poids, la corde, le driver/entraîneur et les gains. Cas LA BARAKA :
 * la musique d'archive était pourrie (« 8p 8p 1p 6p 0p ») alors que la
 * vraie forme était 1-4-2-3-7-4-5. On ne prend QUE la musique (+ champs
 * d'identité), JAMAIS les cotes (échelle PMU live ≠ ref turf-france).
 * Limite : page d'accueil = programme du jour uniquement → repli valable
 * seulement pour date === aujourd'hui (serveur). Les courses passées dont
 * la musique est perdue restent perdues. */
const TM = 'https://www.turfomania.fr'

function tmCelluleCheval(txt) {
  // « HOTTOT (215j) 4p (25) 4p 1p 3p » → { cheval, musique }
  const t = texte(txt)
  const m = t.match(/^(.+?\(\d+j\))\s*(.*)$/)
  if (!m) return { cheval: t, musique: '' }
  return { cheval: m[1].trim(), musique: (m[2] || '').replace(/\s+/g, ' ').trim() }
}

export async function completerMusiqueTurfomania(partants, date, nomCourse) {
  if (!Array.isArray(partants) || !partants.some((p) => !p.musique)) return 0
  const auj = new Date().toISOString().slice(0, 10)
  if (date !== auj) return 0 // l'accueil turfomania ne liste que le jour même
  // fetch Node renvoie parfois une page défi de 5 ko : on exige des liens,
  // sinon repli curl explicite (même cause que turf-france : TLS black-hole).
  const lireTM = async (url) => {
    let h = await fetchTF(url)
    if (h && /partants-[^"]+\.html\?idcourse=/i.test(h)) return h
    try {
      const { execFile: ef } = await import('node:child_process')
      const bin = process.platform === 'win32' ? 'curl.exe' : 'curl'
      h = await new Promise((resolve) => {
        ef(bin, ['-sS', '-m', '55', '-A', UA, '--compressed', url],
          { timeout: 55000, maxBuffer: 12 * 1024 * 1024 }, (err, out) => resolve(err ? null : String(out || '')))
      })
    } catch { h = null }
    return h
  }
  try {
    const acc = await lireTM(`${TM}/`)
    if (!acc) return 0
    // liens partants du jour : /pronostics/partants-<slug>.html?idcourse=NNN
    const liens = [...acc.matchAll(/href="(\/pronostics\/partants-[^"]+\.html\?idcourse=(\d+))"/gi)]
    if (!liens.length) return 0
    const mots = normNom(nomCourse).split(' ').filter((w) => w.length > 3)
    let hrefComplet = null
    for (const m of liens) {
      const slug = normNom(decodeURIComponent(m[1]).replace(/-/g, ' '))
      if (mots.length && mots.every((w) => slug.includes(w))) { hrefComplet = m[1]; break }
    }
    if (!hrefComplet && mots.length) {
      for (const m of liens) { // repli : 2 mots sur 3
        const slug = normNom(decodeURIComponent(m[1]).replace(/-/g, ' '))
        if (mots.filter((w) => slug.includes(w)).length >= Math.min(2, mots.length)) { hrefComplet = m[1]; break }
      }
    }
    if (!hrefComplet) return 0
    const page = await lireTM(`${TM}${hrefComplet}`)
    if (!page) return 0
    const table = (page.match(/<table class="tableauLine tablesorter">([\s\S]*?)<\/table>/i) || [])[1]
    if (!table) return 0
    const ths = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((x) => texte(x[1]).toLowerCase())
    const iNum = ths.findIndex((t) => /^n/.test(t))
    const iChev = ths.findIndex((t) => /cheval/.test(t))
    if (iNum < 0 || iChev < 0) return 0
    let n = 0
    for (const rm of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const tds = [...rm[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((x) => x[1])
      if (tds.length <= Math.max(iNum, iChev)) continue
      const num = Number(texte(tds[iNum]))
      if (!Number.isFinite(num) || num < 1) continue
      const { cheval, musique } = tmCelluleCheval(tds[iChev])
      const p = partants.find((q) => q.num === num)
      if (p && musique && !p.musique) { p.musique = musique; if (!p.cheval) p.cheval = cheval; n++ }
    }
    return n
  } catch { return 0 }
}

/* ─────────────────────────────────────────────────────── handler ──────── */

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  try {
    const u = new URL(req.url || '/', 'http://localhost')
    const date = u.searchParams.get('date') || new Date().toISOString().slice(0, 10)

    /* ── UNE course : ses partants ── */
    const cle = u.searchParams.get('course')
    if (cle) {
      const dep = String(cle).split('_')
      const cDate = dep[0]
      const rNum = Number(String(dep[1] || '').replace(/\D/g, ''))
      const cNum = Number(String(dep[2] || '').replace(/\D/g, ''))
      const pays = dep.slice(3).join('_') || 'FRANCE'
      if (!cDate || !rNum || !cNum) throw new Error('clé de course illisible')

      let meta = { hippodrome: '', nom: '', heure: '', distance: null, discipline: '' }
      let partants = []
      let arrivee = []
      let source = ''
      let erreur = null

      // ① le fichier d'archive — SAUF squelette (que num+poids, sans noms
      //    ni musiques ni cotes : le fallback casacourses à vide). Un squelette
      //    ne bloque jamais le direct : sinon la page reste vide toute la journée.
      const estSquelette = (ps) => (ps || []).length > 0
        && (ps || []).every((p) => !p.cheval && !p.nom && !p.musique)
      try {
        const arch = lireDetailArchive(cDate, rNum, cNum, pays)
        if (arch && arch.partants.length && !estSquelette(arch.partants)) {
          meta = { hippodrome: arch.hippodrome, nom: arch.nom, heure: '', distance: arch.distance, discipline: arch.discipline }
          partants = arch.partants
          if (arch.arrivee?.length) arrivee = arch.arrivee
          source = 'archive'
        }
      } catch (e) { /* on tente le direct */ }

      // ② Direct : UNIQUEMENT si pas d'archive. Pour les dates passées on ne
      //    relit JAMAIS le direct pour les partants (données post-course
      //    contaminées : ordre d'arrivée + musiques incluant la course).
      //    Seule l'arrivée peut encore être lue en direct (résultat public).
      //    Exception sûre : les NOMS (cheval/driver/entraîneur) n'ont aucun
      //    pouvoir prédictif → on les complète même pour les dates passées.
      const estPassee = cDate < new Date().toISOString().slice(0, 10)
      if (!partants.length && !estPassee) {
        try {
          const urlDetail = `${EQ}/courses/${cDate}/R${rNum}/C${cNum}`
          const htmlDetail = await fetchEquidia(urlDetail)
          if (htmlDetail) {
            const data = extraireDetailEquidia(htmlDetail, cDate, rNum, cNum)
            if (data) {
              const parsed = parserDetailEquidia(data, cDate, rNum, cNum, pays)
              if (parsed && parsed.participants?.length) {
                // On garde les données Equidia, on complète seulement ce qui manque
                if (!partants.length) {
                  partants = parsed.participants
                  meta = { hippodrome: parsed.hippodrome, nom: parsed.race?.nom || '', heure: '', distance: parsed.race?.distance ?? null, discipline: parsed.race?.type || '' }
                }
                if (parsed.arrivee?.length && !arrivee.length) arrivee = parsed.arrivee
                if (!meta.hippodrome) meta.hippodrome = parsed.hippodrome
                if (!meta.nom) meta.nom = parsed.race?.nom || ''
                if (!meta.distance) meta.distance = parsed.race?.distance ?? null
                if (!meta.discipline) meta.discipline = parsed.race?.type || ''
                source = 'equidia'
              }
            }
          }
          } catch (e) { /* on continue */ }
      }

      // ② reu.php en direct : fallback pour les cotes si Equidia n'en a pas
      //    + remplissage des scalaires manquants (valeur/poids/corde/gains/âge).
      //    On ne remplace JAMAIS : ni la musique Equidia (corrompue côté reu),
      //    ni une cote déjà lue, ni driver/cheval.
      const nbCotes = (ps) => (ps || []).filter((p) => { const n = Number(p.coteRef); return Number.isFinite(n) && n > 0 }).length
      const manqueScalaire = (ps) => (ps || []).some((p) => p.valeur == null || p.poids == null || p.corde == null || p.gains == null || p.age == null)
      if (partants.length && (nbCotes(partants) < 3 || manqueScalaire(partants))) {
        try {
          const det = await lireDetailDirect(cDate, rNum, cNum, pays)
          if (det.arrivee?.length && !arrivee.length) arrivee = det.arrivee
          if (nbCotes(det.partants) > nbCotes(partants)) {
            // On ne prend QUE les cotes, on ne remplace pas les autres données Equidia
            const eqCotes = new Map(det.partants.map(p => [p.num, { coteRef: p.coteRef, cote: p.cote, coteEq: true }]))
            for (const p of partants) {
              const eq = eqCotes.get(p.num)
              if (eq && (p.coteRef == null || p.coteRef <= 1)) {
                p.coteRef = eq.coteRef
                p.cote = eq.cote
                p.coteEq = true
              }
            }
          }
          // Scalaires manquants seulement (jamais musique/cheval/driver)
          const parDet = new Map(det.partants.map((p) => [p.num, p]))
          for (const p of partants) {
            const d = parDet.get(p.num)
            if (!d) continue
            for (const k of ['valeur', 'poids', 'corde', 'gains', 'age']) {
              if ((p[k] == null) && d[k] != null) p[k] = d[k]
            }
          }
        } catch (e) { /* on continue */ }
      }

      // ②b reu.php pour l'arrivée si pas encore
      if (!arrivee.length) {
        try {
          const det = await lireDetailDirect(cDate, rNum, cNum, pays)
          if (det.arrivee?.length) arrivee = det.arrivee
        } catch (e) { /* pas encore courue */ }
      }

      // ②c turfomania : répare les MUSIQUES manquantes/fausses (cas LA BARAKA).
      //    Jour même uniquement. Ne touche JAMAIS aux cotes (échelle PMU ≠ ref).
      if (partants.length && partants.some((p) => !p.musique)) {
        try { await completerMusiqueTurfomania(partants, cDate, meta.nom || '') } catch { /* musique inchangée */ }
      }

      // ②d identité seule (passé comme présent) : cheval/driver/entraîneur
      //    depuis Equidia direct quand l'archive ne les a pas. Les noms ne
      //    prédisent rien → aucun risque hindsight. Jamais cotes/musique.
      if (partants.length && partants.some((p) => !p.cheval)) {
        try {
          const htmlN = await fetchEquidia(`${EQ}/courses/${cDate}/R${rNum}/C${cNum}`)
          if (htmlN) {
            const dataN = extraireDetailEquidia(htmlN, cDate, rNum, cNum)
            if (dataN) {
              const parsedN = parserDetailEquidia(dataN, cDate, rNum, cNum, pays)
              if (parsedN?.participants?.length) {
                const parN = new Map(parsedN.participants.map((p) => [p.num, p]))
                for (const p of partants) {
                  const d = parN.get(p.num)
                  if (!d) continue
                  if (!p.cheval && d.cheval) p.cheval = d.cheval
                  if (!p.driver && d.driver) p.driver = d.driver
                  if (!p.entraineur && d.entraineur) p.entraineur = d.entraineur
                }
              }
            }
          }
        } catch { /* noms inchangés */ }
      }

      // ③ bouche-trous Equidia marché (cotes PMU) : DÉSACTIVÉ (échelles différentes)
      //    La vraie réparation = le collecteur archive-reu doit capturer les cotesRef COMPLÈTES
      let cotesEq = 0

      if (!partants.length) {
        throw new Error('Aucune source de partants disponible (Equidia + fallbacks)')
      }

      res.statusCode = 200
      res.end(JSON.stringify({
        course: {
          cle, date: cDate,
          reunion: 'R' + rNum, code: 'C' + cNum, pays,
          hippodrome: meta.hippodrome, nom: meta.nom, heure: meta.heure,
          distance: meta.distance, discipline: meta.discipline,
          arrivee,
          partants,
          erreur: null,
          cotesEq: 0,
        },
        source: source || 'equidia',
      }))
      return
    }

    /* ── LA LISTE des courses du jour ── */
    // 1. Programme depuis Equidia (archive)
    let reunions = lireProgrammeArchive(date)
    let source = 'archive'
    if (!reunions) {
      // Fallback : programme Equidia direct
      try {
        const html = await fetchEquidia(`${EQ}/courses/${date}`)
        if (html) {
          const meetings = extraireProgrammeEquidia(html, date)
          if (meetings && meetings.length) {
            reunions = meetings.map((m) => ({
              hippodrome: m.hippodrome || m.track || '',
              pays: m.pays || m.country || 'FRANCE',
              courses: (m.races || m.courses || []).map((c) => ({
                date, reunion: 'R' + Number(m.numero || m.num || 0), code: 'C' + Number(c.numero || c.code || c.num || 0),
                pays: m.pays || m.country || 'FRANCE', nom: c.nom || c.name || '', heure: c.heure || c.time_hm || '',
                distance: null, partants: null, type: '',
              })),
            }))
            source = 'equidia'
          }
        }
      } catch (e) { /* fallback */ }
    }
    if (!reunions) {
      reunions = await lireProgrammeDirect(date)
      source = 'reu.php'
    }
    const courses = reunions.flatMap((r) => r.courses.map((c) => ({
      cle: `${c.date || date}_${c.reunion}_${c.code}_${String(c.pays || r.pays || '').replace(/\s+/g, '')}`,
      date: c.date || date, reunion: c.reunion, code: c.code,
      pays: c.pays || r.pays || '',
      hippodrome: r.hippodrome, nom: c.nom || '', heure: c.heure || '',
      distance: c.distance ?? null,
      partants: c.partants ?? null,
      type: c.type || '',
    })))
    res.statusCode = 200
    res.end(JSON.stringify({ date, source, nb: courses.length, courses }))
  } catch (e) {
    res.statusCode = 200
    res.end(JSON.stringify({ erreur: e.message, nb: 0, courses: [] }))
  }
}
