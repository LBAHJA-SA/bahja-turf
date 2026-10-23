import { useEffect, useRef, useState } from 'react'
import Entete from '../../src/Entete.jsx'

/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/DNA/DnaCourse.jsx — « DNA COURSE » dans le bandeau (23/10/2026)
 *
 *  La page DNA COURSE est une application AUTONOME : son moteur Python, son
 *  build et ses deux bases vivent dans `dna-course\`, servis par Flask sur
 *  http://127.0.0.1:5057. Elle n'est pas recopiée ici — on l'AFFICHE, telle
 *  quelle, dans un cadre. C'est volontaire :
 *
 *    · aucune ligne du moteur ni de l'écran n'est dupliquée dans ce projet ;
 *    · une correction faite dans `dna-course\` apparaît ici au rechargement ;
 *    · l'onglet ne peut pas casser les autres pages (origine séparée).
 *
 *  Le serveur est démarré tout seul par `vite.config.js` (plugin `dnaCourse`)
 *  quand on lance le site : si le port 5057 est fermé, il l'ouvre.
 * ══════════════════════════════════════════════════════════════════════════ */

/* Le port de la copie. On garde le nom d'hôte de la page : ouvert depuis
 * 127.0.0.1, depuis localhost ou depuis le réseau local, le cadre vise la
 * même machine que le site. */
const PORT = 5057
const BASE = (typeof window !== 'undefined' ? window.location.protocol : 'http:') +
  '//' + (typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1') +
  ':' + PORT + '/'

const TE = {
  police: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  entete: 'linear-gradient(120deg,#04231a 0%,#065f46 55%,#34d399 100%)',
  accent: '#34d399',
  fond: 'linear-gradient(180deg,#04070f 0%,#050b14 100%)',
  bord: 'rgba(52,211,153,.28)',
  vert: '#34d399',
  rouge: '#f43f5e',
  ambre: '#fbbf24',
}

export default function DnaCourse() {
  /* « attente » → « ok » (le serveur répond) → « ko » (rien sur le port) */
  const [etat, setEtat] = useState('attente')
  const [cle, setCle] = useState(0)
  const [vu, setVu] = useState(false)
  const monte = useRef(true)

  useEffect(() => {
    monte.current = true
    return () => { monte.current = false }
  }, [])

  /* Le port est-il ouvert ? On demande la santé du moteur en `no-cors` : si la
   * connexion est refusée, la promesse est rejetée — c'est tout ce qu'on veut
   * savoir. Le corps de la réponse, lui, n'est pas lisible (autre origine) et
   * n'a aucune importance ici. */
  useEffect(() => {
    let fini = false
    const verifier = async () => {
      const ctrl = new AbortController()
      const minuteur = setTimeout(() => ctrl.abort(), 4000)
      try {
        await fetch(BASE + 'api/dna/health', { mode: 'no-cors', signal: ctrl.signal })
        if (!fini && monte.current) setEtat('ok')
      } catch (e) {
        if (!fini && monte.current) setEtat('ko')
      } finally {
        clearTimeout(minuteur)
      }
    }
    verifier()
    /* tant que le serveur ne répond pas, on redemande toutes les 8 s : il peut
     * être en train de démarrer (le premier import du moteur prend ~2 s). */
    const battement = setInterval(() => {
      setEtat((e) => {
        if (e === 'ok') return e
        verifier()
        return e
      })
    }, 8000)
    return () => { fini = true; clearInterval(battement) }
  }, [])

  const recharger = () => { setCle((k) => k + 1); setVu(false) }

  const pastille = etat === 'ok'
    ? { txt: 'moteur en ligne', coul: TE.vert, fond: 'rgba(4,7,15,.62)' }
    : etat === 'ko'
      ? { txt: 'moteur injoignable', coul: TE.rouge, fond: 'rgba(4,7,15,.62)' }
      : { txt: 'connexion…', coul: TE.ambre, fond: 'rgba(4,7,15,.62)' }

  return (
    <>
      <Entete page="dna" />

      <div dir="ltr" style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 16px 40px', minHeight: '72vh',
        fontFamily: TE.police, background: TE.fond,
        borderLeft: '1px solid ' + TE.bord, borderRight: '1px solid ' + TE.bord,
      }}>
        <div style={{
          margin: '0 -16px 12px', padding: '9px 16px', color: '#fff',
          background: TE.entete, borderBottom: '2px solid ' + TE.accent,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.02em' }}>DNA COURSE</span>
          <span style={{ fontSize: 11.5, opacity: 0.9 }}>
            moteur autonome · dossier <code style={{ fontFamily: 'ui-monospace, Consolas, monospace' }}>dna-course</code> · port {PORT}
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 11.5, fontWeight: 800, color: pastille.coul,
            background: pastille.fond, border: '1px solid ' + pastille.coul,
            padding: '3px 10px', borderRadius: 999,
          }}>
            {pastille.txt}
          </span>
        </div>

        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12,
        }}>
          <button onClick={recharger} style={{
            fontFamily: TE.police, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            color: '#eafff6', background: 'rgba(52,211,153,.14)',
            border: '1px solid rgba(52,211,153,.55)', borderRadius: 8, padding: '7px 13px',
          }}>
            ⟳ Recharger le moteur
          </button>
          <a href={BASE} target="_blank" rel="noreferrer" style={{
            fontFamily: TE.police, fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
            color: '#dbeafe', background: 'rgba(148,163,184,.14)',
            border: '1px solid rgba(148,163,184,.45)', borderRadius: 8, padding: '7px 13px',
          }}>
            ↗ Ouvrir dans un onglet
          </a>
          <span style={{ fontSize: 12, color: 'rgba(231,241,255,.6)' }}>
            {BASE}
          </span>
        </div>

        {etat === 'ko' && (
          <div style={{
            background: 'rgba(244,63,94,.12)', border: '1px solid rgba(244,63,94,.45)',
            borderRadius: 10, padding: 13, marginBottom: 12, color: '#fecdd3', fontSize: 13,
            lineHeight: 1.6,
          }}>
            Le serveur du moteur ne répond pas sur le port {PORT}. Il démarre avec le site
            (`vite.config.js`) — s'il est fermé, lance-le à la main :
            <div style={{
              marginTop: 8, padding: '8px 11px', borderRadius: 8, fontFamily: 'ui-monospace, Consolas, monospace',
              fontSize: 12.5, background: 'rgba(0,0,0,.45)', color: '#ffe4e6', whiteSpace: 'pre-wrap',
            }}>
              cd C:\bahja-TURF\dna-course{'\n'}python backend\server.py
            </div>
          </div>
        )}

        <div style={{
          position: 'relative', border: '1px solid ' + TE.bord, borderRadius: 10,
          overflow: 'hidden', background: '#04070f', boxShadow: '0 14px 40px rgba(0,0,0,.55)',
        }}>
          {!vu && (
            <div style={{
              position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
              color: 'rgba(231,241,255,.65)', fontSize: 13, pointerEvents: 'none',
            }}>
              Chargement de DNA COURSE…
            </div>
          )}
          <iframe
            key={cle}
            src={BASE}
            title="DNA COURSE"
            onLoad={() => setVu(true)}
            style={{
              display: 'block', width: '100%', height: 'calc(100vh - 190px)',
              minHeight: 660, border: 0, background: '#04070f',
            }}
          />
        </div>
      </div>
    </>
  )
}
