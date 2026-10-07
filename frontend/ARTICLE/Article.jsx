/* =============================================================================
 * src/QUINTE/ARTICLE/Article.jsx   —  LA PAGE /r/:slug
 *
 * ⛔ CLOISONNÉE. Cette page n'importe QUE :
 *      ../../backend/ARTICLE/backend.js     (l'API bahja)
 *      ../../backend/ARTICLE/turfFrance.js  (tqqjour.php via le proxy /tf)
 *      ../../backend/ARTICLE/score.js       (calculs locaux)
 *
 * Elle ne connaît ni Programme, ni Admin, ni /quinte, ni casacourses,
 * ni le démo. Si ces pages changent, celle-ci ne bouge pas.
 * ========================================================================== */
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { lireCible, chargerCourse, chargerPronos, chargerMeteo, chargerProgramme } from '../../backend/ARTICLE/backend.js'
import { exporterArchive, importerArchive, tailleArchive } from '../../backend/ARTICLE/archive.js'
import { chargerTopsTurfFrance, offsetJour, slugNorm, heureGMT } from '../../backend/ARTICLE/turfFrance.js'
import { pctPodium, pctVictoire, nb2e, nb3e, nbCourses, formeCourte, classerPartants } from '../../backend/ARTICLE/score.js'

/** Les 19 lignes de « Top10 des Cotes de Références », dans l'ordre de la source. */
const LIGNES_TOPS = [
  ['Chevaux :',        'chevaux'],
  ['Drivers :',        'drivers'],
  ['Entraineurs :',    'entraineurs'],
  ['Top Cotes Direct', 'topCotesDirect'],
  ['Top Chevaux',      'topChevaux'],
  ['Top Palmares',     'topPalmares'],
  ['Top Forme',        'topForme'],
  ['Top Classe',       'topClasse'],
  ['Top Jockeys',      'topJockeys'],
  ['Top Entraineurs',  'topEntraineurs'],
  ['Aptitude 1er',     'aptitudeGagnant'],
  ['Aptitude placé',   'aptitudePlace'],
  ['Top Chronos',      'topChronos'],
  ['Top Position',     'topPosition'],
  ['Top Cordes',       'topCordes'],
  ['Ecarts chevaux',   'ecartsChevaux'],
  ['Incontournables',  'incontournables'],
  ['Pour une place',   'pourUnePlace'],
  ['Outsiders',        'outiders'],
]

const SANS = '—'

export default function Article() {
  const { slug, id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [course, setCourse] = useState(null)
  const [partants, setPartants] = useState([])
  const [meteo, setMeteo] = useState(null)
  const [pronostics, setPronostics] = useState(null)
  const [tops, setTops] = useState({})
  // la source unique : elle dit d ou viennent la course ET les tableaux
  const [source, setSource] = useState('')
  const [etat, setEtat] = useState('chargement')   // chargement | ok | erreur
  const [raison, setRaison] = useState('')
  const [programme, setProgramme] = useState(null)       // toutes les courses du jour
  const [aptitudes, setAptitudes] = useState([])
  const [synthesePct, setSynthesePct] = useState('')
  const [pronosTf, setPronosTf] = useState([])
  const [taille, setTaille] = useState({ courses: 0, programmes: 0 })
  const inputArchiveRef = useRef(null)

  const fetchIdRef = useRef('')

  /** Le sélecteur « toutes les courses » : on navigue, la page recharge depuis SA source. */
  const allerCourseSel = (hippo, code, pays) => {
    const r = (programme?.reunions || []).find((x) => x.hippodrome === hippo)
    const c = r?.courses.find((x) => x.code === code)
    if (!r || !c) return
    const m = String(c.reunion).replace(/\D/g, '') || '1'
    const k = String(code).replace(/\D/g, '') || '1'
    navigate(`/r/r${m}-c${k}-${slugNorm(c.nom)}-${dateCourante}-${slugNorm(r.hippodrome)}` + (pays && pays !== 'FRANCE' ? `?pays=${encodeURIComponent(pays)}` : ''))
  }

  const exporter = () => {
    const blob = new Blob([JSON.stringify(exporterArchive())], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'bahja-reu-archive.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  const importer = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const nAjout = importerArchive(JSON.parse(rd.result))
        setTaille(tailleArchive())
        setSource((x) => x + ` · +${nAjout} importées`)
      } catch (err) {}
    }
    rd.readAsText(f)
    e.target.value = ''
  }

  /* ─────────────────────────── le chargement de la course ─────────────── */
  useEffect(() => {
    document.title = course && course.nom
      ? 'R' + course.reunion.num + '-C' + course.numOrdre + ' | ' + course.nom + ' — Bahja TURF'
      : 'Étude course — Bahja TURF'
  }, [course])

  const charger = useCallback(async () => {
    const aujourdhui = new Date().toISOString().slice(0, 10)
    const paysUrl = new URLSearchParams(location.search).get('pays') || 'FRANCE'
    const cible = lireCible(slug, id, location.state?.date || aujourdhui, paysUrl)
    fetchIdRef.current = cible.fetchId

    setEtat('chargement'); setRaison('')
    setCourse(null); setPartants([]); setTops({}); setPronostics(null); setMeteo(null); setProgramme(null); setAptitudes([]); setSynthesePct(''); setPronosTf([])

    let data = null
    let echec = null
    try {
      data = await chargerCourse(cible.fetchId, cible.pays, cible.hippo || '')
    } catch (e) {
      echec = e
    }

    // les pronostics et la météo ne bloquent jamais l'affichage
    chargerPronos(cible.fetchId).then(setPronostics).catch(() => setPronostics(null))
    if (data) chargerMeteo(cible.date, data.meeting.num).then(setMeteo).catch(() => setMeteo(null))

    if (!data) {
      // ⚠ AUCUNE course de remplacement : pas de démo, pas de course d'une
      //   autre date. On le dit clairement.
      setEtat('erreur')
      setRaison(echec && echec.message ? echec.message : 'source indisponible')
      return
    }

    setCourse({ ...data.race, reunion: data.meeting })
    setPartants(data.participants)
    setAptitudes(data.aptitudes || [])
    setSynthesePct(data.synthesePct || '')
    setPronosTf(data.pronosTf || [])
    setEtat('ok')
    try { setTaille(tailleArchive()) } catch (e) {}
    chargerProgramme(cible.date).then(setProgramme).catch(() => setProgramme(null))

    setTops(data.tops || {})
    setSource(data.source || '')
    // les 18 tableaux sont déjà revenus avec la course ; cet appel ne sert
    // qu'à les rafraîchir si la course est arrivée d'une autre source.
    // rappel avec LA MÊME date que la course (jamais date=0 en dur)
    if (!Object.keys(data.tops || {}).length) {
      const off = offsetJour(cible.date)
      chargerTopsTurfFrance(off)
        .then((t) => setTops(t))
        .catch(() => setSource((data.source || 'source') + ' · tops indisponibles'))
    }
  }, [slug, id, location.search])

  useEffect(() => { charger() }, [charger])

  /* ─────────────────────────── la navigation par date ──────────────────── */
  const allerA = (date) => {
    const m = fetchIdRef.current.match(/_R(\d+)_C(\d+)/)
    if (!m || !course) return
    const nm = String(course.prix || course.nom || 'course')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const hippo = String(course.reunion.hippodrome || 'course')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    navigate(`/r/r${m[1]}-c${m[2]}-${nm}-${date}-${hippo}`)
  }
  const dateCourante = (slug || '').match(/(\d{4}-\d{2}-\d{2})/)?.[1]
    || location.state?.date
    || new Date().toISOString().slice(0, 10)

  /* ─────────────────────────────── rendu ──────────────────────────────── */
  if (etat === 'chargement') {
    return (<>
      {/* ── bandeau : logo + navigation. Les moteurs/sources restent privés à chaque page ── */}
      <header className="header" style={{ background: 'linear-gradient(135deg,#000000 0%,#1c1917 60%,#000000 100%)', borderBottom: '3px solid #d4af37' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-horse.png" alt="Bahja TURF" style={{ height: 44, background: 'white', borderRadius: 8, padding: 2 }} />
            <img src="/logo.svg" alt="Bahja TURF" style={{ height: 42, borderRadius: 8 }} />
          </div>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link to="/" style={{ color: '#f5d76e', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Programme</Link>
            <Link to="/quinte" style={{ color: '#f5d76e', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Quinté</Link>
          </nav>
        </div>
      </header>
      <div style={{ textAlign: 'center', padding: 40, fontSize: 13 }}>Chargement de la course…</div>
    </>)
  }

  if (etat === 'erreur') {
    return (
      <>
      {/* ── bandeau : logo + navigation. Les moteurs/sources restent privés à chaque page ── */}
      <header className="header" style={{ background: 'linear-gradient(135deg,#000000 0%,#1c1917 60%,#000000 100%)', borderBottom: '3px solid #d4af37' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-horse.png" alt="Bahja TURF" style={{ height: 44, background: 'white', borderRadius: 8, padding: 2 }} />
            <img src="/logo.svg" alt="Bahja TURF" style={{ height: 42, borderRadius: 8 }} />
          </div>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link to="/" style={{ color: '#f5d76e', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Programme</Link>
            <Link to="/quinte" style={{ color: '#f5d76e', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Quinté</Link>
          </nav>
        </div>
      </header>
      <div style={{ maxWidth: 700, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24 }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#b91c1c', margin: '0 0 8px' }}>
            Cette course n'est pas disponible
          </h1>
          <p style={{ fontSize: 13, color: '#7f1d1d', margin: '0 0 6px' }}>
            <b>{fetchIdRef.current}</b> — course indisponible pour le moment.
          </p>
          <p style={{ fontSize: 12, color: '#991b1b', margin: 0 }}>
            Aucune donnée de remplacement n'est affichée : montrer une autre
            course serait pire que ne rien montrer.
          </p>
        </div>
        <button onClick={() => window.location.reload()} style={{ display: 'inline-block', marginTop: 14, fontSize: 13, color: '#000000', fontWeight: 800, background: '#d4af37', border: 0, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
          ↻ Recharger la page
        </button>
      </div>
      </>
    )
  }

  const c = course
  const m = c.reunion
  const classement = classerPartants(partants)
  const j = (v) => (Array.isArray(v) && v.length ? v.join(' - ') : '')
  const formatHeure = (t) => {
    if (!t) return ''
    const n = Number(t)
    if (!Number.isFinite(n)) return String(t).slice(0, 5)
    try { return new Date(n).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch (e) { return '' }
  }

  return (
    <>
      {/* ── bandeau : logo + navigation. Les moteurs/sources restent privés à chaque page ── */}
      <header className="header" style={{ background: 'linear-gradient(135deg,#000000 0%,#1c1917 60%,#000000 100%)', borderBottom: '3px solid #d4af37' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-horse.png" alt="Bahja TURF" style={{ height: 44, background: 'white', borderRadius: 8, padding: 2 }} />
            <img src="/logo.svg" alt="Bahja TURF" style={{ height: 42, borderRadius: 8 }} />
          </div>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link to="/" style={{ color: '#f5d76e', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Programme</Link>
            <Link to="/quinte" style={{ color: '#f5d76e', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Quinté</Link>
          </nav>
        </div>
      </header>
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* ── fil d'ariane + date ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <input
          type="date"
          value={dateCourante}
          onChange={(e) => allerA(e.target.value)}
          style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
          Bahja TURF › {m.hippodrome} › R{m.num}-C{c.numOrdre}
        </span>
      </div>

      {/* ── toutes les courses du jour (le programme reu.php, archivé) ── */}
      {programme?.reunions?.length ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Toutes les courses du {dateCourante} :</span>
          <select key={fetchIdRef.current} defaultValue={`${m.hippodrome}|C${c.numOrdre}|${new URLSearchParams(location.search).get('pays') || 'FRANCE'}`}
            onChange={(e) => { const [hh, cc, pp] = e.target.value.split('|'); allerCourseSel(hh, cc, pp) }}
            style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, maxWidth: '100%' }}>
            {programme.reunions.map((r) => (
              <optgroup key={r.hippodrome} label={`${r.hippodrome} (${r.courses.length})`}>
                {r.courses.map((cc) => (
                  <option key={cc.code} value={`${r.hippodrome}|${cc.code}|${cc.pays}`}>
                    {cc.reunion}-{cc.code} · {heureGMT(dateCourante, cc.heure)} · {cc.nom.slice(0, 44)}{cc.pays !== 'FRANCE' ? ` · ${cc.pays}` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      ) : null}
      {/* ── notre archive : export / import ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, fontSize: 11, color: '#64748b' }}>
        <span>🗄 {taille.courses} courses + {taille.programmes} jours chez nous</span>
        <button onClick={exporter} style={{ padding: '3px 10px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff', fontSize: 11, cursor: 'pointer' }}>⬇ Exporter</button>
        <button onClick={() => inputArchiveRef.current?.click()} style={{ padding: '3px 10px', borderRadius: 7, border: '1px solid #cbd5e1', background: '#fff', fontSize: 11, cursor: 'pointer' }}>⬆ Importer</button>
        <input ref={inputArchiveRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={importer} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        {/* ── le titre ── */}
        <h1 style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3, margin: 0 }}>
          R{m.num}-C{c.numOrdre} | {(c.prix || c.nom || 'Course').toUpperCase()}
          {c.distance ? ' - ' + c.distance + 'm' : ''}{c.surface ? ' ' + c.surface : ''}
        </h1>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          {c.dateLongue || dateCourante}
          {c.heure ? ' • ' + heureGMT(dateCourante, c.heure) : ''}
          {m.pays && m.pays !== 'FR' ? ' • 🌍 ' : ' • 🇫🇷 '}{m.hippodrome}
          {' • '}{partants.length}{' partants'}
          {c.distance ? ' • ' + c.distance + 'm' : ''}
          {c.discipline ? ' • ' + c.discipline : ''}
          {meteo && meteo.temp != null ? ` • ${meteo.temp}° ${meteo.label || ''}` : ''}
        </div>
        {/quinte\+/i.test((c.nom || '') + ' ' + (c.prix || '')) ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-block', transform: 'skewX(-14deg)', borderRadius: 3, padding: '2px 10px', color: '#fff', fontWeight: 800, fontSize: 11, background: '#b91c1c', boxShadow: '0 1px 2px rgba(0,0,0,.25)', textShadow: '0 1px 1px rgba(0,0,0,.35)' }}>
              <span style={{ display: 'inline-block', transform: 'skewX(14deg)' }}>Quinté+</span>
            </span>
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {c.classe ? <span className="badge">{c.classe}</span> : null}
          {c.corde ? <span className="badge">Corde : {c.corde}</span> : null}
          {c.montant ? <span className="badge">{c.montant.toLocaleString('fr-FR')} €</span> : null}
          {c.discipline ? <span className="badge">{c.discipline}</span> : null}
          {c.statut ? <span className="badge">{c.statut}</span> : null}
        </div>

        {c.arrivee && c.arrivee.length > 0 ? (
          <div style={{ marginTop: 10, background: '#111111', border: '1px solid #d4af37', padding: 8, borderRadius: 8, fontSize: 13 }}>
            <b style={{ color: '#f5d76e' }}>
              Arrivée : {c.arrivee.map((a) => (Array.isArray(a) ? a.join('-') : a)).join(' - ')}
            </b>
          </div>
        ) : null}

        {/* ── la table des partants ── */}
        {partants.length > 0 ? (
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(90deg,#09090b,#27272a)', color: '#f5d76e', padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>
              Partants ({partants.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                    <th style={{ padding: 8 }}>N°</th>
                    <th style={{ padding: 8 }}>Cas.</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Cheval</th>
                    <th style={{ padding: 8 }}>Jockey</th>
                    <th style={{ padding: 8 }}>Entraîneur</th>
                    <th style={{ padding: 8 }}>Corde</th>
                    <th style={{ padding: 8 }}>Cote</th>
                    <th style={{ padding: 8 }}>Cote Réf.</th>
                    <th style={{ padding: 8 }}>Musique</th>
                    <th style={{ padding: 8 }}>Chrono</th>
                    <th style={{ padding: 8 }}>%Pod.</th>
                    <th style={{ padding: 8 }}>%Vic.</th>
                    <th style={{ padding: 8 }}>2e</th>
                    <th style={{ padding: 8 }}>3e</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>Gains</th>
                    <th style={{ padding: 8 }}>Valeur</th>
                    <th style={{ padding: 8 }}>Poids</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Propriétaire</th>
                    <th style={{ padding: 8 }}>Dern.</th>
                  </tr>
                </thead>
                <tbody>
                  {classement.map(({ p, rang }) => (
                    <tr key={p.num} style={{ borderTop: '1px solid #f1f5f9', background: p.depart <= 8 ? '#fef9e7' : '#fff' }}>
                      <td style={{ padding: 8, fontWeight: 800, textAlign: 'center', color: '#b91c1c' }}>{p.num}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.silk ? <img src={p.silk} alt="" style={{ width: 22, height: 22 }} /> : SANS}</td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{p.cheval || SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.driver || SANS}{p.coteRefJockey ? <span style={{ color: '#94a3b8' }}> ({p.coteRefJockey})</span> : null}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.entraineur || SANS}{p.coteRefEntraineur ? <span style={{ color: '#94a3b8' }}> ({p.coteRefEntraineur})</span> : null}</td>
                      <td style={{ padding: 8, textAlign: 'center', fontWeight: 800, color: p.depart <= 8 ? '#92400e' : '#94a3b8' }}>{p.depart ?? p.def ?? SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>{p.cote ?? SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.coteRef ?? SANS}</td>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>
                        {p.musique || formeCourte(p) || SANS}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.chrono || SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{pctPodium(p) != null ? pctPodium(p) + '%' : SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{pctVictoire(p) != null ? pctVictoire(p) + '%' : SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{nbCourses(p) ? nb2e(p) : SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{nbCourses(p) ? nb3e(p) : SANS}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>{p.gains != null ? p.gains.toLocaleString('fr-FR') : SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.valeur ?? SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.poids ?? SANS}</td>
                      <td style={{ padding: 8, fontSize: 11 }}>{p.proprietaire || SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.dernierPassage != null ? p.dernierPassage + 'j' : SANS}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ── aptitudes : Courses · Victoires · Placés ── */}
        {aptitudes.length ? (
          <div style={{ marginTop: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(90deg,#09090b,#27272a)', color: '#f5d76e', padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Aptitudes — Courses · Victoires · Placés</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                    <th style={{ padding: 8 }}>N°</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>Cheval</th>
                    <th style={{ padding: 8 }}>Courses</th>
                    <th style={{ padding: 8 }}>Vict.</th>
                    <th style={{ padding: 8 }}>Placés</th>
                    <th style={{ padding: 8 }}>%V</th>
                    <th style={{ padding: 8 }}>%P</th>
                    <th style={{ padding: 8 }}>Apt.G</th>
                    <th style={{ padding: 8 }}>Apt.P</th>
                  </tr>
                </thead>
                <tbody>
                  {aptitudes.map((a) => (
                    <tr key={a.num} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 8, fontWeight: 800, textAlign: 'center', color: '#b91c1c' }}>{a.num}</td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{a.cheval}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{a.courses ?? '—'}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{a.victoires}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{a.places}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{a.pctV ?? '—'}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{a.pctP ?? '—'}</td>
                      <td style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>{a.aptG ?? '—'}</td>
                      <td style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>{a.aptP ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {synthesePct ? (
          <div style={{ marginTop: 8, background: '#111111', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
            <b style={{ color: '#f5d76e' }}>Synthèse des % : {synthesePct}</b>
          </div>
        ) : null}

        {/* ── les 18 lignes de turf-france ── */}
        <h2 style={{ marginTop: 18, fontSize: 15, fontWeight: 800, color: '#111111', borderBottom: '2px solid #d4af37', paddingBottom: 6 }}>
          Etudes, Analyses, Synthèse et Pronostics
        </h2>
        <div style={{ marginTop: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(90deg,#09090b,#27272a)', color: '#f5d76e', padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>
            Top10 des Cotes de Références
          </div>
          <div style={{ padding: 12 }}>
            {/* ⚠ les 18 lignes restent TOUJOURS affichées, même vides : on voit
                ce que turf-france publie réellement ce jour-là, et ce qu'il ne
                publie pas. Une ligne vide vaut mieux qu'une ligne absente. */}
            {LIGNES_TOPS.map(([label, cleTops]) => {
              const valeur = j(tops[cleTops])
              return (
                <div key={label} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ minWidth: 180, fontWeight: 700, color: '#334155' }}>{label}</span>
                  <span style={{
                    flex: 1, fontWeight: valeur ? 700 : 400,
                    color: valeur ? '#0f172a' : '#cbd5e1', fontStyle: valeur ? 'normal' : 'italic',
                  }}>{valeur || SANS}</span>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 10, padding: '8px 0', background: '#111111', marginTop: 6, paddingLeft: 12, borderRadius: 6 }}>
              <span style={{ minWidth: 180, fontWeight: 800, color: '#f5d76e' }}>La Synthèse</span>
              <b style={{ color: '#f5d76e' }}>{j(tops.syntheseTf) || SANS}</b>
            </div>
          </div>
        </div>

        {pronosTf.length ? (
          <div style={{ marginTop: 14, background: '#faf5f0', border: '1px solid #d4af37', padding: 12, borderRadius: 12 }}>
            <h3 style={{ color: '#7f1d1d', margin: 0, fontSize: 15 }}>Pronostic</h3>
            {pronosTf.map((pr, i) => (
              <div key={i} style={{ marginTop: 6, background: '#fff', border: '1px solid #e7e0cf', padding: 8, borderRadius: 8, fontWeight: 800, color: '#7f1d1d' }}>
                ► {pr}
              </div>
            ))}
          </div>
        ) : null}

        {/* ── les pronostics ── */}
        <div style={{ marginTop: 14, background: 'linear-gradient(135deg,#000000,#450a0a)', color: '#fff', padding: 14, borderRadius: 12 }}>
          <h3 style={{ color: '#fde68a', margin: 0, fontSize: 15 }}>Pronostic LBAHJA TURF</h3>
          {pronostics && (pronostics.prono1 || pronostics.prono2 || pronostics.prono3) ? (
            <>
              <div style={{ marginTop: 8, background: '#fff', color: '#991b1b', padding: 10, borderRadius: 8, fontWeight: 800 }}>
                ► {pronostics.prono1 || SANS}
              </div>
              <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.12)', padding: 10, borderRadius: 8, fontWeight: 800 }}>
                ► {pronostics.prono2 || SANS}
              </div>
              <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.12)', padding: 10, borderRadius: 8, fontWeight: 800, border: '1px solid #fb9234' }}>
                ► {pronostics.prono3 || SANS}
              </div>
              {pronostics._updated_at ? (
                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.8 }}>
                  mis à jour : {new Date(pronostics._updated_at).toLocaleString('fr-FR')}
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.12)', padding: 10, borderRadius: 8, fontSize: 13 }}>
              Aucun pronostic enregistré pour cette course.
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}