import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Programme from '../frontend/PROGRAMME/Programme.jsx'
import Article from '../frontend/ARTICLE/Article.jsx'
import QuinteGrille from '../frontend/QUINTE/QuinteGrille.jsx'
import Couple from '../frontend/COUPLE/Couple.jsx'

/* 4 pages, chacune son lien et ses dossiers.
 * Navigation autorisée (menu) ; PARTAGE des moteurs/sources interdit.
 *   frontend/<PAGE>/ = son affichage · backend/<PAGE>/ = ses données.
 * /articles et /race/:id sont des alias (même page, pas des liens).
 */
export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Programme />} />
        <Route path="/articles" element={<Programme />} />
        <Route path="/r/:slug" element={<Article />} />
        <Route path="/race/:id" element={<Article />} />
        <Route path="/quinte" element={<QuinteGrille />} />
        <Route path="/couple" element={<Couple />} />
        {/* alias : l'ancien nom reste valable (les bookmarks ne cassent pas) */}
        <Route path="/coply" element={<Couple />} />
      </Routes>
    </BrowserRouter>
  )
}