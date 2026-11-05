import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Entete from '../../src/Entete.jsx'
import Drapeau from '../../src/Drapeau.jsx'
import { hhmmGMT, heureGMT, heureParisGMT } from '../../src/temps.js'
import {
  fetchRecapSite, fetchArchiveDisque,
  buildGrid, classerPartants, classerPhysique, remplirGrille, GROUPES, quotasEffectifs,
  scorePhysique, filtres, ordonnerParStats, ordonnerTicket, ticketValide, ticketAffiche,
  saveArchive, listArchive, deleteArchive, attachResult, attachTicket,
  loadCarriere, syncDepuisDisque, getArchive,
  clearArchive,
  computeStats, aujourdhui, siteCorrespondALaDate, chargerCourseCC,
  fetchCotes,
  rangsMarche, bandeMarche, BANDE_MARCHE, fetchFiabilite, fetchEcarts, fetchChoix,
  fetchEmpreinte, fetchBlocPm, fetchBassmat, formeMarche, fetchHuit, fetchBassmatChoix, ticketBassmat,
  fetchBassmatMois, jugerTicket, fetchDeparts,
} from '../../src/lib/quinte'
import { chargerDetailReu } from '../../backend/ARTICLE/turfFrance.js'

const SK = {
  fond: '#0b0f17',
  carte: 'rgba(15,23,35,.85)',
  bord: 'rgba(255,255,255,.10)',
  bordFort: 'rgba(255,255,255,.25)',
  ligne: 'rgba(255,255,255,.06)',
  texte: '#f8fafc',
  texteSecond: '#94a3b8',
  muet: '#64748b',
  accent: '#22d3ee',
  accentClair: 'rgba(34,211,238,.15)',
  bon: '#34d399',
  moyen: '#fbbf24',
  mauvais: '#fb7185',
  ombre: '0 10px 30px rgba(0,0,0,.55)',
  ombreCard: '0 4px 16px rgba(0,0,0,.35)',
  police: 'system-ui, -apple-system, sans-serif',
  nb: 'ui-monospace, Consolas, monospace',
}

const DISC_ICON = { plat: '🏇', attelé: '🐎', monté: '🐴', haies: '🏁' }
const DISC_NOM = { plat: 'Plat', attelé: 'Attelé', monté: 'Monté', haies: 'Haies' }
const DISC_COULEUR = { plat: '#22d3ee', attelé: '#f59e0b', monté: '#f59e0b', haies: '#a855f7' }

const normDisc = (d) => {
  const s = String(d || '').toLowerCase().trim()
  if (s.startsWith('plat')) return 'plat'
  if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
  if (s.startsWith('mont')) return 'monté'
  if (s.startsWith('haie') || s.startsWith('steeple')) return 'haies'
  return 'plat'
}
const DISC_TXT = (d) => { const n = normDisc(d); return `${DISC_ICON[n]} ${DISC_NOM[n]}` }
const DISC_COL = (d) => DISC_COULEUR[normDisc(d)]

const ETAT_ICON = { chaude: '🔴', tiède: '🟡', froide: '🔵' }
const ETAT_TXT = { chaude: 'Chaude', tiède: 'Tiède', froide: 'Froide' }

const pc = (x) => (x == null ? '—' : String(x).replace('.', ','))
const nb = (x) => (x == null ? '—' : String(x).replace('.', ','))

const chevalColor = (num) => {
  const h = num % 360
  return `hsl(${h}, 70%, 55%)`
}

const CarteCheval = ({ num, nom, distance, cote, soie, etat, pris }) => {
  const co = chevalColor(num)
  const et = etat ? ETAT_ICON[etat] : ''
  return (
    <div
      style={{
        background: 'rgba(20,30,45,.85)',
        border: `1px solid ${SK.bord}`,
        borderLeft: `4px solid ${co}`,
        borderRadius: 12,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: SK.ombreCard,
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: '50%',
          background: co, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 16, fontFamily: SK.nb,
          boxShadow: '0 3px 8px rgba(0,0,0,.35)',
        }}
      >
        {num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc', fontFamily: SK.nb }}>{num}</span>
          {et && <span style={{ fontSize: 13 }}>{et}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nom || '—'}
        </div>
        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {distance && <span>📏 {distance}m</span>}
          {soie && <span style={{ color: soie, fontWeight: 800 }}>{soie}</span>}
          {cote != null && <span style={{ color: SK.accent, fontWeight: 700 }}>{nb(cote)}</span>}
        </div>
      </div>
      {pris && <span style={{ color: SK.bon, fontWeight: 900, fontSize: 13 }}>✓</span>}
    </div>
  )
}

const CarteInfo = ({ titre, texte, couleur, icone, num, cote, sous }) => (
  <div
    style={{
      background: 'rgba(20,30,45,.85)',
      border: `1px solid ${SK.bord}`,
      borderLeft: `4px solid ${couleur}`,
      borderRadius: 12,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: SK.ombreCard,
    }}
  >
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: couleur, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>
      {icone}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', letterSpacing: .4 }}>{titre}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>{texte}</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
      {num != null && <span style={{ fontFamily: SK.nb, fontWeight: 900, fontSize: 16, color: '#f8fafc' }}>{num}</span>}
      {cote != null && <span style={{ fontSize: 10.5, color: SK.accent, fontWeight: 800 }}>{nb(cote)}</span>}
      {sous && <span style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700 }}>{sous}</span>}
    </div>
  </div>
)

const CarteTicket = ({ nums, noms, cotes, discipl, count }) => (
  <div
    style={{
      background: 'rgba(20,30,45,.88)',
      border: `1px solid ${SK.bordFort}`,
      borderRadius: 16,
      padding: '16px 18px',
      boxShadow: SK.ombre,
      marginBottom: 16,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', background: SK.accent, color: '#0b0f17', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>🎫</span>
        <span style={{ fontWeight: 900, fontSize: 15, color: '#f8fafc', letterSpacing: .5 }}>TICKET DU QUINTÉ</span>
      </div>
      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 800, background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 999 }}>{count} chevaux</span>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
      {(Array.isArray(nums) ? nums : []).map((n) => (
        <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: 70 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: chevalColor(n), color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 16, fontFamily: SK.nb,
              boxShadow: '0 4px 12px rgba(0,0,0,.45)',
              border: '2px solid rgba(255,255,255,.2)',
            }}
          >
            {n}
          </div>
          <span style={{ fontSize: 9.5, color: '#cbd5e1', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{noms?.[n] || n}</span>
          {cotes?.[n] != null && <span style={{ fontSize: 10, color: '#fbbf24', fontWeight: 800 }}>{nb(cotes?.[n])}</span>}
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${SK.ligne}`, fontSize: 10.5, color: '#94a3b8' }}>
      <span>Quinté+ — {discipl ? DISC_TXT(discipl) : ''}</span>
      <span>Synthèse : {nums.join(' · ')}</span>
    </div>
  </div>
)

export default function QuinteGrille() {
  const [date, setDate] = useState(aujourdhui())
  const [syn, setSyn] = useState(null)
  const [participants, setParticipants] = useState([])
  const [arrivee, setArrivee] = useState(null)
  const [courseId, setCourseId] = useState(null)
  const [cle, setCle] = useState(null)
  const [infos, setInfos] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [onglet, setOnglet] = useState('grille')
  const s = { box: SK.box, hdr: SK.hdrStyle, th: SK.th, td: SK.td }
  const [toutLesP, setToutLesP] = useState(true)
  const [statsDiscipline, setStatsDiscipline] = useState('all')
  const [bassmatDiscipline, setBassmatDiscipline] = useState('all')
  const [statsTrot, setStatsTrot] = useState('all')
  const [archive, setArchive] = useState([])
  const [carriere, setCarriere] = useState({})
  const [cotes, setCotes] = useState({})
  const [fiabilite, setFiabilite] = useState(null)
  const [ecarts, setEcarts] = useState(null)
  const [choix, setChoix] = useState(null)
  const [departs, setDeparts] = useState(null)
  const [bassmat, setBassmat] = useState(null)
  const [huit, setHuit] = useState(null)
  const [bassmatChoix, setBassmatChoix] = useState(null)
  const [bassmatMois, setBassmatMois] = useState(null)
  const [ticketManuel, setTicketManuel] = useState(null)
  const [busyResultat, setBusyResultat] = useState(false)

  useEffect(() => { document.title = 'Quinté — Bahja TURF' }, [])

  useEffect(() => {
    fetchFiabilite().then((x) => x && setFiabilite(x)).catch(() => {})
    fetchEcarts().then((x) => x && setEcarts(x)).catch(() => {})
    fetchChoix().then((x) => x && setChoix(x)).catch(() => {})
    fetchDeparts().then((x) => x && setDeparts(x)).catch(() => {})
    fetchEmpreinte().then((x) => x && setEmpreinte(x)).catch(() => {})
    fetchBlocPm().then((x) => x && setBlocPm(x)).catch(() => {})
    fetchBassmat().then((x) => x && setBassmat(x)).catch(() => {})
    fetchHuit().then((x) => x && setHuit(x)).catch(() => {})
    fetchBassmatChoix().then((x) => x && setBassmatChoix(x)).catch(() => {})
    fetchBassmatMois().then((x) => x && setBassmatMois(x)).catch(() => {})
  }, [])

  useEffect(() => {
    ;(async () => {
      setBusy(true)
      try {
        const [s, p, a] = await Promise.all([
          fetchRecapSite(date),
          chargerCourseCC(date),
          fetchArchiveDisque(date),
        ])
        setSyn(s)
        setParticipants(Array.isArray(p?.partants) ? p.partants : [])
        setArrivee(a?.arrivee || null)
        setInfos(p)
        if (p?.race) {
          setCourseId(p.race.id || null)
          setCle(`${date}_R${p.race.r || 1}_C${p.race.c || 1}`)
        }
      } catch (e) {
        setMsg(e.message)
      } finally {
        setBusy(false)
      }
    })()
  }, [date])

  const grille = useMemo(() => {
    if (!syn || !syn.synthese?.length) return null
    return buildGrid(syn.synthese, participants.map((x) => x.num).filter(Boolean))
  }, [syn, participants])

  const rempli = useMemo(() => {
    if (!grille) return null
    const classem = classerPartants(Array.isArray(participants) ? participants : [], infos && infos.discipline ? infos.discipline : 'PLAT')
    return remplirGrille(grille, classem, infos?.discipline || 'PLAT', cotes, null)
  }, [grille, participants, cotes, infos?.discipline])

  const chevalDuJour = useMemo(() => {
    if (!rempli) return null
    const ticket = rempli.ticket || []
    if (!ticket.length) return null
    const n = ticket[0]
    const c = participants.find((x) => x.num === n)
    return {
      num: n,
      nom: c?.nom || `Cheval ${n}`,
      cote: cotes?.[n],
      coteOuvert: c?.coteRef,
      forme: c?.forme,
      dist: c?.distance,
    }
  }, [rempli, participants, cotes])

  const valeurDuJour = useMemo(() => {
    if (!rempli) return null
    const t = Array.isArray(rempli.ticket) ? rempli.ticket : []
    if (t.length < 2) return null
    const n = t[1]
    const c = participants.find((x) => x.num === n)
    return {
      num: n,
      nom: c?.nom || `Cheval ${n}`,
      cote: cotes?.[n],
    }
  }, [rempli, participants, cotes])

  const avertDuJour = useMemo(() => {
    if (!rempli) return null
    const t = rempli.ticket || []
    const n = t[t.length - 1]
    const c = participants.find((x) => x.num === n)
    return {
      num: n,
      nom: c?.nom || `Cheval ${n}`,
      cote: cotes?.[n],
      raison: 'maillon faible du ticket',
    }
  }, [rempli, participants, cotes])

  const carnet = rempli ? rempli.carnet : null

  return (
    <div style={{ minHeight: '100vh', background: SK.fond, color: SK.texte, fontFamily: SK.police, padding: '16px 16px 56px' }}>
      <Entete page="quinte" />

      {msg && (
        <div style={{ background: 'rgba(244,63,94,.15)', border: '1px solid rgba(244,63,94,.4)', borderRadius: 10, padding: '12px 14px', color: '#fecaca', fontSize: 12.5, marginBottom: 12 }}>
          {msg}
        </div>
      )}
      {!syn || !syn.synthese?.length && (
        <div style={{ background: SK.carte, border: `1px solid ${SK.bord}`, borderRadius: 12, padding: '16px', color: '#94a3b8', fontSize: 13, marginBottom: 14 }}>
          Aucun Quinté trouvé pour cette date.
        </div>
      )}

      {syn?.synthese?.length && (
        <div style={{ background: SK.carte, border: `1px solid ${SK.bord}`, borderRadius: 14, padding: '16px 18px', boxShadow: SK.ombreCard, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1 }}>LES CONDITIONS DE LA COURSE</b>
            {infos?.discipline && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 11, color: '#94a3b8', background: 'rgba(255,255,255,.05)', padding: '2px 8px', borderRadius: 999 }}>{DISC_TXT(infos.discipline)}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12.5, color: '#e7f1ff' }}>
              <b style={{ color: '#f8fafc' }}>{infos?.date_formatted || date}</b>{'   ·   '}
              {infos?.hippodrome || ''}
              {infos?.code ? `  ·  ${infos.code}` : ''}
              <br />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>{infos?.name || infos?.hippodrome}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {infos?.distance && <span style={{ background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 999, fontSize: 11, color: '#cbd5e1' }}>{infos.distance}m</span>}
              {infos?.terrain && <span style={{ background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 999, fontSize: 11, color: '#cbd5e1' }}>{infos.terrain}</span>}
              {infos?.corde && <span style={{ background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 999, fontSize: 11, color: '#cbd5e1' }}>{infos.corde}</span>}
            </div>
          </div>
        </div>
      )}

      {syn?.synthese?.length && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: 14 }}>
          {chevalDuJour && (
            <CarteInfo
              titre="PULSATION DU JOUR"
              texte={`Le ${chevalDuJour.nom} (n°${chevalDuJour.num}) est le premier du ticket moteur.`}
              couleur={SK.bon}
              icone="💡"
              num={chevalDuJour.num}
              cote={chevalDuJour.cote}
            />
          )}
          {valeurDuJour && (
            <CarteInfo
              titre="VALEUR DU JOUR"
              texte={`Le ${valeurDuJour.nom} (n°${valeurDuJour.num}) — rapport potentiel élevé.`}
              couleur={SK.moyen}
              icone="💎"
              num={valeurDuJour.num}
              cote={valeurDuJour.cote}
            />
          )}
          {avertDuJour && (
            <CarteInfo
              titre="MAILLON FAIBLE"
              texte={`Le ${avertDuJour.nom} (n°${avertDuJour.num}) est le maillon faible du ticket.`}
              couleur={SK.mauvais}
              icone="⚠️"
              num={avertDuJour.num}
              cote={avertDuJour.cote}
              sous="À surveiller"
            />
          )}
        </div>
      )}

      {carnet && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
            <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1 }}>CARNET DES CASES P1..P20</b>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 800, background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 999 }}>{toutLesP ? '20 cases' : 'P1-P5'}</span>
          </div>
          <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', paddingBottom: '20px', minWidth: 'max-content' }}>
              {carnet.cases.slice(0, toutLesP ? 5 : 20).map((c) => (
                <CarteCheval
                  key={c.num}
                  num={c.num}
                  nom={c.nom}
                  distance={c.distance}
                  cote={c.cote}
                  soie={c.soie}
                  etat={c.etat}
                  pris={c.pris}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {rempli?.ticket?.length && (
        <CarteTicket
          nums={rempli.ticket}
          noms={Object.fromEntries(participants.map((x) => [x.num, x.nom]))}
          cotes={cotes}
          discipl={infos?.discipline}
          count={rempli.ticket.length}
        />
      )}

      {fiabilite && (
        <div style={{ background: SK.carte, border: `1px solid ${SK.bord}`, borderRadius: 12, padding: '14px', marginBottom: 14, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          <b style={{ color: SK.accent }}>Fiabilité mesurée :</b> {fiabilite.payant ? `${fiabilite.payant}% PAYANTE` : '—'} ·{' '}
          {fiabilite.couvre ? `${fiabilite.couvre}% couvre +4` : ''}
        </div>
      )}
    </div>
  )
}