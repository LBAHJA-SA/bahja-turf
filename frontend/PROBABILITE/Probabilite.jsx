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
const COUL_POS = ['#34d399', '#22d3ee', '#a78bfa', '#fbbf24', '#fb7185']
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

/* Contexte : on descend l'arbre jusqu'au premier groupe qui porte ≥ 3 courses. */
function contexteDe(data, disc, dist, part) {
  const essais = [
    ['combine', `${disc} · ${dist} · ${part} part.`],
    ['discDist', `${disc} · ${dist}`],
    ['discipline', disc],
  ]
  for (const [niv, cle] of essais) {
    const g = (data.contextes?.[niv] || []).find((x) => x.ctx === cle)
    if (g && g.N >= 3) return { ...g, niveau: niv, portee: g.N >= 10 ? 'solide' : 'mince' }
  }
  const g = (data.contextes?.discipline || []).find((x) => x.ctx === disc)
  if (g) return { ...g, niveau: 'discipline', portee: 'très mince' }
  return { ...data.contextes.global, ctx: 'global (archive entière)', niveau: 'global', portee: 'repli global' }
}

export default function Probabilite() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [ctx, setCtx] = useState({ disc: '', dist: '', part: '' })

  useEffect(() => {
    let annule = false
    fetch('/data/probabilite.json', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((j) => { if (!annule) { setData(j); setLoading(false) } })
      .catch((e) => { if (!annule) { setErr(e.message || 'indisponible'); setLoading(false) } })
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
  const topCases = data?.topCases || []
  const contexte = useMemo(
    () => (data && ctx.disc ? contexteDe(data, ctx.disc, ctx.dist, ctx.part) : null),
    [data, ctx]
  )
  const maxPost = useMemo(() => Math.max(1, ...parP.map((r) => r.p_top5_post)), [parP])

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
        </div>

        {loading && <div style={{ padding: 20, color: SK.muted }}>Chargement…</div>}
        {err && <div style={{ padding: 20, color: '#fca5a5' }}>Indisponible : {err}. Lance <code>node tools\probabilite.mjs</code>.</div>}

        {data && (
          <>
            {/* ① marginales ------------------------------------------------- */}
            <Section
              n="①" titre="Probabilités marginales — chaque case P"
              sous={<>Fréquence brute et probabilité postérieure. La barre violette est le postérieur ; le chiffre à droite est le brut. Podium et victoire sont conditionnels à un top-5 — d'où un second dénominateur, n_top5.</>}
            >
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {topCases.slice(0, 8).map((r, i) => (
                  <span key={r.p} style={{ padding: '5px 9px', borderRadius: 8, background: i === 0 ? SK.accentClair : SK.alt, border: '1px solid ' + SK.bord, fontSize: 11.5 }}>
                    <b style={{ color: SK.accent }}>P{r.p}</b>
                    <span style={{ color: SK.muted }}> · </span>
                    <b style={{ color: '#e2e8f0' }}>{pc(r.p_top5_post)}</b>
                    <span style={{ color: '#5b6b85' }}> (brut {pc(r.p_top5)})</span>
                  </span>
                ))}
                <span style={{ fontSize: 11, color: '#5b6b85', alignSelf: 'center' }}>← classement par probabilité postérieure</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, width: '100%', minWidth: 860, border: '1px solid ' + SK.bord, borderRadius: 8, overflow: 'hidden' }}>
                  <thead>
                    <tr style={SK.hdr}>
                      <th style={{ ...SK.th, textAlign: 'left' }}>Case</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>top-5<br /><span style={{ fontWeight: 400, opacity: .75 }}>n / {data.N}</span></th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>P(top-5 | N)<br /><span style={{ fontWeight: 400, opacity: .75 }}>postérieur</span></th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>podiums<br /><span style={{ fontWeight: 400, opacity: .75 }}>P(podium | top-5)</span></th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>victoires<br /><span style={{ fontWeight: 400, opacity: .75 }}>P(victoire | top-5)</span></th>
                      <th style={{ ...SK.th, textAlign: 'left', minWidth: 160 }}>où il finit<br /><span style={{ fontWeight: 400, opacity: .75 }}>1er → 5e</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parP.map((r, i) => (
                      <tr key={r.p} style={{ background: i % 2 ? SK.alt : 'transparent' }}>
                        <td style={{ ...SK.td, fontWeight: 800, color: r.n_top5 ? SK.accent : '#4a5a72', whiteSpace: 'nowrap' }}>P{r.p}</td>
                        <td style={{ ...SK.td, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.n_top5} / {data.N}</td>
                        <td style={{ ...SK.td }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Barre v={r.p_top5_post * 100} coul={SK.accent} libelle={pc(r.p_top5_post)} />
                            <span style={{ fontSize: 10.5, color: '#5b6b85' }}>brut {pc(r.p_top5)}</span>
                          </div>
                        </td>
                        <td style={{ ...SK.td }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#a4b8d6', minWidth: 16, fontWeight: 700 }}>{r.podiums}</span>
                            <Barre v={r.n_top5 ? r.podiums / r.n_top5 * 100 : null} coul="#34d399" libelle={r.n_top5 ? pc(r.podiums / r.n_top5) : '—'} />
                          </div>
                        </td>
                        <td style={{ ...SK.td }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#a4b8d6', minWidth: 16, fontWeight: 700 }}>{r.victoires}</span>
                            <Barre v={r.n_top5 ? r.victoires / r.n_top5 * 100 : null} coul="#fbbf24" libelle={r.n_top5 ? pc(r.victoires / r.n_top5) : '—'} />
                          </div>
                        </td>
                        <td style={{ ...SK.td }}>
                          {r.n_top5 ? (
                            <div title={r.pos.map((v, k) => `${POS_NOM[k]} : ${pc(v / r.n_top5)}`).join(' · ')}
                              style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', minWidth: 160, background: 'rgba(255,255,255,.10)' }}>
                              {r.pos.map((v, k) => (v > 0 ? <div key={k} style={{ width: (v / r.n_top5 * 100) + '%', background: COUL_POS[k] }} /> : null))}
                            </div>
                          ) : <span style={{ color: '#4a5a72' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 9, fontSize: 11, color: SK.muted, alignItems: 'center' }}>
                <span>où il finit :</span>
                {POS_NOM.map((n, k) => (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: COUL_POS[k] }} />{n}
                  </span>
                ))}
              </div>
            </Section>

            {/* ② distribution des positions --------------------------------- */}
            <Section
              n="②" titre="Distribution des 5 positions — P(position | top-5)"
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

            {/* ③ paires ------------------------------------------------------ */}
            <Section
              n="③" titre="Probabilités jointes — les paires"
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

            {/* ④ triples et conditionnelles --------------------------------- */}
            <Section
              n="④" titre="Triples et probabilités conditionnelles"
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

            {/* ⑤ matrice DNA ------------------------------------------------- */}
            <Section
              n="⑤" titre="Matrice DNA — co-occurrences P × P"
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

            {/* ⑥ contexte bayésien ------------------------------------------- */}
            <Section
              n="⑥" titre="Mise à jour bayésienne par le contexte"
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

            {/* ⑦ combinaisons ------------------------------------------------- */}
            <Section
              n="⑦" titre="Combinaisons du Quinté — l'ensemble des 5 cases"
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

            {/* ⑧ backtest ----------------------------------------------------- */}
            <Section
              n="⑧" titre="Backtest hors échantillon — ce que couvre un top-N"
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

            {/* ⑨ limites ------------------------------------------------------ */}
            <div style={{ ...SK.box, padding: 14, borderLeft: '4px solid #fbbf24', fontSize: 12, lineHeight: 1.7 }}>
              <b style={{ color: '#fbbf24' }}>Ce que la statistique ne dit pas :</b>
              <br />· <b>{data.N} courses.</b> Une case à 2 ou 3 top-5 reste du bruit — le prior m = {data.marge} le rappelle dans chaque chiffre.
              <br />· Les probabilités sont <b>empiriques</b> (fréquences), pas un modèle entraîné. Aucune prédiction sur une course isolée.
              <br />· Les contextes de moins de 3 courses ne sont pas affichés seuls : la page remonte d'un cran et l'écrit.
              <br />· Le backtest est <b>leave-one-out</b> : la course notée ne sert jamais à son propre classement. Le test par moitié (⑧) est la version la plus stricte.
              <br />· Mise à jour : <code>node tools\probabilite.mjs</code> — relit l'archive et réécrit <code>data/probabilite.json</code> + <code>public/data/probabilite.json</code>. Le job quotidien le fait tout seul.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
