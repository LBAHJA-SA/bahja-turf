/* =============================================================================
 * frontend/PRONOSTIQUE/PronoMoteur.jsx — LE MOTEUR PRONOSTIQUE (31/10/2026)
 *
 * Un moteur SÉPARÉ de celui de /quinte, avec le découpage donné par
 * l'utilisateur :
 *
 *        G1 = P1..P6 → 3 · G2 = P7..P10 → 2 · G3 = P11..P18 → 3
 *
 * Il lit la Synthèse (presse), le marché (Equidia) et il affiche les TROIS
 * blocs avec, pour chacun, les chevaux ÉLIGIBLES — pris / non pris — puis le
 * ticket de 8.
 *
 * ⚠ Aucun chiffre n'est écrit à la main ici : les taux affichés viennent de
 *   `public/data/prono-moteur.json`, écrit par `node tools\prono-moteur.mjs`.
 * ========================================================================== */
import { useEffect, useState } from 'react'
import { aujourdhui, fetchRecapSite, siteCorrespondALaDate, fetchCotes } from '../../src/lib/quinte.js'
import { buildGrilleProno, remplirProno, BLOCS_PRONO, CHOIX_PRONO } from '../../src/lib/pronostique.js'

const PEAU = {
  bord: 'rgba(232,121,249,.28)',
  fond: 'linear-gradient(150deg, rgba(31,24,54,.92), rgba(6,10,22,.96))',
  texte: '#e9e5ff',
  doux: '#a9b2c9',
  pris: 'rgba(52,211,153,.16)',
  prisBord: 'rgba(52,211,153,.75)',
  libre: 'rgba(255,255,255,.045)',
  libreBord: 'rgba(148,163,184,.22)',
  chiffre: '#f0abfc',
  chiffrePris: '#6ee7b7',
}


function Case({ c, pris }) {
  return (
    <span title={'P' + c.place + (c.cote ? ' · cote ' + String(c.cote).replace('.', ',') : '')} style={{
      position: 'relative', minWidth: 48, height: 54, boxSizing: 'border-box', padding: '4px 6px 3px',
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
      borderRadius: 9, border: '1px solid ' + (pris ? PEAU.prisBord : PEAU.libreBord),
      background: pris ? PEAU.pris : PEAU.libre,
      opacity: pris ? 1 : 0.52,
    }}>
      <span style={{
        fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 17, fontWeight: 800, lineHeight: 1,
        color: pris ? PEAU.chiffrePris : '#c7cede',
      }}>{c.num}</span>
      <span style={{
        fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 9.5, letterSpacing: '.02em',
        color: pris ? 'rgba(110,231,183,.85)' : 'rgba(148,163,184,.7)',
      }}>P{c.place}{c.cote ? ' · ' + String(c.cote).replace('.', ',') : ''}</span>
    </span>
  )
}

function Bloc({ bloc }) {
  const pris = bloc.cases.filter((c) => c.pris).length
  return (
    <section style={{
      display: 'grid', gap: 8, padding: '10px 12px 12px',
      border: '1px solid ' + PEAU.bord, borderRadius: 12, background: 'rgba(10,14,30,.55)',
    }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ color: PEAU.texte, fontWeight: 800, fontSize: 12.5, letterSpacing: '.06em' }}>
          {bloc.id} · {bloc.label.replace(/^G\d · /, '')}
        </span>
        <span style={{
          fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11,
          color: pris === bloc.quota ? PEAU.chiffrePris : '#fca5a5',
        }}>{pris} / {bloc.quota} pris</span>
      </header>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {bloc.cases.map((c) => <Case key={c.num} c={c} pris={c.pris} />)}
        {!bloc.cases.length && <span style={{ color: PEAU.doux, fontSize: 12 }}>— la presse cite moins de chevaux que ce bloc.</span>}
      </div>
    </section>
  )
}

export default function PronoMoteur({ apercuPresse = null, apercuCotes = null }) {
  const apercu = Array.isArray(apercuPresse) && apercuPresse.length > 0
  const [date, setDate] = useState(aujourdhui())
  const [etat, setEtat] = useState(apercu
    ? { chargement: false, erreur: '', source: 'aperçu', hippodrome: '', presse: apercuPresse, runners: [], cotes: apercuCotes, cle: null }
    : { chargement: true, erreur: '', source: '', hippodrome: '', presse: [], runners: [], cotes: null, cle: null })
  const [mesure, setMesure] = useState(null)

  useEffect(() => {
    if (apercu) return
    let vivant = true
    ;(async () => {
      const d = aujourdhui()
      if (vivant) setDate(d)
      let presse = []
      let runners = []
      let source = ''
      let cle = null
      let hippodrome = ''

      /* ① l'archive du job quotidien — data/synthese.json (clé = date) */
      try {
        const r = await fetch('/data/synthese.json', { cache: 'no-store' })
        if (r.ok) {
          const tout = await r.json()
          const rec = tout && typeof tout === 'object' ? (tout[d] || null) : null
          if (rec && rec.found && Array.isArray(rec.synthese) && rec.synthese.length >= 8) {
            presse = rec.synthese
            runners = Array.isArray(rec.runners) ? rec.runners : []
            source = rec.source || 'archive locale'
            cle = rec.courseId || null
            hippodrome = rec.hippodrome || ''
          }
        }
      } catch (e) { /* pas d'archive : on passe au site */ }

      /* ② le site, seulement s'il affiche bien la course du jour */
      if (!presse.length) {
        try {
          const r = await fetchRecapSite()
          if (r && Array.isArray(r.synthese) && r.synthese.length && siteCorrespondALaDate(r.datePage, d)) {
            presse = r.synthese
            source = 'pronostics-turf.info'
          }
        } catch (e) { /* le site bloque */ }
      }

      /* ③ le marché : Equidia en direct, sinon le cache du job */
      let cotes = null
      if (cle) {
        try {
          const c = await fetchCotes(cle)
          if (c && Object.keys(c).length >= 6) cotes = c
        } catch (e) { /* proxy coupé */ }
        if (!cotes) {
          try {
            const r = await fetch('/data/cotes.json', { cache: 'no-store' })
            if (r.ok) {
              const tout = await r.json()
              const f = tout && tout[cle]
              if (f && Array.isArray(f.cotes)) {
                cotes = Object.fromEntries(f.cotes.map((x) => [Number(x.num), Number(x.cote)]))
              }
            }
          } catch (e) { /* pas de cache */ }
        }
      }

      if (vivant) {
        setEtat({
          chargement: false,
          erreur: presse.length ? '' : 'Aucune Synthèse pour aujourd’hui — le moteur ne fabrique pas de classement.',
          source, hippodrome, presse, runners, cotes, cle,
        })
      }
    })()
    return () => { vivant = false }
  }, [])

  useEffect(() => {
    let vivant = true
    fetch('/data/prono-moteur.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivant && j) setMesure(j) })
      .catch(() => {})
    return () => { vivant = false }
  }, [])

  const grille = etat.presse.length ? buildGrilleProno(etat.presse, etat.runners) : null
  const { ticket, detail } = grille ? remplirProno(grille, etat.cotes, CHOIX_PRONO) : { ticket: [], detail: [] }

  return (
    <section style={{
      padding: 'clamp(16px, 3vw, 26px)', display: 'grid', gap: 14,
      border: '1px solid ' + PEAU.bord, borderRadius: 18, background: PEAU.fond,
      boxShadow: '0 18px 50px rgba(0,0,0,.35)',
    }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#e879f9', fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em' }}>
            MOTEUR PRONOSTIQUE · 3 BLOCS
          </div>
          <div style={{ color: PEAU.doux, fontSize: 13, marginTop: 5 }}>
            {etat.hippodrome ? etat.hippodrome + ' · ' : ''}
            {dateFr(date)}
            {etat.source ? ' · presse : ' + etat.source : ''}
          </div>
        </div>
        <div style={{
          fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11.5, color: '#5eead4',
          border: '1px solid rgba(94,234,212,.28)', borderRadius: 8, padding: '4px 9px',
          background: 'rgba(13,148,136,.12)',
        }}>
          {BLOCS_PRONO.map((b) => b.quota).join('-')} · {BLOCS_PRONO.reduce((n, b) => n + b.quota, 0)} chevaux
        </div>
      </header>

      {etat.chargement && <div style={{ color: PEAU.doux, fontSize: 13 }}>Chargement de la course…</div>}
      {!etat.chargement && etat.erreur && (
        <div role="status" style={{
          padding: 12, borderRadius: 10, fontSize: 13, color: '#fecaca',
          border: '1px solid rgba(248,113,113,.3)', background: 'rgba(127,29,29,.15)',
        }}>{etat.erreur}</div>
      )}

      {!etat.chargement && !etat.erreur && (
        <>
          <div style={{ display: 'grid', gap: 9 }}>
            {detail.map((b) => <Bloc key={b.id} bloc={b} />)}
          </div>

          <div style={{ display: 'grid', gap: 8, paddingTop: 4 }}>
            <div style={{ color: PEAU.doux, fontSize: 11.5, letterSpacing: '.1em', fontWeight: 700 }}>TICKET</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {ticket.map((n, i) => (
                <span key={n + '-' + i} style={{
                  minWidth: 46, height: 40, padding: '0 9px', boxSizing: 'border-box',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 9, border: '1px solid rgba(232,121,249,.55)', background: 'rgba(232,121,249,.14)',
                  color: PEAU.chiffre, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 17, fontWeight: 800,
                }}>{n}</span>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: PEAU.doux, lineHeight: 1.65, borderTop: '1px solid rgba(148,163,184,.16)', paddingTop: 10 }}>
            Choix dans les blocs :{' '}
            {BLOCS_PRONO.map((b) => b.id + ' ' + (CHOIX_PRONO[b.id] || 'carnet')).join(' · ')}
            {!etat.cotes && <span style={{ color: '#fbbf24' }}> · marché indisponible : les blocs suivent la presse</span>}
          </div>

          {mesure && mesure.corpus && (
            <div style={{
              display: 'grid', gap: 6, padding: '10px 12px', borderRadius: 10,
              border: '1px solid rgba(148,163,184,.18)', background: 'rgba(2,6,15,.35)',
            }}>
              <div style={{ fontSize: 11, letterSpacing: '.1em', color: '#94a3b8', fontWeight: 700 }}>
                MESURE — {mesure.corpus.A} QUINTÉS ({mesure.corpus.B} COURSES D’OCTOBRE EN CONTRÔLE)
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 }}>
                <span style={{ color: '#6ee7b7' }}>podium {pct(mesure.production?.A?.podium)}</span>
                <span style={{ color: '#a9b2c9' }}>5/5 {pct(mesure.production?.A?.cinq)}</span>
                <span style={{ color: '#a9b2c9' }}>x/5 {Number(mesure.production?.A?.x5 ?? 0).toFixed(2)}</span>
                <span style={{ color: '#94a3b8' }}>octobre : podium {pct(mesure.production?.B?.podium)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                contre-exemple mesuré — choisir « contre la presse et contre le marché » dans les trois blocs :
                {' '}<span style={{ color: '#fca5a5', fontFamily: 'ui-monospace, Consolas, monospace' }}>podium {pct(mesure.anti?.podiumA)}</span>
                {' '}({mesure.corpus?.A} courses) et {pct(mesure.anti?.podiumB)} sur octobre.
                {' '}70 % de podium demande {mesure.seuil70 ?? '—'} chevaux, pas 8.
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function dateFr(date) {
  if (!date) return ''
  const [a, m, j] = String(date).split('-').map(Number)
  if (!a || !m || !j) return String(date)
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(Date.UTC(a, m - 1, j)))
}

/** un taux écrit par le job — jamais un chiffre saisi à la main. */
function pct(v) {
  const x = Number(v)
  return (Number.isFinite(x) ? x.toFixed(1) : '—').replace('.', ',') + ' %'
}
