import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import Entete from '../../src/Entete.jsx'
import {
  PAGES, PAGE_PAR_CLE, CLE_ACCES,
  lireCle, ecrireCle, oublierCle,
  lireComptes, ecrireComptes, nouveauCompte, motDePasse, droitsInconnus,
  lireReglages, ecrireReglages,
  lireJeton, ecrireJeton,
  lireVisites, visiteDeTest,
  telechargerJson, lireFichierJson, paquetComptes,
  appareil, paysLisible, ilYA,
} from '../../backend/ADMIN/donnees.js'

/* ══════════════════════════════════════════════════════════════════════════
 *  frontend/ADMIN/Admin.jsx — LA CONSOLE D'ADMINISTRATION (18/10/2026)
 *
 *  ⭐ ELLE N'EXISTE PAS POUR LES VISITEURS. Trois règles, tenues ensemble :
 *
 *   ① AUCUN LIEN : la console n'est pas dans le bandeau (src/Entete.jsx ne la
 *      connaît pas) et aucune page ne pointe vers elle.
 *   ② SANS CLÉ, ON NE LA VOIT PAS : /admin sans clé — dans l'URL ou déjà
 *      mémorisée dans ce navigateur — renvoie à l'accueil. Un visiteur qui
 *      tape l'adresse par hasard voit exactement ce que voit celui qui tape
 *      n'importe quelle adresse inconnue : la page d'accueil.
 *   ③ LA PREMIÈRE FOIS SE FAIT PAR L'ADRESSE : /admin?cle=<ta clé> l'adopte
 *      (6 caractères minimum) et la mémorise. Ensuite /admin suffit.
 *      ⚠ La clé est retirée de l'URL aussitôt : elle ne part pas dans un
 *      partage de lien ni dans l'historique.
 *
 *  ⚠ CE N'EST PAS DE LA SÉCURITÉ. Les comptes vivent dans CE navigateur
 *    (localStorage) : un visiteur qui ouvrirait la console n'y verrait que
 *    ses propres comptes vides. Le vrai login viendra plus tard — cette page
 *    en prépare les comptes et les droits.
 *
 *  TROIS ONGLETS
 *    Utilisateurs : qui entre, avec quel mot de passe, et QUELLES PAGES.
 *    Pages        : le catalogue du site, et qui a le droit d'y aller.
 *    Visiteurs    : le journal (IP, pays, page, appareil) + la mesure Vercel.
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

/* ══════════════════════════════════════════════════════ LA PAGE ═══════════ */

export default function Admin() {
  /* ── ① LA PORTE ──────────────────────────────────────────────────────────
   * On décide AVANT de rendre quoi que ce soit : pas de clé → accueil.
   * Le `?cle=` est traité une fois, puis retiré de l'URL.                    */
  const [pret, setPret] = useState(false)
  const [ouvert, setOuvert] = useState(false)

  useEffect(() => {
    let cle = lireCle()
    try {
      const url = new URLSearchParams(window.location.search)
      const demandee = (url.get('cle') || '').trim()
      if (demandee.length >= 6) {
        if (!cle) { ecrireCle(demandee); cle = demandee }
        if (cle === demandee) window.history.replaceState({}, '', '/admin')
      }
    } catch { /* pas d'URL lisible : on se rabat sur la clé mémorisée */ }
    setOuvert(!!cle)
    setPret(true)
  }, [])

  const [onglet, setOnglet] = useState('utilisateurs')

  /* ── ② LES COMPTES (dans ce navigateur) ─────────────────────────────────── */
  const [comptes, setComptes] = useState(() => lireComptes())
  const [vus, setVus] = useState(() => new Set())     // mots de passe affichés
  const [recherche, setRecherche] = useState('')
  const fichier = useRef(null)

  useEffect(() => { ecrireComptes(comptes) }, [comptes])

  const reglages = useMemo(() => lireReglages(), [])
  const [login, setLogin] = useState(reglages.login)
  useEffect(() => { ecrireReglages({ ...lireReglages(), login }) }, [login])

  const majCompte = (id, champ, valeur) =>
    setComptes((l) => l.map((c) => (c.id === id ? { ...c, [champ]: valeur } : c)))

  const basculerPage = (id, cle) =>
    setComptes((l) => l.map((c) => {
      if (c.id !== id) return c
      const pages = c.pages || []
      return { ...c, pages: pages.includes(cle) ? pages.filter((p) => p !== cle) : [...pages, cle] }
    }))

  const ajouter = () => {
    const c = nouveauCompte('utilisateur' + (comptes.length + 1))
    setComptes((l) => [...l, c])
    setVus((s) => new Set([...s, c.id]))   // on montre le mot de passe créé
  }

  const supprimer = (id) => setComptes((l) => l.filter((c) => c.id !== id))

  const copier = async (texte) => {
    try { await navigator.clipboard.writeText(texte) } catch { /* silencieux */ }
  }

  const comptesVus = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return q ? comptes.filter((c) => (c.nom || '').toLowerCase().includes(q)) : comptes
  }, [comptes, recherche])

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

  const chargerJournal = async (leJeton = jeton) => {
    setCharge(true); setErreurJournal('')
    try {
      const j = await lireVisites(leJeton)
      setJournal(j)
    } catch (e) {
      setJournal(null); setErreurJournal(e.message || 'journal illisible')
    } finally { setCharge(false) }
  }

  /* le journal se relit tout seul tant que l'onglet est ouvert (1 min) */
  useEffect(() => {
    if (onglet !== 'visiteurs') return undefined
    chargerJournal(jeton)
    const t = setInterval(() => chargerJournal(jeton), 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet, jeton])

  /* ── l'attente de la porte : un demi-tour silencieux ─────────────────────── */
  if (!pret) return <div style={{ minHeight: '100vh', background: '#04070f' }} />
  if (!ouvert) return <Navigate to="/" replace />

  const verrouiller = () => { oublierCle(); setOuvert(false) }

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
            <Pastille ok={comptes.length > 0}>{comptes.length} compte{comptes.length > 1 ? 's' : ''}</Pastille>
            <Pastille ok={journal && journal.configure}>{journal && journal.configure ? (journal.total + ' visites') : 'journal à brancher'}</Pastille>
            <Bouton icone="bi-box-arrow-right" onClick={verrouiller} titre="Oublier la clé sur ce navigateur">Verrouiller</Bouton>
          </div>
        </div>

        {/* ══════════ LES ONGLETS ══════════ */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <Onglet actif={onglet === 'utilisateurs'} onClick={() => setOnglet('utilisateurs')}
            icone="bi-people" libelle="Utilisateurs" compte={comptes.length} />
          <Onglet actif={onglet === 'pages'} onClick={() => setOnglet('pages')}
            icone="bi-grid-3x3-gap" libelle="Pages" compte={PAGES.length} />
          <Onglet actif={onglet === 'visiteurs'} onClick={() => setOnglet('visiteurs')}
            icone="bi-graph-up" libelle="Visiteurs" />
        </div>

        {/* ═══════════════════════════ ① UTILISATEURS ═══════════════════════ */}
        {onglet === 'utilisateurs' && (
          <>
            <Carte
              titre="Le vrai login viendra plus tard"
              sous="préparation"
              teinte={T.alerte}
            >
              <div style={{ fontSize: 12.5, lineHeight: 1.65, color: T.doux }}>
                Les comptes ci-dessous vivent <b>dans ce navigateur</b> et ne bloquent <b>rien</b> pour l'instant :
                le site reste ouvert à tous. Le jour où tu voudras l'entrée par login, on pose ces comptes
                derrière le serveur — le fichier <code style={{ fontFamily: mono }}>comptes.json</code> exporté ici
                contient déjà tout ce qu'il faut.
                <div style={{ marginTop: 9, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Bouton
                    icone={login ? 'bi-toggle-on' : 'bi-toggle-off'}
                    onClick={() => setLogin((v) => !v)}
                    plein={login} teinte={T.alerte}
                    titre="Un projet, pas encore une bascule"
                  >
                    Entrée par login : {login ? 'prévue' : 'non prévue'}
                  </Bouton>
                  <span style={{ fontSize: 12, color: T.muet }}>
                    (ce bouton ne filtre rien — il note ton intention)
                  </span>
                </div>
              </div>
            </Carte>

            <Carte
              titre="Les utilisateurs"
              sous={comptes.length ? `${comptes.length} · ${comptes.filter((c) => c.actif).length} actif(s)` : 'aucun pour l\'instant'}
              teinte={T.accent}
              droite={<>
                <Bouton icone="bi-person-plus" onClick={ajouter} plein teinte={T.accent}>Ajouter</Bouton>
                <Bouton icone="bi-download" onClick={() => telechargerJson('comptes.json', paquetComptes())}
                  titre="Le fichier que le serveur lira le jour du login">Exporter</Bouton>
                <Bouton icone="bi-upload" onClick={() => fichier.current && fichier.current.click()}>Importer</Bouton>
                <input ref={fichier} type="file" accept=".json,application/json" style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) importer(f); e.target.value = '' }} />
              </>}
            >
              {comptes.length > 3 && (
                <div style={{ marginBottom: 11 }}>
                  <Champ valeur={recherche} onChange={setRecherche} placeholder="Chercher un nom…" large />
                </div>
              )}

              {comptes.length === 0 && (
                <div style={{ fontSize: 13, color: T.doux, padding: '6px 0' }}>
                  Aucun compte. <b>Ajouter</b> crée un utilisateur avec un mot de passe déjà rempli —
                  tu n'auras qu'à choisir ses pages.
                </div>
              )}

              <div style={{ display: 'grid', gap: 10 }}>
                {comptesVus.map((c) => {
                  const inconnues = droitsInconnus(c)
                  return (
                    <div key={c.id} style={{
                      padding: '11px 13px', borderRadius: 12, background: 'rgba(2,6,15,.35)',
                      border: '1px solid ' + (c.actif ? T.ligne : 'rgba(248,113,113,.28)'),
                      opacity: c.actif ? 1 : .68,
                    }}>
                      {/* ligne 1 : nom · mot de passe · actif · supprimer */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Champ valeur={c.nom} onChange={(v) => majCompte(c.id, 'nom', v)} placeholder="nom d'utilisateur" />

                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px 3px 10px',
                          borderRadius: 8, background: 'rgba(2,6,15,.55)', border: '1px solid ' + T.ligne,
                        }}>
                          <span style={{ fontFamily: mono, fontSize: 12.5, letterSpacing: vus.has(c.id) ? 0 : '.16em' }}>
                            {vus.has(c.id) ? c.motDePasse : '••••••••••'}
                          </span>
                          <Bouton petit icone={vus.has(c.id) ? 'bi-eye-slash' : 'bi-eye'} titre="Afficher / cacher"
                            onClick={() => setVus((s) => {
                              const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n
                            })} />
                          <Bouton petit icone="bi-arrow-repeat" titre="Nouveau mot de passe"
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
                          <Bouton petit icone="bi-trash" teinte={T.mal} onClick={() => supprimer(c.id)} titre="Supprimer" />
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
              La colonne <b>qui</b> se remplit depuis les comptes de l'onglet Utilisateurs.
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
                    const ayant = comptes.filter((c) => (c.pages || []).includes(p.cle))
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
                              <span key={c.id} style={{
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
                <Bouton icone="bi-arrow-clockwise" onClick={() => chargerJournal(jeton)} desactive={charge || !jeton}>
                  {charge ? 'lecture…' : 'Rafraîchir'}
                </Bouton>
                <Bouton icone="bi-send" onClick={async () => { await visiteDeTest(); setTimeout(() => chargerJournal(jeton), 800) }}
                  desactive={!jeton} titre="Écrire une visite marquée « test » dans le journal">
                  Test
                </Bouton>
              </>}
            >
              {/* le jeton : c'est LUI qui ouvre le journal côté serveur */}
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 11.5, color: T.muet, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Jeton du journal
                </span>
                <Champ valeur={jeton} onChange={(v) => { setJeton(v); ecrireJeton(v) }} placeholder="le mot de passe posé dans ADMIN_JETON" large={false} mono type="password" />
                <span style={{ fontSize: 11.5, color: T.muet }}>
                  (le même que la variable <code style={{ fontFamily: mono }}>ADMIN_JETON</code> sur Vercel — gardé dans ce navigateur)
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
                    uniques</b>, le <b>pays</b> et l'<b>appareil</b>. Pour voir les <b>adresses IP</b>, il faut une
                    petite base — trois étapes, une seule fois :
                  </p>
                  <ol style={{ margin: '0 0 12px', paddingLeft: 20 }}>
                    <li>Sur <code style={{ fontFamily: mono }}>vercel.com</code> → projet <b>bahja-turf</b> → <b>Storage</b> → créer un <b>Redis</b> (offre gratuite).</li>
                    <li>Le relier au projet : Vercel pose tout seul <code style={{ fontFamily: mono }}>KV_REST_API_URL</code> et <code style={{ fontFamily: mono }}>KV_REST_API_TOKEN</code>.</li>
                    <li>Ajouter la variable <code style={{ fontFamily: mono }}>ADMIN_JETON</code> = un mot de passe de ton choix, puis <b>redéployer</b>.</li>
                  </ol>
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
                            {['Quand', 'Adresse IP', 'Pays', 'Page', 'Appareil', 'Venu de'].map((h) => (
                              <th key={h} style={{ padding: '7px 9px', borderBottom: '1px solid ' + T.ligne, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {journal.visites.map((v, i) => (
                            <tr key={i} style={{ background: i % 2 ? 'rgba(148,163,184,.03)' : 'transparent' }}>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, color: T.doux, whiteSpace: 'nowrap' }}>
                                {ilYA(v.t)}
                              </td>
                              <td style={{ padding: '6px 9px', borderBottom: '1px solid ' + T.ligne, fontFamily: mono, color: '#e2e8f0' }}>
                                {v.ip || '—'}
                                {v.test && <span style={{ marginLeft: 7, color: T.muet, fontSize: 11 }}>· test</span>}
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

            <Carte titre="La clé de cette console" teinte={T.accent}>
              <div style={{ fontSize: 12.5, color: T.doux, lineHeight: 1.7 }}>
                Elle ne protège que l'<b>affichage</b> de cette page : sans clé, <code style={{ fontFamily: mono }}>/admin</code> renvoie
                à l'accueil comme n'importe quelle adresse inconnue — un visiteur ne peut même pas deviner que la
                console existe.
                <div style={{ marginTop: 9, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Champ valeur={lireCle()} onChange={() => {}} petit mono
                    placeholder="clé actuelle" />
                  <Bouton icone="bi-arrow-repeat" onClick={() => {
                    const v = window.prompt('Nouvelle clé (6 caractères minimum) — elle remplace l\'ancienne sur ce navigateur.\n\nPour la retrouver plus tard sur un autre appareil, garde l\'adresse /admin?cle=…', '')
                    if (v && v.trim().length >= 6) { ecrireCle(v.trim()); window.alert('Nouvelle clé posée. Note-la : /admin?cle=' + v.trim()) }
                    else if (v !== null) window.alert('Trop courte : 6 caractères minimum.')
                  }}>Changer la clé</Bouton>
                  <Bouton icone="bi-box-arrow-right" teinte={T.mal} onClick={verrouiller}>Verrouiller maintenant</Bouton>
                </div>
                <div style={{ marginTop: 7, fontSize: 11.5, color: T.muet }}>
                  (le champ ci-dessus est en lecture seule : il montre la clé de ce navigateur)
                </div>
              </div>
            </Carte>
          </>
        )}

      </div>
    </div>
  )
}
