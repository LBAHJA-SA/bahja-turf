/* =============================================================================
 * tools/verif-carriere.mjs — LA CARRIÈRE COLLECTÉE EST-ELLE BIEN JOINTE ? (§14.6)
 *
 * Vérifie que chaque course passée de `data/forms.json` retrouve :
 *   ① sa clé dans `data/vh.json` (`date|hippodrome|n°`) ;
 *   ② son CHEVAL dans les partants PMU, par son nom normalisé (`infos[n].nom`) ;
 *   ③ un VH.
 *
 *   node tools\verif-carriere.mjs
 * ============================================================================= */
import fs from 'node:fs'
const V = JSON.parse(fs.readFileSync('data/vh.json', 'utf8'))
const F = JSON.parse(fs.readFileSync('data/forms.json', 'utf8'))
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '')

let runs = 0, cleAbsente = 0, cleNulle = 0, trouvee = 0, joint = 0, vhOk = 0
const taux = {}
const ex = []
for (const k of Object.keys(F)) {
  const c = F[k]; if (c.erreur) continue
  for (const n of Object.keys(c.chevaux || {})) {
    const nom = norm(c.infos?.[n]?.nom)
    for (const r of c.chevaux[n]) {
      runs++
      const cle = `${r.date}|${norm(r.track)}|${r.race}`
      const m = V[cle]
      if (m === undefined) { cleAbsente++; taux[r.track] = (taux[r.track] || 0) + 1; continue }
      if (m === null) { cleNulle++; continue }
      trouvee++
      const x = m[nom]
      if (!x) { if (ex.length < 8) ex.push({ cle, nom, chevaux: Object.keys(m).slice(0, 6) }); continue }
      joint++
      if (x.vh != null) vhOk++
    }
  }
}
console.log('\n  runs ' + runs)
console.log('  clé absente (course pas lue)      ' + cleAbsente)
console.log('  clé nulle (partants introuvables) ' + cleNulle)
console.log('  course retrouvée                  ' + trouvee)
console.log('  → cheval joint par le nom         ' + joint + '  (' + Math.round(100 * joint / (trouvee || 1)) + ' % des retrouvées)')
console.log('  → avec un VH                       ' + vhOk)
console.log('\n  top hippodromes dont la clé manque :')
Object.entries(taux).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log('    ' + String(v).padStart(4) + '  ' + k))
console.log('\n  exemples de courses retrouvées SANS le cheval :')
for (const e of ex) console.log('    ' + e.cle + '  cheval=' + e.nom + '  partants=' + e.chevaux.join(','))
