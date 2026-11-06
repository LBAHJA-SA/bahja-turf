/* ══════════════════════════════════════════════════════════════════════════
 *  src/Paris.jsx — LES PASTILLES DES PARIS D'UNE COURSE (18/10/2026)
 *
 *  Ce que le parieur lit sur son carnet, en haut de chaque course :
 *
 *      Simple Gagnant · Simple Placé · Couplé Gagnant · Couplé Placé
 *      Tiercé · Quarté · Quinté+
 *
 *  Une pastille = un ruban penché, sa couleur, son nom. Les couleurs suivent
 *  l'usage et ne changent JAMAIS : violet (Simple), orange (Couplé), vert
 *  (Tiercé), bleu (Quarté), rouge (Quinté+).
 *
 *  Usage :
 *      import ParisListe from '../../src/Paris.jsx'
 *      <ParisListe paris={['tierce', 'quarte', 'quinte']} />
 *      <ParisListe paris={clefs} mini />          // pour une case étroite
 *
 *  ⚠ ON N'INVENTE JAMAIS UNE PASTILLE : la liste vient de la source (voir
 *  backend/ANALYSE/paris.js). Une course qui n'annonce pas de Tiercé n'en
 *  affiche pas. Liste vide → le composant ne dessine RIEN (pas de trou).
 * ══════════════════════════════════════════════════════════════════════════ */

/** Le catalogue : la clé technique → le libellé, les deux mots, la couleur.
 *  `haut`/`bas` = les deux lignes du ruban (les 4 paris de base en ont deux,
 *  les trois « gros » paris tiennent sur une seule). */
export const PARIS = {
  'simple-gagnant': { lib: 'Simple Gagnant', haut: 'Simple', bas: 'Gagnant', teinte: 'violet', icone: '🎯' },
  'simple-place':   { lib: 'Simple Placé',   haut: 'Simple', bas: 'Placé',   teinte: 'prune',  icone: '📍' },
  /* ⚠ Les DEUX clés gardent « jumele- » : c'est la donnée du PMU et celle de
   *   backend/ANALYSE/paris.js. Seul le LIBELLÉ lu par l'utilisateur change :
   *   « Couplé », le nom du pari sur la feuille de course (décidé le 18/10). */
  'jumele-gagnant': { lib: 'Couplé Gagnant', haut: 'Couplé', bas: 'Gagnant', teinte: 'orange', icone: '🤝' },
  'jumele-place':   { lib: 'Couplé Placé',   haut: 'Couplé', bas: 'Placé',   teinte: 'ambre',  icone: '📌' },
  'tierce':         { lib: 'Tiercé',         haut: 'Tiercé', bas: '',        teinte: 'vert',   icone: '🥉' },
  'quarte':         { lib: 'Quarté',         haut: 'Quarté', bas: '',        teinte: 'bleu',   icone: '4️⃣' },
  'quinte':         { lib: 'Quinté+',        haut: 'Quinté+', bas: '',       teinte: 'rouge',  icone: '🏆' },
}

/** L'ordre d'affichage, du plus simple au plus fort (jamais alphabétique). */
export const ORDRE_PARIS = [
  'simple-gagnant', 'simple-place', 'jumele-gagnant', 'jumele-place',
  'tierce', 'quarte', 'quinte',
]

export default function ParisListe({ paris, mini = false, style }) {
  const clefs = ORDRE_PARIS.filter((k) => (paris || []).includes(k))
  if (!clefs.length) return null
  return (
    <span className={'paris' + (mini ? ' paris-mini' : '')} style={style}>
      {clefs.map((k) => {
        const p = PARIS[k]
        return (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginRight: 4, background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 6 }}>
            <span style={{ fontSize: '1.2em' }}>{p.icone}</span>
            <span className={'pari pari-' + p.teinte} title={p.lib}>
              <span className="pari-in">
                <span className="pari-haut">{p.haut}</span>
                {p.bas ? <span className="pari-bas">{p.bas}</span> : null}
              </span>
            </span>
          </span>
        )
      })}
    </span>
  )
}
