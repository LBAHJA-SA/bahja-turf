import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Entete from '../../src/Entete.jsx'
import {
  PAGES, PAGE_PAR_CLE,
  lireComptes, ecrireComptes, nouveauCompte, motDePasse, droitsInconnus,
  lireRetires, ecrireRetires,
  lireJeton, ecrireJeton,
  lireVisites, visiteDeTest,
  lireConnexions, lireSessionsActives, verdictConnexion,
  telechargerJson, lireFichierJson, paquetComptes,
  appareil, paysLisible, ilYA,
  marquerSession, oublierSession, envComptesListe, cryptoDisponible,
  etatAbonnement, abonnementCourt, dateLisible, dansNJours, aujourdhuiGMT,
} from '../../backend/ADMIN/donnees.js'
import {
  etatAdmin, sessionAdmin, connexionAdmin, deconnexionAdmin, comptesServeur, sauvegarderComptesServeur, reinitialiserAppareilServeur,
} from '../../src/lib/adminAuth.js'
import { heureGMT } from '../../src/temps.js'

/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/ADMIN/Admin.jsx — LA CONSOLE D'ADMINISTRATION
 *
 *  ⭐ 25/10/2026 — ELLE A MAINTENANT UN VRAI LOGIN (demandé par l'utilisateur)
 *
 *   ① LE MOT DE PASSE EST VÉRIFIÉ PAR LE SERVEUR (`api/admin.js`, PBKDF2).
 *      La page ne connaît aucun mot de passe : elle l'envoie, le serveur
 *      répond, et le navigateur reçoit un cookie `HttpOnly`.
 *   ② SANS SESSION, LA CONSOLE N'EXISTE PAS : `/admin` affiche la porte
 *      (formulaire), pas la console — même en connaissant l'adresse.
 *   ③ LES COMPTES VIVENT SUR LE SERVEUR (`ADMIN_COMPTES`), plus dans le
 *      navigateur. L'onglet Utilisateurs est le BROUILLON : le bouton
 *      « Enregistrer et déployer » protège les mots de passe, met à jour Vercel
 *      puis lance le redéploiement automatiquement.
 *
 *  ⭐ Les pages et données du site exigent une session valide. Les comptes
 *    n'accèdent qu'aux pages autorisées dans leurs droits.
 *
 *  TROIS ONGLETS
 *    Utilisateurs : qui entre, avec quel mot de passe, et QUELLES PAGES.
 *    Pages        : le catalogue du site, et qui a le droit d'y aller.
 *    Visiteurs    : le journal (IP, pays, page, appareil, compte) + les connexions + la mesure Vercel.
 * ══════════════════════════════════════════════════════════════════════════ */

/* ── la peau de la console : ardoise, monospace, sobre — elle ne ressemble
 *    volontairement à aucune page publique (voir AGENTS.md §12.1). ───────── */
const T = {
  accent: '#94a3b8',
  accentClair: '#cbd5e1',
  bord: 'rgba(148,163,184,.34)',
  ligne: 'rgba(148,163,184,.20)',
  doux: '#8fa3bb',
  muet: '#64748b',
  verre: 'rgba(148,163,184,.05)',
  bon: '#34d399',
  alerte: '#fbbf24',
  mal: '#f87171',
}

const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

/* La longueur minimale d'un mot de passe de la console. 6 et non 8 : c'est
 * l'utilisateur qui choisit (il a demandé un mot de passe MODIFIABLE). On ne
 * bloque que le ridicule ; en dessous de 8 la console le signale en ambre.  */
const MIN_MDP = 6

/* ─────────────────────────────────────────────────────────── PETITS BLOCS */

function Onglet({ actif, onClick, icone, libelle, compte }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      padding: '8px 15px', borderRadius: 10, fontSize: 13, fontWeight: 700,
      color: actif ? '#0b1220' : T.accentClair,
      background: actif ? 'linear-gradient(135deg,#94a3b8,#e2e8f0)' : T.verre,
      border: '1px solid ' + (actif ? 'transparent' : T.ligne),
    }}>
      <i className={'bi ' + icone} />
      {libelle}
      {compte != null && (
        <span style={{
          fontFamily: mono, fontSize: 11.5, fontWeight: 800, padding: '1px 6px', borderRadius: 6,
          background: actif ? 'rgba(11,18,32,.18)' : 'rgba(148,163,184,.16)',
        }}>{compte}</span>
      )}
    </button>
  )
}

function Carte({ titre, sous, droite, children, teinte = T.accent, style }) {
  return (
    <section style={{
      borderRadius: 14, marginBottom: 14, overflow: 'hidden',
      background: 'linear-gradient(160deg, rgba(255,255,255,.045), rgba(255,255,255,.012))',
      border: '1px solid ' + T.ligne, ...style,
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '11px 14px', borderBottom: '1px solid ' + T.ligne,
        background: 'linear-gradient(90deg, ' + teinte + '22, transparent 70%)',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: teinte, boxShadow: '0 0 10px ' + teinte }} />
        <b style={{ fontSize: 13.5 }}>{titre}</b>
        {sous && <span style={{ fontSize: 12, color: T.doux }}>{sous}</span>}
        {droite && <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>{droite}</span>}
      </header>
      <div style={{ padding: '13px 14px' }}>{children}</div>
    </section>
  )
}

function Bouton({ children, icone, onClick, teinte = T.accent, plein, petit, titre, desactive }) {
  return (
    <button onClick={onClick} disabled={desactive} title={titre} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: desactive ? 'not-allowed' : 'pointer',
      padding: petit ? '4px 9px' : '7px 13px', borderRadius: 9, fontSize: petit ? 11.5 : 12.5, fontWeight: 700,
      opacity: desactive ? .45 : 1,
      color: plein ? '#0b1220' : T.accentClair,
      background: plein ? 'linear-gradient(135deg,' + teinte + ',' + teinte + 'cc)' : T.verre,
      border: '1px solid ' + (plein ? 'transparent' : T.ligne),
    }}>
      {icone && <i className={'bi ' + icone} />}
      {children}
    </button>
  )
}

function Champ({ valeur, onChange, placeholder, large, mono: estMono, type = 'text', petit }) {
  return (
    <input
      type={type} value={valeur} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: large ? '100%' : 190, padding: petit ? '4px 8px' : '7px 10px', borderRadius: 8,
        background: 'rgba(2,6,15,.55)', color: '#e2e8f0', fontSize: petit ? 12 : 13,
        border: '1px solid ' + T.ligne, fontFamily: estMono ? mono : 'inherit', outline: 'none',
      }}
    />
  )
}

/** « 3/5 » du bilan, coloré — la seule couleur sémantique de la console. */
function Pastille({ ok, children }) {
  return (
    <span style={{
      fontFamily: mono, fontSize: 11.5, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
      color: ok ? T.bon : T.muet, background: ok ? 'rgba(52,211,153,.13)' : 'rgba(148,163,184,.10)',
      border: '1px solid ' + (ok ? 'rgba(52,211,153,.4)' : T.ligne),
    }}>{children}</span>
  )
}

/* ══════════════════════════════════════ L'ABONNEMENT (25/10/2026) ═════════
 *
 *  ⭐ « بداية ونهاية اي يوزر اشتراك » : chaque compte a une DATE DE DÉBUT et
 *  une DATE DE FIN. Quatre couleurs, une par état — et rien d'inventé :
 *  le calcul est `etatAbonnement()` de `backend/ADMIN/donnees.js`, le MÊME
 *  que celui que le serveur applique au login (jours GMT, fin incluse).
 */
const TEINTE_ABONNEMENT = {
  'illimite': { c: T.accent, dit: 'sans limite' },
  'a-venir': { c: T.alerte, dit: 'pas encore commencé' },
  'en-cours': { c: T.bon, dit: 'en cours' },
  'expire': { c: T.mal, dit: 'expiré' },
}

function PastilleAbonnement({ compte, maintenant }) {
  const a = etatAbonnement(compte, maintenant)
  const t = TEINTE_ABONNEMENT[a.etat] || TEINTE_ABONNEMENT.illimite
  return (
    <span title={t.dit + (a.fin ? ' · fin incluse le ' + dateLisible(a.fin) : '')} style={{
      fontFamily: mono, fontSize: 11.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
      color: t.c, background: t.c + '1f', border: '1px solid ' + t.c + '66', whiteSpace: 'nowrap',
    }}>{abonnementCourt(compte, maintenant)}</span>
  )
}

/** Un champ `type="date"` — la valeur reste 'AAAA-MM-JJ', vide = pas de date. */
function ChampDate({ valeur, onChange, titre }) {
  return (
    <input
      type="date" value={valeur || ''} title={titre}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '4px 7px', borderRadius: 8, fontSize: 12,
        background: 'rgba(2,6,15,.55)', color: '#e2e8f0',
        border: '1px solid ' + (valeur ? T.ligne : 'rgba(148,163,184,.14)'),
        fontFamily: mono, outline: 'none', colorScheme: 'dark',
      }}
    />
  )
}

/* ══════════════════════════════════════════════════════ LA PORTE ══════════
 *
 *  ⭐ 25/10/2026 — LE VRAI LOGIN. Ce qui a changé, et pourquoi :
 *
 *    avant : une « clé » (`?cle=…`) gardée dans le navigateur. C'était de la
 *            discrétion : n'importe qui la devinait en lisant le localStorage,
 *            et rien n'était vérifié.
 *    ici   : le mot de passe part à `/api/admin`, le SERVEUR le vérifie
 *            (PBKDF2), et la réponse est un cookie `HttpOnly` que la page ne
 *            peut ni lire ni fabriquer. Sans ce cookie, la console n'existe
 *            pas — même en connaissant l'adresse.
 *
 *  ⚠ Si `ADMIN_COMPTES` / `ADMIN_SECRET` ne sont pas posés sur le serveur, la
 *    porte le DIT et donne le mode d'emploi : elle ne s'ouvre pas « au cas où ».
 */
function Porte({ etat, nom, setNom, mdp, setMdp, erreur, envoi, onSubmit, onRelire }) {
  const arme = !!(etat && etat.configure)
  const champ = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontFamily: mono, fontSize: 13.5,
    background: 'rgba(2,6,15,.55)', border: '1px solid ' + T.bord, color: '#e2e8f0',
  }
  return (
    <div dir="ltr" style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 15% -10%, #1a2333 0%, #04070f 55%)', color: '#e2e8f0' }}>
      <Entete page="admin" />
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '48px 16px 64px' }}>
        <div style={{
          padding: '22px 22px 20px', borderRadius: 16,
          background: 'linear-gradient(150deg, rgba(148,163,184,.14), rgba(2,6,15,.6))',
          border: '1px solid ' + T.bord, boxShadow: '0 24px 60px rgba(0,0,0,.5)',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '3px 10px', borderRadius: 999,
            fontSize: 11.5, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase',
            color: T.accentClair, border: '1px solid ' + T.bord, background: T.verre,
          }}>
            <i className="bi bi-shield-lock" /> Administration
          </span>
          <h1 style={{ margin: '9px 0 4px', fontSize: 20, fontWeight: 900 }}>Console privée</h1>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: T.doux }}>
            Le mot de passe est vérifié <b>par le serveur</b>. La session est un cookie
            <code style={{ fontFamily: mono }}> HttpOnly </code> que cette page ne peut pas lire.
          </p>

          {!arme && (
            <div style={{
              padding: '12px 13px', borderRadius: 11, marginBottom: 14,
              background: 'rgba(251,191,36,.09)', border: '1px solid rgba(251,191,36,.34)',
              fontSize: 12.5, lineHeight: 1.65, color: T.doux,
            }}>
              <b style={{ color: T.alerte }}>Login pas encore armé sur ce serveur.</b>
              <ol style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                <li>Vercel → projet <b>bahja-turf</b> → Settings → Environment Variables.</li>
                <li><code style={{ fontFamily: mono }}>ADMIN_COMPTES</code> = comptes protégés par mot de passe (configurés une première fois par l’administrateur).</li>
                <li><code style={{ fontFamily: mono }}>ADMIN_SECRET</code> = une longue chaîne au hasard (elle signe les cookies).</li>
                <li><b>Redéployer</b>, puis recharger cette page.</li>
              </ol>
              {!etat?.automatisation && <div style={{ marginTop: 8 }}>Pour activer les modifications automatiques après la configuration initiale, ajoutez aussi <code style={{ fontFamily: mono }}>VERCEL_TOKEN</code> aux variables du projet, puis redéployez.</div>}
              <div style={{ marginTop: 9 }}>
                <Bouton icone="bi-arrow-clockwise" onClick={onRelire}>J’ai posé les variables — revérifier</Bouton>
              </div>
              {etat && etat.secret === false && etat.comptes > 0 && (
                <div style={{ marginTop: 7, color: T.alerte }}>Il ne manque que <b>ADMIN_SECRET</b>.</div>
              )}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
            <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: T.muet }}>
              Nom d’utilisateur
              <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="username"
                placeholder="laisser vide s’il n’y a qu’un compte" style={{ ...champ, marginTop: 5 }} />
            </label>
            <label style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: T.muet }}>
              Mot de passe
              <input value={mdp} onChange={(e) => setMdp(e.target.value)} type="password" autoComplete="current-password"
                placeholder="••••••••" style={{ ...champ, marginTop: 5 }} />
            </label>

            {erreur && (
              <div style={{ fontSize: 12.5, color: T.mal }}>
                <i className="bi bi-exclamation-octagon" /> {erreur}
              </div>
            )}

            <button type="submit" disabled={envoi || !arme || !mdp}
              style={{
                marginTop: 2, padding: '10px 14px', borderRadius: 10, cursor: (envoi || !arme || !mdp) ? 'not-allowed' : 'pointer',
                fontWeight: 800, fontSize: 13.5, color: '#0b1220', border: 'none',
                background: (envoi || !arme || !mdp) ? 'rgba(148,163,184,.35)' : 'linear-gradient(135deg,#94a3b8,#e2e8f0)',
              }}>
              {envoi ? 'Vérification…' : 'Entrer'}
            </button>
          </form>
        </div>
        <p style={{ margin: '14px 2px 0', fontSize: 11.5, color: T.muet, textAlign: 'center' }}>
          Les pages et données du site nécessitent une session valide.
        </p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════ LA PAGE ═══════════ */

export default function Admin() {
  /* ── ① LA PORTE — un VRAI login (25/10/2026) ─────────────────────────────── */
  const [etat, setEtat] = useState(null)       // { configure, secret, comptes }
  const [moi, setMoi] = useState(null)         // { nom, pages } si connecté
  const [pret, setPret] = useState(false)
  const [nom, setNom] = useState('')
  const [mdp, setMdp] = useState('')
  const [erreurLogin, setErreurLogin] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const relire = async () => {
    const e = await etatAdmin()
    setEtat(e)
    if (e && e.configure) {
      const s = await sessionAdmin()
      if (s && s.connecte) {
        setMoi({ nom: s.nom, pages: s.pages || [], abonnement: s.abonnement || null, connexion: s.connexion || null })
        marquerSession(s.nom)
      } else setMoi(null)
    } else setMoi(null)
    setPret(true)
  }

  useEffect(() => { relire() }, [])

  const seConnecter = async (e) => {
    e.preventDefault()
    setEnvoi(true); setErreurLogin('')
    const r = await connexionAdmin(nom.trim(), mdp)
    setEnvoi(false)
    if (r && r.ok) {
      marquerSession(r.nom)
      setMdp('')
      setMoi({ nom: r.nom, pages: r.pages || [], abonnement: r.abonnement || null, connexion: r.connexion || null })
      return
    }
    setErreurLogin((r && r.erreur) || 'connexion impossible')
  }

  const seDeconnecter = async () => {
    await deconnexionAdmin()
    oublierSession()
    setMoi(null)
    setMdp('')
    setOnglet('utilisateurs')
  }

  const [onglet, setOnglet] = useState('utilisateurs')

  /* ── ② LES COMPTES (dans ce navigateur) ─────────────────────────────────── */
  const [comptes, setComptes] = useState(() => lireComptes())
  /* les noms SUPPRIMÉS à la main : la fusion ne doit pas les ressusciter */
  const [retires, setRetires] = useState(() => lireRetires())
  const [vus, setVus] = useState(() => new Set())     // mots de passe affichés
  const [recherche, setRecherche] = useState('')
  const fichier = useRef(null)
  const confirmRef = useRef(null)                     // le bloc « ✅ enregistré »
  const [enregistreLe, setEnregistreLe] = useState(null)
  const [envEnCours, setEnvEnCours] = useState(false)
  const [deploiementComptes, setDeploiementComptes] = useState(null)
  const [editionId, setEditionId] = useState(null)
  const [erreursCompte, setErreursCompte] = useState({})

  useEffect(() => { ecrireComptes(comptes); setEnregistreLe(Date.now()) }, [comptes])
  useEffect(() => { ecrireRetires(retires) }, [retires])

  const majCompte = (id, champ, valeur) =>
    setComptes((l) => l.map((c) => (c.id === id ? { ...c, [champ]: valeur } : c)))

  const basculerPage = (id, cle) =>
    setComptes((l) => l.map((c) => {
      if (c.id !== id) return c
      const pages = c.pages || []
      return { ...c, pages: pages.includes(cle) ? pages.filter((p) => p !== cle) : [...pages, cle] }
    }))

  const ajouter = () => {
    /* ⭐ 25/10/2026 — le mot de passe n'est plus généré tout seul : on l'écrit.
     * (le bouton 🎲 de la ligne reste là si tu préfères en tirer un au hasard) */
    const existants = new Set([
      ...(duServeur || []).map((x) => String(x.nom || '').trim().toLowerCase()),
      ...comptes.map((x) => String(x.nom || '').trim().toLowerCase()),
    ])
    let n = 1
    while (existants.has(('utilisateur' + n).toLowerCase())) n++
    const c = { ...nouveauCompte('utilisateur' + n), motDePasse: '', nouveau: true }
    setComptes((l) => [...l, c])
    setVus((s) => new Set([...s, c.id]))   // champ visible pendant la saisie
    setEditionId(c.id)
  }

  const commencerEdition = (c) => {
    const nom = String(c.serveurNom || c.nom || '').trim().toLowerCase()
    const distant = !c.nouveau && (duServeur || []).find((x) => String(x.nom || '').trim().toLowerCase() === nom)
    majCompte(c.id, 'serveurNom', c.nouveau ? '' : (c.serveurNom || (distant && distant.nom) || ''))
    setEditionId(c.id)
    setErreursCompte((e) => ({ ...e, [c.id]: '' }))
  }

  const annulerEdition = (c) => {
    if (!c.serveurNom) {
      setComptes((l) => l.filter((x) => x.id !== c.id))
    } else {
      const distant = (duServeur || []).find((x) => String(x.nom || '').toLowerCase() === String(c.serveurNom).toLowerCase())
      if (distant) setComptes((l) => l.map((x) => x.id === c.id ? {
        ...x, nom: distant.nom, motDePasse: '', pages: distant.pages || [],
        actif: distant.actif !== false, debut: distant.debut || '', fin: distant.fin || '',
      } : x))
    }
    setEditionId(null)
    setErreursCompte((e) => ({ ...e, [c.id]: '' }))
  }

  const comptesServeurCourants = async () => {
    if (Array.isArray(duServeur)) return duServeur
    const r = await comptesServeur()
    if (!r || r.statut !== 200 || !Array.isArray(r.comptes)) throw new Error((r && r.erreur) || 'lecture des comptes serveur impossible')
    setDuServeur(r.comptes)
    return r.comptes
  }

  const enregistrerCompte = async (c) => {
    if (envEnCours) return
    setErreursCompte((e) => ({ ...e, [c.id]: '' }))
    try {
      const nom = String(c.nom || '').trim()
      if (!nom) throw new Error('Écris un nom pour ce compte.')
      if (c.motDePasse && c.motDePasse.length < MIN_MDP) throw new Error(MIN_MDP + ' caractères minimum pour le mot de passe.')
      if (!cryptoDisponible()) throw new Error('Le chiffrement nécessite une connexion HTTPS.')

      const serveur = await comptesServeurCourants()
      const nomSource = String(c.serveurNom || c.nom || '').trim().toLowerCase()
      const index = c.nouveau ? -1 : serveur.findIndex((s) => String(s.nom || '').trim().toLowerCase() === nomSource)
      const collision = serveur.some((s, i) => i !== index && String(s.nom || '').trim().toLowerCase() === nom.toLowerCase())
      if (collision) throw new Error('Un autre compte utilise déjà ce nom.')

      const hache = c.motDePasse ? (await envComptesListe([{ ...c, nom }]))[0] : null
      if (index < 0 && !hache) throw new Error('Ajoute un mot de passe pour ce nouveau compte.')

      const propre = (s) => ({
        nom: s.nom, sel: s.sel, iter: Number(s.iter) || 210000, hash: s.hash,
        pages: Array.isArray(s.pages) ? s.pages : [], actif: s.actif !== false,
        debut: s.debut || '', fin: s.fin || '',
      })
      const suite = serveur.map(propre)
      const nouveau = {
        ...(index >= 0 ? suite[index] : hache),
        ...(hache || {}), nom,
        pages: Array.isArray(c.pages) ? c.pages : [],
        actif: c.actif !== false, debut: c.debut || '', fin: c.fin || '',
      }
      if (index >= 0) suite[index] = nouveau
      else suite.push(nouveau)

      const valeur = JSON.stringify(suite)
      await sauverValeurServeur(valeur)
      setDuServeur(suite)
      setComptes((l) => l.map((x) => x.id === c.id ? { ...c, nom, motDePasse: '', serveurNom: nom, nouveau: false } : x))
      setRetires((r) => r.filter((x) => String(x).toLowerCase() !== nom.toLowerCase()))
      setEditionId(null)
    } catch (e) {
      const message = (e.enregistre ? 'Données enregistrées, mais le redéploiement a échoué. ' : '') + (e.message || 'Enregistrement impossible.')
      setErreursCompte((x) => ({ ...x, [c.id]: message }))
    }
  }

  /* ⭐ SUPPRIMER DEMANDE CONFIRMATION (25/10/2026)
   *  « خدف اي يوزر خاص تكون رسالة تاكيج الحدف » — avant, un clic sur la
   *  corbeille effaçait la ligne sans rien demander. Maintenant : une boîte
   *  qui NOMME le compte, et rappelle qu'il faut ensuite enregistrer et
   *  redéployer pour révoquer l'accès du compte côté serveur. */
  const supprimer = async (c) => {
    const nom = (c && c.nom) || '(sans nom)'
    const ok = window.confirm(
      'Supprimer le compte « ' + nom + ' » ?\n\n' +
      '• il disparaîtra de la liste ;\n' +
      '• son accès sera révoqué sur Vercel après le redéploiement automatique.\n\n' +
      'Confirmer la suppression ?'
    )
    if (!ok) return
    if (envEnCours) return
    try {
      const serveur = await comptesServeurCourants()
      const nomServeur = String(c.serveurNom || c.nom || '').trim().toLowerCase()
      const existe = !c.nouveau && serveur.some((x) => String(x.nom || '').trim().toLowerCase() === nomServeur)
      if (existe) {
        const suite = serveur.filter((x) => String(x.nom || '').trim().toLowerCase() !== nomServeur)
          .map((s) => ({
            nom: s.nom, sel: s.sel, iter: Number(s.iter) || 210000, hash: s.hash,
            pages: Array.isArray(s.pages) ? s.pages : [], actif: s.actif !== false,
            debut: s.debut || '', fin: s.fin || '',
          }))
        await sauverValeurServeur(JSON.stringify(suite))
        setDuServeur(suite)
        setRetires((r) => [...new Set([...r, nomServeur])])
      }
      setComptes((l) => l.filter((x) => x.id !== c.id))
      setEditionId((id) => id === c.id ? null : id)
    } catch (e) {
      setErreursCompte((x) => ({ ...x, [c.id]: (e.enregistre ? 'Le compte est enregistré, mais le redéploiement a échoué. ' : '') + (e.message || 'Suppression impossible.') }))
    }
  }

  const copier = async (texte) => {
    try { await navigator.clipboard.writeText(texte) } catch { /* silencieux */ }
  }

  /* Déclarée avant les valeurs dérivées qui filtrent les comptes déjà présents. */
  const [duServeur, setDuServeur] = useState(null)

  const comptesBrouillon = useMemo(() => {
    const dejaSurServeur = new Set((duServeur || []).map((c) => String(c.nom || '').trim().toLowerCase()))
    return comptes.filter((c) => c.nouveau || !dejaSurServeur.has(String(c.serveurNom || c.nom || '').trim().toLowerCase()))
  }, [comptes, duServeur])

  const comptesVus = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return q ? comptesBrouillon.filter((c) => (c.nom || '').toLowerCase().includes(q)) : comptesBrouillon
  }, [comptesBrouillon, recherche])

  const importer = async (f) => {
    try {
      const j = await lireFichierJson(f)
      const liste = Array.isArray(j) ? j : (j.comptes || [])
      if (!Array.isArray(liste)) throw new Error('aucune liste de comptes')
      setComptes(liste.map((c) => ({ ...nouveauCompte(c.nom || ''), ...c })))
    } catch (e) { window.alert('Import impossible : ' + e.message) }
  }

  /* ── ③ LES VISITES ──────────────────────────────────────────────────────── */
  const [jeton, setJeton] = useState(() => lireJeton())
  const [journal, setJournal] = useState(null)
  const [charge, setCharge] = useState(false)
  const [erreurJournal, setErreurJournal] = useState('')

  /* ⭐ 26/10/2026 — LE DEUXIÈME JOURNAL : les CONNEXIONS.
   * `journal` = qui vient sur le site (une ligne par page vue).
   * `connexions` = qui ENTRE, avec quel appareil, et si ça a marché. */
  const [connexions, setConnexions] = useState(null)
  const [sessionsActives, setSessionsActives] = useState(null)
  const [chargeCx, setChargeCx] = useState(false)
  const [erreurCx, setErreurCx] = useState('')

  const chargerJournal = async (leJeton = jeton) => {
    setCharge(true); setErreurJournal('')
    try {
      const j = await lireVisites(leJeton)
      setJournal(j)
    } catch (e) {
      setJournal(null); setErreurJournal(e.message || 'journal illisible')
    } finally { setCharge(false) }
  }

  const chargerConnexions = async (leJeton = jeton) => {
    setChargeCx(true); setErreurCx('')
    try {
      const j = await lireConnexions(leJeton)
      setConnexions(j)
    } catch (e) {
      setConnexions(null); setErreurCx(e.message || 'journal des connexions illisible')
    } finally { setChargeCx(false) }
  }

  const chargerSessionsActives = async (leJeton = jeton) => {
    try { setSessionsActives(await lireSessionsActives(leJeton)) }
    catch { setSessionsActives(null) }
  }

  const derniereConnexionDuCompte = (nom) => {
    const cle = String(nom || '').trim().toLowerCase()
    return (connexions?.connexions || [])
      .filter((c) => c.ok && String(c.nom || '').trim().toLowerCase() === cle)
      .sort((a, b) => Date.parse(b.t || '') - Date.parse(a.t || ''))[0] || null
  }

  const sessionActiveDuCompte = (nom) => {
    const cle = String(nom || '').trim().toLowerCase()
    return (sessionsActives?.actifs || [])
      .filter((s) => String(s.nom || '').trim().toLowerCase() === cle)
      .sort((a, b) => Date.parse(b.t || '') - Date.parse(a.t || ''))[0] || null
  }

  /* Le journal des connexions sert aussi à afficher le dernier accès de
   * chaque compte dans sa carte, sans attendre l'ouverture de l'onglet Visiteurs. */
  useEffect(() => {
    if (!moi || (onglet !== 'visiteurs' && onglet !== 'utilisateurs')) return undefined
    if (onglet === 'visiteurs') chargerJournal(jeton)
    chargerConnexions(jeton)
    chargerSessionsActives(jeton)
    const t = setInterval(() => {
      if (onglet === 'visiteurs') chargerJournal(jeton)
      if (onglet === 'utilisateurs') sessionAdmin()
      chargerConnexions(jeton)
      chargerSessionsActives(jeton)
    }, 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet, jeton, moi])

  /* ── ④ LES COMPTES DU SERVEUR — ce que le login lit vraiment ─────────────── */
  const [envPret, setEnvPret] = useState('')
  const [editionServeur, setEditionServeur] = useState(null)
  const [erreurServeur, setErreurServeur] = useState('')

  const lireServeur = async () => {
    const r = await comptesServeur()
    setDuServeur(r && Array.isArray(r.comptes) ? r.comptes : [])
  }

  const debloquerAppareil = async (compte) => {
    if (!window.confirm(`Réinitialiser l’appareil de ${compte.nom} ? Le compte devra se reconnecter sur son nouvel appareil.`)) return
    const r = await reinitialiserAppareilServeur(compte.nom)
    if (r?.ok) await lireServeur()
    else setErreurServeur(r?.erreur || 'Réinitialisation impossible')
  }

  useEffect(() => { if (moi) lireServeur() }, [moi])

  /* ⭐ LA VALEUR DE `ADMIN_COMPTES`, SANS JAMAIS PERDRE UN COMPTE (25/10/2026)
   *
   *  « خاصو يكون أوطو » — le brouillon ne contient que ce que TU as tapé. Si on
   *  envoyait le brouillon tel quel, les comptes déjà sur le serveur (ton
   *  propre « sam ») seraient EFFACÉS : tu te fermerais la porte.
   *
   *  Donc on FUSIONNE, sans rien demander :
   *    • un compte du brouillon AVEC mot de passe → haché, il remplace l'ancien ;
   *    • un compte du brouillon SANS mot de passe → on garde la ligne du serveur
   *      (son hash), pas besoin de retaper le mot de passe ;
   *    • un compte du serveur ABSENT du brouillon → conservé tel quel.
   *  Seul un compte NOUVEAU et sans mot de passe fait refuser (rien à garder).
   */
  const produireValeur = async (base) => {
    let serveur = duServeur
    if (!serveur) {
      const r = await comptesServeur()
      serveur = r && Array.isArray(r.comptes) ? r.comptes : []
      setDuServeur(serveur)
    }
    const cle = (s) => String(s || '').toLowerCase()
    const retire = new Set((retires || []).map(cle))
    const surServeur = (nom) => serveur.find((s) => cle(s.nom) === cle(nom) && !retire.has(cle(s.nom)))

    /* ⚠ la ligne du serveur contient AUSSI l'état calculé de l'abonnement : on
     * ne garde que les 8 champs de ADMIN_COMPTES, sinon la valeur produite
     * embarque un objet `abonnement` que le serveur ne relit pas. */
    const ligneServeur = (s) => ({
      nom: s.nom,
      sel: s.sel,
      iter: Number(s.iter) || 210000,
      hash: s.hash,
      pages: Array.isArray(s.pages) ? s.pages : [],
      actif: s.actif !== false,
      debut: s.debut || '',
      fin: s.fin || '',
    })
    const reutilisable = (s) => !!(s && s.sel && s.hash)

    const aHacher = []
    const manquants = []
    for (const c of base) {
      if (c.motDePasse) aHacher.push(c)
      else if (!reutilisable(surServeur(c.nom))) manquants.push(c.nom || '(sans nom)')
    }
    if (manquants.length) {
      const e = new Error('mot de passe manquant')
      e.manquants = manquants
      throw e
    }

    const frais = await envComptesListe(aHacher)
    const parNom = new Map(frais.map((h) => [cle(h.nom), h]))
    const total = []
    for (const c of base) {
      const h = parNom.get(cle(c.nom))
      if (h) total.push(h)
      else {
        const s = surServeur(c.nom)
        if (reutilisable(s)) total.push(ligneServeur(s))   /* mot de passe vide → le hash du serveur */
      }
    }
    for (const s of serveur) {
      if (retire.has(cle(s.nom))) continue   /* supprimé à la main : ne revient pas */
      if (!reutilisable(s)) continue         /* rien à réutiliser : on ne fabrique pas un compte mort */
      if (!total.some((t) => cle(t.nom) === cle(s.nom))) total.push(ligneServeur(s))   /* jamais perdu */
    }
    return JSON.stringify(total)
  }

  const sauverValeurServeur = async (valeur) => {
    setEnvEnCours(true)
    setEnvPret('')
    setDeploiementComptes(null)
    try {
      const r = await sauvegarderComptesServeur(valeur)
      if (!r || !r.ok) {
        const erreur = new Error((r && r.erreur) || 'enregistrement impossible')
        erreur.enregistre = !!(r && r.enregistre)
        throw erreur
      }
      setEnvPret('ok')
      setDeploiementComptes(r.deploiement || null)
      return r
    } finally {
      setEnvEnCours(false)
    }
  }

  const modifierCompteServeur = (champ, valeur) => setEditionServeur((e) => e ? ({ ...e, [champ]: valeur }) : e)

  const enregistrerCompteServeur = async () => {
    if (!editionServeur || envEnCours) return
    setErreurServeur('')
    try {
      const serveur = await comptesServeurCourants()
      const ancienNom = String(editionServeur.ancienNom || '').trim()
      const nom = String(editionServeur.nom || '').trim()
      if (!nom) throw new Error('اكتب اسم المستخدم.')
      if (editionServeur.motDePasse && editionServeur.motDePasse.length < MIN_MDP) throw new Error(MIN_MDP + ' caractères minimum pour le mot de passe.')
      if (serveur.some((s) => String(s.nom || '').toLowerCase() === nom.toLowerCase() && String(s.nom || '').toLowerCase() !== ancienNom.toLowerCase())) {
        throw new Error('Un autre compte utilise déjà ce nom.')
      }
      let hash = null
      if (editionServeur.motDePasse) hash = (await envComptesListe([{ nom, motDePasse: editionServeur.motDePasse }]))[0]
      const suite = serveur.map((s) => {
        if (String(s.nom || '').toLowerCase() !== ancienNom.toLowerCase()) return {
          nom: s.nom, sel: s.sel, iter: Number(s.iter) || 210000, hash: s.hash,
          pages: Array.isArray(s.pages) ? s.pages : [], actif: s.actif !== false,
          debut: s.debut || '', fin: s.fin || '',
        }
        return {
          nom, sel: hash ? hash.sel : s.sel, iter: hash ? hash.iter : Number(s.iter) || 210000,
          hash: hash ? hash.hash : s.hash,
          pages: Array.isArray(editionServeur.pages) ? editionServeur.pages : [],
          actif: editionServeur.actif !== false, debut: editionServeur.debut || '', fin: editionServeur.fin || '',
        }
      })
      await sauverValeurServeur(JSON.stringify(suite))
      setDuServeur(suite)
      setComptes((l) => l.map((x) => String(x.serveurNom || x.nom || '').toLowerCase() === ancienNom.toLowerCase()
        ? { ...x, nom, serveurNom: nom, motDePasse: '', pages: editionServeur.pages, actif: editionServeur.actif, debut: editionServeur.debut, fin: editionServeur.fin }
        : x))
      setEditionServeur(null)
    } catch (e) {
      setErreurServeur((e.enregistre ? 'Données enregistrées, mais le redéploiement a échoué. ' : '') + (e.message || 'Enregistrement impossible.'))
    }
  }

  const supprimerCompteServeur = async (c) => {
    if (!window.confirm('حذف الحساب « ' + c.nom + ' »؟\n\nسيُلغى دخوله بعد إعادة النشر التلقائية.')) return
    if (envEnCours) return
    setErreurServeur('')
    try {
      const nom = String(c.nom || '').trim().toLowerCase()
      const serveur = await comptesServeurCourants()
      const suite = serveur.filter((s) => String(s.nom || '').trim().toLowerCase() !== nom).map((s) => ({
        nom: s.nom, sel: s.sel, iter: Number(s.iter) || 210000, hash: s.hash,
        pages: Array.isArray(s.pages) ? s.pages : [], actif: s.actif !== false,
        debut: s.debut || '', fin: s.fin || '',
      }))
      if (!suite.length) throw new Error('لا يمكن حذف آخر حساب؛ يجب إبقاء حساب واحد على الأقل.')
      await sauverValeurServeur(JSON.stringify(suite))
      setDuServeur(suite)
      setComptes((l) => l.filter((x) => String(x.serveurNom || x.nom || '').trim().toLowerCase() !== nom))
      setRetires((r) => [...new Set([...r, nom])])
      if (editionServeur && String(editionServeur.ancienNom || '').toLowerCase() === nom) setEditionServeur(null)
    } catch (e) {
      setErreurServeur((e.enregistre ? 'Données enregistrées, mais le redéploiement a échoué. ' : '') + (e.message || 'Suppression impossible.'))
    }
  }

  const preparerEnv = async () => {
    if (!cryptoDisponible()) {
      window.alert(
        'Ce navigateur ne donne pas accès au chiffrement (Web Crypto).\n\n' +
        'Il faut ouvrir la console en https (bahja-turf.vercel.app) ou sur localhost.'
      )
      return
    }
    try {
      const valeur = await produireValeur(comptesBrouillon)
      /* ⚠ un ADMIN_COMPTES vide fermerait le login : plus aucun compte à
       * vérifier. C'est le seul cas refusé — un brouillon vide peut très bien
       * être une SUPPRESSION (les comptes du serveur sont alors repris). */
      if (!JSON.parse(valeur).length) {
        window.alert(
          'Rien à enregistrer : la valeur serait vide.\n\n' +
          'Un ADMIN_COMPTES vide ferme le login (plus aucun compte à vérifier).\n' +
          'Garde au moins un compte — le tien.'
        )
        return
      }
      await sauverValeurServeur(valeur)
      setDuServeur(JSON.parse(valeur))
      /* on amène le bloc « ✅ enregistré » sous les yeux : sans ça, le retour
       * du bouton apparaissait plus bas dans la page et on croyait que rien
       * ne s'était passé. */
      setTimeout(() => {
        if (confirmRef.current && confirmRef.current.scrollIntoView) {
          confirmRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 60)
    } catch (e) {
      if (e && e.manquants) {
        window.alert('Rien n’est enregistré : ce compte n’a pas de mot de passe.\n\n' +
          e.manquants.join(', ') + '\n\nÉcris son mot de passe dans la liste, puis recommence.')
      } else {
        window.alert((e.enregistre ? 'ADMIN_COMPTES est enregistré, mais le redéploiement n’a pas démarré. ' : 'Enregistrement impossible : ') + e.message)
      }
    }
  }

  /** Recopier les comptes du SERVEUR dans le brouillon, pour les modifier.
   *  Le mot de passe reste vide : le serveur ne rend que son HASH — c'est à
   *  toi de le retaper (c'est exactement ce que tu veux quand tu le changes).
   *  Tant qu'il est vide, la fusion réutilise le hash du serveur tel quel. */
  const reprendreServeur = () => {
    const base = (duServeur || []).map((c) => ({
      ...nouveauCompte(c.nom),
      motDePasse: '',
      pages: c.pages || [],
      actif: c.actif !== false,
      debut: c.debut || '',
      fin: c.fin || '',
    }))
    setComptes(base)
  }

  /* ── l'attente de la porte ──────────────────────────────────────────────── */
  if (!pret) return <div style={{ minHeight: '100vh', background: '#04070f' }} />
  if (!moi) {
    return (
      <Porte
        etat={etat} nom={nom} setNom={setNom} mdp={mdp} setMdp={setMdp}
        erreur={erreurLogin} envoi={envoi} onSubmit={seConnecter} onRelire={relire}
      />
    )
  }
  if (!(moi.pages || []).includes('admin')) {
    return (
      <div style={{ minHeight: '100vh', background: '#04070f', color: T.accentClair, display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ maxWidth: 420, textAlign: 'center', padding: 24, border: '1px solid ' + T.ligne, borderRadius: 14 }}>
          <h2>Accès réservé à l’administration</h2>
          <p style={{ color: T.doux }}>Ce compte ne possède pas le droit d’ouvrir cette page.</p>
          <Bouton icone="bi-box-arrow-right" onClick={seDeconnecter}>Se déconnecter</Bouton>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════ LE RENDU ═══════════════════════════ */
  return (
    <div dir="ltr" style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 15% -10%, #1a2333 0%, #04070f 55%)', color: '#e2e8f0' }}>
      <Entete page="admin" />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 16px 56px' }}>

        {/* ══════════ L'EN-TÊTE ══════════ */}
        <div style={{
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14,
          padding: '14px 18px', borderRadius: 16,
          background: 'linear-gradient(120deg, rgba(148,163,184,.16), rgba(56,189,248,.05) 55%, rgba(255,255,255,.02))',
          border: '1px solid ' + T.bord,
        }}>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '3px 10px', borderRadius: 999,
              fontSize: 11.5, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase',
              color: T.accentClair, border: '1px solid ' + T.bord, background: T.verre,
            }}>
              <i className="bi bi-shield-lock" /> Administration
            </span>
            <h1 style={{
              margin: '7px 0 0', fontSize: 21, fontWeight: 900,
              backgroundImage: 'linear-gradient(92deg,#e2e8f0,#94a3b8 60%,#64748b)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              Console privée
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: 12.5, color: T.doux }}>
              Les comptes · les pages de chacun · les visiteurs — <b>invisible pour les visiteurs</b>, aucune entrée du site n'est encore filtrée.
            </p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Pastille ok>{moi.nom}</Pastille>
            <Pastille ok={comptesBrouillon.length > 0}>{comptesBrouillon.length} brouillon</Pastille>
            <Pastille ok={journal && journal.configure}>{journal && journal.configure ? (journal.total + ' visites') : 'journal à brancher'}</Pastille>
            <Bouton icone="bi-box-arrow-right" teinte={T.mal} onClick={seDeconnecter} titre="Fermer la session (le cookie est effacé)">Déconnexion</Bouton>
          </div>
        </div>

        {/* ══════════ LES ONGLETS ══════════ */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <Onglet actif={onglet === 'utilisateurs'} onClick={() => setOnglet('utilisateurs')}
            icone="bi-people" libelle="Utilisateurs" compte={comptesBrouillon.length} />
          <Onglet actif={onglet === 'pages'} onClick={() => setOnglet('pages')}
            icone="bi-grid-3x3-gap" libelle="Pages" compte={PAGES.length} />
          <Onglet actif={onglet === 'visiteurs'} onClick={() => setOnglet('visiteurs')}
            icone="bi-graph-up" libelle="Visiteurs" />
        </div>

        {/* ═══════════════════════════ ① UTILISATEURS ═══════════════════════ */}
        {onglet === 'utilisateurs' && (
          <>
            <Carte
              titre="La session ouverte"
              sous={moi.nom}
              teinte={T.bon}
              droite={<Bouton icone="bi-box-arrow-right" teinte={T.mal} onClick={seDeconnecter}>Déconnexion</Bouton>}
            >
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: T.doux }}>
                Le mot de passe a été vérifié <b>par le serveur</b> (PBKDF2-SHA256, 210 000 itérations).
                La session est un cookie <code style={{ fontFamily: mono }}>bahja_admin</code>
                {' '}<b>HttpOnly</b> : cette page ne peut ni le lire ni le fabriquer, et il expire au bout de 12 h.
                <div style={{ marginTop: 8, display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: T.muet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Pages de ce compte
                  </span>
                  {(moi.pages || []).length === 0
                    ? <span style={{ fontSize: 12, color: T.muet }}>aucune (le login n'en filtre aucune pour l'instant)</span>
                    : (moi.pages || []).map((cle) => (
                      <span key={cle} style={{
                        padding: '2px 9px', borderRadius: 999, fontSize: 11.5,
                        background: 'rgba(148,163,184,.12)', border: '1px solid ' + T.ligne, color: T.accentClair,
                      }}>{PAGE_PAR_CLE[cle] ? PAGE_PAR_CLE[cle].nom : cle}</span>
                    ))}
                </div>
                <div style={{ marginTop: 9, display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: T.muet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Abonnement
                  </span>
                  <PastilleAbonnement compte={moi.abonnement || {}} />
                  <span style={{ fontSize: 11.5, color: T.muet, fontFamily: mono }}>
                    {dateLisible(moi.abonnement && moi.abonnement.debut)} → {dateLisible(moi.abonnement && moi.abonnement.fin)}
                  </span>
                </div>
                <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid ' + T.ligne }}>
                  <div style={{ fontSize: 11.5, color: T.muet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
                    بيانات الاتصال الحالية
                  </div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', fontSize: 12.5 }}>
                    <span style={{ color: T.doux }}><i className="bi bi-globe2" /> IP</span>
                    <code style={{ fontFamily: mono, color: T.accentClair }}>{moi.connexion?.ip || 'غير متاح'}</code>
                    <span style={{ color: T.muet }}>·</span>
                    <span style={{ color: T.doux }}><i className="bi bi-phone" /> Appareil</span>
                    <span style={{ color: T.accentClair }}>{moi.connexion?.ua ? appareil(moi.connexion.ua) : 'غير متاح'}</span>
                    {moi.connexion?.pays && <><span style={{ color: T.muet }}>·</span><span style={{ color: T.doux }}>{paysLisible(moi.connexion.pays)}{moi.connexion.ville ? ' · ' + moi.connexion.ville : ''}</span></>}
                  </div>
                </div>
              </div>
            </Carte>

            <Carte
              titre="Les comptes du serveur"
              sous={duServeur === null ? 'lecture…' : `${duServeur.length} compte(s) dans ADMIN_COMPTES`}
              teinte={T.accentClair}
              droite={<>
                <Bouton icone="bi-arrow-clockwise" onClick={lireServeur}>Relire</Bouton>
                <Bouton icone="bi-server" onClick={preparerEnv} plein teinte={T.accent} desactive={envEnCours}
                  titre="Enregistre les comptes sur Vercel et lance un redéploiement">{envEnCours ? 'Déploiement…' : 'Enregistrer et déployer'}</Bouton>
              </>}
            >
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: T.doux }}>
                Les comptes ci-dessous viennent de la variable <code style={{ fontFamily: mono }}>ADMIN_COMPTES</code>
                {' '}— c'est elle que le login lit. Le bouton enregistre les comptes ici, met à jour Vercel
                et lance automatiquement un redéploiement. Le mot de passe en clair n’est jamais envoyé.
                {!etat?.automatisation && <span style={{ display: 'block', marginTop: 7, color: T.alerte }}>Configuration initiale requise : ajoutez une fois la variable secrète VERCEL_TOKEN dans les réglages Vercel, puis redéployez. Les enregistrements suivants seront automatiques.</span>}
              </div>

              <div style={{ marginTop: 11, display: 'grid', gap: 8 }}>
                {erreurServeur && <div style={{ color: T.mal, fontSize: 12.5 }}>{erreurServeur}</div>}
                {duServeur === null && <div style={{ fontSize: 12.5, color: T.muet }}>lecture…</div>}
                {duServeur && duServeur.length === 0 && (
                  <div style={{ fontSize: 12.5, color: T.alerte }}>
                    <i className="bi bi-exclamation-triangle" /> Le serveur ne rend aucun compte :
                    soit <code style={{ fontFamily: mono }}>ADMIN_COMPTES</code> est vide, soit la session a expiré.
                  </div>
                )}
                {(duServeur || []).map((c) => {
                  const enEditionServeur = editionServeur && String(editionServeur.ancienNom).toLowerCase() === String(c.nom).toLowerCase()
                  const valeurEdition = enEditionServeur ? editionServeur : c
                  const derniereConnexion = derniereConnexionDuCompte(c.nom)
                  const battementActif = sessionActiveDuCompte(c.nom)
                  const compteSessionActuelle = String(moi.nom || '').toLowerCase() === String(c.nom || '').toLowerCase()
                  const estEnLigne = compteSessionActuelle || !!(battementActif && Date.now() - Date.parse(battementActif.t || '') < 150000)
                  const connexionAffichee = battementActif ||
                    (compteSessionActuelle ? moi.connexion : null) ||
                    derniereConnexion
                  const expire = c.abonnement?.etat === 'expire'
                  return <div key={c.nom || c.id} style={{
                    padding: '9px 11px', borderRadius: 11, background: 'rgba(2,6,15,.35)',
                    border: '1px solid ' + T.ligne,
                  }}>
                    <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 13, color: expire ? T.mal : estEnLigne ? T.bon : '#e2e8f0' }}>{enEditionServeur ? (editionServeur.nom || '(sans nom)') : (c.nom || '(sans nom)')}</b>
                      <Pastille ok={c.actif !== false}>{c.actif !== false ? 'actif' : 'suspendu'}</Pastille>
                      <PastilleAbonnement compte={c} />
                      <span style={{ fontSize: 11.5, color: T.muet, fontFamily: mono }}>
                        {dateLisible(c.debut)} → {dateLisible(c.fin)}
                      </span>
                      {c.appareilBloque && <span style={{ color: T.mal, fontSize: 12, fontWeight: 700 }}>Compte bloqué : nouvel appareil détecté</span>}
                      {c.appareilBloque && <Bouton petit teinte={T.alerte} onClick={() => debloquerAppareil(c)}>Réinitialiser l’appareil</Bouton>}
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {enEditionServeur ? <>
                          <Bouton petit icone="bi-save" plein teinte={T.bon} onClick={enregistrerCompteServeur} desactive={envEnCours}>حفظ</Bouton>
                          <Bouton petit icone="bi-x-lg" onClick={() => { setEditionServeur(null); setErreurServeur('') }} desactive={envEnCours}>إلغاء</Bouton>
                        </> : <Bouton petit icone="bi-pencil" onClick={() => {
                          setErreurServeur('')
                          setEditionServeur({ ancienNom: c.nom, nom: c.nom, motDePasse: '', pages: c.pages || [], actif: c.actif !== false, debut: c.debut || '', fin: c.fin || '' })
                        }} desactive={envEnCours}>تعديل</Bouton>}
                        <Bouton petit icone="bi-trash" teinte={T.mal} onClick={() => supprimerCompteServeur(c)} desactive={envEnCours}>حذف</Bouton>
                      </span>
                    </div>
                    {enEditionServeur && <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input value={editionServeur.nom} onChange={(e) => modifierCompteServeur('nom', e.target.value)} aria-label="اسم المستخدم" placeholder="اسم المستخدم" style={{ padding: '6px 9px', borderRadius: 8, border: '1px solid ' + T.ligne, background: 'rgba(2,6,15,.65)', color: T.accentClair }} />
                        <input value={editionServeur.motDePasse} onChange={(e) => modifierCompteServeur('motDePasse', e.target.value)} type="password" autoComplete="new-password" placeholder="كلمة مرور جديدة (اختياري)" style={{ minWidth: 230, padding: '6px 9px', borderRadius: 8, border: '1px solid ' + T.ligne, background: 'rgba(2,6,15,.65)', color: T.accentClair }} />
                        <Bouton petit plein={editionServeur.actif} teinte={editionServeur.actif ? T.bon : T.mal} onClick={() => modifierCompteServeur('actif', !editionServeur.actif)}>{editionServeur.actif ? 'نشط' : 'موقوف'}</Bouton>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {PAGES.map((p) => {
                          const oui = (editionServeur.pages || []).includes(p.cle)
                          return <button key={p.cle} onClick={() => modifierCompteServeur('pages', oui ? editionServeur.pages.filter((x) => x !== p.cle) : [...editionServeur.pages, p.cle])} style={{ cursor: 'pointer', padding: '3px 8px', borderRadius: 999, color: oui ? '#0b1220' : T.doux, background: oui ? p.teinte : 'rgba(148,163,184,.07)', border: '1px solid ' + T.ligne, fontSize: 11.5 }}>{p.nom}</button>
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: T.muet }}>
                        الاشتراك <input type="date" value={editionServeur.debut} onChange={(e) => modifierCompteServeur('debut', e.target.value)} style={{ padding: 5, borderRadius: 7 }} />
                        إلى <input type="date" value={editionServeur.fin} onChange={(e) => modifierCompteServeur('fin', e.target.value)} style={{ padding: 5, borderRadius: 7 }} />
                        <Bouton petit onClick={() => { modifierCompteServeur('debut', ''); modifierCompteServeur('fin', '') }}>بلا حد</Bouton>
                      </div>
                    </div>}
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(valeurEdition.pages || []).length === 0
                        ? <span style={{ fontSize: 11.5, color: T.muet }}>aucune page</span>
                        : (valeurEdition.pages || []).map((cle) => (
                          <span key={cle} style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: 11.5,
                            background: 'rgba(148,163,184,.12)', border: '1px solid ' + T.ligne, color: T.accentClair,
                          }}>{PAGE_PAR_CLE[cle] ? PAGE_PAR_CLE[cle].nom : cle}</span>
                        ))}
                    </div>
                    <div dir="ltr" style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid ' + T.ligne, fontSize: 12, color: T.doux }}>
                      <span style={{ color: estEnLigne ? T.bon : T.muet, fontWeight: 700 }}>{estEnLigne ? 'Connecté maintenant' : connexionAffichee ? 'Dernière connexion' : 'État de connexion'}</span>
                      {connexionAffichee ? <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginInlineStart: 9 }}>
                        <span>IP <code style={{ fontFamily: mono, color: T.accentClair }}>{connexionAffichee.ip || '—'}</code></span>
                        <span>Appareil : {appareil(connexionAffichee.ua)}</span>
                        {(connexionAffichee.pays || connexionAffichee.ville) && <span>{paysLisible(connexionAffichee.pays)}{connexionAffichee.ville ? ' · ' + connexionAffichee.ville : ''}</span>}
                        {connexionAffichee.t && <span style={{ color: T.muet }}>{heureGMT(connexionAffichee.t)}</span>}
                      </span> : <span style={{ marginInlineStart: 9, color: T.muet }}>
                        {sessionsActives === null ? 'Chargement de l’état de connexion…' : sessionsActives.configure === false ? 'Suivi des sessions non configuré sur le serveur' : 'Aucune activité récente ; ouvrez une page du site avec ce compte'}
                      </span>}
                    </div>
                  </div>
                })}
              </div>

              {envPret && (
                <div style={{ marginTop: 11 }}>
                  <div style={{ color: T.bon, fontSize: 12.5, fontWeight: 800 }}>Comptes enregistrés sur Vercel ; le redéploiement automatique a démarré.</div>
                  {deploiementComptes?.url && <a href={'https://' + deploiementComptes.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 7, color: T.accentClair }}>Ouvrir le déploiement</a>}
                </div>
              )}
            </Carte>

            <Carte
              titre="Les utilisateurs"
              sous={comptesBrouillon.length ? `${comptesBrouillon.length} · ${comptesBrouillon.filter((c) => c.actif).length} actif(s)` : 'aucun pour l\'instant'}
              teinte={T.accent}
              droite={<>
                <Bouton icone="bi-person-plus" onClick={ajouter} plein teinte={T.accent}>Ajouter</Bouton>
                {/* Enregistre la liste sécurisée sur Vercel et relance le site. */}
                <Bouton icone="bi-save" onClick={preparerEnv} plein teinte={T.bon} desactive={envEnCours}
                  titre="Enregistrer les comptes sur Vercel et lancer un redéploiement">
                  {envEnCours ? 'Déploiement…' : 'Enregistrer et déployer'}
                </Bouton>
                <Bouton icone="bi-download" onClick={() => telechargerJson('comptes.json', paquetComptes())}
                  titre="Le brouillon en clair — à garder pour toi, ne pas publier">Exporter</Bouton>
                <Bouton icone="bi-upload" onClick={() => fichier.current && fichier.current.click()}>Importer</Bouton>
                <input ref={fichier} type="file" accept=".json,application/json" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) importer(f); e.target.value = '' }} />
              </>}
            >
              {/* l'état des deux enregistrements : ici, et sur le serveur */}
              <div style={{
                display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
                padding: '8px 11px', borderRadius: 10, marginBottom: 11,
                background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.26)',
                fontSize: 12, color: T.doux,
              }}>
                <span style={{ color: T.bon, fontWeight: 800 }}>
                  <i className="bi bi-check2-circle" /> Brouillon enregistré ici
                </span>
                <span style={{ fontFamily: mono, fontSize: 11.5, color: T.muet }}>
                  {enregistreLe ? heureGMT(enregistreLe) : '—'}
                </span>
                <span style={{ color: T.muet }}>·</span>
                <span>
                  لكل حساب أزرار <b>تعديل</b> و<b>حفظ</b> و<b>حذف</b>.
                  Enregistrer ou supprimer met à jour Vercel et lance le redéploiement automatiquement.
                </span>
              </div>

              {/* ✅ le retour du bouton Enregistrer, TOUT EN HAUT de la carte */}
              {envPret && (
                <div ref={confirmRef} style={{
                  marginBottom: 12, padding: '11px 13px', borderRadius: 11,
                  background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.42)',
                }}>
                  <div style={{ fontSize: 13, color: T.bon, fontWeight: 800, marginBottom: 6 }}>
                    <i className="bi bi-check-circle" /> Comptes enregistrés sur Vercel ; le redéploiement automatique a démarré.
                  </div>
                  {deploiementComptes?.url && <a href={'https://' + deploiementComptes.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 7, color: T.accentClair }}>Suivre le déploiement <i className="bi bi-box-arrow-up-right" /></a>}
                </div>
              )}
              {comptesBrouillon.length > 3 && (
                <div style={{ marginBottom: 11 }}>
                  <Champ valeur={recherche} onChange={setRecherche} placeholder="Chercher un nom…" large />
                </div>
              )}

              {comptesBrouillon.length === 0 && (
                <div style={{ fontSize: 13, color: T.doux, padding: '6px 0', lineHeight: 1.7 }}>
                  Aucun compte dans le brouillon.{' '}
                  {duServeur && duServeur.length > 0 ? (
                    <>
                      Le serveur en a <b>{duServeur.length}</b> : reprends-les pour changer un mot de passe ou
                      une page, puis remplis le mot de passe à la main (le serveur ne le rend jamais)
                      et clique <b>Enregistrer</b>.
                      <div style={{ marginTop: 9 }}>
                        <Bouton icone="bi-download" plein teinte={T.accent} onClick={reprendreServeur}>
                          Reprendre les comptes du serveur
                        </Bouton>
                      </div>
                    </>
                  ) : (
                    <>
                      <b>Ajouter</b> crée une ligne vide : tu écris le nom, <b>ton</b> mot de passe,
                      tu choisis les pages et l’abonnement, puis tu cliques <b>Enregistrer</b>.
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gap: 10 }}>
                {comptesVus.map((c) => {
                  const inconnues = droitsInconnus(c)
                  const enEdition = editionId === c.id
                  return (
                    <div key={c.id} style={{
                      padding: '11px 13px', borderRadius: 12, background: 'rgba(2,6,15,.35)',
                      border: '1px solid ' + (c.actif ? T.ligne : 'rgba(248,113,113,.28)'),
                      opacity: c.actif ? 1 : .68,
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 9 }}>
                        <b style={{ fontSize: 13.5 }}>{c.nom || '(sans nom)'}</b>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Bouton petit icone="bi-pencil" onClick={() => commencerEdition(c)} desactive={envEnCours || duServeur === null || enEdition}>
                            تعديل
                          </Bouton>
                          <Bouton petit icone="bi-save" plein teinte={T.bon} onClick={() => enregistrerCompte(c)} desactive={envEnCours || !enEdition}>
                            {envEnCours ? 'جارٍ الحفظ…' : 'حفظ'}
                          </Bouton>
                          {enEdition && <Bouton petit icone="bi-x-lg" onClick={() => annulerEdition(c)} desactive={envEnCours}>Annuler</Bouton>}
                          <Bouton petit icone="bi-trash" teinte={T.mal} onClick={() => supprimer(c)} desactive={envEnCours} titre="Supprimer ce compte du site et de Vercel">
                            حذف
                          </Bouton>
                        </span>
                      </div>
                      {erreursCompte[c.id] && <div style={{ marginBottom: 8, color: T.mal, fontSize: 12.5 }}>{erreursCompte[c.id]}</div>}
                      <fieldset disabled={!enEdition || envEnCours} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, opacity: enEdition ? 1 : .82 }}>
                      {/* détails du compte : déverrouillés avec « Modifier » */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Champ valeur={c.nom} onChange={(v) => majCompte(c.id, 'nom', v)} placeholder="nom d'utilisateur" />

                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px 3px 10px',
                          borderRadius: 8, background: 'rgba(2,6,15,.55)',
                          border: '1px solid ' + ((c.motDePasse || '').length >= MIN_MDP ? T.ligne : 'rgba(251,191,36,.45)'),
                        }}>
                          {/* ⭐ MODIFIABLE : on tape son mot de passe, il n'est jamais imposé */}
                          <input
                            value={c.motDePasse || ''}
                            onChange={(e) => majCompte(c.id, 'motDePasse', e.target.value)}
                            type={vus.has(c.id) ? 'text' : 'password'}
                            autoComplete="new-password"
                            spellCheck={false}
                            placeholder="écris son mot de passe"
                            title={(c.motDePasse || '').length >= MIN_MDP ? 'modifiable' : MIN_MDP + ' caractères minimum'}
                            style={{
                              width: 168, padding: '4px 2px', border: 'none', outline: 'none',
                              background: 'transparent', fontFamily: mono, fontSize: 12.5, color: '#e2e8f0',
                              letterSpacing: vus.has(c.id) ? 0 : '.10em',
                            }}
                          />
                          <Bouton petit icone={vus.has(c.id) ? 'bi-eye-slash' : 'bi-eye'} titre="Afficher / cacher"
                            onClick={() => setVus((s) => {
                              const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n
                            })} />
                          <Bouton petit icone="bi-arrow-repeat" titre="Générer un mot de passe lisible (si tu n'en veux pas)"
                            onClick={() => majCompte(c.id, 'motDePasse', motDePasse())} />
                          <Bouton petit icone="bi-clipboard" titre="Copier"
                            onClick={() => copier(`${c.nom} / ${c.motDePasse}`)} />
                        </span>

                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Bouton petit icone={c.actif ? 'bi-check-circle' : 'bi-slash-circle'}
                            teinte={c.actif ? T.bon : T.mal} plein={c.actif}
                            onClick={() => majCompte(c.id, 'actif', !c.actif)}>
                            {c.actif ? 'actif' : 'suspendu'}
                          </Bouton>
                        </span>
                      </div>

                      {/* ligne 2 : les pages autorisées */}
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginTop: 9 }}>
                        <span style={{ fontSize: 11.5, color: T.muet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          Pages
                        </span>
                        {PAGES.map((p) => {
                          const oui = (c.pages || []).includes(p.cle)
                          return (
                            <button key={p.cle} onClick={() => basculerPage(c.id, p.cle)} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                              padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                              color: oui ? '#0b1220' : T.doux,
                              background: oui ? 'linear-gradient(135deg,' + p.teinte + ',' + p.teinte + 'b0)' : 'rgba(148,163,184,.07)',
                              border: '1px solid ' + (oui ? 'transparent' : T.ligne),
                            }}>
                              <i className={'bi ' + p.icone} /> {p.nom}
                            </button>
                          )
                        })}
                        <Bouton petit onClick={() => majCompte(c.id, 'pages', [])} titre="Retirer tous les droits">rien</Bouton>
                        <Bouton petit onClick={() => majCompte(c.id, 'pages', PAGES.filter((p) => !p.prive).map((p) => p.cle))}>
                          tout
                        </Bouton>
                        {inconnues.length > 0 && (
                          <span style={{ fontSize: 11.5, color: T.alerte }}>
                            <i className="bi bi-exclamation-triangle" /> page inconnue : {inconnues.join(', ')}
                          </span>
                        )}
                      </div>

                      {/* ligne 3 : ⭐ L'ABONNEMENT — début · fin (vide = sans limite) */}
                      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', marginTop: 9 }}>
                        <span style={{ fontSize: 11.5, color: T.muet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          Abonnement
                        </span>
                        <span style={{ fontSize: 12, color: T.muet }}>du</span>
                        <ChampDate valeur={c.debut} titre="Premier jour de l’abonnement (vide = pas de début)"
                          onChange={(v) => majCompte(c.id, 'debut', v)} />
                        <span style={{ fontSize: 12, color: T.muet }}>au</span>
                        <ChampDate valeur={c.fin} titre="Dernier jour INCLUS (vide = sans limite)"
                          onChange={(v) => majCompte(c.id, 'fin', v)} />
                        <PastilleAbonnement compte={c} />
                        <Bouton petit icone="bi-calendar-plus" titre="Fin = aujourd’hui + 30 jours"
                          onClick={() => majCompte(c.id, 'fin', dansNJours(30))}>+30 j</Bouton>
                        <Bouton petit icone="bi-calendar-plus" titre="Fin = aujourd’hui + 365 jours"
                          onClick={() => majCompte(c.id, 'fin', dansNJours(365))}>+1 an</Bouton>
                        <Bouton petit icone="bi-infinity" titre="Effacer les deux dates : accès sans limite"
                          onClick={() => { majCompte(c.id, 'debut', ''); majCompte(c.id, 'fin', '') }}>sans limite</Bouton>
                        <span style={{ fontSize: 11.5, color: T.muet }}>
                          (aujourd’hui {dateLisible(aujourdhuiGMT())} GMT · la fin est <b>incluse</b>)
                        </span>
                      </div>
                      </fieldset>
                    </div>
                  )
                })}
              </div>
            </Carte>
          </>
        )}

        {/* ═════════════════════════════ ② PAGES ═════════════════════════════ */}
        {onglet === 'pages' && (
          <Carte titre="Les pages du site" sous="le catalogue et les droits" teinte={T.accent}>
            <div style={{ fontSize: 12.5, color: T.doux, marginBottom: 12 }}>
              C'est la même liste que dans le bandeau, plus les pages qu'on n'y met pas.
              La colonne <b>qui</b> se remplit depuis les comptes du serveur (<code style={{ fontFamily: mono }}>ADMIN_COMPTES</code>)
              — c'est ce que le login lit vraiment.
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ color: T.muet, textAlign: 'left' }}>
                    {['Page', 'Adresse', 'Bandeau', 'Qui y a accès', ''].map((h) => (
                      <th key={h} style={{ padding: '7px 9px', borderBottom: '1px solid ' + T.ligne, fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PAGES.map((p) => {
                    const source = (duServeur && duServeur.length ? duServeur : comptes)
                    const ayant = source.filter((c) => (c.pages || []).includes(p.cle))
                    return (
                      <tr key={p.cle}>
                        <td style={{ padding: '8px 9px', borderBottom: '1px solid ' + T.ligne }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 9, height: 9, borderRadius: 3, background: p.teinte, boxShadow: '0 0 9px ' + p.teinte }} />
                            <i className={'bi ' + p.icone} style={{ color: p.teinte }} /> <b>{p.nom}</b>
                            {p.prive && <span style={{ fontSize: 11, color: T.muet }}>· privée</span>}
                          </span>
                        </td>
                        <td style={{ padding: '8px 9px', borderBottom: '1px solid ' + T.ligne, fontFamily: mono, color: T.doux }}>
                          {p.route}
                        </td>
                        <td style={{ padding: '8px 9px', borderBottom: '1px solid ' + T.ligne }}>
                          {p.bandeau ? <Pastille ok>oui</Pastille> : <span style={{ color: T.muet }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 9px', borderBottom: '1px solid ' + T.ligne }}>
                          {ayant.length === 0
                            ? <span style={{ color: T.muet }}>personne</span>
                            : ayant.map((c) => (
                              <span key={c.nom || c.id} style={{
                                display: 'inline-block', marginRight: 6, padding: '2px 8px', borderRadius: 999,
                                fontSize: 11.5, background: 'rgba(148,163,184,.12)', border: '1px solid ' + T.ligne,
                                color: c.actif ? T.accentClair : T.muet,
                              }}>{c.nom || '(sans nom)'}{!c.actif && ' ·'}</span>
                            ))}
                        </td>
                        <td style={{ padding: '8px 9px', borderBottom: '1px solid ' + T.ligne, textAlign: 'right' }}>
                          <Link to={p.route.replace('/r/:slug', '')} style={{ color: T.accentClair, fontSize: 12 }}>
                            ouvrir <i className="bi bi-box-arrow-up-right" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Carte>
        )}

        {/* ═══════════════════════════ ③ VISITEURS ═══════════════════════════ */}
        {onglet === 'visiteurs' && (
          <>
            <Carte
              titre="Voir qui vient — et d'où"
              sous="adresses IP"
              teinte={T.alerte}
              droite={<>
                <Bouton icone="bi-arrow-clockwise" onClick={() => chargerJournal(jeton)} desactive={charge}>
                  {charge ? 'lecture…' : 'Rafraîchir'}
                </Bouton>
                <Bouton icone="bi-send" onClick={async () => { await visiteDeTest(); setTimeout(() => chargerJournal(jeton), 800) }}
                  titre="Écrire une visite marquée « test » dans le journal">
                  Test
                </Bouton>
              </>}
            >
              {/* le jeton : FACULTATIF depuis le 26/10 — la session suffit */}
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 11.5, color: T.muet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Jeton du journal
                </span>
                <Champ valeur={jeton} onChange={(v) => { setJeton(v); ecrireJeton(v) }} placeholder="facultatif — ta session suffit" large={false} mono type="password" />
                <span style={{ fontSize: 11.5, color: T.muet }}>
                  <i className="bi bi-info-circle" /> depuis le 26/10, ta <b>session</b> ouvre le journal :
                  le jeton ne sert plus qu'à <code style={{ fontFamily: mono }}>curl</code>
                </span>
              </div>

              {erreurJournal && (
                <div style={{ fontSize: 12.5, color: T.mal, marginBottom: 10 }}>
                  <i className="bi bi-exclamation-octagon" /> {erreurJournal}
                </div>
              )}

              {/* ── pas encore branché : le mode d'emploi exact ── */}
              {(!journal || !journal.configure) && (
                <div style={{ fontSize: 13, lineHeight: 1.7, color: T.doux }}>
                  <p style={{ margin: '0 0 10px' }}>
                    <b style={{ color: T.alerte }}>La base n'est pas encore branchée.</b> Le compteur de visites
                    Vercel (gratuit, sans cookie) fonctionne déjà : il donne les <b>vues</b>, les <b>visiteurs
                    uniques</b>, le <b>pays</b> et l'<b>appareil</b>. Pour voir les <b>adresses IP</b> et
                    <b> qui est connecté</b>, il faut une petite base — deux étapes, une seule fois :
                  </p>
                  <ol style={{ margin: '0 0 12px', paddingLeft: 20 }}>
                    <li>Sur <code style={{ fontFamily: mono }}>vercel.com</code> → projet <b>bahja-turf</b> → <b>Storage</b> → créer un <b>Redis</b> (offre gratuite).</li>
                    <li>Le relier au projet : Vercel pose tout seul <code style={{ fontFamily: mono }}>KV_REST_API_URL</code> et <code style={{ fontFamily: mono }}>KV_REST_API_TOKEN</code>, puis <b>redéployer</b>.</li>
                  </ol>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: T.muet }}>
                    ⭐ <code style={{ fontFamily: mono }}>ADMIN_JETON</code> n'est <b>plus nécessaire</b> : ta
                    session de la console ouvre le journal. La variable reste acceptée si tu veux lire
                    le journal par <code style={{ fontFamily: mono }}>curl</code>.
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: T.muet }}>
                    ⚠ Une IP est une donnée personnelle (RGPD) : le journal garde les 2000 dernières visites,
                    rien de plus, et ne sert qu'ici. Prévoir une durée de conservation et une mention sur le site.
                  </p>
                </div>
              )}

              {/* ── le journal ── */}
              {journal && journal.configure && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 13 }}>
                    {[
                      { t: 'Visites', v: journal.total, i: 'bi-eye', c: T.accent },
                      { t: "Aujourd'hui", v: journal.aujourdhui, i: 'bi-calendar-day', c: T.bon },
                      { t: 'Adresses IP', v: journal.ipDistinctes, i: 'bi-person-badge', c: T.alerte },
                      { t: 'Comptes vus', v: journal.comptesDistincts || 0, i: 'bi-person-check', c: '#a78bfa' },
                      { t: 'Pays', v: journal.paysDistincts, i: 'bi-globe2', c: '#38bdf8' },
                    ].map((k) => (
                      <div key={k.t} style={{
                        padding: '10px 12px', borderRadius: 12, background: 'rgba(2,6,15,.42)', border: '1px solid ' + T.ligne,
                      }}>
                        <div style={{ fontSize: 11.5, color: T.muet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          <i className={'bi ' + k.i} style={{ color: k.c }} /> {k.t}
                        </div>
                        <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 800, marginTop: 3, color: k.c }}>{k.v}</div>
                      </div>
                    ))}
                  </div>

                  {journal.erreur && <div style={{ fontSize: 12.5, color: T.mal, marginBottom: 9 }}>{journal.erreur}</div>}

                  {(!journal.visites || journal.visites.length === 0) ? (
                    <div style={{ fontSize: 13, color: T.doux }}>
                      Aucune visite enregistrée pour l'instant. Le journal se remplit au prochain passage —
                      le bouton <b>Test</b> écrit une ligne tout de suite.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', maxHeight: 520 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ color: T.muet, textAlign: 'left', position: 'sticky', top: 0, background: '#0a101c' }}>
                            {['Quand', 'Adresse IP', 'Compte', 'Pays', 'Page', 'Appareil', 'Venu de'].map((h) => (
                              <th key={h} style={{ padding: '7px 9px', borderBottom: '1px solid ' + T.ligne, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {journal.visites.map((v, i) => (
                            <tr key={i} style={{ background: i % 2 ? 'rgba(148,163,184,.03)' : 'transparent' }}>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, color: T.doux, whiteSpace: 'nowrap' }}>
                                {heureGMT(v.t)} <span style={{ color: T.muet }}>· {ilYA(v.t)}</span>
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, fontFamily: mono, color: '#e2e8f0' }}>
                                {v.ip || '—'}
                                {v.test && <span style={{ marginLeft: 7, color: T.muet, fontSize: 11 }}>· test</span>}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, whiteSpace: 'nowrap' }}>
                                {v.qui
                                  ? <span style={{ color: '#a78bfa', fontWeight: 700 }}><i className="bi bi-person-check" /> {v.qui}</span>
                                  : <span style={{ color: T.muet }}>anonyme</span>}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, whiteSpace: 'nowrap' }}>
                                {paysLisible(v.pays)}{v.ville ? <span style={{ color: T.muet }}> · {v.ville}</span> : null}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, fontFamily: mono }}>
                                {v.p || '/'}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, color: T.doux }}>
                                {appareil(v.ua)}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, color: T.muet, maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {v.ref || 'direct'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </Carte>

            {/* ═══════════════ LE JOURNAL DES CONNEXIONS (26/10/2026) ═══════════════ */}
            <Carte
              titre="Les connexions"
              sous="qui entre · avec quel appareil · depuis quelle IP"
              teinte="#a78bfa"
              droite={
                <Bouton icone="bi-arrow-clockwise" onClick={() => chargerConnexions(jeton)} desactive={chargeCx}>
                  {chargeCx ? 'lecture…' : 'Rafraîchir'}
                </Bouton>
              }
            >
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: T.doux, marginBottom: 11 }}>
                Une ligne par <b>tentative de connexion</b> — réussie ou refusée. C'est le journal qui répond à
                « pourquoi <b>0677889900</b> n'arrive pas à entrer ? » : on voit le nom, l'heure, l'appareil et
                l'IP. Le mot de passe, lui, n'est <b>jamais</b> écrit (ni en clair, ni haché).
              </div>

              {erreurCx && (
                <div style={{ fontSize: 12.5, color: T.mal, marginBottom: 10 }}>
                  <i className="bi bi-exclamation-octagon" /> {erreurCx}
                </div>
              )}

              {(!connexions || !connexions.configure) && !erreurCx && (
                <div style={{ fontSize: 12.5, color: T.muet }}>
                  Rien à lire pour l'instant : la base n'est pas branchée (voir le mode d'emploi ci-dessus).
                  Dès qu'un Redis est relié au projet, chaque connexion s'écrit ici toute seule.
                </div>
              )}

              {connexions && connexions.configure && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 13 }}>
                    {[
                      { t: 'Tentatives', v: connexions.total, i: 'bi-box-arrow-in-right', c: '#a78bfa' },
                      { t: "Aujourd'hui", v: connexions.aujourdhui, i: 'bi-calendar-day', c: T.bon },
                      { t: 'Refus', v: connexions.refus, i: 'bi-shield-x', c: T.mal },
                      { t: 'Comptes', v: connexions.comptesDistincts, i: 'bi-people', c: T.accentClair },
                      { t: 'Adresses IP', v: connexions.ipDistinctes, i: 'bi-person-badge', c: T.alerte },
                    ].map((k) => (
                      <div key={k.t} style={{
                        padding: '10px 12px', borderRadius: 12, background: 'rgba(2,6,15,.42)', border: '1px solid ' + T.ligne,
                      }}>
                        <div style={{ fontSize: 11.5, color: T.muet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          <i className={'bi ' + k.i} style={{ color: k.c }} /> {k.t}
                        </div>
                        <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 800, marginTop: 3, color: k.c }}>{k.v}</div>
                      </div>
                    ))}
                  </div>

                  {connexions.erreur && <div style={{ fontSize: 12.5, color: T.mal, marginBottom: 9 }}>{connexions.erreur}</div>}

                  {(!connexions.connexions || connexions.connexions.length === 0) ? (
                    <div style={{ fontSize: 13, color: T.doux }}>
                      Aucune connexion enregistrée. Déconnecte-toi puis reconnecte-toi : la ligne apparaît
                      immédiatement.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', maxHeight: 460 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ color: T.muet, textAlign: 'left', position: 'sticky', top: 0, background: '#0a101c' }}>
                            {['Quand', 'Compte', 'Résultat', 'Adresse IP', 'Appareil', 'Pays'].map((h) => (
                              <th key={h} style={{ padding: '7px 9px', borderBottom: '1px solid ' + T.ligne, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {connexions.connexions.map((c, i) => (
                            <tr key={i} style={{ background: i % 2 ? 'rgba(148,163,184,.03)' : 'transparent' }}>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, color: T.doux, whiteSpace: 'nowrap' }}>
                                {heureGMT(c.t)} <span style={{ color: T.muet }}>· {ilYA(c.t)}</span>
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, fontWeight: 700, color: c.nom ? '#e2e8f0' : T.muet }}>
                                {c.nom || '(sans nom)'}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, whiteSpace: 'nowrap' }}>
                                {c.ok
                                  ? <span style={{ color: T.bon, fontWeight: 700 }}><i className="bi bi-check-circle" /> entré</span>
                                  : <span style={{ color: T.mal }}><i className="bi bi-x-circle" /> {verdictConnexion(c)}</span>}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, fontFamily: mono, color: '#e2e8f0' }}>
                                {c.ip || '—'}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, color: T.doux, whiteSpace: 'nowrap' }}>
                                {appareil(c.ua)}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, whiteSpace: 'nowrap' }}>
                                {paysLisible(c.pays)}{c.ville ? <span style={{ color: T.muet }}> · {c.ville}</span> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ marginTop: 11, fontSize: 12, lineHeight: 1.75, color: T.muet }}>
                    <b style={{ color: T.doux }}>Lire le verdict :</b>{' '}
                    « <b>mot de passe</b> » = le nom existe mais le mot de passe est faux ·
                    « <b>inconnu</b> » = ce nom n'est <b>pas dans</b> <code style={{ fontFamily: mono }}>ADMIN_COMPTES</code>
                    (il faut déployer la valeur depuis l'onglet Utilisateurs) ·
                    « <b>abonnement …</b> » = bon mot de passe, dates dépassées.
                  </div>
                </>
              )}
            </Carte>

            <Carte titre="Le compteur Vercel" sous="gratuit · sans cookie" teinte="#38bdf8">
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: T.doux }}>
                À ne pas confondre avec le journal ci-dessus : Vercel compte <b>des visites</b>{' '}
                (vues par page, visiteurs uniques, « en direct », pays, appareil, site référent) — c'est ce qui
                se lit <i>avant</i> le branchement d'une base, et <b>sans aucune adresse IP</b>.
                <div style={{ marginTop: 8 }}>
                  ⚠ Il doit être <b>activé une fois</b> : <code style={{ fontFamily: mono }}>vercel.com</code> → projet
                  <b> bahja-turf</b> → onglet <b>Analytics</b> → <b>Enable</b>.
                </div>
              </div>
            </Carte>

            <Carte titre="Ce que le login protège — et ce qu'il ne protège pas" teinte={T.accent}>
              <div style={{ fontSize: 12.5, color: T.doux, lineHeight: 1.7 }}>
                Depuis le <b>26/10/2026</b>, le login ne protège plus seulement cette console :{' '}
                <b>toutes les pages</b> passent par la porte (<code style={{ fontFamily: mono }}>src/Portail.jsx</code>).
                Sans session valide, c'est le formulaire de connexion qui s'affiche <b>à la même adresse</b> ;
                et un compte ne voit que les pages de son abonnement (<code style={{ fontFamily: mono }}>pages[]</code>).
                <div style={{ marginTop: 8 }}>
                  Les pages, fichiers de données et relais du site exigent aussi une session valide ;
                  un visiteur sans connexion ne peut pas les appeler directement.
                </div>
                <div style={{ marginTop: 8 }}>
                  Le journal des visiteurs et celui des connexions, eux, s'ouvrent avec <b>ta session</b>
                  {' '}(ou <code style={{ fontFamily: mono }}>ADMIN_JETON</code> pour <code style={{ fontFamily: mono }}>curl</code>).
                </div>
                <div style={{ marginTop: 8, fontSize: 11.5, color: T.muet }}>
                  Le cookie est <b>HttpOnly</b> et signé (HMAC-SHA256) : la page ne peut ni le lire ni le fabriquer.
                  Sans <code style={{ fontFamily: mono }}>ADMIN_SECRET</code>, le serveur refuse de signer — donc de connecter.
                </div>
              </div>
            </Carte>
          </>
        )}

      </div>
    </div>
  )
}
