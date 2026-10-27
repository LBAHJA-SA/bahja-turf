import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Entete from '../../src/Entete.jsx'
import { heureGMT, maintenantGMT, parisVersGMT } from '../../src/temps.js'
import { chargerLives, derniereJournee, fluxHLS, jourISO, lienEquidia } from '../../backend/LIVES/lives.js'

/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/LIVES/Lives.jsx — « LIVES EN COURS » (20/10/2026)
 *
 *  Les réunions régionales d'Equidia en direct, dans la page : la liste du
 *  jour (R1, R3, R4…), l'heure, la discipline, le badge Quinté+, et le flux
 *  dans un lecteur — sans quitter le site.
 *
 *  Ses dossiers lui sont propres :
 *     frontend/LIVES/Lives.jsx    l'affichage (ce fichier)
 *     backend/LIVES/lives.js      les appels (API Equidia Régions)
 *
 *  ⚠ CE QUI EST MESURÉ (20/10/2026) :
 *   · l'API et TOUTE la chaîne HLS envoient `access-control-allow-origin: *`
 *     → aucune proxy n'est nécessaire, ni en local ni en production ;
 *   · `type=player` (l'iframe `player.php`) est GÉOBLOQUÉ hors de France
 *     (« geoblocking error country: MA ») → on ne s'en sert pas ;
 *   · les adresses de flux portent un jeton qui EXPIRE → on les redemande à
 *     chaque lecture et à chaque échec, jamais on ne les garde.
 *
 *  Aucun chiffre ni horaire n'est écrit à la main : tout vient de l'API.
 * ══════════════════════════════════════════════════════════════════════════ */

const TE = {
  entete: 'linear-gradient(120deg,#052e21 0%,#047857 55%,#34d399 100%)',
  accent: '#34d399',
  accentClair: 'rgba(52,211,153,.14)',
  bord: 'rgba(52,211,153,.38)',
  carte: 'rgba(8,20,16,.78)',
  alt: 'rgba(52,211,153,.05)',
  rouge: '#f43f5e',
  ambre: '#fbbf24',
  muet: '#8fa3bf',
  police: 'system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, Consolas, monospace',
}

const S = {
  box: { border: '1px solid ' + TE.bord, borderRadius: 12, background: TE.carte },
  chip: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10.5,
    fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase',
  },
}

/* le badge d'état — la couleur dit tout, le texte confirme */
function Badge({ m }) {
  if (m.etat === 'direct') {
    return (
      <span style={{ ...S.chip, background: TE.rouge, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999, background: '#fff',
          animation: 'lives-pulse 1.2s ease-in-out infinite',
        }} />
        En direct
      </span>
    )
  }
  if (m.etat === 'avenir') {
    return <span style={{ ...S.chip, background: 'rgba(251,191,36,.16)', color: TE.ambre, border: '1px solid rgba(251,191,36,.4)' }}>À venir</span>
  }
  if (m.etat === 'sans-flux') {
    return <span style={{ ...S.chip, background: 'rgba(148,163,184,.16)', color: '#cbd5e1', border: '1px solid rgba(148,163,184,.4)' }}>Sans flux</span>
  }
  return <span style={{ ...S.chip, background: 'rgba(148,163,184,.12)', color: '#94a3b8', border: '1px solid rgba(148,163,184,.3)' }}>Terminé</span>
}

/* ─────────────────────────────────────────────── le lecteur HLS ─────────── */

function Lecteur({ reunion, urlDirecte, lien, libelleLien }) {
  const video = useRef(null)
  const [src, setSrc] = useState(null)
  const [etat, setEtat] = useState('ouverture')   // ouverture | pret | erreur
  const [essai, setEssai] = useState(0)
  const [joue, setJoue] = useState(false)   // ⭐ le flux a-t-il déjà commencé à jouer ?
  /* ⭐ LE BADGE DE MARQUE (20/10/2026) — le flux HLS est un flux ÉDITEUR : le
   *   logo de la chaîne, en haut à droite, est PIXELISÉ dans le flux. On ne
   *   peut pas le retirer, seulement le COUVRIR : un badge « Bahja TURF »
   *   opaque passe devant. Le voile plein écran de 7 s a été SUPPRIMÉ
   *   (21/10/2026) : il cachait le départ de la course. */

  /* ① l'adresse du flux — redemandée à chaque réunion et à chaque essai.
   *    `urlDirecte` (Le Trot) : l'adresse est déjà un .m3u8 résolu par le
   *    serveur — on ne redemande rien, on le lit tel quel, MAIS on le lit
   *    quand même par hls.js (le navigateur ne sait pas lire un .m3u8
   *    avec un simple <video src=…>). */
  useEffect(() => {
    let mort = false
    setSrc(null); setEtat('ouverture'); setJoue(false)
    const urlPromise = urlDirecte
      ? Promise.resolve(urlDirecte)
      : fluxHLS(reunion.flux)
    urlPromise
      .then((u) => { if (!mort) setSrc(u) })
      .catch(() => { if (!mort) setEtat('erreur') })
    return () => { mort = true }
  }, [reunion.flux, urlDirecte, essai])

  /* ② la lecture */
  useEffect(() => {
    const v = video.current
    if (!v || !src) return undefined
    let hls = null
    let vivant = true

    const echec = () => { if (vivant) setEtat('erreur') }

    /* ⚠ MESURÉ LE 20/10/2026 : Chromium répond « maybe » à
     * `canPlayType('application/vnd.apple.mpegurl')` sans savoir lire le HLS.
     * Il posait alors un `range: bytes=0-` que le CDN refuse (HTTP 406) et le
     * flux ne s'ouvrait jamais. On demande donc hls.js D'ABORD, et le natif
     * seulement s'il n'est pas disponible (Safari). */
    import('hls.js').then(({ default: Hls }) => {
      if (!vivant) return
      if (!Hls.isSupported()) {
        if (v.canPlayType('application/vnd.apple.mpegurl')) {
          v.src = src
          v.play().catch(() => {})
          setEtat('pret')
        } else {
          setEtat('erreur')
        }
        return
      }
      hls = new Hls({ maxBufferLength: 12, lowLatencyMode: true })
      hls.on(Hls.Events.MANIFEST_PARSED, () => { if (vivant) setEtat('pret') })
      hls.on(Hls.Events.ERROR, (_e, d) => { if (vivant && d && d.fatal) echec() })
      hls.loadSource(src)
      hls.attachMedia(v)
      v.play().catch(() => {})
    }).catch(() => { if (vivant) setEtat('erreur') })

    return () => { vivant = false; if (hls) hls.destroy() }
  }, [src])

  /* ③ l'état de lecture : dès que le flux joue vraiment, on retire le volet
   *    « ▶ Lire » (l'autoplay est bloqué par le navigateur, le clic est le
   *    geste utilisateur qui débloque). Aucun voile de marque : le badge en
   *    haut à droite suffit et le départ de course reste visible. */
  useEffect(() => {
    const v = video.current
    if (!v) return undefined
    const auJeu = () => setJoue(true)
    const arrete = () => setJoue(false)
    v.addEventListener('playing', auJeu)
    v.addEventListener('pause', arrete)
    v.addEventListener('ended', arrete)
    return () => {
      v.removeEventListener('playing', auJeu)
      v.removeEventListener('pause', arrete)
      v.removeEventListener('ended', arrete)
    }
  }, [src])

  /* le lien du pied de lecteur — `lien` explicite d'abord (null = AUCUN lien
   * qui sort, c'est le cas du direct du Maroc), sinon la réunion Equidia. */
  const adresse = lien !== undefined ? lien : (reunion.lienExtern || lienEquidia(reunion))

  return (
    <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', border: '1px solid ' + TE.bord }}>
      <div style={{ position: 'relative', paddingTop: '56.25%' }}>
        <video
          ref={video}
          controls
          playsInline
          muted
          preload="none"
          poster={reunion.image ? 'https://media.equidia.fr/' + reunion.image : undefined}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
        />
        {/* ⭐ LE BADGE DE MARQUE — en haut à DROITE, sur le logo de la chaîne
            (qui est PIXELISÉ dans le flux : on ne peut pas le retirer, seulement
            le couvrir). Le bandeau est opaque sur sa partie droite : il masque
            le logo quelle que soit sa position exacte dans l'image. */}
        <div style={{
          position: 'absolute', top: 0, right: 0, zIndex: 12, width: 250, height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: 10,
          background: 'linear-gradient(90deg, rgba(2,10,8,0) 0%, rgba(2,10,8,.96) 42%, #041a14 100%)',
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#041a14', padding: '4px 10px',
            borderRadius: 8, border: '1px solid ' + TE.accent,
            boxShadow: '0 2px 10px rgba(0,0,0,.6)',
            fontSize: 12, fontWeight: 800, color: TE.accent,
            fontFamily: TE.mono,
          }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: TE.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#04121a', fontSize: 10 }}>B</span>
            Bahja TURF
          </div>
        </div>
        {etat !== 'pret' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 13, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10, color: '#e2e8f0',
            background: 'rgba(2,10,8,.72)', textAlign: 'center', padding: 18,
          }}>
            {etat === 'ouverture' && <span style={{ fontSize: 13 }}>Ouverture du flux…</span>}
            {etat === 'erreur' && (
              <>
                <span style={{ fontSize: 13, color: '#fecaca' }}>
                  Le flux ne s’ouvre pas (hors direct, ou bloqué par l’éditeur).
                </span>
                <button onClick={() => setEssai((n) => n + 1)} style={{
                  padding: '7px 14px', borderRadius: 8, border: '1px solid ' + TE.bord,
                  background: TE.accentClair, color: TE.accent, fontWeight: 800, cursor: 'pointer',
                  fontFamily: TE.police, fontSize: 12,
                }}>↻ Réessayer</button>
              </>
            )}
          </div>
        )}
        {/* ⭐ BOUTON DE LECTURE — l'autoplay est bloqué par le navigateur ;
            on propose un bouton explicite (clic = geste utilisateur = lecture
            garantie). */}
        {etat === 'pret' && !joue && (
          <button
            onClick={() => { const v = video.current; if (v) v.play().catch(() => {}) }}
            style={{
              position: 'absolute', inset: 0, zIndex: 13, border: 0, cursor: 'pointer',
              background: 'rgba(2,10,8,.55)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800, fontFamily: TE.police,
            }}
          >
            <span style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 22px',
              background: 'rgba(52,211,153,.18)', border: '1px solid ' + TE.bord,
              borderRadius: 12, color: TE.accent,
            }}>
              <span style={{ fontSize: 22 }}>▶</span> Lire
            </span>
          </button>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '9px 13px', background: 'rgba(3,14,11,.94)', borderTop: '1px solid ' + TE.bord,
      }}>
        <b style={{ color: '#fff', fontSize: 14 }}>
          {reunion.reunion} · {reunion.hippodrome}
        </b>
        <Badge m={reunion} />
        <span style={{ fontSize: 11.5, color: TE.muet, fontFamily: TE.mono }}>
          {heureGMT(reunion.debut)}{reunion.fin ? ' → ' + heureGMT(reunion.fin) : ''}
        </span>
        {reunion.disciplines.length > 0 && (
          <span style={{ fontSize: 11.5, color: TE.muet }}>· {reunion.disciplines.join(' · ')}</span>
        )}
        {reunion.quinte && <span style={{ ...S.chip, background: 'rgba(232,121,249,.18)', color: '#f0abfc' }}>Quinté+</span>}
        {/* `lien={null}` = aucun lien qui sort (le direct du Maroc). Sinon la
            réunion Equidia s'ouvre dans un onglet, comme avant. */}
        {adresse && (
          <a href={adresse} target="_blank" rel="noreferrer" style={{
            marginLeft: 'auto', fontSize: 11.5, color: TE.accent, textDecoration: 'none', fontWeight: 700,
          }}>{libelleLien || reunion.libelleLien || 'Equidia Régions'} ↗</a>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────── LE DIRECT DU MAROC — LA SOREC ────────────────
 * Demande de l'utilisateur (23/10/2026) :
 *   « ajoute-moi cette chaîne https://sorec-streaming.archostechnology.net/
 *     index_2_jwplayer.html ici /lives »
 *
 * La page de la SOREC ne fait qu'une chose : poser un lecteur JW Player sur un
 * flux HLS. On ne l'intègre pas (iframe, http, certificat expiré) — on prend
 * LE FLUX et on le lit avec notre lecteur, comme les réunions Equidia :
 *
 *   auto    /live/OutStream1/playlist.m3u8        le direct
 *   dvr     /live/OutStream1/playlist.m3u8?DVR    le retour sur image
 *   cotes   /live/myStream_2/playlist.m3u8        les côtes et les rapports
 *
 * ⚠ Le site ne sert que du **http** (son certificat https a expiré le
 *   22/09/2025) : une page https ne peut pas le lire. Tout passe donc par
 *   `/api/sorec`, qui relaie et réécrit les playlists (même principe que le
 *   replay de Paris-Turf). */
const SOREC_REUNION = {
  cle: 'sorec', reunion: 'SOREC', hippodrome: 'Maroc',
  etat: 'direct', debut: null, fin: null, disciplines: [], quinte: false, image: null,
}

const SOREC_FLUX = [
  { cle: 'auto', libelle: 'Direct' },
  { cle: 'dvr', libelle: 'Retour sur image' },
  { cle: 'cotes', libelle: 'Côtes / Rapports' },
]

/** La page publique de la SOREC — le bouton « regarder dehors », qui marche
 *  depuis n'importe quel appareil au Maroc (c'est notre relais qui ne peut
 *  pas, pas le navigateur de l'utilisateur). */
const SOREC_EXTERNE = 'http://sorec-streaming.archostechnology.net/index_2_jwplayer.html'

const CLE_RELAIS = 'sorec-relais'

/* ⭐ LA CARTE — une chaîne = une carte (24/10/2026).
 *
 *   Demande de l'utilisateur : « fais apparaître toutes les chaînes en cartes,
 *   sans grand écran ; le clic ouvre l'écran ». Toutes les cartes ont donc
 *   exactement la même forme — SOREC, chaque réunion Equidia, et Le Trot (qui
 *   n'a que le lien). Aucune ne s'ouvre toute seule : l'écran reste fermé
 *   jusqu'au clic.
 *
 *   ⚠ `div` et non `button` : la carte SOREC porte un lien dedans (regarder
 *   sur leur site), et un `<a>` dans un `<button>` n'est pas du HTML valide. */
function Carte({ numero, lieu, badge, image, lignes = [], chips = null, actif, onClick, href, action }) {
  const corps = (
    <>
      <div style={{
        height: 96,
        background: image ? `center/cover no-repeat url(${image})` : 'linear-gradient(120deg,#052e21,#065f46)',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.65))' }} />
        {badge && <div style={{ position: 'absolute', top: 8, left: 8 }}>{badge}</div>}
        <div style={{
          position: 'absolute', bottom: 7, left: 9, right: 9,
          display: 'flex', alignItems: 'flex-end', gap: 7,
        }}>
          <b style={{ fontSize: 19, fontFamily: TE.mono, lineHeight: 1 }}>{numero}</b>
          <span style={{ fontSize: 13, fontWeight: 800, textShadow: '0 1px 6px #000' }}>{lieu}</span>
        </div>
      </div>

      <div style={{ padding: '9px 11px 11px' }}>
        {lignes.map((l, i) => (
          <div key={i} style={{
            fontSize: 11.5, marginTop: i ? 3 : 0,
            color: i === 0 ? TE.muet : '#cbd5e1',
            fontFamily: i === 0 ? TE.mono : TE.police,
          }}>{l}</div>
        ))}
        {chips && <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>{chips}</div>}
        {action}
      </div>
    </>
  )

  const style = {
    display: 'block', width: '100%', textAlign: 'left', padding: 0, overflow: 'hidden',
    borderRadius: 12, fontFamily: TE.police, color: '#e7f1ff', cursor: 'pointer',
    background: actif ? TE.accentClair : TE.carte,
    border: '1px solid ' + (actif ? TE.accent : TE.bord),
    boxSizing: 'border-box', textDecoration: 'none',
  }

  if (href) {
    return <a className="lives-carte" href={href} target="_blank" rel="noreferrer" style={style}>{corps}</a>
  }
  return (
    <div
      className="lives-carte"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick && onClick() } }}
      style={style}
    >{corps}</div>
  )
}

/* ⭐ LE PANNEAU DU DIRECT MAROC — il ne s'affiche QUE si sa carte est ouverte. */
function PanneauSorec({ onFermer }) {
  const [flux, setFlux] = useState('auto')
  /* ⭐ LE RELAIS DÉCALÉ (24/10/2026) — `tools/sorec-relais.mjs` sur ce poste,
     exposé par un tunnel. Quand son adresse est renseignée, elle REMPLACE la
     source : c'est elle qui rend le direct visible depuis un autre appareil,
     avec le retard qu'on a choisi (60 s par défaut). Gardée dans le navigateur. */
  const [relais, setRelais] = useState(() => {
    try { return localStorage.getItem(CLE_RELAIS) || '' } catch (e) { return '' }
  })
  const [saisie, setSaisie] = useState(relais)
  /* La page est-elle servie en https (donc en ligne) ? Le direct de la SOREC
     n'est joignable que depuis le Maroc — voir l'avertissement plus bas. */
  const enLigne = typeof location !== 'undefined' && location.protocol === 'https:'

  const appliquer = () => {
    const propre = saisie.trim().replace(/\/+$/, '')
    setRelais(propre)
    try {
      if (propre) localStorage.setItem(CLE_RELAIS, propre)
      else localStorage.removeItem(CLE_RELAIS)
    } catch (e) { /* navigation privée : on garde juste en mémoire */ }
  }

  const source = relais ? relais + '/live.m3u8' : '/api/sorec?flux=' + flux

  return (
    <div style={{ ...S.box, padding: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <b style={{ fontSize: 12.5, color: TE.accent, whiteSpace: 'nowrap' }}>SOREC — les courses du Maroc</b>
        <Badge m={SOREC_REUNION} />
        <a
          href={SOREC_EXTERNE}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '6px 11px', borderRadius: 8, fontSize: 11.5, fontWeight: 800,
            fontFamily: TE.police, textDecoration: 'none', whiteSpace: 'nowrap',
            background: 'rgba(255,255,255,.04)', border: '1px solid ' + TE.bord, color: TE.ambre,
          }}
        >▶ Regarder sur le site SOREC ↗</a>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {relais ? (
            <span style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 800,
              background: TE.accentClair, border: '1px solid ' + TE.accent, color: TE.accent,
            }}>relais décalé</span>
          ) : SOREC_FLUX.map((f) => {
            const actif = f.cle === flux
            return (
              <button
                key={f.cle}
                onClick={() => setFlux(f.cle)}
                style={{
                  padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 800,
                  fontFamily: TE.police,
                  background: actif ? TE.accentClair : 'rgba(255,255,255,.04)',
                  border: '1px solid ' + (actif ? TE.accent : TE.bord),
                  color: actif ? TE.accent : TE.muet,
                }}
              >{f.libelle}</button>
            )
          })}
        </div>
        <button onClick={onFermer} title="Fermer l’écran" style={{
          padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 800,
          fontFamily: TE.police, background: 'rgba(255,255,255,.04)', border: '1px solid ' + TE.bord, color: TE.muet,
        }}>✕</button>
      </div>
      {/* `key={source}` : changer de source repart d'un lecteur neuf (pas de
          reste de tampon de l'ancien direct). */}
      <Lecteur key={source} reunion={SOREC_REUNION} urlDirecte={source} lien={null} />

      {/* ── le relais décalé : l'adresse du poste, exposée par un tunnel ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 11, color: TE.muet, whiteSpace: 'nowrap' }}>Relais décalé</span>
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') appliquer() }}
          placeholder="https://….trycloudflare.com  ou  http://localhost:5058"
          style={{
            flex: '1 1 260px', minWidth: 180, padding: '6px 9px', borderRadius: 8,
            background: 'rgba(255,255,255,.04)', border: '1px solid ' + TE.bord,
            color: '#e5e7eb', fontSize: 11.5, fontFamily: TE.police, outline: 'none',
          }}
        />
        <button onClick={appliquer} style={{
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 800,
          fontFamily: TE.police, background: TE.accentClair, border: '1px solid ' + TE.accent, color: TE.accent,
        }}>Utiliser</button>
        {relais && (
          <button onClick={() => { setSaisie(''); setRelais(''); try { localStorage.removeItem(CLE_RELAIS) } catch (e) { /* rien */ } }} style={{
            padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 800,
            fontFamily: TE.police, background: 'rgba(255,255,255,.04)', border: '1px solid ' + TE.bord, color: TE.muet,
          }}>✕</button>
        )}
      </div>

      <p style={{ margin: '9px 2px 0', fontSize: 11, color: TE.muet, lineHeight: 1.6 }}>
        Le direct de la SOREC, lu dans la page — aucun onglet. « Retour sur image » permet de revenir
        en arrière dans la réunion ; « Côtes / Rapports » montre les rapports de la journée.
        Si le flux ne s’ouvre pas : la réunion n’a pas commencé.
      </p>
      {/* ⚠ L'AVERTISSEMENT DE LIGNE (mesuré le 23/10/2026) : le serveur de la
          SOREC ferme les connexions étrangères — DNS ok, TCP 80 en délai
          d'attente depuis Vercel, comme depuis deux relais publics. En local
          (Maroc) il passe. Autant le dire plutôt que laisser un carré noir. */}
      {enLigne && !relais && (
        <p style={{
          margin: '7px 2px 0', fontSize: 11, lineHeight: 1.6, color: '#fbbf24',
          background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.25)',
          borderRadius: 8, padding: '7px 9px',
        }}>
          <b>En ligne, ce direct est fermé :</b> le serveur de la SOREC refuse les connexions
          venant de l’étranger (mesuré le 23/10 : le port 80 ne répond pas depuis Vercel) et son
          certificat https a expiré le 22/09/2025. En local, il passe — et le <b>relais décalé</b>
          ci-dessus est justement là pour ça : lance{' '}
          <code style={{ fontSize: 10.5 }}>node tools/sorec-relais.mjs</code>, expose-le, et colle
          son adresse. Sinon, le bouton <b>▶ Regarder sur le site SOREC</b> ouvre leur page.
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────── la page ────────────────── */

/* ⭐ POURQUOI CETTE BALISE (mesuré le 20/10/2026)
 *
 *  Le CDN d'Equidia (hexaglobe) refuse tout ce qui porte un `Referer` qui
 *  n'est pas un domaine equidia : la playlist ET les segments répondent
 *  alors « 406 Not Acceptable ».
 *
 *      sans en-tête                  → 200
 *      Origin seul                   → 200
 *      Referer equidia               → 200
 *      Referer localhost / vercel    → 406   ← ce que le navigateur envoyait
 *
 *  `no-referrer` retire l'en-tête : le flux s'ouvre. La balise est posée au
 *  rendu du parent (avant les effets du lecteur) et retirée en quittant la
 *  page — les autres pages gardent le comportement par défaut. */
function assurerPolitiqueReferer() {
  if (typeof document === 'undefined') return
  if (document.querySelector('meta[name="referrer"][data-lives]')) return
  const m = document.createElement('meta')
  m.name = 'referrer'
  m.content = 'no-referrer'
  m.setAttribute('data-lives', '1')
  document.head.appendChild(m)
}

function retirerPolitiqueReferer() {
  if (typeof document === 'undefined') return
  document.querySelector('meta[name="referrer"][data-lives]')?.remove()
}

export default function Lives() {
  useMemo(() => assurerPolitiqueReferer(), [])
  useEffect(() => () => retirerPolitiqueReferer(), [])

  const [date, setDate] = useState(jourISO())
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [choix, setChoix] = useState(null)
  const [maj, setMaj] = useState(null)
  const [occupe, setOccupe] = useState(false)

  useEffect(() => { document.title = 'Lives en cours — Bahja TURF' }, [])

  const appliquer = useCallback((d) => {
    setData(d); setErr(null); setMaj(new Date())
    setChoix((c) => {
      if (!c) return null                                  // rien d'ouvert au départ
      if (c === 'sorec') return 'sorec'
      return d.meetings.some((m) => m.cle === c) ? c : null
    })
  }, [])

  const lire = useCallback(() => {
    let mort = false
    chargerLives(date)
      .then((d) => { if (!mort) appliquer(d) })
      .catch((e) => { if (!mort) setErr(e.message || 'source indisponible') })
    return () => { mort = true }
  }, [date, appliquer])

  /* ⭐ « Réessayer » — une journée vide se relit tout de suite, sans attendre
     les 60 s du rafraîchissement automatique. */
  const relancer = async () => {
    setOccupe(true)
    try { appliquer(await chargerLives(date)) }
    catch (e) { setErr(e.message || 'source indisponible') }
    finally { setOccupe(false) }
  }

  /* ① la lecture — puis toutes les 60 s : une réunion passe « en direct »
        pendant qu'on regarde la page, et les flux expirent. */
  useEffect(() => {
    const stop = lire()
    const t = setInterval(() => { lire() }, 60000)
    return () => { stop(); clearInterval(t) }
  }, [lire])

  const reunions = data?.meetings || []
  const choisie = reunions.find((m) => m.cle === choix) || null
  const directs = reunions.filter((m) => m.etat === 'direct')

  /* ⭐ « Voir la dernière journée » — la date choisie est vide (dimanche,
     lundi, jour férié). On remonte au plus 7 jours et on bascule la date. */
  const voirDerniere = async () => {
    setOccupe(true)
    try {
      const j = await derniereJournee(date, 7)
      if (j) setDate(j.date)
      else setErr('aucune réunion régionale dans les 7 derniers jours')
    } catch (e) {
      setErr(e.message || 'source indisponible')
    } finally {
      setOccupe(false)
    }
  }


  return (
    <>
      <style>{`
        @keyframes lives-pulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .35; transform: scale(.75) } }
        .lives-carte:hover { border-color: rgba(52,211,153,.85) !important; transform: translateY(-2px) }
        .lives-carte { transition: border-color .18s, transform .18s, box-shadow .18s }
        .lives-carte:hover { box-shadow: 0 10px 26px rgba(0,0,0,.45) }
      `}</style>

      <Entete page="lives" />

      <div dir="ltr" style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 16px 40px', minHeight: '72vh',
        fontFamily: TE.police,
        borderLeft: '1px solid ' + TE.bord, borderRight: '1px solid ' + TE.bord,
      }}>
        <div style={{
          margin: '0 -16px 16px', padding: '13px 16px', color: '#fff',
          background: TE.entete, borderBottom: '2px solid ' + TE.accent,
          display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Lives en cours</h2>
          <span style={{ fontSize: 12, opacity: 0.94 }}>
            les hippodromes régionaux d’Equidia, en direct
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 12, fontWeight: 800,
            background: directs.length ? TE.rouge : 'rgba(255,255,255,.14)',
            padding: '3px 10px', borderRadius: 999,
          }}>
            {directs.length} en direct
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{
              padding: '7px 11px', borderRadius: 8, background: 'rgba(3,14,11,.9)',
              border: '1px solid ' + TE.bord, color: '#e7f1ff', fontFamily: TE.mono,
            }} />
          <button onClick={lire} style={{
            padding: '7px 13px', borderRadius: 8, border: '1px solid ' + TE.bord,
            background: TE.accentClair, color: TE.accent, fontWeight: 800,
            cursor: 'pointer', fontSize: 12, fontFamily: TE.police,
          }}>↻ Rafraîchir</button>
          <span style={{ fontSize: 11.5, color: TE.muet }}>
            {reunions.length} réunion{reunions.length > 1 ? 's' : ''}
            {data ? ` · ${data.date}` : ''}
            {maj ? ` · lu à ${maintenantGMT()}` : ''}
          </span>
        </div>

        {err && (
          <div style={{ background: 'rgba(244,63,94,.14)', border: '1px solid rgba(244,63,94,.4)', padding: 14, borderRadius: 10, color: '#fecdd3', fontSize: 13, marginBottom: 12 }}>
            ⚠ {err} — la source Equidia Régions ne répond pas.
          </div>
        )}

        {!data && !err && (
          <div style={{ ...S.box, padding: 26, textAlign: 'center', color: TE.muet, fontSize: 13 }}>
            Chargement des réunions…
          </div>
        )}

        {data && reunions.length === 0 && (
          <div style={{ ...S.box, padding: 22, textAlign: 'center', color: TE.muet, fontSize: 13, marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>
              <b style={{ color: TE.accent }}>Aucune réunion régionale</b> le {data.date}.
            </div>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              Equidia Régions ne publie rien ce jour-là (jour sans course sur les
              hippodromes régionaux). La source a été interrogée 3 fois avant de
              conclure — ce n’est pas une panne de la page.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={relancer} disabled={occupe} style={{
                padding: '7px 13px', borderRadius: 8, cursor: occupe ? 'default' : 'pointer',
                border: '1px solid ' + TE.bord, background: 'rgba(255,255,255,.04)', color: TE.muet,
                fontWeight: 800, fontSize: 12, fontFamily: TE.police, opacity: occupe ? .55 : 1,
              }}>↻ Réessayer</button>
              <button onClick={voirDerniere} disabled={occupe} style={{
                padding: '7px 13px', borderRadius: 8, cursor: occupe ? 'default' : 'pointer',
                border: '1px solid ' + TE.bord, background: TE.accentClair, color: TE.accent,
                fontWeight: 800, fontSize: 12, fontFamily: TE.police, opacity: occupe ? .55 : 1,
              }}>{occupe ? '⟳ recherche…' : '↩ Voir la dernière journée qui a couru'}</button>
            </div>
          </div>
        )}

        {/* ── L'ÉCRAN — il ne s'ouvre QUE par un clic sur une carte ── */}
        {choisie && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <b style={{ fontSize: 12.5, color: TE.accent }}>
                Écran — {choisie.reunion} · {choisie.hippodrome}
              </b>
              <button onClick={() => setChoix(null)} style={{
                marginLeft: 'auto', padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 11.5, fontWeight: 800, fontFamily: TE.police,
                background: 'rgba(255,255,255,.04)', border: '1px solid ' + TE.bord, color: TE.muet,
              }}>✕ Fermer</button>
            </div>
            <Lecteur key={choisie.cle} reunion={choisie} />
          </div>
        )}

        {choix === 'sorec' && <PanneauSorec onFermer={() => setChoix(null)} />}

        {/* ── LES CHAÎNES — une carte par chaîne, écran fermé au départ ── */}
        <div style={{ fontSize: 12, fontWeight: 800, color: TE.accent, margin: '6px 0 8px' }}>
          Les chaînes — clique une carte pour ouvrir l’écran
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(268px,1fr))', gap: 12 }}>
          {/* ① le Maroc — la seule qui ne vient pas d'Equidia */}
          <Carte
            numero="SOREC"
            lieu="Maroc"
            badge={<Badge m={SOREC_REUNION} />}
            lignes={['Maroc · courses du jour', 'Direct · retour sur image · cotes']}
            chips={<span style={{ ...S.chip, background: 'rgba(52,211,153,.14)', color: TE.accent }}>MA</span>}
            actif={choix === 'sorec'}
            onClick={() => setChoix('sorec')}
            action={
              <a
                href={SOREC_EXTERNE}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 800,
                  color: TE.ambre, textDecoration: 'none', padding: '4px 9px', borderRadius: 7,
                  border: '1px solid rgba(251,191,36,.4)', background: 'rgba(251,191,36,.08)',
                }}
              >▶ Regarder dehors ↗</a>
            }
          />

          {/* ② les réunions Equidia */}
          {reunions.map((m) => {
              const actif = m.cle === choix
              return (
                <button
                  key={m.cle}
                  className="lives-carte"
                  onClick={() => setChoix(m.cle)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', padding: 0, overflow: 'hidden',
                    borderRadius: 12, fontFamily: TE.police, color: '#e7f1ff',
                    background: actif ? TE.accentClair : TE.carte,
                    border: '1px solid ' + (actif ? TE.accent : TE.bord),
                  }}
                >
                  <div style={{
                    height: 96, background: m.image
                      ? `center/cover no-repeat url(https://media.equidia.fr/${m.image})`
                      : 'linear-gradient(120deg,#052e21,#065f46)',
                    position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.65))' }} />
                    <div style={{ position: 'absolute', top: 8, left: 8 }}><Badge m={m} /></div>
                    <div style={{
                      position: 'absolute', bottom: 7, left: 9, right: 9,
                      display: 'flex', alignItems: 'flex-end', gap: 7,
                    }}>
                      <b style={{ fontSize: 19, fontFamily: TE.mono, lineHeight: 1 }}>{m.reunion}</b>
                      <span style={{ fontSize: 13, fontWeight: 800, textShadow: '0 1px 6px #000' }}>{m.hippodrome}</span>
                    </div>
                  </div>

                  <div style={{ padding: '9px 11px 11px' }}>
                    <div style={{ fontSize: 11.5, color: TE.muet, fontFamily: TE.mono }}>
                      {heureGMT(m.debut)}{m.fin ? ' → ' + heureGMT(m.fin) : ''}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 3 }}>
                      {m.disciplines.join(' · ') || '—'}
                      {m.place && m.place !== m.hippodrome ? ' · ' + m.place : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                      {m.quinte && <span style={{ ...S.chip, background: 'rgba(232,121,249,.18)', color: '#f0abfc' }}>Quinté+</span>}
                      {m.quarte && <span style={{ ...S.chip, background: 'rgba(34,211,238,.14)', color: '#67e8f9' }}>Quarté+</span>}
                      {m.premium && <span style={{ ...S.chip, background: 'rgba(251,191,36,.14)', color: TE.ambre }}>Premium</span>}
                      {m.pmh && <span style={{ ...S.chip, background: 'rgba(167,139,250,.16)', color: '#c4b5fd' }}>PMH</span>}
                      {m.csi && <span style={{ ...S.chip, background: 'rgba(148,163,184,.16)', color: '#cbd5e1' }}>CSI</span>}
                    </div>
                  </div>
                </button>
              )
            })}

          {/* ③ Le Trot — le lien seul : l'éditeur refuse l'intégration */}
          <Carte
            numero="Le Trot"
            lieu="letrot.com"
            href="https://www.letrot.com/videos"
            lignes={['Trot · France', 'Directs et replays — hors de la page']}
            chips={<span style={{ ...S.chip, background: 'rgba(148,163,184,.16)', color: '#cbd5e1' }}>lien externe</span>}
          />
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.7 }}>
          Sources : Equidia Régions (<span style={{ fontFamily: TE.mono }}>regions-api.equidia.fr</span>) et la SOREC
          (Maroc) · flux HLS lus dans la page, jamais dans un onglet · la liste se relit toutes les 60 s · heures en GMT.
          <br />
          ⚠ Si un flux ne s’ouvre pas : la réunion n’a pas commencé, ou l’éditeur bloque le pays
          (la SOREC, elle, ne répond qu’au Maroc — d’où le bouton « Regarder dehors »).
        </div>
      </div>
    </>
  )
}
