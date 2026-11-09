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

  // sélection (③)
  const [archive, setArchive] = useState([])
  const [raceId, setRaceId] = useState('')
  const [ordreTxt, setOrdreTxt] = useState('')
  const [partants, setPartants] = useState([])
  const [taille, setTaille] = useState(7)
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
    return selectionner(data, { ordre, partants, taille: 20, regle, contexte: ctx })
  }, [data, ordreTxt, partants, regle, ctx])

  const ticket = useMemo(() => {
    if (!selection || !selection.lignes.length) return []
    const z = [[], [], [], []]
    for (const l of selection.lignes) z[l.slot <= 4 ? 0 : l.slot <= 8 ? 1 : l.slot <= 10 ? 2 : 3].push(l)
    const t = []
    ;[3, 2, 1, 1].forEach((k, i) => t.push(...z[i].slice(0, k)))
    if (t.length < 7) for (const l of selection.lignes) { if (t.length >= 7) break; if (!t.includes(l)) t.push(l) }
    return t.sort((a, b) => a.slot - b.slot)
  }, [selection])

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 900, letterSpacing: 0.3, color: '#fff', textShadow: '0 0 18px rgba(124,58,237,.5)' }}>
            ⚡ Qui prend les 3 ? Qui prend les 5 ?
          </h1>
          {data && (
            <span style={{ fontSize: 12, color: SK.muted, padding: '3px 10px', border: '1px solid ' + SK.bord, borderRadius: 999 }}>
              {data.N} courses réelles · résultats du {String(data.genereLe || '').slice(0, 10)}
            </span>
          )}
        </div>

        <div style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 14, lineHeight: 1.6 }}>
          Tous les chiffres de cette page viennent des <b style={{ color: '#e2e8f0' }}>résultats réels</b> de l'archive :
          aucune estimation inventée. On y répond à <b style={{ color: '#e9d5ff' }}>deux questions seulement</b> —
          les 3 places ensemble, les 5 places ensemble.
        </div>

        {loading && <div style={{ padding: 20, color: SK.muted }}>Chargement…</div>}
        {err && <div style={{ padding: 20, color: '#fca5a5' }}>Indisponible : {err}. Lance <code>node tools\probabilite.mjs</code>.</div>}

        {data && (
          <>
            {/* ★ L'ESSENTIEL ------------------------------------------------ */}
            <Section
              n="★" titre="Le chiffre — et le ticket qui va avec"
              sous={<>
                Une <b>case</b> (P1…P20) = la place d'un cheval dans la synthèse de la presse. Deux questions seulement :
                les <b>3</b> premières places ensemble, les <b>5</b> ensemble. Une seule chose décide — <b>combien de cases on garde</b>.
              </>}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, width: '100%', minWidth: 620, border: '1px solid ' + SK.bord, borderRadius: 8, overflow: 'hidden' }}>
                  <thead>
                    <tr style={SK.hdr}>
                      <th style={{ ...SK.th, textAlign: 'left' }}>cases gardées</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>les 3 ensemble</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>les 5 ensemble</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>≥ 4 des 5</th>
                      <th style={{ ...SK.th, textAlign: 'left' }}>au hasard (3 / 5)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[5, 6, 7].map((n) => {
                      const b = data.backtest.find((x) => x.n === n) || {}
                      const phare = n === taille
                      return (
                        <tr key={n} style={{ background: phare ? 'rgba(167,139,250,.18)' : 'transparent' }}>
                          <td style={{ ...SK.td, fontWeight: 900, fontSize: 13, color: phare ? '#e9d5ff' : SK.texte }}>
                            {n}{phare ? ' ← le ticket' : ''}
                          </td>
                          <td style={{ ...SK.td }}><Barre v={b.podium * 100} coul="#34d399" libelle={pc(b.podium)} /></td>
                          <td style={{ ...SK.td }}><Barre v={b.quinte * 100} coul={SK.accent} libelle={pc(b.quinte)} /></td>
                          <td style={{ ...SK.td, color: '#fbbf24', fontWeight: 700 }}>{pc(b.plus4)}</td>
                          <td style={{ ...SK.td, fontSize: 11, color: '#5b6b85' }}>{pc(b.hasard_podium)} / {pc(b.hasard_quinte)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* le ticket, tout de suite */}
              {ticket.length > 0 && (
                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid ' + SK.bord, background: SK.accentClair }}>
                  <div style={{ fontSize: 11, color: SK.muted, textTransform: 'uppercase', letterSpacing: .8 }}>
                    ★ le ticket · {courseChoisie ? `${courseChoisie.date} — ${courseChoisie.hippodrome}` : 'course choisie'} · 7 chevaux
                  </div>
                  <div style={{ display: 'flex', gap: 11, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 7 }}>
                    {ticket.map((l) => (
                      <span key={l.num} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                        <b style={{ fontSize: 26, fontWeight: 900, color: l.slot >= 9 ? '#fbbf24' : '#fff', lineHeight: 1.1 }}>{l.num}</b>
                        <span style={{ fontSize: 9.5, color: l.slot >= 9 ? '#fbbf24' : '#a4b8d6' }}>P{l.slot}</span>
                      </span>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#a4b8d6', textAlign: 'right' }}>
                      <b style={{ color: '#e9d5ff' }}>{pc(data.regle7?.controle?.zones?.podium)}</b> du podium · <b style={{ color: '#e9d5ff' }}>{pc(data.regle7?.controle?.zones?.quinte)}</b> du Quinté
                    </span>
                  </div>
                  {(() => {
                    const z = [0, 0, 0, 0]
                    for (const l of ticket) z[l.slot <= 4 ? 0 : l.slot <= 8 ? 1 : l.slot <= 10 ? 2 : 3]++
                    const ZN = ['P1-P4', 'P5-P8', 'P9-P10', 'P11+']
                    const bas = z[2] + z[3]
                    return (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 9, paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,.14)', fontSize: 11.5 }}>
                        {z.map((v, i) => (
                          <span key={i} style={{ padding: '2px 8px', borderRadius: 6, border: '1px solid ' + (i >= 2 ? 'rgba(251,191,36,.45)' : SK.bord), color: i >= 2 ? '#fbbf24' : '#a4b8d6', fontWeight: i >= 2 ? 800 : 500 }}>
                            {ZN[i]} · {v}
                          </span>
                        ))}
                        <span style={{ color: '#7a8ea9' }}>
                          {bas} chevaux hors du haut de la presse — c'est là que se joue le Quinté (page ①).
                        </span>
                      </div>
                    )
                  })()}
                  <div style={{ fontSize: 11, color: '#7a8ea9', marginTop: 7 }}>
                    Le gros chiffre = le <b>numéro du cheval</b> · « P » = sa place dans la synthèse de la presse.
                    Changer la course ou la règle : section ③, en bas.
                  </div>
                </div>
              )}

              {/* la seule phrase qui compte, mesurée sur 96 autres Quintés */}
              <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 9, border: '1px solid ' + SK.bord, background: SK.alt, fontSize: 12.5, lineHeight: 1.65, color: '#cbd5e1' }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: .7, color: SK.accent, textTransform: 'uppercase', marginBottom: 5 }}>
                  ce que le ticket ne doit pas faire
                </div>
                À 7 chevaux, garder les 7 favoris donne {pc(data.regle7?.controle?.favoris?.quinte)} du Quinté sur 96 autres Quintés réels ;
                la règle mesurée (3 de P1-P4, 2 de P5-P8, 1 de P9-P10, 1 de P11+) en donne{' '}
                <b style={{ color: '#34d399' }}>{pc(data.regle7?.controle?.zones?.quinte)}</b> — trois fois plus.
                Le bas de la synthèse ne remplace pas le haut : <b>il s'ajoute</b>, et il entre dans le ticket sans discussion.
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                {[[5, '5 chevaux'], [6, '6 chevaux'], [7, '7 chevaux']].map(([n, nom]) => {
                  const c = (data.controle?.courbe || []).find((x) => x.n === n) || {}
                  return (
                    <div key={n} style={{ flex: '1 1 170px', padding: '9px 11px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                      <div style={{ fontSize: 10.5, color: SK.muted }}>contrôle · {nom}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#e9d5ff' }}>{pc(c.quinte)}</div>
                      <div style={{ fontSize: 10.5, color: '#5b6b85' }}>Quinté entier · podium {pc(c.podium)}</div>
                    </div>
                  )
                })}
              </div>

              <div style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.6 }}>
                <b style={{ color: '#7a8ea9' }}>D'où viennent ces chiffres :</b> {data.N} courses de l'archive (les 3 lignes du haut) et{' '}
                {data.controle?.N || 96} autres Quintés à presse réelle (les 3 cartes de contrôle, autre période).
                Mesure <b>leave-one-out</b> : la course notée ne sert jamais à son propre classement. À {data.N} courses la courbe flatte —
                les deux mesures encadrent la vraie valeur. Un Quinté ne se répète pas : {data.ensemble.quinte.distincts} combinaisons distinctes
                sur {data.ensemble.quinte.courses} courses, donc « la combinaison qui va sortir » ne se cherche pas.
              </div>
            </Section>

            {/* ① composition ------------------------------------------------- */}
            <Section
              n="①" titre="D'où viennent les 3 et les 5 — P9+ compris"
              sous={<>
                Chaque case arrivée est rangée dans une <b>zone</b> de la synthèse. Une zone n'est pas un groupe de jeu :
                c'est seulement une bande de P1 à P20. Les chiffres disent où les arrivants se trouvent réellement —
                <b> y compris ceux que la presse cite en P9, P10, P11 et au-delà</b>.
              </>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
                {[['trio', '🥇 Les 3 — le podium', '#34d399'], ['quinte', '🏆 Les 5 — le Quinté', '#a78bfa']].map(([k, titre, coul]) => {
                  const c = data.composition[k]
                  const dernier = c.zones[c.zones.length - 1]
                  return (
                    <div key={k} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid ' + SK.bord, background: SK.alt }}>
                      <div style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: .8, color: coul, textTransform: 'uppercase', marginBottom: 9 }}>{titre}</div>
                      {c.zones.map((z, i) => {
                        const bas = i >= 2
                        return (
                          <div key={z.nom} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 11, minWidth: 62, color: bas ? '#fbbf24' : '#a4b8d6', fontWeight: bas ? 800 : 500 }}>{z.nom}</span>
                            <div style={{ flex: 1, height: 9, borderRadius: 999, background: 'rgba(255,255,255,.10)', overflow: 'hidden' }}>
                              <div style={{ width: Math.max(1, z.part * 100) + '%', height: '100%', borderRadius: 999, background: bas ? '#fbbf24' : coul }} />
                            </div>
                            <span style={{ fontSize: 11, minWidth: 58, textAlign: 'right', color: '#e2e8f0', fontWeight: 700 }}>
                              {arr(z.moyenne, 2)} / {c.k}
                            </span>
                            <span style={{ fontSize: 11, minWidth: 38, textAlign: 'right', color: '#7a8ea9' }}>{pc(z.part, 0)}</span>
                          </div>
                        )
                      })}
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(251,191,36,.35)', fontSize: 12, color: '#fbbf24', lineHeight: 1.5 }}>
                        <b>au moins une case P11+</b> dans {pc(dernier.auMoinsUn)} des courses
                        <span style={{ color: '#7a8ea9' }}> ({Math.round(dernier.auMoinsUn * c.N)} / {c.N})</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 11, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                En clair : le Quinté <b>ne prend pas « les cinq premiers de la presse »</b>. Une case sur cinq vient de
                <b style={{ color: '#fbbf24' }}> P11 et au-delà</b> ({arr(data.composition.quinte.zones[3].moyenne, 2)} sur 5), et dans
                <b style={{ color: '#fbbf24' }}> {pc(data.composition.quinte.zones[3].auMoinsUn)}</b> des courses il y en a au moins une.
                {' '}Les cases P9-P10 en ajoutent {pc(data.composition.quinte.zones[2].part, 0)} : ensemble, le bas de la synthèse pèse{' '}
                <b>{pc(data.composition.quinte.zones[2].part + data.composition.quinte.zones[3].part, 0)}</b> du Quinté.
              </div>
            </Section>

            {/* ② le filet ------------------------------------------------------ */}
            <Section
              n="②" titre="Le filet — combien de cases pour tenir les 3, puis les 5"
              sous={<>Pour chaque course, le classement est recalculé <b>sans cette course</b> (leave-one-out), puis on regarde si les 3 du podium et les 5 du Quinté tombent dans les N cases gardées. La ligne <i>au hasard</i> est ce que donnerait un tirage au sort des mêmes N cases.</>}
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
                    {data.backtest.filter((b) => [5, 6, 7].includes(b.n)).map((b, i) => {
                      const phare = b.n === taille
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

            {/* ③ sélection ---------------------------------------------------- */}
            <Section
              n="③" titre="Choisir une course — et lire son ticket"
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
                    {[5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
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
                        {ticket.map((l, i) => (
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
                    <div style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                      <div style={{ fontSize: 10.5, color: SK.muted }}>règle 7 cases · 96 Quintés réels</div>
                      <div style={{ fontSize: 19, fontWeight: 900, color: '#e9d5ff' }}>{pc(data.regle7?.controle?.zones?.quinte)} <span style={{ fontSize: 10.5, color: '#7a8ea9' }}>Quinté</span></div>
                      <div style={{ fontSize: 11, color: '#34d399' }}>{pc(data.regle7?.controle?.zones?.podium)} <span style={{ color: '#7a8ea9' }}>podium</span> · {pc(data.regle7?.controle?.zones?.plus4)} ≥4</div>
                      <div style={{ fontSize: 10.5, color: '#5b6b85', marginTop: 3 }}>contre {pc(data.regle7?.controle?.favoris?.quinte)} pour les 7 favoris</div>
                    </div>
                    <div style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid ' + SK.bord, background: SK.alt }}>
                      <div style={{ fontSize: 10.5, color: SK.muted }}>sur l'archive (33 courses)</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#e9d5ff' }}>{pc(data.regle7?.archive?.zones?.quinte)} <span style={{ fontSize: 10.5, color: '#7a8ea9' }}>Quinté</span></div>
                      <div style={{ fontSize: 11, color: '#34d399' }}>{pc(data.regle7?.archive?.zones?.podium)} <span style={{ color: '#7a8ea9' }}>podium</span></div>
                      <div style={{ fontSize: 10.5, color: '#5b6b85', marginTop: 3 }}>favoris : {pc(data.regle7?.archive?.favoris?.quinte)}</div>
                    </div>
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

                        <details style={{ marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 800, color: SK.accent, padding: '10px 13px', border: '1px solid ' + SK.bord, borderRadius: 9, background: SK.accentClair }}>
                Pour aller plus loin — les tests qui n'ont pas changé la sélection
              </summary>
              <div style={{ marginTop: 14 }}>

{/* DNA 2.0 -------------------------------------------------------- */}
            {data.dna && (
              <Section
                n="ⓘ" titre="DNA 2.0 — du marginal au joint, et ce que le test en dit"
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

                {/* « sortir du connu » : la répétition est-elle exploitable ? */}
                {data.dna.audela && (
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed ' + SK.bord }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#e9d5ff', marginBottom: 6 }}>
                      « Sortir du connu » — le Quinté ne se répète presque jamais. Faut-il fuir la combinaison la plus probable ?
                    </div>
                    <div style={{ fontSize: 12, color: '#a4b8d6', lineHeight: 1.6, marginBottom: 9 }}>
                      Sur <b>{data.dna.audela.repetition.courses}</b> courses, <b>{data.dna.audela.repetition.repetitions}</b> Quinté
                      est retombé exactement sur une combinaison déjà vue (<b>{pc(data.dna.audela.repetition.taux)}</b>).
                      Dans la trame d'un ticket de 8, <b>{Number(data.dna.audela.repetition.combosDejaVusParTicket).toFixed(1).replace('.', ',')}</b>{' '}
                      combinaisons sur {data.dna.audela.repetition.combosParTicket} avaient déjà été vues <i>avant</i> la course.
                      Deux façons de forcer la sortie du connu sont donc testées, chacune hors échantillon :
                    </div>

                    <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 520 }}>
                      <thead>
                        <tr>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>objectif</th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>Quinté · n=8<br /><span style={{ fontWeight: 400, opacity: .7 }}>hors échantillon</span></th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>Podium</th>
                          <th style={{ ...SK.th, textAlign: 'left', padding: '6px 9px' }}>≥ 4 du Quinté</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.dna.audela.comparaison.map((c, i) => {
                          const b = data.dna.audela.comparaison[0]
                          const dq = (c.quinte - b.quinte) * 100
                          const dp = (c.podium - b.podium) * 100
                          return (
                            <tr key={c.objectif} style={{ background: i === 0 ? SK.accentClair : i % 2 ? SK.alt : 'transparent' }}>
                              <td style={{ ...SK.td, padding: '6px 9px', fontWeight: i === 0 ? 800 : 500, whiteSpace: 'nowrap' }}>{c.objectif}</td>
                              <td style={{ ...SK.td, padding: '6px 9px', fontWeight: 800, color: i === 0 ? '#e9d5ff' : dq < 0 ? '#fca5a5' : '#34d399' }}>
                                {pc(c.quinte)}
                                {i > 0 && <span style={{ fontSize: 10.5 }}> ({dq >= 0 ? '+' : ''}{dq.toFixed(1).replace('.', ',')})</span>}
                              </td>
                              <td style={{ ...SK.td, padding: '6px 9px', color: dp < 0 ? '#fca5a5' : '#a4b8d6' }}>
                                {pc(c.podium)}
                                {i > 0 && dp !== 0 && <span style={{ fontSize: 10.5 }}> ({dp >= 0 ? '+' : ''}{dp.toFixed(1).replace('.', ',')})</span>}
                              </td>
                              <td style={{ ...SK.td, padding: '6px 9px', color: '#7a8ea9' }}>{pc(c.plus4)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>
                      <b style={{ color: '#c4b5fd' }}>Verdict mesuré :</b> écarter les combinaisons déjà vues ne change rien
                      (l'anti-répétition retrouve le marginal, parfois en perdant du podium), et « étaler » la probabilité
                      coûte {' '}
                      <b style={{ color: '#fca5a5' }}>
                        {Math.abs((data.dna.audela.comparaison[1].quinte - data.dna.audela.comparaison[0].quinte) * 100).toFixed(1).replace('.', ',')} points
                      </b>{' '}
                      de Quinté. La rareté d'une combinaison n'est pas une information sur la course : les 5 cases restent
                      indépendantes du fait qu'on les ait déjà vues. Seule la loi <i>marginale</i> porte du signal — c'est la
                      règle la plus forte, et elle est conservée.
                    </div>
                  </div>
                )}
              </Section>
            )}

                          </div>
            </details>

{/* limites ---------------------------------------------------- */}
            <div style={{ ...SK.box, padding: 14, borderLeft: '4px solid #fbbf24', fontSize: 12, lineHeight: 1.7 }}>
              <b style={{ color: '#fbbf24' }}>Ce que la statistique ne dit pas :</b>
              <br />· <b>{data.N} courses.</b> Une case à 2 ou 3 top-5 reste du bruit — le prior m = {data.marge} le rappelle dans chaque chiffre.
              <br />· Les probabilités sont <b>empiriques</b> (fréquences), pas un modèle entraîné. Aucune prédiction sur une course isolée.
              <br />· Les contextes de moins de 3 courses ne sont pas affichés seuls : la page remonte d'un cran et l'écrit.
              <br />· Le backtest est <b>leave-one-out</b> : la course notée ne sert jamais à son propre classement. Le test par moitié (②) est la version la plus stricte.
              <br />· Mise à jour : <code>node tools\probabilite.mjs</code> — relit l'archive et réécrit <code>data/probabilite.json</code> + <code>public/data/probabilite.json</code>. Le job quotidien le fait tout seul.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
