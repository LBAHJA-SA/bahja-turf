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
import { useEffect, useMemo, useState } from 'react'
import ParisListe from '../../src/Paris.jsx'
import Drapeau from '../../src/Drapeau.jsx'

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
const CASABLANCA = hhmm('Africa/Casablanca')
const GMT = hhmm('UTC')
const heureGmt = (ms) => (ms ? GMT.format(ms) : '')
/** L'heure du « 1er à … » : celle du pays de la réunion, pas celle de Paris. */
const heureLocale = (ms, pays) => {
  if (!ms) return ''
  return (String(pays || '').toUpperCase() === 'MA' ? CASABLANCA : PARIS).format(ms)
}

export default function Programme({ date, setDate, meetings, loading, onCharger, sel, onPick }) {
  const [ouverte, setOuverte] = useState(null)

  const compteurs = useMemo(() => {
    let courses = 0
    for (const m of meetings) courses += (m.courses || []).length
    return { reunions: meetings.length, courses }
  }, [meetings])

  /* on ouvre d'office la réunion qui porte le Quinté — sinon la première */
  useEffect(() => {
    if (!meetings.length) { setOuverte(null); return }
    const avecQuinte = meetings.find((m) => (m.courses || []).some((c) => c.quinte))
    setOuverte((avecQuinte || meetings[0]).num)
  }, [meetings])

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

      <div style={{ padding: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
        {loading && <div style={{ padding: 12, fontSize: 13, color: SK.muet }}>Lecture du programme…</div>}
        {!loading && !meetings.length && <div style={{ padding: 12, fontSize: 13, color: SK.muet }}>Rien à afficher.</div>}

        {meetings.map((m) => {
          const ouvre = ouverte === m.num
          const aLeQuinte = (m.courses || []).some((c) => c.quinte)
          const premier = (m.courses || []).map((c) => c.time).filter(Boolean).sort((a, b) => a - b)[0]
          return (
            <div key={m.num} style={{
              flex: '1 1 320px', maxWidth: 430, borderRadius: 11, overflow: 'hidden',
              border: '1px solid ' + (ouvre ? SK.accent : SK.ligne),
              background: ouvre ? 'rgba(34,211,238,.12)' : 'rgba(255,255,255,.03)',
              boxShadow: ouvre ? '0 0 22px rgba(34,211,238,.22)' : 'none',
              transition: 'box-shadow .15s, border-color .15s',
            }}>
              <button onClick={() => setOuverte(ouvre ? null : m.num)}
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
                  </span>
                  <span style={{ display: 'block', fontSize: 10.5, color: SK.doux, marginTop: 1 }}>
                    {(m.courses || []).length} course{(m.courses || []).length > 1 ? 's' : ''}
                    {premier ? ` · 1er à ${heureLocale(premier, m.country)}` : ''}
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
                    return (
                      <button key={c.num} onClick={() => onPick(m, c)} title={c.libelle}
                        style={{
                          textAlign: 'left', cursor: 'pointer', padding: '5px 7px', borderRadius: 8,
                          display: 'flex', flexDirection: 'column', gap: 2,
                          background: choisi ? 'rgba(34,211,238,.18)' : 'rgba(255,255,255,.03)',
                          border: '1px solid ' + (choisi ? SK.accent : SK.ligne),
                          color: choisi ? '#67e8f9' : SK.texte,
                        }}>
                        <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, width: '100%' }}>
                          <b style={{ flex: '0 0 auto', fontFamily: SK.mono, fontSize: 11.5 }}>C{c.num}</b>
                          <span style={{ flex: '0 0 auto', fontSize: 10, fontFamily: SK.mono, color: choisi ? 'rgba(34,211,238,.85)' : SK.muet }}>{heureGmt(c.time)} GMT</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 9.5, color: choisi ? 'rgba(34,211,238,.85)' : SK.muet, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {jolieDiscipline(c.discipline)}{c.distance ? ` · ${c.distance} m` : ''}
                          </span>
                          {!pp.length && c.quinte && <span style={{ flex: '0 0 auto', fontSize: 8.5, fontWeight: 800, background: choisi ? 'rgba(255,255,255,.92)' : 'rgba(244,63,94,.16)', color: choisi ? '#0b3b4d' : ROUGE, borderRadius: 3, padding: '0 3px' }}>Q+</span>}
                        </span>
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
