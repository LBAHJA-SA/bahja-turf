import { useEffect, useMemo, useState } from 'react'
import Entete from '../../src/Entete.jsx'
import {
  aujourdhui, fetchRecap, fetchArchive, dateCorrespondALaDate, latestDateAvecDiscipline, fetchArchiveDb,
} from './synthese.js'
import { genererMoteur, choisirPredictions } from './moteur.js'
import { chargerParticipants } from './participants.js'

/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/GENERATEUR/GenerateurBahjaTurf.jsx — GENERATEUR BAHJA TURF
 *  13/11/2026 — page autonome : ses fichiers, rien des autres pages.
 *  Identité visuelle propre : bronze & or « registre » (pas d'import inter-pages).
 * ════════════════════════════════════════════════════════════════════════ */

const BRONZE = {
  bord: 'rgba(218,165,32,.4)',
  bord2: 'rgba(218,165,32,.18)',
  fond: 'linear-gradient(150deg, rgba(42,32,10,.65) 0%, rgba(23,18,5,.92) 55%, rgba(10,8,3,.96) 100%)',
  carte: 'linear-gradient(160deg, #1d1608 0%, #120d04 100%)',
  accent: '#ffd700',
  accent2: '#f5c044',
  bronzeTxt: '#d8b86a',
  muted: '#a89468',
  texte: '#f7ead1',
}

export default function GenerateurBahjaTurf() {
  const TXT_VIDE = 'Aucune Synthèse publiée pour cette date.'
  const TXT_GENERE = '✅ Génération réussie.'
  const TXT_ECHEC = 'Échec — voir la console.'
  const TXT_NON_CHARGE = 'Synthèse non chargée — choisissez une date avec archive.'
  const TXT_CLIQUE_IGNORE = 'Cliquez un numéro pour que le moteur l’ignore'
  const TXT_CHARGEMENT = 'Chargement de la Synthèse…'

  const [date, setDate] = useState(aujourdhui())
  const [chargement, setChargement] = useState(true)
  const [data, setData] = useState(null) // { synthese, source }
  const [erreur, setErreur] = useState('')
  const [ignores, setIgnores] = useState(() => new Set())
  const toggleIgnore = (n) => setIgnores((s) => {
    const next = new Set(s)
    if (next.has(n)) next.delete(n); else next.add(n)
    return next
  })
  // ⭐ Filtre discipline — ATTELÉ / PLAT / …
  const DISCIPLINES = ['ATTELÉ', 'PLAT', 'HAIE', 'STEEPLE']
  const [discipline, setDiscipline] = useState(null) // null = TOUS

  const [maquetteNote, setMaquetteNote] = useState('')
  const [archiveDb, setArchiveDb] = useState(null)
  useEffect(() => { let vivant = true; fetchArchiveDb().then((db) => { if (vivant) setArchiveDb(db) }); return () => { vivant = false } }, [])
  const predictions = useMemo(() => (archiveDb && data?.ordre?.length ? choisirPredictions({ ordre: data.ordre, discipline, db: archiveDb }) : null), [archiveDb, data, discipline])
  const [nums, setNums] = useState({
    b1: ['', '', '', '', ''],
    b2: ['', '', '', '', ''],
    n1: [], n2: [], n3: [], n4: [], n5: [],
  })
  const [gen, setGen] = useState({})          // résultats du moteur { b1: [5,6,...] }
  const [genBusy, setGenBusy] = useState(false)

  useEffect(() => {
    let vivant = true
    setChargement(true)
    setErreur('')
    setData(null)
    ;(async () => {
      // ① Live d'abord
      let base = null
      try {
        const r = await fetchRecap()
        if (dateCorrespondALaDate(r.datePage, date)) {
          base = { synthese: r.synthese, source: 'pronostics-turf.info' }
        }
      } catch { /* live bloqué — on bascule sur l'archive */ }
      // ② Fallback : archive partagée — lecture seule, les runners toujours depuis l'archive
      const arch = await fetchArchive(date).catch(() => null)
      if (!base && arch) base = { synthese: arch.synthese, source: 'archive' }
      if (!vivant) return
      if (!base) { setErreur(TXT_VIDE); return }
      /* ⭐ ne pas ignorer ceux que la presse n'a pas notés : les partants manquants
       *   sont ajoutés à la suite, en presse, avec un « + » sur leur tuile */
      /* ⭐ متباريوه يوم السباق من كاساركوس — يكمّل بهم الأرشيف ما لم تذكره
       *   الصحافة (لا كوجود في الأرشيف إلا بعد نهاية السباق). */
      const runnersArch = arch?.runners || []
      let runners = runnersArch
      if (!runners.length) {
        const live = await chargerParticipants(date, base.synthese).catch(() => null)
        if (live?.runners?.length) runners = live.runners
      }
      const ordre = [
        ...base.synthese.map((num) => ({ num, presse: true })),
        ...runners.filter((n) => !base.synthese.includes(n)).sort((a, b) => a - b).map((num) => ({ num, presse: false })),
      ]
      setData({ ordre, source: base.source, discipline: arch?.discipline || null })
    })()
      .catch(() => { if (vivant) setErreur(TXT_VIDE) })
      .finally(() => { if (vivant) setChargement(false) })
    return () => { vivant = false }
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  const choisirDiscipline = async (d) => {
    if (d === null) { setDiscipline(null); return }
    setDiscipline(d)
    const latest = await latestDateAvecDiscipline(d)
    if (latest) setDate(latest)
  }

  /* ── Moteur : remplit uniquement les cases « ? » (constat MOTEUR.md) ── */
  const setDigit = (e, id, idx) => {
    const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
    setNums((s) => ({ ...s, [id]: s[id].map((x, i) => (i === idx ? v : x)) }))
  }
  const supprimerDigit = (id, j) => setNums((s) => ({ ...s, [id]: s[id].map((x, i) => (i === j ? '' : x)) }))
  const clickX = (id, j) => () => setNums((s) => ({ ...s, [id]: s[id].map((x, i) => (i === j ? '' : x)) }))

  const LIGNES = [
    { id: 'b1', cible: 8 }, { id: 'b2', cible: 8 },
    { id: 'n1', cible: 5 }, { id: 'n2', cible: 5 }, { id: 'n3', cible: 5 }, { id: 'n4', cible: 5 }, { id: 'n5', cible: 5 },
  ]

  const lancerGeneration = async () => {
    setGenBusy(true)
    setMaquetteNote('')
    try {
      const db = await fetchArchiveDb()
      if (!db || !data?.ordre || !data.ordre.length) {
        setMaquetteNote(TXT_NON_CHARGE)
        return
      }
      const lignesCfg = Object.fromEntries(LIGNES.map(({ id, cible }) => [id, { typed: nums[id] || [], cible }]))
      const out = await genererMoteur({ ordre: data.ordre, discipline, ignored: [...ignores], lignes: lignesCfg, db, diversify: ['n1', 'n2', 'n3', 'n4', 'n5'] })
      setGen(out)
      setMaquetteNote(TXT_GENERE)
    } catch (e) {
      console.error(e)
      setMaquetteNote(TXT_ECHEC)
    } finally {
      setGenBusy(false)
    }
  }

  /* Deux lignes lues en colonnes : le haut porte la parité du P1,
   * le bas l'autre — dans l'ordre de la presse (les non-notés sont annexés
   * à la fin), la colonne k → P(2k-1) en haut, P(2k) en bas.
   * Aucun groupe G1..G5, aucun import des pages Quinté — identité bronzée. */
  const carnet = useMemo(() => {
    if (!data?.ordre?.length) return null
    const p1 = data.ordre[0].num
    const par = (x) => ((x % 2) + 2) % 2
    const pariteHaut = par(p1)
    const h = data.ordre.filter((c) => par(c.num) === pariteHaut)
    const b = data.ordre.filter((c) => par(c.num) !== pariteHaut)
    h.forEach((c, i) => { c.slot = 2 * i + 1 })
    b.forEach((c, i) => { c.slot = 2 * i + 2 })
    const colonnes = []
    for (let i = 0; i < Math.max(h.length, b.length); i++) {
      colonnes.push({ haut: h[i] || null, bas: b[i] || null })
    }
    return colonnes
  }, [data])

  /* Ceux que la presse n'a pas notés — annexés à la fin avec un « + » */
  const manquants = useMemo(
    () => (data?.ordre || []).filter((c) => !c.presse).map((c) => c.num),
    [data]
  )

  return (
    <>
      <Entete page="generateur" />

      <main
        style={{
          minHeight: 'calc(100vh - 68px)',
          padding: 'clamp(16px, 3vw, 26px) 16px clamp(20px, 5vw, 48px)',
          color: BRONZE.texte,
          background: 'radial-gradient(900px 480px at 12% 0%, rgba(255,215,0,.07) 0%, transparent 55%), #0a0803',
        }}
      >
        <div style={{ display: 'grid', gap: 16, width: '100%' }}>

          {/* ── ligne 2 colonnes : la Synthèse + panneau de droite ─────────── */}
          <div className="generateur-row">
          <section style={{
            padding: 'clamp(14px, 2.5vw, 20px)',
            borderRadius: 18,
            border: '1px solid ' + BRONZE.bord,
            background: 'linear-gradient(165deg, rgba(28,22,10,.6) 0%, rgba(13,10,4,.85) 100%)',
            boxShadow: '0 14px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,215,0,.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{
                  margin: 0, fontSize: 15, letterSpacing: '.16em', color: BRONZE.accent,
                  fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800,
                }}>
                  LA TABLE DE LA SYNTHÈSE
                </h2>
                {data && (
                  <div style={{ marginTop: 4, fontSize: 11, color: BRONZE.muted }}>
                    Source : {data.source}
                    {' · '}{data.ordre.length} numéros
                    {data.discipline && <>{' · '} discipline : {data.discipline}</>}
                    {manquants.length > 0 && (
                      <div style={{ marginTop: 2, color: '#d8b86a' }}>
                        + {manquants.join(' · ')} — non cité par la presse, ajouté
                      </div>
                    )}
                    <div style={{ marginTop: 3, color: BRONZE.muted }}>
                      {TXT_CLIQUE_IGNORE}
                    </div>
                    {ignores.size > 0 && (
                      <div style={{ marginTop: 2, color: '#fda4af' }}>
                        Ignorés : {[...ignores].sort((a, b) => a - b).join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: BRONZE.bronzeTxt }}>
                <span>Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    colorScheme: 'dark', background: 'rgba(255,215,0,.05)', color: '#ffe97a',
                    border: '1px solid rgba(218,165,32,.45)', borderRadius: 10, padding: '6px 10px', fontSize: 13,
                    fontFamily: 'ui-monospace, Consolas, monospace',
                  }}
                />
              </label>
            </div>

            {/* ── Filtre discipline ───────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: '.16em', color: BRONZE.muted, fontWeight: 800 }}>
                DISCIPLINE
              </span>
              {[null, ...DISCIPLINES].map((d) => {
                const actif = discipline === d || (d === null && discipline === null)
                return (
                  <button
                    key={d || 'TOUS'}
                    type="button"
                    onClick={() => choisirDiscipline(d)}
                    aria-pressed={actif}
                    style={{
                      padding: '5px 14px', borderRadius: 999, cursor: 'pointer',
                      fontSize: 11.5, fontWeight: 800, letterSpacing: '.08em',
                      color: actif ? '#241a02' : '#d8b86a',
                      border: actif ? 'none' : '1px solid rgba(218,165,32,.4)',
                      background: actif ? 'linear-gradient(150deg, #ffe97a, #ffd700 55%, #b98410)' : 'rgba(255,215,0,.05)',
                      boxShadow: actif ? '0 3px 12px rgba(255,215,0,.3)' : 'none',
                    }}
                  >{d || 'TOUS'}</button>
                )
              })}
            </div>

            {chargement && (
              <div style={{ padding: '18px 4px', color: BRONZE.bronzeTxt, fontSize: 13 }}>{TXT_CHARGEMENT}</div>
            )}

            {!chargement && erreur && (
              <div style={{ marginTop: 12, padding: '14px 4px', borderRadius: 12, border: '1px solid rgba(244,63,94,.35)', color: '#fecaca', background: 'rgba(127,29,29,.18)', fontSize: 13 }}>
                {erreur}
              </div>
            )}

            {!chargement && !erreur && data && carnet && (
              <>
                {/* Deux lignes lues en colonnes — identité bronzée */}
                <div style={{ overflowX: 'auto', padding: '4px 2px 10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${carnet.length}, 84px)`, gap: 8, width: 'max-content' }}>
                    {carnet.map((col, i) => (
                      <div key={i} style={{ display: 'grid', gap: 8 }}>
                        {[col.haut, col.bas].map((c, k) => (
                          c ? (
                            <button
                              key={k}
                              type="button"
                              aria-pressed={ignores.has(c.num)}
                              onClick={() => toggleIgnore(c.num)}
                              title={`P${c.slot} · N°${c.num}${ignores.has(c.num) ? ' — ignoré par le moteur' : (c.presse ? '' : ' · non cité par la presse')}${ignores.has(c.num) ? '' : ' — cliquer pour ignorer'}`}
                              style={{
                                position: 'relative', cursor: 'pointer', font: 'inherit',
                                display: 'grid', justifyItems: 'center', gap: 2,
                                padding: '7px 6px 8px', borderRadius: 10,
                                background: ignores.has(c.num)
                                  ? 'linear-gradient(160deg, rgba(127,29,29,.55) 0%, rgba(30,8,8,.6) 100%)'
                                  : BRONZE.carte,
                                border: ignores.has(c.num)
                                  ? '1.5px solid rgba(248,113,113,.75)'
                                  : (c.presse ? '1px solid rgba(218,165,32,.3)' : '1.5px dashed rgba(255,215,0,.6)'),
                                boxShadow: ignores.has(c.num)
                                  ? 'inset 0 0 18px rgba(248,113,113,.25), 0 3px 8px rgba(0,0,0,.5)'
                                  : 'inset 0 1px 0 rgba(255,215,0,.2), 0 3px 8px rgba(0,0,0,.5)',
                                opacity: ignores.has(c.num) ? 0.62 : 1,
                              }}
                            >
                              <span style={{ fontSize: 8, color: ignores.has(c.num) ? '#fca5a5' : BRONZE.muted, letterSpacing: '.18em', fontWeight: 800 }}>
                                P{c.slot}
                              </span>
                              <span style={{
                                fontSize: 23, lineHeight: 1.1, fontWeight: 800,
                                fontFamily: 'Georgia, "Times New Roman", serif',
                                color: ignores.has(c.num) ? '#fda4af' : '#ffd766',
                                textDecoration: ignores.has(c.num) ? 'line-through' : 'none',
                                textShadow: ignores.has(c.num) ? 'none' : '0 0 12px rgba(255,215,0,.3)',
                              }}>{c.num}</span>
                              {!c.presse && (
                                <span style={{ position: 'absolute', top: 3, right: 5, fontSize: 11, fontWeight: 800, color: '#ffe97a', textShadow: '0 0 8px rgba(255,215,0,.6)' }}>+</span>
                              )}
                            </button>
                          ) : (
                            <div key={k} style={{ height: 64 }} />
                          )
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ── PANNEAU DE DROITE — LE GAGNANT + BASE TRIO SYSTÈME ───────── */}
          <section style={{
            padding: 'clamp(12px, 2vw, 16px)',
            borderRadius: 18,
            border: '1px solid ' + BRONZE.bord,
            background: 'linear-gradient(165deg, rgba(28,22,10,.6) 0%, rgba(13,10,4,.85) 100%)',
            boxShadow: '0 14px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,215,0,.15)',
            display: 'grid', gap: 10, alignContent: 'start', width: 'max-content',
          }}>
            {/* LE GAGNANT — en-tête + 2 choix */}
            <span style={{
              display: 'block', padding: '6px 10px', textAlign: 'center',
              border: '1.5px solid #d8b86a', borderRadius: 6,
              color: '#ffe97a', background: 'rgba(255,215,0,.05)',
              fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800,
              letterSpacing: '.2em', fontSize: 10, textIndent: '.2em', whiteSpace: 'nowrap',
            }}>LE GAGNANT</span>
            {[{ txt: '1ER CHOIX', val: predictions?.gagnant1 }, { txt: '2ÈME CHOIX', val: predictions?.gagnant2 }].map(({ txt, val }) => (
              <div key={txt} style={{ display: 'grid', gridTemplateColumns: '1fr 52px', gap: 6, alignItems: 'center' }}>
                <div style={{
                  padding: '0 10px', height: 44, display: 'flex', alignItems: 'center',
                  border: '1.5px solid rgba(218,165,32,.4)', borderRadius: 8,
                  background: 'rgba(255,215,0,.05)',
                  color: '#ffe97a', fontFamily: 'Georgia, "Times New Roman", serif',
                  fontWeight: 800, fontSize: 10, letterSpacing: '.12em', whiteSpace: 'nowrap',
                }}>{txt}</div>
                <div style={{
                  width: 52, height: 44, borderRadius: 8,
                  border: '1.5px solid rgba(255,215,0,.6)',
                  background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.14), transparent 60%), linear-gradient(160deg, #5a4410 0%, #3d2c06 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,215,0,.35), 0 3px 8px rgba(0,0,0,.45)',
                  display: 'grid', placeItems: 'center',
                  color: '#ffe97a', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 20,
                }}>{Number.isFinite(val) ? val : '?'}</div>
              </div>
            ))}

            {/* BASE TRIO SYSTÈME — en-tête + 2 trios */}
            <span style={{
              display: 'block', padding: '6px 10px', textAlign: 'center', marginTop: 6,
              border: '1.5px solid #d8b86a', borderRadius: 6,
              color: '#ffe97a', background: 'rgba(255,215,0,.05)',
              fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800,
              letterSpacing: '.2em', fontSize: 10, textIndent: '.2em', whiteSpace: 'nowrap',
            }}>BASE TRIO SYSTÈME</span>
            {[predictions?.trio1, predictions?.trio2].map((trio, i) => (
              <div key={i}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gap: 4, fontSize: 8, fontWeight: 800, letterSpacing: '.08em', color: '#a89468' }}>
                  <div style={{ textAlign: 'center' }}>1ER</div>
                  <div style={{ textAlign: 'center' }}>2ÈME</div>
                  <div style={{ textAlign: 'center' }}>3ÈME</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gap: 4, marginTop: 3 }}>
                  {[0, 1, 2].map((pos) => (
                    <div key={pos} style={{
                      width: 52, height: 44, display: 'grid', placeItems: 'center',
                      borderRadius: 8, border: '1.5px solid rgba(255,215,0,.55)',
                      background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.14), transparent 60%), linear-gradient(160deg, #5a4410 0%, #3d2c06 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(255,215,0,.35), 0 3px 8px rgba(0,0,0,.45)',
                      color: '#ffe97a', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 20,
                    }}>{trio && Number.isFinite(trio[pos]) ? trio[pos] : '?'}</div>
                  ))}
                </div>
              </div>
            ))}
          </section>
          </div>{/* fin .generateur-row */}

          {/* ── colonne de gauche : BASE QUINTE + COMBINISON + en construction ── */}
          <div style={{ maxWidth: 720, margin: 0, marginRight: 'auto', display: 'grid', gap: 16 }}>
          {/* ── BASE QUINTE + COMBINISON — le moteur réel ──────────────── */}
          <section style={{
            padding: 'clamp(16px, 3vw, 24px)',
            borderRadius: 18,
            border: '1px solid rgba(218,165,32,.45)',
            background: 'linear-gradient(165deg, rgba(38,29,8,.72) 0%, rgba(16,12,4,.94) 100%)',
            boxShadow: '0 16px 44px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,215,0,.22)',
          }}>
            {/* En-tête + bouton Générer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '7px 18px', borderRadius: 8,
                border: '1.5px solid #d8b86a', color: '#ffe97a',
                fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 900,
                letterSpacing: '.3em', fontSize: 14, textIndent: '.3em',
                boxShadow: 'inset 0 0 14px rgba(255,215,0,.18), 0 2px 8px rgba(0,0,0,.4)',
                background: 'rgba(255,215,0,.05)',
              }}>BASE QUINTE</span>
              <button
                type="button"
                onClick={lancerGeneration}
                disabled={genBusy}
                style={{
                  padding: '10px 22px', borderRadius: 10, cursor: genBusy ? 'default' : 'pointer',
                  border: 'none', color: '#241a02',
                  fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 900,
                  letterSpacing: '.22em', fontSize: 13, textIndent: '.22em',
                  background: genBusy ? 'rgba(255,215,0,.35)' : 'linear-gradient(160deg, #fff3b0 0%, #ffd700 42%, #b98410 100%)',
                  boxShadow: genBusy ? 'none' : '0 6px 18px rgba(255,215,0,.32), inset 0 1px 1px rgba(255,255,255,.75)',
                }}
              >{genBusy ? 'GENERATION…' : 'GENERER'}</button>
            </div>
            {maquetteNote && (
              <p style={{ margin: '10px 2px 0', fontSize: 11.5, color: '#d8b86a' }}>{maquetteNote}</p>
            )}

            {/* Lignes BASE QUINTE + COMBINISON QUINTE — 5 gauche + R + moteur (8) · ou 5 cases pures (5) */}
            {[
              { id: 'b1', cible: 8, label: 'BASE 1', base: true }, { id: 'b2', cible: 8, label: 'BASE 2', base: true },
              { id: 'n1', cible: 5, label: 'COMBINAISON 3', base: false }, { id: 'n2', cible: 5, label: 'COMBINAISON 4', base: false }, { id: 'n3', cible: 5, label: 'COMBINAISON 5', base: false }, { id: 'n4', cible: 5, label: 'COMBINAISON 6', base: false }, { id: 'n5', cible: 5, label: 'COMBINAISON 7', base: false },
            ].map(({ id, cible, label, base }) => {
              const digits = nums[id] || []
              const digitsTyped = digits.filter((v) => String(v).trim() !== '')
              const picks = gen[id]
              const engineCount = Math.max(0, cible - digitsTyped.length)
              const TypedCell = (d, i) => {
                const plein = String(d).trim() !== ''
                return (
                  <div key={i} style={{
                    position: 'relative', width: 52, height: 48, display: 'grid', placeItems: 'center', borderRadius: 10,
                    border: plein ? '1px solid rgba(255,215,0,.5)' : '1.5px dashed rgba(218,165,32,.4)',
                    background: plein
                      ? 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.14), transparent 60%), linear-gradient(160deg, #3a2e0c 0%, #241a06 100%)'
                      : 'rgba(255,255,255,.03)',
                    boxShadow: plein ? 'inset 0 1px 0 rgba(255,215,0,.25), 0 3px 8px rgba(0,0,0,.45)' : 'none',
                  }}>
                    <input
                      type="text" inputMode="numeric" maxLength={2} value={d}
                      onChange={(e) => setDigit(e, id, i)}
                      placeholder="X"
                      aria-label={`Case ${i + 1}`}
                      style={{
                        width: '100%', height: '100%', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none',
                        color: plein ? '#ffd766' : '#6f5f2e',
                        fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 21,
                        caretColor: '#ffd766',
                      }}
                    />
                    {plein && (
                      <button type="button" onClick={() => supprimerDigit(id, i)} title="Supprimer"
                        style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(248,113,113,.6)', background: '#3a0a0a', color: '#fda4af', fontSize: 13, cursor: 'pointer' }}>×</button>
                    )}
                  </div>
                )
              }
              const EngineCell = (n, i) => (
                <div key={i} style={{ width: 52, height: 48, display: 'grid', placeItems: 'center', borderRadius: 10, border: '1.5px solid rgba(255,215,0,.7)', background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.22), transparent 55%), linear-gradient(160deg, #5a4410 0%, #3d2c06 100%)', boxShadow: 'inset 0 1px 0 rgba(255,215,0,.4), 0 3px 10px rgba(0,0,0,.5), 0 0 14px rgba(255,215,0,.18)', color: '#ffe97a', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 21 }}>{n}</div>
              )
              const EmptyCell = (i) => (
                <div key={i} style={{ width: 52, height: 48, display: 'grid', placeItems: 'center', borderRadius: 10, border: '1.5px dashed rgba(218,165,32,.35)', color: '#6f5f2e', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 21 }}>?</div>
              )
              const RCircle = () => (
                <span title="R — option aléatoire"
                  style={{ width: 34, height: 34, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', border: '1.5px solid rgba(218,165,32,.6)', color: '#d8b86a', background: 'rgba(255,215,0,.05)', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 800, fontSize: 15, flex: '0 0 auto' }}>R</span>
              )
              return (
                <div key={id} style={{ marginTop: 14, borderTop: '1px solid rgba(218,165,32,.14)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, letterSpacing: '.2em', color: '#a89468', fontWeight: 800 }}>{label}</span>
                    <span style={{ fontSize: 9, color: '#6f5f2e' }}>({cible} cases)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Lignes 1–4 : 5 cases gauche + R + cases moteur */}
                    {base && (
                      <>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {Array.from({ length: 5 }).map((_, i) => TypedCell((nums[id] || [])[i] ?? '', i))}
                        </div>
                        <RCircle />
                      </>
                    )}
                    {/* Lignes 5–7 : 5 cases pures (« ? » si le moteur ne peut pas compléter sans violer ≤ 2) */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {picks
                        ? [
                            ...picks.map((n, i) => EngineCell(n, i)),
                            ...Array.from({ length: Math.max(0, (base ? engineCount : 5) - picks.length) }, (_, i) => EmptyCell(picks.length + i)),
                          ]
                        : Array.from({ length: base ? engineCount : 5 }).map((_, i) => EmptyCell(i))}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>

          {/* ── En construction — jusqu'à ce que la fonction de la page soit fixée */}
          <section style={{
            padding: 'clamp(16px, 3vw, 26px)',
            borderRadius: 18,
            border: '1px dashed rgba(218,165,32,.4)',
            background: 'rgba(255,215,0,.04)',
            display: 'grid', gap: 10, justifyItems: 'center', textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 800, letterSpacing: '.14em',
              color: '#241a02', background: 'linear-gradient(150deg, #f9e7a0, #ffd700 55%, #a8791a)',
            }}>
              <i className="bi bi-hourglass-split" aria-hidden="true" />
              EN CONSTRUCTION
            </div>
            <p style={{ margin: 0, maxWidth: 560, color: BRONZE.bronzeTxt, fontSize: 13.5, lineHeight: 1.8 }}>
              La page est prête — son contenu se définit ici, ensemble.
            </p>
          </section>
          </div>{/* fin de la colonne de gauche */}

        </div>
      </main>
    </>
  )
}
