/* =============================================================================
 * frontend/PRONOSTIQUE/PronoMoteur.jsx — MOTEUR PRONOSTIQUE
 *
 * TICKET (8 chevaux) : sélection par les statistiques P(top5 | N).
 * PODIUM (3 chevaux × 3 règles) : sélection par les statistiques du podium.
 *   - podium  : P(podium | top5)
 *   - absolu  : nombre absolu de podiums
 *   - combo   : podium × top5
 *
 * Le ticket ne change PAS quand on clique sur les règles de podium.
 * ========================================================================== */
import { useEffect, useState } from 'react'
import { aujourdhui, fetchRecapSite, siteCorrespondALaDate } from '../../src/lib/quinte.js'
import { buildGrilleProno, remplirTicket, remplirPodium, BLOCS_PRONO, TAUX_TOP5, TAUX_PODIUM, ABS_PODIUM, REGLES_PODIUM, REGLE_PODIUM_LABELS } from '../../src/lib/pronostique.js'

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
  const taux = (TAUX_TOP5[c.place - 1] * 100).toFixed(1)
  return (
    <span title={'P' + c.place + ' · top5 ' + taux + ' %'} style={{
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
      }}>P{c.place} · {taux}%</span>
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

export default function PronoMoteur() {
  const [date, setDate] = useState(aujourdhui())
  const [etat, setEtat] = useState({ chargement: true, erreur: '', source: '', hippodrome: '', presse: [], runners: [] })

  useEffect(() => {
    let vivant = true
    ;(async () => {
      const d = aujourdhui()
      if (vivant) setDate(d)
      let presse = []
      let runners = []
      let source = ''
      let hippodrome = ''

      try {
        const r = await fetch('/data/synthese.json', { cache: 'no-store' })
        if (r.ok) {
          const tout = await r.json()
          const rec = tout && typeof tout === 'object' ? (tout[d] || null) : null
          if (rec && rec.found && Array.isArray(rec.synthese) && rec.synthese.length >= 8) {
            presse = rec.synthese
            runners = Array.isArray(rec.runners) ? rec.runners : []
            source = rec.source || 'archive locale'
            hippodrome = rec.hippodrome || ''
          }
        }
      } catch (e) { /* pas d'archive */ }

      if (!presse.length) {
        try {
          const r = await fetchRecapSite()
          if (r && Array.isArray(r.synthese) && r.synthese.length && siteCorrespondALaDate(r.datePage, d)) {
            presse = r.synthese
            source = 'pronostics-turf.info'
          }
        } catch (e) { /* le site bloque */ }
      }

      if (vivant) {
        setEtat({
          chargement: false,
          erreur: presse.length ? '' : 'Aucune Synthèse pour aujourd’hui — le moteur ne fabrique pas de classement.',
          source, hippodrome, presse, runners,
        })
      }
    })()
    return () => { vivant = false }
  }, [])

  const grille = etat.presse.length ? buildGrilleProno(etat.presse, etat.runners) : null
  const ticketResult = grille ? remplirTicket(grille) : { ticket: [], detail: [] }
  const podiums = grille ? {
    podium: remplirPodium(grille, 'podium'),
    absolu: remplirPodium(grille, 'absolu'),
    combo: remplirPodium(grille, 'combo'),
  } : { podium: [], absolu: [], combo: [] }

  return (
    <section style={{
      padding: 'clamp(16px, 3vw, 26px)', display: 'grid', gap: 14,
      border: '1px solid ' + PEAU.bord, borderRadius: 18, background: PEAU.fond,
      boxShadow: '0 18px 50px rgba(0,0,0,.35)',
    }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#e879f9', fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em' }}>
            MOTEUR PRONOSTIQUE · STATISTIQUES
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
          3-2-3 · 8 chevaux
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
          {/* TICKET (8 chevaux) */}
          <div style={{ display: 'grid', gap: 9 }}>
            {ticketResult.detail.map((b) => <Bloc key={b.id} bloc={b} />)}
          </div>

          <div style={{ display: 'grid', gap: 8, paddingTop: 4 }}>
            <div style={{ color: PEAU.doux, fontSize: 11.5, letterSpacing: '.1em', fontWeight: 700 }}>TICKET · 8 CHEVAUX</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {ticketResult.ticket.map((n, i) => (
                <span key={n + '-' + i} style={{
                  minWidth: 46, height: 40, padding: '0 9px', boxSizing: 'border-box',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 9, border: '1px solid rgba(232,121,249,.55)', background: 'rgba(232,121,249,.14)',
                  color: PEAU.chiffre, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 17, fontWeight: 800,
                }}>{n}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: PEAU.doux }}>
              Sélection par P(top5 | N) — les meilleures cases de chaque bloc.
            </div>
          </div>

          {/* PODIUM (3 chevaux × 3 règles) */}
          <div style={{ borderTop: '1px solid rgba(148,163,184,.16)', paddingTop: 12, display: 'grid', gap: 10 }}>
            <div style={{ color: PEAU.doux, fontSize: 11.5, letterSpacing: '.1em', fontWeight: 700 }}>PODIUM · 3 CHEVAUX · 3 RÈGLES</div>
            {REGLES_PODIUM.map((regle) => (
              <div key={regle} style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, color: '#f0abfc', fontWeight: 700 }}>{REGLE_PODIUM_LABELS[regle]}</div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {podiums[regle].map((n, i) => (
                    <span key={n + '-' + i} style={{
                      minWidth: 46, height: 40, padding: '0 9px', boxSizing: 'border-box',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 9, border: '1px solid rgba(94,234,212,.55)', background: 'rgba(94,234,212,.12)',
                      color: '#5eead4', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 17, fontWeight: 800,
                    }}>{n}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
