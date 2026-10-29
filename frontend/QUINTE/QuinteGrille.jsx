import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  rangsMarche, bandeMarche, BANDE_MARCHE, fetchFiabilite, fetchEcarts, fetchChoix, fetchEmpreinte,
  fetchBlocPm, fetchBassmat, formeMarche, fetchHuit, fetchBassmatChoix, ticketBassmat,
  fetchBassmatMois, jugerTicket,
} from '../../src/lib/quinte'
import { chargerDetailReu } from '../../backend/ARTICLE/turfFrance.js'

/* ⭐ 28/10/2026 — les quotas affichés viennent de `GROUPES`, JAMAIS d'un
 * littéral : le texte suit le moteur au lieu de dériver (4-3-1-1-0 → 9 chevaux
 * avait laissé sept phrases périmées dans la page). */
const QUOTAS_TXT = GROUPES.map((g) => g.quota).join('-')
const NB_TICKET = GROUPES.reduce((s2, g) => s2 + g.quota, 0)

const s = {
  box: { border: '1px solid rgba(125,205,255,.28)', borderRadius: 10, background: 'rgba(12,20,37,.72)' },
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
/* ── LES SIX PEAUX, VERSION NUIT (18/10/2026) ──────────────────────────────
 *  Les six onglets ne se confondent toujours pas : chacun garde SA couleur,
 *  SON dessin et SA police — mais sur fond sombre, avec des halos de néon.
 *  `fond` est transparent : c'est le fond de src/index.css qui passe dessous.
 *  `ligne` et `alt` sont des FONDS de ligne (zébrures) : jamais des bordures.
 * ────────────────────────────────────────────────────────────────────────── */
const THEME = {
  grille: {
    titre: 'La grille',
    sousTitre: 'Les 16 cases du carnet · lecture en colonnes',
    fond: 'transparent',
    entete: 'linear-gradient(120deg,#03140f 0%,#065f46 55%,#10b981 100%)',
    accent: '#34d399', accentSombre: '#064e3b', accentClair: 'rgba(52,211,153,.18)',
    bord: 'rgba(52,211,153,.45)', carte: 'rgba(8,26,22,.74)', ligne: 'rgba(255,255,255,.02)', alt: 'rgba(52,211,153,.07)',
    on: 'rgba(52,211,153,.22)', danger: 'rgba(244,63,94,.18)', texte: '#d9fbe9', muted: '#7ba796',
    ombre: 'rgba(52,211,153,.35)', ombreD: '0 0 22px rgba(52,211,153,.18)',
    police: 'system-ui, -apple-system, sans-serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid rgba(52,211,153,.45)', borderRadius: 14, background: 'rgba(8,26,22,.74)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06), 0 0 26px rgba(52,211,153,.12)' },
    hdrStyle: { background: 'linear-gradient(180deg,#065f46,#03140f)', color: '#d1fae5' },
    th: { padding: '6px 9px', fontSize: 10, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: '#a7f3d0', fontFamily: 'system-ui, sans-serif' },
    td: { padding: '6px 9px', fontSize: 13 },
  },
  ticket: {
    titre: 'Le ticket',
    sousTitre: 'Les chevaux retenus et leurs scores',
    fond: 'transparent',
    entete: 'linear-gradient(120deg,#070d1c 0%,#1e3a8a 60%,#3b82f6 100%)',
    accent: '#60a5fa', accentSombre: '#1e3a8a', accentClair: 'rgba(96,165,250,.18)',
    bord: 'rgba(96,165,250,.45)', carte: 'rgba(9,17,38,.76)', ligne: 'rgba(255,255,255,.02)', alt: 'rgba(96,165,250,.07)',
    on: 'rgba(96,165,250,.22)', danger: 'rgba(244,63,94,.18)', texte: '#dbeafe', muted: '#7c8fb3',
    ombre: 'rgba(59,130,246,.30)', ombreD: 'none',
    police: 'system-ui, -apple-system, sans-serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid rgba(96,165,250,.45)', borderRadius: 3, background: 'rgba(9,17,38,.76)' },
    hdrStyle: { background: 'linear-gradient(180deg,#1e3a8a,#070d1c)', color: '#bfdbfe' },
    th: { padding: '7px 9px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#93c5fd', fontFamily: 'system-ui, sans-serif' },
    td: { padding: '7px 9px', fontSize: 13 },
  },
  archive: {
    titre: 'Archive',
    sousTitre: 'Le registre des Quintés · la mémoire de la méthode',
    fond: 'transparent',
    entete: 'linear-gradient(120deg,#1c1206 0%,#92400e 55%,#d97706 100%)',
    accent: '#fbbf24', accentSombre: '#78350f', accentClair: 'rgba(251,191,36,.18)',
    bord: 'rgba(251,191,36,.45)', carte: 'rgba(28,20,8,.78)', ligne: 'rgba(255,255,255,.02)', alt: 'rgba(251,191,36,.06)',
    on: 'rgba(251,191,36,.22)', danger: 'rgba(244,63,94,.18)', texte: '#fde9c3', muted: '#a98d63',
    ombre: 'rgba(217,119,6,.30)', ombreD: '0 0 22px rgba(251,191,36,.14)',
    police: 'Georgia, "Times New Roman", serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid rgba(251,191,36,.50)', borderRadius: 3, background: 'rgba(28,20,8,.78)' },
    hdrStyle: { background: 'linear-gradient(180deg,#92400e,#1c1206)', color: '#fef3c7' },
    th: { padding: '7px 9px', fontSize: 11, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: '#fde68a', fontFamily: 'Georgia, serif' },
    td: { padding: '7px 9px', fontSize: 13 },
  },
  stats: {
    titre: 'Statistiques',
    sousTitre: 'Ce que l’archive prouve — encore trop peu de courses',
    fond: 'transparent',
    entete: 'linear-gradient(120deg,#140a2e 0%,#7e22ce 60%,#c084fc 100%)',
    accent: '#c4b5fd', accentSombre: '#5b21b6', accentClair: 'rgba(196,181,253,.18)',
    bord: 'rgba(196,181,253,.45)', carte: 'rgba(20,14,40,.76)', ligne: 'rgba(255,255,255,.02)', alt: 'rgba(196,181,253,.07)',
    on: 'rgba(196,181,253,.22)', danger: 'rgba(244,63,94,.18)', texte: '#ede9fe', muted: '#9385b8',
    ombre: 'rgba(168,85,247,.35)', ombreD: '0 0 26px rgba(168,85,247,.18)',
    police: 'system-ui, -apple-system, sans-serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid rgba(196,181,253,.45)', borderRadius: 16, background: 'rgba(20,14,40,.76)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06), 0 0 26px rgba(168,85,247,.14)' },
    hdrStyle: { background: 'linear-gradient(180deg,#7e22ce,#140a2e)', color: '#ede9fe' },
    th: { padding: '8px 9px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: '#ddd6fe', fontFamily: 'system-ui, sans-serif' },
    td: { padding: '8px 9px', fontSize: 13 },
  },
  ecarts: {
    titre: 'Écarts',
    sousTitre: 'Les cases P1..P20 — qui donne, qui ne donne plus',
    fond: 'transparent',
    entete: 'linear-gradient(120deg,#03141a 0%,#0e7490 55%,#22d3ee 100%)',
    accent: '#22d3ee', accentSombre: '#155e75', accentClair: 'rgba(34,211,238,.16)',
    bord: 'rgba(34,211,238,.45)', carte: 'rgba(7,24,33,.76)', ligne: 'rgba(255,255,255,.02)', alt: 'rgba(34,211,238,.07)',
    on: 'rgba(34,211,238,.22)', danger: 'rgba(244,63,94,.18)', texte: '#cffafe', muted: '#6f97a6',
    ombre: 'rgba(34,211,238,.35)', ombreD: '0 0 22px rgba(34,211,238,.16)',
    police: 'system-ui, -apple-system, sans-serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid rgba(34,211,238,.45)', borderRadius: 8, background: 'rgba(7,24,33,.76)' },
    hdrStyle: { background: 'linear-gradient(180deg,#0e7490,#03141a)', color: '#cffafe' },
    th: { padding: '6px 9px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#a5f3fc', fontFamily: 'system-ui, sans-serif' },
    td: { padding: '6px 9px', fontSize: 13 },
  },
  /* 🩸 LE CHOIX — le laboratoire. Rouge carmin, rapport d'expérience : coins
     nets, chiffres monospace, encadrés de résultat. C'est l'onglet où l'on
     regarde EN FACE les 4 chevaux de G1 et les 4 de G2 (16/10/2026). */
  choix: {
    titre: 'Choix',
    sousTitre: 'G1 et G2 — ce que coûte le choix, règle par règle',
    fond: 'transparent',
    entete: 'linear-gradient(120deg,#1a0408 0%,#be123c 55%,#fb7185 100%)',
    accent: '#fb7185', accentSombre: '#881337', accentClair: 'rgba(251,113,133,.16)',
    bord: 'rgba(251,113,133,.45)', carte: 'rgba(32,10,18,.76)', ligne: 'rgba(255,255,255,.02)', alt: 'rgba(251,113,133,.07)',
    on: 'rgba(251,113,133,.22)', danger: 'rgba(244,63,94,.18)', texte: '#ffe4e6', muted: '#b07d86',
    ombre: 'rgba(244,63,94,.35)', ombreD: '0 0 22px rgba(251,113,133,.16)',
    police: 'system-ui, -apple-system, sans-serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid rgba(251,113,133,.45)', borderRadius: 4, background: 'rgba(32,10,18,.76)' },
    hdrStyle: { background: 'linear-gradient(180deg,#be123c,#1a0408)', color: '#ffe4e6' },
    th: { padding: '6px 9px', fontSize: 10, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: '#fecdd3', fontFamily: 'system-ui, sans-serif' },
    td: { padding: '6px 9px', fontSize: 13 },
  },
  /* 🎯 (retiré le 19/10/2026) — le Trio · Couplé a été sorti de cette page.
     ⚠ 23/10/2026 : la page Coply qui le portait est supprimée à son tour. */
  /* ⭐ LA BASSMAT DE LA COURSE — 28/10/2026. « بصمة السباق ».
     Magenta profond : c'est un SCEAU, pas un tableau de bord. Il se lit avant
     de parier, il ne se confond avec aucun des six autres onglets. */
  bassmat: {
    titre: 'Bassmat',
    sousTitre: 'بصمة السباق — l’empreinte du mois et de la course',
    fond: 'transparent',
    entete: 'linear-gradient(120deg,#180418 0%,#86198f 55%,#f0abfc 100%)',
    accent: '#f0abfc', accentSombre: '#701a75', accentClair: 'rgba(240,171,252,.16)',
    bord: 'rgba(240,171,252,.45)', carte: 'rgba(28,8,28,.78)', ligne: 'rgba(255,255,255,.02)', alt: 'rgba(240,171,252,.07)',
    on: 'rgba(240,171,252,.22)', danger: 'rgba(244,63,94,.18)', texte: '#fbe8fd', muted: '#ab86ae',
    ombre: 'rgba(192,38,211,.35)', ombreD: '0 0 24px rgba(240,171,252,.16)',
    police: 'system-ui, -apple-system, sans-serif',
    nb: { th: 'ui-monospace, Consolas, monospace', td: 'ui-monospace, Consolas, monospace' },
    box: { border: '1px solid rgba(240,171,252,.45)', borderRadius: 10, background: 'rgba(28,8,28,.78)' },
    hdrStyle: { background: 'linear-gradient(180deg,#86198f,#180418)', color: '#fbe8fd' },
    th: { padding: '6px 9px', fontSize: 10, fontWeight: 800, letterSpacing: 0.7, textTransform: 'uppercase', color: '#f5d0fe', fontFamily: 'system-ui, sans-serif' },
    td: { padding: '6px 9px', fontSize: 13 },
  },
}

const TABS = [
  ['grille', 'La grille'], ['ticket', 'Le ticket'], ['bassmat', 'Bassmat'],
  ['archive', 'Archive'], ['stats', 'Statistiques'], ['ecarts', 'Écarts'], ['choix', 'Choix'],
]

function Boite({ n, pris, presse, couleur, score, cote, slot, marche, onClick }) {
  // boule 3D : dégradé radial + ombres portées/incrustées.
  // le NUMÉRO au centre, le n° de CASE (P1, P2…) au-dessus — demandé le
  // 10/10/2026 (fini le « secret du carnet » : on lit P et numéro ensemble).
  // le BADGE MARCHÉ en haut à droite (16/10/2026) : le RANG DE COTE, sur un
  // fond qui dit ce que ce rang vaut (52 % / 43 % / 34 % / 13 % de top-5,
  // mesuré sur 96 Quintés — voir le panneau de mesure de l'onglet La grille).
  const c = couleur || { base: '#16a34a', sombre: false }
  const txt = c.sombre ? '#422006' : '#fff'
  const bd = marche != null ? BANDE_MARCHE[bandeMarche(marche)] : null
  return (
    <button
      onClick={onClick}
      title={
        (cote ? `cote ${cote}\n` : '') +
        (bd ? `rang de marché ${marche} — ${bd.lib}\n` : '') +
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
      {bd && (
        <span title={`rang de marché ${marche} — ${bd.lib}`} style={{
          position: 'absolute', top: 1, right: 1, minWidth: 15, height: 15, borderRadius: 999,
          background: bd.fond, color: bd.couleur, border: `1px solid ${bd.couleur}`,
          fontSize: 9, fontWeight: 800, lineHeight: '13px', textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,.35)',
        }}>{marche}</span>
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
  /* ⭐ 24/10/2026 — la piste vient d'Equidia (`lib_piste_course`), le terrain
   *   de turf-france : casacourses ne publie ni l'un ni l'autre. Voir
   *   `fetchConditions()` dans src/lib/quinte.js. */
  const piste = c.lib_piste
    || (/psf/i.test(c.track_type || '') ? 'PSF' : c.track_type ? 'Herbe' : NON_PUBLIE)
  const categorie = c.class || c.categorie || ''
  const details = c.comment || c.conditions || ''

  const Ligne = ({ k, v, fort }) => (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, color: '#64748b', minWidth: 92 }}>{k}</span>
      <span style={{
        fontSize: 13,
        fontWeight: fort ? 800 : 500,
        color: v === NON_PUBLIE ? '#7a8ea9' : '#e7f1ff',
        fontStyle: v === NON_PUBLIE ? 'italic' : 'normal',
      }}>{v}</span>
    </div>
  )

  return (
    <div style={{
      padding: 14, marginTop: 14, borderRadius: sk ? sk.box.borderRadius : 6,
      border: '1px solid ' + (sk ? sk.bord : '#d7dce5'),
      borderLeft: '5px solid ' + (sk ? sk.accent : '#0f172a'),
      background: sk ? sk.alt : 'rgba(255,255,255,.03)',
      boxShadow: sk ? sk.ombreD : 'none',
      fontFamily: sk ? sk.police : 'system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <b style={{ fontSize: 13, color: sk ? sk.accent : '#1d4ed8', letterSpacing: 1 }}>LES CONDITIONS DE LA COURSE</b>
        
      </div>

      <div style={{ marginTop: 8, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ fontSize: 12, color: '#475569' }}>
          <b style={{ color: '#e7f1ff' }}>{c.date_formatted || date}</b>
          {c.time ? ' · ' + (heureParisGMT(date, c.time) || c.time + ' h') : ''}
          {'   ·   '}
          {c.reunion_code ? <b style={{ color: '#e7f1ff' }}>{c.reunion_code}</b> : null}
          {/* le drapeau du pays de la réunion — une VRAIE image (Windows ne
              dessine pas les drapeaux emoji) */}
          <Drapeau pays={course.pays || 'FR'} titre={course.pays || 'France'} h={12}
            style={{ display: 'inline-block', verticalAlign: '-2px', marginLeft: 6, marginRight: 4 }} />
          {course.hippodrome || ''}
          {c.code ? '  ·  ' + c.code : ''}
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{c.name || course.hippodrome}</div>
        {categorie ? (
          <div style={{ fontSize: 11, color: '#fb7185', fontWeight: 700 }}>
            {categorie}{String(categorie).toUpperCase().includes('GROUPE') ? ' — COURSE DE GROUPE' : ''}
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
          <Ligne k="Corde" v={c.corde ? String(c.corde) : NON_PUBLIE} />
          <Ligne k="Terrain" v={c.terrain || c.track_condition || NON_PUBLIE} />
          <Ligne k="Discipline" v={FR(c.type)} fort />
        </div>
        <div style={{ flex: '1 1 240px' }}>
          <Ligne k="Partants" v={course.nbPartants ? String(course.nbPartants) : NON_PUBLIE} fort />
          <Ligne k="Allocations" v={c.allocation || dotations(c.prize, course.devisee)} />
          <Ligne k="Tirelire"
            v={c.tirelire === true ? 'Oui' : c.tirelire === false ? 'Non' : NON_PUBLIE} />
          <Ligne k="Météo"
            v={c.meteo || (c.weather_temp != null ? `${c.weather_temp}°C` : NON_PUBLIE)} />
        </div>
      </div>

      {details ? (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: '#1d4ed8', cursor: 'pointer' }}>
            Les conditions détaillées ({details.length} caractères)
          </summary>
          <div style={{ fontSize: 11, color: '#a4b8d6', lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>
            {details}
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
  // 📊 LES DEUX MESURES ÉCRITES SUR DISQUE (tools/fiabilite.mjs, tools/ecarts.mjs).
  //    La page les AFFICHE telles quelles : aucun chiffre saisi à la main (§7).
  const [fiabilite, setFiabilite] = useState(null)
  const [ecarts, setEcarts] = useState(null)
  // ⭐ LES DEUX EMPREINTES (tools/empreinte.mjs, 19/10/2026) — la bassmat du
  //    podiums et du quinté, par case du carnet. Lu tel quel.
  const [empreinte, setEmpreinte] = useState(null)
  // ⭐ LA BASSMAT DU BLOC (tools/bloc-pm.mjs, 21/10/2026) — la case CROISÉE avec
  //    la bande du marché. Lu tel quel.
  const [blocPm, setBlocPm] = useState(null)
  // 🩸 LA MESURE DU CHOIX dans G1/G2 (tools/choix-g1g2.mjs, 16/10/2026).
  const [choix, setChoix] = useState(null)
  // ⭐ LA BASSMAT DE LA COURSE (tools/bassmat.mjs, 28/10/2026) — « بصمة السباق ».
  //    La forme du marché, les taux par case, l'empreinte attendue, l'audit des
  //    décisions. Le fichier est lu tel quel : aucun chiffre saisi à la main.
  const [bassmat, setBassmat] = useState(null)
  // ⭐ G5 ET LES 8 CHEVAUX (tools/huit.mjs, 28/10/2026) — la preuve du plafond
  //    de G5, et le classement des 121 répartitions de 8 chevaux.
  const [huit, setHuit] = useState(null)
  // ⭐ LA VARIANTE DE LA BASSMAT (29/10/2026, §11.43) — elle ne choisit pas dans
  //    le moteur ; ce fichier dit seulement ce qu'elle prendrait et ce que ça coûte.
  const [bassmatChoix, setBassmatChoix] = useState(null)
  // ⭐ LA BASSMAT DU MOIS (29/10/2026, §11.45) — l'archive réelle du mois :
  //    où les tickets posés ont perdu, et qui était pris à la place.
  const [bassmatMois, setBassmatMois] = useState(null)
  // ⚠ un ticket ARCHIVÉ est INTOUCHABLE : la page l'affiche, jamais elle ne le recalcule
  //   (AGENTS.md §13.3) : la page doit le montrer tel quel, pas le recalculer.
  const [ticketManuel, setTicketManuel] = useState(null)  // ⚑ la lecture du RÉSULTAT est déclenchée par l'utilisateur (bouton) :
  //   on ne va pas sonder casacourses en boucle toute la journée.
  const [busyResultat, setBusyResultat] = useState(false)
  // 🔒 AUCUNE modification à la main : le numéro de chaque case est celui du moteur.
  //    Le clic ne change plus rien (demandé le 05/10/2026, reconfirmé le 20/10).

  /* ------------------------------------------------------ chargement --- */

  useEffect(() => { document.title = 'Quinté — Bahja TURF' }, [])

  // les deux mesures écrites par les outils — statiques, lues une fois.
  useEffect(() => {
    fetchFiabilite().then((x) => x && setFiabilite(x)).catch(() => {})
    fetchEcarts().then((x) => x && setEcarts(x)).catch(() => {})
    fetchChoix().then((x) => x && setChoix(x)).catch(() => {})
    fetchEmpreinte().then((x) => x && setEmpreinte(x)).catch(() => {})
    fetchBlocPm().then((x) => x && setBlocPm(x)).catch(() => {})
    fetchBassmat().then((x) => x && setBassmat(x)).catch(() => {})
    fetchHuit().then((x) => x && setHuit(x)).catch(() => {})
    fetchBassmatChoix().then((x) => x && setBassmatChoix(x)).catch(() => {})
    fetchBassmatMois().then((x) => x && setBassmatMois(x)).catch(() => {})
  }, [])

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
      //   \u26a0 16/10/2026 : cette ligne ne suivait PAS son propre commentaire —
      //   elle posait le ticket gelé dès qu'il existait. D'où le ticket du
      //   16/10, figé la veille sur 16 DÉCLARÉS, qui portait un `16` dans une
      //   course de 15 partants. Seule exception : un ticket MANUEL est
      //   intouchable (\u00a713.3 règle 4).
      if (rec?.ticket?.length && ((rec.arrivee || []).length > 0 || rec.ticketSource === 'manuel')) {
        setTicketManuel(rec.ticket)
      }
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
        if (!rec?.ticket?.length && local?.ticket?.length
          && ((local.arrivee || []).length > 0 || local.ticketSource === 'manuel')) {
          setTicketManuel(local.ticket)
        }
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

  // 📍 le RANG DE MARCHÉ de chaque partant (1 = la cote la plus basse) — c'est
  //   le badge des boules. Il ne règle QUE la queue : G4 et G5 (§11.23).
  const rangs = useMemo(() => rangsMarche(cotes), [cotes])
  const bandes = useMemo(() => Object.fromEntries(Object.entries(rangs).map(([n, r]) => [n, bandeMarche(r)])), [rangs])

  /* ⭐ LA FORME DU MARCHÉ DU JOUR (28/10/2026) — fermé / normal / ouvert.
   *  C'est elle qui choisit la colonne de taux lue dans l'onglet Bassmat :
   *  un marché fermé ne lit pas les cases comme un marché ouvert (P8 donne
   *  22,7 % ici, 26,7 % là). Le seuil est celui de `formeMarche`, une seule
   *  source pour l'outil et pour la page. */
  const forme = useMemo(() => formeMarche(cotes), [cotes])

  const rempli = useMemo(() => {
    if (!grille) return null
    return remplirGrille(grille, classementFinal, 'PLAT', cotes, stats)
  }, [grille, classementFinal, cotes, stats])

  // 🔒 le choix est celui du moteur. Seul le ticket ARCHIVÉ passe devant
  //   (il est intouchable, §13.3) — mais on ne peut pas le modifier à la main.
  //   ⚠ 16/10/2026 : le gel passe devant, mais SANS ses fantômes. On marque
  //   donc `ticketAffiche` : la grille et le ticket montrent alors la MÊME
  //   sélection. Course COURUE → le ticket est un CONSTAT (on retire les
  //   non-partants, on ne complète pas) ; course OUVERTE → la place du
  //   fantôme est reprise par la case du moteur, quota tenu.
  const courseFinie = useMemo(
    () => !!archive.find((a) => a.date === date && (a.arrivee || []).length > 0),
    [archive, date],
  )

  const detail = useMemo(() => {
    if (!rempli) return null
    const sel = (ticketManuel && ticketManuel.length)
      ? ticketAffiche(ticketManuel, rempli, !courseFinie) : null
    const pose = sel ? new Set(sel) : null
    return rempli.detail.map((g) => ({
      ...g,
      cases: g.cases.map((c) => ({
        ...c,
        pris: pose ? pose.has(c.num) : c.pris,
        marche: rangs[c.num] ?? null,
        bande: bandes[c.num] ?? null,
      })),
    }))
  }, [rempli, ticketManuel, rangs, bandes, courseFinie])

/* Couleurs des 5 groupes — les mêmes que sur le carnet papier. */
const COULEUR_GROUPE = {
  G1: { base: '#34d399', sombre: true },
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

/* ══════════════════ LE PANNEAU DE MESURE — la fiabilité, pas une opinion ═══
 * ⚠ TOUS les chiffres viennent de `data/fiabilite.json`, écrit par
 *   tools/fiabilite.mjs. La page n'en calcule aucun et n'en invente aucun (§7).
 *   Métrique §11.18 : « PAYANTE » = le 1-2-3 (gagnant, 2e, 3e) est COMPLET dans
 *   la grille. Le repère honnête est le marché seul, à nombre de chevaux ÉGAL.
 * ⚠ `experience` liste les variantes TESTÉES du siège de G5. Une seule est
 *   appliquée (`appliquee`) ; les autres attendent la décision de l'utilisateur
 *   (§11.16 : les quotas n'appartiennent pas au moteur).
 * ═════════════════════════════════════════════════════════════════════════ */
function PanneauMesure({ sk, fiabilite, detail }) {
  const [ouvert, setOuvert] = useState(true)
  if (!fiabilite) return (
    <div style={{ border: '1px dashed ' + sk.bord, borderRadius: sk.box.borderRadius, padding: '8px 12px', marginTop: 12, fontSize: 12, color: sk.muted }}>
      Panneau de mesure : écrire <b>public/data/fiabilite.json</b> (node tools\fiabilite.mjs) pour l'afficher ici.
    </div>
  )
  const M = fiabilite.mesure
  const L = (x) => (x == null ? '—' : x + ' %')
  const ligne = (lab, r, gras) => (
    <tr key={lab} style={{ borderBottom: '1px solid ' + sk.bord, background: gras ? sk.accentClair : sk.ligne }}>
      <td style={{ ...sk.td, fontWeight: gras ? 800 : 500 }}>{lab}</td>
      <td style={{ ...sk.td, fontWeight: 800, fontFamily: sk.nb.td, color: sk.accent }}>{L(r.payante)}</td>
      <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{L(r.couvre4)}</td>
      <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{L(r.q5)}</td>
      <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{r.chevaux}</td>
    </tr>
  )
  const pris = (detail || []).flatMap((g) => g.cases.filter((c) => c.pris && c.bande).map((c) => c.bande))
  const dansTicket = (cle) => pris.filter((b) => b === cle).length
  const nb = { fontFamily: sk.nb.td, fontWeight: 700 }
  return (
    <div style={{ ...sk.box, padding: '12px 14px', marginTop: 12, boxShadow: sk.ombreD }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: sk.accent }}>Fiabilité mesurée</b>
        <span style={{ fontSize: 12, color: sk.muted }}>
          {M.echantillon.n} Quintés à presse réelle ({M.echantillon.du} → {M.echantillon.au}) · {M.metrique}
        </span>
        <button onClick={() => setOuvert((v) => !v)}
          style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 999, border: '1px solid ' + sk.bord, background: sk.carte, color: sk.accent, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
          {ouvert ? 'plier' : 'déplier'}
        </button>
      </div>
      {ouvert && (
        <>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={sk.hdrStyle}>
                  {['méthode', 'PAYANTE (1-2-3)', 'couvre +4', '5/5', 'ch.'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {ligne('⭐ le moteur — cotes finales', fiabilite.code.finales, true)}
                {ligne('le moteur — cotes d’ouverture', fiabilite.code.ouverture)}
                {ligne('le marché seul — 8 meilleures cotes', fiabilite.baselines.marche8)}
                {ligne('le marché seul — 9 meilleures cotes', fiabilite.baselines.marche9)}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11.5, color: sk.muted, marginTop: 6, lineHeight: 1.6 }}>
            Depuis le 19/10/2026 (§11.23), la <b>queue</b> du ticket se remplit à la cote —
            aujourd'hui <b> G4</b> seulement. Depuis le 29/10/2026 (§11.46) le ticket de
            <b>{NB_TICKET} chevaux</b> porte les quotas <b>{QUOTAS_TXT}</b> : le siège de G5 est
            passé à G2, G5 n'a plus de place. G1-G3 restent au rang de presse.
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: sk.texte, lineHeight: 1.6 }}>
            <b style={{ letterSpacing: .8, textTransform: 'uppercase', color: sk.accent }}>Le badge des boules</b>{' '}
            — le rang de cote des chevaux <b>cités par la presse</b> : ce que ce rang vaut.
            <div style={{ overflowX: 'auto', marginTop: 6 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={sk.hdrStyle}>
                    {['rang de marché', 'chevaux', 'top-5', 'top-3', 'dans votre ticket'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {fiabilite.badge.map((b) => {
                    const cle = b.lib.startsWith('top 3') ? 'fort' : b.lib.startsWith('4e-5e') ? 'bon'
                      : (b.lib.startsWith('6e-8e') || b.lib.startsWith('9e-12e')) ? 'moyen'
                      : b.cle === '13+' ? 'faible' : null
                    const bd = cle ? BANDE_MARCHE[cle] : null
                    return (
                      <tr key={b.cle} style={{ borderBottom: '1px solid ' + sk.bord, background: bd ? bd.fond : sk.alt }}>
                        <td style={{ ...sk.td, fontWeight: 700, color: bd ? bd.couleur : sk.texte }}>
                          {bd ? bd.court + ' · ' : ''}{b.lib}
                        </td>
                        <td style={{ ...sk.td, ...nb, color: sk.muted }}>{b.n}</td>
                        <td style={{ ...sk.td, ...nb }}>{b.top5} %</td>
                        <td style={{ ...sk.td, ...nb }}>{b.top3} %</td>
                        <td style={{ ...sk.td, ...nb }}>{cle ? dansTicket(cle) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <span style={{ color: sk.muted }}>
              Le badge de la boule porte ce rang, sur le fond de sa bande (M≤3 · M≤5 · M6-12 · M13+).
              Il <b>choisit</b> dans G4 ; dans G1-G3 c’est le rang de presse qui décide, et G5 n’a
              plus de siège depuis le 20/10/2026 (§11.23 · §11.26).
            </span>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: sk.texte, lineHeight: 1.6 }}>
            <b style={{ letterSpacing: .8, textTransform: 'uppercase', color: sk.accent }}>L’expérience du siège de G5</b>{' '}
            — la méthode dit « B5 : 1 ou 0 » (§11.6). Le 21/10/2026, le siège est <b>sorti de G5</b>
            (§11.34) : la ligne marquée « appliquée » est celle du moteur. Les autres lectures sont
            mesurées sur les <b>mêmes courses</b>, chacune à sa taille de ticket
            (tools/experience-g5.mjs).
            <div style={{ overflowX: 'auto', marginTop: 6 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={sk.hdrStyle}>
                    {['variante', 'PAYANTE', 'ouverture', '1re moitié', '2e moitié', 'état'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {fiabilite.experience.map((v) => (
                    <tr key={v.cle} style={{ borderBottom: '1px solid ' + sk.bord, background: v.appliquee ? sk.on : sk.ligne }}>
                      <td style={{ ...sk.td, fontWeight: v.appliquee ? 800 : 500 }}>{v.nom}</td>
                      <td style={{ ...sk.td, ...nb, fontWeight: 800, color: v.appliquee ? sk.accent : sk.texte }}>{L(v.payante)}</td>
                      <td style={{ ...sk.td, ...nb }}>{L(v.payanteOuverture)}</td>
                      <td style={{ ...sk.td, ...nb, color: sk.muted }}>{L(v.payante1re)}</td>
                      <td style={{ ...sk.td, ...nb, color: sk.muted }}>{L(v.payante2e)}</td>
                      <td style={{ ...sk.td }}>
                        {v.appliquee
                          ? <span style={{ fontWeight: 800, color: sk.accent }}>appliquée</span>
                          : <span style={{ color: sk.muted }}>non appliquée</span>}
                        {v.garde != null && <span style={{ color: sk.muted }}> · siège gardé {v.garde} %</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <span style={{ color: sk.muted }}>
              Une seule de ces variantes est en production — celle qui porte « appliquée »
              ({QUOTAS_TXT}, §11.46). Le fichier est réécrit par <b>node tools\fiabilite.mjs</b>.
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════ L'ONGLET ÉCARTS — les cases P1..P20 ════════════
 * ⚠ « P » = le RANG DE PRESSE (P1 = le 1er cité), pas la colonne du carnet
 *   papier : mesuré le 16/10, c'est le rang de presse qui suit l'arrivée.
 *   Une case DONNE quand le cheval qui l'occupe finit dans les cinq premiers.
 *   Chiffres : data/ecarts.json (tools/ecarts.mjs).
 * ═════════════════════════════════════════════════════════════════════════ */
function TabEcarts({ sk, ecarts, detail }) {
  if (!ecarts) return (
    <div style={{ fontSize: 13, color: sk.muted }}>
      Pas encore de mesure : écrire <b>public/data/ecarts.json</b> (node tools\ecarts.mjs).
    </div>
  )
  const M = ecarts.mesure
  const parPlace = {}
  for (const g of detail || []) for (const c of g.cases) if (c.place) parPlace[c.place] = c
  const etat = (x) => {
    if (!x.n || x.dernierHit == null) return { lib: 'jamais', couleur: '#fb7185', fond: 'rgba(244,63,94,.18)' }
    if (x.coursesDepuis != null && x.coursesDepuis >= 5) return { lib: 'froide', couleur: '#fb7185', fond: 'rgba(244,63,94,.18)' }
    if (x.pctTop5 >= 40 || (x.coursesDepuis != null && x.coursesDepuis <= 1)) return { lib: 'chaude', couleur: '#34d399', fond: 'rgba(52,211,153,.18)' }
    return { lib: 'tiède', couleur: '#fbbf24', fond: 'rgba(251,191,36,.16)' }
  }
  return (
    <div>
      <div style={{ fontSize: 13, color: sk.texte, lineHeight: 1.6, background: sk.alt, border: '1px solid ' + sk.bord, borderLeft: '4px solid ' + sk.accent, borderRadius: sk.box.borderRadius, padding: '10px 12px', marginBottom: 12 }}>
        <b>{M.courses} courses à presse réelle</b> ({M.du} → {M.au}) · {M.definition}
        <br />
        <span style={{ color: sk.muted }}>
          « courses depuis » = depuis combien de courses de ce registre la case n’a plus rien donné.
          « jours depuis » se compte depuis la dernière course du registre ({M.au}), pas depuis aujourd’hui.
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...sk.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13, overflow: 'hidden', boxShadow: sk.ombreD }}>
          <thead>
            <tr style={sk.hdrStyle}>
              {['case', 'la course du jour', 'P donne', '% top-5', '% top-3', 'gagne', 'dernier hit', 'courses depuis', 'état', 'les 6 dernières'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {ecarts.places.filter((x) => x.n).map((x, i) => {
              const e = etat(x)
              const c = parPlace[x.p]
              return (
                <tr key={x.p} style={{ borderBottom: '1px solid ' + sk.bord, background: i % 2 ? sk.alt : sk.ligne }}>
                  <td style={{ ...sk.td, fontWeight: 800 }}>P{x.p}</td>
                  <td style={{ ...sk.td, fontWeight: 700, color: sk.accent }}>
                    {c ? <>{c.num}{c.pris ? ' ✓' : ''}{c.marche != null ? <span style={{ color: sk.muted, fontWeight: 500 }}> · M{c.marche}</span> : null}</> : <span style={{ color: sk.muted }}>—</span>}
                  </td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{x.top5}/{x.n}</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 700, color: x.pctTop5 >= 40 ? '#34d399' : x.pctTop5 >= 25 ? sk.texte : '#fb7185' }}>{x.pctTop5} %</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{x.pctTop3} %</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{x.victoires}</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{x.dernierHit || '—'}</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: x.coursesDepuis != null && x.coursesDepuis >= 5 ? 800 : 500, color: x.coursesDepuis != null && x.coursesDepuis >= 5 ? '#fb7185' : sk.texte }}>
                    {x.coursesDepuis == null ? '—' : x.coursesDepuis}
                  </td>
                  <td style={{ ...sk.td }}>
                    <span style={{ padding: '1px 8px', borderRadius: 999, fontWeight: 800, fontSize: 11, color: e.couleur, background: e.fond, border: '1px solid ' + e.couleur }}>{e.lib}</span>
                  </td>
                  <td style={{ ...sk.td }}>
                    {(x.serie || []).map((v, k) => (
                      <span key={k} title={v ? 'la case a donné' : 'rien'} style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, marginRight: 2, background: v ? '#34d399' : '#e2e8f0', border: '1px solid ' + (v ? '#34d399' : '#cbd5e1') }} />
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: sk.muted, marginTop: 10 }}>
        « la course du jour » = le cheval qui occupe la case dans la grille affichée (✓ = retenu par le moteur, M = son rang de marché).
        La pastille d’état : <b style={{ color: '#34d399' }}>chaude</b> (≥ 40 % de top-5 ou un hit à la dernière course),
        <b style={{ color: '#fb7185' }}> froide</b> (rien depuis 5 courses ou plus), <b style={{ color: '#fbbf24' }}>tiède</b> entre les deux.
        C’est un repère de lecture, jamais une raison d’écarter un cheval (§6 : on écarte sur le physique).
      </div>
    </div>
  )
}
function TabChoix({ sk, choix }) {
  if (!choix) return (
    <div style={{ fontSize: 13, color: sk.muted }}>
      Pas encore de mesure : écrire <b>public/data/choix.json</b> (node tools\choix-g1g2.mjs).
    </div>
  )
  const D = choix.diagnostic || {}
  const L = choix.levier || {}
  const nb = (x) => (x == null ? '—' : String(x).replace('.', ','))
  const bar = (v, max) => (
    <span style={{ display: 'inline-block', verticalAlign: 'middle', width: 120, height: 9, background: sk.alt, border: '1px solid ' + sk.bord, borderRadius: 999, overflow: 'hidden' }}>
      <span style={{ display: 'block', width: Math.max(2, Math.round((100 * v) / max)) + '%', height: '100%', background: sk.accent }} />
    </span>
  )
  const blocs = (D.blocs || []).slice().sort((a, b) => (b.ecartes || 0) - (a.ecartes || 0))
  const meilleure = choix.grille?.meilleure || {}
  const enTete = (choix.regles || []).filter((r) => r.deux >= (choix.code || 0)).slice(0, 6)
  /* ⚠ le signe doit s'afficher, pas un « + » aveugle. */
  const plus = (v) => (v > 0 ? '+' : v < 0 ? '\u2212' : '\u00b1') + nb(Math.round(10 * Math.abs(v)) / 10)
  const gainChoix = (L.oracle || 0) - (L.code || 0)
  return (
    <div>
      <div style={{ fontSize: 13, color: sk.texte, lineHeight: 1.6, background: sk.alt, border: '1px solid ' + sk.bord, borderLeft: '4px solid ' + sk.accent, borderRadius: sk.box.borderRadius, padding: '10px 12px', marginBottom: 12 }}>
        <b>{choix.n} Quintés à presse réelle</b> · cotes {choix.cotes === 'ouverture' ? 'du matin (ouverture)' : 'finales (Equidia)'}
        {choix.carriere ? ' · carrière collectée (casacourses + PMU)' : ' · sans carrière'} — la mesure du <b>choix dans G1 et G2</b>.
        {choix.couverture ? (
          <>
            <br />
            <span style={{ color: sk.muted }}>
              carrière enrichie <b>PMU</b> : terrain {Math.round((100 * choix.couverture.terrain) / choix.couverture.tot)} % ·
              sens {Math.round((100 * choix.couverture.sens) / choix.couverture.tot)} % ·
              VH passé {Math.round((100 * choix.couverture.vhPasse) / choix.couverture.tot)} % ·
              VH du jour {Math.round((100 * choix.couverture.vhJour) / choix.couverture.tot)} %
              {' '}({choix.couverture.tot} chevaux)
            </span>
          </>
        ) : null}
        <br />
        <span style={{ color: sk.muted }}>
          ⛔ Les quotas sont fixés (§11.16) : <b>{QUOTAS_TXT}</b> depuis le 29/10/2026
          (§11.46 — le ticket de {NB_TICKET} chevaux, le siège de G5 passé à G2).
          On ne mesure QUE qui entre dans chaque bloc. Métrique =
          <b>PAYANTE</b>, le 1-2-3 complet dans la grille.
        </span>
      </div>

      {/* ① OÙ SONT LES 1-2-3 */}
      <div style={{ fontSize: 12, fontWeight: 800, color: sk.accent, letterSpacing: .6, textTransform: 'uppercase', margin: '14px 0 6px' }}>
        ① Où sont les 1-2-3 — quel bloc les écarte
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...sk.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13, overflow: 'hidden', boxShadow: sk.ombreD }}>
          <thead>
            <tr style={sk.hdrStyle}>
              {['bloc', 'chevaux du top-3 arrivés là', 'gardés', 'écartés', 'taux de garde'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {blocs.map((b, i) => (
              <tr key={b.id} style={{ borderBottom: '1px solid ' + sk.bord, background: i % 2 ? sk.alt : sk.ligne }}>
                <td style={{ ...sk.td, fontWeight: 800 }}>{b.id}</td>
                <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{b.arrivees}</td>
                <td style={{ ...sk.td, fontFamily: sk.nb.td, color: '#34d399', fontWeight: 700 }}>{b.gardes}</td>
                <td style={{ ...sk.td, fontFamily: sk.nb.td, color: b.ecartes >= 20 ? '#fb7185' : sk.texte, fontWeight: b.ecartes >= 20 ? 800 : 500 }}>{b.ecartes}</td>
                <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 700, color: b.tauxGarde >= 80 ? '#34d399' : b.tauxGarde <= 40 ? '#fb7185' : sk.texte }}>{nb(b.tauxGarde)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: sk.texte, marginTop: 8, lineHeight: 1.6 }}>
        <b>{nb(D.partG1G2)} %</b> des <b>{D.totalEcartes}</b> chevaux du top-3 écartés le sont dans
        <b> G1 ou G2</b>. Le trou est bien là — et pas dans la queue.
      </div>

      {/* ② LE LEVIER */}
      <div style={{ fontSize: 12, fontWeight: 800, color: sk.accent, letterSpacing: .6, textTransform: 'uppercase', margin: '16px 0 6px' }}>
        ② Le levier — le choix contre la quota
      </div>
      <div style={{ ...sk.box, padding: '10px 12px', boxShadow: sk.ombreD, fontSize: 13 }}>
        {[
          ['le code en production (' + QUOTAS_TXT + ', ' + NB_TICKET + ' chevaux)', L.code, sk.muted],
          ['le choix PARFAIT dans G1 et G2 (oracle)', L.oracle, sk.accent],
          ['le choix parfait dans G1 seul', L.oracleG1, sk.accent],
          ['le choix parfait dans G2 seul', L.oracleG2, sk.accent],
          ['le hasard pur', L.hasard, sk.muted],
        ].map(([lib, v, col]) => (
          <div key={lib} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3px 0' }}>
            <span style={{ width: 300, color: sk.texte }}>{lib}</span>
            {bar(v, L.oracle)}
            <b style={{ fontFamily: sk.nb.td, color: col, width: 64, textAlign: 'right' }}>{nb(v)} %</b>
            <span style={{ fontFamily: sk.nb.td, fontSize: 11, color: v > L.code ? '#34d399' : sk.muted, width: 56 }}>
              {v === L.code ? '' : (v > L.code ? '+' : '') + nb(Math.round(10 * (v - L.code)) / 10)}
            </span>
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: 12, color: sk.texte, borderTop: '1px dashed ' + sk.bord, paddingTop: 8, lineHeight: 1.6 }}>
          Le <b>choix</b> qui reste (G2 seul) vaut <b style={{ color: sk.accent }}>{plus(gainChoix)} pts</b>,
          et le <b>choix parfait</b> reste hors d’atteinte : c’est le plafond du §11.24, pas une
          règle à trouver. Les quotas sont figés (<b>{QUOTAS_TXT}</b>, §11.46) — le seul travail
          permis est de choisir QUI entre dans un bloc.
        </div>
      </div>

      {/* ③ LES RÈGLES */}
      <div style={{ fontSize: 12, fontWeight: 800, color: sk.accent, letterSpacing: .6, textTransform: 'uppercase', margin: '16px 0 6px' }}>
        ③ Chaque règle, seule — G1 puis G2 puis les deux ({(choix.regles || []).length} règles)
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
        <table style={{ ...sk.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12.5, overflow: 'hidden' }}>
          <thead style={{ position: 'sticky', top: 0 }}>
            <tr style={sk.hdrStyle}>
              {['règle de choix', 'G1', 'G2', 'les deux', 'top-3'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(choix.regles || []).map((r, i) => {
              const gain = r.deux > (choix.code || 0)
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid ' + sk.bord, background: r.id === 'p' ? sk.on : i % 2 ? sk.alt : sk.ligne }}>
                  <td style={{ ...sk.td, fontSize: 12.5 }}>{r.label}{r.id === 'p' ? ' ← le code actuel' : ''}</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{nb(r.g1)} %</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{nb(r.g2)} %</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: gain ? 800 : 500, color: gain ? '#34d399' : sk.texte }}>{nb(r.deux)} %</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{nb(Math.round(1000 * r.couv) / 1000)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: sk.texte, marginTop: 8, lineHeight: 1.6 }}>
        Au-dessus du code : <b>{enTete.map((r) => r.id).join(', ') || 'rien'}</b>.
        Le <b>LOO</b> — la meilleure règle choisie sur les {choix.n - 1} autres courses — vaut
        <b style={{ color: sk.loo < choix.code ? '#fb7185' : '#34d399' }}> {nb(choix.loo)} %</b>
        {choix.loo < choix.code ? ' , soit SOUS le code : les différences sont du bruit.' : '.'}
      </div>

      {/* ④ LA GRILLE */}
      <div style={{ fontSize: 12, fontWeight: 800, color: sk.accent, letterSpacing: .6, textTransform: 'uppercase', margin: '16px 0 6px' }}>
        ④ La grille G1 × G2 — PAYANTE
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...sk.box, borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, overflow: 'hidden' }}>
          <thead>
            <tr style={sk.hdrStyle}>
              <th style={sk.th}>G1 \ G2</th>
              {choix.grille.tete.map((m) => <th key={m} style={{ ...sk.th, fontFamily: sk.nb.th }}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {choix.grille.lignes.map((l, i) => (
              <tr key={l.m1} style={{ borderBottom: '1px solid ' + sk.bord, background: i % 2 ? sk.alt : sk.ligne }}>
                <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 700 }}>{l.m1}</td>
                {l.lignes.map((v, k) => (
                  <td key={k} style={{ ...sk.td, fontFamily: sk.nb.td, textAlign: 'center', fontWeight: v >= (meilleure.taux || 0) ? 800 : 500, color: v >= 40 ? '#34d399' : v < 30 ? '#fb7185' : sk.texte }}>
                    {nb(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: sk.texte, marginTop: 8 }}>
        Meilleure case : <b>{nb(meilleure.taux)} %</b> ({meilleure.m1} / {meilleure.m2}) — contre
        <b> {nb(choix.code)} %</b> pour le code. L’écart est de
        <b> {nb(Math.round(10 * ((meilleure.taux || 0) - choix.code)) / 10)} pt</b>.
      </div>

      {/* ⑤ STABILITÉ */}
      <div style={{ fontSize: 12, fontWeight: 800, color: sk.accent, letterSpacing: .6, textTransform: 'uppercase', margin: '16px 0 6px' }}>
        ⑤ Stabilité — les deux moitiés de l’archive
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...sk.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12.5, overflow: 'hidden' }}>
          <thead>
            <tr style={sk.hdrStyle}>
              {['règle', '1re moitié', '2e moitié', 'écart'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(choix.stabilite || []).map((x, i) => (
              <tr key={x.id} style={{ borderBottom: '1px solid ' + sk.bord, background: i % 2 ? sk.alt : sk.ligne }}>
                <td style={{ ...sk.td, fontSize: 12.5 }}>{x.label}</td>
                <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{nb(x.h1)} %</td>
                <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{nb(x.h2)} %</td>
                <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: Math.abs(x.h1 - x.h2) >= 8 ? 800 : 500, color: Math.abs(x.h1 - x.h2) >= 8 ? '#fb7185' : sk.muted }}>
                  {nb(Math.abs(Math.round(10 * (x.h1 - x.h2)) / 10))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 12.5, color: sk.texte, background: sk.alt, border: '1px solid ' + sk.bord, borderLeft: '4px solid ' + sk.accent, borderRadius: sk.box.borderRadius, padding: '10px 12px', lineHeight: 1.6 }}>
        <b>Verdict.</b> {choix.verdict}
        <br />
        <span style={{ color: sk.muted }}>
          Mesure écrite par <b>tools/choix-g1g2.mjs</b> (rejouer : <code>node tools\choix-g1g2.mjs</code>).
          La carrière vient de <b>tools/collect-forms.mjs</b> (<code>data/forms.json</code>),
          enrichie par <b>tools/collect-terrain.mjs</b> (<code>data/terrain.json</code>) et
          <b>tools/collect-vh.mjs</b> (<code>data/vh.json</code>) — terrain, sens et VH collectés de PMU (§14.6).
          La règle en production est <b>G1-G3 carnet · G4 marché</b>, sur les quotas
          <b> {QUOTAS_TXT}</b> ({NB_TICKET} chevaux, §11.46).
        </span>
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════════════════════
 *  ⭐ L'ONGLET BASSMAT — « بصمة السباق » (28/10/2026)
 *
 *  Demande de l'utilisateur, textuellement :
 *    « Quinté → Archive · Statistiques · Écarts · Choix : بغيت نخرج منهم بصمة
 *      للسباق لان الاختيارات الحالية ضعيفة جدا »
 *
 *  Cet onglet ne mesure rien : il LIT `data/bassmat.json`, écrit par
 *  `tools/bassmat.mjs` sur les 96 Quintés à presse réelle. Il répond à une
 *  seule question : **cette course, quelle forme a-t-elle ?**
 *
 *    ① la FORME DU MARCHÉ (fermé / normal / ouvert) — le seul découpage qui
 *      déplace la lecture des cases, mesuré dans le fichier ;
 *    ② l'EMPREINTE ATTENDUE — les cases les plus fortes POUR CETTE FORME,
 *      donc le podium et le quinté attendus, en numéros de case ;
 *    ③ LE TICKET, case par case — le taux de chaque case du ticket, et la
 *      plus faible (le maillon faible, au sens de §6) ;
 *    ④ LES DÉCISIONS — dans G2, G3, G4 : la case GARDÉE contre la JETÉE ;
 *    ⑤ LA COUVERTURE — ce que 9 cases tiennent, et ce que les cases laissées
 *      dehors valent. La marge est là, pas dans le choix.
 *
 *  ⚠ Aucun chiffre n'est saisi à la main dans ce composant. Tout vient du
 *    fichier, y compris les verdicts.
 * ══════════════════════════════════════════════════════════════════════════ */
function TabBassmat({ sk, B, H, detail, forme, BC, MOIS }) {
  /* ⭐ 29/10/2026 — la bassmat du MOIS vient en premier : elle est calculée sur
   * l'archive réelle (les tickets posés), pas sur le corpus de référence. Si le
   * corpus manque, elle s'affiche quand même : c'est elle que l'utilisateur a
   * demandée (« من هنا فقط »). */
  if (!B) return (
    <div style={{ fontSize: 13, color: sk.muted }}>
      Pas encore de mesure : écrire <b>public/data/bassmat.json</b> (node tools\bassmat.mjs).
    </div>
  )
  const nb = (x) => (x == null ? '—' : String(x).replace('.', ','))
  const pc = (x) => (x == null ? '—' : nb(x) + ' %')
  const caseDe = (p) => (B.cases || []).find((x) => x.p === p) || null
  /* le taux d'une case : celui de la FORME DU JOUR dès qu'elle a assez de
   * courses (n ≥ 15), sinon le taux global. Jamais un taux sur 3 courses. */
  const taux = (p, cle) => {
    const c = caseDe(p)
    if (!c) return { n: 0, pc5: null, pc3: null }
    const f = cle && c.parForme ? c.parForme[cle] : null
    if (f && f.n >= 15) return f
    return { n: c.n, pc5: c.pc5, pc3: c.pc3 }
  }
  const cle = forme ? forme.cle : null
  const seau = (B.forme?.seaux || []).find((s) => s.cle === cle) || null
  const couleurForme = forme ? forme.couleur : sk.muted

  /* le classement des cases POUR CETTE FORME — c'est l'empreinte du jour */
  const classement = (B.cases || [])
    .filter((c) => c.n >= 20)
    .map((c) => ({ p: c.p, ...taux(c.p, cle), global: c }))
    .sort((a, b) => (b.pc5 - a.pc5) || (a.p - b.p))
  const top5 = classement.slice(0, 5)
  const top3 = classement.slice(0, 3)
  const podium = B.composition?.podium?.moyenne || {}
  const quinte = B.composition?.quinte?.moyenne || {}

  /* le ticket réellement affiché, dans l'ordre des cases */
  const tickets = []
  for (const g of detail || []) for (const c of g.cases) if (c.pris) tickets.push({ ...c, groupe: g.id })
  tickets.sort((a, b) => a.place - b.place)
  const tauxTicket = (c) => taux(c.place, cle)
  const faible = tickets.length
    ? tickets.slice().sort((a, b) => (tauxTicket(a).pc5 ?? 0) - (tauxTicket(b).pc5 ?? 0))[0]
    : null
  const dedans = new Set(top5.map((x) => x.p))
  const manquantes = classement.filter((x) => !tickets.some((c) => c.place === x.p)).slice(0, 3)

  /* les décisions : ce que le moteur garde contre ce qu'il jette */
  const decisions = (B.blocs || []).map((b) => {
    const g = (detail || []).find((x) => x.id === b.id)
    const pris = g ? g.cases.filter((c) => c.pris) : []
    const pas = g ? g.cases.filter((c) => !c.pris) : []
    const moy = (l) => (l.length ? l.reduce((s, c) => s + (taux(c.place, cle).pc5 || 0), 0) / l.length : null)
    return { ...b, pris, pas, moyPris: moy(pris), moyPas: moy(pas) }
  })

  const boite = { ...sk.box, padding: 13, marginBottom: 12, boxShadow: sk.ombreD }
  const titre = { fontSize: 12, fontWeight: 800, color: sk.accent, letterSpacing: 0.7, textTransform: 'uppercase', margin: '0 0 7px' }
  const barre = (v) => (
    <span style={{ display: 'inline-block', verticalAlign: 'middle', width: 70, height: 8, background: sk.alt, border: '1px solid ' + sk.bord, borderRadius: 999, overflow: 'hidden' }}>
      <span style={{ display: 'block', width: Math.max(2, Math.round(v || 0)) + '%', height: '100%', background: sk.accent }} />
    </span>
  )
  const teinte = (v) => (v == null ? sk.muted : v >= 45 ? '#34d399' : v >= 30 ? '#fbbf24' : '#fb7185')

  return (
    <div>
      {/* ══ ⓪ LA BASSMAT DU MOIS — l'archive réelle (29/10/2026, §11.45) ══ */}
      {MOIS && (() => {
        const mv = MOIS
        const morts = (mv.pertes?.liste || []).filter((x) => !(x.remplacantsArrives || []).length)
        const pire = (mv.groupes || []).slice().sort((a, b) => b.remplacantMort - a.remplacantMort)[0]
        const th = { ...sk.th, padding: '4px 7px', fontSize: 11 }
        const td = { ...sk.td, padding: '4px 7px', fontSize: 12 }
        const carte = { border: '1px solid ' + sk.bord, borderRadius: 8, overflow: 'hidden' }
        return (
          <div style={{ ...boite, borderLeft: '4px solid #f0abfc' }}>
            <div style={titre}>⓪ بصمة هذا الشهر — la bassmat de l’archive réelle</div>
            <div style={{ fontSize: 12.5, color: sk.texte, lineHeight: 1.7 }}>
              <b>{mv.n}</b> Quintés réellement joués ({mv.periode?.debut} → {mv.periode?.fin}) ·
              {' '}<b>{mv.ticketsReels}</b> tickets archivés · le moteur est aujourd’hui à <b>{(mv.quotas || []).join('-')}</b>.
              {' '}Ici ce n’est plus un corpus de référence : ce sont <b>nos courses et nos tickets</b>.
              <br />
              <span style={{ color: sk.muted }}>
                Bilan du mois : {(mv.bilans || []).map((n, k) => (n ? k + '/5 × ' + n : null)).filter(Boolean).join(' · ')} — moyenne <b style={{ color: sk.texte }}>{nb(mv.moyenneBilan)}/5</b>.
                {' '}⚠ Les quotas ont changé en cours de mois (4-3-1-1-0 → 3-2-1-1-1 le 28/10 → 3-3-1-1-0 le 29/10) : on ausculte <b>ce qui a été posé</b>, pas une seule règle.
                {mv.ticketsIncomplets?.length ? (
                  <>
                    <br />
                    {mv.ticketsIncomplets.length} tickets archivés ne font pas 8 chevaux ({mv.ticketsIncomplets.map((x) => x.date.slice(5) + ' : ' + x.n).join(' · ')}) —
                    les sièges ci-dessous sont ceux <b>réellement posés</b>, pas ceux d’une règle unique.
                  </>
                ) : null}
              </span>
            </div>

            {/* ── a. les cases du mois ─────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 11 }}>
              <div style={{ flex: '1 1 330px', minWidth: 300 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: sk.accent, marginBottom: 4 }}>LES CASES DU MOIS</div>
                <div style={{ ...carte, overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead><tr style={sk.hdrStyle}>
                      {['P', 'c.', 'top5', '%', 'top3', '1er'].map((h) => <th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(mv.cases || []).filter((c) => c.n > 0 && c.p <= 16).map((c) => (
                        <tr key={c.p} style={{ borderBottom: '1px solid ' + sk.bord, background: c.p === 13 ? sk.on : 'transparent' }}>
                          <td style={{ ...td, fontWeight: 800, color: sk.accent, fontFamily: sk.nb.td }}>P{c.p}</td>
                          <td style={{ ...td, color: sk.muted, fontFamily: sk.nb.td }}>{c.n}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td }}>{c.top5}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td, fontWeight: 800, color: teinte(c.pc_top5) }}>{pc(c.pc_top5)}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td }}>{c.top3}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td }}>{c.victoires}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 10.5, color: sk.muted, marginTop: 4 }}>
                  % = P(case dans les 5 | courses). <b>P13 : {pc((mv.cases || []).find((c) => c.p === 13)?.pc_top5)}</b> — la queue.
                </div>
              </div>

              {/* ── b. les blocs du mois ───────────────────────────────── */}
              <div style={{ flex: '1 1 380px', minWidth: 330 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: sk.accent, marginBottom: 4 }}>LES BLOCS — sièges et rendement</div>
                <div style={{ ...carte, overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead><tr style={sk.hdrStyle}>
                      {['bloc', 'sièges', 'pris', 'coupés', 'siège mort'].map((h) => <th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(mv.groupes || []).map((g) => (
                        <tr key={g.id} style={{ borderBottom: '1px solid ' + sk.bord, background: g.id === pire?.id ? 'rgba(251,113,133,.12)' : 'transparent' }}>
                          <td style={{ ...td, fontWeight: 800, color: sk.accent }}>{g.id}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td }}>{g.sieges}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td }}>{g.pris}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td }}>{g.coupes}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td, fontWeight: 800, color: g.remplacantMort > 2 ? '#fb7185' : sk.texte }}>{g.remplacantMort}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 10.5, color: sk.muted, marginTop: 4 }}>
                  « siège mort » = arrivant coupé dont le siège du bloc était occupé par un cheval <b>non arrivé</b>.
                </div>
              </div>
            </div>

            {/* ── c. le verdict, les chiffres ──────────────────────────── */}
            <div style={{ marginTop: 11, padding: '9px 11px', borderRadius: 8, background: sk.alt, border: '1px solid ' + sk.bord, fontSize: 12.5, lineHeight: 1.75 }}>
              <b style={{ color: sk.accent }}>Où le mois a perdu :</b>{' '}
              {mv.pertes?.pris} arrivants sur {mv.pertes?.arrivees} pris ({pc(mv.pertes?.pcPris)}) ·
              {' '}{mv.pertes?.coupes} coupés ({pc(mv.pertes?.pcCoupes)}).
              {' '}Sur ces coupés, <b style={{ color: '#fb7185' }}>{mv.pertes?.remplacantMort}</b>
              {' '}({pc(mv.pertes?.pcRemplacantMort)}) avaient leur siège occupé par un cheval qui <b>n’est pas arrivé</b>.
              {' '}Le trou est en <b>{pire?.id}</b> ({pire?.remplacantMort} sièges morts sur {pire?.sieges}).
              {morts.length > 0 && (
                <>
                  <br />
                  <span style={{ fontSize: 11.5, color: sk.muted }}>Les sièges morts du mois :</span>{' '}
                  {morts.map((x) => (
                    <span key={x.date + '-' + x.num} style={{
                      display: 'inline-block', margin: '2px 4px 0 0', padding: '1px 6px', borderRadius: 6,
                      border: '1px solid ' + sk.bord, background: sk.ligne, fontSize: 11, fontFamily: sk.nb.td,
                    }}>
                      {x.date.slice(5)} · <b>{x.num}</b> P{x.place} <span style={{ color: '#fb7185' }}>{x.bloc}</span>
                    </span>
                  ))}
                </>
              )}
            </div>

            {/* ── d. les deux petits tableaux ──────────────────────────── */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 11 }}>
              <div style={{ flex: '1 1 300px', minWidth: 270 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: sk.accent, marginBottom: 4 }}>COMBIEN DE CASES POUR TOUT TENIR</div>
                <div style={carte}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead><tr style={sk.hdrStyle}>
                      {['P1..Pk', 'podium', 'quinté'].map((h) => <th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(mv.k || []).filter((x) => [8, 10, 12, 14].includes(x.k)).map((x) => (
                        <tr key={x.k} style={{ borderBottom: '1px solid ' + sk.bord, background: x.k === 8 ? sk.on : 'transparent', fontWeight: x.k === 8 ? 800 : 400 }}>
                          <td style={{ ...td, fontFamily: sk.nb.td }}>{x.k === 8 ? '▸ ' : ''}{x.k}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td, color: teinte(x.podium) }}>{pc(x.podium)}</td>
                          <td style={{ ...td, fontFamily: sk.nb.td, color: teinte(x.quinte) }}>{pc(x.quinte)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 10.5, color: sk.muted, marginTop: 4 }}>
                  Ligne 8 = le ticket du mois. Ce qu’il ne tient pas, ce sont les cases qu’il n’a pas.
                </div>
              </div>

              <div style={{ flex: '1 1 360px', minWidth: 320 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: sk.accent, marginBottom: 4 }}>BLOC × BANDE DU MARCHÉ</div>
                <div style={{ ...carte, overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                    <thead><tr style={sk.hdrStyle}>
                      {['bloc', 'M≤3 fort', 'M≤5 bon', 'M6-12 moyen', 'M13+ faible'].map((h) => <th key={h} style={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(mv.bandes || []).map((l) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid ' + sk.bord }}>
                          <td style={{ ...td, fontWeight: 800, color: sk.accent }}>{l.id}</td>
                          {(l.cellules || []).map((c) => (
                            <td key={c.bande} style={{ ...td, fontFamily: sk.nb.td, color: c.n < 15 ? sk.muted : teinte(c.pc) }}>
                              {c.n < 15 ? '—' : pc(c.pc)} <span style={{ fontSize: 10, color: sk.muted }}>{c.n}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 10.5, color: sk.muted, marginTop: 4 }}>
                  % arrivés dans les 5 · le petit chiffre = n. Sous 15, on n’affiche pas : trop peu pour voter.
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: sk.muted, marginTop: 9 }}>
              Écrit par <b>tools/bassmat-mois.mjs</b> à partir de <b>data/synthese.json</b> et du vrai
              <b> buildGrid</b>/<b>remplirGrille</b> — rejouer : <code>node tools\bassmat-mois.mjs</code>. Aucun chiffre saisi à la main.
            </div>
          </div>
        )
      })()}

      {/* ── l'en-tête : ce que c'est, et sur quoi c'est mesuré ─────────────── */}
      <div style={{ ...boite, borderLeft: '4px solid ' + sk.accent, background: sk.alt }}>
        <b style={{ fontSize: 14 }}>بصمة السباق — l’empreinte du mois, puis celle de la course</b>
        <div style={{ fontSize: 12, color: sk.muted, marginTop: 5, lineHeight: 1.6 }}>
          <b>{B.n}</b> Quintés à presse réelle ({B.periode?.debut} → {B.periode?.fin}) · lus par <b>case du carnet</b> (P1..P20).
          {' '}L’empreinte ne remplace pas votre méthode : elle dit <b>ce que cette course a l’air d’être</b>,
          et si le ticket est du bon côté de la statistique.
        </div>
      </div>

      {/* ── ① LA FORME DU MARCHÉ ──────────────────────────────────────────── */}
      <div style={boite}>
        <div style={titre}>① La forme du marché</div>
        {!forme ? (
          <div style={{ fontSize: 12.5, color: sk.muted }}>
            Marché pas encore lisible ({Object.keys(forme || {}).length} cote(s)) : les taux affichés sont les taux <b>globaux</b>.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              padding: '7px 14px', borderRadius: 10, border: '1px solid ' + couleurForme,
              background: couleurForme + '1f', color: couleurForme, fontWeight: 800, fontSize: 14,
            }}>
              {forme.lib}
            </div>
            <div style={{ fontSize: 12.5, color: sk.texte, lineHeight: 1.7 }}>
              favori <b>n°{forme.favori}</b> à <b>{nb(forme.fav)}</b> · <b>{forme.nSous10}</b> chevaux sous 10/1
              {' '}sur {forme.nb} cotés · <span style={{ color: sk.muted }}>{forme.detail}</span>
            </div>
          </div>
        )}
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12.5, border: '1px solid ' + sk.bord, borderRadius: 8, overflow: 'hidden' }}>
            <thead><tr style={sk.hdrStyle}>
              {['forme du marché', 'courses', 'part', 'le 4e de G2 (P8) arrive top-5'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(B.forme?.seaux || []).map((s, i) => (
                <tr key={s.cle} style={{
                  borderBottom: '1px solid ' + sk.bord,
                  background: s.cle === cle ? sk.on : (i % 2 ? sk.alt : sk.ligne),
                  fontWeight: s.cle === cle ? 800 : 400,
                }}>
                  <td style={sk.td}>{s.cle === cle ? '▸ ' : ''}{s.lib}</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{s.n}</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{pc(s.part)}</td>
                  <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 800, color: teinte(s.jeteG2?.pc5) }}>{pc(s.jeteG2?.pc5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11.5, color: sk.muted, marginTop: 6 }}>
          {B.forme?.regle}
        </div>
      </div>

      {/* ── ② L'EMPREINTE ATTENDUE ────────────────────────────────────────── */}
      <div style={boite}>
        <div style={titre}>② L’empreinte attendue {seau ? `— ${seau.lib}` : ''}</div>
        <div style={{ fontSize: 12.5, color: sk.texte, lineHeight: 1.7 }}>
          Les cases les plus fortes <b>{cle ? 'pour ce marché' : 'de l’archive'}</b>, dans l’ordre :
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '9px 0 10px' }}>
          {top5.map((x, i) => (
            <div key={x.p} style={{
              minWidth: 82, padding: '7px 10px', borderRadius: 10,
              border: '1px solid ' + (i < 3 ? sk.accent : sk.bord),
              background: i < 3 ? sk.accentClair : sk.alt,
            }}>
              <div style={{ fontFamily: sk.nb.td, fontSize: 11, color: sk.muted }}>#{i + 1}</div>
              <div style={{ fontFamily: sk.nb.td, fontWeight: 800, fontSize: 16, color: i < 3 ? sk.accent : sk.texte }}>P{x.p}</div>
              <div style={{ fontFamily: sk.nb.td, fontSize: 12, color: teinte(x.pc5) }}>{pc(x.pc5)}</div>
              <div style={{ fontSize: 10.5, color: sk.muted }}>top-5 · n={x.n}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: sk.texte, lineHeight: 1.8, borderTop: '1px dashed ' + sk.bord, paddingTop: 9 }}>
          <b>Podium attendu</b> : {top3.map((x) => 'P' + x.p).join(' · ')} — les trois cases qui donnent le plus.
          <br />
          <b>Composition attendue</b> (moyenne par course) — podium :
          <b> G1 {nb(podium.G1)} · G2 {nb(podium.G2)} · G3 {nb(podium.G3)} · G4 {nb(podium.G4)} · G5 {nb(podium.G5)}</b>
          {' '}· quinté : <b>G1 {nb(quinte.G1)} · G2 {nb(quinte.G2)} · G3 {nb(quinte.G3)} · G4 {nb(quinte.G4)} · G5 {nb(quinte.G5)}</b>
          <br />
          <span style={{ color: sk.muted }}>
            Autrement dit : le podium prend <b>≈ 2 chevaux de G1</b> et <b>≈ 1 de G2</b>, et il ne descend
            presque jamais sous G3 (0,3 par course). Le quinté, lui, prend un cheval de G3 une fois sur deux.
          </span>
        </div>
      </div>

      {/* ── ③ LE TICKET, CASE PAR CASE ────────────────────────────────────── */}
      <div style={boite}>
        <div style={titre}>③ Le ticket, case par case</div>
        {!tickets.length ? (
          <div style={{ fontSize: 12.5, color: sk.muted }}>Aucun ticket affiché pour cette course.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12.5, border: '1px solid ' + sk.bord, borderRadius: 8, overflow: 'hidden' }}>
                <thead><tr style={sk.hdrStyle}>
                  {['case', 'n°', 'bloc', 'marché', cle ? `top-5 (${seau ? seau.lib : cle})` : 'top-5', 'top-5 global', 'top-3', 'dans l’empreinte'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {tickets.map((c, i) => {
                    const t = tauxTicket(c)
                    const estFaible = faible && faible.place === c.place
                    return (
                      <tr key={c.place} style={{
                        borderBottom: '1px solid ' + sk.bord,
                        background: estFaible ? 'rgba(244,63,94,.13)' : (i % 2 ? sk.alt : sk.ligne),
                      }}>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 800 }}>P{c.place}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 800, color: sk.accent }}>{c.num}</td>
                        <td style={{ ...sk.td, color: sk.muted }}>{c.groupe}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{c.marche != null ? 'M' + c.marche : '—'}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 800, color: teinte(t.pc5) }}>{pc(t.pc5)}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{pc(caseDe(c.place)?.pc5)}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{pc(t.pc3)}</td>
                        <td style={sk.td}>{dedans.has(c.place) ? <span style={{ color: '#34d399', fontWeight: 800 }}>oui</span> : <span style={{ color: sk.muted }}>—</span>}
                          {estFaible && <span style={{ color: '#fb7185', fontWeight: 800 }}> · le plus faible</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 12, color: sk.texte, marginTop: 8, lineHeight: 1.7 }}>
              {faible ? <>
                Le <b style={{ color: '#fb7185' }}>maillon faible</b> du ticket est
                <b> P{faible.place} (n°{faible.num})</b> — {pc(tauxTicket(faible).pc5)} de top-5,
                contre {pc(tauxTicket(tickets.find((c) => c.place === top5[0]?.p) || tickets[0]).pc5)} pour la meilleure case du jour.
                {' '}Ce n’est pas une raison de l’écarter (§6 : on écarte sur le physique) — c’est la case à surveiller.
              </> : null}
            </div>
          </>
        )}
      </div>

      {/* ── ④ LES DÉCISIONS — gardée contre jetée ─────────────────────────── */}
      <div style={boite}>
        <div style={titre}>④ Les décisions — la case gardée contre la case jetée</div>
        {!decisions.length ? (
          <div style={{ fontSize: 12.5, color: sk.muted }}>Aucun bloc à choix dans cette grille.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12.5, border: '1px solid ' + sk.bord, borderRadius: 8, overflow: 'hidden' }}>
              <thead><tr style={sk.hdrStyle}>
                {['bloc', 'gardé', 'taux gardé', 'jeté', 'taux jeté', 'écart', 'lecture'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {decisions.map((d, i) => {
                  const ecart = d.moyPris != null && d.moyPas != null ? Math.round(10 * (d.moyPris - d.moyPas)) / 10 : null
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid ' + sk.bord, background: i % 2 ? sk.alt : sk.ligne }}>
                      <td style={{ ...sk.td, fontWeight: 800 }}>{d.id} <span style={{ color: sk.muted, fontWeight: 400 }}>{d.quota}/{d.taille}</span></td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td, color: '#34d399', fontWeight: 700 }}>{d.pris.map((c) => 'P' + c.place).join(' · ') || '—'}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{pc(d.moyPris == null ? null : Math.round(10 * d.moyPris) / 10)}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td, color: '#fb7185' }}>{d.pas.map((c) => 'P' + c.place).join(' · ') || '—'}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{pc(d.moyPas == null ? null : Math.round(10 * d.moyPas) / 10)}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 800, color: ecart > 0 ? '#34d399' : '#fb7185' }}>
                        {ecart == null ? '—' : (ecart > 0 ? '+' : '') + nb(ecart)}
                      </td>
                      <td style={{ ...sk.td, color: sk.muted }}>
                        {ecart == null ? 'aucun choix' : ecart > 0 ? 'garde les cases fortes' : 'garde la case faible'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 11.5, color: sk.muted, marginTop: 7, lineHeight: 1.6 }}>
          Le ticket prend {GROUPES.map((g) => `${g.id} ${g.quota}`).join(' · ')} ({QUOTAS_TXT}, §11.46) :
          il n’y a de choix que dans les blocs qui ont plus de cases que leur quota.
          C’est <b>là, et seulement là</b>, que l’empreinte peut contredire le moteur — ailleurs
          elle le confirme.
        </div>
      </div>

      {/* ── ⑤ LA COUVERTURE ───────────────────────────────────────────────── */}
      <div style={boite}>
        <div style={titre}>⑤ La couverture — ce que {NB_TICKET} cases tiennent</div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 13, lineHeight: 1.9, minWidth: 250 }}>
            <div>podium entier : <b style={{ color: '#34d399' }}>{pc(B.tient?.podium)}</b></div>
            <div>quinté entier : <b style={{ color: B.tient?.quinte >= 20 ? '#34d399' : '#fbbf24' }}>{pc(B.tient?.quinte)}</b></div>
            <div>arrivants par course : <b style={{ fontFamily: sk.nb.td }}>{nb(B.tient?.x5)}</b> / 5</div>
            <div style={{ fontSize: 11.5, color: sk.muted, marginTop: 4 }}>
              cases promises <b>{nb(B.calibrage?.sommeTaux)}</b> · vues <b>{nb(B.calibrage?.moyenneVue)}</b>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>
                {['P1..Pk', 'podium', 'quinté'].map((h) => <th key={h} style={{ padding: '3px 10px', textAlign: 'right', color: sk.muted, fontWeight: 800, fontSize: 11 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(B.courbe || []).map((c) => (
                  <tr key={c.k} style={{ borderTop: '1px solid ' + sk.bord, background: c.k === 12 ? sk.on : 'transparent' }}>
                    <td style={{ padding: '2px 10px', textAlign: 'right', fontFamily: sk.nb.td, fontWeight: 800 }}>{c.k}</td>
                    <td style={{ padding: '2px 10px', textAlign: 'right', fontFamily: sk.nb.td }}>{pc(c.podium)}</td>
                    <td style={{ padding: '2px 10px', textAlign: 'right', fontFamily: sk.nb.td, color: c.k === 12 ? sk.accent : sk.texte }}>{pc(c.quinte)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {manquantes.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: sk.texte, lineHeight: 1.7, borderTop: '1px dashed ' + sk.bord, paddingTop: 9 }}>
            <b>Les cases laissées dehors</b>, par ordre de force aujourd’hui :
            {manquantes.map((x) => (
              <span key={x.p} style={{
                marginInlineStart: 8, padding: '2px 8px', borderRadius: 6, fontFamily: sk.nb.td,
                border: '1px solid ' + sk.bord, background: sk.alt,
              }}>P{x.p} · {pc(x.pc5)}</span>
            ))}
            <br />
            <span style={{ color: sk.muted }}>
              Elles ne sont pas mauvaises : le ticket n’a que {NB_TICKET} sièges. À 12 cases le quinté tombe
              <b> {pc((B.courbe || []).find((c) => c.k === 12)?.quinte)}</b> du temps — c’est la seule marge
              que la mesure reconnaisse (§11.25).
            </span>
          </div>
        )}
      </div>

      {/* ── ⑥ G5 — LA PREUVE DE NÉCESSITÉ ─────────────────────────────────── */}
      {H && (
        <div style={boite}>
          <div style={titre}>⑥ G5 — la preuve de nécessité</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              ['un cheval de G5 (P13+) finit dans les 5', H.g5.unArrive, '#34d399'],
              ['plafond d’un ticket SANS siège G5', H.g5.plafondSansG5, '#fbbf24'],
              ['le siège (meilleur du marché) arrive top-5', H.g5.siegeTop5, '#fb7185'],
              ['quand un G5 arrive, le siège le trouve', H.g5.trouveQuandArrive, '#fb7185'],
            ].map(([lib, v, col]) => (
              <div key={lib} style={{
                minWidth: 168, padding: '8px 11px', borderRadius: 10,
                border: '1px solid ' + sk.bord, background: sk.alt,
              }}>
                <div style={{ fontFamily: sk.nb.td, fontSize: 20, fontWeight: 800, color: col }}>{pc(v)}</div>
                <div style={{ fontSize: 10.5, color: sk.muted, lineHeight: 1.4 }}>{lib}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, border: '1px solid ' + sk.bord, borderRadius: 8, overflow: 'hidden' }}>
                <thead><tr style={sk.hdrStyle}>
                  {['forme du marché', 'courses', 'un G5 dans les 5', 'siège top-5'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(H.g5.parForme || []).map((f, i) => (
                    <tr key={f.cle} style={{ borderBottom: '1px solid ' + sk.bord, background: i % 2 ? sk.alt : sk.ligne }}>
                      <td style={sk.td}>{f.cle}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{f.n}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 800, color: teinte(f.unArrive) }}>{pc(f.unArrive)}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{pc(f.siegeTop5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, border: '1px solid ' + sk.bord, borderRadius: 8, overflow: 'hidden' }}>
                <thead><tr style={sk.hdrStyle}>
                  {['cote du siège', 'n', 'top-5', 'top-3'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(H.g5.parCote || []).map((x, i) => (
                    <tr key={x.lib} style={{ borderBottom: '1px solid ' + sk.bord, background: i % 2 ? sk.alt : sk.ligne }}>
                      <td style={sk.td}>{x.lib}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{x.n}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 800, color: teinte(x.top5) }}>{pc(x.top5)}</td>
                      <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{pc(x.top3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ fontSize: 12.5, color: sk.texte, marginTop: 10, lineHeight: 1.7, borderTop: '1px dashed ' + sk.bord, paddingTop: 9 }}>
            <b style={{ color: '#34d399' }}>La nécessité est réelle</b> : dans <b>{pc(H.g5.unArrive)}</b> des courses,
            un cheval de P13+ finit dans les cinq. Un ticket <b>sans</b> siège G5 ne peut donc pas dépasser
            <b> {pc(H.g5.plafondSansG5)}</b> de quinté — aucune composition n’y change rien.
            <br />
            <b style={{ color: '#fb7185' }}>Mais le siège n’est pas la porte</b> : le meilleur cheval du marché dans G5
            n’arrive que <b>{pc(H.g5.siegeTop5)}</b> du temps, et quand un G5 arrive il n’est trouvé que
            <b> {pc(H.g5.trouveQuandArrive)}</b> du temps. Le plafond est vrai ; le moyen de le tenir, non.
            <br />
            <span style={{ color: sk.muted }}>
              C’est exactement pourquoi la section ⑦ existe : à 8 chevaux, la question n’est pas « faut-il G5 ? »
              (oui, pour le plafond) mais « combien coûte le siège qui essaie de le tenir ».
            </span>
          </div>
        </div>
      )}

      {/* ── ⑦ 8 CHEVAUX — LE CLASSEMENT ──────────────────────────────────── */}
      {H && (
        <div style={boite}>
          <div style={titre}>⑦ 8 chevaux — le classement mesuré</div>
          <div style={{ fontSize: 12.5, color: sk.texte, lineHeight: 1.7 }}>
            <b>{H.huit.combos}</b> répartitions de 8 chevaux énumérées ({H.huit.nbAvec} avec siège G5 ·
            {' '}{H.huit.nbSans} sans), notées sur les deux corpus. La colonne <b>min</b> est la plus mauvaise
            des deux : c’est elle qui décide — sur 96 courses, 1,5 point d’écart, c’est <b>un</b> quinté.
          </div>

          {[['AVEC un siège G5', H.huit.robusteAvec, 'P13+ dans le ticket'], ['SANS siège G5', H.huit.robusteSans, 'tout le ticket dans P1..P12']].map(([lib, liste, sous]) => (
            <div key={lib} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: sk.accent, marginBottom: 4 }}>
                {lib} <span style={{ color: sk.muted, fontWeight: 400 }}>— {sous}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12.5, border: '1px solid ' + sk.bord, borderRadius: 8, overflow: 'hidden' }}>
                  <thead><tr style={sk.hdrStyle}>
                    {['répartition', 'quinté presse', 'quinté archives', 'min', 'podium', '≥4'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(liste || []).slice(0, 5).map((x, i) => (
                      <tr key={x.k} style={{
                        borderBottom: '1px solid ' + sk.bord,
                        background: i === 0 ? sk.on : (i % 2 ? sk.alt : sk.ligne),
                        fontWeight: i === 0 ? 800 : 400,
                      }}>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{i === 0 ? '▸ ' : ''}{x.k}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{pc(x.press)}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td }}>{pc(x.archives)}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td, fontWeight: 800, color: teinte(x.min) }}>{pc(x.min)}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{pc(x.pod)}</td>
                        <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>{pc(x.q4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div style={{ fontSize: 12.5, color: sk.texte, marginTop: 10, lineHeight: 1.7, borderTop: '1px dashed ' + sk.bord, paddingTop: 9 }}>
            <b>Le meilleur 8 est {H.huit.robusteSans?.[0]?.k}</b> — {pc(H.huit.robusteSans?.[0]?.min)} de quinté garanti
            sur les deux corpus, {pc(H.huit.robusteSans?.[0]?.pod)} de podium. Le meilleur 8 <b>avec</b> G5 est
            {' '}<b>{H.huit.robusteAvec?.[0]?.k}</b> : {pc(H.huit.robusteAvec?.[0]?.min)}.
            <br />
            La production actuelle (<b>{H.huit.prod?.k}</b>, {H.huit.prod?.chevaux} chevaux) tient
            {' '}<b>{pc(H.huit.prod?.qui)}</b> du quinté : passer à 8 coûte
            {' '}<b style={{ color: '#fb7185' }}>{nb(Math.round(10 * (H.huit.prod?.qui - (H.huit.robusteSans?.[0]?.min || 0))) / 10)} points</b>.
            <br />
            <b>Le G5 conditionnel</b> (le siège seulement quand son cheval est court) ne rattrape rien :
            {(H.huit.conditionnel || []).map((c) => (
              <span key={c.lib} style={{ display: 'inline-block', marginInlineStart: 6, padding: '1px 7px', borderRadius: 6, border: '1px solid ' + sk.bord, background: sk.alt, fontFamily: sk.nb.td, fontSize: 11.5 }}>
                {c.lib} : {c.dQui >= 0 ? '+' : ''}{nb(c.dQui)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── ⑧ LA VARIANTE — « si on suivait la bassmat » ──────────────────── */}
      {(() => {
        /* la règle de l'onglet, appliquée au ticket : chaque bloc rempli par le
         * taux de la CASE pour la FORME DU JOUR (n ≥ 15), jamais par la cote. */
        const variante = ticketBassmat(detail, B, cle)
        if (!variante) return null
        const meme = variante.echanges.length === 0
        const prod = new Set(tickets.map((c) => c.num))
        const puce = (n, ok) => (
          <span key={n} style={{
            display: 'inline-block', padding: '2px 9px', marginInlineEnd: 5, borderRadius: 8,
            fontFamily: sk.nb.td, fontWeight: 800, fontSize: 13,
            border: '1px solid ' + (ok ? '#34d399' : sk.bord),
            background: ok ? 'rgba(52,211,153,.16)' : sk.alt,
            color: ok ? '#34d399' : sk.texte,
          }}>{n}</span>
        )
        return (
          <div style={boite}>
            <div style={titre}>⑧ Si on suivait la bassmat</div>
            <div style={{ fontSize: 12.5, color: sk.texte, lineHeight: 1.7 }}>
              La bassmat est une statistique <b>de case</b>. Appliquée au ticket de cette course, elle
              prend les cases dans l’ordre de <b>leur taux pour la forme du jour</b>
              {cle ? <> (<b>{cle}</b>)</> : null} au lieu de l’ordre de la presse.
              {' '}<span style={{ color: sk.muted }}>Ce n’est pas le moteur : c’est la variante, montrée pour être vue.</span>
            </div>

            {meme ? (
              <div style={{ fontSize: 12.5, marginTop: 9 }}>
                Sur cette course, la bassmat prend <b>exactement le même ticket</b> que le moteur —
                les deux ordres coïncident dans les cinq blocs.
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12.5, border: '1px solid ' + sk.bord, borderRadius: 8, overflow: 'hidden' }}>
                    <thead><tr style={sk.hdrStyle}>
                      {['bloc', 'le moteur garde', 'la bassmat prend', 'taux (P5)'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {variante.echanges.map((x) => (
                        <tr key={x.bloc} style={{ borderBottom: '1px solid ' + sk.bord }}>
                          <td style={{ ...sk.td, fontWeight: 800, color: sk.accent }}>{x.bloc}</td>
                          <td style={{ ...sk.td, fontFamily: sk.nb.td }}>
                            {x.sort.map((c) => (
                              <span key={c.num} style={{ marginInlineEnd: 8 }}>
                                <b>{c.num}</b>
                                <span style={{ color: sk.muted, fontSize: 11 }}> (P{c.place} · {pc(c.taux)})</span>
                              </span>
                            ))}
                          </td>
                          <td style={{ ...sk.td, fontFamily: sk.nb.td }}>
                            {x.entre.map((c) => (
                              <span key={c.num} style={{ marginInlineEnd: 8, color: '#fbbf24' }}>
                                <b>{c.num}</b>
                                <span style={{ color: sk.muted, fontSize: 11 }}> (P{c.place} · {pc(c.taux)})</span>
                              </span>
                            ))}
                          </td>
                          <td style={{ ...sk.td, fontFamily: sk.nb.td, color: sk.muted }}>
                            {x.entre.map((c) => (c.taux == null ? '—' : nb(c.taux))).join(' / ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 10, fontSize: 12.5 }}>
                  Le ticket de la bassmat : {variante.ticket.map((n) => puce(n, !prod.has(n)))}
                  <span style={{ fontSize: 11, color: sk.muted, marginInlineStart: 6 }}>
                    (en vert = ce que le moteur ne prend pas)
                  </span>
                </div>
              </>
            )}

            {BC && (
              <div style={{ marginTop: 11, paddingTop: 9, borderTop: '1px dashed ' + sk.bord, fontSize: 12.5, lineHeight: 1.75 }}>
                <b style={{ color: sk.accent }}>Ce que ça coûte, mesuré sur {BC.corpus} Quintés :</b>
                {' '}le moteur <b>{nb(Math.round(10 * BC.production.podium) / 10)} %</b> de podium ·
                {' '}<b>{nb(Math.round(10 * BC.production.quinte) / 10)} %</b> de quinté ·
                {' '}<b>{nb(Math.round(10 * BC.production.q4) / 10)} %</b> de ≥4.
                {' '}La bassmat : <b style={{ color: '#fb7185' }}>{nb(Math.round(10 * BC.bassmat.podium) / 10)} %</b> ·
                {' '}<b style={{ color: '#fb7185' }}>{nb(Math.round(10 * BC.bassmat.quinte) / 10)} %</b> ·
                {' '}<b style={{ color: '#fb7185' }}>{nb(Math.round(10 * BC.bassmat.q4) / 10)} %</b>.
                <br />
                Elle change le ticket dans <b>{BC.coursesChangees}</b> courses sur <b>{BC.corpus}</b> ; sur les
                {' '}<b>{BC.desaccords.total}</b> blocs où les deux ordres divergent, le carnet garde la bonne case
                {' '}<b>{nb(Math.round(10 * BC.desaccords.pcCarnet) / 10)} %</b> contre
                {' '}<b>{nb(Math.round(10 * BC.desaccords.pcBassmat) / 10)} %</b> pour elle.
                <br />
                <span style={{ color: sk.muted }}>
                  Écrit par <b>tools/bassmat-choix.mjs</b> — rejouer : <code>node tools\bassmat-choix.mjs</code>.
                </span>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── le verdict, écrit par l'outil ─────────────────────────────────── */}
      <div style={{ ...boite, borderLeft: '4px solid ' + sk.accent, background: sk.alt }}>
        <div style={titre}>Le verdict de l’empreinte</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>{B.verdict}</div>
        <div style={{ fontSize: 11, color: sk.muted, marginTop: 7 }}>
          Écrit par <b>tools/bassmat.mjs</b> — rejouer : <code>node tools\bassmat.mjs</code>.
          Aucun chiffre de cet onglet n’est saisi à la main.
        </div>
      </div>
    </div>
  )
}


const LIGNE_CARNET = (cellule, quotaGroupe) => (cellule ? (
  <Boite key={cellule.slot} n={cellule.num} pris={cellule.pris}
    presse={cellule.presse} score={cellule.s} cote={cellule.cote} slot={cellule.slot}
    marche={cellule.marche}
    couleur={COULEUR_GROUPE[cellule.groupe]} />
) : (
  <div style={{ width: 54, height: 54 }} />
))

  // ⚠ L'ORDRE DU TICKET — UNE CASE PRÉDIT, LES SEPT AUTRES NON (§11.33).
  //   Mesuré sur 96 Quintés : le 1er du ticket gagne 27,1 %, le 8e 4,2 %.
  //   Entre le 2e et le 4e : 10,4 / 11,5 / 10,4 → plat, aucun ordre mesurable.
  //   Donc la 1re case va au P1 de la presse, et les 7 autres sont un BLOC
  //   trié par numéro : la page n'invente pas de 2e, 3e, 4e, 5e.
  //   ⚠ Un ticket ARCHIVÉ garde son ordre d'origine : il est intouchable (§13.3).
  /* ⚠ LE TICKET ARCHIVÉ EST INTOCABLE (§13.3) — mais SEULEMENT l'ORDRE
   *  change avec l'archive. Les MÊMS chevaux, remis dans l'ordre de la presse
   *  du jour. Sans cela la page resterait bloquée sur un ordre de juin alors
   *  que la méthode a changé.
   *  Le premier ticket figé reste : ce qu'on fige, c'est la SÉLECTION. */
  const ticket = useMemo(() => {
    if (!rempli) return ticketManuel && ticketManuel.length ? ticketManuel : []
    const base = (ticketManuel && ticketManuel.length) ? ticketManuel : rempli.ticket
    /* ⚠ 16/10/2026 — un cheval qui ne PART pas ne peut pas être au ticket :
     *   `ticketAffiche` retire les numéros absents de la grille du jour et,
     *   la course encore ouverte, remplit la place dans le même groupe
     *   (quota §11.19). Course courue : constat, sans invention (§7). */
    return ordonnerTicket(ticketAffiche(base, rempli, !courseFinie), grille)
  }, [rempli, ticketManuel, grille, courseFinie])

  // ⚠ L'AUTO-FIGEAGE : dès que le moteur produit un ticket, on l'écrit dans
  //   l'archive. L'archive doit montrer le ticket DÈS LE PREMIER ANALYSE —
  //   pas seulement après un clic « Rafraîchir ». `attachTicket` ne fige que
  //   le PREMIER (un ticket déjà posé est intouchable, §13.3).
  //
  //   ⚠ 16/10/2026 : on NE recharge PAS le gel dans `ticketManuel`. Le gel
  //   est une TRACE d'archive ; l'affichage, lui, doit rester le marché du
  //   moment (§11.17) — c'est ce ticket-là qu'on joue, pas celui du matin.
  const ticketAuto = useMemo(() => {
    if (ticketManuel && ticketManuel.length) return null   // déjà figé
    if (!rempli || !rempli.ticket.length) return null
    return rempli.ticket
  }, [rempli, ticketManuel])

  /* ⚠ 16/10/2026 — LE GEL NE SE REPOSE PAS EN BOUCLE.
   *   `attachTicket` ne fige que le PREMIER ticket de la date, mais
   *   `listArchive()` rend un tableau NEUF à chaque appel : `setArchive`
   *   relançait `stats` (computeStats sur toute l'archive) → `rempli` →
   *   `ticketAuto` (tableau neuf lui aussi) → l'effet → `setArchive`…
   *   et l'onglet bouclait, CPU à 100 % (« l'appli est quasi gelée »).
   *   Avant, la boucle était coupée par `setTicketManuel(res.ticket)` —
   *   supprimé exprès (le ticket AFFICHÉ suit le marché, §13.3 règle 8).
   *   Le gel est donc borné : UNE fois par date et par session. */
  const gelFait = useRef(null)
  useEffect(() => {
    if (!ticketAuto || !ticketAuto.length) return
    if (gelFait.current === date) return
    if (!gelAutorise()) return   // la nuit, on affiche sans figer (09/10/2026)
    gelFait.current = date
    let annule = false
    ;(async () => {
      const res = await attachTicket(date, [...ticketAuto], 'page')
      if (annule || !res) return
      setArchive(await listArchive())
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
      <Entete page="quinte" />
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
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(125,205,255,.28)' }} />
        <button onClick={() => charger(date)} disabled={busy}
          style={{ padding: '6px 14px', borderRadius: 8, border: '2px solid #0f172a', background: busy ? '#7a8ea9' : '#0f172a', color: '#fff', cursor: 'pointer' }}>
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

      {msg && <div style={{ color: '#fb7185', marginBottom: 10, fontSize: 13 }}>{msg}</div>}

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
              <div style={{ color: '#fb7185', marginTop: 4 }}>
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
            Depuis le 29/10/2026 les quotas sont <b>{QUOTAS_TXT}</b> (§11.46) : le ticket de
            <b>{NB_TICKET} chevaux</b> ne bouge pas, mais le siège de G5 passe à G2 — la
            bassmat d’octobre montre que ce siège ne tenait rien.
            Les boîtes se lisent <b>en travers</b> : ligne du haut puis ligne du bas.{carnet(detail) && <> Les cases sont numérotées <b>P1, P2… en colonnes</b> : la ligne du haut porte la parité du P1.</>}
            <br />
            {Object.keys(cotes).length >= 4 ? (
              <>📈 <b>Marché lu sur equidia.fr</b>, relevé à {heureCote ? (hhmmGMT(heureCote) || '?') + ' GMT' : '?'} — rafraîchi toutes les minutes.
                Le badge de chaque boule (en haut à droite) est son <b>rang de cote</b> :
                il <b>choisit</b> dans G4 et G5 (§11.23 — le carnet remplit G1-G3, la cote la queue), ailleurs il <b>informe</b>.
                Ce que ce rang vaut, et ce que vaut le moteur, sont mesurés dans le
                <b> panneau de mesure</b> sous le ticket.</>
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
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1.5, color: SK.accent }}>
              {ticket.length ? ticket.join('  ·  ') : '—'}
            </span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 12 }}>{ticket.length} chevaux</span>
            {'  '}
          </div>
          <PanneauMesure sk={SK} fiabilite={fiabilite} detail={detail} />
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
              /* ⚠ 16/10/2026 — le badge dit ce que le TICKET AFFICHÉ est, pas
               *   ce que l'archive a gelé. Tant que la course n'a pas couru, la
               *   page joue le marché en direct (§11.17) : afficher « gelé à
               *   10:15 » au-dessus d'un ticket qui bouge était un mensonge.
               *   Le gel vit dans l'onglet Archive, avec sa source et son heure. */
              const gele = !!(ticketManuel && ticketManuel.length)
              const conf = !gele || !src ? ['LIVE', '#7a8ea9']
                : src === 'manuel' ? ['MANUEL', '#93c5fd']
                : src === 'final' ? ['DÉFINITIF', '#4ade80']
                : ['PROVISOIRE', '#fcd34d']
              return (
                <span style={{
                  marginLeft: 12, fontSize: 12, fontWeight: 800, letterSpacing: 1,
                  color: conf[1], border: `2px solid ${conf[1]}`, borderRadius: 999,
                  padding: '2px 12px', verticalAlign: 'middle',
                }}>
                  {conf[0]}
                  {rec?.ticketPoseLe && src && src !== null ? ` · gelé à ${heureGMT(rec.ticketPoseLe)}` : ''}
                </span>
              )
            })()}
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 3, marginTop: 8, color: '#fff', fontFamily: SK.nb.td }}>
              {ticket.length ? ticket.join('  ·  ') : '—'}
            </div>
            {ticket.length > 1 && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 6, fontFamily: SK.nb.td }}>
                <b>{ticket[0]}</b> = la seule case qui prédit (27,1 % de victoires) ·
                les {ticket.length - 1} autres sont un <b>bloc sans ordre</b> — le Quinté se joue en désordre.
              </div>
            )}
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

          {/* ⭐ 29/10/2026 — LA BASSMAT JUGE CE TICKET, À CHAQUE COURSE (§11.47).
              Mesuré sur 76 + 26 courses (tools/verdict-course.mjs) : le juge
              est CALIBRÉ (3,37 prédits / 3,50 réalisés, puis 3,30 / 3,27) mais
              il ne CLASSE pas les tickets — la composition qu'il préfère tombe
              à 6,6 % de 5/5 contre 11,8 % au moteur. Il annonce la valeur du
              ticket, il ne le remplace pas. Ne jamais le faire choisir. */}
          {(() => {
            const J = jugerTicket(detail, bassmat, forme ? forme.cle : null)
            if (!J) {
              return (
                <div style={{ ...s.box, padding: 12, marginBottom: 14, fontSize: 12, color: SK.muted, fontFamily: SK.police }}>
                  ⚖️ La bassmat ne peut pas juger ce ticket : <b>public/data/bassmat.json</b> manque.
                  Écrire <code>node tools\bassmat.mjs</code>.
                </div>
              )
            }
            const fort = J.attendu5 >= 3.4
            const moyen = J.attendu5 >= 2.9
            const coul = fort ? '#047857' : moyen ? '#b45309' : '#b91c1c'
            const nr = (x) => Number(x).toFixed(1).replace('.', ',')
            return (
              <div style={{ ...s.box, padding: 16, marginBottom: 14, borderLeft: '6px solid ' + coul }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
                  <b style={{ fontSize: 13, letterSpacing: 1, color: coul, fontFamily: SK.police }}>⚖️ LA BASSMAT JUGE CE TICKET</b>
                  <span style={{ fontSize: 11, color: SK.muted, fontFamily: SK.police }}>
                    juge = bassmat des courses passées · lecture : <b>{J.source === 'global' ? 'globale' : (forme && forme.lib) || J.source}</b>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: coul, fontFamily: SK.nb.td, lineHeight: 1 }}>
                      {nr(J.attendu5)}<span style={{ fontSize: 16, color: SK.muted }}> / 5</span>
                    </div>
                    <div style={{ fontSize: 11, color: SK.muted, fontFamily: SK.police, marginTop: 3 }}>
                      arrivants attendus dans les 5
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: SK.texte, fontFamily: SK.nb.td, lineHeight: 1 }}>
                      {nr(J.attendu3)}<span style={{ fontSize: 13, color: SK.muted }}> / 3</span>
                    </div>
                    <div style={{ fontSize: 11, color: SK.muted, fontFamily: SK.police, marginTop: 3 }}>
                      sur le podium
                    </div>
                  </div>
                  {J.faible && (
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#b45309', fontFamily: SK.nb.td, lineHeight: 1 }}>
                        n°{J.faible.num} <span style={{ fontSize: 12, color: SK.muted }}>· P{J.faible.place}</span>
                      </div>
                      <div style={{ fontSize: 11, color: SK.muted, fontFamily: SK.police, marginTop: 3 }}>
                        maillon faible — cette case ne sort que <b>{nr(J.faible.pc5)} %</b> du temps
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 12, fontSize: 12, fontFamily: SK.police }}>
                  {J.fautes.length === 0 ? (
                    <span style={{ color: '#047857' }}>
                      ✓ Aucune faute de choix : dans aucun bloc, la case jetée ne vaut mieux que la case gardée.
                    </span>
                  ) : (
                    <>
                      <div style={{ color: '#b45309', fontWeight: 700, marginBottom: 5 }}>
                        {J.fautes.length} faute{J.fautes.length > 1 ? 's' : ''} de choix — la case jetée valait mieux que la gardée :
                      </div>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: SK.nb.td, fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={{ ...SK.th, textAlign: 'left' }}>bloc</th>
                            <th style={{ ...SK.th, textAlign: 'left' }}>gardé</th>
                            <th style={{ ...SK.th, textAlign: 'left' }}>jeté</th>
                            <th style={{ ...SK.th, textAlign: 'right' }}>prix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {J.fautes.map((f, i) => (
                            <tr key={f.bloc} style={{ borderBottom: '1px solid ' + SK.bord, background: i % 2 ? SK.alt : SK.ligne }}>
                              <td style={{ ...SK.td, fontWeight: 800 }}>{f.bloc}</td>
                              <td style={{ ...SK.td }}>n°{f.garde.num} <span style={{ color: SK.muted }}>P{f.garde.place}</span> · {nr(f.garde.pc5)} %</td>
                              <td style={{ ...SK.td, color: '#b45309' }}>n°{f.jete.num} <span style={{ color: SK.muted }}>P{f.jete.place}</span> · {nr(f.jete.pc5)} %</td>
                              <td style={{ ...SK.td, textAlign: 'right', fontWeight: 700 }}>+{nr(f.ecart)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>

                <div style={{ marginTop: 10, fontSize: 11, color: SK.muted, fontFamily: SK.police, lineHeight: 1.5 }}>
                  ⚠ Mesuré (<b>tools/verdict-course.mjs</b>, 76 + 26 courses) : le juge est <b>calibré</b>
                  {' '}(3,37 prédits / 3,50 réalisés, puis 3,30 / 3,27) mais il <b>ne classe pas</b> les tickets —
                  la composition qu’il préfère tombe à <b>6,6 %</b> de 5/5 contre <b>11,8 %</b> pour le moteur.
                  Il annonce la valeur du ticket ; <b>il ne le remplace pas</b>.
                </div>
              </div>
            )
          })()}

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
                  style={{ padding: '8px 20px', borderRadius: 6, border: '2px solid ' + SK.accent, background: busyResultat ? '#7a8ea9' : SK.accent, color: '#fff', cursor: busyResultat ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: SK.police }}>
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
                        <td style={{ ...s.td, fontWeight: 700, color: sc.score >= 5 ? '#34d399' : sc.score >= 3.5 ? '#fbbf24' : '#fb7185' }}>
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

      {/* --------------------------------------------------------- bassmat */}
      {onglet === 'bassmat' && (
        <TabBassmat sk={SK} B={bassmat} H={huit} detail={detail} forme={forme} BC={bassmatChoix} MOIS={bassmatMois} />
      )}

      {/* --------------------------------------------------------- archive */}
      {onglet === 'archive' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button onClick={toutEffacer} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(244,63,94,.55)', background: SK.carte, color: '#fb7185', cursor: 'pointer', fontFamily: SK.police }}>
              Tout effacer
            </button>
            <button onClick={() => figerPuisRafraichir()} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.carte, color: SK.accent, cursor: 'pointer', fontFamily: SK.police }}>
              Rafraîchir
            </button>
          </div>

          {archive.length === 0 ? (
            <div style={{ fontSize: 13, color: '#7a8ea9' }}>Archive vide. Ouvre cette page chaque jour : la Synthèse est enregistrée automatiquement.</div>
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
                    const t = new Set(ticketValide(a))
                    const p = (a.arrivee || []).filter((n) => t.has(n)).length
                    /* ⭐ Les 3 indicateurs (09/10/2026) : le x/5 ne suffit pas.
                     *   Un 4/5 qui rate le 1er est une feuille perdante : on
                     *   compte le Top3 à part, et on signale le 1er manqué. */
                    const top3 = (a.arrivee || []).slice(0, 3)
                    const hit3 = top3.filter((n) => t.has(n)).length
                    const manque1er = (a.arrivee || []).length > 0 && ticketValide(a).length > 0 && !t.has(a.arrivee[0])
                    return (
                      <tr key={a.date} style={{ borderBottom: '1px solid rgba(255,255,255,.07)',                         background: a.placeholder ? SK.danger : (a.found ? SK.ligne : SK.alt) }}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{a.date}</td>
                        <td style={{ ...s.td, textTransform: 'capitalize' }}>{(a.hippodrome || a.race?.hippodrome || '—').toLowerCase()}</td>
                        <td style={s.td}>{({ PLAT: 'Plat', HAIE: 'Haies', ATTELE: 'Attelé', TROT: 'Trot', STEEPLECHASE: 'Steeple', STEEPLE: 'Steeple', HAIES: 'Haies', ATTELEE: 'Attelé' })[String(a.discipline || '').toUpperCase()] || (a.discipline && a.discipline !== 'N' ? a.discipline : '—')}</td>
                        <td style={s.td}>{a.distance ? a.distance + 'm' : '—'}</td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>
                          {(a.synthese || []).join(' ')}
                          {a.placeholder && <span style={{ color: '#fb7185', fontWeight: 700 }}> ⚠ par défaut</span>}
                        </td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>{(a.arrivee || []).join('-') || '—'}</td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11 }}>
  {/* ⭐ ORDRE VIVANT (20/10/2026, §11.32) : l'archive affiche les MÊMES
      chevaux, remis dans l'ordre de LA PRESSE du jour — le gel fige la
      SÉLECTION, jamais l'ordre (§17.2). */}
  {ordonnerTicket(ticketValide(a), buildGrid(a.synthese || [], a.runners || [])).join(' ') || '—'}
</td>
                        {/* ⭐ UN SEUL TEMPS : l'heure où le ticket a été POSÉ (le gel).
                            Pas l'heure d'enregistrement de la Synthèse — ce
                            sont deux moments différents, et n'en afficher
                            qu'un évite toute ambiguïté. */}
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: a.ticketPoseLe ? SK.accent : '#7a8ea9' }}>
                          {a.ticketPoseLe ? (hhmmGMT(a.ticketPoseLe) || '—') : '—'}
                        </td>
                        <td style={{ ...s.td, fontSize: 11, fontWeight: 800 }}>
                          {(() => {
                            if ((a.arrivee || []).length > 0) return <span style={{ color: '#57534e' }}>CLÔTURÉ</span>
                            const src = a.ticketSource || null
                            if (!src || !ticketValide(a).length) return <span style={{ color: '#7a8ea9' }}>—</span>
                            const conf = src === 'final' ? ['DÉFINITIF', '#34d399']
                              : src === 'manuel' ? ['MANUEL', '#1d4ed8']
                              : ['PROVISOIRE', '#b45309']
                            return <span style={{ color: conf[1] }}>{conf[0]}</span>
                          })()}
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: p === 5 ? '#34d399' : p > 0 ? '#fbbf24' : '#7a8ea9' }}>
                          {a.arrivee ? p + '/5' : '—'}
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: !a.arrivee ? '#7a8ea9' : hit3 === 3 ? '#34d399' : manque1er ? '#fb7185' : '#fbbf24' }}>
                          {!a.arrivee ? '—' : hit3 + '/3'}{manque1er ? ' ⚠1er' : ''}
                        </td>
                        <td style={s.td}>
                          <button onClick={async () => { await deleteArchive(a.date); rafraichirArchive() }}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#fb7185' }}>✕</button>
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
            <div style={{ fontSize: 13, color: '#7a8ea9' }}>
              Pas encore assez de données ({stats.nb} Quinté avec arrivée). L’archive se remplit
              automatiquement à chaque ouverture de page.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>
                  <b>{stats.nb}</b> Quinté(s) <b>valide(s)</b> retenu(s)
                  {stats.diagnostic ? ` · ${stats.diagnostic.coursesExaminees} examinée(s) · ${stats.diagnostic.coursesEcartees} écartée(s)` : ''}
                  {' '}— qui gagne, qui place.
                </span>
                {stats.diagnostic && (stats.diagnostic.doublons > 0 || stats.diagnostic.chevauxAbsents > 0) && (
                  <span style={{ color: '#fb7185', fontWeight: 600 }}>
                    ⚠ doublons {stats.diagnostic.doublons} · chevaux absents de la Synthèse {stats.diagnostic.chevauxAbsents} — exclus
                  </span>
                )}
                {(() => {
                  const closes = archive.filter((a) => (a.arrivee || []).length > 0 && ticketValide(a).length > 0)
                  const avec3 = closes.filter((a) => (a.arrivee || []).slice(0, 3).every((n) => ticketValide(a).includes(n))).length
                  const sans1er = closes.filter((a) => !ticketValide(a).includes(a.arrivee[0])).length
                  return closes.length ? (
                    <span style={{ fontWeight: 700 }}>
                      Top3 : <span style={{ color: '#34d399' }}>{avec3}/{closes.length}</span>
                      {' · '}1er manqué : <span style={{ color: sans1er ? '#fb7185' : '#34d399' }}>{sans1er}/{closes.length}</span>
                    </span>
                  ) : null
                })()}
                {stats.nb < 10 && (
                  <span style={{ color: '#b45309', fontWeight: 600 }}>
                    ⚠ {stats.nb}/10 — chiffres trop faibles pour conclure
                  </span>
                )}
                <button onClick={() => setToutLesP((v) => !v)}
                  style={{ padding: '3px 12px', borderRadius: 999, border: '1px solid ' + SK.bord, background: toutLesP ? 'rgba(255,255,255,.14)' : 'transparent', color: toutLesP ? '#fff' : SK.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
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
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                      <td style={{ ...s.td, fontWeight: 700 }}>n_top5</td>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <td key={r.place} style={{ ...s.td, fontWeight: 700 }}>{r.n}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                      <td style={{ ...s.td, fontWeight: 700, color: SK.muted }}>victoires</td>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <td key={r.place} style={{ ...s.td, color: SK.muted }}>{r.victoires ?? '—'}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                      <td style={{ ...s.td, fontWeight: 700, color: SK.muted }}>podiums</td>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <td key={r.place} style={{ ...s.td, color: SK.muted }}>{r.podiums ?? '—'}</td>
                      ))}
                    </tr>
                    {['1er', '2e', '3e', '4e', '5e'].map((lbl, k) => (
                      <tr key={lbl} style={{ borderBottom: '1px solid rgba(255,255,255,.07)', background: k % 2 ? SK.alt : SK.ligne }}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{lbl}</td>
                        {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                          <td key={r.place} style={{
                            ...s.td, fontWeight: r.n && r.p[k] > 0 ? 800 : 400,
                            color: r.n === 0 ? '#4a5a72' : r.p[k] > 0 ? '#34d399' : '#6d82a2',
                          }}>
                            {r.n ? r.p[k] + '%' : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr style={{ borderBottom: '1px solid ' + SK.bord, background: SK.accentClair }}>
                      <td style={{ ...s.td, fontWeight: 800, color: SK.accent }}>P(podium | top5)</td>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <td key={r.place} style={{
                          ...s.td, fontWeight: 800,
                          color: r.n === 0 ? '#4a5a72' : r.top3 >= 60 ? SK.accent : r.top3 > 0 ? SK.texte : '#6d82a2',
                          background: r.n ? SK.accentClair : SK.alt,
                        }}>
                          {r.n ? r.top3 + '%' : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid ' + SK.bord, background: SK.on }}>
                      <td style={{ ...s.td, fontWeight: 800 }}>P(top5 | N)</td>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <td key={r.place} style={{ ...s.td, fontWeight: 800 }}>{r.n ? r.top5 + '%' : '—'}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                Ligne <b>1er…5e</b> et <b>P(podium | top5)</b> : dénominateur <b>conditionnel</b> = <b>n_top5</b> (les courses où le P finit dans les 5).
                {' '}Ligne <b>P(top5 | N)</b> : dénominateur <b>global</b> = <b>N</b> (courses valides). Les deux ne sont pas comparables.
              </div>

              {/* §2.2 — les indicateurs EXPLICITES, dénominateur nommé, « — » si dénominateur nul */}
              <div style={{ overflowX: 'auto', marginTop: 16 }}>
                <table style={{ ...s.box, borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, overflow: 'hidden', boxShadow: SK.ombreD }}>
                  <thead>
                    <tr style={s.hdr}>
                      <th style={s.th}>Indicateur explicite</th>
                      {stats.parPlace.slice(0, toutLesP ? 20 : 5).map((r) => (
                        <th key={r.place} style={{ ...s.th, background: r.n === 0 ? SK.muted : SK.accentSombre }}>P{r.place}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const f = (x) => (x == null ? '—' : x)
                      const p = (x) => (x == null ? '—' : x + '%')
                      const L = stats.parPlace.slice(0, toutLesP ? 20 : 5)
                      const lignes = [
                        ['courses_valides', (r) => f(r.courses_valides), false],
                        ['n_top5', (r) => f(r.n_top5), false],
                        ['victoires', (r) => f(r.victoires), false],
                        ['podiums', (r) => f(r.podiums), false],
                        ['P(victoire | top5)', (r) => p(r.p_victoire_conditionnel), true],
                        ['P(victoire | N)', (r) => p(r.p_victoire_global), true],
                        ['P(podium | top5)', (r) => p(r.p_podium_conditionnel), true],
                        ['P(top5 | N)', (r) => p(r.p_top5_global), true],
                      ]
                      return lignes.map(([lbl, get, pct], k) => (
                        <tr key={lbl} style={{ borderBottom: '1px solid rgba(255,255,255,.07)', background: k % 2 ? SK.alt : SK.ligne }}>
                          <td style={{ ...s.td, fontWeight: 700, color: pct ? SK.accent : '#a4b8d6' }}>{lbl}</td>
                          {L.map((r) => (
                            <td key={r.place} style={{ ...s.td, color: r.n === 0 ? '#4a5a72' : '#c7d6ea' }}>{get(r)}</td>
                          ))}
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>

              <div style={{ ...s.box, padding: 14, marginTop: 16, boxShadow: SK.ombreD }}>
                <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>Par groupe</b>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Dénominateurs : <b>présence_course</b> = courses valides · <b>part_victoires</b> = total des 1res (1/course) ·
                  {' '}<b>part_podiums</b> = total des podiums (3/course) · <b>part_places_4_5</b> = total des 4e+5e (2/course).
                  {' '}<b>présence_course</b> compte des courses, les trois autres comptent des places : ne pas les comparer directement.
                </div>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, marginTop: 10, fontSize: 13, overflow: 'hidden', border: '1px solid ' + SK.bord, borderRadius: 8 }}>
                  <thead>
                    <tr style={s.hdr}>
                      {['Groupe', 'présence_course', 'part_victoires', 'part_podiums', 'part_places_4_5'].map((h) => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.parGroupe.map((g) => (
                      <tr key={g.id} style={{ borderBottom: '1px solid ' + SK.bord }}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{g.label}</td>
                        <td style={s.td}>{g.presence_course == null ? '—' : g.presence_course + '%'}</td>
                        <td style={s.td}>{g.part_victoires == null ? '—' : g.part_victoires + '%'}</td>
                        <td style={s.td}>{g.part_podiums == null ? '—' : g.part_podiums + '%'}</td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{g.part_places_4_5 == null ? '—' : g.part_places_4_5 + '%'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                {stats.empreinte && (
                  <div style={{ ...s.box, padding: 14, marginTop: 16, boxShadow: SK.ombreD }}>
                    <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>Empreinte — 4 tests indépendants</b>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, marginBottom: 8 }}>
                      Chaque test a SON N, ses cas non évaluables et sa période. Les quatre restent <b>séparés</b> :
                      aucune moyenne entre eux, aucune fusion.
                    </div>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, overflow: 'hidden', border: '1px solid ' + SK.bord, borderRadius: 8, width: '100%' }}>
                      <thead>
                        <tr style={s.hdr}>
                          {['Test', 'n', 'non éval.', 'tous top3', 'tous top5', '≥1 top3', 'période'].map((h) => <th key={h} style={s.th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.empreinte.map((t, k) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid ' + SK.bord, background: k % 2 ? SK.alt : SK.ligne }}>
                            <td style={{ ...s.td, fontWeight: 700 }}>{t.label}</td>
                            <td style={s.td}>{t.n}</td>
                            <td style={{ ...s.td, color: t.nonEvaluables ? SK.muted : '#7a8ea9' }}>{t.nonEvaluables}</td>
                            <td style={{ ...s.td, color: t.top3 == null ? '#4a5a72' : '#34d399', fontWeight: 700 }}>{t.top3 == null ? '—' : t.top3 + '%'}</td>
                            <td style={{ ...s.td, fontWeight: 700 }}>{t.top5 == null ? '—' : t.top5 + '%'}</td>
                            <td style={s.td}>{t.un == null ? '—' : t.un + '%'}</td>
                            <td style={{ ...s.td, color: '#64748b' }}>{t.debut && t.fin ? t.debut + ' → ' + t.fin : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ⭐ LES DEUX EMPREINTES (19/10/2026) — tools/empreinte.mjs.
                    Le PODIUM et le QUINTÉ lus par CASE du carnet (P1..P20),
                    comme la grille. Source : les 96 Quintés à presse réelle. */}
                {empreinte && (() => {
                  const E = empreinte
                  const nb = (x) => (x == null ? '—' : String(x).replace('.', ','))
                  const bloc = (titre, d, max) => (
                    <div style={{ flex: '1 1 300px', minWidth: 290 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: SK.accent, letterSpacing: .6, textTransform: 'uppercase', marginBottom: 6 }}>{titre}</div>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
                        <tbody>
                          {d.motifs.slice(0, max).map((m) => (
                            <tr key={m.motif} style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                              <td style={{ padding: '3px 6px', fontFamily: SK.nb.td, fontWeight: 800, color: SK.texte, whiteSpace: 'nowrap' }}>{m.motif}</td>
                              <td style={{ padding: '3px 6px', width: 46, textAlign: 'right', fontFamily: SK.nb.td, color: '#c7d6ea' }}>{m.n}</td>
                              <td style={{ padding: '3px 6px', width: 62, textAlign: 'right', fontFamily: SK.nb.td, fontWeight: 800, color: SK.accent, whiteSpace: 'nowrap' }}>{nb(m.pct)} %</td>
                              <td style={{ padding: '3px 6px', width: 90 }}>
                                <div style={{ height: 7, borderRadius: 4, background: SK.accent, opacity: .75, width: Math.max(2, m.pct * 3.2) }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ fontSize: 11, color: SK.muted, marginTop: 6, lineHeight: 1.5 }}>
                        moyenne par course : <b>G1 {nb(d.moyenne.G1)}</b> · G2 {nb(d.moyenne.G2)} · G3 {nb(d.moyenne.G3)} · G4 {nb(d.moyenne.G4)} · G5 {nb(d.moyenne.G5)}
                        <br />{d.distinctes} empreintes distinctes · la plus fréquente : <b style={{ fontFamily: SK.nb.td }}>{d.empreintes[0]?.empreinte}</b> ({nb(d.empreintes[0]?.pct)} %)
                      </div>
                    </div>
                  )
                  return (
                    <div style={{ ...s.box, padding: 14, marginTop: 16, boxShadow: SK.ombreD }}>
                      <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>Les deux empreintes — le podium et le quinté</b>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, marginBottom: 10 }}>
                        <b>{E.n}</b> Quintés à <b>presse réelle</b> ({E.periode.debut} → {E.periode.fin}) · lus par <b>case du carnet</b> (P1..P20), le même P que la grille.
                        Un motif = combien de chevaux de chaque groupe : <b>G1·G2·G3·G4·G5</b>.
                      </div>
                      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                        {bloc('Le podium (3 places)', E.podium, 8)}
                        {bloc('Le quinté (5 places)', E.quinte, 10)}
                      </div>
                      <div style={{ marginTop: 14, borderTop: '1px solid ' + SK.bord, paddingTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: SK.accent, letterSpacing: .6, textTransform: 'uppercase', marginBottom: 6 }}>Combien de cases pour tout tenir</div>
                        <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr>
                              {['P1..Pk', 'podium', 'quinté'].map((h) => <th key={h} style={{ padding: '3px 10px', textAlign: 'right', color: SK.muted, fontWeight: 800, fontSize: 11 }}>{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {E.courbe.map((c) => (
                              <tr key={c.k} style={{ borderTop: '1px solid rgba(255,255,255,.06)', background: c.k === NB_TICKET ? SK.accentClair : 'transparent' }}>
                                <td style={{ padding: '2px 10px', textAlign: 'right', fontFamily: SK.nb.td, fontWeight: 800 }}>{c.k}</td>
                                <td style={{ padding: '2px 10px', textAlign: 'right', fontFamily: SK.nb.td }}>{nb(c.podium)} %</td>
                                <td style={{ padding: '2px 10px', textAlign: 'right', fontFamily: SK.nb.td, fontWeight: c.k === NB_TICKET ? 800 : 400, color: c.k === NB_TICKET ? SK.accent : '#c7d6ea' }}>{nb(c.quinte)} %</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ fontSize: 11, color: SK.muted, marginTop: 6 }}>
                          La ligne surlignée = la taille du ticket du Quinté ({NB_TICKET} chevaux, {QUOTAS_TXT}).
                          Écrire les chiffres : <code>node tools\empreinte.mjs</code>.
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* ⭐ LA BASSMAT DU BLOC (21/10/2026) — tools/bloc-pm.mjs.
                    La CASE de la grille (P1..P20) CROISÉE avec la BANDE DU
                    MARCHÉ. C'est la seule table qui dit QUI prendre À
                    L'INTÉRIEUR d'un bloc — et la mesure qui dit si ça paie. */}
                {blocPm && (() => {
                  const BP = blocPm
                  const nb = (x) => (x == null ? '—' : String(x).replace('.', ','))
                  const BLOCS = ['G1', 'G2', 'G3', 'G4', 'G5']
                  const BANDES = ['fort', 'bon', 'moyen', 'faible']
                  // la couleur dit la force du taux — jamais la bande (la bande
                  // a déjà sa teinte de fond, on ne mélange pas deux codes)
                  const coul = (p, n) => (n < 15 ? SK.muted : p >= 45 ? '#34d399' : p >= 25 ? '#fbbf24' : '#fb7185')
                  const th = { padding: '4px 7px', fontSize: 11, color: SK.muted, fontWeight: 800, textAlign: 'right', whiteSpace: 'nowrap' }
                  const cell = { padding: '4px 7px', textAlign: 'right', fontFamily: SK.nb.td, whiteSpace: 'nowrap' }
                  const A = (BP.autopsies || []).find((x) => x.code === 'blocM12')
                  return (
                    <div style={{ ...s.box, padding: 14, marginTop: 16, boxShadow: SK.ombreD }}>
                      <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>La bassmat du bloc — la case × la bande du marché</b>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, marginBottom: 10 }}>
                        <b>{BP.n}</b> Quintés à <b>presse réelle</b> ({BP.periode.debut} → {BP.periode.fin}).
                        <b> P</b> = la case de la grille (P1..P20, le même P que la grille).
                        <b> Bande</b> = le rang de cote : M≤3 fort · M≤5 bon · M6-12 moyen · M13+ faible.
                      </div>
                      <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, width: 'auto' }}>
                        <thead>
                          <tr>
                            <th style={{ ...th, textAlign: 'left', width: 40 }}>bloc</th>
                            {BANDES.map((b) => (
                              <th key={b} style={{ ...th, background: BANDE_MARCHE[b].fond, color: BANDE_MARCHE[b].couleur }}>{BANDE_MARCHE[b].court}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {BLOCS.map((g) => (
                            <tr key={g} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                              <td style={{ ...cell, fontWeight: 800, textAlign: 'left' }}>{g}</td>
                              {BANDES.map((b) => {
                                const c = BP.bassmatBloc.find((x) => x.cle === g + '|' + b)
                                return (
                                  <td key={b} style={{ ...cell, color: c ? coul(c.top5, c.n) : SK.muted }}>
                                    {c ? nb(c.top5) + ' %' : '—'}
                                    <span style={{ color: SK.muted, fontWeight: 400 }}> · {c ? c.n : 0}</span>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ fontSize: 11, color: SK.muted, marginTop: 6 }}>
                        % arrivés dans les 5 · le chiffre après le point = <b>n</b> — sous 15, le taux est gris : trop peu pour voter.
                        Lecture : <b style={{ color: '#34d399' }}>G1 en bande forte arrive 56,7 %</b>, en bande moyenne 41,6 %.
                      </div>

                      <div style={{ marginTop: 14, borderTop: '1px solid ' + SK.bord, paddingTop: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: SK.accent, letterSpacing: .6, textTransform: 'uppercase', marginBottom: 4 }}>La mesure — même ticket ({NB_TICKET} chevaux, {QUOTAS_TXT}), seule la règle de choix change</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                          Chaque règle est jugée <b>hors d'elle-même</b> (leave-one-out) : la table d'une course ne contient jamais cette course.
                        </div>
                        <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, width: '100%' }}>
                          <thead>
                            <tr style={s.hdr}>
                              <th style={{ ...s.th, textAlign: 'left' }}>règle de choix</th>
                              {['chev.', 'podium entier', 'quinté entier', '1re moitié', '2ᵉ moitié'].map((h) => (
                                <th key={h} style={{ ...s.th, textAlign: 'right', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {BP.mesure.map((m) => (
                              <tr key={m.code} style={{ borderTop: '1px solid ' + SK.bord, background: m.code === 'production' ? SK.accentClair : 'transparent' }}>
                                <td style={{ ...s.td, fontWeight: m.code === 'production' ? 800 : 400 }}>{m.nom}</td>
                                <td style={{ ...s.td, textAlign: 'right', fontFamily: SK.nb.td }}>{nb(m.chevaux)}</td>
                                <td style={{ ...s.td, textAlign: 'right', fontFamily: SK.nb.td, fontWeight: 800 }}>{nb(m.podium)} %</td>
                                <td style={{ ...s.td, textAlign: 'right', fontFamily: SK.nb.td, fontWeight: 800, color: m.code === 'production' ? SK.accent : '#c7d6ea' }}>{nb(m.quinte)} %</td>
                                <td style={{ ...s.td, textAlign: 'right', fontFamily: SK.nb.td }}>{nb(m.m1q)} %</td>
                                <td style={{ ...s.td, textAlign: 'right', fontFamily: SK.nb.td }}>{nb(m.m2q)} %</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ fontSize: 11, color: SK.muted, marginTop: 6 }}>
                          <b>podium entier</b> = les 3 premiers sont tous dans le ticket · <b>quinté entier</b> = les 5.
                          Les deux dernières colonnes = le quinté entier, moitié par moitié.
                        </div>
                      </div>

                      <div style={{ marginTop: 14, borderTop: '1px solid ' + SK.bord, paddingTop: 10, fontSize: 12, lineHeight: 1.6 }}>
                        <b style={{ color: SK.accent }}>Verdict ({nb(BP.verdict.production.podium)} % podium · {nb(BP.verdict.production.quinte)} % quinté pour le moteur)</b> — {BP.verdict.texte}
                        {A && (
                          <>
                            <br />La bassmat « seulement G1·G2 » change le ticket dans <b>{A.coursesChangees}</b> courses sur {A.cours}
                            {' '}({A.blocsChanges} blocs).
                            {A.blocs.filter((x) => x.changes).map((x) => (
                              <span key={x.bloc}> <b>{x.bloc}</b> : {x.changes} courses → {x.bassmat} arrivants dans les 5 contre {x.production} pour le moteur ·</span>
                            ))}
                            <br />Les deux bandes et la place de presse désignent déjà les mêmes chevaux la plupart du temps : quand elles divergent, c'est un échange pour un autre, pas un gain.
                          </>
                        )}
                        <br /><span style={{ color: SK.muted }}>Écrire les chiffres : <code>node tools\bloc-pm.mjs</code> — ils ne sont jamais saisis à la main.</span>
                      </div>
                    </div>
                  )
                })()}

                <div style={{ ...s.box, padding: 14, marginTop: 16, boxShadow: SK.ombreD }}>
                <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>Le vainqueur vient de…</b>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  {Object.entries(stats.vainqueur).map(([k, v]) => (
                    <span key={k} style={{ marginRight: 18 }}>
                      <b>{k}</b> : {v}/{stats.nb} = {Math.round(v / stats.nb * 100)}%
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: 13, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.07)' }}>
                  <b style={{ color: SK.accent }}>Le podium (1er + 2e + 3e) vient de…</b>
                  <div style={{ marginTop: 6 }}>
                    {stats.podiumBloc.map((b) => {
                      /* ⭐ COULEURS DES P DANS LA LIGNE (11/10/2026) : le total
                       * du bloc reste neutre (pas de couleur). Chaque P : max
                       * de la ligne en vert, 0 en rouge, l'entre-deux en jaune.
                       * Ex-aequo au max → tous verts. */
                      const vals = (b.detail || []).map((d) => d.n)
                      const mx = vals.length ? Math.max(...vals) : 0
                      const coul = (v) =>
                        v === mx ? { color: '#34d399', background: 'rgba(52,211,153,.18)' }
                        : v < 1 ? { color: '#fb7185', background: 'rgba(244,63,94,.18)' }
                        : { color: '#fbbf24', background: 'rgba(251,191,36,.16)' }
                      const chip = { fontSize: 12, fontWeight: 800, padding: '1px 7px', borderRadius: 10, marginRight: 6 }
                      return (
                        <div key={b.id} style={{ marginBottom: 6 }}>
                          <span style={{ marginRight: 12 }}>
                            <b>{b.id}</b> : {b.n}/{stats.nb} = {b.pct}%
                          </span>
                          <span style={{ fontSize: 12 }}>
                            {(b.detail || []).map((d) => (
                              <span key={d.p} style={{ ...chip, ...coul(d.n) }}>
                                P{d.p} : {d.n}/{stats.nb}
                              </span>
                            ))}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                    Le tableau du dessus détaille chaque position P1 → P20.
                    Ici on compte les courses où <b>au moins un</b> des trois premiers sort du bloc.
                    {' '}Couleurs <b>des P dans chaque ligne</b> (le total reste neutre) :
                    {' '}<span style={{ padding: '0 6px', borderRadius: 8, color: '#34d399', background: 'rgba(52,211,153,.18)', fontWeight: 800 }}>le + fort</span>
                    {' '}<span style={{ padding: '0 6px', borderRadius: 8, color: '#fbbf24', background: 'rgba(251,191,36,.16)', fontWeight: 800 }}>au milieu</span>
                    {' '}<span style={{ padding: '0 6px', borderRadius: 8, color: '#fb7185', background: 'rgba(244,63,94,.18)', fontWeight: 800 }}>0</span>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------- écarts */}
      {onglet === 'ecarts' && (
        <TabEcarts sk={SK} ecarts={ecarts} detail={detail} />
      )}

      {/* ------------------------------------------------------------ choix */}
      {onglet === 'choix' && (
        <TabChoix sk={SK} choix={choix} />
      )}
    </div>
    </>
  )
}