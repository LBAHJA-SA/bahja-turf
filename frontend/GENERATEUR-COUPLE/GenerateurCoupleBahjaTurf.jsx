import { useEffect, useMemo, useState } from 'react'
import Entete from '../../src/Entete.jsx'

/* ──────────────────────────────────────────────────────────────
 *  frontend/GENERATEUR-COUPLE/GenerateurCoupleBahjaTurf.jsx
 *  GENERATEUR COUPLE BAHJA TURF
 *
 *  Page autonome (ses fichiers, pas d'import inter-pages — même
 *  règle que GENERATEUR QUINTE BAHJA TURF). Elle affiche :
 *    · LE PROGRAMME : toutes les réunions du jour, tous pays
 *      (PMU), filtrables par discipline, avec compte à rebours
 *      de la prochaine course.
 *    · LA TABLE : les partants de la course choisie, ordonnés
 *      PAR LE MARCHÉ (Equidia) — pas par la Synthèse de la presse.
 *    · GENERATEUR SYSTÈME : GAGNANT LOGIQUE / OUTSIDER et
 *      BASE COUPLE + BASE TRIO LOGIQUE / SPECULATIVE — champs
 *      volontairement VIDES tant que le moteur n'est pas acté
 *      avec l'utilisateur (discussion à venir).
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

const DISCIPLINES = ['TOUS', 'ATTELÉ', 'PLAT', 'HAIE', 'STEEPLE']

const normDiscipline = (d) => {
  const s = String(d || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  if (s.startsWith('ATTEL') || s.startsWith('MONT') || s.startsWith('TROT') || s.startsWith('AUC')) return 'ATTELÉ'
  if (s.startsWith('PLAT')) return 'PLAT'
  if (s.startsWith('HAI')) return 'HAIE'
  if (s.startsWith('STEEP')) return 'STEEPLE'
  return 'TOUS' // inconnue → affichée partout
}

const todayYMD = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* PMU fournit le programme complet du jour — toutes les réunions, tous pays. */
async function chargerProgramme(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''))
  if (!m) return []
  const jjmm = `${m[3]}${m[2]}${m[1]}`
  const r = await fetch('/api/pmu/rest/client/61/programme/' + jjmm)
  if (!r.ok) throw new Error('programme HTTP ' + r.status)
  const j = await r.json()
  return (j?.programme?.reunions || []).map((m0) => ({
    r: Number(m0.numOfficiel) || 0,
    hippodrome: m0.hippodrome?.libelleCourt || m0.hippodrome?.libelleLong || m0.hippodrome?.liblong || '—',
    paysCode: String(m0.pays?.code || '').toUpperCase(),
    pays: m0.pays?.libelle || '',
    courses: (m0.courses || []).map((c) => ({
      r: Number(m0.numOfficiel) || 0,
      c: Number(c.numOrdre) || 0,
      nom: c.libelle || '',
      discipline: normDiscipline(c.discipline),
      distance: Number(c.distance) || null,
      heure: Number(c.heureDepart) || null,
      partants: Number(c.nombreDeclaresPartants) || 0,
      prix: Number(c.montantPrix) || null,
    })),
  }))
}

/* Equidia → le marché de la course (page Angular, état collé en JSON). */
async function chargerMarche(ymd, r, c) {
  const html = await fetch(`/api/eq/courses/${ymd}/R${r}/C${c}`, { headers: { Accept: 'text/html' } }).then((x) => x.text())
  const m = html.match(/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  const state = JSON.parse(
    m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  )
  const ps = state[`courses/${ymd}/R${r}/C${c}/pari_simple`] || []
  return ps
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
}

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
  const [chargementMarche, setChargementMarche] = useState(false)
  const [maintenant, setMaintenant] = useState(Date.now())

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

  const totales = useMemo(() => reunions.reduce((a, m0) => a + m0.courses.length, 0), [reunions])

  const reunionsAffiches = useMemo(() => {
    if (discipline === 'TOUS') return reunions
    return reunions
      .map((m0) => ({ ...m0, courses: m0.courses.filter((c) => c.discipline === discipline) }))
      .filter((m0) => m0.courses.length > 0)
  }, [reunions, discipline])

  /* charge le marché de la course choisie */
  useEffect(() => {
    if (!course || !date) return undefined
    let vivant = true
    setChargementMarche(true); setMarche(null)
    chargerMarche(date, course.r, course.c)
      .then((v) => { if (vivant) setMarche(v) })
      .catch(() => { if (vivant) setMarche([]) })
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

              {/* GAGNANT LOGIQUE · GAGNANT OUTSIDER — label clair puis coin rond à droite */}
              {[{ txt: 'GAGNANT LOGIQUE' }, { txt: 'GAGNANT OUTSIDER' }].map(({ txt }) => (
                <div key={txt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 225 }}>
                  <span style={{ fontSize: 10, letterSpacing: '.12em', color: '#edeae6', fontWeight: 800 }}>{txt}</span>
                  <div style={{
                    width: 46, height: 44, display: 'grid', placeItems: 'center', borderRadius: 999,
                    border: '1.5px solid rgba(215,140,80,.6)',
                    background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.16), transparent 60%), linear-gradient(160deg, #6b4630 0%, #46301f 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3), 0 3px 8px rgba(0,0,0,.5)',
                    color: '#f3c887', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 17,
                  }}>?</div>
                </div>
              ))}

              {/* BASE COUPLE — خانتان فقط (1ER · 2ÈME) */}
              {['BASE COUPLE LOGIQUE', 'BASE COUPLE SPECULATIVE'].map((txt) => (
                <div key={txt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 225 }}>
                  <span style={{ flex: 1, fontSize: 10, letterSpacing: '.11em', color: '#edeae6', fontWeight: 800, lineHeight: 1.35 }}>{txt}</span>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 46px)', gap: 4, fontSize: 7.5, fontWeight: 800, letterSpacing: '.09em', color: THEME.muted }}>
                      <div style={{ textAlign: 'center' }}>1ER</div>
                      <div style={{ textAlign: 'center' }}>2ÈME</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 46px)', gap: 4 }}>
                      {[0, 1].map((pos) => (
                        <div key={pos} style={{
                          width: 46, height: 44, display: 'grid', placeItems: 'center',
                          borderRadius: 14, border: '1.5px solid rgba(215,140,80,.6)',
                          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.16), transparent 60%), linear-gradient(160deg, #6b4630 0%, #46301f 100%)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), 0 3px 8px rgba(0,0,0,.5)',
                          color: '#f3c887', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 16,
                        }}>?</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* BASE TRIO — ثلاث خانات (1ER · 2ÈME · 3ÈME) */}
              {['BASE TRIO LOGIQUE', 'BASE TRIO SPECULATIVE'].map((txt) => (
                <div key={txt} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 225 }}>
                  <span style={{ flex: 1, fontSize: 10, letterSpacing: '.11em', color: '#edeae6', fontWeight: 800, lineHeight: 1.35 }}>{txt}</span>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 46px)', gap: 4, fontSize: 7.5, fontWeight: 800, letterSpacing: '.09em', color: THEME.muted }}>
                      <div style={{ textAlign: 'center' }}>1ER</div>
                      <div style={{ textAlign: 'center' }}>2ÈME</div>
                      <div style={{ textAlign: 'center' }}>3ÈME</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 46px)', gap: 4 }}>
                      {[0, 1, 2].map((pos) => (
                        <div key={pos} style={{
                          width: 46, height: 44, display: 'grid', placeItems: 'center',
                          borderRadius: 14, border: '1.5px solid rgba(215,140,80,.6)',
                          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.16), transparent 60%), linear-gradient(160deg, #6b4630 0%, #46301f 100%)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), 0 3px 8px rgba(0,0,0,.5)',
                          color: '#f3c887', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 16,
                        }}>?</div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* زر GENERER — معطّل منتظرًا نقاس المحرك */}
              <button type="button" disabled title="Les règles du moteur sont à discuter" style={{
                marginTop: 2, justifySelf: 'center', padding: '10px 24px', borderRadius: 999,
                cursor: 'default', border: '1px solid rgba(215,140,80,.35)',
                color: 'rgba(243,200,135,.5)', fontFamily: 'Inter, system-ui, sans-serif',
                fontWeight: 900, letterSpacing: '.22em', fontSize: 13, textIndent: '.22em',
                background: 'rgba(215,140,80,.05)',
              }}>GENERER</button>
              <span style={{ textAlign: 'center', fontSize: 10, color: THEME.muted, maxWidth: 200 }}>
                المحرك يناقش قبل التفعيل — الحقول تبقى فارغة.
              </span>
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
                {reunions.length} réunions · {totales} courses
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
                          key={c.c} type="button" onClick={() => setCourse({ r: m0.r, c: c.c })}
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
