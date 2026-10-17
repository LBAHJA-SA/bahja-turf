import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  programmeDuJour, partantsDeCourse, carriereCheval, identiteCheval, statsCheval, terrainSimple,
} from '../../backend/ANALYSE/parisTurf.js'

/* ═══════════════════════════════════════════════════════════════════════════
 * frontend/ANALYSE/Analyse.jsx — TOUTES LES COURSES, TOUS LES CHEVAUX.
 *
 * ① LE PROGRAMME DU JOUR   toutes les réunions (FR et étranger), toutes les
 *                          courses : heure, discipline, distance, terrain,
 *                          partants, arrivée, conditions.
 * ② LES PARTANTS D'UNE COURSE
 *                          numéro, cheval, sexe/âge, poids, VH, corde,
 *                          artifices (œillères / attache-langue / fer),
 *                          jockey, entraîneur, cote, rang.
 * ③ LA CARRIÈRE D'UN CHEVAL — l'écran de référence, celui de l'app :
 *      en-tête  « par <père> et <mère> », entraîneur, jockey, SA · POIDS · VH,
 *               la musique, « N j » depuis la dernière course, les artifices
 *      filtres  hippodrome · ≈distance · terrain · discipline · type · œillères
 *      totaux   courses · victoires · places (sur la liste filtrée)
 *      cartes   date (jour/mois/année) · hippodrome · discipline · distance ·
 *               terrain · type · jockey · poids · VH · fer, la place « 3e/14 »
 *               et le commentaire de la course.
 *
 * ⚠ AUCUNE donnée n'est inventée : ce qui manque s'affiche « — ».
 * ⚠ LA SOURCE n'est jamais nommée à l'écran.
 * ⚠ Chargements PARESSEUX : 1 appel pour le programme, 1 par course ouverte,
 *   3 par cheval ouvert. Les 148 courses du jour ne sont jamais tirées d'un coup.
 * ═══════════════════════════════════════════════════════════════════════════ */

const SK = {
  accent: '#0e7490', accentSombre: '#155e75', accentClair: '#cffafe',
  entete: 'linear-gradient(120deg,#083344 0%,#0e7490 55%,#22d3ee 100%)',
  fiche: 'linear-gradient(120deg,#0f172a 0%,#155e75 70%,#0e7490 100%)',
  fond: 'linear-gradient(180deg,#ecfeff 0%,#f8fafc 60%,#ffffff 100%)',
  bord: '#67e8f9', carte: '#fff', ligne: '#e2e8f0', alt: '#f8fafc',
  texte: '#0f172a', doux: '#475569', muet: '#94a3b8',
  police: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: 'ui-monospace, Consolas, monospace',
}
const VERT = '#15803d', ROUGE = '#b91c1c', AMBRE = '#b45309'

const p2 = (x) => String(x).padStart(2, '0')

/** Aujourd'hui à PARIS (pas à l'heure de la machine). */
function jourParis() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
const H = (iso) => (iso ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—')
const D2 = (iso) => (iso ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso)) : '—')
const DLc = (d) => {
  if (!d) return '—'
  const t = new Date(d + 'T12:00:00')
  return isNaN(t) ? d : new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(t)
}

/** Pour la pastille de date des cartes : { j: '27', m: 'sept', a: '2025' }. */
function dateBloc(iso) {
  if (!iso) return { j: '—', m: '', a: '' }
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(new Date(iso))
  const g = (t) => (parts.find((x) => x.type === t) || {}).value || ''
  return { j: g('day'), m: g('month').replace('.', ''), a: g('year') }
}

/** 260.07 s → « 4'20''07 ». */
function chrono(s) {
  if (s == null || !Number.isFinite(Number(s))) return '—'
  const v = Number(s)
  const m = Math.floor(v / 60)
  const r = v - m * 60
  const sec = Math.floor(r)
  const cc = Math.round((r - sec) * 100)
  return `${m}'${p2(sec)}''${p2(cc)}`
}
const gains = (x) => (x == null ? '—' : new Intl.NumberFormat('fr-FR').format(x) + ' €')
const rang = (x) => (x == null ? '—' : x === 1 ? '1er' : `${x}e`)

function arriveeNums(a) {
  if (!a || !Array.isArray(a)) return []
  return a.map((x) => (typeof x === 'number' ? x : x && (x.number ?? x.saddle ?? x.numPmu ?? x.horseNumber))).filter((x) => x != null)
}

const jourDe = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))

/** Combien de jours depuis la dernière course JOUÉE — celle du jour ne compte pas. */
function joursDepuis(carriere, quand) {
  const refIso = quand || new Date().toISOString()
  const refJour = jourDe(refIso)
  const courue = carriere.find((l) => l.rang != null && l.date && jourDe(l.date) < refJour)
  if (!courue) return null
  const j = Math.round((new Date(refIso).getTime() - new Date(courue.date).getTime()) / 86400000)
  return Number.isFinite(j) && j >= 0 ? j : null
}

/* ═══════════════════════════════════ LA PAGE ═══════════════════════════════ */

export default function Analyse() {
  const [date, setDate] = useState(jourParis())
  const [prog, setProg] = useState([])
  const [busyProg, setBusyProg] = useState(false)
  const [errProg, setErrProg] = useState('')

  const [tqqSeul, setTqqSeul] = useState(false)
  const [reunionOuverte, setReunionOuverte] = useState(null)

  const [course, setCourse] = useState(null)
  const [partants, setPartants] = useState([])
  const [busyPartants, setBusyPartants] = useState(false)
  const [errPartants, setErrPartants] = useState('')
  const [statsChevaux, setStatsChevaux] = useState({})   // musique + compteurs, par cheval

  const [partant, setPartant] = useState(null)   // le cheval ouvert → écran carrière

  useEffect(() => { document.title = 'Chevaux — Bahja TURF' }, [])

  /* ------------------------------------------------ ① le programme du jour --- */
  const chargerProgramme = useCallback(async (d) => {
    setBusyProg(true); setErrProg(''); setProg([])
    setCourse(null); setPartants([]); setPartant(null); setReunionOuverte(null)
    try {
      const m = await programmeDuJour(d)
      setProg(m)
      if (!m.length) setErrProg('Aucune course publiée pour cette date.')
      else setReunionOuverte(m[0].id)
    } catch (e) {
      setErrProg('Programme indisponible — ' + (e && e.message ? e.message : e))
    }
    setBusyProg(false)
  }, [])

  useEffect(() => { chargerProgramme(date) }, [date, chargerProgramme])

  /* ------------------------------------------------- ② les partants --------- */
  const ouvrirCourse = useCallback(async (c) => {
    setCourse(c); setPartants([]); setPartant(null); setErrPartants(''); setBusyPartants(true); setStatsChevaux({})
    let liste = []
    try {
      liste = await partantsDeCourse(c.id, c)
      setPartants(liste)
    } catch (e) {
      setErrPartants('Partants indisponibles — ' + (e && e.message ? e.message : e))
    }
    setBusyPartants(false)

    /* La musique et les compteurs de CHAQUE cheval, en tâche de fond (6 à la fois). */
    let i = 0
    const suivante = async () => {
      while (i < liste.length) {
        const p = liste[i++]
        try {
          const s = await statsCheval(p.horseId)
          setStatsChevaux((m) => ({ ...m, [p.horseId]: s }))
        } catch (e) { /* un cheval sans stats ne casse rien */ }
      }
    }
    await Promise.all(Array.from({ length: Math.min(6, liste.length) }, suivante))
  }, [])

  const reunionsVues = useMemo(
    () => prog.map((m) => ({ ...m, courses: tqqSeul ? m.courses.filter((c) => c.isTQQ) : m.courses })).filter((m) => m.courses.length),
    [prog, tqqSeul],
  )
  const compteurs = useMemo(() => {
    let reunions = 0, courses = 0, tqq = null
    for (const m of reunionsVues) { reunions++; courses += m.courses.length; if (!tqq) tqq = m.courses.find((c) => c.isTQQ) || null }
    return { reunions, courses, tqq }
  }, [reunionsVues])

  const th = { padding: '6px 8px', fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: '#fff', background: SK.accentSombre, whiteSpace: 'nowrap', textAlign: 'left' }
  const td = { padding: '5px 8px', fontSize: 12.5, borderBottom: '1px solid ' + SK.ligne, verticalAlign: 'middle' }

  return (
    <div dir="ltr" style={{ minHeight: '100vh', background: SK.fond, fontFamily: SK.police, color: SK.texte }}>

      <header className="header" style={{ background: SK.entete, borderBottom: '2px solid #22d3ee' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-horse.png" alt="Bahja TURF" style={{ height: 44, background: 'white', borderRadius: 8, padding: 2 }} />
            <img src="/logo.svg" alt="Bahja TURF" style={{ height: 42, borderRadius: 8 }} />
          </div>
          <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/" style={lienNav}>Programme</Link>
            <Link to="/coply" style={lienNav}>Coply</Link>
            <Link to="/quinte" style={lienNav}>Quinté</Link>
            <Link to="/analyse" style={{ ...lienNav, background: 'rgba(255,255,255,.18)', borderRadius: 8, padding: '6px 12px' }}>Chevaux</Link>
          </nav>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 16px 48px' }}>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: SK.accentSombre }}>Chaque cheval — toutes les courses</h1>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid ' + SK.bord, fontFamily: SK.police }} />
          <span style={{ fontSize: 12, color: SK.doux }}>{DLc(date)}</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: SK.doux, cursor: 'pointer' }}>
            <input type="checkbox" checked={tqqSeul} onChange={(e) => setTqqSeul(e.target.checked)} />
            Quinté+ seulement
          </label>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: SK.accent }}>
            {busyProg ? 'chargement…' : `${compteurs.reunions} réunion(s) · ${compteurs.courses} course(s)`}
          </span>
          {compteurs.tqq && (
            <button onClick={() => { setTqqSeul(true); setReunionOuverte(compteurs.tqq.meetingId); ouvrirCourse(compteurs.tqq) }} style={btnPlein}>
              🎯 Le Quinté du jour
            </button>
          )}
        </div>

        {errProg && <div style={bandeau(ROUGE)}>{errProg}</div>}

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── colonne gauche : le programme ── */}
          <div style={{ flex: '0 0 292px', maxWidth: '100%', background: SK.carte, border: '1px solid ' + SK.bord, borderRadius: 12, padding: 8, maxHeight: '80vh', overflowY: 'auto' }}>
            {busyProg && <div style={{ padding: 10, fontSize: 13, color: SK.muet }}>Lecture du programme…</div>}
            {!busyProg && !reunionsVues.length && <div style={{ padding: 10, fontSize: 13, color: SK.muet }}>Rien à afficher.</div>}
            {reunionsVues.map((m) => {
              const ouverte = reunionOuverte === m.id
              return (
                <div key={m.id} style={{ marginBottom: 4 }}>
                  <button onClick={() => setReunionOuverte(ouverte ? null : m.id)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, border: 0, cursor: 'pointer', textAlign: 'left', background: ouverte ? SK.accentClair : SK.alt, color: SK.accentSombre, fontWeight: 800, fontSize: 13 }}>
                    <span>{m.pmu ? `R${m.pmu} · ` : ''}{m.nom}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: SK.doux }}>{m.courses.length} c.</span>
                  </button>
                  {ouverte && m.courses.map((c) => {
                    const sel = course && course.id === c.id && !partant
                    return (
                      <button key={c.id} onClick={() => ouvrirCourse(c)}
                        style={{ width: '100%', display: 'block', textAlign: 'left', cursor: 'pointer', padding: '6px 9px', borderRadius: 7, marginTop: 2, background: sel ? SK.accent : '#fff', color: sel ? '#fff' : SK.texte, border: 0, borderLeft: sel ? '3px solid #22d3ee' : '3px solid ' + SK.ligne }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                          <b style={{ fontFamily: SK.mono, fontSize: 12 }}>C{c.num}</b>
                          <span style={{ fontSize: 11, color: sel ? '#e0f2fe' : SK.doux, fontFamily: SK.mono }}>{H(c.heure)}</span>
                          {c.isTQQ && <span style={{ fontSize: 9.5, fontWeight: 800, background: sel ? '#fff' : '#fee2e2', color: sel ? SK.accent : ROUGE, borderRadius: 4, padding: '1px 4px' }}>Q+</span>}
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</div>
                        <div style={{ fontSize: 10.5, color: sel ? '#e0f2fe' : SK.muet }}>{c.libelle} · {c.distance || '—'}m · {c.nbPartants || '—'} part.</div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* ── colonne droite ── */}
          <div style={{ flex: '1 1 660px', minWidth: 0 }}>

            {/* ③ L'ÉCRAN CARRIÈRE — il remplace la course, comme dans l'app. */}
            {partant && course && (
              <EcranCarriere course={course} partant={partant} onRetour={() => setPartant(null)} />
            )}

            {!partant && !course && (
              <div style={{ background: SK.carte, border: '1px dashed ' + SK.bord, borderRadius: 12, padding: 26, textAlign: 'center', color: SK.muet, fontSize: 14 }}>
                Choisis une course à gauche pour voir ses partants — puis un cheval pour ouvrir sa <b>carrière complète</b>.
              </div>
            )}

            {!partant && course && (
              <div style={{ background: SK.carte, border: '1px solid ' + SK.bord, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '11px 14px', background: SK.entete, color: '#fff' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 16 }}>{course.hippodrome}</b>
                    <span style={{ fontFamily: SK.mono, fontSize: 12.5 }}>{course.reunion ? `R${course.reunion}` : ''}C{course.num}</span>
                    <span style={{ fontFamily: SK.mono, fontSize: 12.5 }}>{H(course.heure)}</span>
                    {course.isTQQ && <span style={{ fontSize: 10, fontWeight: 800, background: '#fff', color: ROUGE, borderRadius: 5, padding: '2px 6px' }}>QUINTÉ+</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 3 }}>{course.nom}</div>
                  <div style={{ fontSize: 12, opacity: 0.92, marginTop: 2 }}>
                    {course.libelle} · {course.distance || '—'} m · {course.sens || '—'} · {course.terrain || course.surface || '—'}
                    {course.nbPartants ? ` · ${course.nbPartants} partants` : ''}{course.prix ? ` · ${gains(course.prix)}` : ''}
                  </div>
                  {arriveeNums(course.arrivee).length > 0 && (
                    <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 4, color: '#fef08a' }}>Arrivée : {arriveeNums(course.arrivee).join(' · ')}</div>
                  )}
                  {course.conditions && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4, lineHeight: 1.4 }}>{course.conditions}</div>}
                </div>

                {busyPartants && <div style={{ padding: 16, fontSize: 13, color: SK.muet }}>Lecture des partants…</div>}
                {errPartants && <div style={{ padding: 12 }}><div style={bandeau(ROUGE)}>{errPartants}</div></div>}

                {!busyPartants && partants.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={th}>N°</th><th style={th}>Cheval</th><th style={th}>SA</th><th style={th}>Poids</th>
                          <th style={th}>VH</th><th style={th}>Artifices</th><th style={th}>Jockey</th><th style={th}>Entraîneur</th>
                          <th style={th}>Cote</th><th style={th}>Rang</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partants.map((p) => (
                          <tr key={p.id} onClick={() => setPartant(p)}
                            style={{ background: p.nonPartant ? '#fafafa' : '#fff', cursor: 'pointer', opacity: p.nonPartant ? 0.55 : 1 }}>
                            <td style={{ ...td, fontFamily: SK.mono, fontWeight: 800 }}>{p.num}</td>
                            <td style={{ ...td, minWidth: 210 }}>
                              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                                {p.casaque && <img src={p.casaque} alt="" width={20} height={20} style={{ borderRadius: 4, background: '#fff', border: '1px solid #e2e8f0' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />}
                                <b style={{ fontSize: 13 }}>{p.nom}</b>
                                {p.nonPartant && <span style={{ fontSize: 9.5, fontWeight: 800, color: ROUGE }}>NP</span>}
                                {p.supplemente && <span style={{ fontSize: 9.5, fontWeight: 800, color: AMBRE }}>+</span>}
                                {p.jockeyChange && <span title="changement de jockey" style={{ fontSize: 9.5, fontWeight: 800, color: AMBRE }}>J↔</span>}
                              </div>
                              {(() => {
                                const s = statsChevaux[p.horseId]
                                if (!s) return <div style={{ fontSize: 10.5, color: SK.muet }}>…</div>
                                return (
                                  <div style={{ fontSize: 10.5, color: SK.doux, marginTop: 1 }} title="musique · courses · victoires · places">
                                    <span style={{ fontFamily: SK.mono }}>{s.musique || '—'}</span>
                                    <span style={{ color: SK.muet }}> · {s.nbCourses ?? '—'}c {s.nbVictoires ?? '—'}v {s.nbPlaces ?? '—'}p</span>
                                  </div>
                                )
                              })()}
                            </td>
                            <td style={{ ...td, whiteSpace: 'nowrap' }}>{p.sexe}{p.age != null ? p.age : ''}</td>
                            <td style={{ ...td, fontFamily: SK.mono }}>{p.poids != null ? p.poids + ' kg' : '—'}</td>
                            <td style={{ ...td, fontFamily: SK.mono, fontWeight: 700, color: SK.accentSombre }}>{p.vh != null ? p.vh : '—'}</td>
                            <td style={{ ...td }}><Artifices p={p} /></td>
                            <td style={{ ...td, whiteSpace: 'nowrap' }}>{p.jockey || '—'}</td>
                            <td style={{ ...td, whiteSpace: 'nowrap' }}>{p.entraineur || '—'}</td>
                            <td style={{ ...td, fontFamily: SK.mono, fontWeight: 700 }}>
                              {p.cote != null ? p.cote : '—'}
                              {p.cote != null && p.ouverture != null && Math.abs(p.ouverture - p.cote) >= 0.5 && (
                                <span style={{ fontSize: 10, color: p.cote < p.ouverture ? VERT : ROUGE, marginLeft: 4 }}>{p.cote < p.ouverture ? '▼' : '▲'}{p.ouverture}</span>
                              )}
                            </td>
                            <td style={{ ...td, fontWeight: 700, color: p.rang === 1 ? VERT : p.rang ? SK.texte : SK.muet }}>{rang(p.rang)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding: '7px 12px', fontSize: 11, color: SK.muet }}>
                      Clique un cheval → sa <b>carrière complète</b>. VH = valeur handicap · Artifices = fer (D déferré), œillères, attache-langue.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════ ③ L'ÉCRAN « CARRIÈRE » DU CHEVAL ═════════════════════ */

function EcranCarriere({ course, partant, onRetour }) {
  const [identite, setIdentite] = useState(null)
  const [stats, setStats] = useState(null)
  const [carriere, setCarriere] = useState([])
  const [busy, setBusy] = useState(true)
  const [erreur, setErreur] = useState('')
  const [sel, setSel] = useState(null)
  const [voirCom, setVoirCom] = useState(false)

  useEffect(() => {
    let vivant = true
    setBusy(true); setErreur(''); setCarriere([]); setStats(null); setIdentite(null); setSel(null)
    Promise.all([
      identiteCheval(partant.horseId).catch(() => null),
      statsCheval(partant.horseId).catch(() => null),
      carriereCheval(partant.horseId).catch(() => []),
    ]).then(([id, st, ca]) => {
      if (!vivant) return
      setIdentite(id); setStats(st); setCarriere(ca)
      if (!id && !st && !ca.length) setErreur('Carrière indisponible pour ce cheval.')
      setBusy(false)
    })
    return () => { vivant = false }
  }, [partant.horseId])

  /* ---- les valeurs présentes, pour n'offrir que des filtres utiles ---- */
  const valeurs = useMemo(() => {
    const compte = (cle) => {
      const m = new Map()
      for (const l of carriere) { const v = l[cle]; if (v) m.set(v, (m.get(v) || 0) + 1) }
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ v, n }))
    }
    return {
      hippodrome: compte('hippodrome'),
      terrain: compte('terrainFamille'),
      discipline: compte('libelle'),
      type: compte('categorieCourte'),
    }
  }, [carriere])

  /* ---- aucun filtre au départ : on montre TOUTE la carrière ---- */
  const VIDE = { hippodrome: [], terrain: [], discipline: [], type: [], distance: false, oeil: false }
  useEffect(() => { if (carriere.length) setSel(VIDE) }, [carriere]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Le raccourci « mêmes conditions que la course du jour ». */
  const conditionsDuJour = () => {
    const garde = (liste, v) => (v && liste.some((x) => x.v === v) ? [v] : [])
    setSel({
      hippodrome: garde(valeurs.hippodrome, course.hippodrome),
      terrain: garde(valeurs.terrain, terrainSimple(course.terrain)),
      discipline: garde(valeurs.discipline, course.libelle),
      type: [],
      distance: !!course.distance,
      oeil: false,
    })
  }

  const lignes = useMemo(() => {
    if (!sel) return carriere
    return carriere.filter((l) => {
      if (sel.hippodrome.length && !sel.hippodrome.includes(l.hippodrome)) return false
      if (sel.distance && course.distance && Math.abs((l.distance || 0) - course.distance) > 400) return false
      if (sel.distance && !course.distance && !l.distance) return false
      if (sel.terrain.length && !sel.terrain.includes(l.terrainFamille)) return false
      if (sel.discipline.length && !sel.discipline.includes(l.libelle)) return false
      if (sel.type.length && !sel.type.includes(l.categorieCourte)) return false
      if (sel.oeil && !(l.oeilleres || l.blinkers)) return false
      return true
    })
  }, [carriere, sel, course])

  const totaux = useMemo(() => {
    const courues = lignes.filter((l) => l.rang != null && !l.nonPartant)
    return {
      courses: lignes.length,
      victoires: courues.filter((l) => l.rang === 1).length,
      places: courues.filter((l) => l.rang >= 2 && l.rang <= 3).length,
    }
  }, [lignes])

  const nbFiltres = sel ? (sel.hippodrome.length ? 1 : 0) + (sel.distance ? 1 : 0) + (sel.terrain.length ? 1 : 0) + (sel.discipline.length ? 1 : 0) + (sel.type.length ? 1 : 0) + (sel.oeil ? 1 : 0) : 0
  const jours = joursDepuis(carriere, course.heure)

  const basculer = (dim, v) => setSel((s) => {
    const cur = s[dim]
    return { ...s, [dim]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }
  })

  return (
    <div style={{ background: SK.carte, border: '2px solid ' + SK.accent, borderRadius: 12, overflow: 'hidden' }}>

      {/* ── en-tête du cheval ── */}
      <div style={{ background: SK.fiche, color: '#fff', padding: '13px 15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {partant.casaque && (
              <img src={partant.casaque} alt="" width={54} height={54} style={{ borderRadius: 8, background: '#fff', padding: 3 }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: SK.mono, fontSize: 20, fontWeight: 800 }}>{partant.num}.</span>
                <span style={{ fontSize: 21, fontWeight: 800 }}>{partant.nom}</span>
                <Artifices p={partant} gros />
              </div>
              {identite && (identite.pere || identite.mere) && (
                <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 2 }}>par <b>{identite.pere || '—'}</b> et <b>{identite.mere || '—'}</b></div>
              )}
              <div style={{ fontSize: 12.5, marginTop: 3, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>Entraîneur <b>{(identite && identite.entraineur) || partant.entraineur || '—'}</b></span>
                <span>Jockey <b>{partant.jockey || '—'}</b></span>
              </div>
            </div>
          </div>
          <button onClick={onRetour} style={btnGhost}>← partants</button>
        </div>

        <div style={{ display: 'flex', gap: 26, marginTop: 10, fontFamily: SK.mono }}>
          <Colonne t="SA" v={`${partant.sexe || '?'}${partant.age != null ? partant.age : ''}`} />
          <Colonne t="Poids" v={partant.poids != null ? `${partant.poids}` : '—'} />
          <Colonne t="VH" v={partant.vh != null ? `${partant.vh}` : '—'} />
          <Colonne t="Corde" v={partant.corde != null ? `${partant.corde}` : '—'} />
        </div>

        <div style={{ marginTop: 7, fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>
          {jours != null && <span style={{ fontWeight: 800 }}>{jours} j · </span>}
          <span style={{ fontFamily: SK.mono }}>{(stats && stats.musique) || '—'}</span>
        </div>
      </div>

      {busy && <div style={{ padding: 18, fontSize: 13, color: SK.muet }}>Lecture de la carrière…</div>}
      {erreur && <div style={{ padding: 12 }}><div style={bandeau(ROUGE)}>{erreur}</div></div>}

      {!busy && !erreur && (
        <>
          {/* ── les filtres ── */}
          {sel && (
            <div style={{ padding: '12px 15px', borderBottom: '1px solid ' + SK.ligne, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 17 }}>Filtrer la carrière</b>
                {nbFiltres > 0 && <span style={{ background: ROUGE, color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '1px 7px' }}>{nbFiltres}</span>}
                <button onClick={conditionsDuJour} style={{ border: '1px solid ' + SK.accent, background: '#fff', color: SK.accent, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', borderRadius: 999, padding: '4px 11px' }}>
                  🎯 mêmes conditions que ce jour
                </button>
                {nbFiltres > 0 && (
                  <button onClick={() => setSel(VIDE)} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: SK.accent, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                    tout effacer
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {course.distance != null && (
                  <Puce on={sel.distance} onClick={() => setSel((s) => ({ ...s, distance: !s.distance }))}>
                    ≈{course.distance}m
                  </Puce>
                )}
                {valeurs.hippodrome.slice(0, 8).map((x) => (
                  <Puce key={x.v} on={sel.hippodrome.includes(x.v)} onClick={() => basculer('hippodrome', x.v)}>{x.v}</Puce>
                ))}
                {valeurs.discipline.map((x) => (
                  <Puce key={x.v} on={sel.discipline.includes(x.v)} onClick={() => basculer('discipline', x.v)}>{x.v}</Puce>
                ))}
                {valeurs.terrain.map((x) => (
                  <Puce key={x.v} on={sel.terrain.includes(x.v)} onClick={() => basculer('terrain', x.v)}>{x.v}</Puce>
                ))}
                {valeurs.type.map((x) => (
                  <Puce key={x.v} on={sel.type.includes(x.v)} onClick={() => basculer('type', x.v)}>{x.v}</Puce>
                ))}
                <Puce on={sel.oeil} onClick={() => setSel((s) => ({ ...s, oeil: !s.oeil }))}>Œil</Puce>
              </div>
            </div>
          )}

          {/* ── les totaux ── */}
          <div style={{ display: 'flex', gap: 26, padding: '11px 15px', borderBottom: '1px solid ' + SK.ligne, fontSize: 15, fontWeight: 800 }}>
            <span>{totaux.courses} <span style={{ fontWeight: 600, color: SK.doux, fontSize: 13 }}>course{totaux.courses > 1 ? 's' : ''}</span></span>
            <span>{totaux.victoires} <span style={{ fontWeight: 600, color: SK.doux, fontSize: 13 }}>victoire{totaux.victoires > 1 ? 's' : ''}</span></span>
            <span style={{ color: ROUGE }}>{totaux.places} <span style={{ fontWeight: 600, color: SK.doux, fontSize: 13 }}>place{totaux.places > 1 ? 's' : ''}</span></span>
            {carriere.length > lignes.length && <span style={{ marginLeft: 'auto', fontWeight: 600, color: SK.muet, fontSize: 12.5 }}>{lignes.length} / {carriere.length} affichées</span>}
          </div>

          {/* ── la bascule des commentaires ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '8px 15px', borderBottom: '1px solid ' + SK.ligne }}>
            <span style={{ fontSize: 12.5, color: SK.doux, fontWeight: 600 }}>Afficher les commentaires</span>
            <button onClick={() => setVoirCom(!voirCom)} title="commentaires des courses"
              style={{ width: 44, height: 24, borderRadius: 999, border: 0, cursor: 'pointer', position: 'relative', background: voirCom ? SK.accent : '#cbd5e1' }}>
              <span style={{ position: 'absolute', top: 3, left: voirCom ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
            </button>
          </div>

          {/* ── les cartes ── */}
          <div style={{ padding: '11px 15px 15px', background: '#f8fafc' }}>
            {!carriere.length && <div style={{ fontSize: 13, color: SK.muet }}>Carrière non publiée pour ce cheval.</div>}
            {carriere.length > 0 && !lignes.length && <div style={{ fontSize: 13, color: SK.muet }}>Aucune course ne correspond aux filtres — clique « tout effacer ».</div>}
            {lignes.map((l) => <CarteCarriere key={l.id} l={l} voirCom={voirCom} />)}
          </div>
        </>
      )}
    </div>
  )
}

/** Une course de la carrière — la carte de l'app. */
function CarteCarriere({ l, voirCom }) {
  const d = dateBloc(l.date)
  const marques = l.fer || []
  return (
    <div style={{ display: 'flex', border: '1px solid ' + SK.ligne, borderRadius: 10, overflow: 'hidden', marginBottom: 9, background: l.rang === 1 ? '#f0fdf4' : '#fff' }}>
      <div style={{ width: 56, flex: '0 0 56px', background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 2px' }}>
        <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1 }}>{d.j}</div>
        <div style={{ fontSize: 11.5, opacity: 0.9 }}>{d.m}</div>
        <div style={{ fontSize: 11.5, opacity: 0.8 }}>{d.a}</div>
      </div>

      <div style={{ flex: 1, minWidth: 0, padding: '8px 11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
          <b style={{ fontSize: 16.5 }}>{l.hippodrome}{l.reunion ? <span style={{ fontSize: 11, color: SK.muet, fontWeight: 600 }}> · R{l.reunion}</span> : null}</b>
          <b style={{ fontSize: 15, whiteSpace: 'nowrap', color: l.rang === 1 ? VERT : SK.texte }}>
            {l.nonPartant ? 'NP' : rang(l.rang)}{l.nbPartants ? <span style={{ fontSize: 11.5, color: SK.muet }}>/{l.nbPartants}</span> : null}
          </b>
        </div>

        <div style={{ fontSize: 12.5, color: SK.doux, marginTop: 1 }}>
          {l.libelle} · {l.distance || '—'}m · {l.terrain || '—'}
          {l.categorieCourte ? ` · ${l.categorieCourte}` : ''}
        </div>

        <div style={{ fontSize: 12.5, color: '#334155', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{l.jockey || '—'}</span>
          <span>· {l.poids != null ? `${l.poids} kg` : '—'}</span>
          <span>· VH{l.vh != null ? l.vh : '—'}</span>
          {marques.length > 0 && (
            <span title={l.ferTexte} style={{ fontFamily: SK.mono, fontWeight: 800, color: SK.accentSombre }}>
              {marques.map((m) => m.code).join(' ')}
            </span>
          )}
          {(l.oeilleres || l.blinkers) && <span title={l.blinkersLisible || 'Œillères'} style={{ color: SK.accentSombre }}>👓</span>}
          {l.langue && <span title="Attache-langue">👅</span>}
          {l.isTQQ && <span style={{ fontSize: 9.5, fontWeight: 800, background: '#fee2e2', color: ROUGE, borderRadius: 4, padding: '0 4px' }}>Q+</span>}
        </div>

        {voirCom && (
          <div style={{ fontSize: 11.5, color: SK.doux, fontStyle: 'italic', marginTop: 5, lineHeight: 1.45, borderTop: '1px dashed ' + SK.ligne, paddingTop: 5 }}>
            {l.course ? <b style={{ fontStyle: 'normal' }}>{l.course} — </b> : null}
            {l.commentaire || 'Pas de commentaire pour cette course.'}
            <span style={{ display: 'block', marginTop: 3, fontStyle: 'normal', color: SK.muet }}>
              Chrono {l.chrono != null ? chrono(l.chrono) : '—'}{l.redkm != null ? ` · ${chrono(l.redkm)}/km` : ''} · Gains {gains(l.gains)} · Cote {l.cote != null ? l.cote : '—'}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 9px' }}>
        {l.replay ? (
          <a href={l.replay.video} target="_blank" rel="noreferrer" title="revoir la course"
            style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid ' + SK.accent, color: SK.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 15, background: '#fff' }}>▶</a>
        ) : <span style={{ fontSize: 11, color: SK.muet }}>—</span>}
        <span style={{ fontSize: 10.5, color: SK.muet, fontFamily: SK.mono }}>{l.chrono != null ? chrono(l.chrono) : ''}</span>
      </div>
    </div>
  )
}

/** Les artifices : le fer (D/F/P), les œillères, l'attache-langue. */
function Artifices({ p, gros }) {
  const t = gros ? 14 : 12.5
  const marques = p.fer || []
  const rien = !marques.length && !p.oeilleres && !p.blinkers && !p.langue
  if (rien) return <span style={{ color: SK.muet, fontSize: t }}>—</span>
  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: t }}>
      {marques.map((m) => <b key={m.pied} title={m.label} style={{ fontFamily: SK.mono, fontWeight: 800 }}>{m.code}</b>)}
      {(p.oeilleres || p.blinkers) && <span title={p.blinkersLisible || 'Œillères'}>👓</span>}
      {p.langue && <span title="Attache-langue">👅</span>}
    </span>
  )
}

function Colonne({ t, v }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, opacity: 0.75, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t}</div>
      <div style={{ fontSize: 19, fontWeight: 800 }}>{v}</div>
    </div>
  )
}

function Puce({ on, children, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
        border: '1.5px solid ' + (on ? SK.accent : '#cbd5e1'), background: on ? SK.accent : '#fff',
        color: on ? '#fff' : SK.doux, whiteSpace: 'nowrap',
      }}>{children}</button>
  )
}

/* ------------------------------------------------------------- les styles --- */

const lienNav = { color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }
const btnPlein = { padding: '7px 14px', borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: 800, fontSize: 12.5, background: '#0e7490', color: '#fff' }
const btnGhost = { padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.6)', cursor: 'pointer', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 12.5 }
const bandeau = (couleur) => ({ background: '#fff', border: '1px solid ' + couleur, color: couleur, borderRadius: 8, padding: '8px 12px', fontSize: 13 })
