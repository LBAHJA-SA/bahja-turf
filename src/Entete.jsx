import { Link } from 'react-router-dom'

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
  { cle: 'analyse', to: '/', libelle: 'Analyse course', icone: 'bi-clipboard2-pulse' },
  { cle: 'quinte', to: '/quinte', libelle: 'Quinté', icone: 'bi-trophy' },
  { cle: 'presse', to: '/presse', libelle: 'Presse', icone: 'bi-newspaper' },
  { cle: 'lives', to: '/lives', libelle: 'Lives', icone: 'bi-broadcast' },
  /* 23/10/2026 — le moteur DNA COURSE, tel quel : il vit dans `dna-course\`
   * (Flask sur le port 5057) et la page l'affiche dans un cadre.
   * `dev: true` — le moteur tourne sur le poste : le lien n'apparaît donc que
   * en développement. En ligne (Vercel) il n'y a rien à afficher, et un onglet
   * mort dans le bandeau serait pire que pas d'onglet du tout. */
  { cle: 'dna', to: '/dna', libelle: 'DNA COURSE', icone: 'bi-cpu', dev: true },
]

export default function Entete({ page }) {
  return (
    <header className="entete">
      <div className="entete-in">

        <Link to="/" className="entete-logo" title="Analyse course">
          <img src="/logo-horse.png" alt="LBAHJA-TURF" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <img src="/logo.svg" alt="LBAHJA-TURF" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </Link>

        <nav className="entete-nav">
          {LIENS.filter((l) => !l.dev || import.meta.env.DEV).map((l) => (
            <Link
              key={l.cle}
              to={l.to}
              className={`entete-lien p-${l.cle}${page === l.cle ? ' actif' : ''}`}
              aria-current={page === l.cle ? 'page' : undefined}
            >
              <i className={`bi ${l.icone}`} aria-hidden="true" />
              <span>{l.libelle}</span>
            </Link>
          ))}
        </nav>

      </div>
    </header>
  )
}
