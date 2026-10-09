import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chargerProgramme, chargerCourse, grouperParReunion } from '../../backend/COUPLE/donnees.js'
import { verdict } from '../../backend/COUPLE/moteur.js'

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

const TE = {
  fond: 'linear-gradient(180deg,#fff7ed 0%,#fef2f2 55%,#ffffff 100%)',
  entete: 'linear-gradient(120deg,#7c2d12 0%,#c2410c 55%,#ea580c 100%)',
  accent: '#c2410c',
  accentSombre: '#7c2d12',
  accentClair: '#ffedd5',
  bord: '#fdba74',
  carte: '#ffffff',
  alt: '#fff7ed',
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
  /* La base des empreintes : UNE requête, au chargement. Sans elle le
     moteur ne peut pas parler — la page l'affiche, elle ne l'invente pas. */
  const [base, setBase] = useState(null)
  useEffect(() => {
    let mort = false
    fetch('/data/empreinte-v3.json', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((d) => { if (!mort) setBase(d) })
      .catch(() => { if (!mort) setBase(null) })
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
      <header className="header" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#7c2d12 70%,#0f172a 100%)', borderBottom: '2px solid #ea580c' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-horse.png" alt="Bahja TURF" style={{ height: 44, background: 'white', borderRadius: 8, padding: 2 }} />
            <img src="/logo.svg" alt="Bahja TURF" style={{ height: 42, borderRadius: 8 }} />
          </div>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link to="/" style={{ color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Programme</Link>
            <Link to="/couple" style={{ color: '#fdba74', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>Couplé</Link>
            <Link to="/quinte" style={{ color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Quinté</Link>
          </nav>
        </div>
      </header>

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
            style={{ padding: '7px 11px', borderRadius: 8, border: '1px solid #d6d3c8', fontFamily: TE.mono }} />
          <span style={{ fontSize: 12, color: '#78716c' }}>
            le programme du jour · source : reu.php
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
              <div style={{ padding: 24, color: '#a8a29e', fontSize: 13, background: '#fff', borderRadius: 10, border: '1px solid ' + TE.bord }}>
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
                  <b style={{ color: '#fff', fontSize: 13 }}>
                    {ouvert === gi ? '▾' : '▸'} {g.reunion} · {g.hippodrome}
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
                        background: cle === c.cle ? TE.accentClair : '#fff',
                        borderLeft: '4px solid ' + (cle === c.cle ? TE.accent : 'transparent'),
                        fontFamily: TE.police,
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: TE.accentSombre }}>
                        {c.code}{c.heure ? ` · ${c.heure}` : ''}
                        {c.distance ? <span style={{ fontWeight: 600, color: '#78716c' }}> · {c.distance}m</span> : null}
                        {c.partants ? <span style={{ fontWeight: 600, color: '#78716c' }}> · {c.partants}p</span> : null}
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
              <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid ' + TE.bord, color: '#78716c' }}>
                Choisis une course pour voir ses partants.
              </div>
            )}
            {cle && !detail && !errDetail && (
              <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid ' + TE.bord }}>
                Chargement de la course…
              </div>
            )}
            {errDetail && (
              <div style={{ background: '#fee2e2', padding: 14, borderRadius: 10, color: '#7f1d1d', fontSize: 13 }}>
                ⚠ {errDetail}
              </div>
            )}
            {detail && <Lecture course={detail} base={base} />}
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          ⚠ Laboratoire — lecture seule. Le moteur « 1er + 2e + 3e » viendra quand cette vue sera validée.
        </div>
      </div>
    </>
  )
}

/* ───────────────────────────────────────────────────── la lecture ───────── */

function Lecture({ course, base }) {
  const partants = course.partants || []
  /* L'empreinte de CETTE course : le trio candidat, sa forme complète et
     sa personnalité (combien de fois vue, ce qui s'est passé). */
  const v = partants.length >= 3 && base ? verdict(partants, base) : null
  const emp = v?.empreinte
  return (
    <>
      <div style={{ ...S.box, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: TE.accentSombre }}>
          {course.reunion}-{course.code}{course.nom ? ' · ' + course.nom : ''}
        </div>
        <div style={{ fontSize: 13, color: '#57534e', marginTop: 4 }}>
          {course.hippodrome}
          {course.distance ? ` · ${course.distance}m` : ''}
          {course.discipline ? ` · ${course.discipline}` : ''}
          {course.heure ? ` · ${course.heure}` : ''}
          {course.pays && course.pays !== 'FRANCE' ? ` · ${course.pays}` : ''}
        </div>
      </div>

      {v && v.trio && (
        <div style={{
          ...S.box, padding: 14, marginBottom: 12,
          borderLeft: '5px solid ' + (v.niveau === 'FULL' ? '#16a34a' : v.niveau === 'FAM' ? '#d97706' : '#d6d3d1'),
          background: v.niveau === 'FULL' ? '#f0fdf4' : '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <b style={{ fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: TE.accentSombre }}>
              Empreinte : {v.empreinte || '—'}
            </b>
            {v.niveau !== 'FULL' && v.empreinteJour && v.empreinteJour !== v.empreinte && (
              <span style={{ fontSize: 11, color: '#78716c' }}>· jour : {v.empreinteJour}</span>
            )}
            <span style={{ fontSize: 12, fontWeight: 800, color: '#78716c' }}>
              {v.niveau}{v.support ? ` · ${v.support} courses` : ''}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: TE.mono, marginTop: 6 }}>
            Top 3 : {v.trio.join('  ·  ')}
          </div>
          {v.coherence && (
            <>
              <div style={{ fontSize: 12, color: '#57534e', marginTop: 6 }}>
                Cohérence — rang : <b>{v.coherence.rankDev}</b>
                {' · '}profil : <b>{v.coherence.profDev}</b>
                {' · '}relations : <b>{Math.round(v.coherence.relFreq * 100)}%</b>
              </div>
              {v.profil && (
                <div style={{ fontSize: 12, color: '#57534e', marginTop: 6 }}>
                  Historique — rangs médians : <b>{(v.profil.medRangs || []).join('-')}</b>
                  {' · '}cotes médianes : <b>{(v.profil.medCote || []).join('-')}</b>
                  {v.profil.paires.map((p) => (
                    <span key={p.paire} style={{ marginLeft: 10 }}>{p.paire} : <b>{p.habituelle}</b></span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {v && !v.trio && (
        <div style={{ fontSize: 12, color: '#78716c', marginTop: 6 }}>
          {v.raison === 'aucun antécédent'
            ? 'Aucun antécédent pour les trios de cette course.'
            : v.raison === 'pas assez de cotes'
              ? `Pas assez de cotes publiées (${v.cotes || '?'}) — reu.php les publie progressivement dans la journée. Re-clique la course plus tard.`
              : v.raison || 'Base des empreintes introuvable.'}
        </div>
      )}

      {partants.length === 0 ? (
        <div style={{ padding: 26, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid ' + TE.bord, color: '#78716c', fontSize: 13 }}>
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
                  <tr key={p.num} style={{ background: i % 2 ? TE.alt : '#fff', borderBottom: '1px solid #f5f5f4' }}>
                    <td style={{ ...S.td, fontWeight: 800, fontFamily: TE.mono, color: TE.accentSombre }}>{p.num}</td>
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
