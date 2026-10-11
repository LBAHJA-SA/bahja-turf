import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchRecapSite, fetchArchiveDisque,
  buildGrid, classerPartants, classerPhysique, remplirGrille, GROUPES, quotasEffectifs,
  scorePhysique, filtres, ordonnerParStats,
  saveArchive, listArchive, deleteArchive, attachResult, attachTicket,
  loadCarriere, syncDepuisDisque, getArchive,
  clearArchive,
  computeStats, aujourdhui, siteCorrespondALaDate, chargerCourseCC,
  fetchCotes,
} from '../../src/lib/quinte'
import { chargerDetailReu } from '../../backend/ARTICLE/turfFrance.js'

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

function Boite({ n, pris, presse, couleur, score, cote, slot, onClick }) {
  // boule 3D : dégradé radial + ombres portées/incrustées.
  // le NUMÉRO au centre, le n° de CASE (P1, P2…) au-dessus — demandé le
  // 10/10/2026 (fini le « secret du carnet » : on lit P et numéro ensemble).
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
      {slot != null && (
        <span style={{
          position: 'absolute', top: 1, left: 0, right: 0, textAlign: 'center',
          fontSize: 9, fontWeight: 800, color: txt, opacity: .9,
          textShadow: '0 1px 1px rgba(0,0,0,.35)', letterSpacing: .3,
        }}>P{slot}</span>
      )}
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
  // ⚑ la lecture du RÉSULTAT est déclenchée par l'utilisateur (bouton) :
  //   on ne va pas sonder casacourses en boucle toute la journée.
  const [busyResultat, setBusyResultat] = useState(false)
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
      /* Repli localStorage (09/10/2026) : le disque déployé peut être PÉRIMÉ
       * (token Vercel mort → pas de deploy) alors que ce navigateur a déjà
       * la synthèse + le ticket gelé (collectés le matin quand le site les
       * montrait). Sans ce repli, la page affiche « synthèse par défaut »
       * et un ticket live, pendant que l'Archive montre le gelé : la
       * contradiction vue le 09/10. Clé = la date exacte demandée, donc
       * pas de mélange (§13.3 règle 1 respectée). */
      if ((!rec?.ticket?.length || !j)) {
        let local = null
        try { local = await getArchive(d) } catch (e) { /* pas de local */ }
        if (!rec?.ticket?.length && local?.ticket?.length) setTicketManuel(local.ticket)
        if (!j && local?.synthese?.length) {
          j = {
            date: d, found: true, race: local.race, source: 'archive locale (navigateur)',
            synthese: local.synthese, fois: local.fois, arrivee: local.arrivee,
            placeholder: local.placeholder,
          }
          depuisArchive = true
        }
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

  /* 10/10/2026 — SYNCHRO AUTO, ZÉRO CLIC : après chaque rafraîchissement,
   * le navigateur renvoie son archive au disque local (route dev
   * /api/archive-push). En production la route n'existe pas (404) et
   * l'échec est avalé en silence : rien ne change à l'affichage. */
  const pousserArchive = useCallback(async () => {
    try {
      const tout = await listArchive()
      if (!tout.length) return
      const obj = {}
      for (const r of tout) if (r && r.date) obj[r.date] = r
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), 15000)
      await fetch('/api/archive-push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj), signal: ctl.signal,
      }).catch(() => null)
      clearTimeout(t)
    } catch (e) { /* silencieux */ }
  }, [])

  useEffect(() => { charger(date) }, [date])
  useEffect(() => { rafraichirArchive().then(() => pousserArchive()) }, [])
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
    presse={cellule.presse} score={cellule.s} cote={cellule.cote} slot={cellule.slot}
    couleur={COULEUR_GROUPE[cellule.groupe]} />
) : (
  <div style={{ width: 54, height: 54 }} />
))

  // ⚠ L'ORDRE DE LA TICKET = les PROBABILITÉS DE PLACE de l'onglet Statistiques.
  //   La 1re case est le cheval qui, d'après l'archive, sort le plus souvent 1er ;
  //   la 2e, celui qui sort le plus souvent 2e… Ni la presse, ni les cotes, ni
  //   l'ordre des cases du carnet. → `ordonnerParStats` (appelé par remplirGrille).
  //   ⚠ Un ticket ARCHIVÉ garde son ordre d'origine : il est intouchable (§13.3).
  /* ⚠ LE TICKET ARCHIVÉ EST INTOCABLE (§13.3) — mais SEULEMENT l'ORDRE
   *  change avec l'archive. Les MÊMS chevaux, remis dans l'ordre que les
   *  statistiques donnent aujourd'hui (§17.2). Sans cela la page resterait
   *  bloquée sur un ordre de juin alors que la méthode a changé.
   *  Le premier ticket figé reste : ce qu'on fige, c'est la SÉLECTION. */
  const ticket = useMemo(() => {
    if (!rempli) return ticketManuel && ticketManuel.length ? ticketManuel : []
    const base = (ticketManuel && ticketManuel.length) ? ticketManuel : rempli.ticket
    return ordonnerParStats(base, grille, stats, cotes)
  }, [rempli, ticketManuel, grille, stats, cotes])

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
    if (!gelAutorise()) return   // la nuit, on affiche sans figer (09/10/2026)
    let annule = false
    ;(async () => {
      const res = await attachTicket(date, [...ticketAuto], 'page')
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

  // 🔒 RAFRAÎCHIR = FIGER — mais SEULEMENT SUR MARCHÉ OUVERT, JAMAIS AVANT.
  //   Au premier clic, le ticket affiché est enregistré, et le premier figé
  //   ne bouge plus jamais (attachTicket) — sauf le re-gel FINAL du job.
  //   ⚠ 09/10/2026 : les gels à 01:55, 02:33, 03:02 figeaient un marché de
  //   nuit sans valeur. Le PMU ouvre à 04:00 GMT : avant, il n'y a RIEN à
  //   figer (ni cotes du jour, ni argent). On affiche le ticket LIVE sans
  //   le figer — un marché fermé ne décide de rien.
  const heureGMT = () => {
    try {
      return new Date().getUTCHours() + new Date().getUTCMinutes() / 60
    } catch { return 12 }
  }
  const gelAutorise = () => { const h = heureGMT(); return h >= 4.5 && h < 22 }
  const figerPuisRafraichir = async () => {
    try {
      if (ticket && ticket.length && gelAutorise()) await attachTicket(date, ticket, 'page')
    } catch (e) { /* on rafraîchit quand même */ }
    await rafraichirArchive()
  }

  /* ------------------------------------------------- ⚑ LE RÉSULTAT ------- */
  /* Un clic → on relit la course sur pro.casacourses.com. Si elle est
   *  finie, l'arrivée est écrite dans l'archive (avec le bilan x/5) et le
   *  ticket est figé au passage s'il ne l'était pas encore.
   *
   *  ⚠ Si la course n'est pas finie, on ne devine RIEN : on affiche juste
   *    que le résultat n'est pas encore publié (§7 — jamais de donnée
   *    inventée, jamais une autre course à la place). */
  const chercherResultat = async () => {
    setBusyResultat(true); setMsg('')
    try {
      const res = await chargerCourseCC(date, syn?.synthese || [])
      let arr = res?.arrivee
      // repli turf-france : casacourses ne publie pas toujours l'arrivée
      // (08/10 : status CLOSED mais has_results=false). La clé R/C vient
      // de casacourses lui-même, donc c'est la même course.
      if ((!arr || !arr.length) && res?.cle) {
        const m = String(res.cle).match(/_R(\d+)_C(\d+)$/)
        if (m) {
          try {
            const det = await chargerDetailReu(date, Number(m[1]), Number(m[2]), 'FRANCE')
            if (det?.arrivee?.length) arr = det.arrivee
          } catch (e2) { /* on garde le message standard ci-dessous */ }
        }
      }
      if (!arr || !arr.length) {
        setMsg('⚠ Pas de résultat publié pour cette course. Elle n’est pas encore clôturée — réessaie plus tard.')
        return
      }
      // le ticket est figé d'abord : le résultat se mesure sur le ticket gelé
      if (ticket && ticket.length) await attachTicket(date, ticket, 'auto')
      await attachResult(date, {
        arrivee: arr,
        discipline: res.discipline,
        distance: res.distance,
        nbPartants: res.nbPartants,
        hippodrome: res.hippodrome,
        prix: res.prix,
        courseId: res.courseId,
        cle: res.cle || null,
        runners: (res.participants || []).filter((p) => p.statut !== 'NON_PARTANT').map((p) => p.num),
      })
      setArrivee(arr)
      setInfos(res)
      setParticipants((res.participants || []).filter((p) => p.statut !== 'NON_PARTANT'))
      await rafraichirArchive()
      await pousserArchive() // la clôture manuelle remonte au disque, zéro clic
      const t = new Set(ticket)
      const p = arr.filter((n) => t.has(n)).length
      setMsg(`✓ Arrivée enregistrée : ${arr.join(' - ')}  →  ${p}/5`)
    } catch (e) {
      setMsg('⚠ Resultat indisponible : ' + e.message)
    }
    setBusyResultat(false)
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
            <Link to="/coply" style={{ color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Coply</Link>
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
            {(() => {
              /* ⭐ LE STATUT : provisoire ou définitif ? (09/10/2026, fuseau GMT).
               *   PROVISOIRE (ambre) = gel du matin / de la page, marché pas mûr.
               *   DÉFINITIF (vert)   = re-gel FINAL avant-course, marché du moment.
               *   MANUEL (bleu)      = posé à la main, intouchable.
               *   LIVE (gris)        = rien de gelé : c'est le marché en direct. */
              const rec = archive.find((a) => a.date === date)
              if (!ticket.length) return null
              /* Course courue = ticket jugé : ni provisoire ni définitif, CLÔTURÉ.
               * (09/10/2026 : un 5/5 étiqueté PROVISOIRE n'a aucun sens.) */
              if ((rec?.arrivee || []).length > 0) return (
                <span style={{
                  marginLeft: 12, fontSize: 12, fontWeight: 800, letterSpacing: 1,
                  color: '#57534e', border: '2px solid #57534e', borderRadius: 999,
                  padding: '2px 12px', verticalAlign: 'middle',
                }}>
                  CLÔTURÉ
                </span>
              )
              const src = rec?.ticketSource || null
              const conf = !src ? ['LIVE', '#94a3b8']
                : src === 'final' ? ['DÉFINITIF', '#4ade80']
                : src === 'manuel' ? ['MANUEL', '#93c5fd']
                : ['PROVISOIRE', '#fcd34d']
              return (
                <span style={{
                  marginLeft: 12, fontSize: 12, fontWeight: 800, letterSpacing: 1,
                  color: conf[1], border: `2px solid ${conf[1]}`, borderRadius: 999,
                  padding: '2px 12px', verticalAlign: 'middle',
                }}>
                  {conf[0]}
                  {rec?.ticketPoseLe && src && src !== null ? ` · gelé à ${rec.ticketPoseLe.slice(11, 16)} GMT` : ''}
                </span>
              )
            })()}
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

          {/* ⭐ LE BOUTON « RÉSULTAT ». La course est finie : un clic va chercher
              l'arrivée sur pro.casacourses.com et l'écrit dans l'archive.
              Tant qu'on n'a pas cliqué, l'arrivée reste vide — on ne l'invente
              jamais (§7). Le bouton est-ce que l'utilisateur déclenche : le
              job quotidien (Quinte AM/PM) fait de même en automatique. */}
          <div style={{ ...s.box, padding: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontFamily: SK.police }}>
            {arrivee && arrivee.length ? (
              <>
                <span style={{ fontSize: 13, color: SK.texte }}>
                  Arrivée enregistrée : <b style={{ fontFamily: SK.nb.td }}>{arrivee.join(' - ')}</b>
                </span>
                <button onClick={() => charger(date)} disabled={busy}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid ' + SK.bord, background: SK.carte, color: SK.accent, cursor: busy ? 'default' : 'pointer', fontFamily: SK.police, fontSize: 12 }}>
                  {busy ? 'Lecture…' : '↻ Relire le résultat'}
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 13, color: '#b45309' }}>
                  La course n'est pas encore clôturée — ou le résultat n'a pas été lu.
                </span>
                <button onClick={() => chercherResultat()} disabled={busyResultat}
                  style={{ padding: '8px 20px', borderRadius: 6, border: '2px solid ' + SK.accent, background: busyResultat ? '#94a3b8' : SK.accent, color: '#fff', cursor: busyResultat ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: SK.police }}>
                  {busyResultat ? 'Lecture en cours…' : '⚑ Chercher le résultat'}
                </button>
              </>
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
                    {['Date', 'Hippodrome', 'Type', 'Distance', 'Synthèse', 'Arrivée', 'Ticket', 'Posé le (GMT)', 'Statut', 'Bilan', 'Top3', '']
                      .map((h) => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {archive.map((a) => {
                    const t = new Set(a.ticket || [])
                    const p = (a.arrivee || []).filter((n) => t.has(n)).length
                    /* ⭐ Les 3 indicateurs (09/10/2026) : le x/5 ne suffit pas.
                     *   Un 4/5 qui rate le 1er est une feuille perdante : on
                     *   compte le Top3 à part, et on signale le 1er manqué. */
                    const top3 = (a.arrivee || []).slice(0, 3)
                    const hit3 = top3.filter((n) => t.has(n)).length
                    const manque1er = (a.arrivee || []).length > 0 && (a.ticket || []).length > 0 && !t.has(a.arrivee[0])
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
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>
  {/* ⭐ ORDRE VIVANT (10/10) : l'archive affiche les MÊMES chevaux, remis
      dans l'ordre que donnent les Statistiques AUJOURD'HUI — le gel fige
      la SÉLECTION, jamais l'ordre (§17.2). Sans ça, la ligne montrait
      l'ordre brut du gel, qui ne suit pas la logique des résultats. */}
  {ordonnerParStats(a.ticket || [], buildGrid(a.synthese || []), stats).join(' ') || '—'}
</td>
                        {/* ⭐ UN SEUL TEMPS : l'heure où le ticket a été POSÉ (le gel).
                            Pas l'heure d'enregistrement de la Synthèse — ce
                            sont deux moments différents, et n'en afficher
                            qu'un évite toute ambiguïté. */}
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: a.ticketPoseLe ? SK.accent : '#94a3b8' }}>
                          {a.ticketPoseLe ? a.ticketPoseLe.slice(11, 16) : '—'}
                        </td>
                        <td style={{ ...s.td, fontSize: 11, fontWeight: 800 }}>
                          {(() => {
                            if ((a.arrivee || []).length > 0) return <span style={{ color: '#57534e' }}>CLÔTURÉ</span>
                            const src = a.ticketSource || null
                            if (!src || !(a.ticket || []).length) return <span style={{ color: '#94a3b8' }}>—</span>
                            const conf = src === 'final' ? ['DÉFINITIF', '#15803d']
                              : src === 'manuel' ? ['MANUEL', '#1d4ed8']
                              : ['PROVISOIRE', '#b45309']
                            return <span style={{ color: conf[1] }}>{conf[0]}</span>
                          })()}
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: p === 5 ? '#15803d' : p > 0 ? '#a16207' : '#94a3b8' }}>
                          {a.arrivee ? p + '/5' : '—'}
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: !a.arrivee ? '#94a3b8' : hit3 === 3 ? '#15803d' : manque1er ? '#b91c1c' : '#a16207' }}>
                          {!a.arrivee ? '—' : hit3 + '/3'}{manque1er ? ' ⚠1er' : ''}
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
                {(() => {
                  const closes = archive.filter((a) => (a.arrivee || []).length > 0 && (a.ticket || []).length > 0)
                  const avec3 = closes.filter((a) => (a.arrivee || []).slice(0, 3).every((n) => (a.ticket || []).includes(n))).length
                  const sans1er = closes.filter((a) => !(a.ticket || []).includes(a.arrivee[0])).length
                  return closes.length ? (
                    <span style={{ fontWeight: 700 }}>
                      Top3 : <span style={{ color: '#15803d' }}>{avec3}/{closes.length}</span>
                      {' · '}1er manqué : <span style={{ color: sans1er ? '#b91c1c' : '#15803d' }}>{sans1er}/{closes.length}</span>
                    </span>
                  ) : null
                })()}
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
                          {(b.detail || []).map((d) => {
                            /* ⭐ 3 COULEURS PAR FORCE DU P (11/10/2026, demande utilisateur) :
                             *   vert ≥ 40 % des courses · jaune ≥ 20 % · rouge < 20 %.
                             *   Fractions → seuils valables quand l'archive grossit.
                             *   0 reste gris atténué (absence, pas faiblesse). */
                            const f = stats.nb ? d.n / stats.nb : 0
                            const chip = !d.n ? { color: '#cbd5e1', background: 'transparent', fontWeight: 400 }
                              : f >= 0.4 ? { color: '#15803d', background: '#dcfce7', fontWeight: 800 }
                              : f >= 0.2 ? { color: '#a16207', background: '#fef9c3', fontWeight: 800 }
                              : { color: '#b91c1c', background: '#fee2e2', fontWeight: 800 }
                            return (
                              <span key={d.p} style={{ marginRight: 6, padding: '1px 7px', borderRadius: 10, ...chip }}>
                                P{d.p} : {d.n}/{stats.nb}
                              </span>
                            )
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                    Le tableau du dessus détaille chaque position P1 → P20.
                    Ici on compte les courses où <b>au moins un</b> des trois premiers sort du bloc.
                    {' '}<span style={{ padding: '0 6px', borderRadius: 8, color: '#15803d', background: '#dcfce7', fontWeight: 800 }}>≥40%</span>
                    {' '}<span style={{ padding: '0 6px', borderRadius: 8, color: '#a16207', background: '#fef9c3', fontWeight: 800 }}>≥20%</span>
                    {' '}<span style={{ padding: '0 6px', borderRadius: 8, color: '#b91c1c', background: '#fee2e2', fontWeight: 800 }}>&lt;20%</span>
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