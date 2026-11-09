/* =============================================================================
 * frontend/PROBABILITE/Probabilite.jsx — LE MOTEUR DE PROBABILITÉ (09/11/2026)
 *
 * ⛔ MODULE INDÉPENDANT : cette page n'affiche que des statistiques
 *    extraites des résultats réels — fréquences marginales, conditionnelles,
 *    jointes, mise à jour bayésienne par contexte, matrice DNA, backtest.
 *
 *   Route : /probabilite   ·   données : public/data/probabilite.json
 *   Généré par : node tools\probabilite.mjs  (archive data/synthese.json)
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react'
import Entete from '../../src/Entete.jsx'
import { choisirContexte, selectionner, normDiscipline, bandeDistance, bandePartants, casesDepuisPresse, modeleDepuisJSON, ticketModele, couvertureModele } from '../../src/lib/probabilite.js'

const SK = {
  accent: '#a78bfa', accent2: '#7c3aed', accentClair: 'rgba(124,58,237,.16)',
  bord: 'rgba(124,58,237,.35)',
  box: { border: '1px solid rgba(124,58,237,.28)', borderRadius: 10, background: 'rgba(12,20,37,.72)' },
  hdr: { background: '#0f172a', color: '#fff' },
  th: { padding: '8px 10px', textAlign: 'center', fontSize: 10.5, fontWeight: 900, letterSpacing: 0.8, textTransform: 'uppercase', color: '#1a1204', background: 'linear-gradient(180deg,#c4b5fd,#a78bfa)', whiteSpace: 'nowrap' },
  td: { padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,.06)', verticalAlign: 'middle' },
  muted: '#7a8ea9', texte: '#e2e8f0',
  police: 'system-ui, -apple-system, Segoe UI, sans-serif',
  ombre: '0 8px 24px rgba(124,58,237,.18)',
  alt: 'rgba(255,255,255,.03)',
}
const POS_NOM = ['1er', '2e', '3e', '4e', '5e']

const pc = (x, d = 1) => (x == null || !Number.isFinite(x) ? '—' : (x * 100).toFixed(d).replace('.', ',') + ' %')
const arr = (x, d = 0) => (x == null || !Number.isFinite(x) ? '—' : x.toFixed(d).replace('.', ','))

function Barre({ v, coul = SK.accent, max = 100, libelle, min = 0 }) {
  const w = v == null ? 0 : Math.max(min, Math.min(max, v))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 7, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
        <div style={{ width: w + '%', height: '100%', background: coul, borderRadius: 999 }} />
      </div>
      <b style={{ fontSize: 11.5, minWidth: 44, textAlign: 'right', color: coul }}>{libelle ?? pc(v / 100)}</b>
    </div>
  )
}

function Case({ children, coul = SK.accent, fond }) {
  return (
    <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 6, fontSize: 11.5, fontWeight: 800, color: coul, background: fond || 'rgba(255,255,255,.06)', border: '1px solid ' + SK.bord }}>
      {children}
    </span>
  )
}

function Section({ n, titre, sous, children }) {
  return (
    <div style={{ ...SK.box, padding: 14, marginBottom: 16, boxShadow: SK.ombre }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 900, color: SK.accent, background: SK.accentClair, borderRadius: 6, padding: '1px 7px' }}>{n}</span>
        <b style={{ fontSize: 13, color: '#e9d5ff', letterSpacing: 0.6, textTransform: 'uppercase' }}>{titre}</b>
      </div>
      {sous && <div style={{ fontSize: 11.5, color: '#64748b', margin: '5px 0 10px', lineHeight: 1.55 }}>{sous}</div>}
      <div style={{ marginTop: sous ? 0 : 10 }}>{children}</div>
    </div>
  )
}

export default function Probabilite() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [ctx, setCtx] = useState({ disc: '', dist: '', part: '' })

  // sélection (⑨)
  const [archive, setArchive] = useState([])
  const [raceId, setRaceId] = useState('')
  const [ordreTxt, setOrdreTxt] = useState('')
  const [partants, setPartants] = useState([])
  const [taille, setTaille] = useState(8)
  const [regle, setRegle] = useState('top5')
  const [copie, setCopie] = useState('')

  useEffect(() => {
    let annule = false
    fetch('/data/probabilite.json', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((j) => { if (!annule) { setData(j); setLoading(false) } })
      .catch((e) => { if (!annule) { setErr(e.message || 'indisponible'); setLoading(false) } })
    return () => { annule = true }
  }, [])

  // l'archive fournit l'ordre de la presse des courses réelles : la sélection
  // se fait sur les NUMÉROS de la course, pas sur des cases abstraites.
  useEffect(() => {
    let annule = false
    fetch('/data/synthese.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => {
        if (annule) return
        const rows = Object.entries(j || {})
          .filter(([, r]) => r && Array.isArray(r.synthese) && r.synthese.length >= 8)
          .map(([k, r]) => ({
            id: k, date: r.date || k,
            hippodrome: r.hippodrome || '', discipline: r.discipline || '',
            distance: r.distance, nbPartants: r.nbPartants || (r.runners || []).length,
            ordre: r.synthese.map(Number).filter(Number.isFinite),
            runners: (r.runners || []).map(Number).filter(Number.isFinite),
          }))
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        setArchive(rows)
        if (rows[0]) {
          setRaceId(rows[0].id)
          setOrdreTxt(rows[0].ordre.join(' '))
          setPartants(rows[0].runners)
          setCtx({
            disc: normDiscipline(rows[0].discipline),
            dist: bandeDistance(rows[0].distance),
            part: bandePartants(rows[0].nbPartants),
          })
        }
      })
      .catch(() => { /* sélection indisponible : les stats restent affichées */ })
    return () => { annule = true }
  }, [])

  // défauts : le contexte le plus fréquent de l'archive
  useEffect(() => {
    if (!data || ctx.disc) return
    setCtx({
      disc: data.genres.disciplines.includes('Plat') ? 'Plat' : (data.genres.disciplines[0] || ''),
      dist: (data.contextes.distance[0] && data.contextes.distance[0].ctx) || '',
      part: (data.contextes.partants[0] && data.contextes.partants[0].ctx) || '',
    })
  }, [data, ctx.disc])

  const parP = data?.parP || []
  const contexte = useMemo(
    () => (data && ctx.disc ? choisirContexte(data, ctx.disc, ctx.dist, ctx.part) : null),
    [data, ctx]
  )

  function chargerCourse(row) {
    setRaceId(row.id)
    setOrdreTxt(row.ordre.join(' '))
    setPartants(row.runners)
    setCtx({
      disc: normDiscipline(row.discipline),
      dist: bandeDistance(row.distance),
      part: bandePartants(row.nbPartants),
    })
  }

  const selection = useMemo(() => {
    if (!data || !ordreTxt.trim()) return null
    const ordre = ordreTxt.split(/[^0-9]+/).map(Number).filter((n) => n > 0)
    if (!ordre.length) return null
    return selectionner(data, { ordre, partants, taille, regle, contexte: ctx })
  }, [data, ordreTxt, partants, taille, regle, ctx])

  const courbeRegle = data?.regles?.[regle]?.courbe || []
  const attendu = courbeRegle.find((c) => c.n === taille) || null
  const courseChoisie = archive.find((r) => r.id === raceId) || null

  // DNA 2.0 sur la course choisie : le ticket joint face au ticket marginal
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
    for (const c of cases) {
      const d = (data.parP || []).find((x) => x.p === c)
      post[c] = d ? d.p_top5_post : 0
    }
    const marginal = cases.slice().sort((a, b) => (post[b] - post[a]) || a - b).slice(0, taille)
    const t = ticketModele(model, cases, taille, lam)
    const total = couvertureModele(model, cases, lam) || 1
    return {
      date: (archive.find((r) => r.id === raceId) || {}).date || '',
      marginal, dna: t.ticket,
      couvMarg: couvertureModele(model, marginal, lam) / total,
      couvDNA: t.couverture / total,
    }
  }, [data, ordreTxt, partants, taille, raceId, archive])

  const bestScan = useMemo(() => {
    const sc = data?.dna?.scan || []
    return sc.length ? sc.slice().sort((a, b) => b.tauxQ - a.tauxQ || b.tauxP - a.tauxP)[0] : { tauxQ: 0, tauxP: 0 }
  }, [data])

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 15% -10%, #16233c 0%, #04070f 55%)', fontFamily: SK.police, color: SK.texte }}>
      <Entete page="quinte" />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '18px 16px 70px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: 0.3, color: '#fff', textShadow: '0 0 18px rgba(124,58,237,.5)' }}>
            ⚡ Probabilité — DNA des cases P1–P20
          </h1>
          {data && (
            <span style={{ fontSize: 12, color: SK.muted, padding: '3px 10px', border: '1px solid ' + SK.bord, borderRadius: 999 }}>
              {data.N} courses réelles · prior m = {data.marge} · {data.genres.disciplines.length} disciplines · généré le {String(data.genereLe || '').slice(0, 10)}
            </span>
          )}
        </div>

        <div style={{ ...SK.box, padding: 14, marginBottom: 16, borderLeft: '4px solid ' + SK.accent2, fontSize: 12.5, lineHeight: 1.7 }}>
          <b style={{ color: '#e9d5ff' }}>Uniquement des résultats réels.</b> Chaque probabilité de cette page est une
          fréquence observée dans l'archive, lissée par un prior écrit (Beta pour <i>top-5</i>, Dirichlet pour les positions,
          m = {data?.marge ?? 10} pseudo-courses). Aucun chiffre n'est inventé, aucun n'est extrapolé.
          <br />
          <b style={{ color: '#fbbf24' }}>Deux dénominateurs, jamais mélangés :</b> <code>P(top-5 | N)</code> se lit sur les{' '}
          {data?.N ?? 0} courses · <code>P(position k | top-5)</code> se lit uniquement parmi les fois où la case finit dans les 5.
          <br />
          <span style={{ color: '#94a3b8' }}>
            Les probabilités <b>marginales</b> (top-5, podium, victoire de chaque case P) sont déjà dans l'onglet
            <b> Statistiques</b> de la page Quinté. Ici on ne garde que ce qui ne s'y trouve pas : positions, paires,
            triples, conditionnelles, contexte, matrice DNA, DNA 2.0 et sélection.
          </span>
        </div>

        {loading && <div style={{ padding: 20, color: SK.muted }}>Chargement…</div>}
        {err && <div style={{ padding: 20, color: '#fca5a5' }}>Indisponible : {err}. Lance <code>node tools\probabilite.mjs</code>.</div>}

        {data && (
          <>
            {/* ① distribution des positions --------------------------------- */}
            <Section
              n="①" titre="Distribution des 5 positions — P(position | top-5)"
              sous={<>Chaque ligne est normalisée sur ses propres top-5 (Dirichlet α = 1). On lit la <b>forme</b> de la case : P1 gagne souvent quand elle est là, P5 place sans gagner, etc.</>}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 1, fontSize: 10.5, width: '100%', minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th style={{ ...SK.th, padding: '5px 8px' }}>Case</th>
                      <th style={{ ...SK.th, padding: '5px 8px' }}>n top-5</th>
                      {POS_NOM.map((n) => <th key={n} style={{ ...SK.th, padding: '5px 8px' }}>{n}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {parP.filter((r) => r.n_top5 > 0).map((r) => {
                      const post = r.rang_post || []
                      return (
                        <tr key={r.p}>
                          <td style={{ ...SK.td, fontSize: 11.5, fontWeight: 800, color: SK.accent, padding: '4px 8px' }}>P{r.p}</td>
                          <td style={{ ...SK.td, fontSize: 11, color: SK.muted, padding: '4px 8px' }}>{r.n_top5}</td>
                          {post.map((v, k) => (
                            <td key={k} title={`${POS_NOM[k]} : ${pc(v)}`}
                              style={{ ...SK.td, padding: '4px 6px', textAlign: 'center', fontWeight: 700, fontSize: 11,
                                color: v > 0.28 ? '#0b1220' : '#e2e8f0',
                                background: `rgba(167,139,250,${0.06 + 0.85 * Math.min(1, v / 0.6)})`, borderRadius: 3 }}>
                              {pc(v)}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 7 }}>
                Somme de chaque ligne = 100 % · les cases sans top-5 sont masquées.
              </div>
            </Section>

            {/* ② paires ------------------------------------------------------ */}
            <Section
              n="②" titre="Probabilités jointes — les paires"
              sous={<>Top 15 sur {data.N} courses. <b>P(a ∩ b)</b> = les deux dans les 5 · <b>P(b | a)</b> = si a est dans les 5, probabilité que b y soit aussi. Les deux versions sont données : brute et lissée vers le taux marginal de b.</>}
            >
              <div style={{ display: 'grid', gap: 5 }}>
                {data.topPaires.map((pr, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 80px 84px', gap: 10, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <b style={{ fontSize: 12.5, color: i === 0 ? SK.accent : '#cbd5e1' }}>P{pr.a} · P{pr.b}</b>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}>
                        <div style={{ width: Math.max(2, pr.p_both * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 11, color: SK.muted, minWidth: 50 }}>{pr.count}/{data.N}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#34d399', fontWeight: 700, textAlign: 'right' }}>{pc(pr.p_both)}</span>
                    <span style={{ fontSize: 10.5, color: '#a4b8d6', textAlign: 'right' }}>b|a {pc(pr.p_b_given_a, 0)}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* ③ triples et conditionnelles --------------------------------- */}
            <Section
              n="③" titre="Triples et probabilités conditionnelles"
              sous={<>Le Quinté complet (5 cases) est presque toujours unique — 32 combinaisons distinctes sur {data.N} courses. Le motif réel apparaît au niveau des triples, et surtout des conditionnelles : ce que la présence d'une case fait à une autre.</>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8, marginBottom: 14 }}>
                {data.topTriples.slice(0, 12).map((tr, i) => (
                  <div key={i} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid ' + SK.bord, background: i === 0 ? SK.accentClair : SK.alt, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <b style={{ fontSize: 12, color: i === 0 ? SK.accent : SK.texte }}>{tr.combo.map((x) => 'P' + x).join(' · ')}</b>
                    <span style={{ fontSize: 10.5, color: SK.muted, fontWeight: 700 }}>{tr.count}/{data.N} · {pc(tr.p, 0)}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 800, color: '#c4b5fd', margin: '4px 0 6px' }}>Les conditionnelles demandées</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, marginBottom: 14 }}>
                {data.exemples.map((ex, i) => {
                  const cond = ex.condition.map((x) => 'P' + x).join(', ')
                  const libre = ex.condition.length === 1
                  return (
                    <div key={i} style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                      <div style={{ fontSize: 11.5, color: SK.muted, marginBottom: 3 }}>
                        P(<b style={{ color: SK.accent }}>P{ex.cible}</b> | {cond})
                      </div>
                      <div style={{ fontSize: 19, fontWeight: 900, color: ex.den ? '#e9d5ff' : '#64748b' }}>
                        {ex.p == null ? '—' : pc(ex.p)}
                        {ex.den ? <span style={{ fontSize: 11, fontWeight: 600, color: '#7a8ea9', marginLeft: 8 }}>post. {pc(ex.p_post)}</span> : null}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#5b6b85', marginTop: 2 }}>
                        {ex.den ? `${ex.count} / ${ex.den} courses` : 'aucun précédent'} · sans condition {pc(ex.base)}
                        {libre ? ' (base libre)' : ''}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ fontSize: 12, fontWeight: 800, color: '#c4b5fd', margin: '4px 0 6px' }}>Les paires les plus « conditionnantes »</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>Si déjà dans les 5</th>
                      <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>alors…</th>
                      <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>P(cible | condition)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cond2.slice(0, 10).map((g, i) => (
                      <tr key={i} style={{ background: i % 2 ? SK.alt : 'transparent' }}>
                        <td style={{ ...SK.td, padding: '5px 9px' }}><b style={{ color: SK.accent }}>P{g.a} · P{g.b}</b> <span style={{ color: '#5b6b85', fontSize: 10.5 }}>({g.den} courses)</span></td>
                        <td style={{ ...SK.td, padding: '5px 9px' }}>
                          {g.top.slice(0, 3).map((x) => (
                            <span key={x.c} style={{ display: 'inline-block', marginRight: 6 }}>
                              <Case coul="#a4b8d6">P{x.c}</Case>
                            </span>
                          ))}
                        </td>
                        <td style={{ ...SK.td, padding: '5px 9px' }}>
                          {g.top.slice(0, 3).map((x) => (
                            <span key={x.c} style={{ display: 'inline-block', marginRight: 10, fontSize: 11.5 }}>
                              <b style={{ color: '#34d399' }}>{pc(x.p, 0)}</b> <span style={{ color: '#5b6b85', fontSize: 10 }}>({x.count})</span>
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ④ matrice DNA ------------------------------------------------- */}
            <Section
              n="④" titre="Matrice DNA — co-occurrences P × P"
              sous={<>Cellule (i, j) = nombre de courses où P<sub>i</sub> et P<sub>j</sub> sont tous deux dans les 5. Diagonale = n_top5 de la case. Valeurs brutes : avec {data.N} courses, une cellule à 1 ou 2 est du bruit — la couleur sert à lire les blocs, pas à conclure.</>}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 1, fontSize: 9.5 }}>
                  <thead>
                    <tr>
                      <th style={{ ...SK.th, padding: '4px 6px', fontSize: 9 }}>P</th>
                      {Array.from({ length: 20 }, (_, k) => k + 1).map((p) => (
                        <th key={p} style={{ ...SK.th, padding: '4px 2px', fontSize: 9, minWidth: 22 }}>{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((a) => {
                      const rowMax = Math.max(1, ...Array.from({ length: 20 }, (_, b) => data.pairs[a][b + 1] || 0))
                      return (
                        <tr key={a}>
                          <td style={{ ...SK.td, padding: '3px 6px', fontWeight: 800, color: SK.accent, fontSize: 10 }}>P{a}</td>
                          {Array.from({ length: 20 }, (_, b) => b + 1).map((bb) => {
                            const v = data.pairs[a][bb] || 0
                            const inten = v / Math.max(1, rowMax)
                            const diag = parP[a - 1]?.n_top5 ? parP[a - 1].n_top5 / data.N : 0
                            const bg = a === bb
                              ? `rgba(124,58,237,${0.12 + 0.75 * diag})`
                              : (v > 0 ? `rgba(52,211,153,${0.10 + 0.75 * inten})` : 'rgba(255,255,255,.04)')
                            return (
                              <td key={bb} title={`P${a} · P${bb} : ${v} course(s)`}
                                style={{ ...SK.td, padding: '2px 1px', textAlign: 'center', fontSize: 9, fontWeight: v > 0 ? 700 : 400,
                                  color: v > 0 ? '#e2e8f0' : '#3a4a62', background: bg, borderRadius: 3 }}>
                                {v > 0 ? v : '·'}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ⑤ contexte bayésien ------------------------------------------- */}
            <Section
              n="⑤" titre="Mise à jour bayésienne par le contexte"
              sous={<>Le postérieur d'une case change avec la discipline, la distance et la taille du champ. Formule : <code>(n_ctx + m · p_global) / (N_ctx + m)</code>, m = {data.marge}. Sous 3 courses, le contexte est trop mince : on remonte d'un cran (discipline + distance → discipline → global) et on l'écrit.</>}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                {[
                  ['disc', 'Discipline', data.genres.disciplines],
                  ['dist', 'Distance', data.genres.distances],
                  ['part', 'Partants', data.genres.partants],
                ].map(([k, lib, vals]) => (
                  <label key={k} style={{ fontSize: 11, color: SK.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {lib}
                    <select value={ctx[k]} onChange={(e) => setCtx((c) => ({ ...c, [k]: e.target.value }))}
                      style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid ' + SK.bord, borderRadius: 7, padding: '5px 8px', fontSize: 12, minWidth: 150 }}>
                      {vals.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                ))}
                {contexte && (
                  <div style={{ marginLeft: 'auto', fontSize: 11.5, color: SK.muted, textAlign: 'right' }}>
                    contexte retenu : <b style={{ color: '#e9d5ff' }}>{contexte.ctx}</b>
                    <br />
                    <span style={{ color: contexte.portee === 'solide' ? '#34d399' : contexte.portee === 'mince' ? '#fbbf24' : '#fb7185' }}>
                      N = {contexte.N} courses · {contexte.portee}
                    </span>
                    {contexte.niveau !== 'combine' && <span style={{ color: '#5b6b85' }}> · remonté à « {contexte.niveau} »</span>}
                  </div>
                )}
              </div>

              {contexte && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, width: '100%', minWidth: 760, border: '1px solid ' + SK.bord, borderRadius: 8, overflow: 'hidden' }}>
                    <thead>
                      <tr style={SK.hdr}>
                        <th style={{ ...SK.th, textAlign: 'left' }}>Case</th>
                        <th style={{ ...SK.th, textAlign: 'left' }}>dans les 5<br /><span style={{ fontWeight: 400, opacity: .75 }}>sur ce contexte</span></th>
                        <th style={{ ...SK.th, textAlign: 'left' }}>P(top-5 | contexte)</th>
                        <th style={{ ...SK.th, textAlign: 'left' }}>postérieur</th>
                        <th style={{ ...SK.th, textAlign: 'left' }}>indice<br /><span style={{ fontWeight: 400, opacity: .75 }}>vs global</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...contexte.parP].sort((a, b) => b.p_post - a.p_post).map((r, i) => (
                        <tr key={r.p} style={{ background: i % 2 ? SK.alt : 'transparent' }}>
                          <td style={{ ...SK.td, fontWeight: 800, color: SK.accent }}>P{r.p}</td>
                          <td style={{ ...SK.td, whiteSpace: 'nowrap' }}>{r.n} / {contexte.N}</td>
                          <td style={{ ...SK.td }}><Barre v={r.p_top5 * 100} coul="#22d3ee" libelle={pc(r.p_top5)} /></td>
                          <td style={{ ...SK.td }}><Barre v={r.p_post * 100} coul={SK.accent} libelle={pc(r.p_post)} /></td>
                          <td style={{ ...SK.td, fontWeight: 700, color: r.indice > 1.08 ? '#34d399' : r.indice < 0.92 ? '#fb7185' : '#a4b8d6' }}>
                            {r.indice ? '×' + arr(r.indice, 2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 7 }}>
                Indice = postérieur du contexte ÷ postérieur global. ×1,00 = comme la moyenne de l'archive. Donnée, pas prédiction.
              </div>
            </Section>

            {/* ⑥ combinaisons ------------------------------------------------- */}
            <Section
              n="⑥" titre="Combinaisons du Quinté — l'ensemble des 5 cases"
              sous={<><b>{data.comboQuint.length} combinaisons distinctes sur {data.N} courses.</b> C'est un <b>ensemble</b> de cases, jamais un ordre : la table ne dit pas qui est 1er. Elle dit quelles cases se retrouvent ensemble dans les 5 — et sa rareté dit qu'on ne peut pas bâtir une règle sur la combinaison complète seule.</>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 7 }}>
                {data.topCombos.map((cb, i) => (
                  <div key={i} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid ' + SK.bord, background: i === 0 ? SK.accentClair : SK.alt, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <b style={{ fontSize: 12, color: i === 0 ? SK.accent : SK.texte }}>{cb.combo.map((x) => 'P' + x).join(' · ')}</b>
                    <span style={{ fontSize: 10.5, color: SK.muted, fontWeight: 700 }}>{cb.count}× · {pc(cb.p, 0)}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* ⑦ backtest ----------------------------------------------------- */}
            <Section
              n="⑦" titre="Backtest hors échantillon — ce que couvre un top-N"
              sous={<>Pour chaque course, le classement est recalculé <b>sans cette course</b> (leave-one-out), puis on regarde si les 3 du podium et les 5 du Quinté tombent dans le top-N. Le hasard est le tirage uniforme de N cases sur 20 : <code>C(N,3)/C(20,3)</code> et <code>C(N,5)/C(20,5)</code>.</>}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, width: '100%', minWidth: 720, border: '1px solid ' + SK.bord, borderRadius: 8, overflow: 'hidden' }}>
                  <thead>
                    <tr style={SK.hdr}>
                      <th style={{ ...SK.th, textAlign: 'left' }}>N</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>podium entier</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>Quinté entier</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>≥ 4 du Quinté</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>gagnant trouvé</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>hasard (podium / Quinté)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.backtest.map((b, i) => {
                      const phare = b.n === 8
                      return (
                        <tr key={b.n} style={{ background: phare ? SK.accentClair : i % 2 ? SK.alt : 'transparent' }}>
                          <td style={{ ...SK.td, fontWeight: 900, color: phare ? SK.accent : SK.texte }}>{b.n}{phare ? ' ←' : ''}</td>
                          <td style={{ ...SK.td }}><Barre v={b.podium * 100} coul="#34d399" libelle={pc(b.podium)} /></td>
                          <td style={{ ...SK.td }}><Barre v={b.quinte * 100} coul={SK.accent} libelle={pc(b.quinte)} /></td>
                          <td style={{ ...SK.td }}><Barre v={b.plus4 * 100} coul="#fbbf24" libelle={pc(b.plus4)} /></td>
                          <td style={{ ...SK.td, fontWeight: 700 }}>{pc(b.gagnant)}</td>
                          <td style={{ ...SK.td, fontSize: 11, color: '#5b6b85' }}>{pc(b.hasard_podium)} / {pc(b.hasard_quinte)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 7 }}>
                Les ex æquo sont départagés par le numéro de case : deux paliers qui se suivent peuvent venir d'un ex æquo, pas d'un signal. La courbe se lit par grandes largeurs (5-8 / 10-12), jamais case par case.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, marginTop: 12 }}>
                {data.horsEchantillon.map((h, i) => (
                  <div key={i} style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                    <div style={{ fontSize: 11, color: SK.muted, marginBottom: 4 }}>{h.sens}</div>
                    <div style={{ fontSize: 19, fontWeight: 900, color: '#e9d5ff' }}>{pc(h.quinte)} <span style={{ fontSize: 11, color: '#7a8ea9' }}>Quinté (top-8)</span></div>
                    <div style={{ fontSize: 11.5, color: '#34d399', marginTop: 2 }}>{pc(h.podium)} <span style={{ color: '#7a8ea9' }}>podium (top-8)</span></div>
                    <div style={{ fontSize: 10.5, color: '#5b6b85', marginTop: 3 }}>{h.base} courses pour classer · {h.evalues} pour noter</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* ⑧ DNA 2.0 ------------------------------------------------------ */}
            {data.dna && (
              <Section
                n="⑧" titre="DNA 2.0 — du marginal au joint, et ce que le test en dit"
                sous={<>Un Quinté n'est pas un classement de cases : c'est un <b>ensemble de 5</b>. DNA 2.0 modélise donc la loi jointe de cet ensemble par son développement log-linéaire hiérarchique — chaque couche ajoute un terme, avec un coefficient λ appris sur une moitié de l'archive. ⛔ Aucun groupe, aucun quota : le seul critère du ticket est sa couverture estimée.</>}
              >
                <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt, fontSize: 12.5, fontFamily: 'ui-monospace, monospace', marginBottom: 12, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  log P(S) = Σ u<sub>p</sub> + λ₂·Σ w<sub>pq</sub> + λ₃·Σ t<sub>pqr</sub> + λ₄·q<sub>S</sub> − log Z
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 680 }}>
                    <thead>
                      <tr>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>couche</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>λ appris<br /><span style={{ fontWeight: 400, opacity: .7 }}>paire / triple / quinté</span></th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>log vraisemblance<br /><span style={{ fontWeight: 400, opacity: .7 }}>sur la moitié d'entraînement</span></th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>Quinté · n=8<br /><span style={{ fontWeight: 400, opacity: .7 }}>hors échantillon</span></th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>Podium · n=8</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>≥ 4 du Quinté</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dna.moyenne.map((m, i) => {
                        const e = data.dna.echelle[i] || {}
                        const r = m[8] || {}
                        const base = data.dna.moyenne[0][8] || {}
                        const gain = (r.quinte || 0) - (base.quinte || 0)
                        return (
                          <tr key={m.couche} style={{ background: i === 0 ? SK.accentClair : i % 2 ? SK.alt : 'transparent' }}>
                            <td style={{ ...SK.td, padding: '6px 9px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                              {String(i + 1).padStart(2, '0')} · {e.nom || m.etape}
                            </td>
                            <td style={{ ...SK.td, padding: '6px 9px', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>
                              {e.lambda ? `${e.lambda.pair} / ${e.lambda.triple} / ${e.lambda.quinte}` : '—'}
                            </td>
                            <td style={{ ...SK.td, padding: '6px 9px', fontFamily: 'ui-monospace, monospace', color: Number.isFinite(e.logLik) ? '#e2e8f0' : '#5b6b85' }}>
                              {Number.isFinite(e.logLik) ? e.logLik.toFixed(4).replace('.', ',') : '—'}
                            </td>
                            <td style={{ ...SK.td, padding: '6px 9px', fontWeight: 800, color: i === 0 ? '#e9d5ff' : gain < 0 ? '#fca5a5' : '#34d399' }}>
                              {pc(r.quinte)}
                              {i > 0 && <span style={{ fontSize: 10.5, color: gain < 0 ? '#fca5a5' : '#34d399' }}> ({gain >= 0 ? '+' : ''}{(gain * 100).toFixed(1).replace('.', ',')})</span>}
                            </td>
                            <td style={{ ...SK.td, padding: '6px 9px', color: '#a4b8d6' }}>{pc(r.podium)}</td>
                            <td style={{ ...SK.td, padding: '6px 9px', color: '#7a8ea9' }}>{pc(r.plus4)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 9, marginTop: 12 }}>
                  <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,.45)', background: 'rgba(127,29,29,.25)' }}>
                    <div style={{ fontSize: 10.5, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: .7 }}>le verdict</div>
                    <div style={{ fontSize: 13, color: '#fee2e2', lineHeight: 1.5, marginTop: 4 }}>
                      Le modèle joint bat la couche ① dans <b>{pc(data.dna.bootstrap.mieux)}</b> des tirages, perd dans{' '}
                      <b>{pc(data.dna.bootstrap.pire)}</b>. Écart moyen : <b>{data.dna.bootstrap.diff >= 0 ? '+' : ''}{data.dna.bootstrap.diff.toFixed(2).replace('.', ',')}</b> arrivant 5/5 par course.
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                    <div style={{ fontSize: 10.5, color: SK.muted, textTransform: 'uppercase', letterSpacing: .7 }}>la meilleure λ du balayage</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, marginTop: 4 }}>
                      Sur les {data.dna.scan.length} réglages essayés, le meilleur donne{' '}
                      <b>{pc(bestScan.tauxQ)}</b> de Quinté
                      et <b>{pc(bestScan.tauxP)}</b> de podium,
                      contre <b>{pc(data.dna.scan[0].tauxQ)}</b> / <b>{pc(data.dna.scan[0].tauxP)}</b> pour la couche ① seule.
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                    <div style={{ fontSize: 10.5, color: SK.muted, textTransform: 'uppercase', letterSpacing: .7 }}>pourquoi</div>
                    <div style={{ fontSize: 12.5, color: '#a4b8d6', lineHeight: 1.5, marginTop: 4 }}>
                      {data.dna.diagnostic.quintesDistincts} Quintés distincts sur {data.dna.N} courses ·
                      {' '}{data.dna.diagnostic.triplesVus} triples vus, dont {data.dna.diagnostic.triplesRepetes} seulement revus ·
                      {' '}{data.dna.diagnostic.quinteRepetes} Quinté revu une seconde fois.
                      Il n'y a pas la matière statistique pour une loi jointe.
                    </div>
                  </div>
                </div>

                {/* le ticket, concrètement */}
                {dnaExemple && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, color: SK.muted, marginBottom: 6 }}>
                      Sur la course choisie plus bas ({dnaExemple.date}) — même ensemble de départ, deux façons de le réduire :
                    </div>
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 560 }}>
                      <thead>
                        <tr>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>règle</th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>ticket</th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>couverture estimée<br /><span style={{ fontWeight: 400, opacity: .7 }}>P(Quinté ⊆ ticket)</span></th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>mesuré hors éch.</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ ...SK.td, padding: '6px 9px', whiteSpace: 'nowrap' }}>① marginal</td>
                          <td style={{ ...SK.td, padding: '6px 9px', fontFamily: 'ui-monospace, monospace', fontWeight: 800 }}>{dnaExemple.marginal.join(' · ')}</td>
                          <td style={{ ...SK.td, padding: '6px 9px', color: '#a4b8d6' }}>{pc(dnaExemple.couvMarg)}</td>
                          <td style={{ ...SK.td, padding: '6px 9px', color: '#e9d5ff' }}>{pc(data.dna.moyenne[0][8].quinte)}</td>
                        </tr>
                        <tr style={{ background: SK.alt }}>
                          <td style={{ ...SK.td, padding: '6px 9px', whiteSpace: 'nowrap' }}>④ DNA complet</td>
                          <td style={{ ...SK.td, padding: '6px 9px', fontFamily: 'ui-monospace, monospace', fontWeight: 800 }}>{dnaExemple.dna.join(' · ')}</td>
                          <td style={{ ...SK.td, padding: '6px 9px', color: '#a4b8d6' }}>{pc(dnaExemple.couvDNA)}</td>
                          <td style={{ ...SK.td, padding: '6px 9px', color: '#fca5a5' }}>{pc(data.dna.moyenne[3][8].quinte)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 7, lineHeight: 1.55 }}>
                      Le modèle joint <b>croit</b> couvrir davantage : il se trompe. La couverture qu'il annonce est plus haute,
                      celle qu'il délivre est plus basse — c'est exactement la définition du surajustement, et c'est pour cela
                      que la règle de sélection reste la couche ①.
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* ⑨ sélection --------------------------------------------------- */}
            <Section
              n="⑨" titre="De la probabilité à la sélection — le ticket"
              sous={<>On classe les cases par leur probabilité postérieure, on garde les <b>N</b> premières, et on rend les <b>numéros</b> de la course. Rien d'autre : pas de groupe, pas de quota, pas de place réservée. L'ordre du ticket est la probabilité décroissante (départage par la case).</>}
            >
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: SK.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  Course (archive réelle)
                  <select value={raceId} onChange={(e) => { const row = archive.find((r) => r.id === e.target.value); if (row) chargerCourse(row) }}
                    style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid ' + SK.bord, borderRadius: 7, padding: '5px 8px', fontSize: 12, minWidth: 230 }}>
                    {archive.length === 0 && <option value="">archive indisponible</option>}
                    {archive.map((r) => <option key={r.id} value={r.id}>{r.date} · {r.hippodrome} · {r.discipline}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 11, color: SK.muted, display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 280px' }}>
                  Ordre de la presse — P1 → P20
                  <input value={ordreTxt} onChange={(e) => setOrdreTxt(e.target.value)} placeholder="4 8 6 18 16 2 …"
                    style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid ' + SK.bord, borderRadius: 7, padding: '6px 9px', fontSize: 12.5, fontFamily: 'ui-monospace, monospace' }} />
                </label>
                <label style={{ fontSize: 11, color: SK.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  Taille
                  <select value={taille} onChange={(e) => setTaille(Number(e.target.value))}
                    style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid ' + SK.bord, borderRadius: 7, padding: '5px 8px', fontSize: 12 }}>
                    {[5, 6, 7, 8, 9, 10, 11, 12].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 11, color: SK.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  Règle de classement
                  <select value={regle} onChange={(e) => setRegle(e.target.value)}
                    style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid ' + SK.bord, borderRadius: 7, padding: '5px 8px', fontSize: 12, minWidth: 170 }}>
                    <option value="top5">P(top-5 | N)</option>
                    <option value="podium">P(podium | N)</option>
                    <option value="victoire">P(victoire | N)</option>
                    <option value="contexte">P(top-5 | contexte)</option>
                  </select>
                </label>
              </div>

              {courseChoisie && (
                <div style={{ fontSize: 11, color: '#5b6b85', marginBottom: 10 }}>
                  {courseChoisie.ordre.length} chevaux cités · {courseChoisie.nbPartants} partants · {courseChoisie.distance} m
                  {regle === 'contexte' && contexte ? <> · contexte : <b style={{ color: '#c4b5fd' }}>{contexte.ctx}</b> (N = {contexte.N})</> : null}
                </div>
              )}

              {selection && selection.lignes.length ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + SK.bord, background: SK.accentClair, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: SK.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Ticket</span>
                    {selection.lignes.map((l) => (
                      <span key={l.num} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 38 }}>
                        <b style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{l.num}</b>
                        <span style={{ fontSize: 9.5, color: '#a4b8d6' }}>P{l.slot}</span>
                      </span>
                    ))}
                    <button type="button" onClick={() => {
                      try { navigator.clipboard.writeText(selection.lignes.map((l) => l.num).join(' ')); setCopie('copié'); setTimeout(() => setCopie(''), 1500) } catch (e) { setCopie('—') }
                    }} style={{ marginLeft: 'auto', background: 'transparent', color: SK.accent, border: '1px solid ' + SK.bord, borderRadius: 7, padding: '5px 10px', fontSize: 11.5, cursor: 'pointer' }}>
                      {copie || 'copier'}
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 520 }}>
                      <thead>
                        <tr>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>#</th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>n°</th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>case</th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>probabilité postérieure</th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>brut</th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '5px 9px' }}>top-5</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selection.lignes.map((l, i) => (
                          <tr key={l.num} style={{ background: i % 2 ? SK.alt : 'transparent' }}>
                            <td style={{ ...SK.td, padding: '5px 9px', color: SK.muted }}>{i + 1}</td>
                            <td style={{ ...SK.td, padding: '5px 9px', fontWeight: 900, fontSize: 14 }}>{l.num}</td>
                            <td style={{ ...SK.td, padding: '5px 9px', color: SK.accent, fontWeight: 800 }}>P{l.slot}</td>
                            <td style={{ ...SK.td, padding: '5px 9px' }}><Barre v={l.post * 100} coul={SK.accent} libelle={pc(l.post)} /></td>
                            <td style={{ ...SK.td, padding: '5px 9px', color: '#a4b8d6' }}>{pc(l.p_top5)}</td>
                            <td style={{ ...SK.td, padding: '5px 9px', color: '#7a8ea9' }}>{l.n == null ? '—' : `${l.n} / ${selection.N_ctx}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ce que cette taille a couvert historiquement */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8, marginTop: 12 }}>
                    {attendu && (
                      <>
                        <div style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                          <div style={{ fontSize: 10.5, color: SK.muted }}>LOO · Quinté entier · N={taille}</div>
                          <div style={{ fontSize: 19, fontWeight: 900, color: '#e9d5ff' }}>{pc(attendu.quinte)}</div>
                          <div style={{ fontSize: 10.5, color: '#5b6b85' }}>{Math.round(attendu.quinte * attendu.evalues)} / {attendu.evalues} courses</div>
                        </div>
                        <div style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                          <div style={{ fontSize: 10.5, color: SK.muted }}>LOO · podium entier · N={taille}</div>
                          <div style={{ fontSize: 19, fontWeight: 900, color: '#34d399' }}>{pc(attendu.podium)}</div>
                          <div style={{ fontSize: 10.5, color: '#5b6b85' }}>≥ 4 du Quinté : {pc(attendu.plus4)}</div>
                        </div>
                      </>
                    )}
                    {data.regles?.[regle]?.horsEchantillon?.map((h, i) => (
                      <div key={i} style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                        <div style={{ fontSize: 10.5, color: SK.muted }}>hors échantillon · top-8</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: '#e9d5ff' }}>{pc(h.quinte)} <span style={{ fontSize: 10.5, color: '#7a8ea9' }}>Quinté</span></div>
                        <div style={{ fontSize: 11, color: '#34d399' }}>{pc(h.podium)} <span style={{ color: '#7a8ea9' }}>podium</span></div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 9, lineHeight: 1.55 }}>
                    Ce que la règle vaut, mesuré :{' '}
                    {(data.classementRegles || []).map((c, i) => (
                      <span key={c.regle} style={{ marginRight: 8 }}>
                        <b style={{ color: c.regle === regle ? '#e9d5ff' : '#7a8ea9' }}>{c.regle}</b> {pc(c.quinte, 0)}<span style={{ color: '#4a5a72' }}>/{pc(c.podium, 0)}</span>{i < data.classementRegles.length - 1 ? ' ·' : ''}
                      </span>
                    ))}
                    <span style={{ color: '#4a5a72' }}> (Quinté / podium, hors échantillon top-8) — écart max {Number.isFinite(data.ecartRegles) ? (data.ecartRegles * 100).toFixed(1).replace('.', ',') : '—'} pts.</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: SK.muted, padding: '8px 0' }}>
                  Saisis l'ordre de la presse (ou choisis une course de l'archive) pour voir le ticket.
                </div>
              )}
            </Section>

            {/* limites ---------------------------------------------------- */}
            <div style={{ ...SK.box, padding: 14, borderLeft: '4px solid #fbbf24', fontSize: 12, lineHeight: 1.7 }}>
              <b style={{ color: '#fbbf24' }}>Ce que la statistique ne dit pas :</b>
              <br />· <b>{data.N} courses.</b> Une case à 2 ou 3 top-5 reste du bruit — le prior m = {data.marge} le rappelle dans chaque chiffre.
              <br />· Les probabilités sont <b>empiriques</b> (fréquences), pas un modèle entraîné. Aucune prédiction sur une course isolée.
              <br />· Les contextes de moins de 3 courses ne sont pas affichés seuls : la page remonte d'un cran et l'écrit.
              <br />· Le backtest est <b>leave-one-out</b> : la course notée ne sert jamais à son propre classement. Le test par moitié (⑦) est la version la plus stricte.
              <br />· Mise à jour : <code>node tools\probabilite.mjs</code> — relit l'archive et réécrit <code>data/probabilite.json</code> + <code>public/data/probabilite.json</code>. Le job quotidien le fait tout seul.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
