/* ═══════════════════════════════════════════════════════════════════════════
 * tools/completer-fiche-pmu.mjs — la fiche de course manquante, prise au PMU.
 *
 * ⚠ Cas mesuré (11/11/2026) : `tools/archive-reu.mjs` n'arrive pas à écrire la
 *   fiche de certaines courses (le 05/11 : casacourses n'a plus rien pour
 *   cette date — `meetings: 0` — et la source du collecteur ne répond pas).
 *   Sans fiche, les pages `/quinte` et `/r/:slug` n'affichent ni le nom ni le
 *   jockey des arrivants : « — » (§7 : on n'invente rien, mais on va chercher
 *   ailleurs).
 *
 * Ce que fait l'outil : pour chaque date archivée SANS fiche, il prend les
 * partants et l'arrivée du PMU (`/programme/{JJMMAAAA}/R{n}/C{m}/participants`
 * + `ordreArrivee`) et écrit une fiche de MÊME FORME que celles du collecteur.
 *   → `/data/reu/{cle}_{pays}.json`
 *
 * La source est écrite DANS le fichier (`source: "PMU"`) : rien n'est maquillé.
 *
 * Usage :  node tools\completer-fiche-pmu.mjs [YYYY-MM-DD ...]
 * ══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs'
import path from 'node:path'

const PMU = 'https://online.turfinfo.api.pmu.fr'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const REU = path.join('public', 'data', 'reu')
const F_SYN = path.join('data', 'synthese.json')

const jjmm = (d) => `${d.slice(8, 10)}${d.slice(5, 7)}${d.slice(0, 4)}`
const log = (...a) => console.log(...a)

async function getJSON(u) {
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

/** La course du Quinté d'une date, d'après le PMU. */
async function quintePMU(date) {
  const j = await getJSON(`${PMU}/rest/client/61/programme/${jjmm(date)}`)
  for (const re of (j?.programme?.reunions) || []) {
    const pays = (re.pays && (re.pays.code || re.pays.libelle)) || ''
    if (!/^FR/i.test(String(pays))) continue
    for (const c of re.courses || []) {
      const paris = (c.paris || []).map((p) => p.codePari || p.typePari || '')
      if (!paris.includes('QUINTE_PLUS') && !paris.includes('QUINTE')) continue
      const ordre = (c.ordreArrivee || [])
        .map((o) => (Array.isArray(o) ? o[0] : (Array.isArray(o.value) ? o.value[0] : o.value)))
        .map(Number).filter(Number.isFinite)
      return {
        r: Number(re.numOfficiel), c: Number(c.numOrdre),
        hippo: (re.hippodrome && (re.hippodrome.libelleCourt || re.hippodrome.libelle)) || '',
        nom: c.libelle || '', distance: Number(c.distance) || null,
        discipline: c.discipline || '', partants: Number(c.nombreDeclaresPartants) || 0,
        arrivee: ordre,
      }
    }
  }
  return null
}

const db = JSON.parse(fs.readFileSync(F_SYN, 'utf8'))
const dates = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
const Eq = /^\d{4}-\d{2}-\d{2}_R\d+_C\d+$/
let ecrits = 0

for (const date of (dates.length ? dates : Object.keys(db).sort())) {
  const rec = db[date]
  if (!rec) continue
  const cle = Eq.test(String(rec.courseId || '')) ? rec.courseId : (Eq.test(String(rec.cle || '')) ? rec.cle : null)
  if (!cle) { log(`${date}  — pas de clé`); continue }

  /* déjà une fiche ? */
  let existe = null
  for (const p of ['FR', 'FRANCE', 'MA', 'MAROC', 'BE', 'GB', 'CH']) {
    const f = path.join(REU, `${cle}_${p}.json`)
    if (fs.existsSync(f)) { existe = p; break }
  }
  if (existe) { log(`✓ ${date}  ${cle}  fiche déjà là (_${existe})`); continue }

  let q = null
  try { q = await quintePMU(date) } catch (e) { log(`✗ ${date}  PMU KO : ${e.message}`); continue }
  if (!q) { log(`✗ ${date}  — pas de QUINTE_PLUS au PMU`); continue }
  if (Number(q.r) !== Number(cle.match(/_R(\d+)_/)[1]) || Number(q.c) !== Number(cle.match(/_C(\d+)$/)[1])) {
    log(`✗ ${date}  la fiche ${cle} n'est pas la course du PMU (R${q.r} C${q.c}) — on ne touche à rien`)
    continue
  }

  let ps = []
  try {
    const j = await getJSON(`${PMU}/rest/client/61/programme/${jjmm(date)}/R${q.r}/C${q.c}/participants`)
    ps = j.participants || []
  } catch (e) { log(`✗ ${date}  partants PMU KO : ${e.message}`); continue }
  if (!ps.length) { log(`✗ ${date}  — aucun partant`); continue }

  const participants = ps.map((p) => ({
    num: Number(p.numPmu),
    cheval: p.nom || '',
    nom: p.nom || '',
    jockey: p.driver || '',
    driver: p.driver || '',
    entraineur: p.entraineur || '',
    sexe: /FEM/i.test(String(p.sexe)) ? 'F' : 'M',
    age: p.age ?? null,
    poids: null,
    cote: null,
    place: p.ordreArrivee || null,
    depart: Number(p.numPmu),
  })).filter((p) => Number.isFinite(p.num) && p.num > 0)

  const fiche = {
    v: 2, pv: 4,
    source: 'PMU',
    race: {
      numOrdre: q.c, nom: q.nom, distance: q.distance, type: q.discipline,
      date, nbPartants: q.partants,
    },
    meeting: { hippodrome: q.hippo, pays: 'FRANCE' },
    participants,
    arrivee: q.arrivee,
    collecteLe: new Date().toISOString(),
    collecteApresCourse: true,
  }
  const fichier = path.join(REU, `${cle}_FRANCE.json`)
  fs.writeFileSync(fichier, JSON.stringify(fiche, null, 2), 'utf8')
  ecrits++
  log(`→ ${date}  ${cle}_FRANCE.json  ${participants.length} partants · ${q.nom} ${q.distance}m · arrivée ${q.arrivee.slice(0, 5).join('-')}`)
}

log(`\n${ecrits} fiche(s) écrite(s) — dossier ${REU}`)
