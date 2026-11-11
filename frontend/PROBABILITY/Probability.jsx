import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Entete from '../../src/Entete.jsx'
import { listArchive, syncDepuisDisque, buildGrid } from '../../src/lib/quinte.js'
import './probability.css'

/* =============================================================================
 * frontend/PROBABILITY/Probability.jsx — « les cases P »
 *
 * Page refaite de zéro (11/11/2026). Elle ne fait QUE deux choses :
 *
 *   ① on choisit un TYPE de course et une DISTANCE (les deux seuls filtres) ;
 *   ② on lit le MOUVEMENT des cases dans chaque résultat : la case du 1er,
 *      du 2e … du 5e, l'écart entre elles, l'étalement, la couverture.
 *
 * ⚠ P = la CASE du carnet (slotParNum de buildGrid), PAS le rang de presse.
 *   Les cases sont celles de /quinte — même buildGrid, donc même lecture.
 *
 * Aucune donnée inventée : un chiffre absent s'affiche « — ».
 * ========================================================================== */

/* les fiches de course (jockeys) sont lues une fois pour toutes */
const FICHE_CACHE = new Map()

const ZONES = [
  { cle: 'fav', nom: 'FAV', min: 1, max: 4 },
  { cle: 'out', nom: 'OUT', min: 5, max: 8 },
  { cle: 'toc', nom: 'TOC', min: 9, max: 10 },
  { cle: 'big', nom: 'BIG', min: 11, max: 12 },
  { cle: 'ext', nom: 'EXT', min: 13, max: 99 },
]
const zoneDe = (k) => ZONES.find((z) => k >= z.min && k <= z.max) || ZONES[4]

const FAMILLES = ['plat', 'attelé', 'monté', 'haies']
const FAMILLE_LABEL = { plat: 'Plat', attelé: 'Attelé', monté: 'Monté', haies: 'Haies' }

function familleDiscipline(d) {
  const s = String(d || '').toLowerCase().trim()
  if (s.startsWith('plat')) return 'plat'
  if (s.startsWith('attel') || s.startsWith('trot')) return 'attelé'
  if (s.startsWith('mont')) return 'monté'
  if (s.startsWith('haie') || s.startsWith('steeple')) return 'haies'
  return 'autre'
}

const nf = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(d).replace('.', ','))
const pc = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : nf(v * 100, d) + ' %')
const jour = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}
/* La clé de la course : « AAAA-MM-JJ_Rn_Cm ».
 * ⚠ l'archive porte DEUX clés : `courseId` (celle du moteur, écrite par le
 *   job) et `cle` (celle de la fiche de course). Elles peuvent diverger — la
 *   `cle` est écrite par la PAGE, et elle a pu rester sur une course devinée.
 *   On prend donc `courseId` quand il est déjà de cette forme, et `cle`
 *   sinon : la fiche des noms de chevaux doit être celle de la course
 *   analysée. */
const cleDe = (rec) => {
  const c = rec || {}
  const Eq = /^\d{4}-\d{2}-\d{2}_R\d+_C\d+$/
  if (Eq.test(String(c.courseId || ''))) return c.courseId
  if (Eq.test(String(c.cle || ''))) return c.cle
  return null
}

/* les distances réellement présentes dans UNE liste, groupées quand l'écart
   entre deux distances voisines est ≤ 300 m. On groupe TOUJOURS par famille :
   sinon 1200 m (plat) et 3100 m (plat) se retrouvent dans la même bande que
   2175 m (attelé), et la tranche ne veut plus rien dire. */
function grouper(liste) {
  const ds = [...new Set(liste.map((c) => c.dist).filter((d) => Number.isFinite(d) && d > 0))]
    .sort((a, b) => a - b)
  const out = []
  for (const d of ds) {
    const last = out[out.length - 1]
    if (last && d - last.max <= 300) last.max = d
    else out.push({ min: d, max: d })
  }
  for (const b of out) {
    b.n = liste.filter((c) => c.dist >= b.min && c.dist <= b.max).length
    b.src = ds.filter((d) => d >= b.min && d <= b.max)
    b.range = b.min === b.max ? `${b.min} m` : `${b.min}–${b.max} m`
  }
  return out
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

const moyenne = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null)
const mediane = (v) => {
  if (!v.length) return null
  const t = [...v].sort((a, b) => a - b)
  return t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2
}

function Sec({ num, titre, sous, right, children, classe = '' }) {
  return (
    <section className={`dp-sec ${classe}`}>
      <header className="dp-sec-h">
        <span className="dp-num">{num}</span>
        <div className="dp-sec-t">
          <h2>{titre}</h2>
          {sous ? <p>{sous}</p> : null}
        </div>
        {right || null}
      </header>
      {children}
    </section>
  )
}

export default function Probability() {
  const [archive, setArchive] = useState([])
  const [pret, setPret] = useState(false)
  const [disc, setDisc] = useState('tout')
  const [dist, setDist] = useState('tout')
  const [betes, setBetes] = useState({})
  const initFait = useRef(false)

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

  /* ── la base mesurable : arrivée de 5 + la grille réelle ─────────────── */
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
      const nums = a.arrivee.slice(0, 5).map(Number)
      const slots = nums.map((n) => sp[n])
      if (slots.some((s) => !Number.isFinite(s))) continue
      const noms = {}
      for (const s of (a.scores || [])) if (s && s.num != null && s.nom) noms[Number(s.num)] = s.nom
      out.push({
        date: String(a.date || ''),
        disc: String(a.discipline || ''),
        fam: familleDiscipline(a.discipline),
        dist: Number(a.distance) || null,
        hippo: String(a.hippodrome || ''),
        cle: cleDe(a),
        max: g.max,
        slots,
        nums,
        parNum: sp,
        noms,
      })
    }
    return out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0))
  }, [archive])

  const parFamille = useMemo(() => {
    const c = {}
    for (const x of base) c[x.fam] = (c[x.fam] || 0) + 1
    return c
  }, [base])

  const choixDisc = useMemo(
    () => ['tout', ...FAMILLES.filter((f) => (parFamille[f] || 0) > 0)],
    [parFamille],
  )

  /* le pool du type choisi — la distance se lit DEDANS, jamais ailleurs */
  const pool = useMemo(
    () => (disc === 'tout' ? base : base.filter((c) => c.fam === disc)),
    [base, disc],
  )

  /* les bandes de distance — une famille à la fois, jamais un mélange */
  const bandes = useMemo(() => {
    if (disc !== 'tout') {
      return grouper(pool).map((b) => ({
        ...b,
        fam: disc,
        key: `${disc}|${b.min}`,
        label: b.range,
      }))
    }
    const out = []
    for (const f of FAMILLES) {
      const lot = base.filter((c) => c.fam === f)
      if (!lot.length) continue
      for (const b of grouper(lot)) {
        out.push({
          ...b,
          fam: f,
          key: `${f}|${b.min}`,
          label: `${FAMILLE_LABEL[f] || f} ${b.range}`,
        })
      }
    }
    return out
  }, [base, pool, disc])

  /* la clé de la bande qui contient (famille, distance) — stable dans les deux modes */
  const cleBande = useCallback((fam, d) => {
    if (!Number.isFinite(d) || d <= 0) return 'tout'
    const b = grouper(base.filter((c) => c.fam === fam)).find((x) => d >= x.min && d <= x.max)
    return b ? `${fam}|${b.min}` : 'tout'
  }, [base])

  const bande = useMemo(() => {
    if (dist === 'tout') return null
    return bandes.find((b) => b.key === dist) || null
  }, [dist, bandes])

  const tranche = useMemo(() => {
    if (!bande) return pool
    return pool.filter((c) => c.fam === bande.fam && c.dist >= bande.min && c.dist <= bande.max)
  }, [pool, bande])

  const N = tranche.length
  const dernier = base.length ? base[base.length - 1] : null

  /* le défaut : le type + la distance de la DERNIÈRE course archivée */
  useEffect(() => {
    if (initFait.current || !dernier) return
    initFait.current = true
    setDisc(dernier.fam)
    setDist(cleBande(dernier.fam, dernier.dist))
  }, [dernier, cleBande])

  const retourDerniere = () => {
    if (!dernier) return
    setDisc(dernier.fam)
    setDist(cleBande(dernier.fam, dernier.dist))
  }

  /* ── ① le mouvement : la case de chaque rang d'arrivée ──────────────── */
  const rangs = useMemo(() => [0, 1, 2, 3, 4].map((i) => {
    const v = tranche.map((c) => c.slots[i])
    return { rang: i + 1, v, moy: moyenne(v), med: mediane(v), min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null }
  }), [tranche])

  const deltas = useMemo(() => [0, 1, 2, 3].map((i) => {
    const d = tranche.map((c) => c.slots[i + 1] - c.slots[i])
    return {
      de: i + 1, vers: i + 2,
      moy: moyenne(d),
      montent: d.length ? d.filter((x) => x > 0).length / d.length : null,
      descendent: d.length ? d.filter((x) => x < 0).length / d.length : null,
      egales: d.length ? d.filter((x) => x === 0).length / d.length : null,
    }
  }), [tranche])

  const etalement = useMemo(() => {
    const v = tranche.map((c) => Math.max(...c.slots) - Math.min(...c.slots))
    return { v, moy: moyenne(v), min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null }
  }, [tranche])

  /* les 5 arrivants par zone du carnet */
  const zones = useMemo(() => {
    const tous = tranche.flatMap((c) => c.slots)
    return ZONES.map((z) => {
      const s = tous.filter((x) => x >= z.min && x <= z.max)
      return { ...z, n: s.length, part: tous.length ? s.length / tous.length : null, surN: N ? s.length / N : null }
    })
  }, [tranche, N])

  /* les 5 ensembles dans les k premières cases */
  const couverture = useMemo(() => [6, 8, 10, 12, 14, 16].map((k) => {
    const cs = tranche.filter((c) => c.max >= k)
    const n = cs.length
    return {
      k, n,
      pod: n ? cs.filter((c) => c.slots.slice(0, 3).every((s) => s <= k)).length / n : null,
      q4: n ? cs.filter((c) => c.slots.filter((s) => s <= k).length >= 4).length / n : null,
      qui: n ? cs.filter((c) => c.slots.every((s) => s <= k)).length / n : null,
    }
  }), [tranche])

  const croissantes = useMemo(
    () => (N ? tranche.filter((c) => c.slots.every((s, i) => i === 0 || s > c.slots[i - 1])).length / N : null),
    [tranche, N],
  )

  /* ── ③ la course de référence : les chevaux de la DERNIÈRE course ───── */
  const ref = useMemo(() => (tranche.length ? tranche[tranche.length - 1] : null), [tranche])

  /* les jockeys de TOUTES les courses de la tranche (fiche de course).
     ⚠ le délai laisse le temps aux filtres de se poser : on ne charge que la
       tranche réellement affichée, pas celle d'avant. */
  useEffect(() => {
    let vivant = true
    const minuteur = setTimeout(() => {
      const cibles = tranche.filter((c) => c.cle)
      if (!cibles.length) { setBetes({}); return }
      ;(async () => {
        const progCache = new Map()
        const progDe = async (date) => {
          if (!progCache.has(date)) progCache.set(date, lireJson(`/data/reu/prog-${date}.json`))
          return progCache.get(date)
        }
        const un = async (c) => {
          const cle = c.cle
          if (FICHE_CACHE.has(cle)) return [cle, FICHE_CACHE.get(cle)]
          const m = /^(\d{4}-\d{2}-\d{2})_(R\d+)_(C\d+)$/.exec(cle)
          if (!m) return null
          const [, date, rn, cn] = m
          let pays = null
          const prog = await progDe(date)
          for (const re of (prog && prog.reunions) || []) {
            for (const cc of (re.courses || [])) {
              if (String(cc.reunion) === rn && String(cc.code) === cn) pays = cc.pays || re.pays
            }
          }
          /* ⚠ le SUFFIXE du fichier fiche est le pays, mais écrit de plusieurs
             façons : FR · FRANCE · MA · MAROC… (le collecteur suit la source,
             et casacourses étiquette parfois la réunion française « MA »).
             On tente le pays du programme, puis les écritures françaises —
             le Quinté est toujours en France (§10). */
          const essais = [...new Set([pays, 'FR', 'FRANCE', 'MA', 'MAROC', 'BE', 'GB', 'CH'].filter(Boolean))]
          for (const p of essais) {
            const j = await lireJson(`/data/reu/${cle}_${p}.json`)
            const ps = j && (j.participants || j.runners)
            if (!ps || !ps.length) continue
            const mm = {}
            for (const x of ps) {
              const jc = x.jockey || x.driver || ''
              if (x.num != null) mm[Number(x.num)] = { nom: x.cheval || x.nom || '', jockey: jc }
            }
            FICHE_CACHE.set(cle, mm)
            return [cle, mm]
          }
          return null
        }
        const res = await Promise.all(cibles.map(un))
        const out = {}
        for (const r of res) if (r) out[r[0]] = r[1]
        if (vivant) setBetes(out)
      })()
    }, 220)
    return () => { vivant = false; clearTimeout(minuteur) }
  }, [tranche])

  const libDisc = disc === 'tout' ? 'tous les types' : (FAMILLE_LABEL[disc] || disc)
  const libDist = bande
    ? (disc === 'tout' ? `${FAMILLE_LABEL[bande.fam] || bande.fam} ${bande.range}` : bande.range)
    : (bandes.length ? 'toutes les distances' : '—')
  const du = tranche.length ? tranche[0].date : ''
  const au = tranche.length ? tranche[tranche.length - 1].date : ''

  if (!pret) {
    return (
      <>
        <Entete page="probability" />
        <div className="dp-page">
          <div className="dp-vide">Lecture de l'archive…</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Entete page="probability" />
      <div className="dp-page">

        <header className="dp-tete">
          <div>
            <p className="dp-kicker">archive · cases du carnet</p>
            <h1>Les cases P — où arrive le Quinté</h1>
            <p className="dp-intro">
              On choisit le <b>type de course</b> et la <b>distance</b>. Sur cette tranche de
              l'archive, on lit <b>comment les cases bougent ensemble</b> dans chaque résultat :
              la case du 1er, du 2e … du 5e, l'écart entre elles, l'étalement, et combien de
              cases il faut pour tout tenir.
            </p>
          </div>
          <div className="dp-compte">
            <b>{N}</b>
            <span>course{N > 1 ? 's' : ''} mesurable{N > 1 ? 's' : ''}</span>
          </div>
        </header>

        {/* ① les deux filtres — et rien d'autre ---------------------------- */}
        <section className="dp-filtres">
          <div className="dp-filtre">
            <label htmlFor="dp-disc">Type de course</label>
            <select
              id="dp-disc"
              className="dp-select"
              value={disc}
              onChange={(e) => { setDisc(e.target.value); setDist('tout') }}
            >
              <option value="tout">Tous les types · {base.length} courses</option>
              {FAMILLES.filter((f) => (parFamille[f] || 0) > 0).map((f) => (
                <option key={f} value={f}>{FAMILLE_LABEL[f]} · {parFamille[f]} course{parFamille[f] > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          <div className="dp-filtre">
            <label htmlFor="dp-dist">Distance</label>
            <select
              id="dp-dist"
              className="dp-select"
              value={bande ? bande.key : 'tout'}
              onChange={(e) => setDist(e.target.value)}
            >
              <option value="tout">Toutes les distances · {pool.length} course{pool.length > 1 ? 's' : ''}</option>
              {bandes.map((b) => (
                <option key={b.key} value={b.key}>{b.label} · {b.n} course{b.n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          <div className="dp-filtre dp-filtre-b">
            <span className="dp-etiq">La dernière course archivée</span>
            <button type="button" className="dp-btn" onClick={retourDerniere} disabled={!dernier}>
              ↺ {dernier ? `${FAMILLE_LABEL[dernier.fam] || dernier.fam} ${dernier.dist || ''} m` : '—'}
            </button>
          </div>
        </section>

        <div className="dp-ruban">
          <span className="dp-puce">{libDisc}</span>
          <span className="dp-puce">{libDist}</span>
          <span className="dp-puce">du {jour(du)} au {jour(au)}</span>
          {ref ? <span className="dp-puce dp-puce-ref">chevaux : {jour(ref.date)} · {ref.hippo || '—'}</span> : null}
        </div>

        {!N ? (
          <div className="dp-vide">
            Aucune course mesurable avec ces deux filtres.
            <button type="button" className="dp-btn" onClick={() => { setDisc('tout'); setDist('tout') }}>élargir</button>
          </div>
        ) : (
          <>
            {/* ① le mouvement ------------------------------------------- */}
            <Sec
              num="①"
              titre="Comment les cases bougent ensemble"
              sous="La case du 1er, du 2e, du 3e, du 4e et du 5e arrivant — puis l'écart entre deux rangs successifs, et l'étalement total du résultat."
            >
              <div className="dp-rangs">
                {rangs.map((r) => {
                  const maxC = Math.max(0, ...r.v)
                  return (
                    <div className="dp-rang" key={r.rang}>
                      <div className="dp-rang-h">
                        <span className="dp-rang-n">{r.rang}{r.rang === 1 ? 'er' : 'e'}</span>
                        <b className="dp-grand">P{nf(r.moy)}</b>
                      </div>
                      <div className="dp-spark" aria-hidden="true">
                        {Array.from({ length: Math.max(maxC, 1) }, (_, i) => {
                          const c = r.v.filter((x) => x === i + 1).length
                          return (
                            <span
                              key={i}
                              className={`dp-sp ${c ? 'dp-sp-on' : ''}`}
                              title={`P${i + 1} · ${c} fois`}
                              style={c ? { opacity: 0.30 + Math.min(0.70, (c / Math.max(1, r.v.length)) * 1.8) } : undefined}
                            />
                          )
                        })}
                      </div>
                      <p className="dp-rang-s">médiane P{nf(r.med, 0)}</p>
                      <p className="dp-rang-f">de P{r.min} à P{r.max}</p>
                    </div>
                  )
                })}
              </div>

              <div className="dp-deux">
                <div>
                  <h4 className="dp-h4">L'écart entre deux rangs successifs</h4>
                  <table className="dp-tab dp-tab-s">
                    <thead>
                      <tr><th>du…</th><th className="dp-n">écart moyen</th><th className="dp-n">case plus grande</th><th className="dp-n">case plus petite</th><th className="dp-n">égales</th></tr>
                    </thead>
                    <tbody>
                      {deltas.map((d) => (
                        <tr key={d.de}>
                          <td>{d.de}{d.de === 1 ? 'er' : 'e'} → {d.vers}e</td>
                          <td className="dp-n"><b>{d.moy == null ? '—' : (d.moy > 0 ? '+' : '') + nf(d.moy, 2)}</b></td>
                          <td className="dp-n">{pc(d.montent, 0)}</td>
                          <td className="dp-n">{pc(d.descendent, 0)}</td>
                          <td className="dp-n">{pc(d.egales, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="dp-note">
                    « + » veut dire que le cheval suivant occupe une case plus grande — il est
                    cité plus bas dans le carnet. Un écart moyen de +1,3 : le 2e arrivant est en
                    moyenne une case et demie après le 1er.
                  </p>
                </div>

                <div>
                  <h4 className="dp-h4">L'étalement d'un résultat</h4>
                  <div className="dp-cartes">
                    <div className="dp-carte"><span>écart moyen 5e − 1er</span><b>{nf(etalement.moy)}</b></div>
                    <div className="dp-carte"><span>le plus serré</span><b>{nf(etalement.min, 0)}</b></div>
                    <div className="dp-carte"><span>le plus large</span><b>{nf(etalement.max, 0)}</b></div>
                    <div className="dp-carte"><span>les 5 cases en ordre croissant</span><b>{pc(croissantes, 0)}</b></div>
                  </div>
                  <h4 className="dp-h4">Les 5 arrivants par zone</h4>
                  <div className="dp-zones">
                    {zones.map((z) => (
                      <div className={`dp-zone dp-z-${z.cle}`} key={z.cle}>
                        <span className="dp-zone-n">{z.nom}</span>
                        <b>{pc(z.part, 0)}</b>
                        <span className="dp-zone-s">{z.n} arrivants · {nf(z.surN, 2)}/course</span>
                        <span className="dp-bar"><i className={`dp-f-${z.cle}`} style={{ width: `${(z.part || 0) * 100}%` }} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Sec>

            {/* ② la couverture ------------------------------------------ */}
            <Sec
              num="②"
              titre="Combien de cases pour tout tenir"
              sous="Si on ne garde que les k premières cases, combien de fois le podium entier, 4 des 5, les 5, y sont."
            >
              <table className="dp-tab dp-tab-s">
                <thead>
                  <tr><th>P1 → Pk</th><th className="dp-n">courses</th><th className="dp-n">podium 3/3</th><th className="dp-n">4 des 5</th><th className="dp-n">les 5</th><th className="dp-b">force</th></tr>
                </thead>
                <tbody>
                  {couverture.map((r) => (
                    <tr key={r.k}>
                      <td><b>P1 → P{r.k}</b></td>
                      <td className="dp-n">{r.n}</td>
                      <td className="dp-n">{pc(r.pod)}</td>
                      <td className="dp-n">{pc(r.q4)}</td>
                      <td className="dp-n"><b>{pc(r.qui)}</b></td>
                      <td className="dp-b"><span className="dp-bar"><i className="dp-f-fav" style={{ width: `${(r.qui || 0) * 100}%` }} /></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="dp-note">
                Compté seulement sur les courses qui ont au moins k partants — une course à 8
                partants ne peut pas faire « les 5 dans P1..P12 ».
              </p>
            </Sec>

            {/* ③ chaque résultat ---------------------------------------- */}
            <Sec
              num="③"
              titre="Chaque résultat, case par case"
              sous={`Les ${N} courses de la tranche, de la plus ancienne à la plus récente : les 5 cases, le numéro du cheval, et l'écart du résultat.`}
            >
              <div className="dp-courses">
                {tranche.slice().reverse().map((c) => {
                  const etal = Math.max(...c.slots) - Math.min(...c.slots)
                  const croit = c.slots.every((s, i) => i === 0 || s > c.slots[i - 1])
                  return (
                    <div className="dp-course" key={`${c.date}-${c.cle || c.hippo}`}>
                      <div className="dp-course-h">
                        <b>{jour(c.date)}</b>
                        <span>{c.hippo || '—'}</span>
                        <span className="dp-tag">{FAMILLE_LABEL[c.fam] || c.fam || '—'}</span>
                        <span className="dp-tag">{c.dist ? `${c.dist} m` : '—'}</span>
                      </div>
                      <div className="dp-sign">
                        {c.slots.map((s, i) => {
                          const num = c.nums[i]
                          const bete = (betes[c.cle] || {})[num] || {}
                          const nom = bete.nom || (c.noms && c.noms[num]) || ''
                          const jock = bete.jockey || ''
                          return (
                            <span className={`dp-chip dp-${zoneDe(s).cle}`} key={i} title={`${i + 1}${i === 0 ? 'er' : 'e'} arrivant · case P${s} · n°${num}`}>
                              <span className="dp-chip-t">
                                <em>{i + 1}</em>
                                <b>P{s}</b>
                                <i>n°{num}</i>
                              </span>
                              <span className="dp-chip-n">{nom || '—'}</span>
                              <span className="dp-chip-j">{jock || '—'}</span>
                            </span>
                          )
                        })}
                      </div>
                      <div className="dp-course-f">
                        <span>étalement <b>{etal}</b></span>
                        <span>{croit ? 'cases croissantes' : 'cases en désordre'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Sec>
          </>
        )}

        <footer className="dp-pied">
          <b>P</b> = la case du carnet (le même <i>buildGrid</i> que la page Quinté) —
          ce n'est pas le rang de presse, ni le rang de cote. Tout est recalculé à l'ouverture
          depuis l'archive ; un chiffre absent reste « — ».
        </footer>
      </div>
    </>
  )
}
