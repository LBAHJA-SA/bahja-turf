/* =============================================================================
 * frontend/PROBABILITE/Probabilite.jsx — CALCUL DE PROBABILITÉ (refonte)
 *
 * Page pour le parieur : on choisit une course, on obtient la probabilité
 * P(top-5) de chaque cheval, puis le ticket (les 7 plus probables).
 * Route : /probabilite   ·   données : public/data/probabilite.json
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react'
import Entete from '../../src/Entete.jsx'
import { selectionner, casesDepuisPresse, modeleDepuisJSON, ticketModele, couvertureModele } from '../../src/lib/probabilite.js'

const SK = {
  accent: '#a78bfa', bord: 'rgba(124,58,237,.35)',
  box: { border: '1px solid rgba(124,58,237,.28)', borderRadius: 10, background: 'rgba(12,20,37,.72)' },
  th: { padding: '8px 10px', textAlign: 'center', fontSize: 10.5, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase', color: '#1a1204', background: 'linear-gradient(180deg,#c4b5fd,#a78bfa)', whiteSpace: 'nowrap' },
  td: { padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,.06)', verticalAlign: 'middle' },
  muted: '#7a8ea9', texte: '#e2e8f0', police: 'system-ui, -apple-system, Segoe UI, sans-serif',
}
const pc = (x, d = 1) => (x == null || !Number.isFinite(x) ? '—' : (x * 100).toFixed(d).replace('.', ',') + ' %')

export default function Probabilite() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [archive, setArchive] = useState([])
  const [raceId, setRaceId] = useState('')
  const [ordreTxt, setOrdreTxt] = useState('')
  const [partants, setPartants] = useState([])
  const [copie, setCopie] = useState('')
  const [regle, setRegle] = useState('top5')

  useEffect(() => {
    let annule = false
    fetch('/data/probabilite.json', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((j) => { if (!annule) { setData(j); setLoading(false) } })
      .catch((e) => { if (!annule) { setErr(e.message || 'indisponible'); setLoading(false) } })
    return () => { annule = true }
  }, [])

  useEffect(() => {
    let annule = false
    fetch('/data/synthese.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => {
        if (annule) return
        const rows = Object.entries(j || {})
          .filter(([, r]) => r && Array.isArray(r.synthese) && r.synthese.length >= 8)
          .map(([k, r]) => ({ id: k, date: r.date || k, hippodrome: r.hippodrome || '', discipline: r.discipline || '', distance: r.distance, nbPartants: r.nbPartants || (r.runners || []).length, ordre: r.synthese.map(Number).filter(Number.isFinite), runners: (r.runners || []).map(Number).filter(Number.isFinite) }))
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        setArchive(rows)
        if (rows[0]) { setRaceId(rows[0].id); setOrdreTxt(rows[0].ordre.join(' ')); setPartants(rows[0].runners) }
      })
      .catch(() => {})
    return () => { annule = true }
  }, [])

  function chargerCourse(row) {
    setRaceId(row.id); setOrdreTxt(row.ordre.join(' ')); setPartants(row.runners)
  }

  const selection = useMemo(() => {
    if (!data || !ordreTxt.trim()) return null
    const ordre = ordreTxt.split(/[^0-9]+/).map(Number).filter((n) => n > 0)
    if (!ordre.length) return null
    return selectionner(data, { ordre, partants, taille: 7, regle, contexte: null })
  }, [data, ordreTxt, partants, regle])

  function chargerCourse(row) {
    setRaceId(row.id); setOrdreTxt(row.ordre.join(' ')); setPartants(row.runners)
  }

  const courseChoisie = archive.find((r) => r.id === raceId) || null

  // DNA : combinaison nouvelle (construite à partir des relations)
  const dnaExemple = useMemo(() => {
    if (!data?.dna || !ordreTxt.trim()) return null
    const ordre = ordreTxt.split(/[^0-9]+/).map(Number).filter((n) => n > 0)
    if (ordre.length < 5) return null
    const map = casesDepuisPresse(ordre, partants)
    const cases = [...new Set(Object.values(map.slotParNum).map(Number))].sort((a, b) => a - b)
    if (cases.length < 5) return null
    const model = modeleDepuisJSON(data.dna)
    const lam = data.dna.lambda
    const post = {}
    for (const c of cases) { const d = (data.parP || []).find((x) => x.p === c); post[c] = d ? d.p_top5_post : 0 }
    const marginal = cases.slice().sort((a, b) => (post[b] - post[a]) || a - b).slice(0, 7)
    const t = ticketModele(model, cases, 7, lam)
    const total = couvertureModele(model, cases, lam) || 1
    const quintes = data.combosQuinte || []
    const ticketSet = new Set(t.ticket)
    const contenus = quintes.filter((q) => q.every((c) => ticketSet.has(c))).length
    const jaccards = quintes.map((q) => { const inter = q.filter((c) => ticketSet.has(c)).length; const union = new Set([...q, ...t.ticket]).size; return union ? inter / union : 0 })
    const jaccardMax = jaccards.length ? Math.max(...jaccards) : 0
    const paires = []
    for (let i = 0; i < t.ticket.length; i++) for (let j = i + 1; j < t.ticket.length; j++) paires.push([t.ticket[i], t.ticket[j]])
    const pairesVues = paires.filter(([a, b]) => quintes.some((q) => q.includes(a) && q.includes(b))).length
    return { date: courseChoisie?.date || '', marginal, dna: t.ticket, couvMarg: couvertureModele(model, marginal, lam) / total, couvDNA: t.couverture / total, contenus, jaccardMax, pairesVues, totalPaires: paires.length }
  }, [data, ordreTxt, partants, courseChoisie])

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 15% -10%, #16233c 0%, #04070f 55%)', fontFamily: SK.police, color: SK.texte }}>
      <Entete page="quinte" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 16px 70px' }}>

        <h1 style={{ margin: 0, fontSize: 23, fontWeight: 900, color: '#fff' }}>⚡ Probabilité — qui finit dans les 5 ?</h1>
        <div style={{ fontSize: 12.5, color: '#94a3b8', margin: '8px 0 14px', lineHeight: 1.6 }}>
          Choisis une course. Pour chaque cheval, on calcule <b>P(finit dans les 5 | sa place dans la presse)</b> à partir des{' '}
          <b>{data?.N || '—'} courses réelles</b> de l'archive (leave-one-out). On garde les 7 plus probables.
        </div>

        {loading && <div style={{ padding: 20, color: SK.muted }}>Chargement…</div>}
        {err && <div style={{ padding: 20, color: '#fca5a5' }}>Indisponible : {err}.</div>}

        {data && (
          <>
            {/* choix de la course */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: SK.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
                Course (archive réelle)
                <select value={raceId} onChange={(e) => { const row = archive.find((r) => r.id === e.target.value); if (row) chargerCourse(row) }}
                  style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid ' + SK.bord, borderRadius: 7, padding: '5px 8px', fontSize: 12, minWidth: 260 }}>
                  {archive.length === 0 && <option value="">archive indisponible</option>}
                  {archive.map((r) => <option key={r.id} value={r.id}>{r.date} · {r.hippodrome} · {r.discipline}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 11, color: SK.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
                Règle
                <select value={regle} onChange={(e) => setRegle(e.target.value)}
                  style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid ' + SK.bord, borderRadius: 7, padding: '5px 8px', fontSize: 12, minWidth: 180 }}>
                  <option value="top5">P(top-5 | case)</option>
                  <option value="podium">P(podium | case)</option>
                  <option value="victoire">P(victoire | case)</option>
                  <option value="contexte">P(top-5 | contexte)</option>
                </select>
              </label>
            </div>

            {courseChoisie && (
              <div style={{ fontSize: 11, color: '#5b6b85', marginBottom: 10 }}>
                {courseChoisie.ordre.length} chevaux cités · {courseChoisie.nbPartants} partants · {courseChoisie.distance} m
              </div>
            )}

            {/* le ticket */}
            {selection && selection.lignes.length > 0 && (
              <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid ' + SK.bord, background: 'linear-gradient(180deg, rgba(124,58,237,.18), rgba(12,20,37,.6))', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: SK.muted, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>
                  ★ le ticket · {courseChoisie ? `${courseChoisie.date} — ${courseChoisie.hippodrome}` : 'course choisie'} · 7 chevaux
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  {selection.lignes.map((l) => (
                    <span key={l.num} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
                      <b style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{l.num}</b>
                      <span style={{ fontSize: 10, color: '#a4b8d6' }}>P{l.slot}</span>
                    </span>
                  ))}
                  <button type="button" onClick={() => { try { navigator.clipboard.writeText(selection.lignes.map((l) => l.num).join(' ')); setCopie('copié'); setTimeout(() => setCopie(''), 1500) } catch (e) { setCopie('—') } }}
                    style={{ marginLeft: 'auto', background: 'transparent', color: SK.accent, border: '1px solid ' + SK.bord, borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                    {copie || 'copier'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#7a8ea9', marginTop: 8 }}>
                  Le gros chiffre = le <b>numéro du cheval</b> · « P » = sa place dans la synthèse de la presse.
                </div>
              </div>
            )}

            {/* le calcul — probabilité par cheval */}
            {selection && selection.lignes.length > 0 && (
              <div style={{ ...SK.box, padding: 14, marginBottom: 14, boxShadow: '0 8px 24px rgba(124,58,237,.18)' }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#e9d5ff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .6 }}>
                  le calcul — P(top-5 | case) par cheval
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 480 }}>
                    <thead>
                      <tr>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>#</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>n° cheval</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>case (P)</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>P(top-5 | case)</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>brut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selection.lignes.map((l, i) => (
                        <tr key={l.num} style={{ background: i % 2 ? 'rgba(255,255,255,.03)' : 'transparent' }}>
                          <td style={{ ...SK.td, padding: '5px 9px', color: SK.muted }}>{i + 1}</td>
                          <td style={{ ...SK.td, padding: '5px 9px', fontWeight: 900, fontSize: 14 }}>{l.num}</td>
                          <td style={{ ...SK.td, padding: '5px 9px', color: SK.accent, fontWeight: 800 }}>P{l.slot}</td>
                          <td style={{ ...SK.td, padding: '5px 9px' }}><Barre v={l.post * 100} coul={SK.accent} libelle={pc(l.post)} /></td>
                          <td style={{ ...SK.td, padding: '5px 9px', color: '#a4b8d6' }}>{pc(l.p_top5)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
                  <b>P(top-5 | case)</b> = probabilité qu'un cheval dont la case est P(case) finisse dans les 5, calculée sur {data.N} courses (leave-one-out).
                  <b>brut</b> = fréquence brute observée. Le ticket = les 7 plus fortes.
                </div>
              </div>
            )}

            {/* combinaison nouvelle (DNA) */}
            {dnaExemple && dnaExemple.dna && dnaExemple.dna.length >= 5 && (
              <div style={{ ...SK.box, padding: 14, marginBottom: 14, boxShadow: '0 8px 24px rgba(124,58,237,.18)' }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#e9d5ff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .6 }}>
                  combinaison nouvelle (DNA) — construite à partir des relations
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
                  {[...dnaExemple.dna].sort((a, b) => a - b).map((c) => (
                    <span key={c} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                      <b style={{ fontSize: 24, fontWeight: 900, color: c >= 9 ? '#fbbf24' : '#fff', lineHeight: 1.1 }}>{c}</b>
                      <span style={{ fontSize: 9.5, color: c >= 9 ? '#fbbf24' : '#a4b8d6' }}>P{c}</span>
                    </span>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#a4b8d6' }}>
                    couverture estimée <b style={{ color: '#e9d5ff' }}>{pc(dnaExemple.couvDNA)}</b>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11.5 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid ' + SK.bord, color: dnaExemple.contenus === 0 ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                    {dnaExemple.contenus} Quinté du passé contenu dans ce ticket
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid ' + SK.bord, color: '#a4b8d6' }}>
                    paires déjà vues : {dnaExemple.pairesVues} / {dnaExemple.totalPaires}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid ' + SK.bord, color: '#a4b8d6' }}>
                    recouvrement max : {pc(dnaExemple.jaccardMax, 0)}
                  </span>
                </div>
              </div>
            )}

            {/* info */}
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              Données : {data.N} courses réelles (archive) + {data.controle?.N || 96} autres Quintés (contrôle).
              Leave-one-out : la course notée ne sert jamais à son propre classement.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Barre({ v, coul = SK.accent, libelle }) {
  const w = v == null ? 0 : Math.max(0, Math.min(100, v))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 110 }}>
      <div style={{ flex: 1, height: 7, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
        <div style={{ width: w + '%', height: '100%', background: coul, borderRadius: 999 }} />
      </div>
      <b style={{ fontSize: 11.5, minWidth: 44, textAlign: 'right', color: coul }}>{libelle ?? pc(v / 100)}</b>
    </div>
  )
}
