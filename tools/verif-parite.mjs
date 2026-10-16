/* =============================================================================
 * tools/verif-parite.mjs — src/lib/quinte.js == backend/QUINTE/quinte.js ?
 *
 * §12 : `backend/QUINTE/quinte.js` est la copie de `src/lib/quinte.js` que sert
 * l'API. Les deux DOIVENT porter le même code. Seuls les COMMENTAIRES peuvent
 * différer (le backend en a quelques-uns en plus).
 *
 * Ce script compare les deux fichiers après avoir retiré commentaires et lignes
 * vides, fonction par fonction, et dit exactement où ça diverge.
 *
 *   node tools\verif-parite.mjs
 *   node tools\verif-parite.mjs --lignes   n'ignore pas les commentaires
 * ============================================================================= */
import fs from 'node:fs';

const [A, B] = ['src/lib/quinte.js', 'backend/QUINTE/quinte.js'];
const brut = process.argv.includes('--lignes');

function fonctions(chemin) {
  const src = fs.readFileSync(chemin, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');
  const lignes = src.split(/\r?\n/);
  const out = new Map();
  let courant = null;
  for (const l of lignes) {
    const m = /^(?:export\s+)?(?:function|const|let)\s+([A-Za-z0-9_$]+)/.exec(l);
    if (m) { courant = m[1]; out.set(courant, []); }
    if (courant) out.get(courant).push(brut ? l : l.trim());
  }
  if (!brut) for (const k of out.keys()) out.set(k, out.get(k).filter((x) => x));
  return out;
}

const fa = fonctions(A);
const fb = fonctions(B);
const cles = [...new Set([...fa.keys(), ...fb.keys()])].sort();

let ko = 0;
for (const k of cles) {
  const a = (fa.get(k) || []).join('\n');
  const b = (fb.get(k) || []).join('\n');
  if (a === b) continue;
  ko++;
  console.log('  ✗ ' + k);
  const la = a.split('\n'), lb = b.split('\n');
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      console.log('      src  | ' + (la[i] ?? '(absent)'));
      console.log('      back | ' + (lb[i] ?? '(absent)'));
      break;
    }
  }
}
console.log(`\n  ${cles.length} blocs comparés — ${ko === 0 ? 'src == backend ✅' : ko + ' divergent(s) ❌'}`);
process.exit(ko === 0 ? 0 : 1);
