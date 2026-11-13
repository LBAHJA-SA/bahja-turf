import { Link } from 'react-router-dom'
import { useAcces, aDroit, deconnecter } from './lib/acces.js'
import { useLang, LangToggle } from './lib/langue.jsx'

/* ══════════════════════════════════════════════════════════════════════════
 *  src/Entete.jsx — LE BANDEAU COMMUN (18/10/2026)
 *
 *  La navigation appartient à l'application, pas à une page : elle vit donc
 *  dans src/, à côté de App.jsx, et chaque page l'affiche en une ligne :
 *
 *      <Entete page="analyse" />      // la page courante s'allume
 *      <Entete page="quinte" />
 *      <Entete page="couple" />
 *      <Entete page="article" />
 *
 *  Chaque lien a SA couleur (voir .p-analyse / .p-quinte / .p-couple dans
 *  src/index.css) : on reconnaît la page à sa lumière, pas à un texte.
 *
 *  La page « Programme » a été supprimée le 18/10/2026 : la page d'accueil
 *  (/) est désormais « Analyse course ». L'ancien nom « Chevaux » disparaît.
 * ══════════════════════════════════════════════════════════════════════════ */

const LIENS = [
  { cle: 'analyse', to: '/', libelleKey: 'nav_analyse', libelle: 'Analyse course', icone: 'bi-clipboard2-pulse' },
  { cle: 'quinte', to: '/quinte', libelleKey: 'nav_quinte', libelle: 'Quinté', icone: 'bi-trophy' },
  /* 13/11/2026 — GENERATEUR BAHJA TURF : le générateur de Bahja TURF,
   *   son propre onglet, sa propre lumière (l'or du logo). */
  { cle: 'generateur', droit: 'analyse', to: '/generateur-bahja-turf', libelleKey: 'nav_generateur', libelle: 'GENERATEUR BAHJA TURF', icone: 'bi-magic' },
  { cle: 'presse', to: '/presse', libelleKey: 'nav_presse', libelle: 'Presse', icone: 'bi-newspaper' },
  { cle: 'lives', to: '/lives', libelleKey: 'nav_lives', libelle: 'Lives', icone: 'bi-broadcast' },
  /* 23/10/2026 — le moteur DNA COURSE, comme les autres pages.
   * La page ne cadre plus une application à part : c'est `frontend/DNA/`, elle
   * prend le programme et les partants du site (backend/DNA/donnees.js) et
   * envoie les chevaux au moteur par `/api/dna` — le même relais en local et en
   * ligne, comme `/api/tf` pour turf-france. Elle s'affiche donc partout. */
  { cle: 'dna', to: '/dna', libelleKey: 'nav_dna', libelle: 'DNA COURSE', icone: 'bi-cpu' },
  /* 24/10/2026 — LES RÉSULTATS ET LES RAPPORTS. La page ne montre que les
   * courses terminées : l'arrivée des 5 premiers et ce que paie chaque pari. */
  { cle: 'resultats', to: '/resultats', libelleKey: 'nav_resultats', libelle: 'Resultats', icone: 'bi-list-ol' },
]

export default function Entete({ page }) {
  const acces = useAcces()
  const { t } = useLang()
  /* ⭐ 25/10/2026 — ON NE MONTRE QUE CE QUI S'OUVRE.
   * Un compte limité à `presse` + `quinte` ne voit pas de lien vers DNA :
   * cliquer dessus le mènerait à un refus. Le propriétaire (`admin` dans ses
   * pages) voit tout. Tant que la session n'est pas connue, on montre tout :
   * la porte s'occupe du reste. */
  const connecte = acces.pret && acces.connecte
  const liens = LIENS
    .filter((l) => !l.dev || import.meta.env.DEV)
    .filter((l) => !connecte || aDroit(acces.pages, l.droit || l.cle))

  return (
    <>
    <header className="entete">
      <div className="entete-in">

        {/* ⭐ 12/11/2026 — LE LOGO DE LA MARQUE.
            `logo-bahja-turf.jpg` : la tête de cheval dorée, le mot-symbole
            « Bahja TURF » et la signature « Analyse • Stratégie • Performance ».
            Il remplace la plaque `logo.svg` ; `logo.svg` et `logo-horse.png`
            restent dans `public/` (rien n'est supprimé). */}
        <Link to="/" className="entete-logo" title={t('nav_analyse')}>
          <img src="/logo-bahja-turf.jpg" alt="Bahja TURF" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </Link>

        <nav className="entete-nav">
          {liens.map((l) => (
            <Link
              key={l.cle}
              to={l.to}
              className={`entete-lien p-${l.cle}${page === l.cle ? ' actif' : ''}`}
              aria-current={page === l.cle ? 'page' : undefined}
            >
              <i className={`bi ${l.icone}`} aria-hidden="true" />
              <span>{t(l.libelleKey)}</span>
            </Link>
          ))}
        </nav>

        {/* ⭐ qui est connecté — et de quoi sortir */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginLeft: 6 }}>
          <LangToggle />
          {connecte && (
          <>
            <span title={acces.abonnement && acces.abonnement.fin
              ? 'abonnement jusqu’au ' + acces.abonnement.fin.split('-').reverse().join('/')
              : 'abonnement sans limite'}
              style={{ fontSize: 12, color: '#a9b6c9', whiteSpace: 'nowrap' }}>
              <i className="bi bi-person-circle" /> {acces.nom}
            </span>
            <button
              onClick={async () => { await deconnecter(); window.location.href = '/' }}
              title={t('nav_deconnexion')}
              style={{
                padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
                color: '#e2e8f0', background: 'rgba(148,163,184,.14)',
                border: '1px solid rgba(148,163,184,.3)',
              }}>
              <i className="bi bi-box-arrow-right" /> {t('nav_deconnexion')}
            </button>
          </>
          )}
        </div>

      </div>
    </header>

    {/* ⭐ 13/11/2026 — البانير الرسمي «Bienvenue sur Bahja TURF».
     *  صورة فنية كاملة العرض (2139×405) تظهر في كل صفحات الموقع،
     *  تحت الشريط مباشرة — بدون أي تغيير على محتوى الصفحات. */}
    <div className="banniere-bienvenue">
      <img src="/bienvenue-bahja-turf.jpg" alt="Bienvenue sur Bahja TURF — Études • Analyses • Pronostics" />
    </div>
    </>
  )
}
