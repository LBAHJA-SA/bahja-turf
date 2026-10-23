import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Article from '../frontend/ARTICLE/Article.jsx'
import QuinteGrille from '../frontend/QUINTE/QuinteGrille.jsx'
import Analyse from '../frontend/ANALYSE/Analyse.jsx'
import Presse from '../frontend/PRESSE/Presse.jsx'
import Lives from '../frontend/LIVES/Lives.jsx'
import DnaCourse from '../frontend/DNA/DnaCourse.jsx'
import Admin from '../frontend/ADMIN/Admin.jsx'
import { pointerVisite } from '../backend/ADMIN/visites.js'

/* ══════════════════════════════════════════════════════════════════════════
 *  Une page, un lien, ses dossiers.
 *  Navigation autorisée (le bandeau src/Entete.jsx) ; PARTAGE des moteurs et
 *  des sources interdit.
 *     frontend/<PAGE>/ = son affichage · backend/<PAGE>/ = ses données.
 *
 *  ⚠ 18/10/2026 — LA PAGE « PROGRAMME » EST SUPPRIMÉE.
 *  La page d'accueil (/) est désormais « Analyse course » : toutes les courses
 *  du jour, tous les chevaux, l'étude sous chaque course (c'est l'ancienne
 *  page « Chevaux », qui perd son nom au profit de celui du menu).
 *  Les anciennes adresses restent valables : /articles mène à l'accueil.
 *
 *  ⚠ 18/10/2026 — LA PAGE « PRESSE » ARRIVE.
 *  /presse rassemble les déclarations des entraîneurs et des drivers, l'analyse
 *  de la course, les pronostics des journaux et les nouvelles des chevaux.
 * ══════════════════════════════════════════════════════════════════════════ */
export default function App(){
  return (
    <BrowserRouter>
      <NoterPage />
      <Routes>
        {/* ── l'accueil : l'analyse de toutes les courses du jour ── */}
        <Route path="/" element={<Analyse />} />
        {/* alias : l'ancien nom reste valable (les favoris ne cassent pas) */}
        <Route path="/analyse" element={<Analyse />} />
        <Route path="/chevaux" element={<Analyse />} />
        <Route path="/articles" element={<Navigate to="/" replace />} />

        <Route path="/r/:slug" element={<Article />} />
        <Route path="/race/:id" element={<Article />} />

        <Route path="/quinte" element={<QuinteGrille />} />

        {/* ⚠ 23/10/2026 — LA PAGE « COPLY » EST SUPPRIMÉE.
         *  /coply et /couple tombent dans l'adresse inconnue → retour à
         *  l'accueil, comme n'importe quelle vieille adresse. */}

        {/* la presse du jour : déclarations, analyse, revue de presse, articles */}
        <Route path="/presse" element={<Presse />} />

        {/* ══════════════════════════════════════════════════════════════════════
         *  LES LIVES — les hippodromes régionaux d'Equidia en direct (20/10/2026)
         *  Source : regions-api.equidia.fr (CORS ouvert, flux HLS dans la page).
         *  L'alias /live reste valable.
         * ══════════════════════════════════════════════════════════════════════ */}
        <Route path="/lives" element={<Lives />} />
        <Route path="/live" element={<Lives />} />

        {/* ══════════════════════════════════════════════════════════════════════
         *  DNA COURSE — le moteur marché-ancré (23/10/2026)
         *  Une page du site comme les autres : `frontend/DNA/` prend le
         *  programme et les partants ici (backend/DNA/donnees.js) et envoie les
         *  chevaux au moteur par `/api/dna`. Plus de cadre, plus d'application
         *  à part. L'alias /dna-course reste valable.
         * ══════════════════════════════════════════════════════════════════════ */}
        <Route path="/dna" element={<DnaCourse />} />
        <Route path="/dna-course" element={<DnaCourse />} />

        {/* ══════════════════════════════════════════════════════════════════════
         *  ⚠ LA CONSOLE D'ADMINISTRATION — INVISIBLE POUR LES VISITEURS.
         *  Elle n'est dans AUCUN menu (src/Entete.jsx ne la connaît pas) et,
         *  sans clé, elle renvoie à l'accueil : un visiteur qui taperait
         *  /admin par hasard voit exactement la page d'une adresse inconnue.
         *  La clé se pose une fois par l'adresse : /admin?cle=<ta clé>
         *  (6 caractères minimum). Elle est ensuite mémorisée dans le
         *  navigateur, et retirée de l'URL aussitôt.
         * ══════════════════════════════════════════════════════════════════════ */}
        <Route path="/admin" element={<Admin />} />

        {/* une adresse inconnue ne laisse jamais un écran vide */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
 *  NOTER LA PAGE VUE — une ligne par page, c'est le journal des visiteurs.
 *
 *  Le serveur ajoute l'IP (en-tête `x-forwarded-for`) et le pays : la page ne
 *  les voit jamais, et elle n'a rien à envoyer. Le propriétaire, lui, n'est
 *  pas compté (sa clé d'accès est présente) — voir backend/ADMIN/visites.js.
 *
 *  ⚠ Jamais bloquant : si l'appel échoue, la page s'affiche quand même.
 * ══════════════════════════════════════════════════════════════════════════ */
function NoterPage() {
  const { pathname } = useLocation()
  useEffect(() => { pointerVisite(pathname) }, [pathname])
  return null
}
