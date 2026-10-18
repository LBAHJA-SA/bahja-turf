import { useEffect, useMemo, useRef, useState } from 'react'
import Entete from '../../src/Entete.jsx'
import {
  aujourdhui, quinteDuJour, declarations, analyse, revueDePresse, articles, htmlSur,
  videosJournaux, partagerVideos, papierDuJour,
} from '../../backend/PRESSE/donnees.js'

/* ═══════════════════════════════════════════════════════════════════════════
 * frontend/PRESSE/Presse.jsx — LA PRESSE DU JOUR (18/10/2026)
 *
 * Ce que l'utilisateur a demandé, mot pour mot :
 *   « une page de la presse : les nouvelles du jour, ce que dit la presse,
 *     leurs pronostics, les déclarations des entraîneurs et des drivers,
 *     les articles et les nouvelles des chevaux. »
 *
 * QUATRE ONGLETS, dans l'ordre de ce qu'il a cité :
 *
 *   ① DÉCLARATIONS   « les déclarations des entraîneurs et des drivers »
 *                    par cheval : la personne, son métier, sa NOTE et son
 *                    TEXTE entier. C'est la matière la plus riche de la page.
 *   ② L'ANALYSE      le chapeau du journaliste, les bases, les belles chances,
 *                    les outsiders, les délaissés, puis l'analyse de chaque
 *                    cheval avec sa note et sa cote.
 *   ③ LA REVUE DE PRESSE  chaque journal et ses 8 chevaux, plus le CONSENSUS
 *                    (combien de journaux citent chaque numéro).
 *   ④ LES JOURNAUX   ⓵ LE PAPIER DU JOUR — le journal qui publie son Quinté du
 *                    jour, EN TEXTE : une carte par cheval (son n° de départ,
 *                    sa rubrique — coup de cœur, dernière heure, outsider… —
 *                    et le commentaire entier). C'est la précision du 18/10 :
 *                    « ما تعرضه تلك الفيديوهات من موقعها الرسمي » — le
 *                    contenu des journaux, pris à la source, sans les vidéos.
 *                    ⓶ LES ARTICLES — les journaux eux-mêmes, texte entier :
 *                    les quotidiens et les hebdomadaires hippiques (« je ne
 *                    veux pas les nouvelles d'Equidia, je veux celles des
 *                    journaux »). Un clic ouvre DANS la page.
 *   ⑤ LES JOURNAUX EN VIDÉO   la revue de presse FILMÉE : le canal qui
 *                    feuillette les journaux chaque matin (« 05 cinq journaux
 *                    Week-End Paris-Turf Geny Course Parisien Tiercé Magazine »,
 *                    « La Gazette des Courses », « Le Veinard avec Courses par
 *                    Courses », « La Pyramide des chances »). Un clic joue la
 *                    vidéo DANS la page — les journaux eux-mêmes sont payants,
 *                    leur revue filmée ne l'est pas.
 *
 * RÈGLES DE LA MAISON, tenues ici :
 *   · la source n'est JAMAIS nommée à l'écran — mais les JOURNAUX, eux, sont le
 *     contenu : c'est leur nom qu'on veut lire, dans la revue de presse comme
 *     sous un article ;
 *   · aucun bouton n'ouvre un onglet : l'article s'affiche dans la visionneuse,
 *     comme les études de la page Analyse ;
 *   · un bloc en panne le dit en une ligne et n'emporte pas les autres ;
 *   · rien n'est inventé : une donnée absente s'écrit « — ».
 *
 * LA COULEUR DE LA PAGE : l'ambre du papier journal (#fbbf24), une teinte que
 * aucune autre page ne porte (cyan = Analyse, magenta = Quinté, orange = Coply,
 * violet = Article).
 * ═══════════════════════════════════════════════════════════════════════════ */

const SK = {
  accent: '#fbbf24',
  accentClair: '#fde68a',
  accentSombre: '#78350f',
  bord: 'rgba(251,191,36,.42)',
  bordDoux: 'rgba(251,191,36,.20)',
  verre: 'rgba(255,255,255,.035)',
  ligne: 'rgba(255,255,255,.075)',
  texte: '#e7f1ff',
  doux: '#9aa8bd',
  muet: '#6b7a90',
  police: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}

/* les journaux que l'utilisateur suit — mis en avant quand ils publient */
const REFERENCE = ['WEEK', 'PARIS', 'GENY', 'PARISIEN', 'TIERCE', 'VEINARD', 'COURSES PAR', 'GAZETTE', 'QUINTE']

/* La teinte d'un journal, pour son étiquette : chaque titre garde la sienne
 * d'un bout à l'autre de la page (la carte, la puce, la visionneuse). */
const TEINTE_JOURNAL = {
  'Paris-Turf': { c: '#7dd3fc', f: 'rgba(56,189,248,.14)', b: 'rgba(56,189,248,.4)' },
  'Le Veinard': { c: '#c4b5fd', f: 'rgba(167,139,250,.14)', b: 'rgba(167,139,250,.4)' },
}
const teinteJournal = (nom) => TEINTE_JOURNAL[nom] || { c: SK.accentClair, f: 'rgba(251,191,36,.14)', b: SK.bord }

/* La teinte d'une rubrique du journal — même code couleur d'un bout à l'autre. */
const TEINTE_RUBRIQUE = {
  'Notre coup de cœur': { c: '#fcd34d', f: 'rgba(251,191,36,.14)', b: 'rgba(251,191,36,.4)', icone: 'bi-star-fill' },
  'Dernière heure': { c: '#fda4af', f: 'rgba(244,63,94,.13)', b: 'rgba(244,63,94,.38)', icone: 'bi-alarm' },
  'Outsider': { c: '#c4b5fd', f: 'rgba(167,139,250,.13)', b: 'rgba(167,139,250,.38)', icone: 'bi-question-circle' },
  'Repéré sur les pistes': { c: '#7dd3fc', f: 'rgba(56,189,248,.13)', b: 'rgba(56,189,248,.38)', icone: 'bi-binoculars' },
  'Stop info': { c: '#cbd5e1', f: 'rgba(148,163,184,.13)', b: 'rgba(148,163,184,.38)', icone: 'bi-info-circle' },
}
const teinteRubrique = (nom) =>
  TEINTE_RUBRIQUE[nom] || { c: SK.accentClair, f: 'rgba(251,191,36,.14)', b: SK.bord, icone: 'bi-bookmark' }

/** Le commentaire d'un papier : du texte nu, jamais du balisage. */
const texteNu = (h) => String(h || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#8217;|&#039;|&rsquo;|&lsquo;/g, "'")
  .replace(/&laquo;|&raquo;/g, '"')
  .replace(/&#8230;/g, '…').replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ')
  .replace(/\s+/g, ' ').trim()

const jour = (d) => {
  if (!d) return ''
  const x = new Date(String(d).length <= 10 ? d + 'T12:00:00' : d)
  if (Number.isNaN(x.getTime())) return ''
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
const heure = (d) => {
  if (!d) return ''
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return ''
  return x.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' · ' +
    x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function teinteNote(n) {
  if (n == null) return { c: SK.doux, f: 'rgba(255,255,255,.05)' }
  if (n >= 8) return { c: '#6ee7b7', f: 'rgba(52,211,153,.16)' }
  if (n >= 6) return { c: '#fde68a', f: 'rgba(251,191,36,.16)' }
  return { c: '#fda4af', f: 'rgba(244,63,94,.16)' }
}

/* ══════════════════════════════ les briques ══════════════════════════════ */

/** La boule d'un numéro de partant. */
function Boule({ n, teinte = SK.accent, taille = 26, titre }) {
  return (
    <span
      title={titre}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: taille, height: taille, borderRadius: 999, flex: '0 0 auto',
        fontSize: taille <= 22 ? 10.5 : 12, fontWeight: 900, lineHeight: 1,
        color: '#0b1220',
        background: `linear-gradient(160deg, #fff8e1, ${teinte})`,
        border: '1px solid rgba(255,255,255,.45)',
        boxShadow: `0 0 12px ${teinte}55, inset 0 1px 0 rgba(255,255,255,.8)`,
      }}
    >{n}</span>
  )
}

/** La ligne d'état d'un bloc : elle charge, elle a échoué, elle est vide. */
function Etat({ etat, msg, vide, onRetry }) {
  if (etat === 'ok') return null
  const texte = etat === 'attente'
    ? 'Chargement…'
    : etat === 'erreur' ? (msg || 'Indisponible.') : vide
  if (!texte) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', borderRadius: 12,
      background: etat === 'erreur' ? 'rgba(244,63,94,.07)' : SK.verre,
      border: '1px solid ' + (etat === 'erreur' ? 'rgba(244,63,94,.28)' : SK.ligne),
      color: etat === 'erreur' ? '#fda4af' : SK.doux, fontSize: 12.5,
    }}>
      <i className={'bi ' + (etat === 'attente' ? 'bi-hourglass-split respire' : etat === 'erreur' ? 'bi-exclamation-triangle' : 'bi-info-circle')} />
      <span>{texte}</span>
      {etat !== 'attente' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginLeft: 'auto', cursor: 'pointer', padding: '4px 11px', borderRadius: 8,
            fontSize: 11, fontWeight: 900, color: SK.accentClair,
            background: 'rgba(251,191,36,.12)', border: '1px solid ' + SK.bordDoux,
          }}
        >
          <i className="bi bi-arrow-clockwise" /> Réessayer
        </button>
      )}
    </div>
  )
}

/** Une pastille d'onglet. */
function Onglet({ actif, onClick, icone, libelle, compte }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '9px 15px', borderRadius: 999, cursor: 'pointer',
        fontSize: 13, fontWeight: 800, letterSpacing: .2,
        color: actif ? '#1a1204' : SK.texte,
        background: actif
          ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
          : SK.verre,
        border: '1px solid ' + (actif ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.10)'),
        boxShadow: actif ? '0 0 22px rgba(251,191,36,.35), inset 0 1px 0 rgba(255,255,255,.5)' : 'none',
        transition: 'all .18s',
      }}
    >
      <i className={'bi ' + icone} />
      <span>{libelle}</span>
      {compte != null && (
        <span style={{
          fontSize: 10.5, fontWeight: 900, padding: '1px 6px', borderRadius: 999,
          background: actif ? 'rgba(26,18,4,.22)' : 'rgba(255,255,255,.08)',
          color: actif ? '#1a1204' : SK.doux,
        }}>{compte}</span>
      )}
    </button>
  )
}

/** Un étage de la sélection du journaliste (bases, outsiders…). */
function Etage({ libelle, nums, teinte, aide }) {
  if (!nums || !nums.length) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{
        minWidth: 116, fontSize: 11, fontWeight: 900, letterSpacing: .8, textTransform: 'uppercase',
        color: teinte,
      }}>{libelle}</span>
      <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
        {nums.map((n) => <Boule key={n} n={n} teinte={teinte} taille={28} />)}
      </span>
      {aide && <span style={{ fontSize: 11, color: SK.muet }}>{aide}</span>}
    </div>
  )
}

/* ══════════════════════════════ la page ══════════════════════════════════ */

export default function Presse() {
  const date = useMemo(() => aujourdhui(), [])

  const [quinte, setQuinte] = useState(null)
  const [decla, setDecla] = useState([])
  const [ana, setAna] = useState(null)
  const [presse, setPresse] = useState(null)
  const [arts, setArts] = useState([])
  const [journaux, setJournaux] = useState([])
  const [videos, setVideos] = useState([])
  const [chaine, setChaine] = useState(null)
  const [papierJour, setPapierJour] = useState(null)

  /* l'état de chaque bloc : attente | ok | vide | erreur */
  const [etats, setEtats] = useState({ quinte: 'attente', decla: 'attente', analyse: 'attente', presse: 'attente', articles: 'attente', videos: 'attente', papier: 'attente' })
  const [pannes, setPannes] = useState({})

  const [onglet, setOnglet] = useState('declarations')
  const [papier, setPapier] = useState('')
  const [vue, setVue] = useState(null)
  const [videoVue, setVideoVue] = useState(null)
  const [relance, setRelance] = useState(0)   // « Réessayer » : on refait les appels

  useEffect(() => { document.title = 'Presse — Bahja TURF' }, [])

  const poser = (cle, etat, panne) => {
    setEtats((e) => ({ ...e, [cle]: etat }))
    if (panne) setPannes((p) => ({ ...p, [cle]: panne }))
  }

  /* ── ① la course du jour, puis ses déclarations et son analyse ─────────── */
  useEffect(() => {
    let mort = false
    poser('quinte', 'attente'); poser('decla', 'attente'); poser('analyse', 'attente')
    ;(async () => {
      let q = null
      try {
        q = await quinteDuJour(date)
        if (mort) return
        setQuinte(q)
        poser('quinte', q ? 'ok' : 'vide')
      } catch (e) {
        if (mort) return
        poser('quinte', 'erreur', 'Course du jour indisponible — ' + (e && e.message ? e.message : e))
        poser('decla', 'erreur', 'Sans la course, les déclarations ne peuvent pas être lues.')
        poser('analyse', 'erreur', 'Sans la course, l\'analyse ne peut pas être lue.')
        return
      }
      if (!q) {
        poser('decla', 'vide', 'Aucune course à la carte aujourd\'hui.')
        poser('analyse', 'vide', 'Aucune course à la carte aujourd\'hui.')
        return
      }

      /* les deux appels suivants sont indépendants : l'un peut tomber */
      try {
        const d = await declarations(q.date, q.r, q.c)
        if (!mort) { setDecla(d); poser('decla', d.length ? 'ok' : 'vide', d.length ? '' : 'Aucune déclaration publiée pour cette course.') }
      } catch (e) {
        if (!mort) poser('decla', 'erreur', 'Déclarations indisponibles — ' + (e && e.message ? e.message : e))
      }

      try {
        const a = await analyse(q.date, q.r, q.c)
        if (!mort) {
          setAna(a)
          const plein = a.chapeau || a.chevaux.length
          poser('analyse', plein ? 'ok' : 'vide', plein ? '' : 'Aucune analyse publiée pour cette course.')
        }
      } catch (e) {
        if (!mort) poser('analyse', 'erreur', 'Analyse indisponible — ' + (e && e.message ? e.message : e))
      }
    })()
    return () => { mort = true }
  }, [date, relance])

  /* ── ③ la revue de presse ─────────────────────────────────────────────── */
  useEffect(() => {
    let mort = false
    poser('presse', 'attente')
    ;(async () => {
      try {
        const p = await revueDePresse()
        if (mort) return
        setPresse(p)
        poser('presse', p.nbJournaux ? 'ok' : 'vide', p.nbJournaux ? '' : 'Aucune revue de presse publiée pour l\'instant.')
      } catch (e) {
        if (!mort) poser('presse', 'erreur', 'Revue de presse indisponible — ' + (e && e.message ? e.message : e))
      }
    })()
    return () => { mort = true }
  }, [relance])

  /* ── ④ les articles des journaux ──────────────────────────────────────── */
  useEffect(() => {
    let mort = false
    poser('articles', 'attente')
    ;(async () => {
      try {
        const r = await articles()
        if (mort) return
        setArts(r.liste)
        setJournaux(r.journaux)
        /* ⚠ une panne PARTIELLE n'est pas une panne : si un journal a répondu,
         *   ses articles s'affichent et la ligne d'état nomme seulement celui
         *   qui manque. Un écran vide se mérite. */
        if (r.liste.length) {
          poser('articles', 'ok')
          if (r.pannes.length) setPannes((p) => ({ ...p, articles: r.pannes.join(' · ') + ' n\'a pas répondu — ses articles manquent.' }))
        } else {
          poser('articles', 'vide', r.pannes.length ? r.pannes.join(' · ') + ' n\'ont pas répondu.' : 'Aucun article publié par les journaux pour l\'instant.')
        }
      } catch (e) {
        if (!mort) poser('articles', 'erreur', 'Les articles des journaux sont indisponibles — ' + (e && e.message ? e.message : e))
      }
    })()
    return () => { mort = true }
  }, [relance])

  const relancer = () => setRelance((n) => n + 1)

  /* ── ⑤ la revue de presse en vidéo (le canal qui feuillette les journaux) ── */
  useEffect(() => {
    let mort = false
    poser('videos', 'attente')
    ;(async () => {
      try {
        const v = await videosJournaux()
        if (mort) return
        setVideos(v.liste)
        setChaine({ nom: v.chaine, lien: v.lien })
        poser('videos', v.liste.length ? 'ok' : 'vide', v.liste.length ? '' : 'Aucune vidéo publiée pour l\'instant.')
      } catch (e) {
        if (!mort) poser('videos', 'erreur', 'La revue de presse en vidéo est indisponible — ' + (e && e.message ? e.message : e))
      }
    })()
    return () => { mort = true }
  }, [relance])

  /* ⚠ Le partage « du jour / avant » se fait ICI, avec le nom de la course :
   *   c'est le seul endroit qui connaît les deux. */
  const { duJour: videosDuJour, autres: videosAutres } = useMemo(
    () => partagerVideos(videos, { nom: quinte && quinte.nom, date }),
    [videos, quinte, date],
  )

  /* ── ⑦ le papier du jour, EN TEXTE, rattaché au Quinté ────────────────────
   * ⚠ Il faut le numéro de la course : le rattachement d'un papier à un cheval
   *   se fait par le NOM, mais c'est le numéro qui s'affiche (le langage du
   *   jeu). On attend donc que la course du jour soit connue. */
  useEffect(() => {
    if (!quinte || !quinte.r || !quinte.c) return
    let mort = false
    poser('papier', 'attente')
    ;(async () => {
      try {
        const p = await papierDuJour({ date: quinte.date || date, r: quinte.r, c: quinte.c })
        if (mort) return
        setPapierJour(p)
        if (p && p.nb) poser('papier', 'ok')
        else poser('papier', 'vide', 'Le journal n\'a rien publié sur le Quinté du jour pour l\'instant — son papier sort la veille au soir.')
      } catch (e) {
        if (!mort) poser('papier', 'erreur', 'Le papier du jour est indisponible — ' + (e && e.message ? e.message : e))
      }
    })()
    return () => { mort = true }
  }, [quinte, date, relance])

  /* les journaux réellement servis, dans l'ordre où ils arrivent */
  const rubriques = useMemo(() => {
    const vues = new Map()
    for (const a of arts) if (a.rubrique) vues.set(a.rubrique, (vues.get(a.rubrique) || 0) + 1)
    return [...vues.entries()].map(([nom, n]) => ({ nom, n }))
  }, [arts])
  const artsVus = useMemo(() => (papier ? arts.filter((a) => a.journal === papier) : arts), [arts, papier])

  const maxVoix = useMemo(
    () => (presse && presse.consensus.length ? presse.consensus[0].voix : 1),
    [presse],
  )

  const noteMoyenne = useMemo(() => {
    const n = decla.filter((d) => d.note != null)
    if (!n.length) return null
    return Math.round((n.reduce((s, d) => s + d.note, 0) / n.length) * 10) / 10
  }, [decla])

  const compteurs = {
    declarations: etats.decla === 'ok' ? decla.length : null,
    presse: etats.presse === 'ok' && presse ? presse.nbJournaux : null,
    articles: etats.articles === 'ok' ? arts.length : null,
    videos: etats.videos === 'ok' ? videos.length : null,
  }

  return (
    <div dir="ltr" style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 15% -10%, #16233c 0%, #04070f 55%)', fontFamily: SK.police, color: SK.texte }}>
      <Entete page="presse" />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 16px 56px' }}>

        {/* ══════════════ L'EN-TÊTE : la page, puis la course du jour ══════════════ */}
        <div style={{
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14,
          padding: '14px 18px', borderRadius: 16,
          background: 'linear-gradient(120deg, rgba(251,191,36,.14), rgba(244,63,94,.06) 55%, rgba(255,255,255,.02))',
          border: '1px solid ' + SK.bord,
          boxShadow: '0 0 36px rgba(251,191,36,.12), inset 0 1px 0 rgba(255,255,255,.07)',
        }}>
          <div>
            <span className="ruban" style={{ borderColor: SK.bordDoux, color: SK.accentClair }}>
              <i className="bi bi-newspaper" /> Presse
            </span>
            <h1 className="titre-page" style={{ margin: '7px 0 0', fontSize: 21, textShadow: '0 0 18px rgba(251,191,36,.5), 0 0 44px rgba(251,191,36,.2)' }}>
              La presse du jour
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: 12.5, color: SK.doux }}>
              Les déclarations des entraîneurs et des drivers · l'analyse · les pronostics des journaux · les articles de la presse
            </p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {compteurs.declarations != null && <span className="badge badge-ambre"><i className="bi bi-chat-quote" /> {compteurs.declarations} déclarations</span>}
            {compteurs.presse != null && <span className="badge badge-ambre"><i className="bi bi-journal-text" /> {compteurs.presse} journaux</span>}
            {compteurs.articles != null && <span className="badge badge-ambre"><i className="bi bi-journals" /> {compteurs.articles} articles</span>}
            {papierJour && papierJour.nb > 0 && <span className="badge badge-ambre"><i className="bi bi-bookmark-star" /> {papierJour.nb} chevaux du papier</span>}
            {compteurs.videos != null && <span className="badge badge-ambre"><i className="bi bi-play-btn" /> {compteurs.videos} vidéos</span>}
          </div>
        </div>

        {/* ══════════════ LA COURSE DU JOUR ══════════════ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14,
          padding: '11px 15px', borderRadius: 14,
          background: SK.verre, border: '1px solid ' + SK.ligne,
        }}>
          {etats.quinte === 'ok' && quinte ? (
            <>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 11px', borderRadius: 8,
                fontWeight: 900, fontSize: 13, color: '#0b1220',
                background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
              }}>R{quinte.r}C{quinte.c}</span>
              <span style={{ fontWeight: 800, fontSize: 14.5 }}>{quinte.hippodrome}</span>
              <span style={{ fontSize: 13, color: SK.texte }}>{quinte.nom}</span>
              <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: SK.doux }}>
                {quinte.heure && <span><i className="bi bi-clock" /> {quinte.heure}</span>}
                {quinte.distance ? <span><i className="bi bi-rulers" /> {quinte.distance} m</span> : null}
                {quinte.partants ? <span><i className="bi bi-people" /> {quinte.partants} partants</span> : null}
                {quinte.discipline ? <span><i className="bi bi-flag" /> {quinte.discipline}</span> : null}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: SK.muet }}>{jour(date)}</span>
            </>
          ) : (
            <Etat etat={etats.quinte} msg={pannes.quinte} vide="Aucune course à la carte aujourd'hui." onRetry={relancer} />
          )}
        </div>

        {/* ══════════════ LES ONGLETS ══════════════ */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <Onglet actif={onglet === 'declarations'} onClick={() => setOnglet('declarations')}
            icone="bi-chat-quote" libelle="Déclarations" compte={compteurs.declarations} />
          <Onglet actif={onglet === 'analyse'} onClick={() => setOnglet('analyse')}
            icone="bi-clipboard2-check" libelle="L'analyse" />
          <Onglet actif={onglet === 'presse'} onClick={() => setOnglet('presse')}
            icone="bi-journal-text" libelle="La revue de presse" compte={compteurs.presse} />
          <Onglet actif={onglet === 'articles'} onClick={() => setOnglet('articles')}
            icone="bi-journals" libelle="Les journaux" compte={compteurs.articles} />
          <Onglet actif={onglet === 'videos'} onClick={() => setOnglet('videos')}
            icone="bi-play-btn" libelle="Les journaux en vidéo" compte={compteurs.videos} />
        </div>

        {/* ═══════════════════════════ ① DÉCLARATIONS ═══════════════════════════ */}
        {onglet === 'declarations' && (
          <section>
            <TitreBloc
              titre="Ce que disent les entraîneurs et les drivers"
              sous={noteMoyenne != null
                ? `${decla.length} déclaration${decla.length > 1 ? 's' : ''} pour cette course · note moyenne ${noteMoyenne}/10`
                : 'Les hommes de la course, cheval par cheval'}
            />
            <Etat etat={etats.decla} msg={pannes.decla} vide="Aucune déclaration publiée pour cette course." onRetry={relancer} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(430px, 1fr))', gap: 12 }}>
              {decla.map((d) => {
                const t = teinteNote(d.note)
                return (
                  <article key={(d.num || '') + '-' + d.cheval} style={{
                    position: 'relative', padding: '14px 16px 15px 15px', borderRadius: 14,
                    background: 'linear-gradient(160deg, rgba(255,255,255,.05), rgba(255,255,255,.015))',
                    border: '1px solid ' + SK.ligne,
                    borderLeft: '3px solid ' + (d.note != null ? t.c : SK.bordDoux),
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 8 }}>
                      {d.num != null && <Boule n={d.num} taille={28} />}
                      <b style={{ fontSize: 13.5, letterSpacing: .2 }}>{d.cheval}</b>
                      {d.role && (
                        <span style={{
                          fontSize: 10, fontWeight: 900, letterSpacing: .6, textTransform: 'uppercase',
                          padding: '2px 7px', borderRadius: 5,
                          color: /entra/i.test(d.role) ? '#c4b5fd' : '#7dd3fc',
                          background: /entra/i.test(d.role) ? 'rgba(167,139,250,.13)' : 'rgba(56,189,248,.13)',
                          border: '1px solid ' + (/entra/i.test(d.role) ? 'rgba(167,139,250,.35)' : 'rgba(56,189,248,.35)'),
                        }}>{d.role}</span>
                      )}
                      {d.note != null && (
                        <span title="Note de la déclaration, sur 10" style={{
                          marginLeft: 'auto', fontSize: 12, fontWeight: 900,
                          padding: '2px 9px', borderRadius: 999, color: t.c, background: t.f,
                          border: '1px solid ' + t.c + '55',
                        }}>{d.note}/10</span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 800, color: SK.accentClair, marginBottom: 6 }}>
                      {d.personne}
                    </div>

                    <TextePliable texte={d.texte} lignes={5} />

                    {d.auteur && (
                      <div style={{ marginTop: 9, fontSize: 10.5, color: SK.muet }}>
                        <i className="bi bi-pencil" /> {d.auteur}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {/* ═══════════════════════════ ② L'ANALYSE ═══════════════════════════ */}
        {onglet === 'analyse' && (
          <section>
            <TitreBloc
              titre="L'analyse de la course"
              sous={ana && ana.auteur ? 'Par ' + ana.auteur : 'Le regard du journaliste sur les partants'}
            />
            <Etat etat={etats.analyse} msg={pannes.analyse} vide="Aucune analyse publiée pour cette course." onRetry={relancer} />

            {ana && etats.analyse === 'ok' && (
              <>
                {(ana.chapeau || ana.presentation) && (
                  <div style={{
                    padding: '14px 18px', marginBottom: 12, borderRadius: 14,
                    background: 'linear-gradient(120deg, rgba(251,191,36,.10), rgba(255,255,255,.015))',
                    border: '1px solid ' + SK.bordDoux,
                    borderLeft: '3px solid ' + SK.accent,
                  }}>
                    {ana.chapeau && (
                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, fontStyle: 'italic', color: '#f4ead8' }}>
                        {ana.chapeau}
                      </p>
                    )}
                    {ana.presentation && (
                      <p style={{ margin: ana.chapeau ? '10px 0 0' : 0, fontSize: 12.5, lineHeight: 1.65, color: SK.doux }}>
                        {ana.presentation}
                      </p>
                    )}
                  </div>
                )}

                <div style={{
                  display: 'grid', gap: 10, padding: '13px 15px', marginBottom: 14, borderRadius: 14,
                  background: SK.verre, border: '1px solid ' + SK.ligne,
                }}>
                  <Etage libelle="Bases" nums={ana.bases} teinte="#34d399" aide="les chevaux de confiance" />
                  <Etage libelle="Belles chances" nums={ana.bellesChances} teinte="#22d3ee" aide="les plus cités ensuite" />
                  <Etage libelle="Outsiders" nums={ana.outsiders} teinte="#fbbf24" aide="les surprises possibles" />
                  <Etage libelle="Délaissés" nums={ana.delaisses} teinte="#fb7185" aide="les moins retenus" />
                </div>

                <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid ' + SK.ligne }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        {['N°', 'Cheval', 'Note', 'Cote', 'Rang', 'L\'analyse'].map((h, i) => (
                          <th key={h} style={{
                            padding: '8px 10px', textAlign: i === 5 ? 'left' : 'center',
                            fontSize: 10.5, fontWeight: 900, letterSpacing: .8, textTransform: 'uppercase',
                            color: '#1a1204', background: 'linear-gradient(180deg,#fbbf24,#f59e0b)',
                            whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ana.chevaux.map((c, i) => {
                        const t = teinteNote(c.note)
                        return (
                          <tr key={c.num} style={{ background: i % 2 ? 'rgba(255,255,255,.018)' : 'transparent' }}>
                            <td style={TD}><Boule n={c.num} taille={24} /></td>
                            <td style={{ ...TD, fontWeight: 800, whiteSpace: 'nowrap' }}>{c.nom}</td>
                            <td style={{ ...TD, textAlign: 'center' }}>
                              {c.note != null
                                ? <span style={{ fontWeight: 900, color: t.c }}>{c.note}</span>
                                : <span style={{ color: SK.muet }}>—</span>}
                            </td>
                            <td style={{ ...TD, textAlign: 'center', color: SK.doux }}>
                              {c.cote != null ? c.cote : '—'}
                            </td>
                            <td style={{ ...TD, textAlign: 'center', color: SK.doux }}>
                              {c.rang != null ? c.rang : '—'}
                            </td>
                            <td style={{ ...TD, color: '#cbd8ea', lineHeight: 1.55 }}>{c.texte || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* ═══════════════════════ ③ LA REVUE DE PRESSE ═══════════════════════ */}
        {onglet === 'presse' && (
          <section>
            <TitreBloc
              titre="Les pronostics des journaux"
              sous={presse && presse.nbJournaux
                ? `${presse.nbJournaux} journaux · 8 chevaux chacun · le Quinté du jour`
                : 'Chaque journal et sa sélection'}
            />
            <Etat etat={etats.presse} msg={pannes.presse} vide="Aucune revue de presse publiée pour l'instant." onRetry={relancer} />

            {presse && presse.nbJournaux > 0 && (
              <>
                {/* le consensus */}
                <div style={{
                  padding: '13px 15px', marginBottom: 14, borderRadius: 14,
                  background: 'linear-gradient(120deg, rgba(251,191,36,.09), rgba(255,255,255,.015))',
                  border: '1px solid ' + SK.bordDoux,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: .9, textTransform: 'uppercase', color: SK.accentClair, marginBottom: 10 }}>
                    <i className="bi bi-bar-chart-line" /> Les chevaux les plus cités
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {presse.consensus.slice(0, 10).map((c) => (
                      <div key={c.num} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Boule n={c.num} taille={24} />
                        <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                          <div style={{
                            width: Math.max(4, Math.round((c.voix / maxVoix) * 100)) + '%',
                            height: '100%', borderRadius: 999,
                            background: 'linear-gradient(90deg, #b45309, #fbbf24)',
                            boxShadow: '0 0 12px rgba(251,191,36,.4)',
                          }} />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: SK.doux, minWidth: 58, textAlign: 'right' }}>
                          {c.voix}/{presse.nbJournaux}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* les journaux */}
                <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid ' + SK.ligne }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={TH}>Journal</th>
                        <th style={{ ...TH, textAlign: 'left' }}>Sa sélection — 8 chevaux</th>
                        <th style={{ ...TH, textAlign: 'center', width: 70 }}>Trouvés</th>
                      </tr>
                    </thead>
                    <tbody>
                      {presse.journaux.map((j, i) => {
                        const ref = REFERENCE.some((r) => j.nom.toUpperCase().includes(r))
                        return (
                          <tr key={j.nom} style={{ background: i % 2 ? 'rgba(255,255,255,.018)' : 'transparent' }}>
                            <td style={{ ...TD, fontWeight: ref ? 900 : 600, color: ref ? SK.accentClair : SK.texte, whiteSpace: 'nowrap' }}>
                              {ref && <i className="bi bi-star-fill" style={{ color: SK.accent, fontSize: 9, marginRight: 6 }} />}
                              {j.nom}
                            </td>
                            <td style={TD}>
                              <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                                {j.picks.map((n, k) => <Boule key={k} n={n} taille={24} />)}
                              </span>
                            </td>
                            <td style={{ ...TD, textAlign: 'center', color: SK.muet, fontSize: 11.5 }}>
                              {j.picks.length}/8
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 11, color: SK.muet }}>
                  <i className="bi bi-star-fill" style={{ color: SK.accent, fontSize: 9 }} /> les journaux que tu suis.
                  La liste des journaux publiés varie chaque jour.
                </p>
              </>
            )}
          </section>
        )}

        {/* ══════════════════════ ④ LES ARTICLES DES JOURNAUX ══════════════════════ */}
        {onglet === 'articles' && (
          <section>
            {/* ─── le papier du jour, EN TEXTE, rattaché au Quinté ─── */}
            <TitreBloc
              titre="Le papier du jour"
              sous={papierJour && papierJour.nb
                ? `${papierJour.journal} · publié le ${papierJour.publie ? heure(papierJour.publie) : '—'} · ${papierJour.nb} chevau${papierJour.nb > 1 ? 'x cités' : ' cité'} du Quinté`
                : 'Ce que le journal écrit sur les chevaux du Quinté'}
            />
            <Etat etat={etats.papier} msg={pannes.papier} vide="Le journal n'a rien publié sur ce Quinté pour l'instant." onRetry={relancer} />

            {papierJour && papierJour.nb > 0 && (
              <div style={{ display: 'grid', gap: 14, marginBottom: 22 }}>
                {papierJour.rubriques.map((rub) => {
                  const t = teinteRubrique(rub.nom)
                  return (
                    <div key={rub.nom}>
                      <SousTitre icone={t.icone} texte={rub.nom} n={rub.chevaux.length} teinte={t} />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 11 }}>
                        {rub.chevaux.map((ch) => (
                          <article key={rub.nom + '-' + ch.num} style={{
                            display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 13px 12px',
                            borderRadius: 14, background: 'linear-gradient(160deg, rgba(255,255,255,.055), rgba(255,255,255,.015))',
                            border: '1px solid ' + SK.ligne, borderLeft: '3px solid ' + t.b,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <Boule n={ch.num} taille={28} />
                              <b style={{ fontSize: 13, fontWeight: 900, letterSpacing: .2 }}>{ch.nom}</b>
                              <span style={{ marginLeft: 'auto', fontSize: 10, color: SK.muet, whiteSpace: 'nowrap' }}>
                                {ch.corde != null && <>corde {ch.corde}</>}
                                {ch.vh != null && <> · VH {ch.vh}</>}
                              </span>
                            </div>
                            <p style={{
                              margin: 0, fontSize: 12.5, lineHeight: 1.6, color: '#cbd8ea',
                              display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>{texteNu(ch.texte)}</p>
                            <button
                              type="button"
                              onClick={() => setVue({
                                cle: 'papier-' + ch.num + '-' + rub.nom,
                                journal: papierJour.journal,
                                rubrique: rub.nom,
                                titre: ch.nom + (ch.num ? ' — n°' + ch.num : ''),
                                texte: ch.texte,
                                date: ch.publie,
                              })}
                              style={{
                                alignSelf: 'flex-start', marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                                fontSize: 11.5, fontWeight: 900, color: '#1a1204',
                                background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
                                border: '1px solid rgba(255,255,255,.3)', boxShadow: '0 0 16px rgba(251,191,36,.28)',
                              }}
                            >
                              <i className="bi bi-book" /> Lire en entier
                            </button>
                          </article>
                        ))}
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop: -4, fontSize: 10.5, color: SK.muet }}>
                  <i className="bi bi-arrow-repeat" /> Relu à chaque ouverture de la page — le journal publie son papier la veille au soir.
                </div>
              </div>
            )}

            <TitreBloc
              titre="Les articles des journaux"
              sous={journaux.length
                ? journaux.join(' · ') + ' — le texte entier, le plus récent d\'abord'
                : 'Ce que publient les quotidiens et les hebdomadaires'}
            />
            <Etat etat={etats.articles} msg={pannes.articles} vide="Aucun article publié par les journaux pour l'instant." onRetry={relancer} />

            {journaux.length > 1 && (
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                <Puce actif={!papier} onClick={() => setPapier('')} libelle="Tous les journaux" n={arts.length} />
                {journaux.map((j) => {
                  const t = teinteJournal(j)
                  return (
                    <Puce
                      key={j}
                      actif={papier === j}
                      onClick={() => setPapier(j)}
                      libelle={j}
                      n={arts.filter((a) => a.journal === j).length}
                      teinte={t}
                    />
                  )
                })}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {artsVus.map((a) => {
                const t = teinteJournal(a.journal)
                return (
                  <article key={a.cle} style={{
                    display: 'flex', flexDirection: 'column', borderRadius: 14, overflow: 'hidden',
                    background: 'linear-gradient(160deg, rgba(255,255,255,.055), rgba(255,255,255,.015))',
                    border: '1px solid ' + SK.ligne,
                    borderTop: '3px solid ' + t.b,
                    transition: 'border-color .18s, box-shadow .18s, transform .18s',
                  }}>
                    {a.image && (
                      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0b1220' }}>
                        <img
                          src={a.image}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                        <span style={{
                          position: 'absolute', left: 9, top: 9, padding: '3px 8px', borderRadius: 6,
                          fontSize: 9.5, fontWeight: 900, letterSpacing: .6, textTransform: 'uppercase',
                          color: '#0b1220', background: t.c,
                        }}>{a.journal}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '12px 13px 13px', flex: 1 }}>
                      {!a.image && (
                        <span style={{
                          alignSelf: 'flex-start', padding: '3px 8px', borderRadius: 6,
                          fontSize: 9.5, fontWeight: 900, letterSpacing: .6, textTransform: 'uppercase',
                          color: t.c, background: t.f, border: '1px solid ' + t.b,
                        }}>{a.journal}</span>
                      )}
                      <h3 style={{ margin: 0, fontSize: 13.5, lineHeight: 1.4, fontWeight: 900 }}>{a.titre}</h3>
                      {a.chapo && (
                        <p style={{
                          margin: 0, fontSize: 12, lineHeight: 1.55, color: SK.doux,
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{a.chapo}</p>
                      )}
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
                        <span style={{ fontSize: 10.5, color: SK.muet }}>
                          {a.date ? heure(a.date) : (a.dateTexte || '—')}{a.auteur ? ' · ' + a.auteur : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVue(a)}
                          style={{
                            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                            fontSize: 11.5, fontWeight: 900, color: '#1a1204',
                            background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
                            border: '1px solid rgba(255,255,255,.3)',
                            boxShadow: '0 0 16px rgba(251,191,36,.28)',
                          }}
                        >
                          <i className="bi bi-book" /> Lire
                        </button>
                      </div>
                      {a.rubrique && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 5,
                            color: SK.doux, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)',
                          }}>{a.rubrique}</span>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}
        {/* ═════════════════ ⑤ LES JOURNAUX EN VIDÉO ═════════════════ */}
        {onglet === 'videos' && (
          <section>
            <TitreBloc
              titre="La revue de presse en vidéo"
              sous={videos.length
                ? `Les journaux feuilletés chaque matin — ${videosDuJour.length} vidéo${videosDuJour.length > 1 ? 's' : ''} du jour, ${videosAutres.length} des jours précédents`
                : 'Les journaux feuilletés chaque matin, un par un'}
            />
            <Etat etat={etats.videos} msg={pannes.videos} vide="Aucune vidéo publiée pour l'instant." onRetry={relancer} />

            {videosDuJour.length > 0 && (
              <>
                <SousTitre
                  icone="bi-star-fill"
                  texte={'Le Jour du Quinté' + (quinte && quinte.nom ? ' — ' + quinte.nom : '')}
                  n={videosDuJour.length}
                />
                <GrilleVideos videos={videosDuJour} onVoir={setVideoVue} />
              </>
            )}

            {videosAutres.length > 0 && (
              <>
                <SousTitre icone="bi-clock-history" texte="Les jours précédents" n={videosAutres.length} />
                <GrilleVideos videos={videosAutres} onVoir={setVideoVue} />
              </>
            )}
          </section>
        )}
      </div>

      {/* l'article s'ouvre ICI, jamais dans un onglet */}
      {vue && <Visionneuse article={vue} onFermer={() => setVue(null)} />}

      {/* la vidéo se joue ICI, jamais dans un onglet */}
      {videoVue && <LecteurVideo video={videoVue} onFermer={() => setVideoVue(null)} />}
    </div>
  )
}

/* ════════════════════════════ les sous-blocs ═════════════════════════════ */

const TD = { padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,.055)', verticalAlign: 'middle' }
const TH = {
  padding: '8px 10px', textAlign: 'center', fontSize: 10.5, fontWeight: 900, letterSpacing: .8,
  textTransform: 'uppercase', color: '#1a1204', background: 'linear-gradient(180deg,#fbbf24,#f59e0b)',
  whiteSpace: 'nowrap',
}

function TitreBloc({ titre, sous }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <h2 style={{
        margin: 0, fontSize: 15, fontWeight: 900, letterSpacing: .3, color: '#fff',
        textShadow: '0 0 16px rgba(251,191,36,.4)',
      }}>
        <span style={{ color: SK.accent, marginRight: 8 }}>▍</span>{titre}
      </h2>
      {sous && <p style={{ margin: '4px 0 0 20px', fontSize: 11.5, color: SK.muet }}>{sous}</p>}
    </div>
  )
}

function Puce({ actif, onClick, libelle, n, teinte }) {
  const actifFond = teinte ? teinte.c : 'rgba(251,191,36,.92)'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 800,
        color: actif ? '#0b1220' : (teinte ? teinte.c : SK.doux),
        background: actif ? actifFond : (teinte ? teinte.f : 'rgba(255,255,255,.04)'),
        border: '1px solid ' + (actif ? 'rgba(255,255,255,.3)' : (teinte ? teinte.b : 'rgba(255,255,255,.09)')),
      }}
    >
      {libelle}
      <span style={{ fontSize: 10, opacity: .75 }}>{n}</span>
    </button>
  )
}

/**
 * UN TEXTE QUI SE PLIE — et un VRAI bouton pour lire la suite.
 *
 * ⚠ POURQUOI (18/10/2026, signalé par l'utilisateur : « تتمة القراءة لا تعمل ») :
 *   le guillemet fermant « » » de la déclaration était écrit en amber, gras, en
 *   fin de citation — il ressemblait trait pour trait à un chevron de bouton.
 *   On cliquait dessus : rien ne se passait (ce n'était qu'une ponctuation), et
 *   la déclaration était de toute façon affichée en entier.
 *   → le guillemet redevient une PONCTUATION (gris acier, fin), et le bouton est
 *     un vrai bouton : « Lire la suite » / « Replier », qui n'apparaît QUE si le
 *     texte dépasse réellement les lignes montrées (mesuré, pas deviné).
 */
function TextePliable({ texte, lignes = 5 }) {
  const [ouvert, setOuvert] = useState(false)
  const [coupe, setCoupe] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    /* ouvert : plus rien à mesurer (et le bouton « Replier » reste) */
    if (ouvert) return
    const mesurer = () => setCoupe(el.scrollHeight - el.clientHeight > 2)
    mesurer()
    window.addEventListener('resize', mesurer)
    return () => window.removeEventListener('resize', mesurer)
  }, [texte, ouvert, lignes])

  return (
    <>
      <p
        ref={ref}
        style={{
          margin: 0, fontSize: 13, lineHeight: 1.62, color: '#dce7f6',
          ...(ouvert ? {} : {
            display: '-webkit-box', WebkitLineClamp: lignes,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }),
        }}
      >
        <span style={{ color: '#8798ad' }}>« </span>
        {texte}
        <span style={{ color: '#8798ad' }}> »</span>
      </p>
      {(coupe || ouvert) && (
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          title={ouvert ? 'Replier la déclaration' : 'Lire la déclaration en entier'}
          style={{
            alignSelf: 'flex-start', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 11px', borderRadius: 9, cursor: 'pointer',
            fontSize: 11, fontWeight: 900, letterSpacing: .3,
            color: SK.accentClair, background: 'rgba(251,191,36,.10)',
            border: '1px solid ' + SK.bordDoux,
          }}
        >
          <i className={'bi ' + (ouvert ? 'bi-chevron-up' : 'bi-chevron-down')} />
          {ouvert ? 'Replier' : 'Lire la suite'}
        </button>
      )}
    </>
  )
}

/** Le sous-titre d'une section à l'intérieur d'un onglet. */
function SousTitre({ icone, texte, n, teinte }) {
  const t = teinte || { c: SK.accentClair, b: SK.bord }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px',
      fontSize: 11.5, fontWeight: 900, letterSpacing: .8, textTransform: 'uppercase', color: t.c,
    }}>
      <i className={'bi ' + icone} style={{ color: t.c }} />
      <span>{texte}</span>
      {n != null && (
        <span style={{
          fontSize: 10, fontWeight: 900, padding: '1px 7px', borderRadius: 999,
          color: t.c, background: 'rgba(255,255,255,.06)', border: '1px solid ' + t.b,
        }}>{n}</span>
      )}
    </div>
  )
}

/** La grille des vidéos d'un journal. */
function GrilleVideos({ videos, onVoir }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 18 }}>
      {videos.map((v) => (
        <article key={v.id} style={{
          display: 'flex', flexDirection: 'column', borderRadius: 14, overflow: 'hidden',
          background: 'linear-gradient(160deg, rgba(255,255,255,.055), rgba(255,255,255,.015))',
          border: '1px solid ' + SK.ligne, borderTop: '3px solid ' + SK.bord,
        }}>
          <button
            type="button"
            onClick={() => onVoir(v)}
            title="Regarder la vidéo"
            style={{
              position: 'relative', display: 'block', padding: 0, border: 0, cursor: 'pointer',
              aspectRatio: '16/9', background: '#0b1220', overflow: 'hidden',
            }}
          >
            <img
              src={v.vignette}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: .92 }}
              onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
            />
            <span style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                width: 46, height: 46, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(244,63,94,.9)', color: '#fff', fontSize: 19,
                boxShadow: '0 0 22px rgba(244,63,94,.55)', border: '2px solid rgba(255,255,255,.75)',
              }}>
                <i className="bi bi-play-fill" />
              </span>
            </span>
            {v.duree && (
              <span style={{
                position: 'absolute', right: 8, bottom: 8, padding: '1px 6px', borderRadius: 5,
                fontSize: 10.5, fontWeight: 900, color: '#fff', background: 'rgba(0,0,0,.78)',
              }}>{v.duree}</span>
            )}
            {v.publie && (
              <span style={{
                position: 'absolute', left: 8, bottom: 8, padding: '1px 7px', borderRadius: 5,
                fontSize: 10, fontWeight: 800, color: '#1a1204', background: 'rgba(251,191,36,.94)',
              }}>{v.publie}</span>
            )}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '11px 12px 12px', flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .2 }}>
              {v.titre}
            </h3>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, paddingTop: 3 }}>
              {v.vu && <span style={{ fontSize: 10.5, color: SK.muet }}><i className="bi bi-eye" /> {v.vu}</span>}
              <button
                type="button"
                onClick={() => onVoir(v)}
                style={{
                  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 900, color: '#1a1204',
                  background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
                  border: '1px solid rgba(255,255,255,.3)', boxShadow: '0 0 16px rgba(251,191,36,.28)',
                }}
              >
                <i className="bi bi-play-fill" /> Regarder
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

/** Le lecteur : la vidéo se joue DANS la page, jamais dans un onglet.
 *  ⚠ La vidéo est la revue de presse d'un tiers : elle garde sa marque, comme
 *    l'article relayé — c'est le contenu, pas notre habillage. */
function LecteurVideo({ video, onFermer }) {
  useEffect(() => {
    const echap = (e) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', echap)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', echap); document.body.style.overflow = '' }
  }, [onFermer])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,15,.88)', display: 'flex', padding: '12px 14px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFermer() }}
    >
      <div style={{
        margin: '0 auto', width: 'min(1060px, 100%)', display: 'flex', flexDirection: 'column', minHeight: 0,
        background: 'linear-gradient(160deg, #101a2c, #0a1120)', borderRadius: 14, overflow: 'hidden',
        border: '1px solid ' + SK.bord, boxShadow: '0 24px 60px rgba(0,0,0,.6)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap',
          padding: '11px 14px', borderBottom: '1px solid ' + SK.ligne, background: 'rgba(255,255,255,.03)',
        }}>
          <i className="bi bi-play-btn" style={{ color: SK.accent, fontSize: 17 }} />
          <b style={{ color: '#fff', fontSize: 13, flex: 1, minWidth: 200, lineHeight: 1.4, textTransform: 'uppercase' }}>
            {video.titre}
          </b>
          <span style={{ fontSize: 10.5, color: SK.muet }}>{video.publie}{video.vu ? ' · ' + video.vu : ''}</span>
          <button
            type="button"
            onClick={onFermer}
            style={{
              cursor: 'pointer', padding: '7px 15px', borderRadius: 9, border: 0,
              fontWeight: 900, fontSize: 12.5, color: '#1a1204',
              background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', boxShadow: '0 0 18px rgba(251,191,36,.3)',
            }}
          >
            ✕ Fermer
          </button>
        </div>
        <div style={{ background: '#000', aspectRatio: '16/9', width: '100%' }}>
          <iframe
            src={'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(video.id) + '?autoplay=1&rel=0&hl=fr&modestbranding=1'}
            title={video.titre}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        </div>
      </div>
    </div>
  )
}

/** La visionneuse : l'article DANS la page, sur son papier.
 *  ⚠ Pas d'iframe et pas d'onglet : on a le texte entier de l'article, on le
 *    donne à lire ici. Le HTML est nettoyé avant (`htmlSur`) — pas de script,
 *    pas de gestionnaire d'événement, pas de lien qui sortirait de la page. */
function Visionneuse({ article, onFermer }) {
  useEffect(() => {
    const echap = (e) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', echap)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', echap); document.body.style.overflow = '' }
  }, [onFermer])

  const t = teinteJournal(article.journal)
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,15,.86)', display: 'flex', padding: '12px 14px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFermer() }}
    >
      <div style={{
        margin: '0 auto', width: 'min(1000px, 100%)', display: 'flex', flexDirection: 'column', minHeight: 0,
        background: 'linear-gradient(160deg, #101a2c, #0a1120)', borderRadius: 14, overflow: 'hidden',
        border: '1px solid ' + t.b, boxShadow: '0 24px 60px rgba(0,0,0,.6)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap',
          padding: '11px 14px', borderBottom: '1px solid ' + SK.ligne, background: 'rgba(255,255,255,.03)',
        }}>
          <span style={{
            padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 900,
            letterSpacing: .7, textTransform: 'uppercase',
            color: t.c, background: t.f, border: '1px solid ' + t.b,
          }}>{article.journal}</span>
          <b style={{ color: '#fff', fontSize: 13.5, flex: 1, minWidth: 200, lineHeight: 1.4 }}>{article.titre}</b>
          <span style={{ fontSize: 10.5, color: SK.muet }}>
            {article.date ? heure(article.date) : (article.dateTexte || '')}
            {article.auteur ? ' · ' + article.auteur : ''}
          </span>
          <button
            type="button"
            onClick={onFermer}
            style={{
              cursor: 'pointer', padding: '7px 15px', borderRadius: 9, border: 0,
              fontWeight: 900, fontSize: 12.5, color: '#1a1204',
              background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
              boxShadow: '0 0 18px rgba(251,191,36,.3)',
            }}
          >
            ✕ Fermer
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#fffdf7' }}>
          <div style={{ padding: '18px 24px 30px', color: '#1a1204' }}>
            {article.rubrique && (
              <div style={{
                fontFamily: SK.police, fontSize: 10, fontWeight: 900, letterSpacing: .8,
                textTransform: 'uppercase', color: '#92400e', marginBottom: 8,
              }}>{article.journal} · {article.rubrique}</div>
            )}
            <h1 style={{
              fontFamily: 'Georgia, "Times New Roman", serif', margin: '0 0 10px',
              fontSize: 24, lineHeight: 1.25, color: '#120c02',
            }}>{article.titre}</h1>
            {article.chapo && (
              <p style={{
                fontFamily: SK.police, margin: '0 0 18px', fontSize: 14, lineHeight: 1.6,
                color: '#5b4a2f', fontWeight: 600,
              }}>{article.chapo}</p>
            )}
            {/* ⚠ l'image de l'article est déjà dans le texte pour Paris-Turf, mais
                pas pour Le Veinard : on la pose ici, une seule fois, quand elle
                n'y est pas. */}
            {article.image && !/<img/i.test(article.texte || '') && (
              <img
                src={article.image}
                alt=""
                style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, margin: '0 auto 16px', display: 'block' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <div
              className="p-presse-article"
              dangerouslySetInnerHTML={{ __html: htmlSur(article.texte) }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
