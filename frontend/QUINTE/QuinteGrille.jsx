import { useLang } from '../../src/lib/langue.jsx'
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
  fetchBassmatMois, jugerTicket, fetchDeparts,
} from '../../src/lib/quinte'
/* ⭐ 08/11/2026 — LE SIÈGE PLAT (9ᵉ cheval, hors quota). Module séparé : le
 *   moteur `quinte.js` et sa copie backend ne sont pas touchés (§11.49). */
import { siegePlat, avecSiegePlat } from '../../src/lib/siege-plat'
import { chargerDetailReu, chargerPageTqq, offsetJour } from '../../backend/ARTICLE/turfFrance.js'

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
  ['grille', 'La grille'], ['ticket', 'Le ticket'],
  ['archive', 'Archive'], ['stats', 'Statistiques'], ['ecarts', 'Écarts'],
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
  const { t } = useLang()
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
                  <b style={{ fontSize: 13, color: sk ? sk.accent : '#1d4ed8', letterSpacing: 1 }}>{t('conditions_course')}</b>
        
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
  const { t } = useLang()
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
  const [statsDiscipline, setStatsDiscipline] = useState('all')   // all / plat / attelé / monté / haies
  const [bassmatDiscipline, setBassmatDiscipline] = useState('all')   // all / plat / attelé / haies
  const [statsTrot, setStatsTrot] = useState('all')   // all / autostart / volte / monte (pour le trot)
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
  const [departs, setDeparts] = useState(null)
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
    fetchDeparts().then((x) => x && setDeparts(x)).catch(() => {})
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
  // normalise la discipline d'une course d'archive (Plat/PLAT → plat, etc.)
  const normDisc = (d) => {
    const s = String(d || '').toLowerCase().trim()
    if (s.startsWith('plat')) return 'plat'
    if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
    if (s.startsWith('mont')) return 'monté'
    if (s.startsWith('haie') || s.startsWith('steeple')) return 'haies'
    return s || 'autre'
  }
  /* ⭐ 05/11/2026 — le type de départ du TROT (autostart / volté / monté).
   *   On s'appuie sur data/departs.json (tools/departs.mjs, 248 dates PMU).
   *   Le cheval de repli est `null` → on ne filtre rien (pas d'invention). */
  const typeTrot = (a) => {
    if (!departs || !departs.courses) return null
    const c = departs.courses
    if (a.cle && c[a.cle]) return c[a.cle]
    if (a.courseId) {
      const m = String(a.courseId).match(/(\d{4}-\d{2}-\d{2})_R(\d+)_C(\d+)/)
      if (m) {
        const k = `${m[1]}_R${m[2]}_C${m[3]}`
        if (c[k]) return c[k]
      }
    }
    if (a.race && a.race.r && a.race.c && a.date) {
      const k = `${a.date}_R${a.race.r}_C${a.race.c}`
      if (c[k]) return c[k]
    }
    return null
  }
  const archiveFiltree = useMemo(() => {
    let base = archive
    if (statsDiscipline !== 'all') base = base.filter((a) => normDisc(a.discipline) === statsDiscipline)
    if (statsDiscipline === 'attelé' && statsTrot !== 'all') {
      base = base.filter((a) => {
        const t = typeTrot(a)
        if (!t) return statsTrot === 'all' ? true : false
        if (statsTrot === 'autostart') return t.depart === 'autostart'
        if (statsTrot === 'volte') return t.depart !== 'autostart'
        if (statsTrot === 'monte') return t.discipline === 'monté'
        return true
      })
    }
    return base
  }, [archive, statsDiscipline, statsTrot, departs])
  const stats = useMemo(() => computeStats(archiveFiltree), [archiveFiltree])

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

/* ═══════════════════ LA BARRE DE FILTRES PARTAGÉE (05/11/2026) ═════════════
 * Les MÊMES deux filtres servent trois onglets : Statistiques, Écarts, Choix.
 *   · « P1-P5 seulement »  → on coupe l'affichage à P5
 *   · « Discipline »       → Tout / Plat / Attelé / Haies
 * Un seul composant = un seul comportement, aucune divergence entre onglets.
 * ═════════════════════════════════════════════════════════════════════════ */
const DISCIPLINES = ['all', 'plat', 'attelé', 'haies']
const DISCIPLINES_TROT = ['all', 'plat', 'attelé', 'monté', 'haies']
const DISC_LABEL = { all: 'Tout', plat: 'Plat', 'attelé': 'Attelé', 'monté': 'Monté', haies: 'Haies' }

function BarreFiltres({ sk, toutLesP, setToutLesP, discipline, setDiscipline, noteP, disciplines }) {
  const liste = disciplines || DISCIPLINES
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
      <button onClick={() => setToutLesP((v) => !v)}
        style={{ padding: '3px 12px', borderRadius: 999, border: '1px solid ' + sk.bord, background: toutLesP ? 'rgba(255,255,255,.14)' : 'transparent', color: toutLesP ? '#fff' : sk.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
        {toutLesP ? 'P1-P5 seulement' : 'Voir jusqu’à P20'}
      </button>
      {noteP && !toutLesP ? <span style={{ fontSize: 11, color: sk.muted }}>{noteP}</span> : null}
      <span style={{ fontSize: 12, color: sk.muted, fontWeight: 700 }}>Discipline :</span>
      {liste.map((d) => (
        <button key={d} onClick={() => setDiscipline(d)}
          style={{ padding: '3px 10px', borderRadius: 999, border: '1px solid ' + sk.bord, background: discipline === d ? sk.accent : 'transparent', color: discipline === d ? '#fff' : sk.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          {DISC_LABEL[d] || d}
        </button>
      ))}
    </div>
  )
}

/* ══════════════════════════ L'ONGLET ÉCARTS — les cases P1..P20 ════════════
 * ⭐ 07/11/2026 — « P » = la CASE du carnet (slot), PAS le rang de presse :
 *   identique à LA GRILLE (Boite P{slot}) et à Statistiques (slotParNum).
 *   Une case DONNE quand le cheval qui l'occupe finit dans les cinq premiers.
 *   Chiffres : data/ecarts.json (tools/ecarts.mjs, numAtSlot via buildGrid).
 * ⭐ 05/11/2026 — les deux filtres de l'onglet Statistiques sont ici aussi :
 *   la discipline choisit la section `parDiscipline` du MÊME fichier, et
 *   « P1-P5 » coupe les lignes. Aucun chiffre n'est recalculé dans la page.
 * ═════════════════════════════════════════════════════════════════════════ */
function TabEcarts({ sk, ecarts, detail, toutLesP, setToutLesP, discipline, setDiscipline }) {
  if (!ecarts) return (
    <div style={{ fontSize: 13, color: sk.muted }}>
      Pas encore de mesure : écrire <b>public/data/ecarts.json</b> (node tools\ecarts.mjs).
    </div>
  )
  /* la section de la discipline choisie — repli sur le global si absente */
  const bloc = (discipline && ecarts.parDiscipline && ecarts.parDiscipline[discipline]) || ecarts
  const places = bloc.places || []
  const M = bloc.mesure
  /* ⭐ 07/11/2026 — parPlace doit être indexé par slot (case number),
   * pas par place (press rank). Écarts utilise slot pour afficher P. */
  const parPlace = {}
  for (const g of detail || []) for (const c of g.cases) if (c.slot) parPlace[c.slot] = c
  const etat = (x) => {
    if (!x.n || x.dernierHit == null) return { lib: 'jamais', couleur: '#fb7185', fond: 'rgba(244,63,94,.18)' }
    if (x.coursesDepuis != null && x.coursesDepuis >= 5) return { lib: 'froide', couleur: '#fb7185', fond: 'rgba(244,63,94,.18)' }
    if (x.pctTop5 >= 40 || (x.coursesDepuis != null && x.coursesDepuis <= 1)) return { lib: 'chaude', couleur: '#34d399', fond: 'rgba(52,211,153,.18)' }
    return { lib: 'tiède', couleur: '#fbbf24', fond: 'rgba(251,191,36,.16)' }
  }
  /* ⭐ 05/11/2026 — 💣 LA CASE ATTENDUE (demande utilisateur).
   *
   * Règle, sans chiffre inventé : on ne garde que les cases qui ont assez de
   * courses (n ≥ 20), puis on classe par :
   *   ① le nombre de hits sur ses 3 DERNIÈRES courses (la série en cours) ;
   *   ② le % de top-5 ;  ③ le % de top-3 ;  ④ la case la plus haute (P1…).
   * C'est la case « chaude » du moment — celle qu'on attend aujourd'hui.
   * Le choix se fait PARMI LES CASES AFFICHÉES (P1-P5 si le filtre est actif).
   */
  const hits3 = (x) => (x.serie || []).slice(-3).reduce((a, v) => a + (v ? 1 : 0), 0)
  const visibles = places.filter((x) => x.n && (toutLesP || x.p <= 5))
  const assez = visibles.filter((x) => x.n >= 20)
  const pool = assez.length ? assez : visibles
  const bombe = pool.slice().sort((a, b) =>
    hits3(b) - hits3(a) || (b.pctTop5 || 0) - (a.pctTop5 || 0) || (b.pctTop3 || 0) - (a.pctTop3 || 0) || a.p - b.p
  )[0] || null
  const chevalBombe = bombe ? parPlace[bombe.p] : null
  /* ⭐ 06/11/2026 — 💣💣 2e QONBILE pour le TOP-3 (podium).
   * Même règle, mais le tri privilégie le % de top-3 (podium) plutôt que
   * le % de top-5. Les deux bombes peuvent désigner la même case. */
  /* ⭐ 06/11/2026 — 💣💣💣 3 QONBILES pour le TOP-3 (podium).
   * Les 3 meilleures cases pour le podium, triées par % de top-3. */
  const top3Bombes = pool.slice().sort((a, b) =>
    (b.pctTop3 || 0) - (a.pctTop3 || 0) || hits3(b) - hits3(a) || (b.pctTop5 || 0) - (a.pctTop5 || 0) || a.p - b.p
  ).slice(0, 3)
  const estTop3Bombe = (p) => top3Bombes.some((b) => b.p === p)
  return (
    <div>
      <BarreFiltres sk={sk} toutLesP={toutLesP} setToutLesP={setToutLesP} discipline={discipline} setDiscipline={setDiscipline} />
      <div style={{ fontSize: 13, color: sk.texte, lineHeight: 1.6, background: sk.alt, border: '1px solid ' + sk.bord, borderLeft: '4px solid ' + sk.accent, borderRadius: sk.box.borderRadius, padding: '10px 12px', marginBottom: 12 }}>
        <b>{M.courses} courses à presse réelle</b>
        {discipline && discipline !== 'all' ? <span> · <b>{DISC_LABEL[discipline]}</b></span> : null}
        {' '}({M.du} → {M.au}) · {M.definition}
        <br />
        <span style={{ color: sk.muted }}>
          « courses depuis » = depuis combien de courses de ce registre la case n’a plus rien donné.
          « jours depuis » se compte depuis la dernière course du registre ({M.au}), pas depuis aujourd’hui.
        </span>
      </div>
      {bombe ? (
        <div style={{ marginBottom: 10, fontSize: 12.5, color: sk.texte, background: sk.alt, border: '1px dashed ' + sk.bord, borderLeft: '4px solid #f59e0b', borderRadius: sk.box.borderRadius, padding: '8px 12px', lineHeight: 1.6 }}>
          <span style={{ fontSize: 15 }}>💣</span>{' '}
          <b>Case attendue aujourd’hui : P{bombe.p}</b>
          {chevalBombe ? <> → <b>{chevalBombe.num}</b>{chevalBombe.marche != null ? <span style={{ color: sk.muted }}> (marché M{chevalBombe.marche})</span> : null}</> : null}
          {' '}· {hits3(bombe)}/3 sur ses 3 dernières · {bombe.top5}/{bombe.n} top-5 ({bombe.pctTop5} %) · {bombe.top3}/{bombe.n} top-3 ({bombe.pctTop3} %)
          {bombe.dernierHit ? <> · dernier hit {bombe.dernierHit}</> : null}
          <br />
          <span style={{ color: sk.muted }}>
            Choix : parmi les cases affichées, celles qui ont assez de courses (n ≥ 20) — d’abord
            le nombre de hits sur ses <b>3 dernières courses</b>, puis le % de top-5, puis le % de top-3.
            Aucun chiffre n’est saisi à la main.
          </span>
        </div>
      ) : null}
      {top3Bombes.length > 0 ? (
        <div style={{ marginBottom: 10, fontSize: 12.5, color: sk.texte, background: sk.alt, border: '1px dashed ' + sk.bord, borderLeft: '4px solid #a855f7', borderRadius: sk.box.borderRadius, padding: '8px 12px', lineHeight: 1.6 }}>
          <span style={{ fontSize: 15 }}>💣💣💣</span>{' '}
          <b>3 cases attendues pour le TOP-3 (podium) :</b>
          {top3Bombes.map((b, i) => {
            const ch = parPlace[b.p]
            return (
              <span key={b.p} style={{ marginLeft: 8 }}>
                <b>P{b.p}</b>
                {ch ? <> → <b>{ch.num}</b></> : null}
                {' '}({b.pctTop3} % top-3 · {b.pctTop5} % top-5 · {hits3(b)}/3)
                {i < top3Bombes.length - 1 ? ' · ' : ''}
              </span>
            )
          })}
          <br />
          <span style={{ color: sk.muted }}>
            Choix : parmi les cases affichées, celles qui ont assez de courses (n ≥ 20) — d’abord
            le % de top-3 (podium), puis le nombre de hits sur ses <b>3 dernières courses</b>, puis le % de top-5.
            Aucun chiffre n’est saisi à la main.
          </span>
        </div>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...sk.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13, overflow: 'hidden', boxShadow: sk.ombreD }}>
          <thead>
            <tr style={sk.hdrStyle}>
              {['case', 'la course du jour', 'P donne', '% top-5', '% top-3', 'gagne', 'dernier hit', 'courses depuis', 'état', 'les 6 dernières'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibles.map((x, i) => {
              const e = etat(x)
              const c = parPlace[x.p]
              const estBombe = bombe && bombe.p === x.p
              const estBombe3 = top3Bombes.some((b) => b.p === x.p)
              return (
                <tr key={x.p} style={{ borderBottom: '1px solid ' + sk.bord, background: estBombe ? 'rgba(245,158,11,.14)' : estBombe3 ? 'rgba(168,85,247,.14)' : i % 2 ? sk.alt : sk.ligne, borderLeft: estBombe ? '3px solid #f59e0b' : estBombe3 ? '3px solid #a855f7' : '3px solid transparent' }}>
                  <td style={{ ...sk.td, fontWeight: 800 }}>
                    {estBombe ? <span title="la case attendue aujourd’hui (top-5)" style={{ marginRight: 4 }}>💣</span> : null}
                    {estBombe3 ? <span title="la case attendue pour le top-3" style={{ marginRight: 4 }}>💣</span> : null}
                    P{x.p}
                  </td>
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
function TabChoix({ sk, choix, toutLesP, setToutLesP, discipline, setDiscipline }) {
  /* ⭐ 05/11/2026 — L'ONGLET EST RÉÉCRIT POUR LE VISITEUR.
   *
   *   Avant : cinq tableaux techniques d'affilée, sans une phrase pour dire ce
   *   qui était mesuré. Un visiteur ne pouvait pas comprendre.
   *
   *   Maintenant, dans cet ordre :
   *     ① la QUESTION, en clair, et la réponse en une phrase ;
   *     ② TROIS CHIFFRES seulement (le moteur · le maximum · la meilleure règle) ;
   *     ③ ce que ça veut dire, en trois puces ;
   *     ④ le seul tableau utile : OÙ se perdent les 1-2-3 ;
   *     ⑤ tout le reste (levier, règles, grille, stabilité, sources) derrière
   *       un bouton « Détails techniques » — rien n'est supprimé.
   *
   *   ⚠ Aucun chiffre n'est écrit à la main : tout vient de data/choix.json,
   *     y compris la discipline choisie (`parDiscipline`).
   */
  const [details, setDetails] = useState(false)
  if (!choix) return (
    <div style={{ fontSize: 13, color: sk.muted }}>
      Pas encore de mesure : écrire <b>public/data/choix.json</b> (node tools\choix-g1g2.mjs).
    </div>
  )
  /* la discipline choisit la section `parDiscipline` du MÊME fichier.
   * Repli sur la mesure globale si la section manque. */
  const src = (discipline && discipline !== 'all' && choix.parDiscipline && choix.parDiscipline[discipline]) || choix
  const D = src.diagnostic || {}
  const L = src.levier || {}
  const nb = (x) => (x == null ? '—' : String(x).replace('.', ','))
  const pc = (x) => (x == null ? '—' : nb(x) + ' %')
  /* ⚠ le signe doit s'afficher, pas un « + » aveugle. */
  const plus = (v) => (v > 0 ? '+' : v < 0 ? '\u2212' : '\u00b1') + nb(Math.round(10 * Math.abs(v)) / 10)
  const bar = (v, max) => (
    <span style={{ display: 'inline-block', verticalAlign: 'middle', width: 120, height: 9, background: sk.alt, border: '1px solid ' + sk.bord, borderRadius: 999, overflow: 'hidden' }}>
      <span style={{ display: 'block', width: Math.max(2, Math.round((100 * v) / max)) + '%', height: '100%', background: sk.accent }} />
    </span>
  )
  const blocs = (D.blocs || []).slice().sort((a, b) => (b.ecartes || 0) - (a.ecartes || 0))
  const meilleure = src.grille?.meilleure || {}
  const enTete = (src.regles || []).filter((r) => r.deux >= (src.code || 0)).slice(0, 6)
  const gainChoix = (L.oracle || 0) - (L.code || 0)
  const perteLoo = (src.code || 0) - (src.loo || 0)

  /* une carte de chiffre — même peau pour les trois */
  const carte = (titre, valeur, sous, texte, couleur) => (
    <div style={{ background: sk.carte, border: '1px solid ' + sk.bord, borderTop: '3px solid ' + couleur, borderRadius: sk.box.borderRadius, padding: '12px 14px', boxShadow: sk.ombreD, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: .7, textTransform: 'uppercase', color: sk.muted }}>{titre}</div>
      <div style={{ fontFamily: sk.nb.td, fontSize: 31, fontWeight: 800, color: couleur, lineHeight: 1.05 }}>{valeur}</div>
      <div style={{ fontSize: 12, color: sk.texte, fontWeight: 700 }}>{sous}</div>
      <div style={{ fontSize: 11.5, color: sk.muted, lineHeight: 1.5 }}>{texte}</div>
    </div>
  )

  const puce = (titre, texte) => (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '5px 0' }}>
      <span style={{ flex: '0 0 auto', marginTop: 4, width: 7, height: 7, borderRadius: 999, background: sk.accent }} />
      <div style={{ fontSize: 12.5, color: sk.texte, lineHeight: 1.6 }}>
        <b>{titre}</b> {texte}
      </div>
    </div>
  )

  return (
    <div>
      <BarreFiltres sk={sk} toutLesP={toutLesP} setToutLesP={setToutLesP} discipline={discipline} setDiscipline={setDiscipline}
        noteP="P1-P5 ne coupe rien ici : cette mesure est par règle de choix, pas par case P." />

      {/* ① LA QUESTION — une phrase, pas un tableau */}
      <div style={{ background: sk.alt, border: '1px solid ' + sk.bord, borderLeft: '4px solid ' + sk.accent, borderRadius: sk.box.borderRadius, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: sk.texte, marginBottom: 4 }}>
          Peut-on mieux choisir les chevaux dans chaque bloc ?
        </div>
        <div style={{ fontSize: 13, color: sk.texte, lineHeight: 1.65 }}>
          C’est la seule question de cet onglet. On rejoue <b>{src.n} Quintés</b>
          {discipline && discipline !== 'all' ? <> de <b>{DISC_LABEL[discipline]}</b></> : null} et on essaie
          toutes les façons de choisir <b>qui entre dans G1 et dans G2</b> — sans jamais toucher aux quotas
          (<b>{QUOTAS_TXT}</b> = <b>{NB_TICKET} chevaux</b>).
          <br />
          <span style={{ color: sk.muted }}>
            Ce qui est compté s’appelle <b style={{ color: sk.accent }}>PAYANTE</b> : les <b>3 premiers de la course</b> sont
            tous dans le ticket, dans n’importe quel ordre. Un taux plus haut = un meilleur choix.
          </span>
        </div>
        {src.n < 30 ? (
          <div style={{ marginTop: 6, fontSize: 12, color: '#fbbf24', fontWeight: 700 }}>
            ⚠ Seulement {src.n} courses dans cette discipline : les écarts de quelques points sont à lire avec prudence.
          </div>
        ) : null}
      </div>

      {/* ② TROIS CHIFFRES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 12 }}>
        {carte(
          'Le moteur aujourd’hui',
          pc(src.code),
          'les 3 premiers sont dans le ticket',
          'C’est ce que fait le moteur en production, avec la presse.',
          sk.accent
        )}
        {carte(
          'Le choix parfait',
          pc(L.oracle),
          'le maximum possible',
          <>Le plafond : si on prenait les bons chevaux dans G1 et G2 à chaque course ({plus(gainChoix)} pts).</>,
          '#34d399'
        )}
        {carte(
          'La meilleure règle testée',
          pc(src.loo),
          'hors échantillon',
          <>{perteLoo > 0
            ? `Jugée sur les autres courses : ${nb(perteLoo)} pts de moins que le moteur. C’est du bruit.`
            : 'Jugée sur les autres courses : pas mieux que le moteur. C’est du bruit.'}</>,
          '#fb7185'
        )}
      </div>

      {/* ③ CE QUE ÇA VEUT DIRE */}
      <div style={{ ...sk.box, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .6, textTransform: 'uppercase', color: sk.accent, marginBottom: 2 }}>
          Ce que ça veut dire
        </div>
        {puce(
          `Le moteur n’est pas améliorable par une règle.`,
          `${(src.regles || []).length} règles ont été testées une par une (forme, distance, piste, niveau, terrain, corde, cote).
           La meilleure, choisie sur les ${src.n} courses, est jugée sur les autres courses : ${pc(src.loo)}
           ${perteLoo > 0 ? `contre ${pc(src.code)} pour le moteur — l’écart ne tient pas.` : `, soit exactement le moteur — rien à gagner.`}`
        )}
        {puce(
          `La marge existe, mais elle est théorique.`,
          `Entre le moteur (${pc(src.code)}) et le choix parfait (${pc(L.oracle)}), il y a ${plus(gainChoix)} pts.
           Ce n’est pas une règle à trouver : c’est la limite de la méthode avec ${NB_TICKET} chevaux.`
        )}
        {puce(
          `Donc on ne touche à rien.`,
          `Le ticket reste celui du moteur. Cet onglet sert à le prouver, pas à proposer une autre sélection.`
        )}
      </div>

      {/* ④ OÙ SE PERD LE PODIUM */}
      <div style={{ fontSize: 12, fontWeight: 800, color: sk.accent, letterSpacing: .6, textTransform: 'uppercase', margin: '4px 0 6px' }}>
        Où se perdent les 3 premiers
      </div>
      <div style={{ fontSize: 12.5, color: sk.muted, lineHeight: 1.6, marginBottom: 8 }}>
        Un cheval du top-3 peut être <b>gardé</b> dans le ticket, ou <b>laissé dehors</b> parce que son bloc avait déjà
        son compte de places. On regarde donc de quel bloc viennent les chevaux perdus.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...sk.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13, overflow: 'hidden', boxShadow: sk.ombreD }}>
          <thead>
            <tr style={sk.hdrStyle}>
              {['bloc', 'chevaux du top-3 venus de ce bloc', 'gardés', 'laissés dehors', '% gardés'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
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
      <div style={{ fontSize: 12.5, color: sk.texte, marginTop: 8, lineHeight: 1.6 }}>
        Sur les <b>{D.totalEcartes}</b> chevaux du top-3 laissés dehors, <b>{nb(D.partG1G2)} %</b> le sont dans
        <b> G1 ou G2</b>. Le trou est bien là — et pas dans la queue du carnet.
      </div>

      {/* ⑤ LE RESTE, DERRIÈRE UN BOUTON */}
      <button onClick={() => setDetails((v) => !v)}
        style={{ marginTop: 16, padding: '7px 14px', borderRadius: 999, border: '1px solid ' + sk.bord, background: details ? sk.accent : 'transparent', color: details ? '#1a0408' : sk.accent, cursor: 'pointer', fontSize: 12.5, fontWeight: 800 }}>
        {details ? '▾ Masquer les détails techniques' : '▸ Détails techniques — les 5 tableaux de la mesure'}
      </button>

      {details && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: sk.muted, lineHeight: 1.6, marginBottom: 12 }}>
            <b>{src.n} Quintés à presse réelle</b>
            {discipline && discipline !== 'all' ? <span> · <b>{DISC_LABEL[discipline]}</b></span> : null}
            {' '}· cotes {src.cotes === 'ouverture' ? 'du matin (ouverture)' : 'finales (Equidia)'}
            {src.carriere ? ' · carrière collectée (casacourses + PMU)' : ' · sans carrière'}.
            {src.couverture ? (
              <>
                {' '}Couverture PMU : terrain {Math.round((100 * src.couverture.terrain) / src.couverture.tot)} % ·
                sens {Math.round((100 * src.couverture.sens) / src.couverture.tot)} % ·
                VH passé {Math.round((100 * src.couverture.vhPasse) / src.couverture.tot)} % ·
                VH du jour {Math.round((100 * src.couverture.vhJour) / src.couverture.tot)} %
                ({src.couverture.tot} chevaux).
              </>
            ) : null}
            {' '}Quotas constitutionnels : <b>{QUOTAS_TXT}</b>, soit {NB_TICKET} chevaux — aucun autre quota n’existe
            dans le moteur, on ne mesure QUE qui entre dans chaque bloc.
          </div>

          {/* ② bis LE LEVIER */}
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
              et le <b>choix parfait</b> reste hors d’atteinte : c’est le plafond, pas une
              règle à trouver. Les quotas sont figés (<b>{QUOTAS_TXT}</b>) — le seul travail
              permis est de choisir QUI entre dans un bloc.
            </div>
          </div>

          {/* ③ bis LES RÈGLES */}
          <div style={{ fontSize: 12, fontWeight: 800, color: sk.accent, letterSpacing: .6, textTransform: 'uppercase', margin: '16px 0 6px' }}>
            ③ Chaque règle, seule — G1 puis G2 puis les deux ({(src.regles || []).length} règles)
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
            <table style={{ ...sk.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12.5, overflow: 'hidden' }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr style={sk.hdrStyle}>
                  {['règle de choix', 'G1', 'G2', 'les deux', 'top-3'].map((h) => <th key={h} style={sk.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(src.regles || []).map((r, i) => {
                  const gain = r.deux > (src.code || 0)
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
            Le <b>LOO</b> — la meilleure règle choisie sur les {src.n - 1} autres courses — vaut
            <b style={{ color: src.loo < src.code ? '#fb7185' : '#34d399' }}> {nb(src.loo)} %</b>
            {src.loo < src.code ? ' , soit SOUS le code : les différences sont du bruit.' : '.'}
          </div>

          {/* ④ bis LA GRILLE */}
          <div style={{ fontSize: 12, fontWeight: 800, color: sk.accent, letterSpacing: .6, textTransform: 'uppercase', margin: '16px 0 6px' }}>
            ④ La grille G1 × G2 — PAYANTE
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...sk.box, borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, overflow: 'hidden' }}>
              <thead>
                <tr style={sk.hdrStyle}>
                  <th style={sk.th}>G1 \ G2</th>
                  {src.grille.tete.map((m) => <th key={m} style={{ ...sk.th, fontFamily: sk.nb.th }}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {src.grille.lignes.map((l, i) => (
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
            <b> {nb(src.code)} %</b> pour le code. L’écart est de
            <b> {nb(Math.round(10 * ((meilleure.taux || 0) - src.code)) / 10)} pt</b>.
          </div>

          {/* ⑤ bis STABILITÉ */}
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
                {(src.stabilite || []).map((x, i) => (
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
            <b>Verdict.</b> {src.verdict}
            <br />
            <span style={{ color: sk.muted }}>
              Mesure écrite par <b>tools/choix-g1g2.mjs</b> (rejouer : <code>node tools\choix-g1g2.mjs</code>).
              La carrière vient de <b>tools/collect-forms.mjs</b> (<code>data/forms.json</code>),
              enrichie par <b>tools/collect-terrain.mjs</b> (<code>data/terrain.json</code>) et
              <b>tools/collect-vh.mjs</b> (<code>data/vh.json</code>) — terrain, sens et VH collectés de PMU (§14.6).
              La règle en production est <b>G1-G2 carnet · G3 échange fort · G4 marché ·
              G5 échange fort</b> (§11.52 : le carnet garde son ordre sauf si la cote du
              jour dit qu’un cheval du bloc est ≥ 2 fois plus court), sur les quotas
              <b> {QUOTAS_TXT}</b> ({NB_TICKET} chevaux, §11.49).
            </span>
          </div>
        </div>
      )}
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
function TabBassmat({ sk, B, H, detail, forme, BC, MOIS, discipline, setDiscipline, toutLesP, setToutLesP }) {
  const src = (discipline && discipline !== 'all' && B && B.parDiscipline && B.parDiscipline[discipline]) || B
  if (toutLesP == null) toutLesP = true
  if (!setToutLesP) setToutLesP = () => {}
  if (!src) return (
    <div style={{ fontSize: 13, color: sk.muted }}>
      Pas encore de mesure : écrire <b>public/data/bassmat.json</b> (node tools\bassmat.mjs).
    </div>
  )
  const nb = (x) => (x == null ? '—' : String(x).replace('.', ','))
  const pc = (x) => (x == null ? '—' : nb(x) + ' %')
  const caseDe = (p) => (src.cases || []).find((x) => x.p === p) || null
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
  const seau = (src.forme?.seaux || []).find((s) => s.cle === cle) || null
  const couleurForme = forme ? forme.couleur : sk.muted

  /* le classement des cases POUR CETTE FORME — c'est l'empreinte du jour */
  const classement = (src.cases || [])
    .filter((c) => c.n >= 20)
    .map((c) => ({ p: c.p, ...taux(c.p, cle), global: c }))
    .sort((a, b) => (b.pc5 - a.pc5) || (a.p - b.p))
  const top5 = classement.slice(0, 5)
  const top3 = classement.slice(0, 3)
  const podium = src.composition?.podium?.moyenne || {}
  const quinte = src.composition?.quinte?.moyenne || {}

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
  const decisions = (src.blocs || []).map((b) => {
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
      <BarreFiltres sk={sk} toutLesP={toutLesP} setToutLesP={setToutLesP} discipline={discipline} setDiscipline={setDiscipline} />
      {discipline && discipline !== 'all' && (
        <div style={{ fontSize: 11.5, color: sk.muted, marginBottom: 10, lineHeight: 1.5 }}>
          Le filtre change le <b>corpus de référence</b> (① à ⑧). La section ⓪ (ce mois) reste l’archive réelle.
        </div>
      )}}
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
                {' '}⚠ Les quotas ont changé en cours de mois (4-3-1-1-0 puis 3-3-1-1-0, 3-2-1-1-1 depuis le 28/10) : on ausculte <b>ce qui a été posé</b>, pas une seule règle. Depuis le 29/10/2026 le 3-2-1-1-1 est <b>constitutionnel</b> (§11.49) — il ne changera plus.
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
          <b>{src.n}</b> Quintés à presse réelle ({src.periode?.debut} → {src.periode?.fin}) · lus par <b>case du carnet</b> (P1..P20).
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
              {(src.forme?.seaux || []).map((s, i) => (
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
          {src.forme?.regle}
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
            <div>podium entier : <b style={{ color: '#34d399' }}>{pc(src.tient?.podium)}</b></div>
            <div>quinté entier : <b style={{ color: src.tient?.quinte >= 20 ? '#34d399' : '#fbbf24' }}>{pc(src.tient?.quinte)}</b></div>
            <div>arrivants par course : <b style={{ fontFamily: sk.nb.td }}>{nb(src.tient?.x5)}</b> / 5</div>
            <div style={{ fontSize: 11.5, color: sk.muted, marginTop: 4 }}>
              cases promises <b>{nb(src.calibrage?.sommeTaux)}</b> · vues <b>{nb(src.calibrage?.moyenneVue)}</b>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>
                {['P1..Pk', 'podium', 'quinté'].map((h) => <th key={h} style={{ padding: '3px 10px', textAlign: 'right', color: sk.muted, fontWeight: 800, fontSize: 11 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(src.courbe || []).map((c) => (
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
              <b> {pc((src.courbe || []).find((c) => c.k === 12)?.quinte)}</b> du temps — c’est la seule marge
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
        const variante = ticketBassmat(detail, src, cle)
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
        <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>{src.verdict}</div>
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
  /* ⭐ 08/11/2026 — LE SIÈGE PLAT. Le ticket de 8 est construit par le moteur,
   *   inchangé (3-2-1-1-1). En Plat seulement, on ajoute APRÈS coup le cheval
   *   que G1 coupe — le 4ᵉ cité par la presse. Mesuré : 8,9 % → 24,4 % de 5/5
   *   en Plat, témoin (un autre cheval de plus) = 0. Détail : src/lib/siege-plat.js
   *   ⚠ Course DÉJÀ COURUE → pas de siège : le ticket archivé est un constat. */
  const siege = useMemo(
    () => (courseFinie ? null : siegePlat(grille, discipline)),
    [grille, discipline, courseFinie],
  )
  const ticket = useMemo(() => {
    if (!rempli) return ticketManuel && ticketManuel.length ? ticketManuel : []
    const base = (ticketManuel && ticketManuel.length) ? ticketManuel : rempli.ticket
    /* ⚠ 16/10/2026 — un cheval qui ne PART pas ne peut pas être au ticket :
     *   `ticketAffiche` retire les numéros absents de la grille du jour et,
     *   la course encore ouverte, remplit la place dans le même groupe
     *   (quota §11.19). Course courue : constat, sans invention (§7). */
    const ordonne = ordonnerTicket(ticketAffiche(base, rempli, !courseFinie), grille)
    /* le 9ᵉ cheval va À LA FIN : il ne prend la place de personne, et il reste
     * visible comme le siège Plat — pas noyé dans le bloc sans ordre. */
    return siege ? avecSiegePlat(ordonne, grille, discipline) : ordonne
  }, [rempli, ticketManuel, grille, courseFinie, siege, discipline])

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
    /* le siège Plat entre dans le ticket FIGÉ aussi : ce qu'on archive doit
     * être ce qu'on joue (§13.3). Attelé / Haies : rien ne change. */
    return avecSiegePlat(rempli.ticket, grille, discipline)
  }, [rempli, ticketManuel, grille, discipline])

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
      let res = await chargerCourseCC(date, syn?.synthese || [])
      // ⭐ Repli turf-france pour les dates passées (casacourses n'a plus le programme)
      if (!res) {
        try {
          const off = offsetJour(date)
          const page = await chargerPageTqq(off, date)
          if (page && page.identite) {
            const r = page.identite.reunion
            const c = page.identite.course
            const det = await chargerDetailReu(date, r, c, 'FRANCE')
            if (det && det.arrivee && det.arrivee.length) {
              res = { arrivee: det.arrivee, cle: date + '_R' + r + '_C' + c, discipline: det.discipline, distance: det.distance, nbPartants: det.nbPartants, hippodrome: det.hippodrome, participants: det.participants }
            }
          }
        } catch (e2) { /* on garde le message standard ci-dessous */ }
      }
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
            {(() => {
              /* le siège Plat est affiché À PART : le ticket de 8 reste lisible
               * tel quel, et le 9ᵉ est étiqueté pour ce qu'il est. */
              const sans = siege ? ticket.filter((n) => n !== siege.num) : ticket
              return (
                <>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 3, marginTop: 8, color: '#fff', fontFamily: SK.nb.td }}>
                    {sans.length ? sans.join('  ·  ') : '—'}
                  </div>
                  {siege && (
                    <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 999, border: '2px solid #34d399', background: 'rgba(52,211,153,.14)' }}>
                      <b style={{ fontSize: 16, color: '#6ee7b7', fontFamily: SK.nb.td }}>+ {siege.num}</b>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.9)', fontFamily: SK.nb.td }}>
                        siège Plat · le 4ᵉ cité par la presse, hors quota
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontFamily: SK.nb.td }}>(P{siege.slot})</span>
                    </div>
                  )}
                  {sans.length > 1 && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 6, fontFamily: SK.nb.td }}>
                      <b>{sans[0]}</b> = la seule case qui prédit (27,1 % de victoires) ·
                      les {sans.length - 1} autres sont un <b>bloc sans ordre</b> — le Quinté se joue en désordre.
                    </div>
                  )}
                </>
              )
            })()}
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


      {/* --------------------------------------------------------- archive */}
      {onglet === 'archive' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button onClick={() => chercherResultat()} disabled={busyResultat} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.carte, color: SK.accent, cursor: busyResultat ? 'default' : 'pointer', fontFamily: SK.police }}>
              {busyResultat ? 'Lecture…' : 'Rafraîchir'}
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
          <BarreFiltres sk={SK} toutLesP={toutLesP} setToutLesP={setToutLesP} discipline={statsDiscipline} setDiscipline={setStatsDiscipline} disciplines={DISCIPLINES_TROT} />
          {statsDiscipline === 'attelé' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: SK.muted, fontWeight: 700 }}>Trot :</span>
              {[{ key: 'all', lib: 'Tout' }, { key: 'autostart', lib: 'Autostart' }, { key: 'volte', lib: 'Volté' }].map((o) => (
                <button key={o.key} onClick={() => setStatsTrot(o.key)}
                  style={{ padding: '3px 10px', borderRadius: 999, border: '1px solid ' + SK.bord, background: statsTrot === o.key ? SK.accentSombre : 'transparent', color: statsTrot === o.key ? '#fff' : SK.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  {o.lib}
                </button>
              ))}
              {departs && (
                <span style={{ fontSize: 11, color: SK.muted }}>
                  {archiveFiltree.length} course(s) retenue(s) · source : programme PMU
                </span>
              )}
            </div>
          )}
          {archiveFiltree.length === 0 && (
            <div style={{ marginBottom: 12, padding: '10px 12px', background: SK.alt, border: '1px solid ' + SK.bord, borderLeft: '4px solid #f59e0b', borderRadius: SK.box.borderRadius, fontSize: 12.5, color: SK.texte, lineHeight: 1.6 }}>
              Aucune course pour ce filtre. Cliquez sur <b>Tout</b> (discipline) ou <b>Tout</b> (Trot) pour revenir.
              <button onClick={() => { setStatsDiscipline('all'); setStatsTrot('all') }}
                style={{ marginLeft: 10, padding: '3px 10px', borderRadius: 999, border: '1px solid ' + SK.bord, background: SK.accent, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                ← Tout
              </button>
            </div>
          )}
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
                  /* ⚠ 08/11/2026 — le dénominateur doit être le MÊME que celui des
                   * statistiques affichées : `archiveFiltree` (discipline + trot),
                   * pas `archive` entière. Sinon, avec Plat sélectionné, le bandeau
                   * comparait 13 courses valides à 32 courses toutes disciplines
                   * (« Top3 8/32 » au lieu de 2/13). */
                  const closes = archiveFiltree.filter((a) => (a.arrivee || []).length > 0 && ticketValide(a).length > 0)
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
                <BarreFiltres sk={SK} toutLesP={toutLesP} setToutLesP={setToutLesP} discipline={statsDiscipline} setDiscipline={setStatsDiscipline} disciplines={DISCIPLINES_TROT} />
                {statsDiscipline === 'attelé' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: SK.muted, fontWeight: 700 }}>Trot :</span>
                    {[{ key: 'all', lib: 'Tout' }, { key: 'autostart', lib: 'Autostart' }, { key: 'volte', lib: 'Volté' }].map((o) => (
                      <button key={o.key} onClick={() => setStatsTrot(o.key)}
                        style={{ padding: '3px 10px', borderRadius: 999, border: '1px solid ' + SK.bord, background: statsTrot === o.key ? SK.accentSombre : 'transparent', color: statsTrot === o.key ? '#fff' : SK.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                        {o.lib}
                      </button>
                    ))}
                    {departs && (
                      <span style={{ fontSize: 11, color: SK.muted }}>
                        {archiveFiltree.length} course(s) retenue(s) · source : programme PMU
                      </span>
                    )}
                  </div>
                )}
                {archiveFiltree.length === 0 && (
                  <div style={{ marginBottom: 12, padding: '10px 12px', background: SK.alt, border: '1px solid ' + SK.bord, borderLeft: '4px solid #f59e0b', borderRadius: SK.box.borderRadius, fontSize: 12.5, color: SK.texte, lineHeight: 1.6 }}>
                    Aucune course pour ce filtre. Cliquez sur <b>Tout</b> (discipline) ou <b>Tout</b> (Trot) pour revenir.
                    <button onClick={() => { setStatsDiscipline('all'); setStatsTrot('all') }}
                      style={{ marginLeft: 10, padding: '3px 10px', borderRadius: 999, border: '1px solid ' + SK.bord, background: SK.accent, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      ← Tout
                    </button>
                  </div>
                )}
              </div>
              {/* ⭐ 08/11/2026 — UN SEUL TABLEAU, LISIBLE (demande de l'utilisateur :
                  « les deux tableaux sont semblables et pas clairs »).
                  Les deux anciens disaient la MÊME chose deux fois :
                  · « Place »      : n_top5, victoires, podiums, 1er..5e, P(podium|top5), P(top5|N)
                  · « Indicateur » : courses_valides, n_top5, victoires, podiums,
                                     P(victoire|top5), P(victoire|N), P(podium|top5), P(top5|N)
                  Ici : UNE ligne par case P, chaque taux avec sa barre, et la
                  répartition 1er→5e en UNE barre empilée. Les dénominateurs sont
                  écrits dans l'en-tête et dans la légende, une seule fois. */}
              {(() => {
                const L = stats.parPlace.slice(0, toutLesP ? 20 : 5)
                const N = (L[0] && L[0].courses_valides) || stats.nb || 0
                const COUL = ['#34d399', '#22d3ee', '#a78bfa', '#fbbf24', '#fb7185']
                const NOM = ['1er', '2e', '3e', '4e', '5e']
                const barre = (v, coul) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 54, height: 7, borderRadius: 999, background: 'rgba(255,255,255,.13)', overflow: 'hidden' }}>
                      <div style={{ width: Math.max(0, Math.min(100, v == null ? 0 : v)) + '%', height: '100%', background: coul, borderRadius: 999 }} />
                    </div>
                    <b style={{ fontSize: 12, minWidth: 40, textAlign: 'right', color: coul }}>{v == null ? '—' : v + ' %'}</b>
                  </div>
                )
                return (
                  <div style={{ ...s.box, padding: 14, boxShadow: SK.ombreD }}>
                    <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>
                      Ce que chaque case P a donné
                    </b>
                    <div style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 10px' }}>
                      <b>{N}</b> course(s) valides · une ligne par case · toutes les barres sont sur 100 %.
                      {' '}<b>P(top5 | N)</b> se lit sur les {N} courses ; <b>podium</b> et <b>victoire</b> se lisent
                      parmi les fois où la case finit dans les 5.
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, width: '100%', minWidth: 780, overflow: 'hidden', border: '1px solid ' + SK.bord, borderRadius: 8 }}>
                        <thead>
                          <tr style={s.hdr}>
                            <th style={{ ...s.th, textAlign: 'left' }}>Case</th>
                            <th style={{ ...s.th, textAlign: 'left' }}>arrive dans les 5<br /><span style={{ fontWeight: 400, opacity: .75 }}>n / {N} courses</span></th>
                            <th style={{ ...s.th, textAlign: 'left' }}>P(top5 | N)</th>
                            <th style={{ ...s.th, textAlign: 'left' }}>podiums<br /><span style={{ fontWeight: 400, opacity: .75 }}>P(podium | top5)</span></th>
                            <th style={{ ...s.th, textAlign: 'left' }}>victoires<br /><span style={{ fontWeight: 400, opacity: .75 }}>P(victoire | top5)</span></th>
                            <th style={{ ...s.th, textAlign: 'left', minWidth: 170 }}>où il finit<br /><span style={{ fontWeight: 400, opacity: .75 }}>1er → 5e, sur ses top-5</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {L.map((r, i) => (
                            <tr key={r.place} style={{ borderBottom: '1px solid rgba(255,255,255,.07)', background: i % 2 ? SK.alt : SK.ligne }}>
                              <td style={{ ...s.td, fontWeight: 800, color: r.n ? SK.accent : '#4a5a72', whiteSpace: 'nowrap' }}>P{r.place}</td>
                              <td style={{ ...s.td, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.n_top5} / {N}</td>
                              <td style={s.td}>{barre(r.n ? r.p_top5_global : null, SK.accent)}</td>
                              <td style={s.td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 11.5, color: '#a4b8d6', minWidth: 14, fontWeight: 700 }}>{r.podiums}</span>
                                  {barre(r.n ? r.p_podium_conditionnel : null, '#34d399')}
                                </div>
                              </td>
                              <td style={s.td}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 11.5, color: '#a4b8d6', minWidth: 14, fontWeight: 700 }}>{r.victoires}</span>
                                  {barre(r.n ? r.p_victoire_conditionnel : null, '#fbbf24')}
                                </div>
                              </td>
                              <td style={s.td}>
                                {r.n ? (
                                  <div
                                    title={NOM.map((n, k) => `${n} : ${r.p[k]} %`).join(' · ')}
                                    style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', minWidth: 150, background: 'rgba(255,255,255,.10)' }}
                                  >
                                    {r.p.map((v, k) => (v > 0 ? <div key={k} style={{ width: v + '%', background: COUL[k] }} /> : null))}
                                  </div>
                                ) : <span style={{ color: '#4a5a72' }}>—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 9, fontSize: 11, color: '#7a8ea9', alignItems: 'center' }}>
                      <span>où il finit :</span>
                      {NOM.map((n, k) => (
                        <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: COUL[k], display: 'inline-block' }} />{n}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                      Les deux dénominateurs, écrits une fois : <b>N = {N}</b> (les courses) pour <b>P(top5 | N)</b> ·
                      {' '}<b>n_top5</b> (les fois où la case finit dans les 5) pour <b>P(podium | top5)</b>,
                      {' '}<b>P(victoire | top5)</b> et la répartition 1er→5e.
                    </div>
                  </div>
                )
              })()}


              {/* ⭐ QUINTÉ COMBINAISONS — les combinaisons de P qui forment le top 5 */}
              <div style={{ ...s.box, padding: 14, marginTop: 16, boxShadow: SK.ombreD }}>
                <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>Quinté — combinaisons de positions P (les 5 premiers)</b>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, marginBottom: 10 }}>
                  Les combinaisons de positions P qui ont formé le Quinté (1er, 2e, 3e, 4e, 5e) dans l'archive.
                  {stats.quinteList && stats.quinteList.length > 0 && (
                    <span> · {stats.quinteList.length} combinaison(s) distincte(s) sur {stats.nb} courses.</span>
                  )}
                </div>
                {stats.quinteList && stats.quinteList.length > 0 ? (
                  <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto' }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, overflow: 'hidden', border: '1px solid ' + SK.bord, borderRadius: 8 }}>
                      <thead>
                        <tr style={s.hdr}>
                          <th style={s.th}>#</th>
                          <th style={s.th}>Date</th>
                          <th style={s.th}>Combinaison (5 P)</th>
                          <th style={s.th}>Occurrences</th>
                          <th style={s.th}>Fréquence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.quinteList.map((t, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.07)', background: i % 2 ? SK.alt : SK.ligne }}>
                            <td style={{ ...s.td, fontWeight: 700 }}>{i + 1}</td>
                            <td style={{ ...s.td, fontSize: 10.5, color: '#7a8ea9', whiteSpace: 'nowrap' }}>
                              {Array.isArray(t.dates) && t.dates.length ? t.dates.join(', ') : '—'}
                            </td>
                            <td style={{ ...s.td, fontWeight: t.count > 1 ? 800 : 600, color: t.count > 1 ? SK.accent : SK.texte }}>
                              {t.combo.map((p) => 'P' + p).join(' · ')}
                            </td>
                            <td style={{ ...s.td, fontWeight: 700 }}>{t.count}</td>
                            <td style={{ ...s.td }}>
                              {stats.nb > 0 ? Math.round(t.count / stats.nb * 100) + '%' : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#7a8ea9' }}>Pas encore de données Quinté.</div>
                )}
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
        <TabEcarts sk={SK} ecarts={ecarts} detail={detail}
          toutLesP={toutLesP} setToutLesP={setToutLesP}
          discipline={statsDiscipline} setDiscipline={setStatsDiscipline} />
      )}

    </div>
    </>
  )
}