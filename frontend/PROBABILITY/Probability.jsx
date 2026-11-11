import { useState, useEffect, useCallback, useMemo } from 'react'
import Entete from '../../src/Entete.jsx'
import { listArchive, syncDepuisDisque, buildGrid } from '../../src/lib/quinte.js'
import './probability.css'

/* =============================================================================
 * frontend/PROBABILITY/Probability.jsx — « DNA Probability P1 – P20 »
 *
 * Une affiche, pas un tableau de bord technique. Tout est mesuré sur l'archive
 * réelle (data/synthese.json), avec le MÊME buildGrid que /quinte → donc les
 * mêmes cases P.
 *
 * ⚠ P = la CASE du carnet (slot), PAS le rang de presse. Les zones sont celles
 *   de la grille : FAV P1-P4 · OUT P5-P8 · TOC P9-P10 · BIG_TOC P11-P12 ·
 *   EXTREME P13+. C'est écrit sur la page, pour que les deux axes ne se
 *   confondent jamais.
 *
 * Aucune donnée inventée : un chiffre absent s'affiche « — ».
 * ========================================================================== */

const ZONES = [
  { key: 'FAV', label: 'FAV', min: 1, max: 4, color: '#34d399', nom: 'favoris de la grille' },
  { key: 'OUT', label: 'OUT', min: 5, max: 8, color: '#38bdf8', nom: 'outsiders' },
  { key: 'TOC', label: 'TOC', min: 9, max: 10, color: '#fbbf24', nom: 'tocards' },
  { key: 'BIG_TOC', label: 'BIG TOC', min: 11, max: 12, color: '#a78bfa', nom: 'grands tocards' },
  { key: 'EXTREME', label: 'EXTREME', min: 13, max: 20, color: '#f472b6', nom: 'extrêmes' },
]

function zoneOf(slot) {
  return ZONES.find((z) => slot >= z.min && slot <= z.max) || ZONES[ZONES.length - 1]
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LA DISCIPLINE — une seule famille par course, la même règle que l'onglet
 * Statistiques de /quinte (normDisc).
 *
 * ⚠ 11/11/2026 — l'archive écrit la discipline de huit façons :
 *   « PLAT » 8 · « Plat » 8 · « Attelé » 10 · « ATTELE » 5 · « HAIE » 3 ·
 *   « STEEPLECHASE » 1 · « Steeple chase » 1 · « Haies » 1.
 *   Comparer la chaîne brute ne donnait que 8 courses « Plat » au lieu de 14,
 *   et zéro « Haies » visible. On range donc en famille, comme la Statistique.
 * ═══════════════════════════════════════════════════════════════════════════ */
const FAMILLES = ['plat', 'attelé', 'monté', 'haies']
const FAMILLE_LABEL = { plat: 'Plat', attelé: 'Attelé', monté: 'Monté', haies: 'Haies', autre: 'Autre' }

function familleDiscipline(d) {
  const s = String(d || '').toLowerCase().trim()
  if (s.startsWith('plat')) return 'plat'
  if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
  if (s.startsWith('mont')) return 'monté'
  if (s.startsWith('haie') || s.startsWith('steeple')) return 'haies'
  return s || 'autre'
}

const nf = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d).replace('.', ','))
const pct = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : nf(v * 100, d) + ' %')
const pctRaw = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : nf(v * 100, d) + '%')
const jour = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}
const cleDe = (rec) => {
  const c = rec && (rec.cle || rec.courseId)
  return /^\d{4}-\d{2}-\d{2}_R\d+_C\d+$/.test(String(c || '')) ? c : null
}

async function lireJson(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    const ct = (r.headers.get('content-type') || '').toLowerCase()
    if (!ct.includes('json')) return null
    return await r.json()
  } catch {
    return null
  }
}

/* Les meilleures combinaisons d'une taille donnée, classées par la SOMME des
 * taux mesurés de leurs cases. Ce n'est pas une probabilité conjointe : les
 * chevaux d'une même course ne sont pas indépendants (3 places de podium, 5 de
 * Quinté). C'est un ordre de force, et la page le dit. */
function meilleuresCombinaisons(pool, taille, cle, limite) {
  const n = pool.length
  const out = []
  if (n < taille) return out
  const cur = []
  const marcher = (dep) => {
    if (cur.length === taille) {
      let s = 0
      for (const p of cur) s += (p.c && p.c[cle]) || 0
      out.push({ items: cur.slice(), score: s })
      return
    }
    for (let i = dep; i <= n - (taille - cur.length); i++) {
      cur.push(pool[i])
      marcher(i + 1)
      cur.pop()
    }
  }
  marcher(0)
  out.sort((a, b) => b.score - a.score || a.items[0].slot - b.items[0].slot)
  return out.slice(0, limite)
}

function Box({ n, title, sub, extra, children, className = '' }) {
  return (
    <section className={`dna-box ${className}`}>
      <header className="dna-box-h">
        <span className="dna-num">{n}</span>
        <div className="dna-box-t">
          <h3>{title}</h3>
          {sub ? <p className="dna-sub">{sub}</p> : null}
        </div>
        {extra || null}
      </header>
      {children}
    </section>
  )
}

export default function Probability() {
  const [archive, setArchive] = useState([])
  const [pret, setPret] = useState(false)
  const [jockeys, setJockeys] = useState({})
  const [partants, setPartants] = useState([])
  const [disciplineFilter, setDisciplineFilter] = useState('Tout')
  // ⚠ 11/11/2026 — -1 = TOUT ce que le type de course contient dans les
  //   Statistiques. Ce n'est pas un réglage libre : le défaut est toujours
  //   « toutes les courses du type sélectionné ».
  const [courseLimit, setCourseLimit] = useState(-1)

  const rafraichir = useCallback(async () => {
    setPret(false)
    try {
      await syncDepuisDisque()
      setArchive(await listArchive())
    } catch {
      setArchive([])
    }
    setPret(true)
  }, [])
  useEffect(() => { rafraichir() }, [rafraichir])

  /* ── la base mesurable : arrivée de 5 chevaux + grille construite ───── */
  const base = useMemo(() => {
    const out = []
    for (const a of archive) {
      if (!a || !Array.isArray(a.arrivee) || a.arrivee.length < 5) continue
      const synthe = (a.synthese || []).filter((x) => Number.isFinite(Number(x))).map(Number)
      const runners = (a.runners || []).map(Number).filter(Number.isFinite)
      if (synthe.length < 5 || runners.length < 5) continue
      let g
      try { g = buildGrid(synthe, runners) } catch { continue }
      const sp = g.slotParNum || {}
      const slots = a.arrivee.slice(0, 5).map((n) => sp[n])
      if (slots.some((s) => !Number.isFinite(s))) continue
      out.push({
        date: a.date,
        max: g.max,
        slots,
        discipline: a.discipline || 'Tout',
        fam: familleDiscipline(a.discipline),
      })
    }
    return out.sort((x, y) => (x.date < y.date ? -1 : 1))
  }, [archive])

  /* ── combien de courses par famille de discipline — c'est EUX qui
   *    commandent le nombre de courses affiché, pas un réglage libre.
   *    (11/11/2026 : « le nombre est donné par le nombre de courses du type
   *    choisi présentes dans les statistiques, pas par toutes les courses ».) */
  const parFamille = useMemo(() => {
    const c = {}
    for (const x of base) c[x.fam] = (c[x.fam] || 0) + 1
    return c
  }, [base])

  const choixDiscipline = useMemo(
    () => ['Tout', ...FAMILLES.filter((f) => (parFamille[f] || 0) > 0)],
    [parFamille],
  )

  /* le pool = toutes les courses mesurables du type sélectionné */
  const dispo = disciplineFilter === 'Tout' ? base.length : (parFamille[disciplineFilter] || 0)

  /* la fenêtre réellement appliquée : jamais plus que ce que le type contient */
  const limiteEff = courseLimit < 0 ? dispo : Math.min(courseLimit, dispo)

  /* les fenêtres proposées : seulement celles plus petites que le pool */
  const courseLimitChoices = useMemo(
    () => [10, 20, 35, 50, 100].filter((b) => b < dispo),
    [dispo],
  )

  const filteredBase = useMemo(() => {
    let res = base
    if (disciplineFilter !== 'Tout') res = res.filter((c) => c.fam === disciplineFilter)
    if (limiteEff > 0 && res.length > limiteEff) res = res.slice(-limiteEff)
    return res
  }, [base, disciplineFilter, limiteEff])

  const N = filteredBase.length

  /* ── ① chaque case : présence, top 5, podium, victoire ──────────────── */
  const parCase = useMemo(() => {
    const rows = []
    for (let k = 1; k <= 20; k++) {
      let n = 0, top5 = 0, pod = 0, win = 0
      for (const c of filteredBase) {
        if (c.max < k) continue
        n++
        if (c.slots.includes(k)) top5++
        if (c.slots.slice(0, 3).includes(k)) pod++
        if (c.slots[0] === k) win++
      }
      rows.push({
        k, n, top5, pod, win,
        p5: n ? top5 / n : null,
        pp: n ? pod / n : null,
        pw: n ? win / n : null,
        zone: zoneOf(k),
      })
    }
    return rows
  }, [filteredBase])

  /* ── zones : part du Quinté, du podium et du vainqueur ──────────────── */
  const parZone = useMemo(() => ZONES.map((z) => {
    let cases = 0, vue = 0, top5 = 0, pod = 0, win = 0
    for (const c of filteredBase) {
      for (let k = z.min; k <= z.max; k++) if (c.max >= k) cases++
      for (const s of c.slots) if (s >= z.min && s <= z.max) top5++
      for (const s of c.slots.slice(0, 3)) if (s >= z.min && s <= z.max) pod++
      if (c.slots[0] >= z.min && c.slots[0] <= z.max) win++
    }
    vue = top5
    return {
      ...z,
      cases,
      p5: N ? top5 / (5 * N) : null,
      pp: N ? pod / (3 * N) : null,
      pw: N ? win / N : null,
      taux: cases ? top5 / cases : null,
    }
  }), [filteredBase, N])

  /* ── le filet : que couvrent les k premières cases ? ────────────────── */
  const filet = useMemo(() => {
    const out = {}
    for (const k of [5, 6, 7, 8, 10, 12, 14]) {
      const cs = filteredBase.filter((c) => c.max >= k)
      if (!cs.length) { out[k] = null; continue }
      const n = cs.length
      out[k] = {
        k, n,
        pod: cs.filter((c) => c.slots.slice(0, 3).every((s) => s <= k)).length / n,
        qui: cs.filter((c) => c.slots.every((s) => s <= k)).length / n,
        q4: cs.filter((c) => c.slots.filter((s) => s <= k).length >= 4).length / n,
      }
    }
    return out
  }, [filteredBase])

  /* ── ④ matrice : P(colonne au top 5 | ligne au top 5) ──────────────── */
  const matrice = useMemo(() => {
    const cells = []
    let maxi = 0
    for (let i = 1; i <= 20; i++) {
      const ligne = []
      for (let j = 1; j <= 20; j++) {
        if (i === j) { ligne.push(null); continue }
        let nI = 0, nBoth = 0
        for (const c of filteredBase) {
          if (c.max < i || c.max < j) continue
          const ai = c.slots.includes(i)
          if (!ai) continue
          nI++
          if (c.slots.includes(j)) nBoth++
        }
        const v = nI ? nBoth / nI : null
        if (v != null && v > maxi) maxi = v
        ligne.push(v)
      }
      cells.push(ligne)
    }
    return { cells, maxi: maxi || 1 }
  }, [filteredBase])

  /* ── ⑤ les combinaisons de Quinté réellement sorties ───────────────── */
  const combos = useMemo(() => {
    const m = new Map()
    for (const c of filteredBase) {
      const k = [...c.slots].sort((a, b) => a - b).join(' · ')
      m.set(k, (m.get(k) || 0) + 1)
    }
    const tous = [...m.entries()]
      .map(([k, v]) => ({ k, v }))
      .sort((a, b) => b.v - a.v || a.k.localeCompare(b.k, 'fr', { numeric: true }))
    return { tous, distinctes: tous.length }
  }, [filteredBase])

  /* ── ⑦ le ticket le plus récent + son réalisme mesuré ──────────────── */
  const ticketRec = useMemo(() => {
    const avec = archive.filter((a) => a && Array.isArray(a.ticket) && a.ticket.length >= 5)
    if (!avec.length) return null
    return avec.slice().sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1))[0]
  }, [archive])

  const ticket = useMemo(() => {
    if (!ticketRec) return null
    const synthe = (ticketRec.synthese || []).filter((x) => Number.isFinite(Number(x))).map(Number)
    const runners = (ticketRec.runners || []).map(Number).filter(Number.isFinite)
    if (!synthe.length) return null
    let g
    try { g = buildGrid(synthe, runners) } catch { return null }
    const noms = {}
    for (const s of (ticketRec.scores || [])) if (s && s.num != null) noms[Number(s.num)] = s.nom
    const lignes = ticketRec.ticket.map((num) => ({
      num: Number(num),
      nom: noms[Number(num)] || '',
      slot: g.slotParNum[num],
    })).filter((l) => Number.isFinite(l.slot))
    if (!lignes.length) return null
    const set = new Set(lignes.map((l) => l.slot))
    const pod = N ? filteredBase.filter((c) => c.slots.slice(0, 3).every((s) => set.has(s))).length / N : null
    const qui = N ? filteredBase.filter((c) => c.slots.every((s) => set.has(s))).length / N : null
    const win = N ? filteredBase.filter((c) => set.has(c.slots[0])).length / N : null
    /* tout le peloton cité par la presse — chaque case P reçoit son cheval,
       pas seulement les 8 du ticket. Le nom vient des scores du moteur. */
    const pelotonBase = Object.entries(g.slotParNum || {})
      .map(([num, slot]) => ({ num: Number(num), nom: noms[Number(num)] || '', slot: Number(slot) }))
      .filter((h) => Number.isFinite(h.slot) && h.slot <= g.max)
      .sort((a, b) => a.slot - b.slot || a.num - b.num)
    return {
      rec: ticketRec, lignes, pod, qui, win, cle: cleDe(ticketRec),
      sp: g.slotParNum || {}, max: g.max, pelotonBase,
    }
  }, [ticketRec, filteredBase, N])

  /* ── les jockeys / drivers, lus dans la fiche de la course ──────────── */
  useEffect(() => {
    let vivant = true
    async function charger() {
      if (!ticket || !ticket.cle) return
      const m = /^(\d{4}-\d{2}-\d{2})_(R\d+)_(C\d+)$/.exec(ticket.cle)
      if (!m) return
      const [, date, rn, cn] = m
      let pays = null
      const prog = await lireJson(`/data/reu/prog-${date}.json`)
      for (const re of (prog && prog.reunions) || []) {
        for (const c of (re.courses || [])) {
          if (String(c.reunion) === rn && String(c.code) === cn) pays = c.pays || re.pays
        }
      }
      const essais = [...new Set([pays, 'FR', 'MA', 'BE', 'GB', 'CH', 'IT', 'ES'].filter(Boolean))]
      let fiche = null
      for (const p of essais) {
        const j = await lireJson(`/data/reu/${ticket.cle}_${p}.json`)
        const ps = j && (j.participants || j.runners)
        if (ps && ps.length) { fiche = ps; break }
      }
      if (!vivant || !fiche) return
      const out = {}
      for (const p of fiche) {
        const nom = p.jockey || p.driver || ''
        if (p.num != null && nom) out[Number(p.num)] = nom
      }
      setJockeys(out)
      /* le peloton complet de la course, avec sa case — pool des combinaisons */
      const sp = ticket.sp || {}
      const max = ticket.max || 0
      const pel = []
      for (const p of fiche) {
        const num = Number(p.num)
        const slot = sp[num]
        if (!Number.isFinite(slot) || slot > max) continue
        const nom = String(p.cheval || p.nom || '').trim()
        if (!nom) continue
        pel.push({ num, nom, jockey: p.jockey || p.driver || '', slot })
      }
      pel.sort((a, b) => a.slot - b.slot || a.num - b.num)
      setPartants(pel)
    }
    charger()
    return () => { vivant = false }
  }, [ticket])

  /* ── dérivés d'affichage ───────────────────────────────────────────── */
  const dateAnalyse = useMemo(() => {
    const ds = archive.map((a) => String(a && a.date || '')).filter(Boolean).sort()
    return ds.length ? ds[ds.length - 1] : ''
  }, [archive])

  const top5Rows = useMemo(() => {
    const seuil = Math.max(8, Math.round(N * 0.2))
    return parCase.filter((r) => r.n >= seuil).sort((a, b) => b.p5 - a.p5).slice(0, 12)
  }, [parCase, N])

  const winRows = useMemo(
    () => parCase.filter((r) => r.win > 0 && r.n >= Math.max(8, Math.round(N * 0.2))).sort((a, b) => b.win - a.win || b.pw - a.pw).slice(0, 6),
    [parCase, N]
  )

  const p1 = parCase[0]
  const solides = parCase.filter((r) => r.n >= Math.max(8, Math.round(N * 0.2)) && r.p5 >= 0.45).sort((a, b) => b.p5 - a.p5)
  const zFav = parZone[0]
  const zOut = parZone[1]
  const zHaut = parZone.slice(2)
  const partHaut5 = zHaut.reduce((s, z) => s + (z.p5 || 0), 0)
  /* P11+ : les mêmes chiffres, mais mesurés et non déduits */
  const gain11 = parCase.filter((r) => r.k >= 11).reduce((s, r) => s + r.win, 0)
  const pod11 = parCase.filter((r) => r.k >= 11).reduce((s, r) => s + r.pod, 0)
  const partPod11 = N ? pod11 / (3 * N) : null
  const coursesAvecP11 = useMemo(
    () => (N ? filteredBase.filter((c) => c.slots.some((s) => s >= 11)).length / N : null),
    [filteredBase, N]
  )
  const f8 = filet[8]
  const f12 = filet[12]
  const maxP5 = Math.max(0.0001, ...parCase.map((r) => r.p5 || 0))

  /* ── le peloton de la course du ticket : pool des combinaisons ──────── */
  /* la base = TOUS les chevaux cités (16 ici), pas seulement les 8 du ticket ;
     la fiche complète le nom et le jockey quand elle est disponible. */
  const peloton = useMemo(() => {
    const base = (ticket && ticket.pelotonBase) || []
    const fiche = new Map(partants.map((p) => [p.num, p]))
    if (!base.length) {
      if (partants.length) return partants
      if (!ticket) return []
      return ticket.lignes.map((l) => ({
        num: l.num, nom: l.nom, jockey: jockeys[l.num] || '', slot: l.slot,
      }))
    }
    return base
      .map((h) => {
        const f = fiche.get(h.num)
        return {
          num: h.num,
          slot: h.slot,
          nom: (f && f.nom) || h.nom || '',
          jockey: (f && f.jockey) || jockeys[h.num] || '',
        }
      })
      .filter((h) => h.nom)
  }, [partants, ticket, jockeys])

  const analyse = useMemo(() => {
    const pool = peloton.map((h) => ({ ...h, c: parCase[h.slot - 1] || null }))
    if (!pool.length) return null
    const gagne = pool
      .filter((h) => h.c && h.c.pw != null)
      .sort((a, b) => b.c.pw - a.c.pw || b.c.p5 - a.c.p5 || a.slot - b.slot)
      .slice(0, 3)
    return {
      pool,
      gagne,
      trios: meilleuresCombinaisons(pool, 3, 'pp', 5),
      quintes: meilleuresCombinaisons(pool, 5, 'p5', 3),
    }
  }, [peloton, parCase])

  const heat = (v) => {
    if (v == null) return 'transparent'
    const t = Math.max(0, Math.min(1, v / matrice.maxi))
    return `rgba(56,189,248,${(0.05 + t * 0.72).toFixed(3)})`
  }

  if (!pret) {
    return (
      <>
        <Entete page="probability" />
        <div className="dna-page"><p className="dna-attente">Chargement de l’archive…</p></div>
      </>
    )
  }

  if (!N) {
    return (
      <>
        <Entete page="probability" />
        <div className="dna-page">
          <p className="dna-attente">
            Aucune course exploitable dans l’archive (il faut une arrivée de 5 chevaux et une Synthèse).
            <button type="button" className="dna-retry" onClick={rafraichir}>↻ Actualiser</button>
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <Entete page="probability" />
      <div className="dna-page" dir="ltr">

        {/* ═══════════════════ BANDEAU ═══════════════════ */}
        <header className="dna-banner">
          <div className="dna-photo"><img src="/logo-horse.png" alt="" /></div>

          <div className="dna-title">
            <h1>DNA Probability</h1>
            <h2>P1 – P20</h2>
            <div className="dna-ribbon">
              {N} courses{disciplineFilter !== 'Tout' ? ' ' + FAMILLE_LABEL[disciplineFilter] : ''} · Analyse du {jour(dateAnalyse)} · {limiteEff >= dispo ? `tout le registre (${dispo})` : `les ${limiteEff} dernières sur ${dispo}`}
            </div>
            <div style={{marginRight: 20, marginBottom: 10}}>
              <label style={{marginRight: 10}}>Courses : </label>
              <select
                value={courseLimit < 0 || courseLimit > dispo ? -1 : courseLimit}
                onChange={(e) => setCourseLimit(Number(e.target.value))}
                style={{padding: '4px 8px', fontSize: '12px'}}>
                <option value={-1}>toutes ({dispo})</option>
                {courseLimitChoices.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{marginRight: 20, marginBottom: 10}}>
              <label>Discipline : </label>
              <select
                value={disciplineFilter}
                onChange={(e) => { setDisciplineFilter(e.target.value); setCourseLimit(-1) }}
                style={{padding: '4px 8px', fontSize: '12px'}}>
                {choixDiscipline.map((f) => (
                  <option key={f} value={f}>
                    {f === 'Tout' ? `Tout (${base.length})` : `${FAMILLE_LABEL[f]} (${parFamille[f]})`}
                  </option>
                ))}
              </select>
            </div>
            <p className="dna-question">Qui prend les 3 ? Qui prend les 5 ?</p>
          </div>

          <div className="dna-brand">
            <img src="/logo.svg" alt="Bahja TURF" />
            <span>Analyse · Stratégie · Performance</span>
          </div>
        </header>

        {/* ═══════════════════ COMMENCER ICI ═══════════════════ */}
        <section className="dna-howto">
          <div className="dna-howto-t">
            <h3>Commencer ici — c’est quoi « P » ?</h3>
            <p>
              Avant la course, la presse cite les chevaux <b>dans un ordre</b>. Cet ordre est
              rangé en <b>cases</b> numérotées <b>P1</b>, <b>P2</b> … <b>P20</b> — les cases du
              carnet. <b>P1</b> = le cheval cité en premier, <b>P2</b> = le deuxième, et ainsi de
              suite. <b>P est donc une place dans la grille, pas une cote et pas un numéro de
              selle.</b> Chaque case reçoit ensuite une couleur — son groupe — et c’est cette
              couleur qui décide combien de chevaux du groupe entrent dans le ticket.
            </p>
          </div>

          <div className="dna-places" role="img" aria-label="les 20 cases P1 à P20 et leur taux d’arrivée dans les 5">
            {parCase.map((r) => {
              const horseInfo = peloton.find((h) => h.slot === r.k)
              return (
                <div className="dna-place" key={r.k} style={{ '--zc': r.zone.color }}
                  title={`P${r.k}${horseInfo ? ' · ' + horseInfo.num + ' ' + horseInfo.nom : ''} · ${r.zone.nom} · vu ${r.n} fois · ${r.top5} arrivées dans les 5`}>
                  <span className="dna-place-v">{pctRaw(r.p5, 0)}</span>
                  <span className="dna-place-track">
                    <b style={{ height: `${Math.round(((r.p5 || 0) / maxP5) * 100)}%` }} />
                  </span>
                  <span className="dna-place-lab">
                    <b>{horseInfo ? horseInfo.num : 'P'}</b>
                    <em>{horseInfo ? (horseInfo.nom || '—') : r.k}</em>
                  </span>
                </div>
              )
            })}
          </div>
          <p className="dna-places-c">hauteur de la barre = <b>P(arriver dans les 5)</b> de la case, mesuré sur {N} courses</p>

          <div className="dna-zones-b">
            {parZone.map((z) => (
              <div className="dna-zone-chip" key={z.key} style={{ '--zc': z.color }}>
                <span className="dna-zone-h"><i />{z.label}</span>
                <span className="dna-zone-p">P{z.min} – P{z.max}</span>
                <span className="dna-zone-n">{z.nom}</span>
                <span className="dna-zone-m">{pct(z.p5, 0)} des arrivants · {pct(z.pw, 0)} des vainqueurs</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════ LIGNE 0 — LE DUEL ET LES COMBINAISONS ═══════════════════ */}
        <div className="dna-row0">

          <Box n="A" title="Qui joue la gagne ?" className="dna-b0 dna-duel"
            sub={peloton.length ? `les 3 chevaux de ${ticket ? ticket.rec.hippodrome || 'la course' : 'la course'} dont la case gagne le plus souvent` : 'la fiche des partants n’est pas disponible'}>
            {analyse && analyse.gagne.length ? (
              <ol className="dna-duel-list">
                {analyse.gagne.map((h, i) => (
                  <li key={h.num}>
                    <span className="dna-duel-r">{i + 1}</span>
                    <span className="dna-duel-num">{h.num}</span>
                    <span className="dna-duel-txt">
                      <b>{h.nom}</b>
                      <em>{h.jockey || '—'}</em>
                    </span>
                    <span className="dna-duel-p">
                      <b>{pct(h.c.pw, 1)}</b>
                      <em>{h.num} · {h.nom} · P{h.slot} · {pct(h.c.p5, 0)} top 5</em>
                    </span>
                  </li>
                ))}
              </ol>
            ) : <p className="dna-vide">—</p>}
            <p className="dna-duel-n">
              Le pourcentage est celui de la <b>case</b> du cheval : sur {N} courses, les chevaux
              de cette case ont gagné ce nombre de fois. Deux chevaux qui partagent la même case
              ont donc le même chiffre — c’est une mesure, pas un pronostic.
            </p>
          </Box>

          <Box n="B" title="Les 5 trios les plus forts" className="dna-b0 dna-cb"
            sub="3 chevaux, les meilleures cases du peloton">
            {analyse && analyse.trios.length ? (
              <ul className="dna-cb-list">
                {analyse.trios.map((t, i) => (
                  <li key={t.items.map((x) => x.num).join('-')}>
                    <span className="dna-cb-r">{i + 1}</span>
                    <span className="dna-cb-set">
                      {t.items.map((h) => (
                        <span className="dna-cb-chip" key={h.num} title={`${h.nom} — ${h.jockey || '—'}`}>
                          <b>{h.num}</b>{h.nom}
                        </span>
                      ))}
                    </span>
                    <span className="dna-cb-s">
                      <b>{nf(t.score, 2)}<i>/ 3</i></b>
                      <em>trio</em>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="dna-vide">—</p>}
            <p className="dna-cb-n">
              Le score <b>additionne les taux de podium des 3 cases</b> ({pct(1, 0)} par case au
              maximum). Ce n’est <b>pas</b> une probabilité conjointe : sur une course il n’y a que
              <b> 3 places</b> de podium, et les chevaux ne sont pas indépendants.
            </p>
          </Box>

          <Box n="C" title="Les 3 quintés les plus forts" className="dna-b0 dna-cb"
            sub="5 chevaux, les meilleures cases du peloton">
            {analyse && analyse.quintes.length ? (
              <ul className="dna-cb-list dna-cb-list5">
                {analyse.quintes.map((q, i) => (
                  <li key={q.items.map((x) => x.num).join('-')}>
                    <span className="dna-cb-r">{i + 1}</span>
                    <span className="dna-cb-set">
                      {q.items.map((h) => (
                        <span className="dna-cb-chip" key={h.num} title={`${h.nom} — ${h.jockey || '—'}`}>
                          <b>{h.num}</b>{h.nom}
                        </span>
                      ))}
                    </span>
                    <span className="dna-cb-s">
                      <b>{nf(q.score, 2)}<i>/ 5</i></b>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="dna-vide">—</p>}
            <p className="dna-cb-n">
              Même lecture avec <b>P(arriver dans les 5)</b>. Un Quinté demande les <b>5 bons
              chevaux</b> : à 8 chevaux la mesure plafonne autour de 12 % des courses — la
              largeur du ticket compte plus que l’ordre.
            </p>
          </Box>

        </div>

        {/* ═══════════════════ LIGNE 1 ═══════════════════ */}
        <div className="dna-row1">

          <Box n="1" title="Probabilités d’accès au Top 5" className="dna-b1">
            <table className="dna-t dna-t5">
              <thead>
                <tr>
                  <th>Cheval</th>
                  <th>n / {N}</th>
                  <th className="bar-col" aria-label="barre" />
                  <th className="r">P(top5 | N)</th>
                </tr>
              </thead>
              <tbody>
                {top5Rows.map((r) => {
                  const caseInfo = parCase[r.k - 1]
                  const horseInfo = peloton.find(h => h.slot === r.k)
                  return (
                    <tr key={r.k}>
                      <td className="case">
                        {horseInfo ? (
                          <div>
                            <span className="dna-duel-num">{horseInfo.num}</span>
                            <span className="dna-duel-txt">
                              <b>{horseInfo.nom || '—'}</b>
                              <em>{horseInfo.jockey || '—'}</em>
                            </span>
                          </div>
                        ) : (
                          <span>
                            <i className="dna-dot" style={{ background: r.zone.color }} />P{r.k}
                          </span>
                        )}
                      </td>
                      <td className="num">{r.top5} / {r.n}</td>
                      <td className="bar-col">
                        <span className="dna-bar">
                          <b style={{ width: `${Math.round((r.p5 || 0) * 100)}%`, background: r.zone.color }} />
                        </span>
                      </td>
                      <td className="r fort">{pct(r.p5)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="dna-legende">
              La case correspond au numéro de la case du carnet. n = courses où la case existait.
              Les chevaux sont ceux du peloton de la course du ticket.
            </p>
          </Box>

          <Box n="2" title="Les 3 et les 5 ensemble" className="dna-b2">
            <table className="dna-t dna-t35">
              <thead>
                <tr>
                  <th>Cheval(s)</th>
                  <th className="r">Podium<br /><span>(3)</span></th>
                  <th className="r">Quinté<br /><span>(5)</span></th>
                  <th className="r">≥ 4<br /><span>sur 5</span></th>
                </tr>
              </thead>
              <tbody>
                {[5, 6, 7].map((k) => {
                  const f = filet[k]
                  if (!f) return null
                  // Build list of horses for the first k cases
                  const chevauxK = peloton.filter((h) => h.slot >= 1 && h.slot <= k).sort((a, b) => a.slot - b.slot)
                  const chevauxText = chevauxK.length
                    ? chevauxK.map((h) => `${h.num} · ${h.nom}`).join(' · ')
                    : '—'
                  return (
                    <tr key={k} className={k === 7 ? 'on' : ''}>
                      <td className="gros">
                        {chevauxText}
                      </td>
                      <td className="r">{pct(f.pod)}</td>
                      <td className="r">{pct(f.qui)}</td>
                      <td className="r">{pct(f.q4)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {f8 ? (
              <div className="dna-gold">
                <span className="ic">◎</span>
                <div>
                  <b>{8} cases (Top-8) :</b><br />
                  {pct(f8.pod, 1)} du podium · <b>{pct(f8.qui, 1)} du Quinté</b>
                </div>
              </div>
            ) : null}
            <p className="dna-legende">
              Lecture : les k premières cases du carnet, podium entier (3/3) et Quinté entier (5/5).
            </p>
          </Box>

          <Box n="3" title="Les victoires par case" className="dna-b3">
            <table className="dna-t dna-twin">
              <thead>
                <tr><th>Case</th><th className="r">Victoires</th></tr>
              </thead>
              <tbody>
                {winRows.map((r, i) => {
                  const h = peloton.find((x) => x.slot === r.k)
                  return (
                    <tr key={r.k}>
                      <td className="case">
                        {i === 0 ? <span className="dna-crown" title="la case qui gagne le plus">👑</span> : <span className="dna-crown-vide" />}
                        <i className="dna-dot" style={{ background: r.zone.color }} />
                        {h ? (
                          <span className="dna-case-lab"><b>{h.num}</b> {h.nom || '—'} <em>P{r.k}</em></span>
                        ) : `P${r.k}`}
                      </td>
                      <td className="r gros">{r.win}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="dna-legende">
              P(1er) de la case : {pct(p1.win / (p1.n || 1))} en P1, sur {p1.n} courses.
            </p>
          </Box>

          {/* ── À RETENIR + les chiffres des zones ── */}
          <section className="dna-note">
            <header>
              <span className="bulb">💡</span>
              <h3>À retenir</h3>
            </header>
            <ul>
              <li>
                <span className="ok">✔</span>
                <span>
                  <b>{peloton.find((h) => h.slot === 1) ? `${peloton.find((h) => h.slot === 1).num} · ${peloton.find((h) => h.slot === 1).nom}` : 'la case P1'}</b>
                  {' '}reste la référence avec <b>{pct(p1.p5)}</b> d’accès au Top 5.
                </span>
              </li>
              {solides.length ? (
                <li>
                  <span className="ok">✔</span>
                  <span>
                    {solides.slice(0, 5).map((r) => {
                      const h = peloton.find((x) => x.slot === r.k)
                      return h ? `${h.num} ${h.nom || ''}`.trim() : `P${r.k}`
                    }).join(', ')} sont très présentes
                    ({pct(solides[solides.length - 1].p5)} – {pct(solides[0].p5)}).
                  </span>
                </li>
              ) : null}
              <li>
                <span className="ok">✔</span>
                <span>
                  <b>P11+</b> a gagné <b>{gain11}</b> fois sur {N} et prend{' '}
                  <b>{pod11}</b> places de podium sur {3 * N} ({pct(partPod11)}).
                </span>
              </li>
              <li>
                <span className="ok">✔</span>
                <span>Le Quinté inclut <b>{pct(partHaut5)}</b> de cases P9 et +.</span>
              </li>
            </ul>

            <div className="dna-zones">
              <div className="zr zh">
                <span>Zone</span><span>Cases</span><span>% Quinté</span><span>% 1er</span>
              </div>
              {parZone.map((z) => (
                <div className="zr" key={z.key}>
                  <span className="zl" style={{ color: z.color }}>
                    <i className="dna-dot" style={{ background: z.color }} />{z.label}
                  </span>
                  <span className="zr-range">P{z.min}{z.max > z.min ? `-P${z.max}` : ''}</span>
                  <span className="zr-v">{pct(z.p5)}</span>
                  <span className="zr-v">{pct(z.pw)}</span>
                </div>
              ))}
              <p className="znote">
                FAV / OUT / TOC / BIG TOC / EXTREME = les 5 groupes de la grille.
                « % Quinté » = part des 5 arrivants · « % 1er » = part des vainqueurs.
              </p>
            </div>
          </section>
        </div>

        {/* ═══════════════════ LIGNE 2 ═══════════════════ */}
        <div className="dna-row2">

          <Box n="4" title="Matrice DNA — corrélations entre P1 et P20" className="dna-b4">
            <div className="dna-mx-wrap">
              <table className="dna-mx">
                <thead>
                  <tr>
                    <th className="corner">P</th>
                    {Array.from({ length: 20 }, (_, i) => <th key={i}>P{i + 1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {matrice.cells.map((ligne, i) => (
                    <tr key={i}>
                      <th className="row-h">P{i + 1}</th>
                      {ligne.map((v, j) => (
                        <td
                          key={j}
                          className={i === j ? 'diag' : ''}
                          style={i === j ? undefined : { background: heat(v) }}
                          title={v == null ? undefined : `P(colonne au top 5 | ligne au top 5) = ${pct(v)}`}
                        >
                          {i === j ? '·' : v == null ? '—' : Math.round(v * 100)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="dna-scale">
                <span>{pctRaw(matrice.maxi, 0)}</span>
                <b />
                <span>{pctRaw(matrice.maxi / 2, 0)}</span>
                <b />
                <span>0%</span>
              </div>
            </div>
            <p className="dna-legende">
              Une case = P(la colonne finit dans le Top 5 quand la ligne y est) ·
              une carte pour visualiser les liens entre les cases : un outil, pas une certitude.
            </p>
          </Box>

          <div className="dna-col">
            <Box n="5" title="Les combinaisons de Quinté" sub={`${combos.distinctes} combinaisons distinctes sur ${N} courses`} className="dna-b5">
              <table className="dna-t dna-combos">
                <thead>
                  <tr><th className="r">#</th><th>Combinaison (5 P)</th><th className="r">Fréquence</th></tr>
                </thead>
                <tbody>
                  {combos.tous.slice(0, 4).map((c, i) => (
                    <tr key={c.k}>
                      <td className="r dim">{i + 1}</td>
                      <td className="mono">{c.k}</td>
                      <td className="r">{pct(c.v / N)}</td>
                    </tr>
                  ))}
                  {combos.tous.length > 4 ? (
                    <tr className="sep">
                      <td className="r dim">…</td>
                      <td className="dim">
                        ({combos.tous.length - 4} autres combinaisons)
                      </td>
                      <td className="r dim">
                        {pct(combos.tous.slice(4).reduce((s, c) => s + c.v, 0) / N)}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              <p className="dna-legende">Les cases des 5 arrivants, triées, telles qu’elles sont sorties.</p>
            </Box>

            <Box n="6" title="Le filet — combien de cases ?" className="dna-b6">
              <table className="dna-t dna-filet">
                <thead>
                  <tr><th>N</th><th className="r">Podium</th><th className="r">Quinté</th><th className="r">≥ 4 / 5</th></tr>
                </thead>
                <tbody>
                  {[8, 10, 12].map((k) => {
                    const f = filet[k]
                    if (!f) return null
                    const chevauxK = peloton
                      .filter((h) => h.slot >= 1 && h.slot <= k)
                      .sort((a, b) => a.slot - b.slot)
                    return (
                      <tr key={k}>
                        <td className="gros">
                          <b className="dna-kc">{k}</b>
                          {chevauxK.length ? (
                            <span className="dna-kc-list">
                              {chevauxK.map((h) => (
                                <span key={h.num} className="dna-kc-h" title={`${h.num} · ${h.nom}${h.jockey ? ' · ' + h.jockey : ''} — case P${h.slot}`}>
                                  <b>{h.num}</b>
                                  <em>P{h.slot}</em>
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </td>
                        <td className="r">{pct(f.pod)}</td>
                        <td className="r">{pct(f.qui)}</td>
                        <td className="r">{pct(f.q4)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="dna-legende">
                Les k premières cases, mesurées sur {f12 ? f12.n : N} courses où elles existent toutes.
              </p>
            </Box>
          </div>

          <Box n="7" title="Ticket recommandé" className="dna-b7">
            {ticket ? (
              <>
                <p className="dna-course">
                  Course : <b>{jour(ticket.rec.date)}</b>
                  {ticket.rec.hippodrome ? ` · ${ticket.rec.hippodrome}` : ''}
                  {ticket.rec.discipline ? ` · ${ticket.rec.discipline}` : ''}
                  {ticket.rec.distance ? ` · ${ticket.rec.distance} m` : ''}
                </p>
                <div className="dna-ticket">
                  <div className="dna-tk-h">
                    <span>N°</span><span>Cheval · jockey</span><span className="r">Case</span><span className="r">Top 5</span>
                  </div>
                  {ticket.lignes.map((l) => {
                    const c = parCase[l.slot - 1]
                    return (
                      <div className="dna-tk-row" key={l.num}>
                        <span className="num">{l.num}</span>
                        <span className="nom">
                          {l.nom || <i className="dim">nom non publié</i>}
                          <em>{jockeys[l.num] || '—'}</em>
                        </span>
                        <span className="case" style={{ color: zoneOf(l.slot).color }}>
                          P{l.slot}
                        </span>
                        <span className="pc">{c ? pct(c.p5) : '—'}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="dna-trophy">
                  <div className="cup">🏆</div>
                  <div className="t3">
                    <b>{pct(ticket.pod)}</b>
                    <span>du podium</span>
                  </div>
                  <div className="t3">
                    <b>{pct(ticket.qui)}</b>
                    <span>du Quinté</span>
                  </div>
                  <div className="t3 petit">
                    <b>{pct(ticket.win)}</b>
                    <span>le gagnant dans le ticket</span>
                  </div>
                </div>
                <p className="dna-legende">
                  Ces 8 cases, rejouées sur {N} courses : la part de podiums et de Quintés entiers
                  qu’elles auraient attrapés.
                </p>
              </>
            ) : (
              <p className="dna-legende">Aucun ticket dans l’archive.</p>
            )}
          </Box>
        </div>

        {/* ═══════════════════ BANDEAU BAS ═══════════════════ */}
        <div className="dna-row3">
          <div className="dna-card">
            <span className="ico">📊</span>
            <div>
              <b>Les points clés</b>
              <ul>
                <li><span className="ok">✔</span> FAV (P1-P4) : <b>{pct(zFav.pw)}</b> des vainqueurs</li>
                <li><span className="ok">✔</span> OUT (P5-P8) : <b>{pct(zOut.pw)}</b> des vainqueurs</li>
              </ul>
            </div>
          </div>

          <div className="dna-card">
            <span className="ico">⭐</span>
            <div>
              <b>Le bas de la presse compte !</b>
              <ul>
                <li>P9 et + : <b>{pct(partHaut5)}</b> du Quinté</li>
                <li><b>{pct(coursesAvecP11)}</b> des courses ont au moins un P11+</li>
              </ul>
            </div>
          </div>

          <div className="dna-card">
            <span className="ico">🔍</span>
            <div>
              <b>À améliorer</b>
              <p>
                Affiner les relations entre cases, ajouter des courses et intégrer le contexte
                (discipline, distance, terrain) — {N} courses, c’est une base, pas une preuve.
              </p>
            </div>
          </div>

          <div className="dna-card or">
            <span className="ico">🏁</span>
            <div>
              <b>Une analyse fiable,<br />basée sur {N} courses réelles</b>
              <p className="dna-src">
                Archive mesurée · P = la case du carnet · aucun chiffre inventé.
              </p>
            </div>
          </div>
        </div>

        <footer className="dna-footer">
          <p>
            <b>{N} courses</b> retenues (arrivée de 5 chevaux + Synthèse) · mêmes cases que la grille /quinte
            (buildGrid) · <b>P = la CASE du carnet</b>, pas le rang de presse · fréquences observées, sans lissage.
            Dernière course de l’archive : {jour(dateAnalyse)}.
          </p>
          <button type="button" className="dna-retry" onClick={rafraichir}>↻ Recalculer</button>
        </footer>
      </div>
    </>
  )
}
