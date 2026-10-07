/* Patch — api/labo.js : detailDuJour utilise parsePartantsTqq.
 *
 * On a écrit 3 parsers à la main : « le premier tableau », « le nom doit
 * avoir des lettres », « le 18 de 18 partants »… Chaque course a une mise
 * en page différente et chaque patch en cassait une autre (R1-C1 = 18
 * doublons, R1-C2 = colonne « Cotes Ref. » décalée).
 *
 * Article utilise parsePartantsTqq depuis le début : il lit les colonnes
 * PAR LEUR NOM (№, Cheval, Cotes Ref., Jockey…), pas par position. Pour
 * 57 courses, c'est la seule façon qui marche.
 *
 * Ici on appelle chargerDetailReu qui le fait Déjà : pas de doublon.
 */
import fs from 'node:fs'
const f = 'api/labo.js'
let c = fs.readFileSync(f, 'utf8')

// ① import en tête : turfFrance, pas chargerDetailReu (qui a besoin des proxies)
const vieuxImport = `import path from 'node:path'

const RACINE = process.cwd()
const TF = 'https://www.turf-france.com'`
const neufImport = `import path from 'node:path'
import { chargerDetailReu } from '../backend/ARTICLE/turfFrance.js'

const RACINE = process.cwd()
const TF = 'https://www.turf-france.com'`

if (!c.includes(vieuxImport)) { console.log('IMPORT INTROUVABLE'); process.exit(1) }
c = c.replace(vieuxImport, neufImport)

// ② le bloc detailDuJour maison → chargerDetailReu
const debut = c.indexOf('/** Les entités HTML')
const fin = c.indexOf('/** Le détail d')
if (debut < 0 || fin < 0 || debut > fin) { console.log('BLOC INTROUVABLE'); process.exit(1) }
c = c.slice(0, debut) + `/** Le détail d'une course : chargerDetailReu (le même que la page
 *   Article, §19.1). Il lit les colonnes PAR LEUR NOM, donc il marche pour
 *   les 57 courses — pas seulement pour celles dont la mise en page tombe
 *   bien. */

` + c.slice(fin)

fs.writeFileSync(f, c, 'utf8')
console.log('patch applique')
console.log('  detailDuJour maison supprime :', !c.includes('async function detailDuJour'))