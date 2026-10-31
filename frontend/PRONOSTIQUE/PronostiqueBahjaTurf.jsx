import Entete from '../../src/Entete.jsx'
import { useEffect, useState } from 'react'

const GROUPES = [
  { key: 'quinteAssurance', label: 'Assurance', count: 2 },
  { key: 'synthese', label: 'La Synthèse', count: 1 },
]

function dateFr(date) {
  if (!date) return ''
  const [a, m, j] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(Date.UTC(a, m - 1, j)))
}

/** l'heure d'enregistrement — celle de la dernière publication du pronostic. */
function heureFr(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Casablanca', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d)
}

/* ── LES CASES — un nombre par case : « Synthèse │ 12 5 1 4 14 3 9 11 » ── */
const PEAU = {
  bord: 'rgba(45,212,191,.34)',
  fond: 'rgba(4,47,40,.42)',
  label: '#f1f7f4',
  caseFond: 'rgba(16,185,129,.10)',
  caseBord: 'rgba(52,211,153,.42)',
  chiffre: '#8ef0c8',
}

const casesDe = (valeur) => String(valeur ?? '').split(/[^\p{L}\p{N}]+/u).filter(Boolean)

function Rangee({ valeurs }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {valeurs.map((n, i) => (
        <span key={i} style={{
          minWidth: 42, height: 30, boxSizing: 'border-box', padding: '0 8px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 7, border: `1px solid ${PEAU.caseBord}`, background: PEAU.caseFond,
          color: PEAU.chiffre, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 14, fontWeight: 700,
        }}>{n}</span>
      ))}
    </div>
  )
}

function Groupe({ groupe, value }) {
  const choix = groupe.count === 1 ? [value] : (Array.isArray(value) ? value : [])
  const lignes = choix.map(casesDe).filter((l) => l.length)
  if (!lignes.length) return null
  return (
    <section style={{
      display: 'grid', gridTemplateColumns: 'minmax(96px, auto) 1fr', alignItems: 'stretch',
      border: `1px solid ${PEAU.bord}`, borderRadius: 10, background: PEAU.fond, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 12px', borderRight: `1px solid ${PEAU.bord}`,
        color: PEAU.label, fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 12.5, lineHeight: 1.25,
      }}>{groupe.label}</div>
      <div style={{ display: 'grid', gap: 6, padding: '8px 10px' }}>
        {lignes.map((l, i) => <Rangee key={i} valeurs={l} />)}
      </div>
    </section>
  )
}

export default function PronostiqueBahjaTurf() {
  const [pronostics, setPronostics] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let vivant = true
    fetch('/api/admin?action=pronostics', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.erreur || 'Lecture des pronostics impossible')
        return data
      })
      .then((data) => { if (vivant) setPronostics(Array.isArray(data.pronostics) ? data.pronostics : []) })
      .catch((e) => { if (vivant) setErreur(e.message || 'Lecture des pronostics impossible') })
      .finally(() => { if (vivant) setChargement(false) })
    return () => { vivant = false }
  }, [])

  const ordonnes = [...pronostics].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.modifieLe || '').localeCompare(String(a.modifieLe || '')))

  return (
    <>
      <Entete page="pronostic" />
      <main style={{
        minHeight: 'calc(100vh - 68px)', padding: 'clamp(20px, 5vw, 48px) 16px',
        color: '#e7f1ff', background: 'radial-gradient(900px 480px at 15% 0%, #1a1934 0%, #050812 65%)',
      }}>
        <div style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gap: 14 }}>
        <section style={{
          padding: 'clamp(20px, 4vw, 36px)', border: '1px solid rgba(232,121,249,.3)', borderRadius: 18,
          background: 'linear-gradient(145deg, rgba(25,21,45,.88), rgba(7,12,24,.94))', boxShadow: '0 18px 50px rgba(0,0,0,.35)',
        }}>
          <div style={{ color: '#e879f9', fontSize: 12, fontWeight: 800, letterSpacing: '.12em' }}>
            ESPACE PRONOSTICS
          </div>
          <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(24px, 4vw, 36px)', lineHeight: 1.15 }}>
            PRONOSTIQUE BAHJA TURF
          </h1>
          <p style={{ margin: 0, color: '#a9b6c9', fontSize: 15, lineHeight: 1.7 }}>
            Les pronostics favoris de Bahja Turf.
          </p>
        </section>
        {chargement && <div style={{ padding: 14, color: '#a9b6c9', fontSize: 13 }}>Chargement des pronostics…</div>}
        {erreur && <div role="status" style={{ padding: 14, border: '1px solid rgba(248,113,113,.3)', borderRadius: 10, color: '#fecaca', background: 'rgba(127,29,29,.15)', fontSize: 13 }}>{erreur}</div>}
        {!chargement && !erreur && !ordonnes.length && <div style={{ padding: 14, border: '1px solid rgba(148,163,184,.18)', borderRadius: 10, color: '#a9b6c9', background: 'rgba(2,6,15,.25)', fontSize: 13 }}>Aucun pronostic publié pour le moment.</div>}
        {ordonnes.map((p) => (
          <article key={p.id} style={{
            padding: 'clamp(15px, 3vw, 24px)', display: 'grid', gap: 12,
            border: '1px solid rgba(232,121,249,.24)', borderRadius: 16,
            background: 'linear-gradient(145deg, rgba(25,21,45,.8), rgba(7,12,24,.94))',
          }}>
            <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: '#f0abfc', fontSize: 18 }}>
                {p.reunion >= 100 ? 'MA' : `R${p.reunion}`} · {p.hippodrome || 'Réunion'} · C{p.course}
              </h2>
              <span style={{ color: '#a9b6c9', fontSize: 12 }}>
                {dateFr(p.date)}{p.distance ? ` · ${p.distance} m` : ''}
                {p.modifieLe && <span style={{ marginLeft: 8, color: '#5eead4', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11 }}>maj {heureFr(p.modifieLe)}</span>}
              </span>
            </header>
            {p.courseNom && <div style={{ marginTop: -8, color: '#94a3b8', fontSize: 12.5 }}>{p.courseNom}</div>}
            <div style={{ display: 'grid', gap: 9 }}>
              {GROUPES.map((g) => <Groupe key={g.key} groupe={g} value={p.fields?.[g.key]} />)}
            </div>
          </article>
        ))}
        </div>
      </main>
    </>
  )
}
