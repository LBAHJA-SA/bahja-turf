import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchRecapSite, fetchArchiveDisque,
  buildGrid, classerPartants, classerPhysique, remplirGrille, GROUPES, quotasEffectifs,
  scorePhysique, filtres,
  saveArchive, listArchive, deleteArchive, attachResult, attachTicket,
  loadCarriere, syncDepuisDisque,
  clearArchive,
  computeStats, aujourdhui, siteCorrespondALaDate, chargerCourseCC,
  fetchCotes,
} from '../../src/lib/quinte'

const s = {
  box: { border: '1px solid #d7dce5', borderRadius: 6, background: '#fff' },
  hdr: { background: '#0f172a', color: '#fff' },
  th: { padding: '5px 8px', fontSize: 12, fontWeight: 600 },
  td: { padding: '5px 8px', fontSize: 13 },
}

/* ═══════════════════════════════════════════════════════════════════════════
 * §IDENTITÉ VISUELLE — les quatre onglets ne doivent JAMAIS se confondre.
 *
 *   LA GRILLE → vert émeraude, cartes claires, cartes à l neurotransmitters
 *   LE TICKET → bleu nuit, tableur plat, chiffres monospace, zéro ombre
 *   ARCHIVE   → ambre parchemin, registre, police serif, bordures pleines
 *   STATS     → violet prune, tableau de bord, ombre violette, chiffres tabulaires
 *
 * Le composant reconstruit `s` (box/hdr/th/td) à chaque onglet : toutes les
 * tables, tous les cadres et tous les en-têtes suivent l'onglet actif.
 * ═══════════════════════════════════════════════════════════════════════════ */
const THEME = {
  grille: {
    titre: 'La grille',
    sousTitre: 'Les 16 cases du carnet · lecture en colonnes',
    fond: 'linear-gradient(180deg,#ecfdf5 0%,#f8fafc 60%,#ffffff 100%)',
    entete: 'linear-gradient(120deg,#065f46 0%,#047857 55%,#10b981 100%)',
    accent: '#047857', accentSombre: '#064e3b', accentClair: '#d1fae5',
    bord: '#6ee7b7', carte: '#ffffff', ligne: '#ffffff', alt: '#f0fdf4',
    on: '#a7f3d0', danger: '#fee2e2', texte: '#065f46', muted: '#7c9a8e',
    ombre: 'rgba(4,120,87,.35)', ombreD: '0 2px 10px rgba(4,120,87,.10)',
    police: 'system-ui, -apple-system, sans-serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid #6ee7b7', borderRadius: 12, background: '#ffffff' },
    hdrStyle: { background: 'linear-gradient(180deg,#047857,#064e3b)', color: '#ecfdf5' },
    th: { padding: '6px 9px', fontSize: 10, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: '#ecfdf5', fontFamily: 'system-ui, sans-serif' },
    td: { padding: '6px 9px', fontSize: 13 },
  },
  ticket: {
    titre: 'Le ticket',
    sousTitre: 'Les chevaux retenus et leurs scores',
    fond: 'linear-gradient(180deg,#eef2ff 0%,#f8fafc 55%,#ffffff 100%)',
    entete: 'linear-gradient(120deg,#1e293b 0%,#1e3a8a 60%,#3b82f6 100%)',
    accent: '#1d4ed8', accentSombre: '#1e3a8a', accentClair: '#dbeafe',
    bord: '#93c5fd', carte: '#ffffff', ligne: '#ffffff', alt: '#f1f5f9',
    on: '#bfdbfe', danger: '#fee2e2', texte: '#1e3a8a', muted: '#64748b',
    ombre: 'rgba(30,58,138,.30)', ombreD: 'none',
    police: 'system-ui, -apple-system, sans-serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid #1e3a8a', borderRadius: 2, background: '#ffffff' },
    hdrStyle: { background: 'linear-gradient(180deg,#1e3a8a,#0f172a)', color: '#dbeafe' },
    th: { padding: '7px 9px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#dbeafe', fontFamily: 'system-ui, sans-serif' },
    td: { padding: '7px 9px', fontSize: 13 },
  },
  archive: {
    titre: 'Archive',
    sousTitre: 'Le registre des Quintés · la mémoire de la méthode',
    fond: 'linear-gradient(180deg,#fef6e7 0%,#fdfaf4 60%,#fffdf8 100%)',
    entete: 'linear-gradient(120deg,#451a03 0%,#92400e 55%,#d97706 100%)',
    accent: '#b45309', accentSombre: '#78350f', accentClair: '#fef3c7',
    bord: '#d6a76a', carte: '#fffcf5', ligne: '#fffcf5', alt: '#fdf4e3',
    on: '#fde68a', danger: '#fee2e2', texte: '#78350f', muted: '#a1806a',
    ombre: 'rgba(120,53,15,.30)', ombreD: '0 2px 6px rgba(120,53,15,.14)',
    police: 'Georgia, "Times New Roman", serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '2px solid #92400e', borderRadius: 3, background: '#fffcf5' },
    hdrStyle: { background: 'linear-gradient(180deg,#92400e,#78350f)', color: '#fef3c7' },
    th: { padding: '7px 9px', fontSize: 11, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: '#fef3c7', fontFamily: 'Georgia, serif' },
    td: { padding: '7px 9px', fontSize: 13 },
  },
  stats: {
    titre: 'Statistiques',
    sousTitre: 'Ce que l’archive prouve — encore trop peu de courses',
    fond: 'linear-gradient(180deg,#f5f3ff 0%,#faf5ff 55%,#ffffff 100%)',
    entete: 'linear-gradient(120deg,#4c1d95 0%,#7e22ce 60%,#c084fc 100%)',
    accent: '#7c3aed', accentSombre: '#5b21b6', accentClair: '#ede9fe',
    bord: '#c4b5fd', carte: '#ffffff', ligne: '#ffffff', alt: '#faf5ff',
    on: '#ddd6fe', danger: '#fee2e2', texte: '#5b21b6', muted: '#8b7ba8',
    ombre: 'rgba(124,58,237,.35)', ombreD: '0 4px 16px rgba(124,58,237,.16)',
    police: 'system-ui, -apple-system, sans-serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid #c4b5fd', borderRadius: 16, background: '#ffffff' },
    hdrStyle: { background: 'linear-gradient(180deg,#7c3aed,#4c1d95)', color: '#ede9fe' },
    th: { padding: '8px 9px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: '#ede9fe', fontFamily: 'system-ui, sans-serif' },
    td: { padding: '8px 9px', fontSize: 13 },
  },
}

const TABS = [['grille', 'La grille'], ['ticket', 'Le ticket'], ['archive', 'Archive'], ['stats', 'Statistiques']]

function Boite({ n, pris, presse, couleur, score, cote, onClick }) {
  // boule 3D : dégradé radial + ombres portées/incrustées.
  // seul le NUMÉRO est visible — ni P ni groupe (secret du carnet).
  const c = couleur || { base: '#16a34a', sombre: false }
  const txt = c.sombre ? '#422006' : '#fff'
  return (
    <button
      onClick={onClick}
      title={
        (cote ? `cote ${cote}\n` : '') +
        (presse === false ? 'Non cité par la presse (ajouté à la suite)\n' : '') +
        (score ? `score ${score.global} · forme ${score.score} · série ${score.serie.join(' ')}` : 'données indisponibles')
      }
      style={{
        ...s.box,
        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.55), rgba(255,255,255,0) 46%), ${c.base}`,
        border: pris ? '3px solid #fff' : '1px solid rgba(0,0,0,.3)',
        boxShadow: pris
          ? `0 0 0 2px ${c.base}, 0 3px 8px rgba(0,0,0,.4)`
          : 'inset -4px -5px 8px rgba(0,0,0,.35), inset 3px 3px 6px rgba(255,255,255,.18), 0 2px 4px rgba(0,0,0,.3)',
        width: 54, height: 54, borderRadius: '50%',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 19, color: txt,
        position: 'relative',
      }}
    >
      {n}
      {pris && (
        <span style={{ position: 'absolute', top: 3, left: 7, fontSize: 12, fontWeight: 800, color: txt }}>✓</span>
      )}
      {cote != null && (
        <span style={{
          position: 'absolute', bottom: 2, right: 4, fontSize: 9, fontWeight: 800,
          color: txt, opacity: .95, textShadow: '0 1px 1px rgba(0,0,0,.35)', letterSpacing: -.2,
        }}>{String(cote).replace('.', ',')}</span>
      )}
      {presse === false && (
        <span style={{ position: 'absolute', bottom: 3, left: 7, fontSize: 10, fontWeight: 800, color: txt }} title="non cité par la presse">+</span>
      )}
    </button>
  )
}/* ══════════════════════════════════ LES CONDITIONS DE LA COURSE ══════════════
 * Tout vient de pro.casacourses.com/api/race/{id}. Les champs que la source ne
 * publie pas (tirelire, terrain, météo la veille) sont marqués « non publié » —
 * AGENTS.md §7 : on n'invente jamais une donnée absente.
 * ═══════════════════════════════════════════════════════════════════════════════ */
const FR = (x) => (x == null ? '—' : String(x))
const NON_PUBLIE = '— non publié'

/** 500000000 DH → 5 000 000 (la source stocke en centimes) */
function dotations(prize, devisee) {
  const n = Number(String(prize || '').replace(/[^0-9]/g, ''))
  if (!n) return NON_PUBLIE
  const v = n > 1e6 ? n / 100 : n
  return v.toLocaleString('fr-FR') + ' ' + (devisee || '')
}

function ConditionsCourse({ course, date, sk }) {
  if (!course) return null
  const c = course.raw || {}
  const piste = /psf/i.test(c.track_type || '') ? 'PSF'
    : c.track_type ? 'Herbe' : NON_PUBLIE

  const Ligne = ({ k, v, fort }) => (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, color: '#64748b', minWidth: 92 }}>{k}</span>
      <span style={{
        fontSize: 13,
        fontWeight: fort ? 800 : 500,
        color: v === NON_PUBLIE ? '#94a3b8' : '#0f172a',
        fontStyle: v === NON_PUBLIE ? 'italic' : 'normal',
      }}>{v}</span>
    </div>
  )

  return (
    <div style={{
      padding: 14, marginTop: 14, borderRadius: sk ? sk.box.borderRadius : 6,
      border: '1px solid ' + (sk ? sk.bord : '#d7dce5'),
      borderLeft: '5px solid ' + (sk ? sk.accent : '#0f172a'),
      background: sk ? sk.alt : '#f8fafc',
      boxShadow: sk ? sk.ombreD : 'none',
      fontFamily: sk ? sk.police : 'system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <b style={{ fontSize: 13, color: sk ? sk.accent : '#1d4ed8', letterSpacing: 1 }}>LES CONDITIONS DE LA COURSE</b>
        
      </div>

      <div style={{ marginTop: 8, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 12, color: '#475569' }}>
          <b style={{ color: '#0f172a' }}>{c.date_formatted || date}</b>
          {c.time ? ' · ' + c.time + ' h' : ''}
          {'   ·   '}
          {c.reunion_code ? <b style={{ color: '#0f172a' }}>{c.reunion_code}</b> : null}
          {course.hippodrome ? ' ' + course.hippodrome : ''}
          {c.code ? '  ·  ' + c.code : ''}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{c.name || course.hippodrome}</div>
        {c.class ? (
          <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 700 }}>
            {c.class}{c.class.toUpperCase().includes('GROUPE') ? ' — COURSE DE GROUPE' : ''}
          </div>
        ) : null}
        {c.allowance ? (
          <div style={{ fontSize: 11, color: '#64748b' }}>{c.allowance}</div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginTop: 8 }}>
        <div style={{ flex: '1 1 240px' }}>
          <Ligne k="Distance" v={course.distance ? `${course.distance} M` : NON_PUBLIE} fort />
          <Ligne k="Piste" v={piste} />
          <Ligne k="Corde" v={FR(c.track_type)} />
          <Ligne k="Terrain" v={FR(c.track_condition)} />
          <Ligne k="Discipline" v={FR(c.type)} fort />
        </div>
        <div style={{ flex: '1 1 240px' }}>
          <Ligne k="Partants" v={course.nbPartants ? String(course.nbPartants) : NON_PUBLIE} fort />
          <Ligne k="Allocations" v={dotations(c.prize, course.devisee)} />
          <Ligne k="Tirelire" v={NON_PUBLIE} />
          <Ligne k="Météo" v={c.weather_temp != null ? `${c.weather_temp}°C` : NON_PUBLIE} />
        </div>
      </div>

      {c.comment ? (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: '#1d4ed8', cursor: 'pointer' }}>
            Les conditions détaillées ({c.comment.length} caractères)
          </summary>
          <div style={{ fontSize: 11, color: '#334155', lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>
            {c.comment}
          </div>
        </details>
      ) : null}
    </div>
  )
}

export default function QuinteGrille() {
  const [date, setDate] = useState(aujourdhui())
  const [syn, setSyn] = useState(null)
  const [participants, setParticipants] = useState([])
  const [arrivee, setArrivee] = useState(null)
  const [courseId, setCourseId] = useState(null)
  const [cle, setCle] = useState(null)        // 📈 « 2026-10-05_R1_C1 » — la clé du marché
  const [infos, setInfos] = useState(null)   // détail casacourses (conditions, prix, météo)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [onglet, setOnglet] = useState('grille')
  // ⚠ une peau PAR ONGLET. `s` est reconstruit à chaque onglet : toutes les
  //    tables, tous les cadres et tous les en-têtes suivent l'onglet actif.
  const SK = THEME[onglet] || THEME.grille
  const s = { box: SK.box, hdr: SK.hdrStyle, th: SK.th, td: SK.td }
  const [toutLesP, setToutLesP] = useState(true)   // P1 → P20 par défaut
  const [archive, setArchive] = useState([])
  const [carriere, setCarriere] = useState({})      // { n° : [runs] }
  // 📈 LE MARCHÉ — equidia.fr, lu en direct. { n° : { cote, ouverture, … } }
  const [cotes, setCotes] = useState({})
  // ⚠ un ticket ARCHIVÉ est INTOUCHABLE : la page l'affiche, jamais elle ne le recalcule
  //   (AGENTS.md §13.3) : la page doit le montrer tel quel, pas le recalculer.
  const [ticketManuel, setTicketManuel] = useState(null)
  // 🔒 AUCUNE modification à la main : le numéro de chaque case est celui du moteur.
  //    Le clic ne change plus rien (demandé le 05/10/2026).

  /* ------------------------------------------------------ chargement --- */

  useEffect(() => { document.title = 'Quinté — Bahja TURF' }, [])

  const charger = useCallback(async (d) => {
    setBusy(true); setMsg(''); setSyn(null); setTicketManuel(null); setCle(null); setCotes({})
    try {
      // ⚠ ORDRE DE PRIORITÉ — le site ne publie QUE la course du jour.
      //    Lui faire confiance pour une date passée, c'est afficher la Synthèse
      //    d'aujourd'hui sous une autre date (bug du 04/10 vu sur 03/10).
      let j = null
      let depuisArchive = false

      // 1. ⚠ L'ARCHIVE LOCALE GAGNE TOUJOURS.
      //    C'est elle seule qui garde la Synthèse de CHAQUE date (le site, lui,
      //    ne publie que la course en cours). Le site ne sert qu'à combler
      //    un trou, et seulement si sa date correspond.
      let db = {}
      try { db = await fetchArchiveDisque() } catch (e) { /* pas encore de fichier */ }
      const rec = db[d]
      // \u26a0 le ticket ARCHIVE ne s'affiche que si la course est CLOTUREE
      //   (arrivee connue). Tant qu'elle n'a pas couru, c'est le ticket LIVE
      //   qu'on joue : le marche bouge, l'archive est un instantane de 08h45
      //   ou 20h30 qui ne vaut plus rien (\u00a713.3 regle 5).
      if (rec?.ticket?.length) setTicketManuel(rec.ticket)
      if (rec?.synthese?.length) {
        j = {
          date: d, found: true, race: rec.race, source: rec.source || 'archive locale',
          synthese: rec.synthese, fois: rec.fois, arrivee: rec.arrivee,
          placeholder: rec.placeholder,
        }
        depuisArchive = true
      }

      // 2. le site — SECOURS seulement (pas d'entrée d'archive), et seulement si la
      //    date affichée par le site est bien celle demandée.
      //    ⚠ pronostics-turf.info ne montre que la course en cours et bascule
      //    souvent dès l'aube pour le lendemain : sans ce contrôle, on affiche
      //    la Synthèse du 04/10 sous la date du 03/10.
      if (!j) {
        try {
          const r = await fetchRecapSite()
          if (r?.synthese?.length) {
            if (siteCorrespondALaDate(r.datePage, d)) {
              j = {
                date: d, found: true, race: null, source: 'pronostics-turf.info',
                synthese: r.synthese, fois: r.fois, arriveeSite: r.arrivee,
              }
            } else {
              setMsg(`⚠ le site affiche la course du ${r.datePage || '?'}, pas du ${d} — source écartée.`)
              j = null
            }
          }
        } catch (e1) { /* le site bloque — il n'y a plus de 3e source */ }
      }

      // 3. aucune source : PAS de Synthèse du tout. On ne fabrique rien —
      //    une Synthèse « par défaut » serait un classement inventé, et le
      //    moteur se retrouverait à remplir la grille avec du bruit.
      if (!j) j = { date: d, found: false, source: 'aucune source', synthese: [], fois: [], placeholder: true }

      setSyn(j)
      // ⚠ on n'écrase JAMAIS une Synthèse d'archive déjà Behind par une autre source
      if (!depuisArchive && j.synthese?.length) {
        await saveArchive(d, {
          found: j.found, race: j.race, source: j.source,
          synthese: j.synthese, fois: j.fois, placeholder: j.placeholder,
        })
      }
      if (j.placeholder) setMsg(`⚠ Aucune source de presse pour cette date : ni le site, ni l'archive. La grille est vide — ne pas parier dessus.`)
      await rafraichirArchive()

      // La course est identifiée dans tous les cas ; l'arrivée seulement si elle a eu lieu.
      // On force celle qu'on a déjà retenue pour cette date, sinon on la déduit
      // de la Synthèse (quelle course contient le plus de numéros cités).
      const dejaVu = archive.find((a) => a.date === d)
      // la course vient de pro.casacourses.com (la seule source de Bahja-TURF)
      const res = await chargerCourseCC(d, j.synthese)
      if (res) {
        setArrivee(res.arrivee)
        setCourseId(res.courseId)
        // 📈 la clé Equidia « date_Rn_Cm » — c'est elle qui sert au marché
        setCle(res.cle || dejaVu?.cle || null)
        setInfos(res)
        const parts = (res.participants || []).filter((p) => p.statut !== 'NON_PARTANT')
        setParticipants(parts)
        await attachResult(d, {
          arrivee: dejaVu?.arrivee || res.arrivee,
          discipline: res.discipline,
          distance: res.distance,
          nbPartants: res.nbPartants,
          hippodrome: res.hippodrome,
          prix: res.prix,
          courseId: res.courseId,
          cle: res.cle || dejaVu?.cle || null,
          runners: parts.map((p) => p.num),
        })
      } else {
        setArrivee(null); setParticipants([]); setInfos(null)
      }
    } catch (e) {
      setMsg('Erreur : ' + e.message)
    }
    setBusy(false)
  }, [])

  const rafraichirArchive = useCallback(async () => {
    try {
      await syncDepuisDisque()
      setArchive(await listArchive())
    } catch (e) { setArchive([]) }
  }, [])

  useEffect(() => { charger(date) }, [date])
  useEffect(() => { rafraichirArchive() }, [])
  useEffect(() => {
    loadCarriere(date).then((d) => setCarriere(d || {})).catch(() => setCarriere({}))
  }, [date])

  /* ---------------------------------------------------------- moteur --- */

  // ⚠ la VRAIE discipline (casacourses/archive), jamais 'PLAT' en dur :
  //   un Quinté de trot noté en plat voit toute sa forme à 0.
  const discipline = infos?.discipline || archive.find((a) => a.date === date)?.discipline || syn?.race?.discipline || 'PLAT'

  const classement = useMemo(() => classerPartants(participants, discipline || 'PLAT'), [participants, discipline])

  // ⚠ partants provisoires (noms pas encore publiés) : les scores affichés
  //   sont calculés sur des données incomplètes — le ticket suivra.
  const provisoire = useMemo(
    () => participants.length > 0 && participants.every((p) => !(p.nom || p.horse || p.cheval || p.name)),
    [participants]
  )

  /* --------------------------------------------------- la course du jour --- */

  const course = useMemo(() => ({
    dist: (archive.find((a) => a.date === date)?.distance) || 2500,
    surf: 'Gazon',
    sens: 'D',
    discipline: discipline || 'PLAT',
    hippo: archive.find((a) => a.date === date)?.hippodrome || '',
  }), [archive, date])

  /** Score physique par cheval — prioritaire dès qu'une carrière est saisie. */
  const scoresPhysiques = useMemo(() => {
    if (!Object.keys(carriere).length) return null
    const out = []
    for (const p of participants) {
      const runs = carriere[p.num]
      if (!runs || !runs.length) continue
      const sc = scorePhysique(p, runs, course)
      const f = filtres(p, runs, course)
      out.push({ p, s: sc, f, ok: f.filter((x) => x.ok).length })
    }
    return out
  }, [carriere, participants, course])

  /** Le classement qui remplit les quotas : physique s'il existe, sinon forme. */
  const classementFinal = useMemo(() => {
    if (!scoresPhysiques || !scoresPhysiques.length) return classement
    return classerPhysique(scoresPhysiques)
  }, [scoresPhysiques, classement])

  const grille = useMemo(
    () => (syn ? buildGrid(syn.synthese, participants.map((p) => p.num)) : null),
    [syn, participants]
  )

  /* ------------------------------------------------------- le marché --- */

  // 📈 equidia.fr donne la cote EN DIRECT (rapp_evol), c'est la seule source
  //    libre qui a le marché avant le départ. Sans elle, le moteur retombe sur
  //    le score physique — qui, à l'intérieur d'un bloc, ne trie rien (§11.16).
  const [heureCote, setHeureCote] = useState(null)
  useEffect(() => {
    let annule = false
    setCotes({}); setHeureCote(null)
    if (!cle) return undefined
    fetchCotes(cle).then((c) => {
      if (annule) return
      setCotes(c || {})
      const h = Object.values(c || {}).find((x) => x.heure)?.heure
      setHeureCote(h || new Date().toISOString())
    }).catch(() => { if (!annule) { setCotes({}); setHeureCote(null) } })
    return () => { annule = true }
  }, [cle])

  // le marché bouge en continu : on le relit toutes les 60 s tant que la course
  // est ouverte, et on horodate chaque relevé. Le ticket affiché est donc
  // toujours le dernier — c'est lui qu'on joue, pas celui du matin.
  useEffect(() => {
    if (!cle) return undefined
    const t = setInterval(() => {
      fetchCotes(cle).then((c) => {
        if (!c || !Object.keys(c).length) return
        setCotes(c)
        const h = Object.values(c).find((x) => x.heure)?.heure
        setHeureCote(h || new Date().toISOString())
      }).catch(() => {})
    }, 60 * 1000)
    return () => clearInterval(t)
  }, [cle])

  // 📊 les probabilités de place (onglet Statistiques) — c'est ELLES qui
  //   décident de l'ordre du ticket. Doit être calculé AVANT `rempli`.
  const stats = useMemo(() => computeStats(archive), [archive])

  const rempli = useMemo(() => {
    if (!grille) return null
    return remplirGrille(grille, classementFinal, 'PLAT', cotes, stats)
  }, [grille, classementFinal, cotes, stats])

  // 🔒 le choix est celui du moteur. Seul le ticket ARCHIVÉ passe devant
  //   (il est intouchable, §13.3) — mais on ne peut pas le modifier à la main.
  const detail = useMemo(() => {
    if (!rempli) return null
    const pose = ticketManuel && ticketManuel.length ? new Set(ticketManuel) : null
    return rempli.detail.map((g) => ({
      ...g,
      cases: g.cases.map((c) => ({
        ...c,
        pris: pose ? pose.has(c.num) : c.pris,
      })),
    }))
  }, [rempli, ticketManuel])

/* Couleurs des 5 groupes — les mêmes que sur le carnet papier. */
const COULEUR_GROUPE = {
  G1: { base: '#22c55e', sombre: false },
  G2: { base: '#2563eb', sombre: false },
  G3: { base: '#eab308', sombre: true },
  G4: { base: '#7c3aed', sombre: false },
  G5: { base: '#ef4444', sombre: false },
}

/* Le carnet : 2 lignes — en haut la parité du n° P1, en bas l’autre,
   chacune dans l’ordre de la presse. Les groupes G1..G5 et leurs quotas
   ne changent pas : seule la disposition suit le carnet papier. */
/* Le carnet : cases numérotées P1, P2… en colonnes (col k = P(2k-1) en haut).
   Le badge affiche le SLOT : ex. le 16 est P4·G1 (pas P5·G2).
   Groupes = plages de slots (groupeDeSlot), quotas inchangés. */
const carnet = (detail) => {
  if (!detail) return null
  const toutes = detail.flatMap((g) => g.cases.map((c) => ({ ...c, groupe: g.id, quota: g.quota })))
  if (!toutes.length) return null
  const haut = toutes.filter((c) => c.slot % 2 === 1).sort((a, b) => a.slot - b.slot)
  const bas = toutes.filter((c) => c.slot % 2 === 0).sort((a, b) => a.slot - b.slot)
  const pariteHaut = haut.length && bas.length ? (haut[0].num % 2) : 1
  const colonnes = []
  for (let i = 0; i < Math.max(haut.length, bas.length); i++) {
    colonnes.push({ haut: haut[i] || null, bas: bas[i] || null })
  }
  return { colonnes, pariteHaut }
}
const LIGNE_CARNET = (cellule, quotaGroupe) => (cellule ? (
  <Boite key={cellule.slot} n={cellule.num} pris={cellule.pris}
    presse={cellule.presse} score={cellule.s} cote={cellule.cote}
    couleur={COULEUR_GROUPE[cellule.groupe]} />
) : (
  <div style={{ width: 54, height: 54 }} />
))

  // ⚠ L'ORDRE DE LA TICKET = les PROBABILITÉS DE PLACE de l'onglet Statistiques.
  //   La 1re case est le cheval qui, d'après l'archive, sort le plus souvent 1er ;
  //   la 2e, celui qui sort le plus souvent 2e… Ni la presse, ni les cotes, ni
  //   l'ordre des cases du carnet. → `ordonnerParStats` (appelé par remplirGrille).
  //   ⚠ Un ticket ARCHIVÉ garde son ordre d'origine : il est intouchable (§13.3).
  const ticket = useMemo(() => {
    if (ticketManuel && ticketManuel.length) return ticketManuel
    if (!rempli) return []
    return rempli.ticket
  }, [rempli, ticketManuel])

  // ⚠ L'AUTO-FIGEAGE : dès que le moteur produit un ticket, on l'écrit dans
  //   l'archive. L'archive doit montrer le ticket DÈS LE PREMIER ANALYSE —
  //   pas seulement après un clic « Rafraîchir ». `attachTicket` ne fige que
  //   le PREMIER (un ticket déjà posé est intouchable, §13.3).
  //
  //   Puis on recharge le ticket FIGÉ dans `ticketManuel` : dès lors l'affichage
  //   lit l'archive, pas le marché — le marché peut bouger, la ticket reste.
  const ticketAuto = useMemo(() => {
    if (ticketManuel && ticketManuel.length) return null   // déjà figé
    if (!rempli || !rempli.ticket.length) return null
    return rempli.ticket
  }, [rempli, ticketManuel])

  useEffect(() => {
    if (!ticketAuto || !ticketAuto.length) return
    let annule = false
    ;(async () => {
      const res = await attachTicket(date, [...ticketAuto])
      if (annule || !res) return
      setArchive(await listArchive())
      if (res.ticket && res.ticket.length) setTicketManuel(res.ticket)
    })()
    return () => { annule = true }
  }, [date, ticketAuto])

  // ⚠ la page ne SAUVEGARDE aucun ticket : c'est le job (Quinte AM/PM, auto-carrière)
  //   qui construit et archive le ticket physique. Ici on ne fait qu'afficher.

  // score moyen du ticket
  const infoTicket = useMemo(() => {
    const map = new Map(classement.map((x) => [x.p.num, x.s]))
    const pris = ticket.map((n) => map.get(n)).filter(Boolean)
    if (!pris.length) return null
    return {
      n: pris.length,
      forme: +(pris.reduce((a, b) => a + b.score, 0) / pris.length).toFixed(2),
      global: +(pris.reduce((a, b) => a + b.global, 0) / pris.length).toFixed(2),
    }
  }, [ticket, classement])

  // résultat si l'arrivée est connue
  const verdict = useMemo(() => {
    if (!arrivee || !ticket.length) return null
    const t = new Set(ticket)
    const pris = arrivee.filter((n) => t.has(n))
    return { pris: pris.length, manques: arrivee.filter((n) => !t.has(n)) }
  }, [arrivee, ticket])

  /* ---------------------------------------------------------- carrière --- */

  /* ----------------------------------------------------------- stats --- */
  // (`stats` est calculé plus haut, avant `rempli` : c'est lui qui ordonne le ticket)

  /* ---------------------------------------------------------- actions --- */

  // 🔒 plus de `basculer` : on ne peut plus forcer une case à la main (05/10/2026).
  //   Le moteur remplit les quotas, la case est prise ou non. Point final.

  const toutEffacer = async () => {
    if (!confirm('Effacer toute l’archive locale ?')) return
    await clearArchive(); await rafraichirArchive(); setMsg('Archive vidée')
  }

  // 🔒 RAFRAÎCHIR = FIGER : au premier clic, le ticket affiché est enregistré
  //   dans l'archive, et le premier figé ne bouge plus jamais (attachTicket).
  const figerPuisRafraichir = async () => {
    try {
      if (ticket && ticket.length) await attachTicket(date, ticket)
    } catch (e) { /* on rafraîchit quand même */ }
    await rafraichirArchive()
  }

  /* ------------------------------------------------------------- vue --- */

  return (
    <>
      {/* ── bandeau : logo + navigation. Les moteurs/sources restent privés à chaque page ── */}
      <header className="header" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#0f172a 100%)', borderBottom: '2px solid #22c55e' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-horse.png" alt="Bahja TURF" style={{ height: 44, background: 'white', borderRadius: 8, padding: 2 }} />
            <img src="/logo.svg" alt="Bahja TURF" style={{ height: 42, borderRadius: 8 }} />
          </div>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link to="/" style={{ color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Programme</Link>
            <Link to="/quinte" style={{ color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Quinté</Link>
          </nav>
        </div>
      </header>
    <div dir="ltr" style={{
      maxWidth: 1180, margin: '0 auto', padding: '0 16px 30px', minHeight: '72vh',
      fontFamily: SK.police, background: SK.fond,
      borderLeft: '3px solid ' + SK.bord, borderRight: '3px solid ' + SK.bord,
      transition: 'background .25s, font-family .25s',
    }}>
      {/* ── bandeau d'identité : titre, couleur et police de l'onglet ── */}
      <div style={{
        margin: '0 -16px 14px', padding: '13px 16px', color: '#fff',
        background: SK.entete, borderBottom: '3px solid ' + SK.accent,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: 0.5 }}>{SK.titre}</h2>
          <span style={{ fontSize: 12, opacity: 0.9 }}>{SK.sousTitre}</span>
        </div>
      </div>

      {/* barre de commande */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
        <button onClick={() => charger(date)} disabled={busy}
          style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid #0f172a', background: busy ? '#94a3b8' : '#0f172a', color: '#fff', cursor: 'pointer' }}>
          {busy ? 'Chargement…' : 'Actualiser'}
        </button>
        {syn && (
          <span style={{ fontSize: 13 }}>
            {syn.found
              ? <><b>{syn.race?.hippodrome}</b> — {syn.race?.prix}</>
              : <span style={{ color: '#b45309' }}>Aucun Quinté trouvé — synthèse par défaut</span>}
          </span>
        )}

      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {TABS.map(([k, l]) => {
          const t = THEME[k]
          const on = onglet === k
          return (
            <button key={k} onClick={() => setOnglet(k)}
              style={{
                padding: '7px 22px', borderRadius: 999, cursor: 'pointer',
                fontSize: 13, fontWeight: on ? 800 : 600, letterSpacing: 0.3,
                fontFamily: t.police,
                border: on ? `2px solid ${t.accent}` : `1px solid ${t.bord}`,
                background: on ? t.entete : t.carte,
                color: on ? '#fff' : t.accent,
                boxShadow: on ? `0 4px 12px ${t.ombre}` : 'none',
              }}>{on ? '▸ ' : ''}{l}</button>
          )
        })}
      </div>

      {msg && <div style={{ color: '#b91c1c', marginBottom: 10, fontSize: 13 }}>{msg}</div>}

      {syn && (
          <div style={{ ...s.box, padding: '10px 12px', marginBottom: 12, fontSize: 12, borderLeft: '4px solid ' + SK.accent, background: SK.alt, borderRadius: SK.box.borderRadius }}>
            <b>Synthèse reçue</b>{' '}
            <span style={{ fontFamily: 'monospace' }}>
              [{(syn.synthese || []).join(', ')}]
            </span>
            <span style={{ color: '#64748b', marginLeft: 10 }}>
              — {(syn.synthese || []).length} numéros cités par la presse ·
              uniques {new Set(syn.synthese || []).size}
              {grille && grille.manquants.length > 0 && (
                <>
                  <br />
                  <span style={{ color: '#b45309' }}>
                    + {grille.manquants.length} partant(s) non cité(s) par la presse, ajoutés à la suite :
                    {' '}{grille.manquants.join(' · ')} (P{(syn.synthese || []).length + 1} et suivantes)
                  </span>
                </>
              )}
            </span>
            {new Set(syn.synthese || []).size !== (syn.synthese || []).length && (
              <div style={{ color: '#b91c1c', marginTop: 4 }}>
                ⚠ doublons dans la réponse du backend
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------- grille */}
      {onglet === 'grille' && grille && (
        <div>
          <ConditionsCourse course={infos} date={date} sk={SK} />

          <div style={{ fontSize: 12, color: SK.texte, margin: '12px 0 8px', lineHeight: 1.6, background: SK.alt, border: '1px solid ' + SK.bord, borderLeft: '4px solid ' + SK.accent, borderRadius: SK.box.borderRadius, padding: '10px 12px' }}>
            MA MÉTHODE — cinq groupes, un quota chacun. Le moteur remplit les quotas :
            le ticket est fixé, il ne se modifie pas à la main.
            Les boîtes se lisent <b>en travers</b> : ligne du haut puis ligne du bas.{carnet(detail) && <> Les cases sont numérotées <b>P1, P2… en colonnes</b> : la ligne du haut porte la parité du P1.</>}
            <br />
            {Object.keys(cotes).length >= 4 ? (
              <>📈 <b>Marché lu sur equidia.fr</b>, relevé à {heureCote ? heureCote.slice(11, 16) : '?'} — rafraîchi toutes les minutes.
                Dans chaque bloc on prend les <b>quota meilleures cotes</b>. Rien d'autre.
                Mesuré sur <b>280 vrais Quintés France</b> : 30 % de courses où le 1·2·3 est complet
                (contre 13 % avec l'ancienne « surprise »).</>
            ) : (
              <>⚠ Pas de cote marché — le moteur trie sur le score physique.{'\n'}          La cote arrive vers 07 h ; relance la page après.</>
            )}
            {!classement.length && <><br /><b style={{ color: '#b45309' }}>
              Pas de scores disponibles (course non disputée) — les cases colorées suivent
              l'ordre du carnet : P1, P2, P3… dans chaque groupe.</b></>}
          </div>
          {carnet(detail) && (
            <div style={{ ...s.box, padding: 14, overflowX: 'auto', boxShadow: SK.ombreD }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${carnet(detail).colonnes.length}, 56px)`, gap: 4, width: 'max-content' }}>
                {carnet(detail).colonnes.map((col, i) => (
                  <div key={i} style={{ display: 'grid', gap: 4 }}>
                    {LIGNE_CARNET(col.haut, (col.haut || col.bas).quota)}
                    {LIGNE_CARNET(col.bas, (col.bas || col.haut).quota)}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ ...s.box, padding: '12px 14px', marginTop: 12, fontSize: 13, borderLeft: '5px solid ' + SK.accent, boxShadow: SK.ombreD }}>
            <b style={{ letterSpacing: 1.4 }}>TICKET</b>{'  '}
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1.5, color: SK.accentSombre }}>
              {ticket.length ? ticket.join('  ·  ') : '—'}
            </span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 12 }}>{ticket.length} chevaux</span>
            {'  '}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- carrière */}
      {/* ---------------------------------------------------------- ticket */}
      {onglet === 'ticket' && (
        <div>
          <div style={{ ...s.box, padding: 16, marginBottom: 14, background: SK.entete, border: 'none', color: '#fff' }}>
            <b style={{ fontSize: 14, letterSpacing: 1.2, opacity: 0.95 }}>TICKET DU {date}</b>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 3, marginTop: 8, color: '#fff', fontFamily: SK.nb.td }}>
              {ticket.length ? ticket.join('  ·  ') : '—'}
            </div>
            {infoTicket && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: 8, fontFamily: SK.nb.td }}>
                {infoTicket.n} chevaux · score forme moyen {infoTicket.forme}/10 · score global moyen {infoTicket.global}
              </div>
            )}
            {verdict && (
              <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: verdict.pris === 5 ? '#4ade80' : verdict.pris >= 3 ? '#fcd34d' : '#fca5a5' }}>
                Arrivée {arrivee.join(' - ')} → <b>{verdict.pris}/5</b>
                {verdict.manques.length > 0 && <> · manquants : {verdict.manques.join(', ')}</>}
              </div>
            )}
          </div>

          {provisoire && (
            <div style={{ background: '#fefce8', border: '1px solid #facc15', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 10 }}>
              ⚠ <b>partants provisoires</b> (noms pas encore publiés) — les scores ci-dessous sont calculés sur données incomplètes.
            </div>
          )}
          {classement.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...s.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13, overflow: 'hidden', boxShadow: SK.ombreD }}>
                <thead>
                  <tr style={s.hdr}>
                    {['N°', 'Cheval', 'P', 'Musique', 'Forme', 'Série', 'Pureté', 'Car/VIC/2E/3E', 'Poids', 'Val', 'Jockey', 'Entraîneur', 'Score', 'Ticket']
                      .map((h) => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {classement.map(({ p, s: sc }) => {
                    const on = ticket.includes(p.num)
                    return (
                      <tr key={p.num} style={{ background: on ? SK.on : SK.ligne, borderBottom: '1px solid ' + SK.bord }}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{p.num}</td>
                        <td style={s.td}>{p.horse}</td>
                        <td style={s.td}>{grille ? ((grille.slotParNum && grille.slotParNum[p.num]) ?? grille.parNum?.[p.num] ?? '—') : '—'}</td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{p.musique}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: sc.score >= 5 ? '#15803d' : sc.score >= 3.5 ? '#a16207' : '#b91c1c' }}>
                          {sc.score.toFixed(2)}
                        </td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{sc.serie.join(' ')}</td>
                        <td style={s.td}>{sc.purite}%</td>
                        <td style={s.td}>{p.nombreCourses}/{p.nombreVictoires}/{p.nombrePlacesSecond}/{p.nombrePlacesTroisieme}</td>
                        <td style={s.td}>{p.poids}</td>
                        <td style={s.td}>{p.valeur}</td>
                        <td style={s.td}>{p.jockey}</td>
                        <td style={s.td}>{p.trainer}</td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{sc.global}</td>
                        <td style={s.td}>{on ? '✅' : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ ...s.box, padding: '10px 12px', marginTop: 14, fontSize: 12, color: SK.texte, lineHeight: 1.6, background: SK.alt, borderLeft: '4px solid ' + SK.accent }}>
            <b>Limite du moteur :</b> le backend donne la musique, le poids, la valeur, l’âge,
            le jockey, l’entraîneur et les stats de carrière. Il ne donne <b>pas</b> la distance,
            le terrain ni le type des courses passées. Le score ci-dessus est donc un
            <b> provisoire</b> : il remplit les quotas, il ne tranche pas seul.
            La sélection physique (distance / piste / corde / terrain) reste à faire à la main.
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- archive */}
      {onglet === 'archive' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button onClick={toutEffacer} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #fca5a5', background: SK.carte, color: '#b91c1c', cursor: 'pointer', fontFamily: SK.police }}>
              Tout effacer
            </button>
            <button onClick={() => figerPuisRafraichir()} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.carte, color: SK.accent, cursor: 'pointer', fontFamily: SK.police }}>
              Rafraîchir
            </button>
          </div>

          {archive.length === 0 ? (
            <div style={{ fontSize: 13, color: '#94a3b8' }}>Archive vide. Ouvre cette page chaque jour : la Synthèse est enregistrée automatiquement.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ ...s.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13, overflow: 'hidden', boxShadow: SK.ombreD }}>
                <thead>
                  <tr style={s.hdr}>
                    {['Date', 'Hippodrome', 'Type', 'Distance', 'Synthèse', 'Arrivée', 'Ticket', 'Posé le', 'Bilan', '']
                      .map((h) => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {archive.map((a) => {
                    const t = new Set(a.ticket || [])
                    const p = (a.arrivee || []).filter((n) => t.has(n)).length
                    return (
                      <tr key={a.date} style={{ borderBottom: '1px solid #f1f5f9',                         background: a.placeholder ? SK.danger : (a.found ? SK.ligne : SK.alt) }}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{a.date}</td>
                        <td style={{ ...s.td, textTransform: 'capitalize' }}>{(a.hippodrome || a.race?.hippodrome || '—').toLowerCase()}</td>
                        <td style={s.td}>{({ PLAT: 'Plat', HAIE: 'Haies', ATTELE: 'Attelé', TROT: 'Trot', STEEPLECHASE: 'Steeple', STEEPLE: 'Steeple', HAIES: 'Haies', ATTELEE: 'Attelé' })[String(a.discipline || '').toUpperCase()] || (a.discipline && a.discipline !== 'N' ? a.discipline : '—')}</td>
                        <td style={s.td}>{a.distance ? a.distance + 'm' : '—'}</td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>
                          {(a.synthese || []).join(' ')}
                          {a.placeholder && <span style={{ color: '#b91c1c', fontWeight: 700 }}> ⚠ par défaut</span>}
                        </td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>{(a.arrivee || []).join('-') || '—'}</td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>{(a.ticket || []).join(' ') || '—'}</td>
                        {/* ⭐ UN SEUL TEMPS : l'heure où le ticket a été POSÉ (le gel).
                            Pas l'heure d'enregistrement de la Synthèse — ce
                            sont deux moments différents, et n'en afficher
                            qu'un évite toute ambiguïté. */}
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: a.ticketPoseLe ? SK.accent : '#94a3b8' }}>
                          {a.ticketPoseLe ? a.ticketPoseLe.slice(11, 16) : '—'}
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: p === 5 ? '#15803d' : p > 0 ? '#a16207' : '#94a3b8' }}>
                          {a.arrivee ? p + '/5' : '—'}
                        </td>
                        <td style={s.td}>
                          <button onClick={async () => { await deleteArchive(a.date); rafraichirArchive() }}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b91c1c' }}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------- stats */}
      {onglet === 'stats' && (
        <div>
          {stats.nb === 0 ? (
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              Pas encore assez de données ({stats.nb} Quinté avec arrivée). L’archive se remplit
              automatiquement à chaque ouverture de page.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>{stats.nb} Quinté(s) dans l’archive — qui gagne, qui place.</span>
                {stats.nb < 10 && (
                  <span style={{ color: '#b45309', fontWeight: 600 }}>
                    ⚠ {stats.nb}/10 — chiffres trop faibles pour conclure
                  </span>
                )}
                <button onClick={() => setToutLesP((v) => !v)}
                  style={{ padding: '3px 12px', borderRadius: 999, border: '1px solid ' + SK.bord, background: toutLesP ? SK.accent : '#fff', color: toutLesP ? '#fff' : SK.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  {toutLesP ? 'P1-P5 seulement' : 'Voir jusqu’à P20'}
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ ...s.box, borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, overflow: 'hidden', boxShadow: SK.ombreD }}>
                  <thead>
                    <tr style={s.hdr}>
                      <th style={s.th}>Place</th>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <th key={r.place} style={{ ...s.th, background: r.n === 0 ? SK.muted : SK.accentSombre }}>P{r.place}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...s.td, fontWeight: 700 }}>n</td>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <td key={r.place} style={{ ...s.td, fontWeight: 700 }}>{r.n}</td>
                      ))}
                    </tr>
                    {['1er', '2e', '3e', '4e', '5e'].map((lbl, k) => (
                      <tr key={lbl} style={{ borderBottom: '1px solid #f1f5f9', background: k % 2 ? SK.alt : SK.ligne }}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{lbl}</td>
                        {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                          <td key={r.place} style={{
                            ...s.td, fontWeight: r.n && r.p[k] > 0 ? 800 : 400,
                            color: r.n === 0 ? '#cbd5e1' : r.p[k] > 0 ? '#15803d' : '#94a3b8',
                          }}>
                            {r.n ? r.p[k] + '%' : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr style={{ borderBottom: '1px solid ' + SK.bord, background: SK.accentClair }}>
                      <td style={{ ...s.td, fontWeight: 800, color: SK.accent }}>1er+2e+3e</td>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <td key={r.place} style={{
                          ...s.td, fontWeight: 800,
                          color: r.n === 0 ? '#cbd5e1' : r.top3 >= 60 ? SK.accent : r.top3 > 0 ? SK.texte : '#94a3b8',
                          background: r.n ? SK.accentClair : SK.alt,
                        }}>
                          {r.n ? r.top3 + '%' : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid ' + SK.bord, background: SK.on }}>
                      <td style={{ ...s.td, fontWeight: 800 }}>P(top5)</td>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <td key={r.place} style={{ ...s.td, fontWeight: 800 }}>{r.n ? r.top5 + '%' : '—'}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ ...s.box, padding: 14, marginTop: 16, boxShadow: SK.ombreD }}>
                <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>Par groupe</b>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, marginTop: 10, fontSize: 13, overflow: 'hidden', border: '1px solid ' + SK.bord, borderRadius: 8 }}>
                  <thead>
                    <tr style={s.hdr}>
                      {['Groupe', '1er', '2-3e', '4-5e', 'présent dans au moins 1 course'].map((h) => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.parGroupe.map((g) => (
                      <tr key={g.id} style={{ borderBottom: '1px solid ' + SK.bord }}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{g.label}</td>
                        <td style={s.td}>{g.part1}%</td>
                        <td style={s.td}>{g.part23}%</td>
                        <td style={s.td}>{g.part45}%</td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{g.present}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                <div style={{ ...s.box, padding: 14, marginTop: 16, boxShadow: SK.ombreD }}>
                <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>Le vainqueur vient de…</b>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  {Object.entries(stats.vainqueur).map(([k, v]) => (
                    <span key={k} style={{ marginRight: 18 }}>
                      <b>{k}</b> : {v}/{stats.nb} = {Math.round(v / stats.nb * 100)}%
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: 13, marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                  <b style={{ color: SK.accent }}>Le podium (1er + 2e + 3e) vient de…</b>
                  <div style={{ marginTop: 6 }}>
                    {stats.podiumBloc.map((b) => (
                      <div key={b.id} style={{ marginBottom: 6 }}>
                        <span style={{ marginRight: 12 }}>
                          <b>{b.id}</b> : {b.n}/{stats.nb} = {b.pct}%
                        </span>
                        <span style={{ fontSize: 12 }}>
                          {(b.detail || []).map((d) => (
                            <span key={d.p} style={{ marginRight: 8, color: d.n ? '#0f172a' : '#cbd5e1', fontWeight: d.n ? 700 : 400 }}>
                              P{d.p} : {d.n}/{stats.nb}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                    Le tableau du dessus détaille chaque position P1 → P20.
                    Ici on compte les courses où <b>au moins un</b> des trois premiers sort du bloc.
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}
    </div>
    </>
  )
}