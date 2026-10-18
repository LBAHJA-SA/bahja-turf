import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

/* ── L'ORDRE COMPTE (18/10/2026) ────────────────────────────────────────────
 * ① Bootstrap 5 : la grille, les utilitaires, les composants.
 * ② les icônes (bi bi-trophy…).
 * ③ NOTRE thème néon, chargé EN DERNIER : il redessine le fond sombre, les
 *    cartes de verre, les halos, et il a le dernier mot sur les classes que
 *    Bootstrap définit aussi (.container, .card, .btn, .badge, .nav).
 *    Inverser ① et ③ rendrait les pages blanches — ne pas le faire.
 */
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'

/* ══════════════════════════════════════════════════════════════════════════
 * LA GARDE D'URGENCE — un plantage ne doit JAMAIS laisser une page blanche
 *
 * Le 17/10/2026 la page /quinte a jeté :
 *
 *   Uncaught NotFoundError: Failed to execute 'insertBefore' on 'Node':
 *   The node before which the new node is to be inserted is not a child
 *   of this node.
 *       at commitPlacement → commitMutationEffectsOnFiber → …
 *   The above error occurred in the <b> component
 *
 * Ce que ce message veut dire, exactement :
 *
 *   – React a mis à jour le DOM à partir de son arbre virtuel ;
 *   – le VRAI DOM ne correspondait plus à cet arbre ;
 *   – la cause n'est donc PAS dans le code de la page : c'est le DOM qui a
 *     été modifié SOUS React. Les trois causes connues, dans l'ordre :
 *      ① la traduction automatique du navigateur (Google Translate réécrit
 *        les nœuds de texte — la page est en français, l'auteur lit l'arabe) ;
 *      ② une extension qui touche au DOM ;
 *      ③ un rechargement du serveur Vite en pleine mise à jour (HMR : les
 *        dépendances sont ré-optimisées, le hash `?v=…` change, la page se
 *        recharge au milieu d'un commit).
 *
 *   – React a alors CHERCHÉ une garde d'erreur (c'est le `logCapturedError`
 *     visible dans la console). Il n'en a trouvé aucune, donc il a démonté
 *     TOUT l'arbre : écran vide, sans un mot.
 *
 * Cette garde ne cache rien et ne corrige aucune donnée : elle transforme
 * l'écran vide en un message lisible + un bouton. L'archive, les tickets et
 * les fichiers sur le disque ne sont pas touchés — c'est de l'affichage pur.
 * ══════════════════════════════════════════════════════════════════════════ */

class Garde extends React.Component {
  constructor(props) {
    super(props)
    this.state = { erreur: null, info: null }
  }

  static getDerivedStateFromError(erreur) {
    return { erreur }
  }

  componentDidCatch(erreur, info) {
    this.setState({ info })
    /* ⚠ trace de diagnostic uniquement — jamais affichée comme une donnée.
     *   Le message d'écran reste sobre ; le détail va dans la console. */
    console.error('[Garde] plantage de rendu :', erreur, info)
  }

  render() {
    const e = this.state.erreur
    if (!e) return this.props.children

    const message = String((e && e.message) || e)
    const condamne =
      /insertBefore|removeChild|appendChild|not a child of this node/i.test(message)

    return (
      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: 760, margin: '40px auto', padding: 24,
        border: '2px solid #b91c1c', borderRadius: 12,
        background: '#fef2f2', color: '#7f1d1d', lineHeight: 1.6,
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>⚠ Erreur d'affichage — la page s'est arrêtée</h1>

        <p style={{ margin: '0 0 12px', fontSize: 14 }}>
          React n'a pas pu mettre l'écran à jour. <b>Aucune donnée n'est perdue</b> :
          l'archive, les tickets et les fichiers sur le disque sont intacts — le
          problème est dans le rendu, pas dans la méthode.
        </p>

        {condamne && (
          <p style={{ margin: '0 0 12px', fontSize: 14, background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: 10 }}>
            <b>Cause la plus probable :</b> le navigateur a modifié la page sous React.
            C'est le cas quand la <b>traduction automatique</b> est active (la page est en
            français), ou après un rechargement du serveur de développement. Recharge la
            page ; si ça revient, coupe la traduction sur ce site
            (<code>clic droit → « Ne jamais traduire ce site »</code>).
          </p>
        )}

        <pre style={{
          background: '#fff', border: '1px solid #fecaca', borderRadius: 8, padding: 10,
          fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', margin: '0 0 14px',
        }}>{message}</pre>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 22px', borderRadius: 8, border: 'none', background: '#b91c1c',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Recharger la page
        </button>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<Garde><App /></Garde>)
