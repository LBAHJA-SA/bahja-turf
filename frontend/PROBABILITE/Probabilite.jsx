/* =============================================================================
 * frontend/PROBABILITE/Probabilite.jsx — LE MOTEUR DE PROBABILITÉ (09/11/2026)
 *
 * ⛔ CE MOTEUR NE TOUCHE PAS AU MOTEUR Quinté. Il lit l'archive réelle
 *    (data/probabilite.json, écrit par tools/probabilite.mjs) et affiche
 *    la matrice DNA P1-P20 : probabilités marginales, co-occurrences
 *    (paires, triples), conditionnelles et bayésiennes. Aucun quota ni boîte
 *    n'est modifié.
 *
 *   Route : /probabilite   ·   données : public/data/probabilite.json
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react'
import Entete from '../../src/Entete.jsx'
import { useLang } from '../../src/lib/langue.jsx'

const SK = {
  accent: '#7c3aed', accentSombre: '#5b21b6', accentClair: 'rgba(124,58,237,.14)',
  bord: 'rgba(124,58,237,.35)', box: { border: '1px solid rgba(124,58,237,.28)', borderRadius: 10, background: 'rgba(12,20,37,.72)' },
  hdr: { background: '#0f172a', color: '#fff' },
  th: { padding: '8px 10px', textAlign: 'center', fontSize: 10.5, fontWeight: 900, letterSpacing: .8, textTransform: 'uppercase', color: '#1a1204', background: 'linear-gradient(180deg,#c4b5fd,#a78bfa)', whiteSpace: 'nowrap' },
  td: { padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,.055)', verticalAlign: 'middle' },
  muted: '#7a8ea9', texte: '#e2e8f0', police: 'system-ui, -apple-system, sans-serif',
  ombreD: '0 8px 24px rgba(124,58,237,.18)',
  alt: 'rgba(255,255,255,.03)', ligne: 'transparent', on: 'rgba(124,58,237,.12)',
}

const COUL_POS = ['#34d399', '#22d3ee', '#a78bfa', '#fbbf24', '#fb7185']

function barre(v, coul, max = 100) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 7, borderRadius: 999, background: 'rgba(255,255,255,.13)', overflow: 'hidden' }}>
        <div style={{ width: Math.max(0, Math.min(100, v == null ? 0 : v)) + '%', height: '100%', background: coul, borderRadius: 999 }} />
      </div>
      <b style={{ fontSize: 11.5, minWidth: 42, textAlign: 'right', color: coul }}>{v == null ? '—' : v.toFixed(1).replace('.', ',') + ' %'}</b>
    </div>
  )
}

export default function Probabilite() {
  const { t } = useLang()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let annule = false
    fetch('/data/probabilite.json', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then((j) => { if (!annule) { setData(j); setLoading(false) } })
      .catch((e) => { if (!annule) { setErr(e.message || 'indisponible'); setLoading(false) } })
    return () => { annule = true }
  }, [])

  const topCases = data?.topCases || []
  const topPaires = data?.topPaires || []
  const topTriples = data?.topTriples || []
  const parP = data?.parP || []

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 15% -10%, #16233c 0%, #04070f 55%)', fontFamily: SK.police, color: SK.texte }}>
      <Entete page="quinte" />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '18px 16px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: .3, color: '#fff', textShadow: '0 0 18px rgba(124,58,237,.5)' }}>
            ⚡ Moteur de probabilité — DNA P1–P20
          </h1>
          {data && (
            <span style={{ fontSize: 12, color: SK.muted, padding: '3px 10px', border: '1px solid ' + SK.bord, borderRadius: 999 }}>
              {data.N} courses réelles · α = {data.alpha} (Laplace) · généré le {String(data.genereLe || '').slice(0, 10)}
            </span>
          )}
        </div>

        <div style={{ ...SK.box, padding: 14, marginBottom: 16, borderLeft: '4px solid ' + SK.accent, fontSize: 12.5, color: SK.texte, lineHeight: 1.65 }}>
          <b style={{ color: SK.accent }}>Ce moteur ne touche pas au moteur Quinté.</b> Il lit l'archive réelle
          (les arrivées) et calcule des probabilités <b>empiriques</b> : fréquences observées, lissées par Laplace.
          Les quotas 3-2-1-1-1 et les boîtes P1-P4 / P5-P8 / … restent intacts (§11.49).
          <br />
          <b style={{ color: '#fbbf24' }}>Règle d'honnêteté :</b> avec {data?.N ?? 0} courses, les valeurs sont
          bruitées. On affiche N et α à côté de chaque tableau — aucun chiffre n'est inventé.
        </div>

        {loading && <div style={{ padding: 20, color: SK.muted }}>Chargement…</div>}
        {err && <div style={{ padding: 20, color: '#fca5a5' }}>Indisponible : {err}. Lance <code>node tools\probabilite.mjs</code>.</div>}

        {data && (
          <>
            {/* ── ① ce que chaque P a donné ─────────────────────────────── */}
            <div style={{ ...SK.box, padding: 14, marginBottom: 16, boxShadow: SK.ombreD }}>
              <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>① Ce que chaque P a donné — probabilités marginales</b>
              <div style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 10px' }}>
                <b>P(top5 | N)</b> = sur les {data.N} courses · <b>P(podium | top5)</b> et <b>P(victoire | top5)</b> = parmi ses top-5 · lissage Laplace α={data.alpha}.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, width: '100%', minWidth: 720, overflow: 'hidden', border: '1px solid ' + SK.bord, borderRadius: 8 }}>
                  <thead>
                    <tr style={SK.hdr}>
                      <th style={{ ...SK.th, textAlign: 'left' }}>Case</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>top-5<br /><span style={{ fontWeight: 400, opacity: .75 }}>n / {data.N}</span></th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>P(top5 | N)<br /><span style={{ fontWeight: 400, opacity: .75 }}>lissé</span></th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>podiums<br /><span style={{ fontWeight: 400, opacity: .75 }}>P(podium | top5)</span></th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>victoires<br /><span style={{ fontWeight: 400, opacity: .75 }}>P(victoire | top5)</span></th>
                      <th style={{ ...SK.th, textAlign: 'left', minWidth: 150 }}>où il finit<br /><span style={{ fontWeight: 400, opacity: .75 }}>1er → 5e</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parP.map((r, i) => (
                      <tr key={r.p} style={{ borderBottom: '1px solid rgba(255,255,255,.07)', background: i % 2 ? SK.alt : SK.ligne }}>
                        <td style={{ ...SK.td, fontWeight: 800, color: r.n_top5 ? SK.accent : '#4a5a72', whiteSpace: 'nowrap' }}>P{r.p}</td>
                        <td style={{ ...SK.td, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.n_top5} / {data.N}</td>
                        <td style={SK.td}>{barre(r.p_top5 * 100, SK.accent)}</td>
                        <td style={SK.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11.5, color: '#a4b8d6', minWidth: 14, fontWeight: 700 }}>{r.podiums}</span>
                            {barre(r.p_top5 ? r.p_3e * 100 + r.p_2e * 100 + r.p_1er * 100 : null, '#34d399')}
                          </div>
                        </td>
                        <td style={SK.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11.5, color: '#a4b8d6', minWidth: 14, fontWeight: 700 }}>{r.victoires}</span>
                            {barre(r.n_top5 ? r.p_1er * 100 : null, '#fbbf24')}
                          </div>
                        </td>
                        <td style={SK.td}>
                          {r.n_top5 ? (
                            <div title={r.pos.map((v, k) => `${k + 1}er : ${r.n_top5 ? (v / r.n_top5 * 100).toFixed(0) : 0} %`).join(' · ')}
                              style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', minWidth: 150, background: 'rgba(255,255,255,.10)' }}>
                              {r.pos.map((v, k) => (v > 0 ? <div key={k} style={{ width: (v / r.n_top5 * 100) + '%', background: COUL_POS[k] }} /> : null))}
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
                {['1er', '2e', '3e', '4e', '5e'].map((n, k) => (
                  <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: COUL_POS[k], display: 'inline-block' }} />{n}
                  </span>
                ))}
              </div>
            </div>

            {/* ── ② top paires ─────────────────────────────────────────── */}
            <div style={{ ...SK.box, padding: 14, marginBottom: 16, boxShadow: SK.ombreD }}>
              <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>② Les paires les plus fréquentes — P(a ∩ b) et P(b | a)</b>
              <div style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 10px' }}>
                Top 15 sur {data.N} courses. <b>P(a ∩ b)</b> = les deux dans les 5 · <b>P(b | a)</b> = si a est dans les 5, probabilité que b y soit aussi.
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {topPaires.map((pr, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 90px 90px', gap: 10, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                    <b style={{ fontSize: 13, color: SK.accent }}>P{pr.a} · P{pr.b}</b>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(255,255,255,.13)', overflow: 'hidden' }}>
                        <div style={{ width: Math.max(2, pr.p_both * 100) + '%', height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 11.5, color: SK.muted, minWidth: 52 }}>{pr.count}/{data.N}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#34d399', fontWeight: 700, textAlign: 'right' }}>{(pr.p_both * 100).toFixed(1).replace('.', ',')} %</span>
                    <span style={{ fontSize: 11, color: '#a4b8d6', textAlign: 'right' }}>P(b|a) {(pr.p_b_given_a * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ③ top triples ─────────────────────────────────────────── */}
            <div style={{ ...SK.box, padding: 14, marginBottom: 16, boxShadow: SK.ombreD }}>
              <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>③ Les triples les plus fréquentes — P(a ∩ b ∩ c)</b>
              <div style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 10px' }}>
                Top 15. Le Quinté complet (5 P) est presque toujours unique (32 combinaisons distinctes sur 33 courses) —
                les triples sont le niveau où un motif réel apparaît.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {topTriples.map((tr, i) => (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid ' + SK.bord, background: i === 0 ? SK.accentClair : SK.alt, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <b style={{ fontSize: 12.5, color: i === 0 ? SK.accent : SK.texte }}>{tr.combo.map((x) => 'P' + x).join(' · ')}</b>
                    <span style={{ fontSize: 11, color: SK.muted, fontWeight: 700 }}>{tr.count}/{data.N} · {(tr.p * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ④ matrice DNA 20×20 ───────────────────────────────────── */}
            <div style={{ ...SK.box, padding: 14, marginBottom: 16, boxShadow: SK.ombreD }}>
              <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>④ Matrice DNA — co-occurrences P×P (dans les 5)</b>
              <div style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 10px' }}>
                Cellule (i, j) = nombre de courses où P<sub>i</sub> et P<sub>j</sub> sont tous deux dans les 5.
                La diagonale = n_top5 de la case. Plus la cellule est foncée, plus l'association est fréquente.
              </div>
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
                          <td style={{ ...SK.td, padding: '4px 6px', fontWeight: 800, color: SK.accent, fontSize: 10 }}>P{a}</td>
                          {Array.from({ length: 20 }, (_, b) => b + 1).map((bb) => {
                            const v = data.pairs[a][bb] || 0
                            const intensity = v / Math.max(1, rowMax)
                            const bg = a === bb
                              ? `rgba(124,58,237,${0.15 + 0.7 * (parP[a - 1]?.n_top5 ? parP[a - 1].n_top5 / data.N : 0)})`
                              : (v > 0 ? `rgba(52,211,153,${0.12 + 0.7 * intensity})` : 'rgba(255,255,255,.04)')
                            return (
                              <td key={bb} title={`P${a} · P${bb} : ${v} course(s)`}
                                style={{ ...SK.td, padding: '2px 1px', textAlign: 'center', fontSize: 9, fontWeight: v > 0 ? 700 : 400, color: v > 0 ? '#e2e8f0' : '#3a4a62', background: bg, borderRadius: 3 }}>
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
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                Diagonale = n_top5 de la case (violet). Hors diagonale = co-occurrences (vert). Plus c'est foncé, plus c'est fréquent.
                {' '}Les valeurs sont brutes (pas lissées) : avec {data.N} courses, une cellule à 1 ou 2 est du bruit.
              </div>
            </div>

            {/* ── ⑤ probabilités clés ───────────────────────────────────── */}
            <div style={{ ...SK.box, padding: 14, marginBottom: 16, boxShadow: SK.ombreD }}>
              <b style={{ fontSize: 13, color: SK.accent, letterSpacing: 1, textTransform: 'uppercase' }}>⑤ Probabilités clés — la lecture du moteur</b>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginTop: 10 }}>
                {[
                  { lib: 'P(P1 dans les 5)', v: parP[0]?.p_top5, note: `${parP[0]?.n_top5}/${data.N}` },
                  { lib: 'P(P3 dans les 5)', v: parP[2]?.p_top5, note: `${parP[2]?.n_top5}/${data.N}` },
                  { lib: 'P(P1 ∩ P3)', v: (data.pairs[1][3] || 0) / data.N, note: `${data.pairs[1][3] || 0}/${data.N}` },
                  { lib: 'P(P3 | P1)', v: (data.pairs[1][3] || 0) / Math.max(1, parP[0]?.n_top5 || 1), note: 'si P1 dans les 5' },
                  { lib: 'P(P11+ dans les 5)', v: data.p_auMoinsUnBas, note: `${data.coursesAvecBas}/${data.N}` },
                  { lib: 'P(P1 gagne | dans les 5)', v: parP[0]?.p_1er, note: `${parP[0]?.victoires}/${parP[0]?.n_top5}` },
                ].map((x, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                    <div style={{ fontSize: 11, color: SK.muted, fontWeight: 700, marginBottom: 4 }}>{x.lib}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: SK.accent }}>{(x.v * 100).toFixed(1).replace('.', ',')} %</div>
                    <div style={{ fontSize: 10.5, color: '#7a8ea9', marginTop: 2 }}>{x.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── ⑥ honnêteté ──────────────────────────────────────────── */}
            <div style={{ ...SK.box, padding: 14, borderLeft: '4px solid #fbbf24', fontSize: 12, color: SK.texte, lineHeight: 1.65 }}>
              <b style={{ color: '#fbbf24' }}>Limites honnêtes (§7) :</b>
              <br />
              · {data.N} courses seulement — toute cellule à 1 ou 2 est du bruit.
              <br />
              · Les probabilités sont <b>empiriques</b> (fréquences), pas un modèle entraîné. Pas de prédiction sur une course isolée.
              <br />
              · Le moteur Quinté (quotas, boîtes, choix dans le bloc) n'a pas changé : ce moteur est un <b>second moteur</b>, indépendant.
              <br />
              · Pour mettre à jour : <code>node tools\probabilite.mjs</code> (lit l'archive, écrit data/probabilite.json + public/data/probabilite.json).
            </div>
          </>
        )}
      </div>
    </div>
  )
}
