/**
 * tools/joueur.mjs — LE CARNET DU JOUEUR
 * ======================================
 *
 * L'utilisateur affirme : « avec 8 chevaux et quelques choix contraires au
 * moteur, je dépasse 75 % de 5/5 ». Le moteur, lui, plafonne mesuré à 11,4 %
 * (114 Quintés) et le top-8 du marché à 19,5 % (123 Quintés).
 *
 * On ne discute pas : on compte. Chaque jeu de 8 est enregistré AVANT la
 * course, puis noté avec l'arrivée réelle. Aucun chiffre saisi à la main.
 *
 *   node tools\joueur.mjs add 2026-10-21_R1_C1 4 7 9 12 15 2 6 8
 *   node tools\joueur.mjs bilan
 *   node tools\joueur.mjs liste
 *
 * La note (5/5 = les 5 arrivants sont dans les 8) est LUE dans
 * `data/synthese.json` (clé = date + R + C). Tant que l'arrivée n'est pas
 * connue, le jeu reste « en attente » et ne compte dans aucun pourcentage.
 */
import fs from 'node:fs'
import path from 'node:path'

const FICHIER = path.join(process.cwd(), 'data', 'joueur.json')

function lire() {
  try {
    const j = JSON.parse(fs.readFileSync(FICHIER, 'utf8'))
    return Array.isArray(j) ? { jeux: j } : j
  } catch {
    return { jeux: [] }
  }
}

function ecrire(o) {
  fs.mkdirSync(path.dirname(FICHIER), { recursive: true })
  fs.writeFileSync(FICHIER, JSON.stringify(o, null, 1))
}

function arrivees() {
  const out = new Map()
  let brut
  try {
    brut = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'synthese.json'), 'utf8'))
  } catch {
    return out
  }
  const arr = Array.isArray(brut) ? brut : Object.values(brut)
  for (const a of arr) {
    if (!a || !a.date) continue
    const cle = a.cle || a.courseId
    if (cle && (a.arrivee || []).length >= 5) out.set(cle, a.arrivee.map(Number))
  }
  return out
}

const [, , cmd, ...reste] = process.argv
const data = lire()

if (cmd === 'add') {
  const cle = reste[0]
  /* ⚠ un jeu peut être REPOSÉ (l'utilisateur change ses 8 quand les cotes
     tombent, ~3 h avant le départ). On garde l'historique : la note officielle
     est celle du DERNIER jeu posé, les précédents restent visibles avec leur
     propre note. Rien ne se réécrit. */
  const iNote = reste.indexOf('--note')
  const note = iNote > 0 ? reste.slice(iNote + 1).join(' ') : null
  const brut = (iNote > 0 ? reste.slice(1, iNote) : reste.slice(1))
  const nums = brut.map(Number).filter((n) => n > 0)
  if (!cle || nums.length !== 8 || new Set(nums).size !== 8) {
    console.error('usage : node tools\\joueur.mjs add <date_Rn_Cm> <8 numéros distincts> [--note "…"]')
    process.exit(1)
  }
  data.jeux.push({ cle, nums, pose: new Date().toISOString(), note })
  ecrire(data)
  const nb = data.jeux.filter((j) => j.cle === cle).length
  console.log(`enregistré : ${cle} → ${nums.join(' · ')}   (${nb} jeu(x) posé(s) sur cette course)`)
} else if (cmd === 'liste') {
  for (const j of data.jeux) console.log(`${j.cle.padEnd(20)} ${j.nums.join(' · ')}${j.note ? '   [' + j.note + ']' : ''}`)
} else if (cmd === 'bilan') {
  const A = arrivees()
  const lignes = []
  for (const j of data.jeux) {
    const arr = A.get(j.cle)
    if (!arr) { lignes.push({ ...j, etat: 'en attente' }); continue }
    const a = arr.slice(0, 5)
    const pris = a.filter((n) => j.nums.includes(n)).length
    const trio = a.slice(0, 3).filter((n) => j.nums.includes(n)).length
    lignes.push({ ...j, arrivee: a, pris, trio, etat: 'noté' })
  }
  /* la note officielle = le DERNIER jeu posé pour chaque course */
  const dernier = new Map()
  for (const l of lignes) dernier.set(l.cle, l)
  /* ⭐ RÈGLE DE L'UTILISATEUR (20/10/2026) — « إذا لم يكن صاحب المركز الأول
   * والثاني والثالث معاً في التذكرة، فالتذكرة = 0/5 ».
   * Un ticket qui ne contient pas le trio ne vaut RIEN, même avec 4 chevaux
   * sur 5 : sans le trio, le Quinté n'est pas payable. La note officielle est
   * donc 0 dès que `trio < 3`. Le brut (4/5…) reste affiché à côté, pour la
   * lecture, mais il ne compte dans aucun pourcentage. */
  const noter = (l) => (l.trio === 3 ? l.pris : 0)
  for (const l of lignes) if (l.etat === 'noté') l.note5 = noter(l)
  const notes = [...dernier.values()].filter((l) => l.etat === 'noté')
  const pct = (x, n) => (n ? ((100 * x) / n).toFixed(1).replace('.', ',') + ' %' : '—')

  const heure = (iso) => {
    try {
      const d = new Date(iso)
      const p = (x) => String(x).padStart(2, '0')
      return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} GMT`
    } catch { return '—' }
  }
  console.log('\nclé                  posé le          arrivée              5/5   trio   note')
  for (const l of lignes) {
    if (l.etat !== 'noté') { console.log(`${l.cle.padEnd(20)} ${heure(l.pose).padEnd(16)} ${'(en attente)'.padEnd(20)}`); continue }
    const officiel = dernier.get(l.cle) === l
    console.log(
      `${l.cle.padEnd(20)} ${heure(l.pose).padEnd(16)} ${l.arrivee.join('-').padEnd(20)} ` +
      `${String(l.pris).padEnd(4)} ${String(l.trio).padEnd(6)} ${l.note5}/5` +
      (l.trio < 3 ? ' (trio manquant)' : '') +
      (officiel ? '' : '   [remplacé]') + (l.note ? `   [${l.note}]` : ''),
    )
  }
  if (!notes.length) {
    console.log('\naucun jeu noté pour l\'instant.')
    process.exit(0)
  }
  const c5 = notes.filter((l) => l.note5 === 5).length
  const c4 = notes.filter((l) => l.note5 >= 4).length
  const t3 = notes.filter((l) => l.trio === 3).length
  const som = notes.reduce((s, l) => s + l.note5, 0)
  console.log(`\n${notes.length} jeu(x) noté(s) — règle : sans le trio, 0/5`)
  console.log(`  5/5            ${c5}/${notes.length}   ${pct(c5, notes.length)}`)
  console.log(`  trio entier    ${t3}/${notes.length}   ${pct(t3, notes.length)}`)
  console.log(`  x/5 moyen      ${(som / notes.length).toFixed(2)}`)
  console.log(`\nréférence moteur (114 Quintés) : 5/5 11,4 % · ≥4 55,3 % · trio 47,9 %`)
} else {
  console.log(`usage :
  node tools\\joueur.mjs add <date_Rn_Cm> <8 numéros>
  node tools\\joueur.mjs liste
  node tools\\joueur.mjs bilan`)
}
