import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Entete from '../../src/Entete.jsx'
import Drapeau from '../../src/Drapeau.jsx'
import { chargerTout, oublier } from '../../backend/RESULTATS/donnees.js'

/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/RESULTATS/Resultats.jsx — « RÉSULTATS & RAPPORTS » (24/10/2026)
 *
 *  Demande de l'utilisateur : « هاد الطريقة أسهل وأجمل » devant le tableau de
 *  casacourses — une ligne par course, l'arrivée en cases vertes, les
 *  non-partants en cases rouges, et le rapport au clic.
 *
 *  ⭐ LA PAGE EST DONC UN TABLEAU, pas des cartes :
 *
 *      DATE │ TERRAIN (hippodrome + type de pari) │ ARRIVÉE │ NON-PART. │ DÉTAILS
 *
 *  et « Rapport » déplie, sous la ligne, ce que paie chaque pari.
 *
 *  ⭐ DEUX JEUX DE PRIX, JAMAIS MÉLANGÉS :
 *     · le MAROC (SOREC, e-sorec.ma) paie en DIRHAMS — l'arrivée ET le rapport
 *       viennent de la SOREC ;
 *     · la FRANCE (et le reste) paie en EUROS — arrivée casacourses, rapports
 *       officiels du PMU.
 *
 *  Les données : backend/RESULTATS/donnees.js + backend/RESULTATS/maroc.js.
 * ══════════════════════════════════════════════════════════════════════════ */

const OR = '#fbbf24'
const OR2 = '#fde68a'
const TXT = '#e7f1ff'
const TXT2 = '#94a8c4'
const TXT3 = '#64748b'
const LIGNE = 'rgba(251,191,36,.16)'
const VERRE = 'rgba(13,20,34,.82)'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const VERT = '#15803d'
const ROUGE = '#b91c1c'

/** L'ordre dans lequel les paris se lisent (les autres passent à la fin). */
const ORDRE = [
  'SIMPLE_GAGNANT', 'SIMPLE_PLACE', 'COUPLE_GAGNANT', 'COUPLE_PLACE',
  'DEUX_SUR_QUATRE', 'TRIO', 'TRIO_ORDRE', 'TIERCE', 'QUARTE', 'QUARTE_PLUS', 'QUINTE_PLUS',
  'SUPER_QUATRE', 'MULTI', 'MINI_MULTI',
]

/** La couleur d'un pari : elle ne change jamais (or = le Quinté). */
const COULEUR = {
  SIMPLE_GAGNANT: '#67e8f9',
  SIMPLE_PLACE: '#7dd3fc',
  COUPLE_GAGNANT: '#a78bfa',
  COUPLE_PLACE: '#c4b5fd',
  DEUX_SUR_QUATRE: '#f472b6',
  TRIO: '#34d399',
  TRIO_ORDRE: '#6ee7b7',
  TIERCE: '#22d3ee',
  QUARTE: '#fdba74',
  QUARTE_PLUS: '#fb923c',
  QUINTE_PLUS: OR,
  SUPER_QUATRE: '#f87171',
  MULTI: '#94a3b8',
  MINI_MULTI: '#94a3b8',
}

/** Les noms que la SOREC donne à ses paris (elle écrit « Jumele », sans accent). */
const LIBELLE_SOREC = {
  'Simple Gagnant': 'Simple gagnant',
  'Simple Place': 'Simple placé',
  'Jumele Gagnant': 'Jumelé gagnant',
  'Jumele Place': 'Jumelé placé',
  Trio: 'Trio',
  'Trio Ordre': 'Trio ordre',
  Tierce: 'Tiercé',
  Quarte: 'Quarté',
  'Quarte+': 'Quarté+',
  'Quinte+': 'Quinté+',
  'Super 4': 'Super 4',
}

const LIBELLE_PARI = {
  SIMPLE_GAGNANT: 'Simple gagnant',
  SIMPLE_PLACE: 'Simple placé',
  COUPLE_GAGNANT: 'Couplé gagnant',
  COUPLE_PLACE: 'Couplé placé',
  DEUX_SUR_QUATRE: '2 sur 4',
  TRIO: 'Trio',
  TRIO_ORDRE: 'Trio ordre',
  TIERCE: 'Tiercé',
  QUARTE: 'Quarté',
  QUARTE_PLUS: 'Quarté+',
  QUINTE_PLUS: 'Quinté+',
  SUPER_QUATRE: 'Super 4',
  MULTI: 'Multi',
  MINI_MULTI: 'Mini Multi',
}

/** Le « type » d'une course, celui que casacourses écrit sous l'hippodrome. */
const TYPES = [
  ['QUINTE_PLUS', 'Quinté+'],
  ['QUARTE_PLUS', 'Quarté+'],
  ['QUARTE', 'Quarté'],
  ['TIERCE', 'Tiercé'],
  ['TRIO', 'Trio'],
  ['TRIO_ORDRE', 'Trio'],
]

function aujourdhui() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 280 → « 2,80 € » · 120 → « 1,20 DH » (les deux sources comptent en centimes). */
function argent(centimes, devise = '€') {
  if (centimes == null) return '—'
  return (centimes / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + devise
}

/** « 2026-10-24 » → « samedi 24 octobre 2026 » */
function dateLongue(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** « 2026-10-23 » → « 23/10/26 » (la colonne DATE du tableau) */
function dateCourte(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : iso
}

/**
 * ⭐ ON REGROUPE LES LIGNES QUI PAIENT PAREIL.
 *   Le 2sur4 du 23/10 donnait 6 combinaisons à 21,80 €, le Quinté+ 5 bonus
 *   4sur5 à 14,80 € : onze lignes pour deux chiffres. On écrit « 6
 *   combinaisons », la liste des combinaisons reste dans l'infobulle.
 *   ⚠ On regroupe par (libellé, montant) et non par pari entier : le Quinté+
 *   garde ainsi « Bonus 3 » séparé de ses « Bonus 4sur5 ».
 */
function compacter(lignes) {
  const groupes = new Map()
  for (const l of lignes) {
    const k = l.libelle + '|' + l.centimes
    const g = groupes.get(k)
    if (g) { g.n++; g.combis.push(l.combinaison) }
    else groupes.set(k, { ...l, n: 1, combis: [l.combinaison] })
  }
  return [...groupes.values()].map((g) => (g.n > 1
    ? { ...g, combinaison: g.n + ' combinaisons', infobulle: g.combis.join(' · ') }
    : g))
}

/** « Quinté+ Ordre » → « Ordre » : le nom du pari est déjà le titre de la tuile,
 *  le répéter sur chaque ligne coûte la place de la combinaison (mesuré : le
 *  Quinté+ débordait et s'affichait « Quinté+… »). */
function courtLibelle(l, titre) {
  const t = String(l || '').trim()
  if (!t) return ''
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  const m = t.match(/^(quint[eé]\+?|quart[eé]\+?|tierc[eé]|trio|super\s*4|coupl[eé]|simple|jumel[eé]|multi|2\s*sur\s*4)\s+(.+)$/i)
  const reste = (m ? m[2] : t).trim()
  if (norm(t) === norm(titre)) return ''
  if (/^(gagnant|place|plac[eé])$/.test(norm(reste)) && norm(titre).includes(norm(reste))) return ''
  return reste
}

/** L'ordre de lecture d'un rapport : ordre, désordre, bonus 4, bonus 3, puis
 *  les formules « NP1 ». La SOREC, elle, envoie le bonus d'abord. */
function rangLigne(l) {
  const t = String(l.libelle || '').toLowerCase()
  if (t === 'ordre') return 0
  if (t === 'désordre' || t === 'desordre') return 1
  if (/^bonus 4/.test(t)) return 2
  if (/^bonus 3/.test(t)) return 3
  if (/np1/.test(t)) return 4
  return 5
}

/** Le nom d'un pari, selon la source (la SOREC dit « Jumelé »). */
function nomPari(p, devise) {
  if (devise === 'DH' && p.famille) return LIBELLE_SOREC[p.famille] || p.famille
  return LIBELLE_PARI[p.type] || p.type.replace(/_/g, ' ').toLowerCase()
}

/** « Quinté+ » pour la course qui a un Quinté, sinon Quarté / Tiercé / Trio. */
function typeCourse(c) {
  const types = new Set((c.rapports || []).map((p) => p.type))
  for (const [cle, nom] of TYPES) if (types.has(cle)) return nom
  return ''
}

const cleCourse = (m, c) => `${m.id}|${c.code}`

export default function Resultats() {
  const [date, setDate] = useState(aujourdhui())
  const [reunions, setReunions] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [prog, setProg] = useState(null)
  const [maj, setMaj] = useState('')
  const [maroc, setMaroc] = useState(null)
  const [ouverts, setOuverts] = useState(() => new Set())

  /* ⭐ UNE SEULE RÉPONSE COMPTE : la plus récente. Sans ce compteur, la lecture
   * du JOUR (lente : deux sources) arrive APRÈS celle de la date choisie et
   * écrase l'écran par « aucune course » — vu en ligne le 24/10. */
  const seq = useRef(0)

  const charger = useCallback(async (d, force = false) => {
    const mienne = ++seq.current
    setBusy(true); setMsg(''); setProg(null); setOuverts(new Set())
    try {
      if (force) oublier(d)
      const r = await chargerTout(d, {
        force,
        onProgress: (f, t) => { if (mienne === seq.current) setProg({ faits: f, total: t }) },
      })
      if (mienne !== seq.current) return
      setReunions(r.reunions || [])
      setMaroc(r.maroc || null)
      setMaj(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
      if (!(r.reunions || []).length) setMsg('Aucune course terminée à cette date.')
    } catch (e) {
      if (mienne !== seq.current) return
      setReunions([])
      setMsg('La source ne répond pas — ' + (e && e.message ? e.message : e))
    } finally {
      if (mienne === seq.current) { setBusy(false); setProg(null) }
    }
  }, [])

  useEffect(() => { charger(date) }, [date, charger])

  const nbCourses = useMemo(() => reunions.reduce((n, m) => n + m.races.length, 0), [reunions])

  const basculer = (cle) => setOuverts((avant) => {
    const apres = new Set(avant)
    if (apres.has(cle)) apres.delete(cle)
    else apres.add(cle)
    return apres
  })

  return (
    <>
      <Entete page="resultats" />
      <style>{`
        .res-page{
          min-height:100vh; padding:22px 18px 60px; color:${TXT};
          background:
            radial-gradient(900px 420px at 12% -8%, rgba(251,191,36,.10), transparent 62%),
            radial-gradient(700px 380px at 92% 0%, rgba(34,211,238,.07), transparent 60%),
            linear-gradient(170deg,#04070d,#0a1120 45%,#04070d);
          font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
        }
        .res-in{max-width:1180px;margin:0 auto}

        .res-tete{
          display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;justify-content:space-between;
          padding:18px 20px;border-radius:16px;border:1px solid ${LIGNE};
          background:linear-gradient(140deg,rgba(251,191,36,.07),rgba(13,20,34,.7));
          box-shadow:0 18px 44px rgba(0,0,0,.45);margin-bottom:16px;
        }
        .res-titre{margin:0;font-size:25px;letter-spacing:.5px;font-weight:900;
          background:linear-gradient(92deg,#fff,${OR} 55%,#f59e0b);
          -webkit-background-clip:text;background-clip:text;color:transparent}
        .res-sous{margin:5px 0 0;font-size:12.5px;color:${TXT2}}
        .res-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
        .res-date{
          background:rgba(255,255,255,.04);border:1px solid ${LIGNE};color:${TXT};
          padding:9px 11px;border-radius:10px;font-size:13px;font-family:${MONO};
          color-scheme:dark;
        }
        .res-btn{
          padding:9px 16px;border-radius:10px;cursor:pointer;font-weight:800;font-size:13px;
          border:1px solid ${OR}77;color:#1a1206;
          background:linear-gradient(180deg,${OR2},${OR});
          box-shadow:0 6px 18px rgba(251,191,36,.22);transition:transform .12s,box-shadow .12s;
        }
        .res-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 24px rgba(251,191,36,.3)}
        .res-btn:disabled{opacity:.55;cursor:default}
        .res-etat{font-size:11.5px;color:${TXT3};font-family:${MONO}}

        .res-cadre{border-radius:14px;border:1px solid ${LIGNE};background:${VERRE};
          box-shadow:0 12px 34px rgba(0,0,0,.4);overflow:hidden}
        .res-scroll{overflow-x:auto}

        table.res-tab{width:100%;border-collapse:collapse;font-size:13px;min-width:640px}
        table.res-tab thead th{
          text-align:left;padding:10px 10px;font-size:10.5px;letter-spacing:.9px;
          text-transform:uppercase;color:${TXT3};font-weight:900;
          background:rgba(255,255,255,.03);border-bottom:1px solid ${LIGNE};white-space:nowrap;
        }
        table.res-tab tbody td{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.055);vertical-align:middle}
        table.res-tab tbody tr.res-ligne:hover{background:rgba(251,191,36,.045)}
        table.res-tab tbody tr.res-deb td{border-bottom:2px solid rgba(251,191,36,.28)}

        .res-d{font-family:${MONO};font-size:12px;color:${TXT2};white-space:nowrap}
        .res-terr{display:flex;flex-direction:column;gap:2px;min-width:148px}
        .res-terr b{font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px}
        .res-terr small{font-size:10.5px;color:${TXT3};display:flex;gap:7px;align-items:center}
        .res-typ{color:${OR2};font-weight:800;font-size:10.5px;letter-spacing:.4px}

        .res-arr{display:flex;gap:3px;flex-wrap:nowrap;white-space:nowrap}
        .res-case{
          min-width:24px;height:24px;padding:0 4px;border-radius:4px;
          display:inline-flex;align-items:center;justify-content:center;
          font-family:${MONO};font-size:12.5px;font-weight:900;color:#fff;
        }
        .res-case.v{background:${VERT};box-shadow:inset 0 -2px 0 rgba(0,0,0,.28)}
        .res-case.r{background:${ROUGE};box-shadow:inset 0 -2px 0 rgba(0,0,0,.28)}
        .res-case.d{background:rgba(255,255,255,.09);color:${TXT2}}

        .res-ouv{
          padding:6px 12px;border-radius:8px;cursor:pointer;font-size:11.5px;font-weight:800;
          border:1px solid rgba(251,191,36,.4);color:${OR2};background:rgba(251,191,36,.08);
          white-space:nowrap;
        }
        .res-ouv:hover{background:rgba(251,191,36,.16)}
        .res-ouv.on{background:rgba(251,191,36,.9);color:#1a1206;border-color:${OR}}
        .res-ouv:disabled{opacity:.35;cursor:default}

        .res-detail td{background:rgba(0,0,0,.28);padding:0!important}
        .res-detail-in{padding:13px 14px 15px;display:flex;flex-wrap:wrap;gap:10px}
        .res-bloc{
          border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:8px 11px;
          background:rgba(255,255,255,.02);min-width:190px;max-width:360px;flex:1 1 210px;
        }
        .res-bloc-t{font-size:9.5px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;margin-bottom:5px}
        .res-l{display:flex;align-items:baseline;gap:7px;padding:1.5px 0}
        .res-l span{font-size:10.5px;color:${TXT2};flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .res-l i{font-family:${MONO};font-size:10.5px;color:${TXT3};font-style:normal;white-space:nowrap;flex:0 0 auto}
        .res-l b{font-family:${MONO};font-size:12.5px;color:#fff;white-space:nowrap;flex:0 0 auto}

        .res-vide{padding:30px;text-align:center;color:${TXT2};font-size:13.5px}
        .res-pied{margin-top:16px;font-size:11px;color:${TXT3};line-height:1.9;text-align:center}
        @media (max-width:560px){ .res-titre{font-size:20px} }
      `}</style>

      <div className="res-page">
        <div className="res-in">

          <div className="res-tete">
            <div>
              <h1 className="res-titre">RÉSULTATS &amp; RAPPORTS</h1>
              <p className="res-sous">
                Arrivées et rapports · <span style={{ color: OR2 }}>{dateLongue(date)}</span>
                {nbCourses ? ` · ${nbCourses} course${nbCourses > 1 ? 's' : ''}` : ''}
              </p>
            </div>
            <div className="res-actions">
              <input
                type="date"
                className="res-date"
                value={date}
                max={aujourdhui()}
                onChange={(e) => setDate(e.target.value)}
              />
              <button className="res-btn" onClick={() => charger(date, true)} disabled={busy}>
                {busy ? '⟳ Lecture…' : '↻ Actualiser'}
              </button>
              <span className="res-etat">
                {busy && prog ? `rapports ${prog.faits}/${prog.total}` : ''}
                {!busy && maj ? `lu à ${maj}` : ''}
              </span>
            </div>
          </div>

          <div className="res-cadre">
            {msg ? <div className="res-vide">{msg}</div> : (
              <div className="res-scroll">
                <table className="res-tab">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Terrain</th>
                      <th>Arrivée</th>
                      <th>Non-partant(s)</th>
                      <th>Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reunions.map((m) => m.races.map((c, i) => {
                      const cle = cleCourse(m, c)
                      const ouvert = ouverts.has(cle)
                      const paris = [...(c.rapports || [])].sort((a, b) => {
                        const ia = ORDRE.indexOf(a.type), ib = ORDRE.indexOf(b.type)
                        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
                      })
                      const devise = m.devise || '€'
                      const derniere = i === m.races.length - 1
                      return (
                        <FragmentLigne
                          key={cle}
                          m={m} c={c} cle={cle} ouvert={ouvert} paris={paris}
                          devise={devise} derniere={derniere} date={date}
                          basculer={basculer}
                        />
                      )
                    }))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="res-pied">
            <div>
              Maroc : <b style={{ color: OR2 }}>SOREC</b> (e-sorec.ma) — arrivée et rapports en <b>dirhams</b>, pour 1 DH misé
              {maroc && maroc.source === 'archive' && maroc.maj
                ? ` · archive du ${new Date(maroc.maj).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                : maroc && maroc.source === 'direct' ? ' · en direct'
                  : maroc && maroc.source === 'aucune' ? ' · pas encore d\'archive pour cette date' : ''}
              .
            </div>
            <div>France et autres pays : arrivées pro.casacourses.com · rapports officiels PMU, pour 1 € misé.</div>
          </div>

        </div>
      </div>
    </>
  )
}

/* Une course = une ligne, plus — si on l'ouvre — la ligne des rapports. */
function FragmentLigne({ m, c, cle, ouvert, paris, devise, derniere, date, basculer }) {
  return (
    <>
      <tr className={'res-ligne' + (derniere ? ' res-deb' : '')}>
        <td className="res-d">{dateCourte(date)}</td>

        <td>
          <div className="res-terr">
            <b>
              <Drapeau pays={m.pays} h={12} />
              {m.reunion ? <span style={{ color: OR }}>{m.reunion}</span> : null}
              {m.track}
            </b>
            <small>
              <span className="res-typ">{typeCourse(c) || c.discipline || '—'}</span>
              <span>{c.code}</span>
              {c.heure ? <span>{c.heure}</span> : null}
              {c.distance ? <span>{c.distance} m</span> : null}
            </small>
          </div>
        </td>

        <td>
          <div className="res-arr">
            {c.arrivee.map((x) => (
              <span className="res-case v" key={x.pos} title={`${x.nom}${x.jockey ? ' · ' + x.jockey : ''}`}>
                {x.num}
              </span>
            ))}
          </div>
        </td>

        <td>
          <div className="res-arr">
            {(c.nonPartants || []).length
              ? c.nonPartants.map((n) => <span className="res-case r" key={n}>{n}</span>)
              : <span style={{ color: TXT3, fontSize: 11.5 }}>—</span>}
          </div>
        </td>

        <td>
          <button
            className={'res-ouv' + (ouvert ? ' on' : '')}
            onClick={() => basculer(cle)}
            disabled={!paris.length}
          >
            {!paris.length ? 'Aucun rapport' : ouvert ? '▲ Fermer' : 'Rapport ▼'}
          </button>
        </td>
      </tr>

      {ouvert && paris.length ? (
        <tr className="res-detail">
          <td colSpan={5}>
            <div className="res-detail-in">
              {paris.map((p) => {
                const coul = COULEUR[p.type] || '#94a3b8'
                return (
                  <div className="res-bloc" key={p.type} style={{ borderColor: coul + '44' }}>
                    <div className="res-bloc-t" style={{ color: coul }}>{nomPari(p, devise)}</div>
                    {compacter([...p.lignes].sort((a, b) => rangLigne(a) - rangLigne(b))).map((l, i) => {
                      const lab = courtLibelle(l.libelle, nomPari(p, devise))
                      return (
                        <div className="res-l" key={i} title={l.infobulle || ''}>
                          <span>{lab || l.combinaison}</span>
                          {lab ? <i>{l.combinaison}</i> : null}
                          <b>{argent(l.centimes, devise)}</b>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
