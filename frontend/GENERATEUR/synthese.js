/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/synthese.js — مولّد باحجا تورف : قراءة السانس
 *
 *  ⭐ 13/11/2026 — هذه الصفحة مستقلة بذاتها تمامًا :
 *  لا تستورد أي شيء من `src/lib/quinte.js` ولا من أي صفحة أخرى.
 *  تقرأ السانس مباشرة من موقع الصحافة (pronostics-turf.info) عبر
 *  البروكسي `/api/pt` — وفي حال تعذّر ذلك، تقولها ولا تُختلق شيئًا.
 * ════════════════════════════════════════════════════════════════════════ */

const PT_BASE = '/api/pt'

/** التاريخ المحلي بصيغة AAAA-MM-JJ (نفس حساب الجهاز). */
export function aujourdhui() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** « 2026-10-04 » ou « 04-10 » → « 04-10 » (للمقارنة بين تاريخين). */
function enJJMM(x) {
  const t = String(x).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(8, 10) + '-' + t.slice(5, 7)
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})/)
  return m ? m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : t.slice(0, 5)
}

/** هل التاريخ المعروض على الموقع هو نفسه المطلوب؟ */
export function dateCorrespondALaDate(datePage, demandee) {
  if (!datePage || !demandee) return true
  return enJJMM(datePage) === enJJMM(demandee)
}

const MOIS_FR = ['janvier', 'février', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'aout', 'septembre', 'octobre', 'novembre', 'décembre', 'decembre']

/** التاريخ الذي يعرضه الموقع داخل صفحته (مثل « le Vendredi 13 Novembre 2026 »). */
function dateDansPage(html) {
  const sansAccent = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const CANON = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const num = {}
  CANON.forEach((m, i) => { num[sansAccent(m)] = i + 1 })
  const variantes = [...new Set(MOIS_FR.map(sansAccent))]
  const pat = new RegExp('\\b(\\d{1,2})\\s+(' + variantes.join('|') + ')\\b', 'gi')
  const h = String(html)
  const annee = (h.match(/\b(20\d{2})\b/) || [])[1] || String(new Date().getFullYear())
  const jjmm = (j, m) => String(j).padStart(2, '0') + '-' + String(m).padStart(2, '0')
  for (const m of h.matchAll(pat)) {
    const j = parseInt(m[1], 10)
    const mois = num[sansAccent(m[2])]
    if (j >= 1 && j <= 31 && mois) return jjmm(j, mois) + '-' + annee
  }
  const iso = h.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  return iso ? iso[3] + '-' + iso[2] + '-' + iso[1] : ''
}

/**
 * تقرأ « la Récapitulative » : { synthese[], fois[], arrivee, datePage }.
 * مواضع الصحافة تُقرأ من <img alt="Pronostic N"> — لا من ترتيب الأسطر.
 */
export function parseRecap(html) {
  const i = String(html).toUpperCase().indexOf('RECAPITULATIVE')
  if (i < 0) return null
  const seg = String(html).slice(i, i + 9000)
  const brutes = []
  for (const m of seg.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cellules = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((x) => x[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
    if (cellules.length < 3) continue
    const alt = (m[1].match(/<img[^>]*alt=["']?([^"'>]+)["']?/i) || [])[1] || ''
    const position = parseInt((alt.match(/(\d+)/) || [])[1], 10)
    const num = Number(cellules[1])
    const fois = Number(cellules[2])
    if (!Number.isFinite(num)) continue
    brutes.push({ position: Number.isFinite(position) ? position : null, num, fois: Number.isFinite(fois) ? fois : null })
    if (brutes.length >= 20) break
  }
  if (!brutes.length) return null
  const avecPos = brutes.filter((x) => x.position != null)
  const trie = avecPos.length >= 2 && avecPos.length >= brutes.length - 1
  const rows = (trie ? avecPos.sort((a, b) => a.position - b.position) : brutes)
    .map((x) => ({ num: x.num, fois: x.fois }))
  const am = String(html).match(/R[ée]sultat\s+QUINTE[^:]*:\s*([\d\s\-–]{5,40})/i)
  return {
    synthese: rows.map((r) => r.num),
    fois: rows.map((r) => r.fois),
    arrivee: am ? am[1].trim() : null,
    datePage: dateDansPage(String(html)) || '',
  }
}

/** تقرأ السانس من موقع الصحافة — رمي للخطأ عند أي تعذّر (لا شيء مختلَق). */
export async function fetchRecap() {
  const r = await fetch(`${PT_BASE}/`, { headers: { Accept: 'text/html' } })
  if (!r.ok) throw new Error(`الموقع HTTP ${r.status}`)
  const p = parseRecap(await r.text())
  if (!p) throw new Error('السانس غير موجودة في الصفحة')
  return p
}

/** تسوية نوع السباق إلى مجموعة واحدة — الأرشيف يستخدم نصوصًا مختلطة. */
export function normDiscipline(d) {
  const s = String(d || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '')
  if (s.startsWith('ATT')) return 'ATTELÉ'
  if (s.startsWith('PLAT')) return 'PLAT'
  if (s.startsWith('HAI')) return 'HAIE'
  if (s.startsWith('STEEP')) return 'STEEPLE'
  if (s.startsWith('MON') || s === 'MONTE') return 'MONTÉ'
  return 'AUTRE'
}

/** تقرأ أرشيف السانس المشترك — تُعيد null عند تعذر قراءته. */
export async function fetchArchiveDb() {
  try {
    const r = await fetch('/data/synthese.json', { headers: { Accept: 'application/json' } })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

/** أحدث تاريخ في الأرشيف من نوع معين (نوع مُسوّى عبر normDiscipline) — يعود null إن لم يوجد. */
export async function latestDateAvecDiscipline(discipline) {
  const db = await fetchArchiveDb()
  if (!db) return null
  const dates = Object.entries(db)
    .filter(([, e]) => e && normDiscipline(e.discipline) === discipline && Array.isArray(e.synthese) && e.synthese.length)
    .map(([d]) => d)
    .sort()
  return dates.length ? dates[dates.length - 1] : null
}

/**
 * ⭐ احتياطي عند تعذّر الموقع (أو تاريخه ≠ المطلوب) : قراءة /data/synthese.json
 * — قراءة فقط للعرض، ولا يُكتب شيء، ولا يُستورد أي كود من صفحة Quinté.
 * تعيد null إن لم تكن هناك سانس محفوظة لهذا التاريخ.
 */
export async function fetchArchive(date) {
  try {
    const db = await fetchArchiveDb()
    const e = db && db[date]
    if (!e || !Array.isArray(e.synthese) || !e.synthese.length) return null
    return {
      synthese: e.synthese,
      runners: Array.isArray(e.runners) ? e.runners.filter((n) => Number.isFinite(n) && n > 0) : [],
      nbPartants: Number.isFinite(e.nbPartants) ? e.nbPartants : null,
      discipline: normDiscipline(e.discipline),
    }
  } catch {
    return null
  }
}
