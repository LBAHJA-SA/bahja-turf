/**
 * pmucote.mjs — la « cote probable » PMU, en libre, sans compte.
 *
 * SOURCE (endpoint officiel, trouvé dans le bundle du site, CORS ouvert) :
 *   https://online.turfinfo.api.pmu.fr/rest/client/61/programme/{JJMMAAAA}
 *   https://online.turfinfo.api.pmu.fr/rest/client/61/programme/{JJMMAAAA}/R{n}/C{i}/participants
 *   https://online.turfinfo.api.pmu.fr/rest/client/61/programme/{JJMMAAAA}/R{n}/C{i}/pronostics?commentaire=true
 *
 * ⚠ CE N'EST PAS LE MARCHÉ. C'est la « cote probable » de PMU (celle qui
 * sert à plafonner le Quinté) : une échelle synthétique, pas les cotes du book.
 * Elle suit le marché (ρ ≈ 0.64 → 0.77 sur les 4 Quintés d'octobre) mais
 * l'arrondit et l'écrase. C'est un SIGNAL, pas une vérité — d'où la mesure.
 *
 *   node tools\pmucote.mjs           → complète data/pmu.json
 */
import fs from 'node:fs'

const H = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  Accept: 'application/json',
  Referer: 'https://www.pmu.fr/',
}
const B = 'https://online.turfinfo.api.pmu.fr/rest/client/61'
const jjmm = (d) => d.slice(8, 10) + d.slice(5, 7) + d.slice(0, 4)

/** « 5/1 » → 6.0   ·   « 12/5 » → 3.4   ·   « 4.2 » → 4.2 */
export function versDecimal(s) {
  const t = String(s).trim()
  const m = t.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (m) {
    const n = Number(m[2])
    if (!n) return null
    return Math.round((1 + Number(m[1]) / n) * 100) / 100
  }
  const v = Number(t)
  return Number.isFinite(v) && v > 0 ? v : null
}

async function getJson(u, essais = 3) {
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetch(u, { headers: H })
      if (r.ok) return await r.json()
    } catch (e) { /* on réessaie */ }
    await new Promise((r) => setTimeout(r, 900 * (i + 1)))
  }
  return null
}

/** toutes les courses Quinté FR d'une date */
export async function quintesDuJour(date) {
  const prog = await getJson(`${B}/programme/${jjmm(date)}`)
  if (!prog) return []
  const out = []
  for (const reu of prog.programme?.reunions || []) {
    if ((reu.pays?.code || '') !== 'FRA') continue
    for (const c of reu.courses || []) {
      if (!(c.paris || []).some((p) => /QUINTE/i.test(p.typePari))) continue
      out.push({
        num: c.numOrdre, reunion: reu.numOfficiel,
        hippodrome: reu.hippodrome?.code, libelle: c.libelle,
        distance: c.distance, discipline: c.discipline,
        partants: c.nombreDeclaresPartants,
        heure: new Date(c.heureDepart).toISOString(),
      })
    }
  }
  return out
}

/** les cotes probables + la liste exacte des partants d'une course */
export async function cotesCourse(date, reunion, course) {
  const pa = await getJson(`${B}/programme/${jjmm(date)}/R${reunion}/C${course}/participants`)
  const pr = await getJson(`${B}/programme/${jjmm(date)}/R${reunion}/C${course}/pronostics?commentaire=true`)
  const partants = (pa?.participants || []).map((x) => ({ num: x.numPmu, nom: x.nom }))
  const sel = pr?.pronostics?.prono_pmu_fr?.selection || []
  const cotes = sel.map((s) => ({
    num: s.num_partant,
    rang: s.rang,
    brut: s.cote_prob,
    cote: versDecimal(s.cote_prob),
  })).filter((c) => c.cote != null)
  return { partants, cotes }
}

/* ── le job : complète data/pmu.json ── */
const db = fs.existsSync('data/pmu.json') ? JSON.parse(fs.readFileSync('data/pmu.json', 'utf8')) : {}
const mesure = JSON.parse(fs.readFileSync('data/mesure.json', 'utf8'))
const dates = [...new Set([...Object.keys(mesure), ...process.argv.slice(2)])].sort()

for (const d of dates) {
  const qs = await quintesDuJour(d)
  if (!qs.length) { console.log(`${d}  aucune course Quinté FR`); continue }
  db[d] = { date: d, quintes: [] }
  for (const q of qs) {
    const { partants, cotes } = await cotesCourse(d, q.reunion, q.num)
    db[d].quintes.push({ ...q, partants, cotes })
    console.log(`${d}  R${q.reunion}C${q.num}  ${q.hippodrome}  ${String(q.distance).padStart(5)}m ${String(q.discipline).padEnd(8)} ${q.libelle.slice(0, 32).padEnd(34)} ${partants.length} partants · ${cotes.length} cotes probables`)
  }
  fs.writeFileSync('data/pmu.json', JSON.stringify(db, null, 1))
}
console.log(`\n  → data/pmu.json : ${dates.length} dates`)