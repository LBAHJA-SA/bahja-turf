/* ═══════════════════════════════════════════════════════════════════════════
 *  i18n-translate.mjs — traduit FR → AR la liste `data/i18n-source.json`.
 *
 *  · cache incrémental dans `data/i18n-cache.json` (relancer ne refait rien)
 *  · sortie   : `src/lib/trad-ar.json`  ({ "texte fr": "texte ar" })
 *  · moteur   : endpoint public Google (`client=gtx`), CORS ouvert
 * ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs'

const SOURCE = 'data/i18n-source.json'
const CACHE = 'data/i18n-cache.json'
const SORTIE = 'src/lib/trad-ar.json'

const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'))
let cache = {}
try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')) } catch { cache = {} }

const reste = source.filter((s) => !cache[s])
console.log(`textes : ${source.length}   déjà traduits : ${source.length - reste.length}   à faire : ${reste.length}`)

async function traduire(txt, essai = 0) {
  const u = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=ar&dt=t&q=' + encodeURIComponent(txt)
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    const j = await r.json()
    const out = (j?.[0] || []).map((p) => p?.[0] || '').join('').trim()
    if (!out) throw new Error('vide')
    return out
  } catch (e) {
    if (essai >= 3) { console.log('  ✗ ' + e.message + ' :: ' + txt.slice(0, 50)); return null }
    await new Promise((r) => setTimeout(r, 800 * (essai + 1)))
    return traduire(txt, essai + 1)
  }
}

let fait = 0
const LARGEUR = 8

async function ouvrier(file) {
  while (file.length) {
    const txt = file.pop()
    const ar = await traduire(txt)
    if (ar) { cache[txt] = ar; fait++ }
    if (fait % 25 === 0) {
      fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0), 'utf8')
      process.stdout.write(`\r  ${fait}/${reste.length} …`)
    }
  }
}

const file = [...reste]
await Promise.all(Array.from({ length: LARGEUR }, () => ouvrier(file)))

fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0), 'utf8')

/* on ne publie que les traductions réellement différentes */
const dico = {}
for (const s of source) {
  const ar = cache[s]
  if (ar && ar !== s) dico[s] = ar
}
fs.writeFileSync(SORTIE, JSON.stringify(dico, null, 0), 'utf8')
const ko = Object.keys(dico).length
console.log(`\r✓ ${ko}/${source.length} traduits  →  ${SORTIE}  (${(fs.statSync(SORTIE).size / 1024).toFixed(0)} Ko)`)
