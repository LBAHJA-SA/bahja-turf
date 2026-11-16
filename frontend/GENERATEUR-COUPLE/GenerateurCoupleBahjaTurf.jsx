import { useEffect, useMemo, useState } from 'react'
import Entete from '../../src/Entete.jsx'

/* ──────────────────────────────────────────────────────────────
 *  frontend/GENERATEUR-COUPLE/GenerateurCoupleBahjaTurf.jsx
 *  GENERATEUR COUPLE BAHJA TURF
 *
 *  Page autonome (ses fichiers, pas d'import inter-pages — même
 *  règle que GENERATEUR QUINTE BAHJA TURF). Elle affiche :
 *    · LE PROGRAMME : toutes les réunions du jour, tous pays (PMU), avec les
 *      réunions du Maroc importées de SOREC (e-sorec.ma — le PMU n'en publie
 *      qu'une moitié), avec compte à rebours de la prochaine course.
 *    · LA TABLE : les partants de la course choisie, ordonnés
 *      PAR LE MARCHÉ (Equidia / SOREC), plus la fiche complète des partants
 *      (الخيل · الفارس · المدرب · الكوط).
 *    · GENERATEUR SYSTÈME : GAGNANT LOGIQUE / OUTSIDER و
 *      BASE COUPLE + BASE TRIO LOGIQUE / SPECULATIVE — مُولّدة السوق
 *      (احتمالات 1/كوط مطبّعة) بعد الضغط على «GENERER». البصمة DNA
 *      تُعرض كشارة ★ وتعيد ترتيب «الخارجي» فقط — لا تحذف أي خيل.
 *      مكسبها خارج العينة = 0 (انظر public/data/dna-independance.json).
 * ────────────────────────────────────────────────────────────── */

const THEME = {
  bord: 'rgba(215,140,80,.38)',
  bord2: 'rgba(215,140,80,.15)',
  accent: '#f3c887',       // cuivre clair
  accent2: '#e8d5a4',      // champagne / argent chaud
  cuivre: '#c87533',        // cuivre profond
  cuivre2: '#a85627',
  argent: '#d6dbe3',       // argent
  muted: '#a29a90',        // gris chaud
  texte: '#edeae6',        // argent métallisé
  fond: 'radial-gradient(900px 520px at 12% 0%, rgba(200,120,64,.08) 0%, transparent 55%), #0d0e12',
  carte: 'linear-gradient(160deg, #23242c 0%, #14151b 100%)',
  carteFond: 'linear-gradient(160deg, #23242c 0%, #14151b 100%)',
  carteBord: 'rgba(215,140,80,.28)',
  cellule: 'linear-gradient(160deg, #4a3728 0%, #33241a 100%)',
  policeFonte: 'Georgia, "Times New Roman", serif',
}

const DISCIPLINES = ['TOUS', 'ATTELÉ', 'PLAT', 'HAIE', 'STEEPLE', 'MONTÉ', 'AUTOSTART']

const normDiscipline = (d, classe) => {
  const cls = String(classe || '').toUpperCase()
  if (/AUTOSTART/i.test(cls)) return 'AUTOSTART'
  const s = String(d || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  if (s.startsWith('PLAT') || s.startsWith('GALOP')) return 'PLAT'
  if (s.startsWith('MONT')) return 'MONTÉ'
  if (s.startsWith('ATTEL') || s.startsWith('TROT') || s.startsWith('AUC')) return 'ATTELÉ'
  if (s.startsWith('HAI') || s.startsWith('HURD')) return 'HAIE'
  if (s.startsWith('STEEP') || s.startsWith('CROSS')) return 'STEEPLE'
  return 'TOUS' // inconnue → affichée partout
}

const todayYMD = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* PMU fournit le programme complet du jour — toutes les réunions, tous pays. */
/* SOREC (e-sorec.ma) — la SEULE liste complète du Maroc : le PMU n'en publie
   qu'une moitié. Voir backend/RESULTATS/maroc.js pour le contrat détaillé. */
/* الأرشيف اليومي للنتائج المغربية (يكتبه job المتواجد بالمغرب).
   يصلح كبديل احتياطي عندما يتعذر الوصول المباشر (Vercel خارج المغرب). */
let _cacheMaroc = null

async function marocArchive(date) {
  if (_cacheMaroc) return _cacheMaroc
  try {
    const r = await fetch('/data/maroc.json')
    if (!r.ok) throw new Error('maroc.json HTTP ' + r.status)
    _cacheMaroc = await r.json()
    return _cacheMaroc
  } catch {
    _cacheMaroc = null
    return null
  }
}

async function joursArchive(date) {
  /* 28 يوماً من الأرشيف — يُحمّل فقط إذا تعذر اليوم */
  try {
    const r = await fetch('/data/maroc-jours.json')
    if (!r.ok) throw new Error('maroc-jours.json HTTP ' + r.status)
    return await r.json()
  } catch { return null }
}

function mapSorecArchiveMeeting(e) {
  return {
    id: e.num, date: null, track: e.hippodrome, country: e.country, code: e.sorec,
    races: (e.courses || []).map((c) => ({
      id: c.sorecId, code: 'C' + c.num, name: String(c.nom || c.libelle || ''),
      time: null, timestamp: Number(c.time) || null,
      status: c.statut || 'OPEN',
      type: ({ PLAT: 'Plat', GALOP: 'Plat', ATTELE: 'Attelé', MONTE: 'Monté', HAIE: 'Haies', HAIES: 'Haies', STEEPLE: 'Steeple', CROSS: 'Steeple' }[String(c.discipline || 'PLAT').toUpperCase()] || 'Plat'),
      distance: Number(c.distance) || null, starters: (c.runners || []).length, purse: Number(c.prix) || 0,
    })),
  }
}

async function chargerSorecReunions(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''))
  if (!m) return []
  try {
    const r = await fetch(`/api/ma/api/meetings-v2/${ymd}`)
    if (!r.ok) throw new Error('sorec HTTP ' + r.status)
    const j = await r.json()
    const live = (j?.content?.events || []).filter((e) => /^MAR/i.test(String(e.country || '').trim()))
    if (live.length) return live
    throw new Error('sorec : aucune réunion MAR')
  } catch {
    /* ② الأرشيف — يسترد من maroc-jours.json (28 يوماً) أو maroc.json (اليوم) */
    const jours = await joursArchive(ymd)
    const parJour = jours && jours.jours && Array.isArray(jours.jours[ymd]) ? jours.jours[ymd] : null
    const mta = (parJour && parJour.length ? parJour : (await marocArchive(ymd))?.meetings) || []
    return mta.filter((e) => String(e.country || '').toUpperCase() === 'MA').map(mapSorecArchiveMeeting)
  }
}

async function chargerSorecCourseArchive(sorecId) {
  /* maroc.json — اليوم */
  const mar = await marocArchive(null)
  if (mar) {
    for (const m of mar.meetings || []) {
      for (const c of m.courses || []) {
        if (Number(c.sorecId) !== Number(sorecId)) continue
        return buildSorecCourseFromArchive(c, mar.date)
      }
    }
  }
  /* jours — 28 يوماً */
  const jours = await joursArchive(null)
  if (jours && jours.jours) {
    for (const [date, arr] of Object.entries(jours.jours)) {
      for (const m of Array.isArray(arr) ? arr : []) {
        for (const c of m.courses || []) {
          if (Number(c.sorecId) !== Number(sorecId)) continue
          return buildSorecCourseFromArchive(c, date)
        }
      }
    }
  }
  throw new Error('Course introuvable dans les archives')
}

function buildSorecCourseFromArchive(c, _date) {
  const partants = (c.runners || []).map((p) => ({
    num: Number(p.num),
    silks: null,
    nom: p?.horse || '',
    sexe: p?.sexe || null,
    age: p?.age ?? null,
    coteTrend: null,
    record: null,
    musique: p?.musique || null,
    gains: null,
    distance: Number(c.distance) || null,
    def: null,
    monte: p?.jockey || null,
    monteRef: null, monteRefBg: null,
    entraineur: p?.entraineur || null,
    entraineurRef: null, entraineurRefBg: null,
    owner: null,
    daysSince: null,
    avis: null,
    avisTitle: null,
    cote: p?.cote ?? (p?.ouverture && Number(p.ouverture) > 1.1 ? Number(p.ouverture) : null),
    coteRef: null,
    coteRefBg: null,
    coteRefText: '#e8d5a4',
    ouverture: p?.ouverture ?? null,
    coteBg: null,
    coteText: '#f3c887',
    depart: null,
  }))
  const cotes = partants
    .filter((p) => p.cote != null)
    .map((p) => ({ num: p.num, cote: p.cote, ouverture: p.ouverture ?? null, favori: false, tendance: '=', nom: p.nom }))
    .sort((a, b) => a.cote - b.cote)
  if (cotes.length) cotes[0].favori = true
  return { cotes, partants, source: 'archive' }
}

async function chargerSorecCourse(sorecId) {
  try {
    const r = await fetch(`/api/ma/api/races/${sorecId}`)
    if (!r.ok) throw new Error('sorec HTTP ' + r.status)
    const j = await r.json()
    const d = j?.content || {}
    const partants = (d.runners || []).map((p) => ({
      num: Number(p.startnr),
      silks: null,
      nom: p?.horse?.name || '',
      sexe: p?.horse?.gender || null,
      age: p?.horse?.age ?? null,
      coteLive: p?.odd > 0 ? Number(p.odd) / 100 : (p?.startodd > 0 ? Number(p.startodd) / 100 : null),
      coteLiveTrend: null,
      record: null,
      musique: p?.shortperformance || null,
      gains: null,
      distance: Number(d?.distance) || null,
      def: null,
      monte: p?.rider?.name || null,
      monteRef: null, monteRefBg: null,
      entraineur: p?.horse?.trainer || null,
      entraineurRef: null, entraineurRefBg: null,
      owner: p?.horse?.owner || null,
      daysSince: null,
      avis: null,
      avisTitle: null,
      cote: p?.odd > 0 ? Number(p.odd) / 100 : (p?.startodd > 0 ? Number(p.startodd) / 100 : null),
      depart: p?.oddtime ? Number(p.oddtime) : null,
      coteBg: null,
      coteText: '#f3c887',
      coteLiveBg: null,
      coteLiveText: '#e8d5a4',
    }))
    const cotes = partants
      .filter((p) => p.cote != null)
      .map((p) => ({
        num: p.num, cote: p.cote, ouverture: null,
        favori: false, tendance: '=', nom: p.nom,
      }))
      .sort((a, b) => a.cote - b.cote)
    if (cotes.length) cotes[0].favori = true
    return { cotes, partants, source: 'live' }
  } catch (e) {
    return chargerSorecCourseArchive(sorecId)
  }
}

async function chargerProgramme(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''))
  if (!m) return []
  const jjmm = `${m[3]}${m[2]}${m[1]}`
  const r = await fetch('/api/pmu/rest/client/61/programme/' + jjmm)
  if (!r.ok) throw new Error('programme HTTP ' + r.status)
  const j = await r.json()
  const pmu = (j?.programme?.reunions || []).map((m0) => ({
    r: Number(m0.numOfficiel) || 0,
    hippodrome: m0.hippodrome?.libelleCourt || m0.hippodrome?.libelleLong || m0.hippodrome?.liblong || '—',
    paysCode: String(m0.pays?.code || '').toUpperCase(),
    pays: m0.pays?.libelle || '',
    courses: (m0.courses || []).map((c) => ({
      r: Number(m0.numOfficiel) || 0,
      c: Number(c.numOrdre) || 0,
      nom: c.libelle || '',
      discipline: normDiscipline(c.discipline, c.categorieParticularite),
      classe: c.categorieParticularite || null,
      distance: Number(c.distance) || null,
      heure: Number(c.heureDepart) || null,
      partants: Number(c.nombreDeclaresPartants) || 0,
      prix: Number(c.montantPrix) || null,
      source: 'pmu',
    })),
  }))
  /* دمج اجتماعات المغرب من SOREC — PMU يعرض نصف اجتماع كازابلانكا فقط
     ملاحظة مثبتة: PMU يزيح توقيت المغرب بساعة عن SOREC — التطابق بالاسم لا بالوقت. */
  try {
    const norm = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '')
    const mar = await chargerSorecReunions(ymd)
    for (const e of mar) {
      const sorecRaces = (e.races || []).map((c) => ({
        r: Number(String(e.code || 'R9').replace(/\D/g, '')) || 9,
        c: Number(String(c.code || 'C1').replace(/\D/g, '')) || 1,
        nom: c.name || '',
        discipline: normDiscipline(c.racetype || c.type, c.class),
        classe: c.class || null,
        distance: Number(c.distance) || null,
        heure: Number(c.timestamp) || null,
        partants: Number(c.starters) || 0,
        prix: Number(c.purse) || null,
        source: 'sorec',
        sorecId: Number(c.id) || null,
      })).sort((a, b) => a.heure - b.heure)
      const overlap = (m0) => m0.courses.filter((c) => sorecRaces.some((s) => norm(s.nom) === norm(c.nom))).length
      const dupIdx = pmu.findIndex((m0) => m0.paysCode === 'MAR' && overlap(m0) >= 2)
      const dup = dupIdx >= 0 ? pmu[dupIdx] : null
      const merged = {
        r: dup ? dup.r : (Math.max(0, ...pmu.map((m0) => m0.r || 0)) + 1),
        hippodrome: dup ? dup.hippodrome : String(e.track || 'MAROC').toUpperCase(),
        paysCode: 'MAR',
        pays: 'Maroc',
        source: 'sorec',
        courses: [],
      }
      merged.courses = sorecRaces.map((x) => ({ ...x, r: merged.r }))
      if (dup) pmu.splice(dupIdx, 1, merged)
      else pmu.push(merged)
    }
    /* أي نسخة PMU للمغرب لم تُدمج → احذفها (ناقصة دائماً) */
    for (let i = pmu.length - 1; i >= 0; i--) {
      if (pmu[i].paysCode === 'MAR' && pmu[i].source !== 'sorec') pmu.splice(i, 1)
    }
  } catch { /* SOREC غير متاح — نعرض ما عند PMU فقط */ }
  return pmu
}

/* turf-france.com — الجدول التفصيلي للسباق ( view=detail ) عندما يتعذر الوصول لـ Equidia
   من الإنتاج. البنية مثبتة في هذا التطبيق (backend/ANALYSE/turfFrance.js). */
const paysTfCache = new Map()
async function paysTf(date) {
  if (paysTfCache.has(date)) return paysTfCache.get(date)
  try {
    const r = await fetch(`/api/tf/php/reu.php?view=program&date=${date}`)
    if (!r.ok) throw new Error('tf HTTP ' + r.status)
    const html = await r.text()
    const map = new Map()
    for (const m of String(html).matchAll(/view=detail(?:&amp;|&)date=(\d{4}-\d{2}-\d{2})(?:&amp;|&)reunion=(R\d+)(?:&amp;|&)course=(C\d+)(?:&amp;|&)pays=([^&"'>]+)/g)) {
      let pays = m[4]
      try { pays = decodeURIComponent(pays.replace(/\+/g, ' ')) } catch { /* tel quel */ }
      const r0 = Number(m[2].slice(1)), c0 = Number(m[3].slice(1))
      if (!map.has(r0 + '-' + c0)) map.set(r0 + '-' + c0, String(pays || '').toUpperCase().trim())
    }
    paysTfCache.set(date, map)
    return map
  } catch {
    paysTfCache.set(date, null)
    return null
  }
}

const stripTF = (s) => String(s || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&#039;|&apos;|&#34;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const coteTF = (s) => {
  const m = String(s || '').match(/([0-9]+(?:[.,][0-9]+)?)/)
  return m ? Number(m[1].replace(',', '.')) : null
}
const bgOfTF = (html) => {
  const m = String(html).match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6}|[a-z]+)/i)
  return m ? m[1] : null
}
const pickText = (bg) => {
  if (!bg) return '#e8d5a4'
  const h = String(bg).replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#e8d5a4'
  const r = parseInt(full.slice(0, 2), 16), g = parseInt(full.slice(2, 4), 16), b = parseInt(full.slice(4, 6), 16)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 140 ? '#111' : '#fff'
}
const gainsTF = (s) => { const m = String(s || '').match(/\d[\d\s]*/); return m ? m[0].replace(/\s/g, '') : s }
const imgTF = (html) => { const m = String(html).match(/<img[^>]*\bsrc\s*=\s*['"]([^'"]+)['"]/i); return m ? m[1] : null }
const imgTitleTF = (html) => { const m = String(html).match(/<img[^>]*\btitle\s*=\s*['"]([^'"]+)['"]/i); return m ? stripTF(m[1]) : null }

const trendOfTF = (html) => {
  const m = String(html).match(/<img[^>]*\bsrc=['"]([^'"]+)['"]/i)
  const src = m ? m[1] : ''
  if (/\/b\.gif($|\?)/i.test(src)) return 'down'
  if (/\/d\.gif($|\?)/i.test(src)) return 'flat'
  if (/\/h\.gif($|\?)/i.test(src)) return 'up'
  return null
}

function parseTF(html) {
  const partants = []
  for (const m of String(html).matchAll(/<tr\s+data-num='?(\d+)'?[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...m[2].matchAll(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)].map((c) => c[0])
    if (cells.length < 19) continue
    const c4 = cells[4]
    const c12 = cells[12]
    const c14 = cells[14]
    const c16 = cells[16]
    // cells[4] = Cotes Ref. (3 سنوات) · cells[12] = Cotes (الكوط الحية del marché)
    const coteRef = coteTF(stripTF(c4))
    const cote = coteTF(stripTF(c12))
    partants.push({
      num: Number(stripTF(cells[2])),
      silks: imgTF(cells[1]),
      nom: stripTF(cells[3]),
      cote,
      coteBg: bgOfTF(c12),
      coteText: pickText(bgOfTF(c12)),
      coteTrend: trendOfTF(c12),
      coteRef,
      coteRefBg: bgOfTF(c4),
      coteRefText: pickText(bgOfTF(c4)),
      age: Number(stripTF(cells[5])) || null,
      sexe: stripTF(cells[6]) || null,
      record: stripTF(cells[7]) || null,
      musique: stripTF(cells[8]) || null,
      gains: gainsTF(stripTF(cells[9])) || null,
      distance: Number((stripTF(cells[10]).match(/\d+/) || [null])[0]) || null,
      def: stripTF(cells[11]) || null,
      monte: stripTF(cells[13]) || null,
      monteRef: coteTF(stripTF(c14)),
      monteRefBg: bgOfTF(c14),
      entraineur: stripTF(cells[15]) || null,
      entraineurRef: coteTF(stripTF(c16)),
      entraineurRefBg: bgOfTF(c16),
      owner: stripTF(cells[17]) || null,
      daysSince: stripTF(cells[18]) || null,
      avis: imgTF(cells[19]),
      avisTitle: imgTitleTF(cells[19]),
    })
  }
  return partants
}

async function chargerTurfFranceFrance(ymd, r, num) {
  const paysMap = await paysTf(ymd)
  const pays = paysMap?.get(r + '-' + num)
  if (!pays) throw new Error('pays introuvable sur turf-france pour cette course')
  const r0 = await fetch(`/api/tf/php/reu.php?view=detail&date=${ymd}&reunion=R${r}&course=C${num}&pays=${encodeURIComponent(pays)}`)
  if (!r0.ok) throw new Error('tf detail HTTP ' + r0.status)
  const html = await r0.text()
  const partants = parseTF(html)
  const cotes = partants
    .filter((p) => p.cote != null)
    .map((p) => ({ num: p.num, cote: p.cote, ouverture: null, favori: false, tendance: '=', nom: p.nom }))
    .sort((a, b) => a.cote - b.cote)
  if (cotes.length) cotes[0].favori = true
  return { cotes, partants, source: 'turf-france' }
}

async function chargerFranceMarche(ymd, r, num) {
  /* turf-france أولاً: الجدول بكامل أعمدة المصدر وألوانه حرفياً (casaque، cotes ref، cotes…).
     Equidia عند الفشل — الأسماء والأعسر تظهر بدون ألوان المصدر. */
  try {
    const v = await chargerTurfFranceFrance(ymd, r, num)
    if (v.partants && v.partants.length) return v
    throw new Error('turf-france vide')
  } catch {
    return chargerMarche(ymd, r, num)
  }
}

/* Equidia → le marché + la fiche complète des partants (page Angular, état collé en JSON).
   Une seule page, deux exports : pari_simple (cotes) + v2/courses (partants). */
async function chargerMarche(ymd, r, c) {
  const html = await fetch(`/api/eq/courses/${ymd}/R${r}/C${c}`, { headers: { Accept: 'text/html' } }).then((x) => x.text())
  const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return { cotes: null, partants: [] }
  const state = JSON.parse(
    m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  )
  const ps = state[`courses/${ymd}/R${r}/C${c}/pari_simple`] || []
  const cotes = ps
    .filter((x) => Number(x.rapp_evol) > 0)
    .map((x) => ({
      num: Number(x.num_partant),
      cote: Number(x.rapp_evol),
      ouverture: x.rapp_ref == null ? null : Number(x.rapp_ref),
      favori: !!x.favori,
      tendance: x.tendance_signe || '=',
      nom: x.cheval?.nom_cheval || '',
    }))
    .sort((a, b) => a.cote - b.cote)
  const v2 = state[`v2/courses/${ymd}/R${r}/C${c}`] || {}
  const partants = (v2.partants || []).map((p) => ({
    num: Number(p.num_partant),
    silks: p?.silks_path || null,
    nom: p?.cheval?.nom_cheval || '',
    sexe: p?.cheval?.sexe_cheval || p?.sexe_cheval || null,
    age: p?.cheval?.age_cheval ?? p?.age_cheval ?? null,
    coteLive: null,
    coteLiveTrend: null,
    musique: p?.cheval?.musique ?? p?.musique ?? null,
    monte: p?.monte?.nom_monte || null,
    entraineur: p?.cheval?.entraineur?.nom_entraineur || p?.entraineur?.nom_entraineur || null,
    owner: p?.proprietaire?.nom_proprietaire || null,
    gains: p?.cheval?.gains_carriere ?? null,
    distance: null,
    record: null,
    def: null,
    daysSince: null,
    avis: null,
    avisTitle: p?.libelle_avis_entraineur || null,
    coteBg: null, coteText: '#f3c887', coteLiveBg: null, coteLiveText: '#e8d5a4',
    monteRef: null, monteRefBg: null,
    entraineurRef: null, entraineurRefBg: null,
  }))
  return { cotes, partants }
}

/* السوق: الاحتمال الضمني المطبّع لكل خيل = (1/كوط) مقسومًا على مجموع (1/كوط) داخل السباق.
   لا يُستعمل أي متغير آخر في النواة — لا عمر، لا جنس (ممنوع من المالك)، لا إشارات أخرى. */
const probsImplicites = (liste) => {
  if (!liste || !liste.length) return []
  const inv = liste.map((r) => 1 / r.cote)
  const s = inv.reduce((a, b) => a + b, 0)
  if (s <= 0) return liste.map(() => 1 / liste.length)
  return inv.map((x) => x / s)
}

/* بصمة DNA — إشاراتها متاحة 9عاً هنا (كوط/افتراضي فقط). تُستعمل كعرض وإعادة ترتيب اقتراحات فقط.
   ملاحظة مثبتة: مكسبها خارج العينة = 0 (tools/dna-independance.py). لا تحذف أي خيل أبداً. */
const dnaMatch = (x) => x.rangCote <= 3

const drapeauPour = (code) => {
  const c = String(code || '').toUpperCase()
  if (c === 'FR' || c === 'FRA') return '🇫🇷'
  if (c === 'MA' || c === 'MAR') return '🇲🇦'
  if (c === 'GB' || c === 'GBR' || c === 'UK') return '🇬🇧'
  if (c === 'IT' || c === 'ITA') return '🇮🇹'
  if (c === 'ES' || c === 'ESP') return '🇪🇸'
  if (c === 'DE' || c === 'DEU') return '🇩🇪'
  if (c === 'BE' || c === 'BEL') return '🇧🇪'
  if (c === 'NL' || c === 'NLD') return '🇳🇱'
  if (c === 'AR' || c === 'ARG') return '🇦🇷'
  if (c === 'CL' || c === 'CHL') return '🇨🇱'
  if (c === 'US' || c === 'USA') return '🇺🇸'
  if (c === 'SE' || c === 'SWE') return '🇸🇪'
  if (c === 'GB"' || c === 'IRE' || c === 'IRL') return '🇮🇪'
  return '🏳️'
}

/* ── COMPOSANT ───────────────────────────────────────────── */
export default function GenerateurCoupleBahjaTurf() {
  const [date, setDate] = useState(todayYMD)
  const [discipline, setDiscipline] = useState('TOUS')
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [reunions, setReunions] = useState([])
  const [chargee, setChargee] = useState(null) // réunion choisie
  const [course, setCourse] = useState(null)   // course choisie (r,c)
  const [marche, setMarche] = useState(null)   // tableau ordonné par cote
  const [partants, setPartants] = useState([])  // fiche complète des partants
  const [chargementMarche, setChargementMarche] = useState(false)
  const [maintenant, setMaintenant] = useState(Date.now())
  const [dnaReorder, setDnaReorder] = useState(false) // بصمة DNA = إعادة ترتيب فقط، لا حذف
  const [generer, setGenerer] = useState(false)

  /* charge le programme de la date choisie */
  const charger = async (ymd) => {
    setChargement(true); setErreur(''); setCourse(null); setMarche(null); setChargee(null)
    try {
      const rs = await chargerProgramme(ymd)
      setReunions(rs)
    } catch (e) {
      setReunions([])
      setErreur('Programme indisponible — ' + (e && e.message ? e.message : e))
    } finally { setChargement(false) }
  }
  useEffect(() => { charger(date) }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  /* compte à rebours de la prochaine course (toutes disciplines affichées) */
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const prochaine = useMemo(() => {
    const now = maintenant
    let best = null
    for (const m0 of reunions) {
      for (const c of m0.courses) {
        if (discipline !== 'TOUS' && c.discipline !== discipline) continue
        if (!c.heure || c.heure <= now) continue
        if (!best || c.heure < best.heure) best = { ...c, hippodrome: m0.hippodrome, paysCode: m0.paysCode, r: m0.r }
      }
    }
    return best
  }, [reunions, discipline, maintenant])

  const formatCountdown = (ms) => {
    const d = Math.max(0, ms)
    const h = Math.floor(d / 3600000)
    const m = Math.floor((d % 3600000) / 60000)
    const s = Math.floor((d % 60000) / 1000)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  /* العداد علوي يعكس الفلاتر دائماً */
  const reunionsAffiches = useMemo(() => {
    if (discipline === 'TOUS') return reunions
    return reunions
      .map((m0) => ({ ...m0, courses: m0.courses.filter((c) => c.discipline === discipline) }))
      .filter((m0) => m0.courses.length > 0)
  }, [reunions, discipline])
  const totales = useMemo(() => reunionsAffiches.reduce((a, m0) => a + m0.courses.length, 0), [reunionsAffiches])

  /* charge le marché de la course choisie (Equidia FR · SOREC MAR) */
  useEffect(() => {
    if (!course || !date) return undefined
    let vivant = true
    setChargementMarche(true); setMarche(null); setPartants([]); setGenerer(false)
    const p = course.source === 'sorec'
      ? chargerSorecCourse(course.sorecId)
      : chargerFranceMarche(date, course.r, course.c)
    p.then((v) => { if (vivant) { setMarche(v.cotes || []); setPartants(v.partants || []) } })
      .catch(() => { if (vivant) { setMarche([]); setPartants([]) } })
      .finally(() => { if (vivant) setChargementMarche(false) })
    return () => { vivant = false }
  }, [course, date])

  /* carnet : ordres P1..Pn triés par LE MARCHÉ, alternance de parité */
  const carnet = useMemo(() => {
    if (!marche || !marche.length) return null
    const p1 = marche[0].num
    const par = (x) => ((x % 2) + 2) % 2
    const pariteHaut = par(p1)
    const cols = []
    const h = marche.filter((c) => par(c.num) === pariteHaut)
    const b = marche.filter((c) => par(c.num) !== pariteHaut)
    h.forEach((c, i) => { c.slot = 2 * i + 1 })
    b.forEach((c, i) => { c.slot = 2 * i + 2 })
    for (let i = 0; i < Math.max(h.length, b.length); i++) {
      if (h[i] || b[i]) cols.push({ haut: h[i] || null, bas: b[i] || null })
    }
    return cols
  }, [marche])

  const courseNom = useMemo(() => {
    if (!course) return ''
    const m0 = reunions.find((x) => x.r === course.r)
    const c = m0?.courses.find((y) => y.c === course.c)
    return c ? c.nom : ''
  }, [course, reunions])

  const courseMeta = useMemo(() => {
    if (!course) return null
    const m0 = reunions.find((x) => x.r === course.r)
    const c = m0?.courses.find((y) => y.c === course.c)
    return c ? { hippodrome: m0.hippodrome, paysCode: m0.paysCode, ...c } : null
  }, [course, reunions])

  /* السوق + الاحتمالات الضمنية — النواة الوحيدة للتوليد */
  const marcheOrdonne = useMemo(() => {
    if (!marche || !marche.length) return null
    const probs = probsImplicites(marche)
    return marche.map((m0, i) => ({ ...m0, proba: probs[i], rangCote: i + 1 }))
  }, [marche])

  /* الاقتراحات: LOGIQUE = السوق بالضبط. SPECULATIVE = المفضّل + خارجي السوق (الرتبة 4)،
     أو الخارجي المفضّل البصريّ بالبصمة عند تفعيل «ترتيب DNA» — إعادة ترتيب فقط، لا حذف. */
  const picks = useMemo(() => {
    if (!marcheOrdonne || marcheOrdonne.length < 4) return null
    const [p1, p2, p3, p4] = marcheOrdonne
    const outsiders = marcheOrdonne.slice(3)
    let outsider = p4
    if (dnaReorder && outsiders.length) {
      /* بصمة السعر كترتيب للاقتراح فقط: كوط ≤ 7 أولاً (عنقود DNA السعري)، ثم الكوط */
      const scored = outsiders
        .map((o) => ({ o, s: (o.cote <= 7 ? 2 : 0) + (dnaMatch(o) ? 1 : 0) }))
        .sort((a, b) => b.s - a.s || a.o.cote - b.o.cote)
      outsider = scored[0].o
    }
    return {
      logique: { gagner: p1, couple: [p1, p2], trio: [p1, p2, p3] },
      speculative: { outsider, couple: [p1, outsider], trio: [p1, p2, outsider] },
      dnaClusterCouple: dnaMatch(p1) && dnaMatch(p2),
      dnaClusterTrio: [p1, p2, p3].every((x) => dnaMatch(x)),
    }
  }, [marcheOrdonne, dnaReorder])

  const pctProba = (x) => (x && x.proba != null ? (x.proba * 100).toFixed(1) + '%' : '')

  /* جدول المشاركين — ترتيب السوق عند توفره، وإلا بترتيب N° */
  const partantsTri = useMemo(() => {
    if (!partants || !partants.length) return []
    const coteBy = new Map((marche || []).map((x) => [x.num, x.cote]))
    const merged = partants.map((p) => ({ ...p, cote: coteBy.get(p.num) ?? p.cote ?? null }))
    if (marche && marche.length) {
      const ord = new Map(marche.map((x, i) => [x.num, i]))
      merged.sort((a, b) => (ord.get(a.num) ?? 999) - (ord.get(b.num) ?? 999))
    } else {
      merged.sort((a, b) => a.num - b.num)
    }
    const fav = marche && marche.length ? marche[0].num : null
    return merged.map((p) => ({ ...p, favori: p.num === fav }))
  }, [partants, marche])

  return (
    <>
      <Entete page="coupleGenerateur" />

      <main
        style={{
          minHeight: 'calc(100vh - 68px)',
          padding: 'clamp(16px, 3vw, 26px) 16px clamp(20px, 5vw, 48px)',
          background: 'radial-gradient(900px 520px at 12% 0%, rgba(215,140,80,.07) 0%, transparent 55%), #0a0803',
          color: THEME.texte,
        }}
      >
        <div style={{ display: 'grid', gap: 16, width: '100%' }}>

          {/* ── ligne : LA TABLE (carnet + marché) + panneau de droite ── */}
          <div className="generateur-row">

            {/* ── LA TABLE — partants ordonnés par le marché ── */}
            <section style={{
              padding: 'clamp(14px, 2.5vw, 20px)', borderRadius: 18,
              border: '1px solid ' + THEME.bord,
              background: 'linear-gradient(165deg, rgba(46,45,55,.55) 0%, rgba(22,23,28,.88) 100%)',
              boxShadow: '0 14px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(215,140,80,.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{
                    margin: 0, fontSize: 14, letterSpacing: '.16em', color: '#f3c887',
                    fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800,
                  }}>
                    {courseNom || 'LA TABLE'}
                  </h2>
                  <div style={{ marginTop: 4, fontSize: 11, color: THEME.muted }}>
                    {courseMeta && (
                      <>
                        Source : le marché{courseMeta?.hippodrome ? ' · ' + courseMeta.hippodrome : ''}
                        {courseMeta?.discipline ? ' · ' + courseMeta.discipline : ''}
                        {courseMeta?.distance ? ' · ' + courseMeta.distance + 'm' : ''}
                        {courseMeta?.partants ? ' · ' + courseMeta.partants + ' partants' : ''}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Filtre discipline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <span style={{ fontSize: 10, letterSpacing: '.16em', color: THEME.muted, fontWeight: 800 }}>
                  DISCIPLINE
                </span>
                {DISCIPLINES.map((d) => {
                  const actif = discipline === d
                  return (
                    <button
                      key={d} type="button" onClick={() => setDiscipline(d)} aria-pressed={actif}
                      style={{
                        padding: '5px 14px', borderRadius: 999, cursor: 'pointer',
                        fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em',
                        color: actif ? '#241a02' : '#b8afa6',
                        border: actif ? 'none' : '1px solid rgba(205,130,70,.4)',
                        background: actif ? 'linear-gradient(150deg, #e8d5a4, #f3c887 55%, #c87533)' : 'rgba(215,140,80,.05)',
                        boxShadow: actif ? '0 3px 12px rgba(215,140,80,.3)' : 'none',
                      }}
                    >{d}</button>
                  )
                })}
              </div>

              <div style={{ marginTop: 12 }}>
                {!course && (
                  <p style={{ fontSize: 12, color: THEME.bronzeTxt, margin: '6px 2px 0' }}>
                    اختر سباقًا من « LE PROGRAMME » — جدول السباق يملأ بترتيب السوق.
                  </p>
                )}
                {course && chargementMarche && (
                  <p style={{ fontSize: 12, color: THEME.bronzeTxt, margin: '6px 2px 0' }}>الـسوق يُحمّل…</p>
                )}
                {course && !chargementMarche && marche && marche.length === 0 && (
                  <p style={{ fontSize: 12, color: THEME.bronzeTxt, margin: '6px 2px 0' }}>
                    الـسوق غير منشور لهذا السباق (يُنشر قبل الانطلاق ~10 دقائق).
                  </p>
                )}
                {carnet && (
                  <div style={{ overflowX: 'auto', padding: '4px 2px 10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${carnet.length}, 84px)`, gap: 8, width: 'max-content' }}>
                      {carnet.map((col, i) => (
                        <div key={i} style={{ display: 'grid', gap: 8 }}>
                          {[col.haut, col.bas].map((c, k) => (
                            c ? (
                              <div key={k} style={{
                                position: 'relative', display: 'grid', justifyItems: 'center', gap: 2,
                                padding: '7px 6px 8px', borderRadius: 10, border: '1px solid rgba(205,130,70,.35)',
                                background: THEME.carteFond || 'linear-gradient(160deg, #23242c 0%, #14151b 100%)',
                                boxShadow: 'inset 0 1px 0 rgba(215,140,80,.2), 0 3px 8px rgba(0,0,0,.5)',
                              }}>
                                <span style={{ fontSize: 8, color: THEME.muted, letterSpacing: '.18em', fontWeight: 800 }}>P{c.slot}</span>
                                <span style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 800, fontFamily: 'Georgia, "Times New Roman", serif', color: '#f3c887' }}>{c.num}</span>
                                <span style={{ fontSize: 8.5, color: '#b8afa6', fontFamily: 'ui-monospace, Consolas, monospace' }}>{c.cote.toFixed(1)}</span>
                                {c.favori && (
                                  <span style={{ position: 'absolute', top: 2, right: 5, fontSize: 10, color: '#ffd77a' }}>★</span>
                                )}
                              </div>
                            ) : (
                              <div key={k} style={{ height: 64 }} />
                            )
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TABLE DES PARTANTS — 19 عموداً، ألوان المصدر حرفياً */}
                {partantsTri.length > 0 && (
                  <div style={{ marginTop: 4, borderTop: '1px solid rgba(205,130,70,.18)', paddingTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, letterSpacing: '.16em', color: '#f3c887', fontWeight: 800 }}>
                        TABLE DES PARTANTS{courseMeta?.source === 'sorec' ? ' — SOREC (المغرب)' : ''}
                      </span>
                      <span style={{ fontSize: 8, color: THEME.muted }}>ترتيب السوق عند توفره · الألوان = ألوان المصدر</span>
                    </div>
                    <div style={{ overflowX: 'auto', border: '1px solid rgba(205,130,70,.22)', borderRadius: 10, scrollbarWidth: 'thin' }}>
                      <table style={{ borderCollapse: 'collapse', fontSize: 10.5, color: '#e8d5a4', whiteSpace: 'nowrap', minWidth: 1180 }}>
                        <thead>
                          <tr style={{ color: THEME.muted, fontSize: 7.5, letterSpacing: '.08em', background: 'rgba(255,255,255,.02)' }}>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }} title="casaque">Casaque</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>N°</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Cheval</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }} title="Cotes du marché — la course du jour">Cotes</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Age</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Sexe</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Record</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Musique</th>
                            <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Gains</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Distance</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Def.</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }} title="Cotes du marché — la course du jour">Cotes</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Drivers</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }} title="Cotes de Références Jockey (3 ans)">Cotes Ref.</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Entraineurs</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }} title="Cotes de Références Entraineur (3 ans)">Cotes Ref.</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Propriétaire</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Dern.Part.</th>
                            <th style={{ textAlign: 'center', padding: '6px 6px', borderBottom: '1px solid rgba(205,130,70,.3)' }}>Avis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partantsTri.map((p) => (
                            <tr key={p.num} style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                              <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                {p.silks
                                  ? <img src={p.silks} alt="casaque" style={{ width: 22, height: 22, borderRadius: 3 }} />
                                  : <span style={{ color: THEME.muted, fontSize: 9 }}>—</span>}
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 800, color: '#f3c887' }}>{p.num}{p.favori ? ' ★' : ''}</td>
                              <td style={{ padding: '4px 8px', fontWeight: 800 }}>{p.nom}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', background: p.coteBg || 'transparent', color: p.coteText || '#f3c887', fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 800 }}>
                                {p.cote != null ? p.cote.toFixed(1) : '—'}
                              </td>
                              <td style={{ padding: '4px 6px', textAlign: 'center' }}>{p.age ?? '—'}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', color: THEME.muted }}>{p.sexe || '—'}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', color: THEME.muted, fontFamily: 'ui-monospace, Consolas, monospace' }}>{p.record || '—'}</td>
                              <td style={{ padding: '4px 8px', color: '#d8cfbf', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 9 }}>{p.musique || '—'}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'ui-monospace, Consolas, monospace' }}>{p.gains ? Number(p.gains).toLocaleString('fr-FR') : '—'}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', fontFamily: 'ui-monospace, Consolas, monospace' }}>{p.distance ? p.distance + 'm' : (courseMeta?.distance ? courseMeta.distance + 'm' : '—')}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', color: THEME.muted }}>{p.def || '—'}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', background: p.coteLiveBg || 'transparent', color: p.coteLiveText || '#e8d5a4', fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 800 }}>
                                {p.coteLive != null ? p.coteLive : '—'}
                              </td>
                              <td style={{ padding: '4px 8px' }}>{p.monte || '—'}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', background: p.monteRefBg || 'transparent', color: p.monteRefBg ? '#111' : THEME.muted, fontFamily: 'ui-monospace, Consolas, monospace' }}>
                                {p.monteRef != null ? p.monteRef.toFixed(1) : '—'}
                              </td>
                              <td style={{ padding: '4px 8px' }}>{p.entraineur || '—'}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center', background: p.entraineurRefBg || 'transparent', color: p.entraineurRefBg ? '#111' : THEME.muted, fontFamily: 'ui-monospace, Consolas, monospace' }}>
                                {p.entraineurRef != null ? p.entraineurRef.toFixed(1) : '—'}
                              </td>
                              <td style={{ padding: '4px 8px' }}>{p.owner || '—'}</td>
                              <td style={{ padding: '4px 8px', color: THEME.muted }}>{p.daysSince || '—'}</td>
                              <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                {p.avis
                                  ? <img src={p.avis} alt={p.avisTitle || 'avis'} title={p.avisTitle || ''} style={{ width: 15, height: 15 }} />
                                  : <span style={{ color: THEME.muted }}>—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ── GENERATEUR SYSTÈME — اللوح آبار memorبح ولوحة المميزة السوق ── */}
            <section style={{
              padding: 'clamp(12px, 2vw, 16px)', borderRadius: 18,
              border: '1px solid ' + THEME.bord,
              background: 'linear-gradient(165deg, rgba(46,45,55,.55) 0%, rgba(22,23,28,.88) 100%)',
              boxShadow: '0 14px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(215,140,80,.15)',
              display: 'grid', gap: 12, alignContent: 'start', width: 'max-content',
            }}>
              <span style={{
                display: 'block', padding: '7px 10px', textAlign: 'center',
                border: '1.5px solid #d6dbe3', borderRadius: 999, color: '#edeae6',
                background: 'rgba(215,140,80,.08)', fontFamily: 'Georgia, "Times New Roman", serif',
                fontWeight: 800, letterSpacing: '.2em', fontSize: 10, textIndent: '.2em', whiteSpace: 'nowrap',
              }}>GENERATEUR SYSTÈME</span>
              <span style={{ textAlign: 'center', fontSize: 8.5, color: THEME.muted, maxWidth: 210, lineHeight: 1.5 }}>
                النواة = السوق (1/كوط مطبّعة) · البصمة = عرض وإعادة ترتيب فقط · صفر مكسب مقاس خارج العينة
              </span>

              {/* GAGNANT LOGIQUE · GAGNANT OUTSIDER — مولّدة من السوق عند الضغط على GENERER */}
              {[
                { txt: 'GAGNANT LOGIQUE', pick: generer && picks ? picks.logique.gagner : null },
                { txt: 'GAGNANT OUTSIDER', pick: generer && picks ? picks.speculative.outsider : null },
              ].map(({ txt, pick }) => (
                <div key={txt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 225 }}>
                  <div>
                    <span style={{ fontSize: 10, letterSpacing: '.12em', color: '#edeae6', fontWeight: 800 }}>{txt}</span>
                    {pick && (
                      <div style={{ marginTop: 2, fontSize: 8.5, color: THEME.muted, fontFamily: 'ui-monospace, Consolas, monospace' }}>
                        كوط {pick.cote.toFixed(1)} · {(pick.proba * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div style={{
                    position: 'relative',
                    width: 46, height: 44, display: 'grid', placeItems: 'center', borderRadius: 999,
                    border: '1.5px solid rgba(215,140,80,.6)',
                    background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.16), transparent 60%), linear-gradient(160deg, #6b4630 0%, #46301f 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3), 0 3px 8px rgba(0,0,0,.5)',
                    color: '#f3c887', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 17,
                  }}>
                    {pick ? pick.num : '?'}
                    {pick && dnaMatch(pick) && (
                      <span title="عنقود بصمة المفضّل (كوط ≤ 3)" style={{ position: 'absolute', top: 1, right: 4, fontSize: 9, color: '#ffd77a' }}>★</span>
                    )}
                  </div>
                </div>
              ))}

              {/* BASE COUPLE — خانتان فقط (1ER · 2ÈME) — مولّدة من السوق */}
              {[
                { txt: 'BASE COUPLE LOGIQUE', cells: generer && picks ? picks.logique.couple : null, star: generer && picks?.dnaClusterCouple },
                { txt: 'BASE COUPLE SPECULATIVE', cells: generer && picks ? picks.speculative.couple : null, star: false },
              ].map(({ txt, cells, star }) => (
                <div key={txt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 225 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 10, letterSpacing: '.11em', color: '#edeae6', fontWeight: 800, lineHeight: 1.35 }}>{txt}</span>
                    {star && (
                      <div style={{ fontSize: 8, color: '#ffd77a', marginTop: 2 }}>★ عنقود المفضّل (≤ 3 · ≤ 3)</div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 46px)', gap: 4, fontSize: 7.5, fontWeight: 800, letterSpacing: '.09em', color: THEME.muted }}>
                      <div style={{ textAlign: 'center' }}>1ER</div>
                      <div style={{ textAlign: 'center' }}>2ÈME</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 46px)', gap: 4 }}>
                      {[0, 1].map((pos) => (
                        <div key={pos} style={{
                          position: 'relative',
                          width: 46, height: 44, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 1,
                          borderRadius: 14, border: '1.5px solid rgba(215,140,80,.6)',
                          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.16), transparent 60%), linear-gradient(160deg, #6b4630 0%, #46301f 100%)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), 0 3px 8px rgba(0,0,0,.5)',
                          color: '#f3c887', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 15,
                        }}>
                          {cells ? cells[pos].num : '?'}
                          {cells && <span style={{ fontSize: 7, color: '#c9b285', fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 400 }}>{cells[pos].cote.toFixed(1)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* BASE TRIO — ثلاث خانات (1ER · 2ÈME · 3ÈME) — مولّدة من السوق */}
              {[
                { txt: 'BASE TRIO LOGIQUE', cells: generer && picks ? picks.logique.trio : null, star: generer && picks?.dnaClusterTrio },
                { txt: 'BASE TRIO SPECULATIVE', cells: generer && picks ? picks.speculative.trio : null, star: false },
              ].map(({ txt, cells, star }) => (
                <div key={txt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 225 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ flex: 1, fontSize: 10, letterSpacing: '.11em', color: '#edeae6', fontWeight: 800, lineHeight: 1.35 }}>{txt}</span>
                    {star && (
                      <div style={{ fontSize: 8, color: '#ffd77a', marginTop: 2 }}>★ عنقود المفضّل (الثلاثة ≤ 3)</div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 46px)', gap: 4, fontSize: 7.5, fontWeight: 800, letterSpacing: '.09em', color: THEME.muted }}>
                      <div style={{ textAlign: 'center' }}>1ER</div>
                      <div style={{ textAlign: 'center' }}>2ÈME</div>
                      <div style={{ textAlign: 'center' }}>3ÈME</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 46px)', gap: 4 }}>
                      {[0, 1, 2].map((pos) => (
                        <div key={pos} style={{
                          position: 'relative',
                          width: 46, height: 44, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 1,
                          borderRadius: 14, border: '1.5px solid rgba(215,140,80,.6)',
                          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.16), transparent 60%), linear-gradient(160deg, #6b4630 0%, #46301f 100%)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), 0 3px 8px rgba(0,0,0,.5)',
                          color: '#f3c887', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 15,
                        }}>
                          {cells ? cells[pos].num : '?'}
                          {cells && <span style={{ fontSize: 7, color: '#c9b285', fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 400 }}>{cells[pos].cote.toFixed(1)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* ترتيب البصمة — إعادة ترتيب اقتراحات فقط، لا حذف لأي خيل */}
              <button
                type="button" onClick={() => setDnaReorder((v) => !v)} aria-pressed={dnaReorder}
                title="إعادة ترتيب الخارجي المرشح للاقتراح — لا تحذف أي خيل"
                style={{
                  justifySelf: 'center', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                  border: dnaReorder ? '1px solid rgba(255,215,122,.7)' : '1px solid rgba(215,140,80,.35)',
                  background: dnaReorder ? 'rgba(255,215,122,.12)' : 'rgba(215,140,80,.05)',
                  color: dnaReorder ? '#ffd77a' : THEME.muted, fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 999, display: 'grid', placeItems: 'center',
                  border: '1px solid rgba(215,140,80,.5)', fontSize: 9,
                }}>{dnaReorder ? '✓' : ''}</span>
                ترتيب البصمة (تجريبي)
              </button>
              <span style={{ textAlign: 'center', fontSize: 8, color: THEME.muted, maxWidth: 210, lineHeight: 1.5 }}>
                البصمة هنا = سعر فقط (لا يوجد عمر على الصفحة) — يفضّل الخارجي الأقرب سعراً · لا تحذف أي خيل · صفر مكسب خارج العينة
              </span>

              {/* زر GENERER — يفعّل المحرك: النواة = السوق */}
              {(() => {
                const ready = marcheOrdonne && marcheOrdonne.length >= 4
                return (
                  <button
                    type="button" onClick={() => setGenerer(true)} disabled={!ready}
                    title={ready ? 'توليد الاقتراحات من السوق' : 'انتظر نشر السوق للاختيارات (قبل الانطلاق ~10 دقائق)'}
                    style={{
                      marginTop: 2, justifySelf: 'center', padding: '10px 24px', borderRadius: 999,
                      cursor: ready ? 'pointer' : 'default',
                      border: '1px solid rgba(215,140,80,.6)',
                      color: ready ? '#241a02' : 'rgba(243,200,135,.4)',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 900, letterSpacing: '.22em', fontSize: 13, textIndent: '.22em',
                      background: ready ? 'linear-gradient(150deg, #e8d5a4, #f3c887 55%, #c87533)' : 'rgba(215,140,80,.05)',
                      boxShadow: ready ? '0 3px 14px rgba(215,140,80,.35)' : 'none',
                    }}
                  >GENERER</button>
                )
              })()}
              <span style={{ textAlign: 'center', fontSize: 10, color: THEME.muted, maxWidth: 210, lineHeight: 1.5 }}>
                {marche ? 'السوق جاهز — اضغط «GENERER»' : 'السوق غير منشور بعد · يُنشر قبل الانطلاق ~10 دقائق'}
              </span>
              {generer && picks && (
                <button type="button" onClick={() => setGenerer(false)} style={{
                  justifySelf: 'center', border: 'none', background: 'transparent', color: '#b8afa6',
                  fontSize: 9, textDecoration: 'underline', cursor: 'pointer', letterSpacing: '.06em',
                }}>مسح التوليد</button>
              )}
            </section>
          </div>{/* generateur-row */}

          {/* ── LE PROGRAMME ── */}
          <section style={{
            padding: 'clamp(14px, 2.5vw, 20px)', borderRadius: 18,
            border: '1px solid ' + THEME.bord,
            background: 'linear-gradient(165deg, rgba(46,45,55,.55) 0%, rgba(22,23,28,.88) 100%)',
            boxShadow: '0 14px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(215,140,80,.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <h2 style={{
                margin: 0, fontSize: 13, letterSpacing: '.16em', color: '#f3c887',
                fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800,
              }}>LE PROGRAMME</h2>
              <span style={{ fontSize: 11, color: THEME.bronzeTxt, background: 'rgba(215,140,80,.06)', border: '1px solid rgba(215,140,80,.25)', padding: '3px 12px', borderRadius: 999, fontFamily: 'ui-monospace, Consolas, monospace' }}>
                {reunionsAffiches.length} réunion · {totales} courses{discipline !== 'TOUS' ? ` · ` + discipline : ''}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: THEME.bronzeTxt }}>
                <span>Date</span>
                <input
                  type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  style={{
                    colorScheme: 'dark', background: 'rgba(215,140,80,.05)', color: '#e8d5a4',
                    border: '1px solid rgba(205,130,70,.45)', borderRadius: 10, padding: '6px 10px', fontSize: 13,
                    fontFamily: 'ui-monospace, Consolas, monospace',
                  }}
                />
              </label>
              <button
                type="button" onClick={() => charger(date)}
                style={{
                  padding: '6px 18px', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(215,140,80,.4)',
                  background: 'rgba(215,140,80,.07)', color: '#f3c887', fontWeight: 800, fontSize: 12, letterSpacing: '.06em',
                }}
              >Charger</button>
            </div>

            <p style={{ margin: '8px 2px 0', fontSize: 10.5, color: '#c8a24a' }}>
              Réunion du Maroc publiée par la SOREC : actualisées chaque heure après 00:00 — réessayez si elle n’apparaît pas.
            </p>

            {/* compte à rebours de la prochaine course */}
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              border: '1px solid rgba(215,140,80,.35)', borderRadius: 10,
              background: 'radial-gradient(ellipse at center, rgba(215,140,80,.13) 0%, rgba(215,140,80,.03) 75%)',
              padding: '10px 14px',
            }}>
              <span style={{ fontSize: 10, letterSpacing: '.14em', color: THEME.muted, fontWeight: 800 }}>PROCHAINE COURSE</span>
              {prochaine ? (
                <>
                  <span style={{ fontSize: 22, fontFamily: 'ui-monospace, Consolas, monospace', color: '#f3c887', fontWeight: 800 }}>
                    {formatCountdown(prochaine.heure - maintenant)}
                  </span>
                  <span style={{ fontSize: 11, color: THEME.bronzeTxt }}>
                    {prochaine.paysCode ? drapeauPour(prochaine.paysCode) + ' ' : ''}
                    {prochaine.hippodrome} · R{prochaine.r}C{prochaine.c}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: THEME.muted }}>aucune course planifiée aujourd’hui (ou déjà terminées).</span>
              )}
            </div>

            {chargement && <p style={{ marginTop: 10, fontSize: 12, color: THEME.bronzeTxt }}>Chargement du programme…</p>}
            {erreur && <p style={{ marginTop: 10, fontSize: 12, color: '#fda4af' }}>{erreur}</p>}

            {/* grille des réunions */}
            {!chargement && !erreur && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, marginTop: 12 }}>
                {reunionsAffiches.map((m0) => {
                  const ouverte = chargee?.r === m0.r
                  const prem = m0.courses[0]
                  const heure = prem?.heure ? new Date(prem.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
                  return (
                    <button
                      key={m0.r} type="button" onClick={() => { setChargee(ouverte ? null : { r: m0.r }); setCourse(null) }}
                      aria-pressed={ouverte}
                      style={{
                        textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '10px 12px',
                        border: ouverte ? '1.5px solid rgba(215,140,80,.6)' : '1px solid rgba(215,140,80,.2)',
                        background: ouverte ? 'rgba(215,140,80,.06)' : 'rgba(255,255,255,.02)',
                        color: THEME.texte, fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(215,140,80,.45)', color: '#f3c887', background: 'rgba(0,0,0,.3)' }}>
                          R{m0.r}
                        </span>
                        <span style={{ fontSize: 15 }}>{drapeauPour(m0.paysCode)}</span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 800, color: '#e8d5a4', fontFamily: 'Georgia, "Times New Roman", serif' }}>
                        {m0.hippodrome}
                      </div>
                      <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 2 }}>
                        {m0.courses.length} course{m0.courses.length > 1 ? 's' : ''} · 1er à {heure}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* détail de la réunion choisie */}
            {chargee && (
              <div style={{ marginTop: 12 }}>
                {reunionsAffiches.filter((m0) => m0.r === chargee.r).map((m0) => (
                  <div key={m0.r}>
                    <div style={{ fontSize: 10, letterSpacing: '.16em', fontWeight: 800, color: THEME.muted, marginBottom: 6 }}>
                      R{m0.r} · {m0.hippodrome} — CHOISISSEZ LA COURSE
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {m0.courses.map((c) => (
                        <button
                          key={c.c} type="button" onClick={() => setCourse({ r: m0.r, c: c.c, source: c.source || 'pmu', sorecId: c.sorecId || null })}
                          aria-pressed={course?.r === m0.r && course?.c === c.c}
                          style={{
                            cursor: 'pointer', borderRadius: 10, padding: '6px 10px', fontFamily: 'inherit',
                            border: course?.r === m0.r && course?.c === c.c ? '1.5px solid rgba(215,140,80,.6)' : '1px solid rgba(215,140,80,.18)',
                            background: course?.r === m0.r && course?.c === c.c ? 'rgba(215,140,80,.08)' : 'rgba(255,255,255,.02)',
                            color: course?.r === m0.r && course?.c === c.c ? '#e8d5a4' : THEME.texte,
                          }}
                        >
                          <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted }}>C{c.c} · {c.discipline} · {c.distance}m</span>
                          <div style={{ fontSize: 10.5, marginTop: 2, fontWeight: 700 }}>
                            {c.heure ? new Date(c.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''} · {c.partants} partants
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
