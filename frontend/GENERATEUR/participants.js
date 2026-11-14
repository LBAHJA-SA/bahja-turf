/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/participants.js — نفس مهمة `chargerCourseCC` لكن
 *  لا يستورد من src/lib/quinte.js — مستقل بذاته داخل هذا المجلد.
 *
 *  كان لا بد منه بدلاً من الاعتماد على الأرشيف : الأرشيف لا يحتوي
 *  المتباريين يوم السباق نفسه (يُضافون فقط بعد الانتهاء).
 * ════════════════════════════════════════════════════════════════════════ */

const CC = 'https://pro.casacourses.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'

const norm = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '')
const MA = new Set(['KHEMISSET', 'CASABLANCA', 'MARRAKECH', 'MEKNES', 'RABAT', 'ELJADIDA', 'SETTAT', 'KHOURIBGA', 'BENGUERIR', 'SAFI', 'KENITRA', 'FES', 'OUJDA', 'TANGER', 'AGADIR'])
const isMarocain = (m) => MA.has(norm((m && m.track) || ''))

async function ccJSON(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json,*/*' } })
  if (!r.ok) throw new Error(`casacourses HTTP ${r.status}`)
  return r.json()
}

/** PMU : la course qui porte le pari QUINTE_PLUS EST le Quinté (France uniquement) */
async function pmuQuinte(date) {
  const parts = String(date || '').split('-')
  if (parts.length !== 3) return null
  const jjmm = `${parts[2]}${parts[1]}${parts[0]}`
  try {
    const r = await fetch('/api/pmu/rest/client/61/programme/' + jjmm)
    if (!r.ok) return null
    const j = await r.json()
    for (const re of (j && j.programme && j.programme.reunions) || []) {
      const p = (re.pays && (re.pays.code || re.pays.libelle)) || ''
      if (!/^FR/i.test(String(p))) continue
      for (const c of re.courses || []) {
        const paris = (c.paris || []).map((x) => x.codePari || x.typePari || '')
        if (paris.includes('QUINTE_PLUS') || paris.includes('QUINTE')) {
          return {
            r: Number(re.numOfficiel) || 0,
            c: Number(c.numOrdre) || 0,
            hippo: (re.hippodrome && (re.hippodrome.libelleCourt || re.hippodrome.libelle)) || '',
          }
        }
      }
    }
  } catch { return null }
  return null
}

/**
 * يُرجع { runners: number[] } — المتباريين الـ18 بما فيها الغائبين عن الصحافة.
 * الترتيب: ① PMU يحدد السباق → محدد بلا شك · ② تغطية السانس (غير المباشر) للأيام المارَّة.
 */
export async function chargerParticipants(date, synthese = []) {
  try {
    const ms = await ccJSON(`${CC}/api/programme?date=${date}`)
    const meetings = ms.meetings || []
    if (!meetings.length) return null

    /* ① PMU prime — بعد السباق المباشر، متباريوه لا يزالون موجودين في PMU */
    const pmu = await pmuQuinte(date)
    let target = null
    if (pmu) {
      const cible = norm(pmu.hippo)
      outer: for (const m of meetings) {
        for (const r of m.races || []) {
          const parPMU = Number(r.pmu_reunion) === pmu.r && Number(r.pmu_course) === pmu.c
          const parCode = String(m.reunion_code || '') === 'R' + pmu.r && String(r.code || '') === 'C' + pmu.c
          if (parPMU || parCode) {
            /* المطابقة بالجزيرة تحديدًا (لتفادي أن يختار مريكة الاجتماعين) */
            const hippo = norm((m && m.track) || '')
            const hippoHit = !cible || !hippo || hippo === cible || hippo.includes(cible) || cible.includes(hippo)
            if (hippoHit || parPMU || parCode) { target = { m, r }; break outer }
          }
        }
      }
    }
    /* ② تغطية السانس — إذا كانت الصحافة قد نشرت حصتها وبلا دليل PMU مطابق */
    if (!target && synthese.length) {
      const synSet = new Set(synthese.filter(Number.isFinite))
      let best = null
      for (const m of meetings) {
        if (isMarocain(m)) continue
        const country = String(m.country || '').toUpperCase()
        if (country && country !== 'FR') continue
        for (const r of m.races || []) {
          if ((r.starters || 0) < 10) continue
          let cover = 0
          for (const n of synSet) {
            if ((r.runners || []).some((x) => Number(x.number) === Number(n))) cover++
          }
          if (!best || cover > best.cover) best = { m, r, cover }
        }
      }
      if (best && best.cover > 0) target = best
    }
    if (!target) return null
    const d = await ccJSON(`${CC}/api/race/${target.r.id}?date=${date}`)
    const runners = (d.runners || [])
      .map((x) => Number(x.number))
      .filter((n) => Number.isFinite(n) && n > 0)
    /* المستبعدون (مرفوعة الصفة) لا يُحسبون */
    const exclus = (d.runners || [])
      .filter((x) => x.status === false)
      .map((x) => Number(x.number))
      .filter((n) => Number.isFinite(n) && n > 0)
    return { runners, exclus, pmu }
  } catch {
    return null
  }
}
