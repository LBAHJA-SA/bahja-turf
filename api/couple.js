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

const RACINE = process.cwd()
const REU = path.join(RACINE, 'public', 'data', 'reu')
const TF = 'https://www.turf-france.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

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
  const r = await fetch(`${TF}/php/reu.php?view=program&date=${date}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' },
    signal: AbortSignal.timeout(25000),
  })
  const html = await r.text()
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
  return {
    num: p.num,
    cheval: p.cheval || p.nom || p.horse || '',
    driver: p.driver || p.jockey || '',
    entraineur: p.entraineur || p.trainer || '',
    poids: p.poids ?? null,
    cote, coteRef: ref,
    gains: p.gains ?? p.gain ?? null,
    musique: p.musique || '',
    corde: p.corde ?? null,
    valeur: p.valeur ?? null,
    proprietaire: p.proprietaire || p.owner || '',
    sexe: p.sexe || '',
    age: p.age ?? null,
    def: p.def || null,
  }
}

async function lireDetailDirect(date, rNum, cNum, pays) {
  const r = await fetch(`${TF}/php/reu.php?view=detail&date=${date}&reunion=R${rNum}&course=C${cNum}&pays=${pays}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' },
    signal: AbortSignal.timeout(25000),
  })
  const html = await r.text()
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

      // ① le fichier d'archive : le plus rapide et le plus complet
      try {
        const arch = lireDetailArchive(cDate, rNum, cNum, pays)
        if (arch && arch.partants.length) {
          meta = { hippodrome: arch.hippodrome, nom: arch.nom, heure: '', distance: arch.distance, discipline: arch.discipline }
          partants = arch.partants
          if (arch.arrivee?.length) arrivee = arch.arrivee
          source = 'archive'
        }
      } catch (e) { /* on tente le direct */ }

      // ② reu.php en direct : les partants du jour (+ l'arrivée si finie)
      if (!partants.length) {
        try {
          const det = await lireDetailDirect(cDate, rNum, cNum, pays)
          partants = det.partants
          if (det.arrivee?.length) arrivee = det.arrivee
          source = 'reu.php'
        } catch (e) { erreur = e.message }
      } else if (!arrivee.length) {
        // l'archive d'avant-course n'a pas l'arrivée : on la lit en direct
        try {
          const det = await lireDetailDirect(cDate, rNum, cNum, pays)
          if (det.arrivee?.length) arrivee = det.arrivee
        } catch (e) { /* pas encore courue */ }
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
          erreur,
        },
        source,
      }))
      return
    }

    /* ── LA LISTE des courses du jour ── */
    let reunions = lireProgrammeArchive(date)
    let source = 'archive'
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
