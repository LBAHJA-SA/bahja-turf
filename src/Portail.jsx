import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useAcces, rafraichirAcces, connecter, deconnecter, aDroit, premierePage,
} from './lib/acces.js'

/* ══════════════════════════════════════════════════════════════════════════
 *  src/Portail.jsx — LA PORTE DU SITE (25/10/2026)
 *
 *  ⭐ « الصفحة مازال مفتوحة للجميع » : le login ne protégeait que `/admin`.
 *  Ici, CHAQUE page passe par cette porte :
 *
 *      <Portail cle="quinte"><QuinteGrille /></Portail>
 *
 *  Trois cas, et rien d'autre :
 *    ① pas connecté                → le formulaire de connexion, DANS la page
 *                                    (même adresse, pas de redirection) ;
 *    ② connecté, page non comprise → « cette page n'est pas dans ton abonnement »
 *                                    + les pages qu'il a + déconnexion ;
 *    ③ connecté, page comprise     → la page s'affiche.
 *
 *  ⚠ Si le serveur dit qu'il n'a pas `ADMIN_COMPTES` (`configure: false`), le
 *    site reste fermé jusqu'à ce que l'administrateur rétablisse la connexion.
 * ══════════════════════════════════════════════════════════════════════════ */

const C = {
  fond: '#04070f',
  carte: 'linear-gradient(160deg, rgba(22,32,50,.96), rgba(8,13,24,.98))',
  bord: 'rgba(34,211,238,.28)',
  texte: '#e2e8f0',
  doux: '#a9b6c9',
  muet: '#7c8aa0',
  cyan: '#22d3ee',
  mal: '#f87171',
  ambre: '#fbbf24',
  bon: '#34d399',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}

function Cadre({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'radial-gradient(1100px 520px at 20% -10%, #16233a 0%, ' + C.fond + ' 58%)',
      color: C.texte, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 430, padding: '22px 22px 20px', borderRadius: 18,
        background: C.carte, border: '1px solid ' + C.bord,
        boxShadow: '0 22px 60px rgba(0,0,0,.55)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img src="/logo.svg" alt="" style={{ height: 38, borderRadius: 9 }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '.02em' }}>LBAHJA-TURF</div>
            <div style={{ fontSize: 11.5, color: C.muet, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              accès abonné
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function Champ({ type, valeur, onChange, placeholder, autoFocus }) {
  return (
    <input
      type={type} value={valeur} placeholder={placeholder} autoFocus={autoFocus}
      autoComplete={type === 'password' ? 'current-password' : 'username'}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10,
        fontSize: 14, color: C.texte, background: 'rgba(2,6,15,.65)',
        border: '1px solid rgba(148,163,184,.28)', outline: 'none',
      }}
    />
  )
}

function Bouton({ children, onClick, type = 'button', plein, desactive }) {
  return (
    <button type={type} onClick={onClick} disabled={desactive} style={{
      width: '100%', padding: '10px 14px', borderRadius: 10, cursor: desactive ? 'wait' : 'pointer',
      fontSize: 13.5, fontWeight: 800, letterSpacing: '.01em',
      color: plein ? '#04121a' : C.texte,
      background: plein ? 'linear-gradient(135deg, #22d3ee, #0ea5e9)' : 'rgba(148,163,184,.14)',
      border: '1px solid ' + (plein ? 'transparent' : 'rgba(148,163,184,.3)'),
      opacity: desactive ? .6 : 1,
    }}>{children}</button>
  )
}

/** ① le formulaire — nom + mot de passe, vérifiés par le SERVEUR */
function Porte({ etat, onEntre }) {
  const [nom, setNom] = useState('')
  const [mdp, setMdp] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const ab = etat.abonnement
  const expire = ab && ab.etat === 'expire'
  const aVenir = ab && ab.etat === 'a-venir'

  const envoyer = async (e) => {
    e.preventDefault()
    if (!nom.trim() || !mdp) { setErreur('écris ton nom et ton mot de passe'); return }
    setEnvoi(true); setErreur('')
    const r = await onEntre(nom, mdp)
    setEnvoi(false)
    if (!r.ok) setErreur(r.erreur)
    else setMdp('')
  }

  return (
    <Cadre>
      <form onSubmit={envoyer} style={{ display: 'grid', gap: 10 }}>
        <Champ type="text" valeur={nom} onChange={setNom} placeholder="nom d’utilisateur" autoFocus />
        <Champ type="password" valeur={mdp} onChange={setMdp} placeholder="mot de passe" />
        <Bouton type="submit" plein desactive={envoi}>{envoi ? 'vérification…' : 'Entrer'}</Bouton>
      </form>

      {(erreur || expire || aVenir) && (
        <div style={{
          marginTop: 12, padding: '9px 11px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.6,
          color: C.mal, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.35)',
        }}>
          {erreur || (expire
            ? 'Abonnement expiré le ' + (ab.fin ? ab.fin.split('-').reverse().join('/') : '—') +
              ' — contacte l’administrateur.'
            : 'Abonnement pas encore commencé (début le ' +
              (ab.debut ? ab.debut.split('-').reverse().join('/') : '—') + ').')}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 11.5, lineHeight: 1.7, color: C.muet }}>
        <i className="bi bi-shield-lock" /> Le mot de passe est vérifié par le serveur.
        La session est un cookie que cette page ne peut pas lire.
      </div>
    </Cadre>
  )
}

/** ② connecté, mais cette page n'est pas dans son abonnement */
function Refus({ etat }) {
  const p = premierePage(etat.pages)
  return (
    <Cadre>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.ambre, marginBottom: 8 }}>
        <i className="bi bi-lock" /> Cette page n’est pas dans ton abonnement
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.7, color: C.doux }}>
        Tu es connecté en <b style={{ color: C.texte }}>{etat.nom}</b>. Les pages ouvertes à ton
        compte sont celles du menu ; pour en ajouter une, vois avec l’administrateur.
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        {p && <Link to={p.to} style={{
          display: 'block', textAlign: 'center', padding: '10px 14px', borderRadius: 10,
          textDecoration: 'none', fontSize: 13.5, fontWeight: 800, color: '#04121a',
          background: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
        }}>Aller à la page autorisée</Link>}
        <Bouton onClick={deconnecter}>Se déconnecter</Bouton>
      </div>
    </Cadre>
  )
}

/** Fermeture par défaut : une configuration absente ne doit jamais ouvrir le site. */
function AccesFerme() {
  return (
    <Cadre>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.ambre, marginBottom: 8 }}>
        <i className="bi bi-shield-lock" /> Accès fermé
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.7, color: C.doux }}>
        Le service de connexion n’est pas configuré. Le site reste inaccessible jusqu’à ce que l’administrateur rétablisse les comptes.
      </div>
    </Cadre>
  )
}

export default function Portail({ cle, children }) {
  const etat = useAcces()

  useEffect(() => {
    rafraichirAcces()
    // نبضة دورية تحفظ بيانات الجلسات الحية وتعيد التحقق من صلاحيتها.
    const battement = setInterval(() => rafraichirAcces(true), 60000)
    return () => clearInterval(battement)
  }, [])

  /* on n'a pas encore la réponse du serveur */
  if (!etat.pret) {
    return (
      <div style={{
        minHeight: '100vh', background: C.fond, color: C.muet,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
      }}>
        <i className="bi bi-arrow-repeat" /> vérification de la session…
      </div>
    )
  }

  /* Échec de configuration : toujours fermer le site. */
  if (etat.configure === false) {
    return <AccesFerme />
  }

  if (!etat.connecte) {
    return <Porte etat={etat} onEntre={connecter} />
  }

  if (!aDroit(etat.pages, cle)) {
    return <Refus etat={etat} />
  }

  return children
}
