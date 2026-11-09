/* =============================================================================
 * frontend/PROBABILITE/Probabilite.jsx — CALCUL DE PROBABILITÉ (Top 5 + DNA)
 *
 * Pour une course choisie, on calcule P(cheval finit dans les 5 premiers) par
 * 6 méthodes. Chaque probabilité est une vraie probabilité Top 5 :
 * la somme sur tous les chevaux vaut 5 (500 %), pas 100 %.
 * Route : /probabilite
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react'
import Entete from '../../src/Entete.jsx'
import { choisirContexte } from '../../src/lib/probabilite.js'
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
  const w = v == null ? 0 : Math.max(0, Math.min(100, v * 100 / 5))  // scale: 5 = 100%
  return <div style={{ width: 70, height: 6, borderRadius: 999, background: 'rgba(255,255,255,.12)', overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle' }}>
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
          .filter(([, r]) => r && Array.isArray(r.synthese) && r.synthese.length >= 8)
          .map(([k, r]) => ({ id: k, date: r.date || k, hippodrome: r.hippodrome || '', discipline: r.discipline || '', distance: r.distance, nbPartants: r.nbPartants || (r.runners || []).length, terrain: (r.scores && r.scores[0] && r.scores[0].terrain) || 'Bon', ordre: r.synthese.map(Number).filter(Number.isFinite), runners: (r.runners || []).map(Number).filter(Number.isFinite), scores: r.scores || [], courseId: r.courseId }))
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        setArchive(rows)
        if (rows[0]) setRaceId(rows[0].id)
        setLoading(false)
      })
      .catch((e) => { if (!annule) { setErr(e.message || 'indisponible'); setLoading(false) } })
    return () => { annule = true }
  }, [])

  const course = archive.find((r) => r.id === raceId) || null

  const dna = useMemo(() => {
    if (!data || !data.combosQuinte) return null
    const combos = data.combosQuinte  // array of 5-subsets (cases)
    // paires
    const pairCount = {}
    const tripleCount = {}
    for (const combo of combos) {
      for (let i = 0; i < combo.length; i++) for (let j = i + 1; j < combo.length; j++) {
        const key = combo[i] < combo[j] ? combo[i] + '-' + combo[j] : combo[j] + '-' + combo[i]
        pairCount[key] = (pairCount[key] || 0) + 1
      }
      for (let i = 0; i < combo.length; i++) for (let j = i + 1; j < combo.length; j++) for (let k = j + 1; k < combo.length; k++) {
        const key = [combo[i], combo[j], combo[k]].sort((a, b) => a - b).join('-')
        tripleCount[key] = (tripleCount[key] || 0) + 1
      }
    }
    const N = combos.length
    const pairs = Object.entries(pairCount).map(([k, v]) => {
      const [a, b] = k.split('-').map(Number)
      // lift : P(A∩B)/(P(A)P(B))
      const pA = combos.filter((c) => c.includes(a)).length / N
      const pB = combos.filter((c) => c.includes(b)).length / N
      const pBoth = v / N
      const lift = (pA * pB > 0) ? pBoth / (pA * pB) : 0
      return { a, b, count: v, freq: pBoth, pCond: v / combos.filter((c) => c.includes(a)).length, lift }
    }).sort((x, y) => y.count - x.count).slice(0, 12)
    const triples = Object.entries(tripleCount).map(([k, v]) => {
      const parts = k.split('-').map(Number)
      return { combo: parts, count: v, freq: v / N }
    }).sort((x, y) => y.count - x.count).slice(0, 8)
    return { N, pairs, triples }
  }, [data])
  const calc = useMemo(() => {
    if (!course || !data) return null
    const N = course.nbPartants || course.runners.length
    const presse = course.ordre
    const grille = buildGrid(presse, course.runners)
    const scoreByNum = {}
    for (const s of course.scores) scoreByNum[s.num] = s
    const cotesCourse = (cotes && course.courseId && cotes[course.courseId] && Array.isArray(cotes[course.courseId].cotes)) ? cotes[course.courseId].cotes : []
    const coteByNum = {}
    for (const c of cotesCourse) coteByNum[c.num] = c.cote

    const parP = data.parP || []
    const ctx = (typeof choisirContexte === 'function') ? choisirContexte(data, (course.discipline || '').toLowerCase().includes('trot') ? 'Trot' : (course.discipline || '').toLowerCase().includes('haie') ? 'Haies' : 'Plat', '', '') : null
    const parPctx = (ctx && ctx.parP && ctx.parP.length) ? ctx.parP : parP

    const oddsRaw = course.runners.map((num) => {
      const c = coteByNum[num]
      return c && c > 1 ? 1 / c : null
    })
    const oddsSum = oddsRaw.reduce((s, x) => s + (x || 0), 0) || 1

    const rows = course.runners.map((num, idx) => {
      const slot = (grille.slotParNum || {})[num]
      const slotSafe = Number.isFinite(slot) ? slot : (presse.length + 1)
      const d = parP.find((x) => x.p === slotSafe) || {}
      const dctx = parPctx.find((x) => x.p === slotSafe) || d
      const sc = scoreByNum[num] || {}
      const hasScore = sc && (sc.forme != null || sc.dist != null)
      const hasFreq = Number.isFinite(d.p_top5)

      // ① classique : 5/N
      const pClassique = 5 / N

      // ② fréquentiste : taux historique d'apparition dans les 5
      const pFreq = hasFreq ? d.p_top5 : (5 / N)

      // ③ conditionnelle
      const pCond = Number.isFinite(dctx.p_top5) ? dctx.p_top5 : pFreq

      // ④ bayésienne : prior fréquentiste × likelihood (scores), normalisée pour somme = 5
      let pBayes
      if (hasScore) {
        const factors = [
          (sc.forme || 0) / 10, (sc.dist || 0) / 10, (sc.piste || 0) / 10,
          (sc.niveau || 0) / 10, (sc.terrain || 0) / 10, (sc.corde || 0) / 10,
        ].map((f) => Math.max(0.05, f))
        const lik = factors.reduce((a, b) => a * b, 1)
        pBayes = pFreq * lik
      } else {
        pBayes = pFreq
      }

      // ⑤ odds : 1/cote normalisé pour somme = 5 (proportionnel)
      const pOdds = oddsRaw[idx] != null ? (oddsRaw[idx] / oddsSum) * 5 : null

      return {
        num, slot: slotSafe, nom: sc.nom || '',
        pClassique, pFreq, pCond, pBayes, pOdds,
        _oddsRaw: oddsRaw[idx],
        _hasFreq: hasFreq,
        _nFreq: hasFreq ? (d.n || 0) : 0,
        _succFreq: hasFreq ? Math.round((d.p_top5 || 0) * (d.n || 0)) : 0,
        forme: sc.forme, dist: sc.dist, piste: sc.piste, niveau: sc.niveau, terrain: sc.terrain, corde: sc.corde,
      }
    })

    // normaliser bayes pour somme = 5
    const bayesSum = rows.reduce((s, r) => s + r.pBayes, 0) || 1
    const bayesScale = 5 / bayesSum
    for (const r of rows) r.pBayes = r.pBayes * bayesScale

    // ⑥ monte carlo : 5000 sims, compter les apparitions dans le top-5
    const M = 5000
    // poids = moyenne des méthodes dispo (pour le sampling)
    const w0 = rows.map((r) => {
      const vals = [r.pFreq, r.pCond, r.pBayes, r.pOdds].filter((x) => x != null && Number.isFinite(x))
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : r.pClassique
    })
    const wSum = w0.reduce((a, b) => a + b, 0) || 1
    const w = w0.map((x) => x / wSum)
    const counts = new Array(rows.length).fill(0)
    for (let it = 0; it < M; it++) {
      const remaining = rows.map((_, i) => i)
      const wrem = w.slice()
      const chosen = []
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
    for (let i = 0; i < rows.length; i++) rows[i].pMC = counts[i] / M  // prob d'être dans le top-5 (sur 1 sim de 5 places)

    // combiné = moyenne des méthodes dispo, puis mise à l'échelle somme = 5
    for (const r of rows) {
      const vals = [r.pFreq, r.pCond, r.pBayes, r.pOdds, r.pMC].filter((x) => x != null && Number.isFinite(x))
      // classique toujours disponible comme ancre
      vals.push(r.pClassique)
      r.pCombRaw = vals.reduce((a, b) => a + b, 0) / vals.length
    }
    const combSum = rows.reduce((s, r) => s + r.pCombRaw, 0) || 1
    const combScale = 5 / combSum
    for (const r of rows) r.pComb = r.pCombRaw * combScale

    rows.sort((a, b) => b.pComb - a.pComb)
    return { rows, N, hasOdds: cotesCourse.length > 0 }
  }, [course, data, cotes])

  // (ticket = ticketOpti, déjà défini ci-dessus)

  // ticket optimisé : maximise la couverture du top-5 (proba individuelle + force paires/triplets + diversité)
  const ticketOpti = useMemo(() => {
    if (!calc || !calc.rows.length) return []
    const rows = calc.rows
    const pBySlot = {}
    for (const r of rows) pBySlot[r.slot] = r.pComb
    const liftMap = {}
    const tripleLift = {}
    if (dna) {
      for (const p of dna.pairs) liftMap[p.a + '-' + p.b] = p.lift
      for (const t of dna.triples) tripleLift[t.combo.slice().sort((a, b) => a - b).join('-')] = t.count / (dna.N || 1)
    }
    const liftOf = (a, b) => liftMap[a < b ? a + '-' + b : b + '-' + a] || 0
    const tripleLiftOf = (a, b, c) => tripleLift[[a, b, c].sort((x, y) => x - y).join('-')] || 0
    const scoreOfSet = (set) => {
      let s = 0
      for (const sl of set) s += (pBySlot[sl] || 0)
      for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) s += 0.6 * liftOf(set[i], set[j])
      for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) for (let k = j + 1; k < set.length; k++) s += 0.4 * tripleLiftOf(set[i], set[j], set[k])
      return s
    }
    const remaining = rows.map((r) => r.slot)
    const selected = []
    // premier : meilleure proba individuelle
    let first = remaining.reduce((a, b) => (pBySlot[a] || 0) >= (pBySlot[b] || 0) ? a : b)
    selected.push(first)
    remaining.splice(remaining.indexOf(first), 1)
    while (selected.length < 7 && remaining.length) {
      let bestC = null, bestScore = -Infinity
      for (const c of remaining) {
        const sc = scoreOfSet(selected.concat([c]))
        if (sc > bestScore) { bestScore = sc; bestC = c }
      }
      selected.push(bestC)
      remaining.splice(remaining.indexOf(bestC), 1)
    }
    const slotToNum = {}
    for (const r of rows) slotToNum[r.slot] = r.num
    return selected.map((sl) => slotToNum[sl]).filter(Boolean)
  }, [calc, dna])

  // couverture MC du ticket optimisé
  const couverture = useMemo(() => {
    if (!calc || !ticketOpti.length) return null
    const rows = calc.rows
    const slotToNum = {}
    for (const r of rows) slotToNum[r.slot] = r.num
    const numToIdx = {}
    rows.forEach((r, i) => { numToIdx[r.num] = i })
    const ticketSlots = ticketOpti.map((n) => rows.find((r) => r.num === n)?.slot).filter(Boolean)
    const ticketIdx = ticketSlots.map((sl) => rows.findIndex((r) => r.slot === sl)).filter((i) => i >= 0)
    // poids pour sampling
    const w = rows.map((r) => r.pComb || 0)
    const wSum = w.reduce((a, b) => a + b, 0) || 1
    const wn = w.map((x) => x / wSum)
    const M = 3000
    const cov = [0, 0, 0, 0, 0, 0]  // cov[k] = nb sims with exactly k hits (0..5)
    for (let it = 0; it < M; it++) {
      const remaining = rows.map((_, i) => i)
      const wrem = wn.slice()
      const chosen = []
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
      const hits = chosen.filter((i) => ticketIdx.includes(i)).length
      cov[hits]++
    }
    const pAuMoins = (k) => cov.slice(k).reduce((a, b) => a + b, 0) / M
    return { p3: pAuMoins(3), p4: pAuMoins(4), p5: pAuMoins(5), M }
  }, [calc, ticketOpti, dna])

  // DNA : paires et triplets récurrents (depuis l'archive)

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 15% -10%, #16233c 0%, #04070f 55%)', fontFamily: SK.police, color: SK.texte }}>
      <Entete page="quinte" />
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '18px 16px 70px' }}>
        <h1 style={{ margin: 0, fontSize: 23, fontWeight: 900, color: '#fff' }}>⚡ Probabilité — qui finit dans les 5 ?</h1>
        <div style={{ fontSize: 12.5, color: '#94a3b8', margin: '8px 0 14px', lineHeight: 1.6 }}>
          Six méthodes. Chaque valeur est une <b>probabilité Top 5 réelle</b> : la somme sur tous les chevaux vaut <b>5 (500 %)</b>, pas 100 %.
        </div>

        {loading && <div style={{ padding: 20, color: SK.muted }}>Chargement…</div>}
        {err && <div style={{ padding: 20, color: '#fca5a5' }}>Indisponible : {err}.</div>}

        {data && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: SK.muted, display: 'flex', flexDirection: 'column', gap: 3 }}>
                Course (archive réelle)
                <select value={raceId} onChange={(e) => setRaceId(e.target.value)}
                  style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid ' + SK.bord, borderRadius: 7, padding: '5px 8px', fontSize: 12, minWidth: 320 }}>
                  {archive.length === 0 && <option value="">archive indisponible</option>}
                  {archive.map((r) => <option key={r.id} value={r.id}>{r.date} · {r.hippodrome} · {r.discipline} · {r.distance}m · {r.nbPartants}p</option>)}
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
                    ★ le ticket optimisé — combiné + DNA · {course.date} · {course.hippodrome} · 7 chevaux
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    {ticketOpti.map((num) => {
                      const r = calc.rows.find((x) => x.num === num)
                      return (
                        <span key={num} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: 44 }}>
                          <b style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{num}</b>
                          <span style={{ fontSize: 10, color: '#a4b8d6' }}>P{r ? r.slot : '?'}</span>
                        </span>
                      )
                    })}
                    <button type="button" onClick={() => { try { navigator.clipboard.writeText(ticketOpti.join(' ')); setCopie('copié'); setTimeout(() => setCopie(''), 1500) } catch (e) { setCopie('—') } }}
                      style={{ marginLeft: 'auto', background: 'transparent', color: SK.accent, border: '1px solid ' + SK.bord, borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                      {copie || 'copier'}
                    </button>
                  </div>
                  {couverture && (
                    <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>
                      Couverture estimée (Monte Carlo) : <b style={{ color: '#34d399' }}>{pc(couverture.p3)}</b> pour ≥3/5 ·{' '}
                      <b style={{ color: '#34d399' }}>{pc(couverture.p4)}</b> pour ≥4/5 · <b style={{ color: '#34d399' }}>{pc(couverture.p5)}</b> pour 5/5.
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#7a8ea9', marginTop: 6 }}>
                    Le gros chiffre = le <b>numéro du cheval</b> · « P » = sa place dans la synthèse de la presse (La grille).
                  </div>
                </div>

                {/* le ticket naïf pour comparaison */}
                <div style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid ' + SK.bord, background: 'rgba(255,255,255,.03)', marginBottom: 14, fontSize: 12, color: '#94a3b8' }}>
                  <b style={{ color: '#7a8ea9' }}>ticket naïf (les 7 favoris) pour comparaison :</b>{' '}
                  {calc.rows.slice(0, 7).map((r) => r.num).join(' · ')}
                </div>

                {/* le tableau des 6 probabilités */}
                <div style={{ ...SK.box, padding: 14, marginBottom: 14, boxShadow: '0 8px 24px rgba(124,58,237,.18)', overflowX: 'auto' }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#e9d5ff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .6 }}>
                    les 6 probabilités par cheval (P finit dans les 5 premiers)
                  </div>
                  <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 820 }}>
                    <thead>
                      <tr>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>n°</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>nom</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>P</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>① classique</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>② fréquentiste</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>③ conditionnelle</th>
                        <th style={{ ...SK.th, textAlign: 'left', padding: '5px 7px' }}>④ bayésienne</th>
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
                          <td style={{ ...SK.td, padding: '4px 7px' }}>
                            {pc(r.pFreq)}<br /><span style={{ fontSize: 9, color: '#5b6b85' }}>{r._succFreq}/{r._nFreq}</span>
                          </td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pCond)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pBayes)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pOdds)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px' }}>{pc(r.pMC)}</td>
                          <td style={{ ...SK.td, padding: '4px 7px', fontWeight: 900, color: '#e9d5ff' }}>{pc(r.pComb)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
                    <b>Somme des colonnes Top 5</b> ≈ 500 % (5 chevaux × 100 %). <b>fréquentiste</b> : succès/courses.{' '}
                    <b>Monte Carlo</b> : apparitions dans le top-5 / 5000. <b>combiné</b> = moyenne des méthodes dispo, normalisée à 500 %.
                  </div>
                </div>

                {/* les 6 méthodes */}
                <div style={{ ...SK.box, padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#e9d5ff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .6 }}>les 6 méthodes</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8, fontSize: 11.5, lineHeight: 1.55, color: '#cbd5e1' }}>
                    <div><b style={{ color: SK.accent }}>① classique</b> — P = 5/N (référence Top 5 équiprobable).</div>
                    <div><b style={{ color: SK.accent }}>② fréquentiste</b> — taux historique d'apparition de la case dans les 5 premiers.</div>
                    <div><b style={{ color: SK.accent }}>③ conditionnelle</b> — fréquence dans un contexte comparable (discipline, distance, partants).</div>
                    <div><b style={{ color: SK.accent }}>④ bayésienne</b> — prior fréquentiste × likelihood (forme, distance, piste, niveau, terrain, corde).</div>
                    <div><b style={{ color: SK.accent }}>⑤ odds</b> — P = 1/cote (Equidia), converti en probabilité Top 5. {calc.hasOdds ? 'Disponible.' : 'Indisponible pour cette course.'}</div>
                    <div><b style={{ color: SK.accent }}>⑥ Monte Carlo</b> — 5000 simulations d'un top-5 pondéré, comptage des apparitions.</div>
                  </div>
                </div>

                {/* DNA des paires et triplets */}
                {dna && (
                  <div style={{ ...SK.box, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#e9d5ff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .6 }}>
                      DNA — paires et triplets récurrents (sur {dna.N} Quintés passés)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: SK.muted, marginBottom: 4, fontWeight: 700 }}>paires les plus fréquentes (lift &gt; 1 = relation forte)</div>
                        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                          <thead><tr>
                            <th style={{ ...SK.th, padding: '4px 6px' }}>paire</th>
                            <th style={{ ...SK.th, padding: '4px 6px' }}>n</th>
                            <th style={{ ...SK.th, padding: '4px 6px' }}>freq</th>
                            <th style={{ ...SK.th, padding: '4px 6px' }}>P(B|A)</th>
                            <th style={{ ...SK.th, padding: '4px 6px' }}>lift</th>
                          </tr></thead>
                          <tbody>
                            {dna.pairs.map((p, i) => (
                              <tr key={i}>
                                <td style={{ ...SK.td, padding: '3px 6px', fontWeight: 700 }}>P{p.a} · P{p.b}</td>
                                <td style={{ ...SK.td, padding: '3px 6px' }}>{p.count}</td>
                                <td style={{ ...SK.td, padding: '3px 6px' }}>{pc(p.freq, 0)}</td>
                                <td style={{ ...SK.td, padding: '3px 6px' }}>{pc(p.pCond, 0)}</td>
                                <td style={{ ...SK.td, padding: '3px 6px', color: p.lift > 1.2 ? '#34d399' : '#a4b8d6', fontWeight: 700 }}>{num(p.lift)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: SK.muted, marginBottom: 4, fontWeight: 700 }}>triplets récurrents</div>
                        <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                          <thead><tr>
                            <th style={{ ...SK.th, padding: '4px 6px' }}>triplet</th>
                            <th style={{ ...SK.th, padding: '4px 6px' }}>n</th>
                            <th style={{ ...SK.th, padding: '4px 6px' }}>freq</th>
                          </tr></thead>
                          <tbody>
                            {dna.triples.map((t, i) => (
                              <tr key={i}>
                                <td style={{ ...SK.td, padding: '3px 6px', fontWeight: 700 }}>{t.combo.map((c) => 'P' + c).join(' · ')}</td>
                                <td style={{ ...SK.td, padding: '3px 6px' }}>{t.count}</td>
                                <td style={{ ...SK.td, padding: '3px 6px' }}>{pc(t.freq, 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
                      <b>lift</b> = P(A∩B) / (P(A)·P(B)). lift &gt; 1 = relation plus forte que l'indépendance.{' '}
                      <b>P(B|A)</b> = probabilité conditionnelle. Les combinaisons historiques sont des ensembles de 5 cases (sans ordre).
                    </div>
                  </div>
                )}

                {/* info */}
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                  Données : {data.N} courses réelles (archive) + {data.controle?.N || 96} autres Quintés (contrôle).{' '}
                  Leave-one-out : la course notée ne sert jamais à son propre classement.{' '}
                  Archive mise à jour : {String(data.genereLe || '').slice(0, 10)}.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
