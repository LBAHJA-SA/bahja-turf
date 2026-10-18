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
import Entete from '../../src/Entete.jsx'
import Drapeau from '../../src/Drapeau.jsx'
import ParisListe from '../../src/Paris.jsx'
import { useState, useEffect, useRef, useCallback } from 'react'
import { lireCible, chargerCourse, chargerPronos, chargerMeteo, chargerProgramme } from '../../backend/ARTICLE/backend.js'
import { exporterArchive, importerArchive, tailleArchive } from '../../backend/ARTICLE/archive.js'
import { chargerTopsTurfFrance, offsetJour, slugNorm, heureGMT } from '../../backend/ARTICLE/turfFrance.js'
import { jourHeureGMT, hhmmGMT } from '../../src/temps.js'
import { pctPodium, pctVictoire, nb2e, nb3e, nbCourses, formeCourte, classerPartants } from '../../backend/ARTICLE/score.js'

/** Les 19 lignes de « Top10 des Cotes de Références », dans l'ordre de la source. */
const LIGNES_TOPS = [
  ['Chevaux :',        'top10chevaux'],
  ['Drivers :',        'top10drivers'],
  ['Entraineurs :',    'top10entraineurs'],
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
    /* ⚠ 16/10/2026 — LES TABLEAUX SE RELISENT À LA SOURCE, toujours.
     *   Le parseur a été corrigé (les 3 lignes du « Top10 des Cotes de
     *   Références » étaient lues sous le mauvais nom, et « Aptitude 1er »
     *   n'avait pas d'alias) : l'archive du navigateur gardait les anciens
     *   tableaux et la page continuait d'afficher des lignes vides. On
     *   affiche d'abord l'archive (instantané), puis la source prend la
     *   main dès qu'elle répond. Si elle ne répond pas, l'archive reste —
     *   même date que la course, jamais `date=0` en dur. */
    const off = offsetJour(cible.date)
    chargerTopsTurfFrance(off, cible.date)
      .then((t) => { if (t && Object.keys(t).length) setTops(t) })
      .catch(() => setSource((data.source || 'source') + ' · tops : archive locale'))
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
      <Entete page="article" />
      <div style={{ textAlign: 'center', padding: 40, fontSize: 13 }}>Chargement de la course…</div>
    </>)
  }

  if (etat === 'erreur') {
    return (
      <>
      {/* ── bandeau : logo + navigation. Les moteurs/sources restent privés à chaque page ── */}
      <Entete page="article" />
      <div style={{ maxWidth: 700, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ background: 'rgba(244,63,94,.10)', border: '1px solid rgba(244,63,94,.40)', borderRadius: 12, padding: 24 }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#fda4af', margin: '0 0 8px' }}>
            Cette course n'est pas disponible
          </h1>
          <p style={{ fontSize: 13, color: '#fecdd3', margin: '0 0 6px' }}>
            <b>{fetchIdRef.current}</b> — course indisponible pour le moment.
          </p>
          <p style={{ fontSize: 12, color: '#fda4af', margin: 0 }}>
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
    /* ⭐ EN GMT (18/10/2026) : un instant se lit en UTC — voir `src/temps.js`.
       (Une heure murale sans fuseau reste affichée telle quelle : on ne devine
       pas une zone qu'on ne connaît pas.) */
    const h = hhmmGMT(t)
    return h ? h + ' GMT' : String(t).slice(0, 5)
  }

  return (
    <>
      {/* ── bandeau : logo + navigation. Les moteurs/sources restent privés à chaque page ── */}
      <Entete page="article" />
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      {/* ── fil d'ariane + date ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <input
          type="date"
          value={dateCourante}
          onChange={(e) => allerA(e.target.value)}
          style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(125,205,255,.28)', background: 'rgba(255,255,255,.05)', color: '#e7f1ff', fontSize: 12 }}
        />
        <span style={{ fontSize: 11, color: '#8fa3bf', marginLeft: 'auto' }}>
          Bahja TURF › {m.hippodrome} › R{m.num}-C{c.numOrdre}
        </span>
      </div>

      {/* ── toutes les courses du jour (le programme reu.php, archivé) ── */}
      {programme?.reunions?.length ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#c7d6ea' }}>Toutes les courses du {dateCourante} :</span>
          <select key={fetchIdRef.current} defaultValue={`${m.hippodrome}|C${c.numOrdre}|${new URLSearchParams(location.search).get('pays') || 'FRANCE'}`}
            onChange={(e) => { const [hh, cc, pp] = e.target.value.split('|'); allerCourseSel(hh, cc, pp) }}
            style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(125,205,255,.28)', background: 'rgba(255,255,255,.05)', color: '#e7f1ff', fontSize: 12, maxWidth: '100%' }}>
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
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, fontSize: 11, color: '#9fb3d1' }}>
        <span>🗄 {taille.courses} courses + {taille.programmes} jours chez nous</span>
        <button onClick={exporter} style={{ padding: '3px 10px', borderRadius: 7, border: '1px solid rgba(125,205,255,.28)', background: 'rgba(255,255,255,.05)', color: '#e7f1ff', fontSize: 11, cursor: 'pointer' }}>⬇ Exporter</button>
        <button onClick={() => inputArchiveRef.current?.click()} style={{ padding: '3px 10px', borderRadius: 7, border: '1px solid rgba(125,205,255,.28)', background: 'rgba(255,255,255,.05)', color: '#e7f1ff', fontSize: 11, cursor: 'pointer' }}>⬆ Importer</button>
        <input ref={inputArchiveRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={importer} />
      </div>

      <div className="card" style={{ padding: 20 }}>
        {/* ── le titre ── */}
        <h1 style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3, margin: 0 }}>
          R{m.num}-C{c.numOrdre} | {(c.prix || c.nom || 'Course').toUpperCase()}
          {c.distance ? ' - ' + c.distance + 'm' : ''}{c.surface ? ' ' + c.surface : ''}
        </h1>
        <div style={{ fontSize: 12, color: '#9fb3d1', marginTop: 4 }}>
          {c.dateLongue || dateCourante}
          {c.heure ? ' • ' + heureGMT(dateCourante, c.heure) : ''}
          {' • '}
          {/* le drapeau du pays, en VRAIE image (pas d'emoji : Windows ne les
              dessine pas) */}
          <Drapeau pays={m.pays || 'FR'} titre={m.pays || 'France'} h={12}
            style={{ display: 'inline-block', verticalAlign: '-2px' }} />
          {' '}{m.hippodrome}
          {' • '}{partants.length}{' partants'}
          {c.distance ? ' • ' + c.distance + 'm' : ''}
          {c.discipline ? ' • ' + c.discipline : ''}
          {meteo && meteo.temp != null ? ` • ${meteo.temp}° ${meteo.label || ''}` : ''}
        </div>
        {/quinte\+/i.test((c.nom || '') + ' ' + (c.prix || '')) ? (
          /* la pastille rouge du carnet — le même composant que partout (§src/Paris.jsx) */
          <div style={{ marginTop: 10 }}>
            <ParisListe paris={['quinte']} />
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
          <div style={{ marginTop: 16, background: 'rgba(12,20,37,.66)', border: '1px solid rgba(125,205,255,.22)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(90deg,#09090b,#27272a)', color: '#f5d76e', padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>
              Partants ({partants.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'rgba(34,211,238,.10)', color: '#9fb3d1' }}>
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
                    <tr key={p.num} style={{ borderTop: '1px solid rgba(255,255,255,.07)', background: p.depart <= 8 ? 'rgba(251,191,36,.10)' : 'transparent' }}>
                      <td style={{ padding: 8, fontWeight: 800, textAlign: 'center', color: '#fda4af' }}>{p.num}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.silk ? <img src={p.silk} alt="" style={{ width: 22, height: 22 }} /> : SANS}</td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{p.cheval || SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.driver || SANS}{p.coteRefJockey ? <span style={{ color: '#8fa3bf' }}> ({p.coteRefJockey})</span> : null}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.entraineur || SANS}{p.coteRefEntraineur ? <span style={{ color: '#8fa3bf' }}> ({p.coteRefEntraineur})</span> : null}</td>
                      <td style={{ padding: 8, textAlign: 'center', fontWeight: 800, color: p.depart <= 8 ? '#fbbf24' : '#8fa3bf' }}>{p.depart ?? p.def ?? SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center', fontWeight: 700 }}>{p.cote ?? SANS}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.coteRef ?? SANS}</td>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11, color: '#9fb3d1' }}>
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
          <div style={{ marginTop: 14, background: 'rgba(12,20,37,.66)', border: '1px solid rgba(125,205,255,.22)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(90deg,#09090b,#27272a)', color: '#f5d76e', padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Aptitudes — Courses · Victoires · Placés</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'rgba(34,211,238,.10)', color: '#9fb3d1' }}>
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
                    <tr key={a.num} style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
                      <td style={{ padding: 8, fontWeight: 800, textAlign: 'center', color: '#fda4af' }}>{a.num}</td>
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

        {/* ── les 18 lignes publiées par la source, habillées « LBAHJA-TURF » ── */}
        <h2 style={{ marginTop: 18, fontSize: 15, fontWeight: 800, color: '#f5d76e', borderBottom: '2px solid rgba(212,175,55,.55)', paddingBottom: 6 }}>
          Etudes, Analyses, Synthèse et Pronostics
        </h2>
        <div style={{ marginTop: 10, background: 'rgba(12,20,37,.66)', border: '1px solid rgba(125,205,255,.22)', borderRadius: 12, overflow: 'hidden' }}>
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
                <div key={label} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                  <span style={{ minWidth: 180, fontWeight: 700, color: '#c7d6ea' }}>{label}</span>
                  <span style={{
                    flex: 1, fontWeight: valeur ? 700 : 400,
                    color: valeur ? '#e7f1ff' : '#6d82a2', fontStyle: valeur ? 'normal' : 'italic',
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
          <div style={{ marginTop: 14, background: 'rgba(251,191,36,.06)', border: '1px solid #d4af37', padding: 12, borderRadius: 12 }}>
            <h3 style={{ color: '#fecdd3', margin: 0, fontSize: 15 }}>Pronostic</h3>
            {pronosTf.map((pr, i) => (
              <div key={i} style={{ marginTop: 6, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(251,191,36,.30)', padding: 8, borderRadius: 8, fontWeight: 800, color: '#fde68a' }}>
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
              <div style={{ marginTop: 8, background: 'rgba(255,255,255,.06)', color: '#fda4af', padding: 10, borderRadius: 8, fontWeight: 800 }}>
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
                  mis à jour : {jourHeureGMT(pronostics._updated_at)}
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