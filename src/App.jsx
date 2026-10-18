import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Article from '../frontend/ARTICLE/Article.jsx'
import QuinteGrille from '../frontend/QUINTE/QuinteGrille.jsx'
import Couple from '../frontend/COUPLE/Couple.jsx'
import Analyse from '../frontend/ANALYSE/Analyse.jsx'

/* ══════════════════════════════════════════════════════════════════════════
 *  4 pages, chacune son lien et ses dossiers.
 *  Navigation autorisée (le bandeau src/Entete.jsx) ; PARTAGE des moteurs et
 *  des sources interdit.
 *     frontend/<PAGE>/ = son affichage · backend/<PAGE>/ = ses données.
 *
 *  ⚠ 18/10/2026 — LA PAGE « PROGRAMME » EST SUPPRIMÉE.
 *  La page d'accueil (/) est désormais « Analyse course » : toutes les courses
 *  du jour, tous les chevaux, l'étude sous chaque course (c'est l'ancienne
 *  page « Chevaux », qui perd son nom au profit de celui du menu).
 *  Les anciennes adresses restent valables : /articles mène à l'accueil.
 * ══════════════════════════════════════════════════════════════════════════ */
export default function App(){
  return (
    <BrowserRouter>
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

        <Route path="/couple" element={<Couple />} />
        <Route path="/coply" element={<Couple />} />

        {/* une adresse inconnue ne laisse jamais un écran vide */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
