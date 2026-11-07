/* ══════════════════════════════════════════════════════════════════════════
 *  src/Paris.jsx — LES PASTILLES DES PARIS D'UNE COURSE (18/10/2026)
 * ══════════════════════════════════════════════════════════════════════════ */
import { useLang } from './lib/langue.jsx'

export const PARIS_FR = {
  'simple-gagnant': { lib: 'Simple Gagnant', haut: 'Simple', bas: 'Gagnant', teinte: 'violet', icone: '🎯' },
  'simple-place':   { lib: 'Simple Placé',   haut: 'Simple', bas: 'Placé',   teinte: 'prune',  icone: '📍' },
  'jumele-gagnant': { lib: 'Couplé Gagnant', haut: 'Couplé', bas: 'Gagnant', teinte: 'orange', icone: '🤝' },
  'jumele-place':   { lib: 'Couplé Placé',   haut: 'Couplé', bas: 'Placé',   teinte: 'ambre',  icone: '📌' },
  'tierce':         { lib: 'Tiercé',         haut: 'Tiercé', bas: '',        teinte: 'vert',   icone: '🥉' },
  'quarte':         { lib: 'Quarté',         haut: 'Quarté', bas: '',        teinte: 'bleu',   icone: '4️⃣' },
  'quinte':         { lib: 'Quinté+',        haut: 'Quinté+', bas: '',       teinte: 'rouge',  icone: '🏆' },
}
export const PARIS_AR = {
  'simple-gagnant': { lib: 'فردي رابح', haut: 'فردي', bas: 'رابح', teinte: 'violet', icone: '🎯' },
  'simple-place':   { lib: 'فردي مركز', haut: 'فردي', bas: 'مركز', teinte: 'prune',  icone: '📍' },
  'jumele-gagnant': { lib: 'زوجي رابح', haut: 'زوجي', bas: 'رابح', teinte: 'orange', icone: '🤝' },
  'jumele-place':   { lib: 'زوجي مركز', haut: 'زوجي', bas: 'مركز', teinte: 'ambre',  icone: '📌' },
  'tierce':         { lib: 'ثلاثي', haut: 'ثلاثي', bas: '', teinte: 'vert', icone: '🥉' },
  'quarte':         { lib: 'رباعي', haut: 'رباعي', bas: '', teinte: 'bleu', icone: '4️⃣' },
  'quinte':         { lib: 'خماسي+', haut: 'خماسي+', bas: '', teinte: 'rouge', icone: '🏆' },
}

/** L'ordre d'affichage, du plus simple au plus fort (jamais alphabétique). */
export const ORDRE_PARIS = [
  'simple-gagnant', 'simple-place', 'jumele-gagnant', 'jumele-place',
  'tierce', 'quarte', 'quinte',
]
export const PARIS = PARIS_FR

export default function ParisListe({ paris, mini = false, style }) {
  const clefs = ORDRE_PARIS.filter((k) => (paris || []).includes(k))
  if (!clefs.length) return null
  const { lang } = useLang()
  const PARIS = lang === 'ar' ? PARIS_AR : PARIS_FR
  return (
    <span className={'paris' + (mini ? ' paris-mini' : '')} style={style}>
      {clefs.map((k) => {
        const p = PARIS[k]
        return (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginRight: 3 }}>
            <span style={{ fontSize: '1em' }}>{p.icone}</span>
            <span className={'pari pari-' + p.teinte} title={p.lib} style={{ padding: mini ? '1px 4px' : '2px 6px' }}>
              <span className="pari-in">
                <span className="pari-haut">{mini ? p.haut.slice(0, 4) : p.haut}</span>
                {p.bas && !mini ? <span className="pari-bas">{p.bas}</span> : null}
              </span>
            </span>
          </span>
        )
      })}
    </span>
  )
}
