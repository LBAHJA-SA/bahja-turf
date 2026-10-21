import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Entete from '../../src/Entete.jsx'
import Drapeau from '../../src/Drapeau.jsx'
import { heureParisGMT, heureGMTParPays } from '../../src/temps.js'
import { chargerProgramme, chargerCourse, grouperParReunion } from '../../backend/COUPLE/donnees.js'
import { selectionCoply, repliMarche } from '../../backend/COUPLE/moteur-coply.js'

/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/COUPLE/Couple.jsx — LES COURSES DU JOUR, UNE PAR UNE.
 *
 *  La page montre les courses du jour (les vivantes, pas l'historique) avec
 *  tous leurs partants. C'est l'outil d'OBSERVATION : le moteur « 1er + 2e
 *  + 3e » viendra après, quand la vue sera validée (§18.2 — la vue avant
 *  la règle).
 *
 *  Ses dossiers lui sont propres :
 *     frontend/COUPLE/Couple.jsx   l'affichage (ce fichier)
 *     backend/COUPLE/donnees.js    les appels réseau (navigateur uniquement)
 *     api/couple.js                les données (disque + reu.php, côté serveur)
 *  Elle n'importe rien d'une autre page : le partage est interdit.
 * ══════════════════════════════════════════════════════════════════════════ */

/* LE THÈME DE LA PAGE — orange sur nuit (18/10/2026). `fond` est transparent :
   c'est le fond néon de src/index.css qui passe dessous. */
const TE = {
  fond: 'transparent',
  entete: 'linear-gradient(120deg,#1a0a04 0%,#9a3412 55%,#fb923c 100%)',
  accent: '#fb923c',
  accentSombre: '#7c2d12',
  accentClair: 'rgba(251,146,60,.16)',
  bord: 'rgba(251,146,60,.45)',
  carte: 'rgba(22,14,8,.76)',
  alt: 'rgba(251,146,60,.06)',
  police: 'system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, Consolas, monospace',
}

const S = {
  box: { border: '2px solid ' + TE.bord, borderRadius: 10, background: TE.carte },
  th: { padding: '7px 9px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'left' },
  td: { padding: '6px 9px', fontSize: 13 },
}

export default function Couple() {
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(aujourdhui)
  const [programme, setProgramme] = useState(null)
  const [err, setErr] = useState(null)
  const [cle, setCle] = useState(null)
  const [detail, setDetail] = useState(null)
  const [errDetail, setErrDetail] = useState(null)
  const [emp, setEmp] = useState(null)

  useEffect(() => { document.title = 'Coply — Bahja TURF' }, [])

  /* ⓪ L'EMPREINTE DU TRIO — lue telle quelle, jamais recalculée dans la page.
     Écrite par `node tools/empreinte-trio.mjs` (data + public/data). */
  useEffect(() => {
    let mort = false
    fetch('/data/empreinte-trio.json', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!mort) setEmp(j) })
      .catch(() => {})
    return () => { mort = true }
  }, [])

  /* ① le programme du jour */
  useEffect(() => {
    let mort = false
    setProgramme(null); setErr(null); setDetail(null); setCle(null); setErrDetail(null)
    chargerProgramme(date)
      .then((d) => { if (!mort) setProgramme(d) })
      .catch((e) => { if (!mort) setErr(e.message || 'source indisponible') })
    return () => { mort = true }
  }, [date])

  /* ② le détail d'une course */
  useEffect(() => {
    if (!cle) return
    let mort = false
    setDetail(null); setErrDetail(null)
    chargerCourse(cle)
      .then((d) => { if (!mort) setDetail(d.course) })
      .catch((e) => { if (!mort) setErrDetail(e.message || 'course illisible') })
    return () => { mort = true }
  }, [cle])

  /* ②bis re-lecture auto quand les cotes manquent (13/10/2026) : reu.php
     publie la ref progressivement, course par course — la page réessaie
     seule toutes les 2 min au lieu d'exiger un re-clic. S'arrête dès
     ≥3 cotes valides ou arrivée publiée. Lecture seule, aucun remplissage. */
  useEffect(() => {
    if (!cle || !detail) return
    const nb = (detail.partants || []).filter((p) => Number(p.coteRef) > 0).length
    if (nb >= 3 || (detail.arrivee || []).length) return
    const t = setInterval(() => {
      chargerCourse(cle).then((d) => setDetail(d.course)).catch(() => {})
    }, 120000)
    return () => clearInterval(t)
  }, [cle, detail])

  const groupes = grouperParReunion(programme?.courses)
  /* Accordéon : une seule réunion ouverte à la fois. 8 réunions × 8 courses
     = 65 lignes : même avec un scroll par réunion, la page restait trop
     longue. Par défaut la première est ouverte. */
  const [ouvert, setOuvert] = useState(null)
  useEffect(() => {
    if (groupes.length && ouvert == null) setOuvert(0)
  }, [groupes.length])

  return (
    <>
      <Entete page="couple" />

      <div dir="ltr" style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 16px 40px', minHeight: '72vh',
        fontFamily: TE.police, background: TE.fond,
        borderLeft: '3px solid ' + TE.bord, borderRight: '3px solid ' + TE.bord,
      }}>
        <div style={{ margin: '0 -16px 14px', padding: '13px 16px', color: '#fff', background: TE.entete, borderBottom: '3px solid ' + TE.accent }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Couplé</h2>
            <span style={{ fontSize: 12, opacity: 0.92 }}>Les courses du jour, une par une — 1er, 2e, 3e</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(125,205,255,.28)', fontFamily: TE.mono }} />
          <span style={{ fontSize: 12, color: '#8fa3bf' }}>
            le programme officiel du jour
            {programme ? ` · ${programme.nb} courses` : ''}
          </span>
        </div>

        {err && (
          <div style={{ background: '#fee2e2', padding: 14, borderRadius: 10, color: '#7f1d1d', fontSize: 13, marginBottom: 12 }}>
            ⚠ {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* ── les réunions : chacune son scroll.
              8 réunions × 8 courses = 65 lignes : un seul scroll les enterre.
              Chaque réunion a donc sa propre zone qui défile (≈ 4 courses
              visibles), l'en-tête restant fixe. */}
          <div style={{ flex: '1 1 360px', minWidth: 330, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!programme && !err && (
              <div style={{ padding: 24, color: '#8fa3bf', fontSize: 13, background: 'rgba(12,20,37,.72)', borderRadius: 10, border: '1px solid ' + TE.bord }}>
                Chargement du programme…
              </div>
            )}
            {groupes.map((g, gi) => (
              <div key={g.reunion + g.hippodrome} style={S.box}>
                <button onClick={() => setOuvert(ouvert === gi ? null : gi)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: TE.entete, padding: '8px 13px', border: 'none',
                    borderRadius: '8px 8px 0 0', fontFamily: TE.police,
                  }}>
                  <b style={{ color: '#fff', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>{ouvert === gi ? '▾' : '▸'}</span>
                    {/* le drapeau du pays — une VRAIE image (Windows ne dessine
                        pas les drapeaux emoji) */}
                    <Drapeau pays={g.pays} titre={g.pays || 'France'} h={12} style={{ display: 'inline-block' }} />
                    <span>{g.reunion} · {g.hippodrome}</span>
                  </b>
                  {g.pays && g.pays !== 'FRANCE' && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#fed7aa' }}>· {g.pays}</span>
                  )}
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#fed7aa' }}>
                    · {g.courses.length} courses
                  </span>
                </button>
                {ouvert !== gi ? null : (
                <div style={{ maxHeight: 208, overflowY: 'auto' }}>
                  {g.courses.map((c) => (
                    <button key={c.cle} onClick={() => setCle(c.cle)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '8px 13px',
                        border: 'none', borderBottom: '1px solid #f5f5f4', cursor: 'pointer',
                        background: cle === c.cle ? TE.accentClair : 'rgba(255,255,255,.03)',
                        borderLeft: '4px solid ' + (cle === c.cle ? TE.accent : 'transparent'),
                        fontFamily: TE.police,
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: TE.accent }}>
                        {c.code}{c.heure ? ` · ${heureGMTParPays(c.pays, date, c.heure)}` : ''}
                        {c.distance ? <span style={{ fontWeight: 600, color: '#8fa3bf' }}> · {c.distance}m</span> : null}
                        {c.partants ? <span style={{ fontWeight: 600, color: '#8fa3bf' }}> · {c.partants}p</span> : null}
                      </div>
                      <div style={{ fontSize: 11, color: '#57534e' }}>{c.nom || '—'}</div>
                    </button>
                  ))}
                </div>
                )}
              </div>
            ))}
          </div>

          {/* ── la lecture ── */}
          <div style={{ flex: '3 1 600px', minWidth: 400 }}>
            {!cle && (
              <div style={{ padding: 40, textAlign: 'center', background: 'rgba(12,20,37,.72)', borderRadius: 12, border: '1px solid ' + TE.bord, color: '#8fa3bf' }}>
                Choisis une course pour voir ses partants.
              </div>
            )}
            {cle && !detail && !errDetail && (
              <div style={{ padding: 40, textAlign: 'center', background: 'rgba(12,20,37,.72)', borderRadius: 12, border: '1px solid ' + TE.bord }}>
                Chargement de la course…
              </div>
            )}
            {errDetail && (
              <div style={{ background: '#fee2e2', padding: 14, borderRadius: 10, color: '#7f1d1d', fontSize: 13 }}>
                ⚠ {errDetail}
              </div>
            )}
            {detail && <Lecture course={detail} date={date} />}
          </div>
        </div>

        <EmpreinteTrio emp={emp} />

        <div style={{ marginTop: 18, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          ⚠ Moteur prédictif actif — régression logistique sur P(top-3), entraînée sur l'archive.
        </div>
      </div>
    </>
  )
}

/* ───────────────────────────────────────────────────── la lecture ───────── */

function Lecture({ course, date }) {
  const partants = course.partants || []
  const arrivee = (course.arrivee || []).slice(0, 5)
  const [sel, setSel] = useState(null)
  const [presses, setPresses] = useState(null)
  const nbCotes = partants.filter((p) => Number(p.coteRef) > 0).length

  /* ①bis L'ORDRE DU CARNET — publié pour le Quinté dans /data/synthese.json
     (écrit par `tools/daily.mjs`). Mesuré le 21/10/2026 sur 94 Quintés, en
     euros : le carnet perd −56 % au trio (les 3 favoris : −74 %) et −3,4 % au
     couplé placé (les 3 favoris : −22,4 %). Ailleurs, pas de presse → cotes. */
  useEffect(() => {
    let mort = false
    fetch('/data/synthese.json', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!mort && j) setPresses(j) })
      .catch(() => {})
    return () => { mort = true }
  }, [])

  const jour = String(course.date || date || '').slice(0, 10)
  const cleQuinte = String(course.cle || '').split('_').slice(0, 3).join('_')

  useEffect(() => {
    if (partants.length >= 3) {
      let mort = false
      const fiche = presses && presses[jour]
      const p = fiche && fiche.cle === cleQuinte && Array.isArray(fiche.synthese)
        ? fiche.synthese.map(Number).filter((x) => x > 0)
        : null
      selectionCoply(partants, p && p.length >= 3 ? { ...course, presse: p } : course, 3)
        .then((s) => { if (!mort) setSel(s) })
        .catch(() => { if (!mort) setSel({ chevaux: repliMarche(partants, 3), repli: true }) })
      return () => { mort = true }
    }
  }, [partants, course, presses, jour, cleQuinte])

  return (
    <>
      <div style={{ ...S.box, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: TE.accent }}>
          {course.reunion}-{course.code}{course.nom ? ' · ' + course.nom : ''}
        </div>
        <div style={{ fontSize: 13, color: '#57534e', marginTop: 4 }}>
          <Drapeau pays={course.pays} titre={course.pays || 'France'} h={12}
            style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 5 }} />
          {course.hippodrome}
          {course.distance ? ` · ${course.distance}m` : ''}
          {course.discipline ? ` · ${course.discipline}` : ''}
          {course.heure ? ` · ${heureGMTParPays(course.pays, date, course.heure)}` : ''}
          {course.pays && course.pays !== 'FRANCE' ? ` · ${course.pays}` : ''}
        </div>
        {arrivee.length > 0 && (
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: TE.mono, marginTop: 8, color: '#15803d' }}>
            Arrivée : {arrivee.join('  ·  ')}
          </div>
        )}
      </div>

      {/* ── cotes provisoires ── */}
      {(course.cotesEq || 0) > 0 && (
        <div style={{ ...S.box, padding: '8px 12px', marginBottom: 12, background: 'rgba(251,191,36,.10)', borderColor: 'rgba(251,191,36,.35)', fontSize: 12, color: '#fde68a' }}>
          ⏳ {course.cotesEq}/{partants.length} cotes provisoires (marché du matin) — la sélection suivra la ref dès publication.
        </div>
      )}

      {!sel && partants.length >= 3 && (
        <div style={{ fontSize: 12, color: '#8fa3bf', marginTop: 6 }}>
          {nbCotes < 3
            ? `Pas assez de cotes publiées (${nbCotes}/${partants.length}) — la page réessaie seule toutes les 2 min.`
            : 'Sélection impossible.'}
        </div>
      )}

      {sel && (
        <div style={{ ...S.box, padding: '14px 16px', marginBottom: 12, borderLeft: '5px solid #34d399', background: 'rgba(52,211,153,.10)' }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#166534', fontWeight: 800 }}>
            Sélection
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, fontFamily: TE.mono, letterSpacing: 6, color: '#fff', marginTop: 6 }}>
            {sel.chevaux.join(' · ')}
          </div>
          <div style={{ fontSize: 11, color: '#a8b6cc', marginTop: 6 }}>
            {sel.repli
              ? 'cotes — moteur indisponible'
              : sel.modele?.regle === 'carnet'
                ? 'carnet P1·P2 + le désaccord du marché'
                : 'cotes — pas de presse publiée pour cette course'}
          </div>
        </div>
      )}

      {partants.length === 0 ? (
        <div style={{ padding: 26, textAlign: 'center', background: 'rgba(12,20,37,.72)', borderRadius: 12, border: '1px solid ' + TE.bord, color: '#8fa3bf', fontSize: 13 }}>
          {course.erreur
            ? `Les partants ne sont pas encore publiés (${course.erreur}).`
            : 'Les partants de cette course ne sont pas encore publiés.'}
        </div>
      ) : (
        <div style={{ ...S.box, overflow: 'hidden' }}>
          <div style={{ background: TE.entete, padding: '9px 13px' }}>
            <b style={{ color: '#fff', fontSize: 12, letterSpacing: 1 }}>PARTANTS ({partants.length})</b>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f5f4' }}>
                  {['N°', 'Cheval', 'Jockey', 'Entraîneur', 'Pds', 'Cote', 'Gains', 'Musique'].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partants.map((p, i) => (
                  <tr key={p.num} style={{ background: i % 2 ? TE.alt : 'transparent', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                    <td style={{ ...S.td, fontWeight: 800, fontFamily: TE.mono, color: TE.accent }}>{p.num}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{p.cheval || '—'}</td>
                    <td style={S.td}>{p.driver || '—'}</td>
                    <td style={S.td}>{p.entraineur || '—'}</td>
                    <td style={{ ...S.td, fontFamily: TE.mono }}>{p.poids ?? p.def ?? '—'}</td>
                    <td style={{ ...S.td, fontFamily: TE.mono, fontWeight: 700 }}>{p.cote ?? '—'}</td>
                    <td style={{ ...S.td, fontFamily: TE.mono }}>{p.gains ?? '—'}</td>
                    <td style={{ ...S.td, fontFamily: TE.mono, fontSize: 11 }}>{p.musique || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

/* ─────────────────────────────────────── l'empreinte du Trio ─────────────── */

/* Les chiffres viennent de /data/empreinte-trio.json, écrit par
 * `node tools/empreinte-trio.mjs`. AUCUN nombre n'est saisi ici.
 *
 * Même objet que l'empreinte du podium (§15.8) : la case du carnet (P1..P20)
 * des TROIS premiers, et rien d'autre. Le Trio se joue en désordre — une
 * empreinte « 1-2-4 » se lit donc en TROIS paires : 1-2 · 1-4 · 2-4. */
function EmpreinteTrio({ emp }) {
  if (!emp?.motifs || !emp?.pairesCases) return null
  const nbx = (x) => (x == null ? '—' : String(x).replace('.', ','))
  const pc = (x) => nbx(x) + ' %'

  const h = {
    padding: '5px 6px', fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
    textTransform: 'uppercase', color: '#8fa3bf', textAlign: 'left',
    borderBottom: '1px solid rgba(251,146,60,.35)', whiteSpace: 'nowrap',
  }
  const td = { padding: '3px 6px', fontSize: 12.5, fontFamily: TE.mono, color: '#e7e5e4', whiteSpace: 'nowrap' }
  const nb = { ...td, textAlign: 'right', color: '#c7d6ea' }
  const pctd = { ...td, textAlign: 'right', fontWeight: 800, color: TE.accent }

  /* une colonne = une liste (motif ou empreinte) : valeur · n · % · barre */
  const colonne = (titre, liste, cle, pied) => (
    <div style={{ flex: '1 1 300px', minWidth: 280 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase', color: TE.accent, marginBottom: 6 }}>{titre}</div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {liste.slice(0, 8).map((m) => (
            <tr key={m[cle]} style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <td style={{ ...td, fontWeight: 800, color: '#fff' }}>{m[cle]}</td>
              <td style={nb}>{m.n}</td>
              <td style={pctd}>{pc(m.pct)}</td>
              <td style={{ padding: '3px 6px', width: 84 }}>
                <div style={{ height: 7, borderRadius: 4, background: TE.accent, opacity: .8, width: Math.max(2, m.pct * 3.2) }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10.5, color: '#8fa3bf', marginTop: 7, lineHeight: 1.55 }}>{pied}</div>
    </div>
  )

  const moy = emp.moyenne || {}
  const paires = (emp.paires || []).slice(0, 5)

  return (
    <div style={{ ...S.box, padding: 14, marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <b style={{ fontSize: 15, color: '#fff' }}>L'empreinte du Trio — les 3 premières places</b>
        <span style={{ fontSize: 11, color: '#8fa3bf' }}>
          {emp.n} Quintés à presse réelle ({emp.periode?.debut} → {emp.periode?.fin}) · lus par <b>case du carnet</b> (P1..P20), le même P que la grille.
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#8fa3bf', marginBottom: 12 }}>
        Un <b>motif</b> = combien de chevaux de chaque groupe : <b>G1·G2·G3·G4·G5</b>.
        {' '}3 numéros = <b>3 paires</b> : les deux premiers paient le <b>gagnant</b>, deux des trois paient le <b>placé</b>, les trois paient le <b>trio</b>.
      </div>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
        {colonne('① Le motif', emp.motifs, 'motif', (
          <>
            moyenne par course · <b>G1 {nbx(moy.G1)}</b> · G2 {nbx(moy.G2)} · G3 {nbx(moy.G3)} · G4 {nbx(moy.G4)} · G5 {nbx(moy.G5)}
            <br />{emp.motifs.length} motifs sur {emp.n} courses
          </>
        ))}
        {colonne('② Les 3 paires', emp.pairesCases, 'paire', (
          <>
            <b>{emp.pairesCases.length}</b> paires distinctes · la plus fréquente : <b>{emp.pairesCases[0]?.paire}</b> ({pc(emp.pairesCases[0]?.pct)})
            <br />un % = si je joue ces <b>deux cases</b>, le couplé paie dans X % des courses
          </>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#8fa3bf', fontFamily: TE.mono }}>
        par bloc · {paires.map((p) => `${p.blocs} ${pc(p.pct)}`).join(' · ')}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: '#8fa3bf', fontFamily: TE.mono }}>
        P1..Pk — <b>couplé ≥ 2</b> / trio : {(emp.courbe || []).slice(0, 10).map((c) => `P${c.k} ${pc(c.couple)} / ${pc(c.trio)}`).join(' · ')}
      </div>
    </div>
  )
}
