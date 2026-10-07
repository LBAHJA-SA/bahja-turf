import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/COPLY/Coply.jsx — les courses UNE PAR UNE, avec leurs partants.
 *
 *  Deux vues dans la même page :
 *    · le SÉLECTEUR de date — le jour (le programme de reu.php) ou une date
 *      passée (les archives). La liste des courses vient de `/api/labo`.
 *    · la LECTURE — une course, tous ses partants, l'arrivée réelle. C'est
 *      l'outil d'OBSERVATION : le moteur viendra après (§18.2 — on construit
 *      la vue avant la règle).
 *
 *  ⚠ LABORATOIRE (§18.4). Cette page ne modifie rien : ni ticket, ni
 *  archive, ni corpus. Elle ne fait que lire.
 *
 *  Ses dossiers lui sont propres :
 *     frontend/COPLY/     l'affichage
 *     api/labo.js         les données (le disque, pas le navigateur)
 *  Elle n'importe rien d'une autre page : le partage des moteurs est interdit.
 * ══════════════════════════════════════════════════════════════════════════ */

const TE = {
  fond: 'linear-gradient(180deg,#fef2f2 0%,#fff7ed 55%,#ffffff 100%)',
  entete: 'linear-gradient(120deg,#7f1d1d 0%,#dc2626 55%,#f97316 100%)',
  accent: '#dc2626',
  accentSombre: '#7f1d1d',
  accentClair: '#fee2e2',
  bord: '#fca5a5',
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

export default function Coply() {
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(aujourdhui)
  const [liste, setListe] = useState(null)
  const [err, setErr] = useState(null)
  const [choisi, setChoisi] = useState(null)   // l'index dans la liste
  const [detail, setDetail] = useState(null) // la course lue

  /* ① la liste des courses de la date */
  useEffect(() => {
    let mort = false
    setListe(null); setErr(null); setDetail(null); setChoisi(null)
    fetch(`/api/labo?date=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((d) => {
        if (mort) return
        if (d.erreur) throw new Error(d.erreur)
        setListe(d)
      })
      .catch((e) => { if (!mort) setErr(e.message || 'source indisponible') })
    return () => { mort = true }
  }, [date])

  /* ② le détail d'une course : les partants */
  useEffect(() => {
    if (choisi == null || !liste?.courses?.[choisi]) return
    const c = liste.courses[choisi]
    let mort = false
    setDetail(null)
    // une course déjà passée est déjà dans l'archive : le serveur la renvoie
    fetch(`/api/labo?date=${date}&course=${encodeURIComponent(c.cle)}&touche=Cote`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((d) => { if (!mort) setDetail(d) })
      .catch((e) => { if (!mort) setErr(e.message) })
    return () => { mort = true }
  }, [choisi, date, liste])

  return (
    <>
      <header className="header" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#7f1d1d 70%,#0f172a 100%)', borderBottom: '2px solid #f97316' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-horse.png" alt="Bahja TURF" style={{ height: 44, background: 'white', borderRadius: 8, padding: 2 }} />
            <img src="/logo.svg" alt="Bahja TURF" style={{ height: 42, borderRadius: 8 }} />
          </div>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link to="/" style={{ color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Programme</Link>
            <Link to="/coply" style={{ color: '#fca5a5', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>Coply</Link>
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
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Coply</h2>
            <span style={{ fontSize: 12, opacity: 0.92 }}>Les courses une par une, avec tous leurs partants</span>
          </div>
        </div>

        {/* ── la date : le programme du JOUR. Pas de selector d'historique —
            les courses passées sont au MOTEUR (archives/), pas ici. */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ padding: '7px 11px', borderRadius: 8, border: '1px solid #d6d3c8', fontFamily: TE.mono }} />
          <span style={{ fontSize: 12, color: '#78716c' }}>
            le programme du jour · source : reu.php
          </span>
        </div>

        {err && (
          <div style={{ background: '#fee2e2', padding: 14, borderRadius: 10, color: '#7f1d1d', fontSize: 13, marginBottom: 12 }}>
            ⚠ {err}
          </div>
        )}

        {/* ── la liste des courses ── */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ ...S.box, flex: '1 1 340px', minWidth: 320, maxHeight: 520, overflowY: 'auto' }}>
            <div style={{ background: TE.entete, padding: '9px 13px' }}>
              <b style={{ color: '#fff', fontSize: 12, letterSpacing: 1 }}>
                {liste ? liste.nb : '—'} COURSE{liste && liste.nb > 1 ? 'S' : ''}
              </b>
            </div>
            {!liste && <div style={{ padding: 20, color: '#a8a29e', fontSize: 13 }}>Chargement…</div>}
            {liste && liste.nb === 0 && (
              <div style={{ padding: 20, color: '#a8a29e', fontSize: 13 }}>
                Aucune course à cette date. Essaie une autre date.
              </div>
            )}
            {liste?.courses?.map((c, i) => (
              <button key={c.cle} onClick={() => setChoisi(i)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '9px 13px',
                  border: 'none', borderBottom: '1px solid #f5f5f4', cursor: 'pointer',
                  background: choisi === i ? TE.accentClair : i % 2 ? TE.alt : '#fff',
                  borderLeft: '4px solid ' + (choisi === i ? TE.accent : 'transparent'),
                  fontFamily: TE.police,
                }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: TE.accentSombre }}>
                  {c.reunion}-{c.code}
                  {c.heure ? ` · ${c.heure}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#57534e' }}>{c.nom || c.hippodrome}</div>
              </button>
            ))}
          </div>

          {/* ── la lecture ── */}
          <div style={{ flex: '3 1 600px', minWidth: 400 }}>
            {!choisi && (
              <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid ' + TE.bord, color: '#78716c' }}>
                Choisis une course à gauche pour voir ses partants.
              </div>
            )}
            {choisi != null && !detail && (
              <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid ' + TE.bord }}>
                Chargement de la course…
              </div>
            )}
            {choisi != null && detail && <Lecture detail={detail} />}
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          ⚠ Laboratoire — lecture seule. Les courses du jour viennent de reu.php ; les courses passées de C:\bahja-TURF\archives
        </div>
      </div>
    </>
  )
}

/* ───────────────────────────────────────────────────── la lecture ───────── */

function Lecture({ detail }) {
  const c = detail.course
  const partants = c.partants || []
  const top5 = (c.arrivee || []).slice(0, 5)
  return (
    <>
      <div style={{ ...S.box, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'baseline' }}>
          <div>
            <b style={{ fontSize: 16, color: TE.accentSombre }}>
              {c.reunion}-{c.code} {c.nom ? '· ' + c.nom : ''}
            </b>
            <span style={{ marginLeft: 10, fontSize: 13, color: '#57534e' }}>
              {c.hippodrome}{c.distance ? ' · ' + c.distance + 'm' : ''}{c.discipline ? ' · ' + c.discipline : ''}
            </span>
          </div>
          {top5.length > 0 && (
            <span style={{ fontFamily: TE.mono, fontSize: 14, fontWeight: 800, color: TE.accent }}>
              Arrivée : {top5.join('  ·  ')}
            </span>
          )}
        </div>
      </div>

      {partants.length === 0 ? (
        <div style={{ padding: 26, textAlign: 'center', background: '#fff', borderRadius: 12, border: '1px solid ' + TE.bord, color: '#78716c', fontSize: 13 }}>
          Les partants de cette course ne sont pas encore publiés.
          {c.passe ? '' : ' Elle n’a pas encore couru.'}
        </div>
      ) : (
        <div style={{ ...S.box, overflow: 'hidden' }}>
          <div style={{ background: TE.entete, padding: '9px 13px' }}>
            <b style={{ color: '#fff', fontSize: 12, letterSpacing: 1 }}>PARTANTS ({partants.length})</b>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...S.box, borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13, border: 'none' }}>
              <thead>
                <tr style={{ background: '#f5f5f4' }}>
                  {['N°', 'Cheval', 'Jockey', 'Entraîneur', 'Pds', 'Cote', 'Gains', 'Course', 'Arrivée', 'Statut'].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partants.map((p, i) => {
                  const rang = top5.indexOf(p.num)
                  const gagne = rang >= 0
                  return (
                    <tr key={p.num} style={{
                      background: rang === 0 ? '#dcfce7' : gagne ? '#f0fdf4' : i % 2 ? TE.alt : '#fff',
                      borderBottom: '1px solid #f5f5f4',
                    }}>
                      <td style={{ ...S.td, fontWeight: 800, fontFamily: TE.mono, color: TE.accentSombre }}>{p.num}</td>
                      {/* ⚠ LES NOMS SORTENT DE DEUX SOURCES : reu.php dit `driver`
                          et `entraineur`, les archives disent `jockey` et
                          `trainer`. La page lit les deux (sinon la colonne
                          reste vide selon la source) — cf. le bug ③ du §18. */}
                      <td style={{ ...S.td, fontWeight: 700 }}>{p.horse || p.cheval || '—'}</td>
                      <td style={S.td}>{p.driver || p.jockey || '—'}</td>
                      <td style={S.td}>{p.entraineur || p.trainer || '—'}</td>
                      <td style={{ ...S.td, fontFamily: TE.mono }}>{p.poids ?? p.def ?? '—'}</td>
                      {/* ⚠ LA COTE VA DE TROIS SOURCES : `cote` (reu.php temps réel, les
                          courses simples), `coteRef` (la cote de référence —
                          c'est la SEULE qui existe pour les courses de Suède,
                          HH, GB…), `cote_pmu` (les archives du laboratoire). */}
                      <td style={{ ...S.td, fontFamily: TE.mono, fontWeight: 700 }}>{p.cote ?? p.coteRef ?? p.cote_pmu ?? '—'}</td>
                      <td style={{ ...S.td, fontFamily: TE.mono }}>{p.gains ?? p.gain ?? '—'}</td>
                      <td style={{ ...S.td, fontFamily: TE.mono, fontSize: 11 }}>{p.nombreCourses ?? '—'}</td>
                      <td style={{ ...S.td, fontFamily: TE.mono, fontWeight: gagne ? 800 : 500, color: gagne ? '#15803d' : '#a8a29e' }}>
                        {gagne ? (rang + 1) + '★' : '—'}
                      </td>
                      <td style={S.td}>{p.statut || p.etat || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}