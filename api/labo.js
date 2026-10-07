/* ══════════════════════════════════════════════════════════════════════════
 *  api/labo.js — LES COURSES DU JOUR, une par une.
 *
 *  La page COPLY montre les courses DU JOUR : elles n'ont pas encore couru,
 *  c'est justement ce qu'on veut lire. La source est le programme de
 *  reu.php (§19.1) — la même que la page Programme, le même code.
 *
 *  ⚠ LES COURSES PASSÉES ne sont PAS ici. Elles vivent dans `archives/`
 *  et servent au MOTEUR (lelaboratoire, §18.4), pas à l'affichage : ici on
 *  veut du vivant, pas de l'historique.
 *
 *  ⚠ LABORATOIRE UNIQUEMENT — lecture seule. Aucun POST, aucune écriture.
 *
 *    /api/labo?date=2026-10-07                 → la liste des courses
 *    /api/labo?date=2026-10-07&course=<clé>    → une course, ses partants
 *    /api/labo?mesurer=1                       → le bilan des touches (archives)
 * ══════════════════════════════════════════════════════════════════════════ */

import path from 'node:path'
import { chargerDetailReu } from '../backend/ARTICLE/turfFrance.js'

const RACINE = process.cwd()
const TF = 'https://www.turf-france.com'

/* ─────────────────────────────────────────────── les critères (touches) ─ */

function formeScore(mus) {
  const s = String(mus || '')
  if (!s) return 0
  const pts = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
  let sc = 0
  const runs = s.match(/\d+[a-z]/g) || []
  runs.slice(0, 6).forEach((r, i) => {
    const pl = Number(String(r).replace(/\D/g, ''))
    sc += (pts[pl] ?? 1) / (1 + i * 0.55)
  })
  return sc
}

const TOUCHES = [
  ['Cote', (p) => Number(p.cote_pmu ?? Infinity), (a, b) => a - b],
  ['Palmarès', (p) => -(Number(p.nombreVictoires ?? 0) * 10 + Number(p.nombrePlacesSecond ?? 0) * 3 + Number(p.nombrePlacesTroisieme ?? 0) * 2 + Number(p.nombrePlaces ?? 0)), (a, b) => a - b],
  ['Forme', (p) => formeScore(p.musique), (a, b) => a - b],
  ['Classe', (p) => -(Number(p.valeur ?? 0)), (a, b) => a - b],
  ['Gains', (p) => -(Number(p.gain ?? 0)), (a, b) => a - b],
  ['Poids', (p) => Number(p.poids ?? Infinity), (a, b) => a - b],
  ['Âge', (p) => Number(p.age ?? 99), (a, b) => a - b],
]

function podium(course, nom) {
  const t = TOUCHES.find((x) => x[0] === nom)
  if (!t) return null
  const [, valeur, cmp] = t
  const pts = course.partants
    .map((p) => ({ num: p.num, v: valeur(p) }))
    .filter((x) => Number.isFinite(x.v))
    .sort((x, y) => cmp(x.v, y.v))
  if (pts.length < 3) return null
  return { premier: pts[0].num, second: pts[1].num, troisieme: pts[2].num }
}

/* ─────────────────────────────── le programme du jour (reu.php, en direct) ─ */

let _progCache = null
let _progDate = null

async function programmeDuJour(date) {
  if (_progCache && _progDate === date) return _progCache
  const r = await fetch(`${TF}/php/reu.php?view=program&date=${date}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'fr-FR,fr;q=0.9' },
    signal: AbortSignal.timeout(25000),
  })
  const html = await r.text()
  // le contrôle du §18.2 : la page d'accueil fait 3 935 o et passe pour un 200
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
    const cells = [...m[2].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => String(c[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    const ih = cells.findIndex((c) => /^\d{1,2}:\d{2}$/.test(c))
    if (!cur.pays) cur.pays = lien[8]
    cur.courses.push({
      date: lien[2], reunion: lien[4], code: lien[6], pays: lien[8],
      nom: ih >= 0 ? (cells[ih + 1] || '') : '', heure: ih >= 0 ? cells[ih] : '',
    })
  }
  _progCache = reunions.filter((r) => r.courses.length)
  _progDate = date
  return _progCache
}

/** Le détail d'une course : chargerDetailReu (le même que la page
 *   Article, §19.1). Il lit les colonnes PAR LEUR NOM, donc il marche pour
 *   les 57 courses — pas seulement pour celles dont la mise en page tombe
 *   bien. */

/** Le détail d'une course du jour : reu.php ?view=detail (les partants). */


/* ─────────────────────────────────────────────────────── le handler ────── */

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  try {
    const u = new URL(req.url || '/', 'http://localhost')
    const date = u.searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const touche = u.searchParams.get('touche') || 'Cote'

    /* ── le DÉTAIL d'UNE course ── */
    const cleCourse = u.searchParams.get('course')
    if (cleCourse) {
      // la clé du programme est `{date}_R{n}_C{m}_{PAYS}`
      const dep = cleCourse.split('_')
      const cDate = dep[0]
      const rNum = Number(String(dep[1] || '').replace(/\D/g, ''))
      const cNum = Number(String(dep[2] || '').replace(/\D/g, ''))
      const pays = dep.slice(3).join('_') || 'FRANCE'

      const prog = await programmeDuJour(cDate)
      const meta = prog.flatMap((r) => r.courses.map((x) => ({ ...x, hippo: r.hippodrome })))
        .find((x) => Number(String(x.reunion).replace(/\D/g, '')) === rNum && Number(String(x.code).replace(/\D/g, '')) === cNum)

      let partants = []
      let erreur = null
      try {
        const d = await chargerDetailReu(cDate, rNum, cNum, pays)
        partants = d.partants
      } catch (e) { erreur = e.message }

      /* Les « touches » de reu.php : c'est la BAC du Coply. */
      let touches = null
      try {
        const d = await chargerDetailReu(cDate, rNum, cNum, pays)
        const t = (d.html.match(/<script[^>]*id="serverApp-state"[^>]*>([\s\S]*?)<\/script>/i) || [])[1]
        if (t) touches = JSON.parse(t).tops || null
      } catch (e) { /* les touches sont un complément */ }

      res.statusCode = 200
      res.end(JSON.stringify({
        course: {
          cle: cleCourse, date: cDate,
          reunion: 'R' + rNum, code: 'C' + cNum, pays,
          hippodrome: meta?.hippo || '', nom: meta?.nom || '', heure: meta?.heure || '',
          arrivee: [],
          partants,
          passes: false,
          erreur,
        },
        touches,
      }))
      return
    }

    /* ── la LISTE des courses du jour ── */
    const prog = await programmeDuJour(date)
    const courses = prog.flatMap((r) => r.courses.map((c) => ({
      cle: `${c.date}_${c.reunion}_${c.code}_${String(c.pays).replace(/\s+/g, '')}`,
      date: c.date, reunion: c.reunion, code: c.code, pays: c.pays,
      hippodrome: r.hippodrome, nom: c.nom, heure: c.heure,
    })))

    res.statusCode = 200
    res.end(JSON.stringify({ date, source: 'reu.php', nb: courses.length, courses }))
  } catch (e) {
    res.statusCode = 200
    res.end(JSON.stringify({ erreur: e.message, nb: 0, courses: [] }))
  }
}