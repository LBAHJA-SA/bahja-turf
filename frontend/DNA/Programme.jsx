/* ── LE PROGRAMME ─────────────────────────────────────────────────────────
 *  Le panneau de gauche de la page « Analyse course » de bahja-TURF, repris
 *  à l'identique : l'en-tête « LE PROGRAMME · n réunions · n courses », une
 *  boîte par réunion (R1, le drapeau, le nom, la pastille Q+, « 8 courses ·
 *  1er à 18:23 », le chevron), et une ligne par course (C1, l'heure GMT, la
 *  discipline et la distance) avec les rubans des paris dessous.
 *
 *  Les styles sont copiés de `frontend/ANALYSE/Analyse.jsx` (objet SK, blocs
 *  réunion / course). Les pastilles sont `src/Paris.jsx`, les drapeaux
 *  `src/Drapeau.jsx` (de vraies images : Windows ne dessine pas les emoji).
 *
 *  Les données, elles, viennent du serveur de la copie (/api/programme) :
 *  réunion et numéro de course réels du PMU, cotes lues sur le même appel.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useRef, useState } from 'react'
import ParisListe from '../../src/Paris.jsx'
import Drapeau from '../../src/Drapeau.jsx'
import { useNow } from '../../src/lib/raceStatus.jsx'

const SK = {
  accent: '#22d3ee', accentSombre: '#0b3b4d', accentClair: 'rgba(34,211,238,.14)',
  accentTexte: '#67e8f9',
  entete: 'linear-gradient(120deg,#06131f 0%,#0b3b4d 55%,#0e7490 100%)',
  bord: 'rgba(34,211,238,.35)', carte: 'rgba(12,20,37,.72)', ligne: 'rgba(125,205,255,.16)',
  texte: '#e7f1ff', doux: '#a4b8d6', muet: '#6d82a2',
  police: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: 'ui-monospace, Consolas, monospace',
}
const ROUGE = '#fb7185'

/* ⚠ 23/10/2026 — les pastilles arrivent DÉJÀ traduites. Dans l'application
 * autonome le serveur rendait les codes du PMU (`QUINTE_PLUS`, `TIERCE`…) et
 * cette table les convertissait. Ici c'est `backend/ANALYSE/paris.js` qui les
 * donne, sous leur clé de catalogue (`quinte`, `tierce`, `simple-gagnant`…) :
 * la course porte donc directement `types_pari`. On ne retraduit pas — une
 * double traduction rendait les rubans vides. */
const parisDe = (course) => (Array.isArray(course?.types_pari) ? course.types_pari : [])

const PAYS_FR = {
  FR: '', BE: 'Belgique', GB: 'Royaume-Uni', DE: 'Allemagne', ES: 'Espagne',
  IT: 'Italie', NL: 'Pays-Bas', CH: 'Suisse', SE: 'Suède', DK: 'Danemark',
  IE: 'Irlande', AT: 'Autriche', US: 'États-Unis', MA: 'Maroc', AR: 'Argentine',
  UY: 'Uruguay', CL: 'Chili', AU: 'Australie', HK: 'Hong Kong', JP: 'Japon',
  KR: 'Corée', ZA: 'Afrique du Sud', CA: 'Canada', BR: 'Brésil', TR: 'Turquie',
}
const paysLisible = (code) => PAYS_FR[String(code || '').toUpperCase()] ?? ''

/** « ATTELE » → « Attelé », « PLAT » → « Plat » (comme sur la feuille de course) */
const DISCIPLINE = {
  ATTELE: 'Attelé', MONTE: 'Monté', PLAT: 'Plat', TROT: 'Trot',
  HAIE: 'Haies', HAIES: 'Haies', STEEPLE: 'Steeple', CROSS: 'Cross',
  TROT_ATTELE: 'Attelé', TROT_MONTE: 'Monté', OBSTACLE: 'Obstacle',
}
const jolieDiscipline = (d) => DISCIPLINE[String(d || '').toUpperCase()] || String(d || '')

/** « HIPPODROME DE PARIS-VINCENNES » → « Paris-Vincennes » */
function joliHippo(brut, pays) {
  let s = String(brut || '')
    .replace(/^HIPPODROME\s+(DE\s+|D'|DU\s+|DES\s+)/i, '')
    .replace(/^HIPPODROME\s+/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const p = paysLisible(pays)
  if (p && s.toUpperCase().endsWith(p.toUpperCase())) s = s.slice(0, -p.length).trim()
  return s.toLowerCase().replace(/(^|[\s-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase())
}

const hhmm = (tz) => new Intl.DateTimeFormat('fr-FR', {
  timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
})
const PARIS = hhmm('Europe/Paris')
const GMT = hhmm('UTC')
const heureGmt = (ms) => (ms ? GMT.format(ms) : '')
/** L'heure du « 1er à … » : celle du pays de la réunion, pas celle de Paris.
 *
 *  ⚠ MAROC — `heureMa` (le « 12:03 » écrit par la SOREC) passe AVANT tout
 *  calcul : la base de fuseaux du navigateur peut ignorer que le Maroc est à
 *  UTC+1 depuis 2018 (mesuré le 25/10/2026 : Chrome affichait 11:03 là où la
 *  SOREC écrit 12:03). Sans ce champ (vieux fichier), on retombe sur UTC+1 —
 *  jamais sur `Africa/Casablanca`. */
const heureLocale = (ms, pays, heureMa) => {
  const ma = String(pays || '').toUpperCase() === 'MA'
  if (ma) {
    if (heureMa) return heureMa
    return ms ? GMT.format(ms + 3600e3) : ''
  }
  if (!ms) return ''
  return PARIS.format(ms)
}

/* ⭐ « LA COURSE QUI PART DANS 5 MINUTES DOIT SE VOIR » (25/10/2026)
 *
 *  Demande de l'utilisateur : « بغيت الكورسة الى باقي ليها خمس دقايق على
 *  الانطلاقة تبان فالبطاقة واضحة ».
 *
 *  Trois endroits, parce que la carte d'une réunion peut être REPLIÉE — une
 *  course imminente dans une carte fermée ne se verrait pas :
 *
 *    ① une bande rouge en haut du programme : « DÉPART DANS 3:12 · R2 Nantes C4 »
 *    ② la carte de la réunion : bordure qui bat + pastille du décompte, même
 *       repliée (et elle s'ouvre toute seule la première fois)
 *    ③ la ligne de la course : fond rouge, bordure 2 px, décompte à la seconde
 *
 *  Le décompte bat à la SECONDE (et non aux 30 s du reste de la page) : à
 *  « D-4 min » près, on ne sait pas si on a le temps de jouer.
 */
const SEUIL = 5 * 60000        // la fenêtre « urgente » : 5 minutes
const APRES = 12 * 60000       // une course reste « partie » 12 min

/** 215 000 ms → « 3:35 » */
const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** 215 000 ms → « 3:35 » · 3 750 000 ms → « 1:02:30 »
 *
 *  ⚠ La bande ne se limite plus aux 5 minutes : la prochaine course peut être
 *  dans deux heures. `mmss` afficherait « 125:00 », ce qui ne veut rien dire. */
const duree = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  if (!h) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  return `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const ROSE = '#fb7185'
const ROSE_CLAIR = '#fecdd3'
const CYAN = '#22d3ee'
const CYAN_CLAIR = '#67e8f9'
const AMBRE = '#fbbf24'
const AMBRE_CLAIR = '#fde68a'

/**
 * LA PROCHAINE COURSE — la plus proche du départ, SANS PLAFOND.
 *
 * ⭐ 25/10/2026. Demande de l'utilisateur : « هادي بدلها عوض خمس دقايق تبان
 *   الكورسة القادمة » — la bande ne doit pas rester vide entre deux courses.
 *
 *   Avant : elle n'apparaissait que dans les 5 minutes (`plusProche`), donc
 *   à 17 h 30, sans course imminente, il n'y avait RIEN en haut du programme.
 *   Maintenant : elle montre toujours la course suivante — rouge et battante
 *   à moins de 5 min, calme (cyan) au-delà, avec le décompte complet
 *   (« 1:02:30 ») puisqu'une course peut être dans deux heures.
 *
 *   `null` seulement quand il n'y a plus rien à partir (journée finie, ou
 *   archive d'un jour passé).
 */
function prochaineCourse(meetings, now) {
  let best = null
  for (const m of meetings) {
    for (const c of m.courses || []) {
      if (c.time == null) continue
      const reste = c.time - now
      if (reste <= 0) continue
      if (!best || reste < best.reste) best = { m, c, reste }
    }
  }
  return best
}

export default function Programme({ date, setDate, meetings, loading, onCharger, sel, onPick, demain, onAllerDate }) {
  const [ouverte, setOuverte] = useState(null)

  /* le décompte bat à la seconde : « 4:07 » doit vouloir dire 4 min 07 s */
  const now = useNow(1000)
  /* ⭐ la bande montre TOUJOURS la course suivante ; `pressee` n'est que le
     cas « elle part dans moins de 5 min » (rouge + battement + ouverture). */
  const prochaine = useMemo(() => prochaineCourse(meetings, now), [meetings, now])
  const pressee = prochaine && prochaine.reste <= SEUIL ? prochaine : null

  /* ⭐ 25/10/2026 — LA JOURNÉE EST FINIE, MAIS LA BANDE RESTE.
   *
   *   À 23 h 40 toutes les courses du jour sont parties : `prochaine` vaut
   *   `null` et le haut du programme redevient vide — ce que l'utilisateur a
   *   lu comme « les changements n'apparaissent pas sur Vercel ». La première
   *   course de DEMAIN prend alors la place, en ambre, avec un clic qui
   *   charge la journée du lendemain. */
  const demainProchaine = useMemo(
    () => (demain?.meetings?.length ? prochaineCourse(demain.meetings, now) : null),
    [demain, now],
  )

  const compteurs = useMemo(() => {
    let courses = 0
    for (const m of meetings) courses += (m.courses || []).length
    return { reunions: meetings.length, courses }
  }, [meetings])

  /* ⭐ 27/10/2026 — LE MAROC MANQUE-T-IL ? (voir le bandeau plus bas)
   *   La question ne se pose que pour la journée du jour : une date passée est
   *   servie par l'archive `maroc-jours.json`, qui ne bougera plus. */
  const marocAbsent = useMemo(() => {
    if (!meetings.length) return false
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const aujourdhui = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    if (String(date) !== aujourdhui) return false
    return !meetings.some((m) => String(m.country || '').toUpperCase() === 'MA' || Number(m.num) >= 100)
  }, [date, meetings])

  /** « 14:00 » — la prochaine heure pile (celle du rafraîchissement). */
  const heureRelance = useMemo(() => {
    const d = new Date(now)
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() + 1)
    return `${String(d.getHours()).padStart(2, '0')}:00`
  }, [now])

  /* on ouvre d'office la réunion qui porte le Quinté — sinon la première.
     ⭐ mais si une course part dans moins de 5 min, c'est ELLE qu'on ouvre.
     (Seulement dans les 5 min : ouvrir d'office à chaque changement de
     « prochaine course » ferait sauter la carte toutes les demi-heures.) */
  useEffect(() => {
    if (!meetings.length) { setOuverte(null); return }
    const p = prochaineCourse(meetings, Date.now())
    if (p && p.reste <= SEUIL) { setOuverte(p.m.num); return }
    const avecQuinte = meetings.find((m) => (m.courses || []).some((c) => c.quinte))
    setOuverte((avecQuinte || meetings[0]).num)
  }, [meetings])

  /* ⭐ une course à moins de 5 min maintient SA réunion ouverte. Le seul moyen
   *   de la refermer est de cliquer sur son en-tête — et alors on la laisse
   *   fermée (`fermePar`), sinon on se battrait avec l'utilisateur chaque
   *   seconde que dure le décompte. */
  const fermePar = useRef(new Set())
  useEffect(() => {
    if (!pressee) return
    if (fermePar.current.has(pressee.m.num)) return
    setOuverte((o) => (o === pressee.m.num ? o : pressee.m.num))
  }, [pressee])

  const basculer = (m) => {
    if (ouverte === m.num) { fermePar.current.add(m.num); setOuverte(null) }
    else { fermePar.current.delete(m.num); setOuverte(m.num) }
  }

  return (
    <div style={{
      background: SK.carte, border: '1px solid ' + SK.bord, borderRadius: 14, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 18px 44px rgba(0,0,0,.45), 0 0 30px rgba(34,211,238,.10)',
    }}>
      <div style={{
        padding: '9px 12px', background: SK.entete, color: '#fff',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
      }}>
        <b style={{ fontSize: 12.5, letterSpacing: 0.6 }}>LE PROGRAMME</b>
        <span style={{ fontSize: 11, opacity: 0.92 }}>
          {loading ? '…' : `${compteurs.reunions} réunion${compteurs.reunions > 1 ? 's' : ''} · ${compteurs.courses} course${compteurs.courses > 1 ? 's' : ''}`}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px 0' }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid ' + SK.ligne, background: 'rgba(255,255,255,.04)', color: SK.texte, fontFamily: SK.police, fontSize: 12 }} />
        <button onClick={onCharger} disabled={loading}
          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.accentClair, color: SK.accentTexte, fontWeight: 800, fontSize: 11.5, cursor: 'pointer' }}>
          {loading ? '…' : 'Charger'}
        </button>
      </div>

      {/* ⭐ 27/10/2026 — « LA RÉUNION DU MAROC N'EST PAS ENCORE LÀ ».
          Le bandeau dit POURQUOI elle manque et QUAND la page redemandera :
          le job du poste tourne à l'heure pile, et la page se rafraîchit
          elle-même à la même heure tant que la réunion n'apparaît pas. */}
      {marocAbsent && (
        <div style={{
          margin: '8px 10px 0', padding: '6px 9px', borderRadius: 8, lineHeight: 1.45,
          border: '1px solid rgba(251,191,36,.38)', background: 'rgba(251,191,36,.10)', color: '#fde68a', fontSize: 11,
        }}>
          Réunion du Maroc pas encore publiée par la SOREC — nouvel essai à <b>{heureRelance}</b>,
          puis à chaque heure pile jusqu'à ce qu'elle apparaisse.
        </div>
      )}

      {/* ⭐ ① LA BANDE — TOUJOURS la prochaine course, même si sa réunion est
          repliée plus bas. Un clic l'ouvre.
          ⭐ 25/10/2026 : elle ne dépend plus des 5 minutes. À moins de 5 min
          elle est rouge et bat ; au-delà elle est calme et affiche le
          décompte complet (« 1:02:30 »). */}
      {prochaine && (
        <button
          onClick={() => { fermePar.current.delete(prochaine.m.num); setOuverte(prochaine.m.num) }}
          title={pressee ? 'Ouvrir la réunion de cette course' : 'Ouvrir la réunion de la prochaine course'}
          style={{
            margin: '8px 10px 0', padding: '7px 10px', borderRadius: 9, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            border: (pressee ? '2px solid ' + ROSE : '1px solid rgba(34,211,238,.45)'),
            background: pressee
              ? 'linear-gradient(90deg, rgba(244,63,94,.34), rgba(251,146,60,.16))'
              : 'linear-gradient(90deg, rgba(34,211,238,.18), rgba(34,211,238,.05))',
            color: pressee ? '#fff' : '#d8f3fb', fontFamily: SK.police, textAlign: 'left',
            animation: pressee ? 'dna-imminent 1.3s ease-in-out infinite' : 'none',
          }}>
          <span style={{
            width: 9, height: 9, borderRadius: 99, flex: '0 0 auto',
            background: pressee ? ROSE_CLAIR : CYAN_CLAIR,
            boxShadow: '0 0 10px ' + (pressee ? ROSE : CYAN),
            animation: pressee ? 'dna-dot 1s ease-in-out infinite' : 'none',
          }} />
          <b style={{ fontSize: 11.5, letterSpacing: .5, color: pressee ? '#fff' : CYAN_CLAIR }}>
            {pressee ? 'DÉPART DANS' : 'PROCHAINE COURSE · DANS'}
          </b>
          <b style={{
            fontFamily: SK.mono, fontSize: pressee ? 19 : 15, fontWeight: 900, lineHeight: 1,
            color: pressee ? ROSE_CLAIR : CYAN_CLAIR,
          }}>
            {duree(prochaine.reste)}
          </b>
          <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {prochaine.m.num >= 100 ? 'MA' : 'R' + prochaine.m.num} {joliHippo(prochaine.m.hippodrome, prochaine.m.country)} · C{prochaine.c.num}
            {prochaine.c.distance ? ` · ${prochaine.c.distance} m` : ''}
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
            color: pressee ? ROSE_CLAIR : CYAN_CLAIR,
          }}>
            {heureLocale(prochaine.c.time, prochaine.m.country, prochaine.c.heure)} ↗
          </span>
        </button>
      )}

      {/* ⭐ 25/10/2026 — plus rien ne part aujourd'hui : on montre la première
          course de DEMAIN (ambre). Un clic charge la journée du lendemain —
          sinon la page paraît vide et l'on croit que rien n'a changé. */}
      {!prochaine && demainProchaine && (
        <button
          onClick={() => onAllerDate && onAllerDate(demain.date)}
          title={`Charger le programme du ${demain.date}`}
          style={{
            margin: '8px 10px 0', padding: '7px 10px', borderRadius: 9, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            border: '1px solid rgba(251,191,36,.45)',
            background: 'linear-gradient(90deg, rgba(251,191,36,.20), rgba(251,191,36,.05))',
            color: '#fdf3d6', fontFamily: SK.police, textAlign: 'left',
          }}>
          <span style={{
            width: 9, height: 9, borderRadius: 99, flex: '0 0 auto',
            background: AMBRE_CLAIR, boxShadow: '0 0 10px ' + AMBRE,
          }} />
          <b style={{ fontSize: 11.5, letterSpacing: .5, color: AMBRE_CLAIR }}>DEMAIN · DANS</b>
          <b style={{ fontFamily: SK.mono, fontSize: 15, fontWeight: 900, lineHeight: 1, color: AMBRE_CLAIR }}>
            {duree(demainProchaine.reste)}
          </b>
          <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {demainProchaine.m.num >= 100 ? 'MA' : 'R' + demainProchaine.m.num} {joliHippo(demainProchaine.m.hippodrome, demainProchaine.m.country)} · C{demainProchaine.c.num}
            {demainProchaine.c.distance ? ` · ${demainProchaine.c.distance} m` : ''}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', color: AMBRE_CLAIR }}>
            {heureLocale(demainProchaine.c.time, demainProchaine.m.country, demainProchaine.c.heure)} ↗
          </span>
        </button>
      )}

      <div style={{ padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
        {loading && <div style={{ padding: 12, fontSize: 13, color: SK.muet }}>Lecture du programme…</div>}
        {!loading && !meetings.length && <div style={{ padding: 12, fontSize: 13, color: SK.muet }}>Rien à afficher.</div>}

        {meetings.map((m) => {
          const ouvre = ouverte === m.num
          const aLeQuinte = (m.courses || []).some((c) => c.quinte)
          const premier = (m.courses || []).filter((c) => c.time).sort((a, b) => a.time - b.time)[0] || null
          /* ② la réunion porte-t-elle une course à moins de 5 min ? */
          const presse = (m.courses || []).find((c) => c.time != null && c.time - now > 0 && c.time - now <= SEUIL) || null
          return (
            <div key={m.num} style={{
              flex: '1 1 320px', maxWidth: 430, borderRadius: 11, overflow: 'hidden',
              border: presse ? '2px solid ' + ROSE : '1px solid ' + (ouvre ? SK.accent : SK.ligne),
              background: presse
                ? 'linear-gradient(180deg, rgba(244,63,94,.22), rgba(244,63,94,.06))'
                : ouvre ? 'rgba(34,211,238,.12)' : 'rgba(255,255,255,.03)',
              boxShadow: presse
                ? '0 0 0 1px rgba(251,113,133,.35), 0 0 26px rgba(244,63,94,.30)'
                : ouvre ? '0 0 22px rgba(34,211,238,.22)' : 'none',
              transition: 'box-shadow .15s, border-color .15s',
              animation: presse ? 'dna-imminent 1.3s ease-in-out infinite' : 'none',
            }}>
              <button onClick={() => basculer(m)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{
                  flex: '0 0 auto', width: 32, height: 27, borderRadius: 8, display: 'grid', placeItems: 'center',
                  fontFamily: SK.mono, fontWeight: 900, fontSize: 12,
                  color: ouvre ? '#04121a' : SK.accentTexte,
                  background: ouvre ? 'linear-gradient(135deg,#22d3ee,#67e8f9)' : SK.accentClair,
                  boxShadow: ouvre ? '0 0 16px rgba(34,211,238,.55)' : 'none',
                }} title={m.num >= 100 ? `Maroc — réunion ${m.sorec || 'SOREC'}` : undefined}>
                  {m.num >= 100 ? 'MA' : 'R' + m.num}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Drapeau pays={m.country} titre={paysLisible(m.country) || 'France'} h={13} />
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: SK.accentTexte, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{joliHippo(m.hippodrome, m.country)}</span>
                    {aLeQuinte && <span style={{ flex: '0 0 auto', fontSize: 9, fontWeight: 800, background: 'rgba(244,63,94,.16)', color: ROUGE, borderRadius: 4, padding: '1px 4px' }}>Q+</span>}
                    {presse && (
                      <span style={{
                        flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 9.5, fontWeight: 900, fontFamily: SK.mono,
                        background: ROSE, color: '#2b0710', borderRadius: 5, padding: '1px 5px',
                        whiteSpace: 'nowrap',
                      }} title={`C${presse.num} part dans ${mmss(presse.time - now)}`}>
                        ⏱ {mmss(presse.time - now)}
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'block', fontSize: 10.5, color: presse ? ROSE_CLAIR : SK.doux, marginTop: 1 }}>
                    {(m.courses || []).length} course{(m.courses || []).length > 1 ? 's' : ''}
                    {premier ? ` · 1er à ${heureLocale(premier.time, m.country, premier.heure)}` : ''}
                    {presse ? ` · C${presse.num} part dans ${mmss(presse.time - now)}` : ''}
                  </span>
                </span>
                {paysLisible(m.country) && (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: SK.accentTexte, background: SK.accentClair, borderRadius: 6, padding: '2px 5px', whiteSpace: 'nowrap' }}>{paysLisible(m.country)}</span>
                )}
                <span style={{ fontSize: 9, color: SK.muet, transform: ouvre ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
              </button>

              {ouvre && (
                <div style={{ padding: '0 8px 9px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(m.courses || []).map((c) => {
                    const choisi = sel && sel.rnum === m.num && sel.cnum === c.num
                    const pp = parisDe(c)
                    /* ③ la course elle-même : à moins de 5 min elle passe en rouge
                       battant, avec le décompte à la seconde. */
                    const reste = c.time == null ? null : c.time - now
                    const imminente = reste != null && reste > 0 && reste <= SEUIL
                    const partie = reste != null && reste <= 0 && reste > -APRES
                    return (
                      <button key={c.num} onClick={() => onPick(m, c)} title={c.libelle}
                        style={{
                          textAlign: 'left', cursor: 'pointer', padding: '5px 7px', borderRadius: 8,
                          display: 'flex', flexDirection: 'column', gap: 2,
                          background: imminente
                            ? 'linear-gradient(90deg, rgba(244,63,94,.38), rgba(251,146,60,.14))'
                            : choisi ? 'rgba(34,211,238,.18)' : 'rgba(255,255,255,.03)',
                          border: imminente ? '2px solid ' + ROSE : '1px solid ' + (choisi ? SK.accent : SK.ligne),
                          color: imminente ? '#fff' : choisi ? '#67e8f9' : SK.texte,
                          boxShadow: imminente ? '0 0 18px rgba(244,63,94,.35)' : 'none',
                          animation: imminente ? 'dna-imminent 1.3s ease-in-out infinite' : 'none',
                        }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, width: '100%' }}>
                          <b style={{ flex: '0 0 auto', fontFamily: SK.mono, fontSize: imminente ? 13 : 11.5 }}>C{c.num}</b>
                          <span style={{ flex: '0 0 auto', fontSize: 10, fontFamily: SK.mono, color: imminente ? ROSE_CLAIR : choisi ? 'rgba(34,211,238,.85)' : SK.muet }}>{heureGmt(c.time)} GMT</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 9.5, color: imminente ? '#ffe4e6' : choisi ? 'rgba(34,211,238,.85)' : SK.muet, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {jolieDiscipline(c.discipline)}{c.distance ? ` · ${c.distance} m` : ''}
                          </span>
                          {imminente && (
                            <span style={{
                              flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontFamily: SK.mono, fontSize: 12.5, fontWeight: 900,
                              background: '#fff', color: '#9f1239', borderRadius: 5, padding: '0 6px',
                            }}>⏱ {mmss(reste)}</span>
                          )}
                          {partie && !imminente && (
                            <span style={{ flex: '0 0 auto', fontSize: 8.5, fontWeight: 800, background: 'rgba(148,163,184,.22)', color: '#dbe4f0', borderRadius: 3, padding: '0 4px' }}>partie</span>
                          )}
                          {!pp.length && c.quinte && <span style={{ flex: '0 0 auto', fontSize: 8.5, fontWeight: 800, background: choisi ? 'rgba(255,255,255,.92)' : 'rgba(244,63,94,.16)', color: choisi ? '#0b3b4d' : ROUGE, borderRadius: 3, padding: '0 3px' }}>Q+</span>}
                        </span>
                        {imminente && (
                          <span style={{ fontSize: 9.5, fontWeight: 800, color: '#ffe4e6', letterSpacing: .2 }}>
                            DÉPART DANS {mmss(reste)} — {heureLocale(c.time, m.country, c.heure)}
                          </span>
                        )}
                        {pp.length > 0 && <ParisListe paris={pp} mini />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
