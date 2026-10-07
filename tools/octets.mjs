/**
 * Montre les valeurs exactes d'un champ JSON et detecte le mojibake
 * (un fichier UTF-8 lu comme latin-1 donne "Atteľ" au lieu de "Attele").
 * Sert a distinguer une vraie corruption d'un simple affichage de console.
 *
 *   node tools\octets.mjs data\synthese.json discipline
 */
import fs from 'node:fs'

const f = process.argv[2] || 'data/synthese.json'
const motif = process.argv[3] || 'discipline'
const txt = fs.readFileSync(f, 'utf8')

txt.split(/\r?\n/).forEach((l, i) => {
  if (!l.includes(motif)) return
  const m = l.trim().match(/"([^"]*)"/)
  if (!m) return
  const s = m[1]
  const codes = [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
  console.log(`  ${String(i + 1).padStart(5)}  ${l.trim()}`)
  console.log(`         code points : ${codes.join(' ')}`)
})

// Compteur global : une valeur qui contient un accent latin est saine.
// Le mojibake se repere aux couples "A-circonflexe + lettre accentuee".
const paires = txt.match(/[ÂÃ][-¿]/g) || []
console.log(`  ${f} : ${paires.length} couple(s) suspect(s) — 0 = fichier sain`)