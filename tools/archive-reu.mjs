/* ============================================================================
 * tools/archive-reu.mjs — LE COLLECTEUR de notre archive (source Equidia).
 *
 * Remplit data/reu/ (+ public/data/reu/) : le programme du jour
 * + le détail de CHAQUE course depuis Equidia.
 *
 *   node tools/archive-reu.mjs 2026-10-04        (un jour)
 *   node tools/archive-reu.mjs 2026-10-04 2026-10-03   (plusieurs jours)
 *
 * Source principale : Equidia (données complètes : musique, lastPerformance,
 * poids, corde, valeur, gains, driver, entraineur, etc.)
 * Fallback : pro.casacourses.com / e-sorec.ma pour le Maghreb.
 * ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.join(ICI, '..')

const EQ = 'https://www.equidia.fr'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl'

const pause = (ms) => new Promise((r) => setTimeout(r, ms))

function ecrire(relatif, obj) {
  for (const base of ['data', path.join('public', 'data')]) {
    const f = path.join(RACINE, base, relatif)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, JSON.stringify(obj, null, 1), 'utf8')
  }
}

function lire(relatif) {
  try { return fs.readFileSync(path.join(RACINE, 'data', relatif), 'utf8') } catch (e) { return null }
}

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
  let txt = m[1]
    .replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/'/g, "'").replace(/&/g, '&')
  try {
    const st = JSON.parse(txt)
    // Programme du jour : clé comme "courses/2026-10-13" ou similaire
    for (const key of Object.keys(st)) {
      if (key.startsWith('courses/') && key.includes(date)) {
        const data = st[key]
        if (data && data.meetings) return data.meetings
      }
    }
    return null
  } catch { return null }
}

function extraireDetailEquidia(html, date, rNum, cNum) {
  const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  let txt = m[1]
    .replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/'/g, "'").replace(/&/g, '&')
  try {
    const st = JSON.parse(txt)
    // v2/courses d'abord (détail complet), jamais pari_simple (marché seul).
    const tag = `/R${rNum}/C${cNum}`
    const exact = `v2/courses/${date}/R${rNum}/C${cNum}`
    if (st[exact]) return st[exact]
    for (const key of Object.keys(st)) {
      if (key.includes(tag) && key.includes('v2/courses')) return st[key]
    }
    return null
  } catch { return null }
}

function parserDetailEquidia(data, date, rNum, cNum, pays) {
  if (!data) return null
  // v2/courses : le tableau s'appelle `partants`.
  const runners = Array.isArray(data) ? data : (data.partants || data.runners || data.participants || [])
  if (!Array.isArray(runners) || !runners.length) return null

  /* Équidia publie le jockey sous `monte.nom_monte`, l'entraîneur sous
     `entraineur.nom_entraineur` (ou `cheval.entraineur.nom_entraineur`), la
     musique sous `cheval.musique` / `short_musique` / `musique`, la cote sous
     `get_last_cote_off.rapp_evol`. L'ancien parseur cherchait `driver.name`,
     `trainer.name`, `lastPerformance` → tout était vide pour les courses
     archivées (post-course comme pré-course : même forme). */
  const txtNom = (x) => {
    if (x == null) return ''
    if (typeof x === 'string') return x
    if (typeof x === 'object') {
      for (const k of ['nom_monte', 'nom_entraineur', 'nom_jockey', 'nom_cheval', 'name', 'nom', 'valeur']) {
        if (typeof x[k] === 'string' && x[k]) return x[k]
      }
      for (const v of Object.values(x)) if (typeof v === 'string' && v) return v
      return ''
    }
    return String(x)
  }

  const partants = runners
    .filter((r) => r.num_partant || r.numero || r.num)
    .map((r) => {
      const num = Number(r.num_partant || r.numero || r.num)
      const cheval = txtNom(r.cheval?.nom_cheval || r.cheval?.name || r.name || r.horse?.name || '')
      const musique = txtNom(r.musique || r.short_musique || r.cheval?.musique || r.lastPerformance || '')
      const driv = txtNom(r.monte || r.cheval?.driver || r.driver || r.jockey || r.rider || '')
      const entr = txtNom(r.entraineur || r.cheval?.entraineur || r.trainer || r.horse?.trainer || '')
      const cote = r.get_last_cote_off?.rapp_evol ?? r.get_last_cote_off?.rapp_ref ?? r.rapp_evol ?? r.rapp_ref ?? r.cote ?? r.odd ?? null
      const coteRef = r.get_last_cote_off?.rapp_ref ?? r.rapp_ref ?? r.get_last_cote_off?.rapp_evol ?? r.rapp_evol ?? r.coteRef ?? r.startodd ?? null
      return {
        num,
        cheval,
        nom: cheval,
        poids: r.pds_calc_hand_partant ?? r.pds_cond_monte_partant ?? r.poids ?? r.weight ?? null,
        driver: driv,
        jockey: driv,
        entraineur: entr,
        valeur: r.valeur ?? r.value ?? null,
        sexe: r.sexe_cheval ?? r.sexe ?? r.horse?.gender ?? '',
        age: r.age_cheval ?? r.age ?? r.horse?.age ?? null,
        couleur: r.cheval?.couleur ?? r.horse?.colour ?? '',
        proprietaire: txtNom(r.proprietaire || r.cheval?.owner || r.horse?.owner || ''),
        cote,
        coteRef,
        depart: r.place_corde_partant ?? r.startbox ?? r.corde ?? r.cheval?.corde ?? null,
        def: r.deferrer_partant ?? r.deferrer_partant_first_time ?? r.ferrure ?? r.horseshoe ?? r.blinkers ?? null,
        silk: r.silks_path || r.cheval?.silk?.url || r.jockeycolorfile || r.jockeycolour || null,
        dernierPassage: r.cheval?.musique ?? r.short_musique ?? r.lastPerformance ?? null,
        gains: r.gains_carriere ?? r.gains ?? r.horse?.gains ?? null,
        musique,
        place: r.num_place_arrivee ?? r.finishorder ?? r.finish ?? r.place ?? null,
      }
    }).filter((p) => p.num)

  if (!partants.length) return null

  // Arrivée depuis num_place_arrivee (« 01 », « 02 »…)
  const arrivee = runners
    .filter((r) => {
      const pl = r.num_place_arrivee ?? r.finishorder ?? r.finish ?? r.place
      return pl != null && String(pl).trim() !== '' && String(pl).trim() !== '00'
    })
    .sort((a, b) => Number(a.num_place_arrivee ?? a.finishorder ?? a.finish ?? a.place) - Number(b.num_place_arrivee ?? b.finishorder ?? b.finish ?? b.place))
    .map((r) => Number(r.num_partant || r.numero || r.num))
    .filter(Number.isFinite)

  // Hippodrome et nom de course
  const hippodrome = data.meeting?.hippodrome || data.track || data.hippodrome || ''
  const nom = data.race?.nom || data.name || ''

  return {
    v: 2, pv: 4,
    source: 'Equidia',
    race: {
      numOrdre: cNum,
      nom,
      distance: data.race?.distance ?? null,
      type: data.race?.type ?? data.discipline ?? '',
      date,
      nbPartants: partants.length,
      meteo: data.meteo?.temperature != null ? String(data.meteo.temperature) : null,
    },
    meeting: {
      num: rNum,
      hippodrome,
      pays: String(pays).trim().toUpperCase(),
    },
    participants: partants,
    arrivee,
    collecteLe: new Date().toISOString(),
  }
}

function nomFichierCourse(date, rNum, cNum, pays) {
  return `${date}_R${rNum}_C${cNum}_${String(pays || 'FRANCE').replace(/\s+/g, '')}.json`
}

/* Le programme du jour, depuis Equidia `/courses/{date}` — le MÊME parseur
 * que la page Couplé (`api/couple.js`).
 *
 * ⚠ 20/10/2026 : l'ancien appel `chargerProgrammeReu(date)` (turf-france)
 * n'était plus importé dans ce fichier → `ReferenceError` au premier jour
 * sans `prog-AAAA-MM-JJ.json` local. Le collecteur plantait donc en silence
 * et l'archive s'est arrêtée au 13/10/2026 (plus de partants pour une date
 * passée → la page répondait « Aucune source de partants disponible »).
 * On ne dépend plus de turf-france : Equidia donne et la liste et le détail. */
async function chargerProgrammeEquidia(date) {
  const html = await fetchEquidia(`${EQ}/courses/${date}`)
  if (!html) return null
  const meetings = extraireProgrammeEquidia(html, date)
  if (!meetings || !meetings.length) return null
  return meetings.map((m) => {
    const rNum = Number(m.numero ?? m.num ?? 0)
    const pays = m.pays || m.country || 'FRANCE'
    return {
      hippodrome: m.hippodrome || m.track || m.label || '',
      pays,
      courses: (m.races || m.courses || []).map((c) => ({
        date,
        reunion: 'R' + Number(c.pmu_reunion ?? rNum),
        code: 'C' + Number(c.pmu_course ?? c.numero ?? c.num ?? 0),
        pays,
        nom: c.nom || c.name || '',
        heure: c.heure || c.time_hm || '',
        distance: c.distance ?? null,
        type: c.type || c.discipline || '',
      })),
    }
  })
}

/* Repli : pro.casacourses.com, qui liste ENCORE les journées passées (Equidia
 * ne sert `/courses/{date}` que le jour même — vérifié le 20/10/2026). C'est
 * ce qui permet de reconstruire une archive manquante. */
async function chargerProgrammeCasacourses(date) {
  const r = await fetch('https://pro.casacourses.com/api/programme?date=' + date, { headers: { Accept: 'application/json' } })
  if (!r.ok) return null
  const j = await r.json()
  const meetings = j.meetings || []
  if (!meetings.length) return null
  return meetings.map((m) => {
    const pays = String(m.country || 'FRANCE').toUpperCase()
    const reu = 'R' + Number(String(m.reunion_code || '').replace(/\D/g, ''))
    return {
      hippodrome: String(m.track || m.label || ''),
      pays,
      courses: (m.races || []).map((c) => ({
        date,
        reunion: reu,
        code: 'C' + Number(String(c.code || '').replace(/\D/g, '')),
        pays,
        nom: c.name || '',
        heure: c.time_hm || '',
        distance: c.distance ?? null,
        type: c.type || '',
      })).filter((c) => c.code !== 'C0' && c.code !== 'CNaN'),
    }
  }).filter((r2) => r2.courses.length)
}

/** Le programme d'une journée : Equidia d'abord, casacourses ensuite. */
async function chargerProgramme(date) {
  let reunions = null
  try { reunions = await chargerProgrammeEquidia(date) } catch { reunions = null }
  if (reunions && reunions.length) return reunions
  reunions = await chargerProgrammeCasacourses(date)
  if (!reunions || !reunions.length) throw new Error('aucun programme pour ' + date + ' (Equidia + casacourses)')
  return reunions
}

async function collecterJour(date) {  console.log('══ ' + date + ' ══ (source: Equidia)')
  const t0 = Date.now()

  // 1. Liste des courses : prog local d'abord, sinon reu.php (turfFrance).
  //    (La page /courses/{date} d'Equidia ne liste pas les réunions ;
  //    Equidia sert pour le DÉTAIL de chaque course, pas le programme.)
  let toutes = []
  let reunionsProg = null
  try {
    const pj = JSON.parse(lire(`reu/prog-${date}.json`) || 'null')
    if (pj?.reunions?.length) {
      reunionsProg = pj.reunions
      for (const r of reunionsProg) for (const c of r.courses || []) {
        toutes.push({
          date: c.date || date, reunion: c.reunion, code: c.code,
          pays: c.pays || r.pays || 'FRANCE', nom: c.nom || '', heure: c.heure || '',
          hippo: c.hippodrome || r.hippodrome || '',
        })
      }
    }
  } catch { /* pas de prog local */ }
  if (!toutes.length) {
    try {
      const reunions = await chargerProgramme(date)
      reunionsProg = reunions.map((r) => ({ hippodrome: r.hippodrome || '', pays: r.pays || '', courses: r.courses || [] }))
      for (const r of reunions) for (const c of r.courses || []) toutes.push({ ...c, hippo: r.hippodrome })
    } catch (e) { console.error('  programme : ' + e.message); return { date, ok: 0, ko: 0 } }
  }

  console.log(`  programme : ${toutes.length} courses`)

  // Sauvegarder le programme (tel quel — réécrit avec distances à la fin)
  ecrire(`reu/prog-${date}.json`, { date, reunions: reunionsProg, collecteLe: new Date().toISOString() })

  let ok = 0, ko = 0
  for (const c of toutes) {
    const rNum = Number(String(c.reunion).replace(/\D/g, ''))
    const cNum = Number(String(c.code).replace(/\D/g, ''))
    const pays = c.pays || 'FRANCE'
    const cle = `${date}_R${rNum}_C${cNum}_${String(pays).replace(/\s+/g, '')}`

    console.log(`  ${cle} ${(c.nom || '').slice(0, 40)}...`)
    let obj = null

    // 1. Détail depuis Equidia (source principale)
    try {
      const urlDetail = `${EQ}/courses/${date}/R${rNum}/C${cNum}`
      const htmlDetail = await fetchEquidia(urlDetail)
      if (htmlDetail) {
        const data = extraireDetailEquidia(htmlDetail, date, rNum, cNum)
        if (data) {
          obj = parserDetailEquidia(data, date, rNum, cNum, pays)
        }
      }
    } catch (e) { /* on continue */ }

    // 2. Fallback : pro.casacourses.com (si Equidia échoue)
    if (!obj) {
      try {
        const r = await fetch(`https://pro.casacourses.com/api/programme?date=${date}`, { headers: { Accept: 'application/json' } })
        const j = await r.json()
        const m = (j.meetings || []).find((x) => Number(String(x.reunion_code || '').replace(/\D/g, '')) === rNum)
        const rc = m && (m.races || []).find((x) => Number(String(x.code || '').replace(/\D/g, '')) === cNum)
        if (rc && rc.id) {
          const det = await fetch(`https://pro.casacourses.com/api/race/${rc.id}`, { headers: { Accept: 'application/json' } }).then((x) => x.json())
          const partants = (det.runners || []).filter((r2) => r2.number).map((r2) => ({
            num: r2.number,
            cheval: r2.name || '', nom: r2.name || '',
            poids: r2.weight ?? null,
            driver: r2.jockey || '', jockey: r2.jockey || '',
            entraineur: r2.trainer || '', valeur: r2.value ?? null,
            musique: r2.musique || '', place: r2.finish ?? null,
          }))
          if (partants.length) {
            obj = {
              v: 2, pv: 4, source: 'pro.casacourses.com (fallback)',
              race: { numOrdre: cNum, nom: rc.name || '', distance: rc.distance || null, type: rc.type || '', date, nbPartants: partants.length },
              meeting: { num: rNum, hippodrome: String(m.track || m.label || ''), pays: String(m.country || pays).toUpperCase() },
              participants: partants,
              arrivee: (rc.finish_order || []).map(Number).filter(Number.isFinite),
              collecteLe: new Date().toISOString(),
            }
          }
        }
      } catch (e) { /* fallback échoué */ }
    }

    // 3. Fallback Maghreb : e-sorec.ma
    if (!obj && /^(MA|MAR|MAROC)$/i.test(pays)) {
      try {
        const prog = await fetch(`https://e-sorec.ma/api/meetings?date=${date}`, { headers: { Accept: 'application/json' } }).then((x) => x.json())
        const ev = (prog?.content?.events || []).find((x) => Number(String(x.code || '').replace(/\D/g, '')) === rNum)
        const rc = ev && (ev.races || []).find((x) => Number(String(x.code || '').replace(/\D/g, '')) === cNum)
        if (rc?.id) {
          const det = await fetch(`https://e-sorec.ma/api/races/${rc.id}`, { headers: { Accept: 'application/json' } }).then((x) => x.json())
          const ct = det?.content || {}
          const partants = (ct.runners || []).filter((r2) => r2.startnr).map((r2) => ({
            num: r2.startnr,
            cheval: String(r2.horse?.name || '').replace(/\s*\([^)]*\)\s*$/, ''),
            nom: String(r2.horse?.name || '').replace(/\s*\([^)]*\)\s*$/, ''),
            poids: r2.weight ?? null,
            driver: r2.rider?.name || '',
            jockey: r2.rider?.name || '',
            entraineur: r2.horse?.trainer || '',
            valeur: null,
            sexe: r2.horse?.gender || '',
            age: r2.horse?.age ?? null,
            couleur: r2.horse?.colour || '',
            proprietaire: r2.horse?.owner || '',
            cote: r2.odd ?? null,
            coteRef: r2.startodd ?? null,
            depart: r2.startbox ?? null,
            def: r2.horseshoe ?? r2.blinkers ?? null,
            silk: r2.jockeycolorfile ?? r2.jockeycolour ?? null,
            dernierPassage: r2.shortperformance ?? null,
            gains: r2.horse?.gains ?? null,
            musique: (r2.horse?.forms || []).map((f) => `${f.pos || ''}${f.running || ''}`).join(' ') || '',
            place: r2.finishorder || null,
          }))
          if (partants.length) {
            obj = {
              v: 2, pv: 4, source: 'e-sorec (fallback Maghreb)',
              race: { numOrdre: cNum, nom: ct.name || rc.name || '', distance: ct.distance || null, type: ct.type || '', date, nbPartants: partants.length },
              meeting: { num: rNum, hippodrome: String(ev.track || '').replace(/\s*\([^)]*\)\s*$/, ''), pays: String(ev.country || pays).trim().toUpperCase() },
              participants: partants,
              arrivee: (ct.runners || []).filter((r2) => r2.finishorder).sort((a, b) => a.finishorder - b.finishorder).map((r2) => r2.startnr),
              collecteLe: new Date().toISOString(),
            }
          }
        }
      } catch (e) { /* dernier fallback échoué */ }
    }

    // Fusion avec l'archive existante : on ne perd JAMAIS une coteRef
    // ni une arrivée déjà lues. Base = Equidia frais (musique correcte),
    // on remplit les TROUS scalaires depuis l'ancien (valeur/poids/corde…).
    // Seule la musique reste toujours celle d'Equidia (l'ancienne reu.php
    // était corrompue — cas LA BARAKA, 13/10/2026).
    if (obj && obj.participants?.length) {
      try {
        const fOld = lire('reu/' + nomFichierCourse(date, rNum, cNum, pays))
        if (fOld) {
          const old = JSON.parse(fOld)
          const oldParts = new Map((old.participants || []).map((p) => [p.num, p]))
          for (const p of obj.participants) {
            const o = oldParts.get(p.num)
            if (!o) continue
            if ((p.coteRef == null || p.coteRef <= 0) && o.coteRef > 0) { p.coteRef = o.coteRef; p.cote = o.cote ?? o.coteRef }
            if ((p.cote_pmu == null || p.cote_pmu <= 0) && o.cote_pmu > 0) p.cote_pmu = o.cote_pmu
            for (const k of ['cheval', 'nom', 'driver', 'jockey', 'entraineur', 'valeur', 'poids', 'corde', 'gains', 'age', 'sexe', 'proprietaire', 'def']) {
              if ((p[k] == null || p[k] === '') && o[k] != null && o[k] !== '') p[k] = o[k]
            }
          }
          if ((!obj.arrivee || !obj.arrivee.length) && old.arrivee?.length) obj.arrivee = old.arrivee
        }
      } catch { /* fusion impossible : on garde le frais */ }
      obj.collecteLe = new Date().toISOString()
      /* ⚠ Reconstruit APRÈS la course : noms/image des partants OK, mais les
         cotes et les musiques sont celles d'après (l'arrivée est connue).
         Un drapeau pour que personne ne prenne la « sélection » recalculée
         sur ces fichiers pour une prédiction. */
      if (date < new Date().toISOString().slice(0, 10) || (obj.arrivee && obj.arrivee.length)) {
        obj.collecteApresCourse = true
      }
      ecrire('reu/' + nomFichierCourse(date, rNum, cNum, pays), obj)
      ok++
      process.stdout.write(`  ✓ R${rNum}-C${cNum} ${(c.nom || '').slice(0, 36).padEnd(38)} ${obj.participants.length}p\r`)
    } else {
      ko++
      console.log(`\n  ✗ R${rNum}-C${cNum} ${(c.nom || '').slice(0, 30)} : aucune source (Equidia + fallbacks)`.slice(0, 130))
    }
    await pause(1200)
  }
  console.log(`\n  ${ok} courses archivées, ${ko} échecs (${((Date.now() - t0) / 1000).toFixed(0)} s)`)

  // Réécrire le programme avec distances/partants
  try {
    const avecDistances = (reunionsProg || []).map((r) => ({
      hippodrome: r.hippodrome || '',
      pays: r.pays || 'FRANCE',
      courses: (r.courses || []).map((c) => {
        const rN = Number(String(c.reunion).replace(/\D/g, ''))
        const cN = Number(String(c.code).replace(/\D/g, ''))
        const py = c.pays || r.pays || 'FRANCE'
        const cle = nomFichierCourse(date, rN, cN, py)
        const f = lire('reu/' + cle)
        if (!f) return { ...c, distance: null, partants: null, type: '' }
        try {
          const j = JSON.parse(f)
          return {
            ...c,
            dist: j?.race?.distance ?? null,
            partants: j?.race?.nbPartants ?? (j?.participants?.length || null),
            type: j?.race?.type ?? null,
            hippodrome: j?.meeting?.hippodrome || r.hippodrome || c.hippodrome,
            source: j?.source || null,
            arrivee: (j?.arrivee || []).join('-') || null,
          }
        } catch { return { ...c, distance: null, partants: null, type: '' } }
      }),
    }))
    ecrire(`reu/prog-${date}.json`, { date, reunions: avecDistances, collecteLe: new Date().toISOString() })
    console.log('  programme réécrit avec distances/partants')
  } catch (e) { console.error('  erreur réécriture programme:', e.message) }

  return { date, ok, ko }
}

const jours = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
if (!jours.length) {
  console.error('usage : node tools/archive-reu.mjs AAAA-MM-JJ [AAAA-MM-JJ …]')
  process.exit(1)
}
for (const j of jours) await collecterJour(j)
console.log('\nTERMINE — fichiers dans data/reu/ (+ public/data/reu/)')