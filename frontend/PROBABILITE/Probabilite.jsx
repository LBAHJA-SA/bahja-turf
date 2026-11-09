/* =============================================================================
 * frontend/PROBABILITE/Probabilite.jsx — CALCUL DE PROBABILITÉ (6 méthodes)
 *
 * Pour une course choisie, on calcule P(cheval finit dans les 5) par 6 méthodes
 * et on donne le ticket (les 7 plus probables). Tout est calculé, rien n'est inventé.
 * Route : /probabilite
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react'
import Entete from '../../src/Entete.jsx'
import { selectionner, choisirContexte } from '../../src/lib/probabilite.js'
import { buildGrid } from '../../src/lib/quinte.js'

const SK = {
  accent: '#a78bfa', bord: 'rgba(124,58,237,.35)',
  box: { border: '1px solid rgba(124,58,237,.28)', borderRadius: 10, background: 'rgba(12,20,37,.72)' },
  th: { padding: '6px 8px', textAlign: 'center', fontSize: 10, fontWeight: 900, letterSpacing: 0.6, textTransform: 'uppercase', color: '#1a1204', background: 'linear-gradient(180deg,#c4b5fd,#a78bfa)', whiteSpace: 'nowrap' },
  td: { padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,.06)', verticalAlign: 'middle' },
  muted: '#7a8ea9', texte: '#e2e8f0', police: 'system-ui, -apple-system, Segoe UI, sans-serif',
}
const pc = (x, d = 1) => (x == null || !Number.isFinite(x) ? '—' : (x * 100).toFixed(d).replace('.', ',') + ' %')
const num = (x, d = 2) => (x == null || !Number.isFinite(x) ? '—' : x.toFixed(d).replace('.', ','))

function Barre({ v, coul = SK.accent }) {
  const w = v == null ? 0 : Math.max(0, Math.min(100, v * 100))
  return <div style={{ width: 60, height: 6, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle' }}>
    <div style={{ width: w + '%', height: '100%', background: coul, borderRadius: 999 }} />
  </div>
}

export default function Probabilite() {
  const [data, setData] = useState(null)
  const [cotes, setCotes] = useState(null)
  const [archive, setArchive] = useState([])
  const [raceId, setRaceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [copie, setCopie] = useState('')

  useEffect(() => {
    let annule = false
    fetch('/data/probabilite.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : null).then((j) => { if (!annule) setData(j) }).catch(() => {})
    fetch('/data/cotes.json', { cache: 'no-store' }).then((r) => r.ok ? r.json() : {}).then((j) => { if (!annule) setCotes(j || {}) }).catch(() => {})
    return () => { annule = true }
  }, [])

  useEffect(() => {
    let annule = false
    fetch('/data/synthese.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => {
        if (annule) return
        const rows = Object.entries(j || {})
          .filter(([, r]) => r && Array.isArray(r.synthese) && r.synthese.length >= 8 && Array.isArray(r.scores) && r.scores.length >= 8)
          .map(([k, r]) => ({ id: k, date: r.date || k, hippodrome: r.hippodrome || '', discipline: r.discipline || '', distance: r.distance, nbPartants: r.nbPartants || (r.runners || []).length, terrain: (r.scores[0] && r.scores[0].terrain) || 'Bon', ordre: r.synthese.map(Number).filter(Number.isFinite), runners: (r.runners || []).map(Number).filter(Number.isFinite), scores: r.scores }))
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        setArchive(rows)
        if (rows[0]) setRaceId(rows[0].id)
        setLoading(false)
      })
      .catch((e) => { if (!annule) { setErr(e.message || 'indisponible'); setLoading(false) } })
    return () => { annule = true }
  }, [])

  const course = archive.find((r) => r.id === raceId) || null

  // les 6 probabilités par cheval
  const calc = useMemo(() => {
    if (!course || !data) return null
    const N = course.nbPartants || course.runners.length
    const presse = course.ordre
    const grille = buildGrid(presse, course.runners)
    const scoreByNum = {}
    for (const s of course.scores) scoreByNum[s.num] = s
    const cotesCourse = (cotes && cotes[course.id] && Array.isArray(cotes[course.id].cotes)) ? cotes[course.id].cotes : []
    const coteByNum = {}
    for (const c of cotesCourse) coteByNum[c.num] = c.cote

    // 1. classique
    const pClassique = 1 / N

    // 2. fréquentiste : P(top-5 | case) depuis l'archive
    const parP = data.parP || []

    // 3. conditionnel : contexte
    const ctx = choisirContexte ? choisirContexte(data, (course.discipline || '').toLowerCase().includes('trot') ? 'Trot' : (course.discipline || '').toLowerCase().includes('haie') ? 'Haies' : 'Plat', '', '') : null
    const parPctx = (ctx && ctx.parP && ctx.parP.length) ? ctx.parP : parP

    // 4. bayésien : prior 1/N × likelihood (scores)
    // 5. odds : 1/cote normalisé
    const oddsRaw = course.runners.map((num) => {
      const c = coteByNum[num]
      return c && c > 1 ? 1 / c : null
    })
    const oddsSum = oddsRaw.reduce((s, x) => s + (x || 0), 0) || 1

    // 6. monte carlo : on tire 5000 fois un top-5 pondéré par la proba bayésienne
    // (calculé après)

    const rows = course.runners.map((num, idx) => {
      const slot = (grille.slotParNum || {})[num]
      const slotSafe = Number.isFinite(slot) ? slot : (presse.length + 1)
      const d = parP.find((x) => x.p === slotSafe) || {}
      const dctx = parPctx.find((x) => x.p === slotSafe) || d
      const sc = scoreByNum[num] || {}
      // bayésien
      const factors = [
        (sc.forme || 0) / 10,
        (sc.dist || 0) / 10,
        (sc.piste || 0) / 10,
        (sc.niveau || 0) / 10,
        (sc.terrain || 0) / 10,
        (sc.corde || 0) / 10,
      ].map((f) => Math.max(0.05, f))
      const lik = factors.reduce((a, b) => a * b, 1)
      const pBayes = pClassique * lik
      // odds
      const pOdds = oddsRaw[idx] != null ? oddsRaw[idx] / oddsSum * course.runners.length / N * (1 / course.runners.length) * N / course.runners.length : null
      // simpler: normalize odds to sum 1
      return {
        num, slot: slotSafe, nom: sc.nom || '',
        pClassique,
        pFreq: Number.isFinite(d.p_top5) ? d.p_top5 : null,
        pCond: Number.isFinite(dctx.p_top5) ? dctx.p_top5 : null,
        pBayes,
        pOdds: oddsRaw[idx] != null ? oddsRaw[idx] : null,
        _oddsRaw: oddsRaw[idx],
        forme: sc.forme, dist: sc.dist, piste: sc.piste, niveau: sc.niveau, terrain: sc.terrain, corde: sc.corde,
        filtres: sc.filtres, ok: sc.ok,
      }
    })

    // normalize bayes
    const bayesSum = rows.reduce((s, r) => s + r.pBayes, 0) || 1
    for (const r of rows) r.pBayes = r.pBayes / bayesSum

    // normalize odds (sum to 1)
    const oddsSum2 = rows.reduce((s, r) => s + (r._oddsRaw || 0), 0) || 1
    for (const r of rows) r.pOdds = r._oddsRaw != null ? r._oddsRaw / oddsSum2 : null

    // monte carlo : pondéré par la moyenne des méthodes disponibles
    const combined0 = rows.map((r) => {
      const vals = [r.pClassique, r.pFreq, r.pCond, r.pBayes, r.pOdds].filter((x) => x != null && Number.isFinite(x))
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : r.pClassique
    })
    // normalize combined0 to sum 1
    const cSum = combined0.reduce((a, b) => a + b, 0) || 1
    const w = combined0.map((x) => x / cSum)
    // sampling sans remise, 5000 itérations
    const M = 5000
    const counts = new Array(rows.length).fill(0)
    // precompute cumulative for weighted sampling without replacement per iteration
    for (let it = 0; it < M; it++) {
      // pick 5 distinct indices weighted by w
      const chosen = []
      const remaining = rows.map((_, i) => i)
      const wrem = w.slice()
      for (let k = 0; k < 5 && remaining.length; k++) {
        const tot = remaining.reduce((s, i) => s + wrem[i], 0) || 1
        let r = Math.random() * tot
        let pick = remaining[0]
        for (const i of remaining) { r -= wrem[i]; if (r <= 0) { pick = i; break } }
        chosen.push(pick)
        const pi = remaining.indexOf(pick)
        remaining.splice(pi, 1)
        wrem[pick] = 0
      }
      for (const i of chosen) counts[i]++
    }
    for (let i = 0; i < rows.length; i++) rows[i].pMC = counts[i] / M / 5  // per-horse prob of being in top-5 (5 winners per sim)

    // combiné final = moyenne des méthodes dispo (incluant MC)
    for (const r of rows) {
      const vals = [r.pClassique, r.pFreq, r.pCond, r.pBayes, r.pOdds, r.pMC].filter((x) => x != null && Number.isFinite(x))
      r.pComb = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : r.pClassique
    }
    const combSum = rows.reduce((s, r) => s + r.pComb, 0) || 1
    for (const r of rows) r.pComb = r.pComb / combSum

    rows.sort((a, b) => b.pComb - a.pComb)
    return { rows, N, hasOdds: cotesCourse.length > 0 }
  }, [course, data, cotes])

  const ticket = calc ? calc.rows.slice(0, 7).map((r) => r.num) : []

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 15% -10%, #16233c 0%, #04070f 55%)', fontFamily: SK.police, color: SK.texte }}>
      <Entete page="quinte" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 16px 70px' }}>
        <h1 style={{ margin: 0, fontSize: 23, fontWeight: 900, color: '#fff' }}>⚡ Probabilité — qui finit dans les 5 ?</h1>
        <div style={{ fontSize: 12.5, color: '#94a3b8', margin: '8px 0 14px', lineHeight: 1.6 }}>
          Six méthodes : classique · fréquentiste · conditionnelle · Bayésienne · odds · Monte Carlo. Tout est calculé sur les données réelles.
        </div>

        {loading && <div style={{ padding: 20, color: SK.muted }}>Chargement…</div>}
        {err && <div style={{ padding: 20, color: '#fca5a5' }}>Indisponible : {err}.</div>}

        {data && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: SK.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
                Course (archive réelle)
                <select value={raceId} onChange={(e) => setRaceId(e.target.value)}
                  style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid ' + SK.bord, borderRadius: 7, padding: '5px 8px', fontSize: 12, minWidth: 300 }}>
                  {archive.length === 0 && <option value="">archive indisponible</option>}
                  {archive.map((r) => <option key={r.id} value={r.id}>{r.date} · {r.hippodrome} · {r.discipline} · {r.distance}m</option>)}
                </select>
              </label>
            </div>

            {course && (
              <div style={{ fontSize: 11, color: '#5b6b85', marginBottom: 10 }}>
                {course.ordre.length} chevaux cités · {course.nbPartants} partants · {course.distance} m · {course.discipline} · {course.terrain}
                {calc && calc.hasOdds ? ' · cotes Equidia disponibles' : ' · pas de cotes'}
              </div>
            )}

            {calc && (
              <>
                {/* le ticket */}
                <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid ' + SK.bord, background: 'linear-gradient(180deg, rgba(124,58,237,.18), rgba(12,20,37,.6))', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: SK.muted, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>
                    ★ le ticket — combiné des 6 méthodes · {course.date} · {course.hippodrome} · 7 chevaux
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    {calc.rows.slice(0, 7).map((r) => (
                      <span key={r.num} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
                        <b style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{r.num}</b>
                        <span style={{ fontSize: 10, color: '#a4b8d6' }}>P{r.slot}</span>
                      </span>
                    ))}
                    <button type="button" onClick={() => { try { navigator.clipboard.writeText(ticket.join(' ')); setCopie('copié'); setTimeout(() => setCopie(''), 1500) } catch (e) { setCopie('—') } }}
                      style={{ marginLeft: 'auto', background: 'transparent', color: SK.accent, border: '1px solid ' + SK.bord, borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                      {copie || 'copier'}
                    </button>
                  </div>
                </div>

                {/* le tableau des 6 probabilités */}
                <div style={{ ...SK.box, padding: 14, marginBottom: 14, boxShadow: '0 8px 24px rgba(124,58,237,.18)', overflowX: 'auto' }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#e9d5ff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .6 }}>
                    les 6 probabilités par cheval (P finit dans les 5)
                  </div>
                  <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 780 }}>
                    <thead>
                      <tr>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>n°</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>nom</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>P</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>① classique</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>② fréquentiste</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>③ conditionnel</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>④ bayésien</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>⑤ odds</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>⑥ Monte Carlo</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>combiné</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.rows.map((r, i) => (
                        <tr key={r.num} style={{ background: i < 7 ? 'rgba(124,58,237,.10)' : 'transparent' }}>
                          <td style={{ ...SK.td, padding: '4px 7px', fontWeight: 900 }}>{r.num}</td>
                          <td style={{ ...SK.td, padding: '4px 7px', fontSize: 10.5 }}>{r.nom}</td>
                          <td style={{ ...SK.td, padding: '4px 7px', color: SK.accent, fontWeight: 800 }}>P{r.slot}</td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pClassique)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pFreq)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pCond)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pBayes)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pOdds)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pMC)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px', fontWeight: 900, color: '#e9d5ff' }}>{pc(r.pComb)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* les 6 méthodes en clair */}
                <div style={{ ...SK.box, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#e9d5ff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .6 }}>les 6 méthodes</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8, fontSize: 11.5, lineHeight: 1.55, color: '#cbd5e1' }}>
                    <div><b style={{ color: SK.accent }}>① classique</b> — P = 1/N (tous les chevaux équiprobables).</div>
                    <div><b style={{ color: SK.accent }}>② fréquentiste</b> — P(top-5 | case) mesurée sur {data.N} courses (leave-one-out).</div>
                    <div><b style={{ color: SK.accent }}>③ conditionnelle</b> — P(top-5 | case, contexte) : discipline / distance / partants.</div>
                    <div><b style={{ color: SK.accent }}>④ bayésienne</b> — prior 1/N × likelihood (forme, distance, piste, niveau, terrain, corde), normalisé.</div>
                    <div><b style={{ color: SK.accent }}>⑤ odds</b> — P = 1/cote (Equidia), normalisé (marge retirée). {calc.hasOdds ? 'disponible' : 'indisponible pour cette course'}.</div>
                    <div><b style={{ color: SK.accent }}>⑥ Monte Carlo</b> — 5000 simulations d'un top-5 pondéré par la proba combinée.</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                    <b>combiné</b> = moyenne des méthodes disponibles, normalisée. Le ticket = les 7 plus fortes.
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
