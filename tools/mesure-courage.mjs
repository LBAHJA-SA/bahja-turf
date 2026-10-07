/* ---------------------------------------------------------------
 * tools\mesure-courage.mjs  —  « الشجاعة » كما قال المستخدم
 *
 *   node tools\mesure-courage.mjs
 *
 *   7 chevaux : 4 من « الطوب 8 » (اللي السوق كرههم) و 3 من فوق 8.
 *   C'est le pari : peu de combinaisons, et majoritairement contre le marché.
 *
 * On le mesure sur DEUX corpus, parce qu'ils ne servent pas à la même chose :
 *
 *   · data\quintes.json  → 75 Quintés AVEC presse + cotes + gains réels.
 *                           C'est le seul endroit où l'on peut also mesurer
 *                           les BLOCS et les euros.
 *   · archives\*.json     → 94 Quintés SANS presse, mais avec la cOTE FINALE
 *                           et l'arrivée complète. Plus de courses, donc
 *                           une mesure plus stable — sans blocs, sans euros.
 *
 * Les deux sont不能用 pour la meme chose. On ne mélange pas.
 * ------------------------------------------------------------- */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const C = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return Math.round(x) }

/* ------------------------------------------------------------ corpus 1 --- */
const avecPresse = () => {
  const Q = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'quintes.json'), 'utf8'))
  const out = []
  for (const q of Q) {
    if (!Array.isArray(q.presse) || q.presse.length < 4) continue
    if (!Array.isArray(q.arrivee) || q.arrivee.length < 5) continue
    const cotes = q.cotes || {}
    if (Object.keys(cotes).filter((k) => cotes[k] > 0).length < q.nb - 2) continue
    out.push({ cle: q.date + ' ' + q.code, cotes, top5: q.arrivee.slice(0, 5), nb: q.nb, dividends: q.dividends })
  }
  return out
}

/* ------------------------------------------------------------ corpus 2 --- */
const sansPresse = () => {
  const D = path.join(RACINE, 'archives')
  const out = []
  for (const f of fs.readdirSync(D).filter((x) => x.endsWith('.json'))) {
    const chemin = path.join(D, f)
    if (!fs.statSync(chemin).size) continue
    const j = JSON.parse(fs.readFileSync(chemin, 'utf8'))
    const c = j.course || {}
    if (!(c.types_pari || []).includes('QUINTE_PLUS')) continue
    const ordre = (c.arrivee || []).flat().filter(Boolean)
    if (ordre.length < 5) continue
    const parts = (j.participants || []).filter((p) => String(p.statut || 'PARTANT').includes('PARTANT') && p.nonPartant !== true)
    if (parts.length < 10) continue
    const cotes = {}
    parts.forEach((p) => { cotes[p.num] = p.cote_pmu > 0 ? p.cote_pmu : null })
    if (Object.values(cotes).filter((v) => v > 0).length < parts.length - 2) continue
    out.push({ cle: j.reunion.date + ' R' + j.reunion.num + 'C' + c.num, cotes, top5: ordre.slice(0, 5), nb: parts.length, dividends: null })
  }
  return out
}

/* ------------------------------------------------------ le choix partagé --- */
/** Les nums classés par cote croissante. */
const parCote = (k) => Object.keys(k.cotes).map(Number)
  .filter((n) => k.cotes[n] > 0)
  .sort((a, b) => k.cotes[a] - k.cotes[b])

/** bas = les `n` plus hors cote (le bas du « طوب 8 ») ; haut = les `n` meilleures.
 *  ⚠ `slice(-0)` renvoie le tableau ENTIER — il faut tester 0 avant.
 *  `band` = les meilleures cotes (rang 9-12) : c'est LÀ que se trouvent les
 *  gagnants « hors du top 8 » — voir tools\mesure-hors-top8.mjs. Prendre les
 *  4 PIRES cotes est une erreur de mesure, pas du courage. */
const choisir = (k, nBas, nHaut) => {
  const ordre = parCote(k)
  if (typeof nBas === 'string' && nBas.startsWith('band')) {
    // « band » = la bande 9-12 par les cotes, là où se trouvent VRAIMENT les
    // gagnants « hors du top 8 » (mesure-hors-top8). `band:9:13` élargit à 13.
    const [, a, b] = nBas.split(':')
    const slice = ordre.slice(Number(a) - 1, Number(b))
    return [...new Set([...slice, ...ordre.slice(0, nHaut)])]
  }
  const bas = nBas > 0 ? ordre.slice(-nBas) : []      // les n plus détestés
  const haut = nHaut > 0 ? ordre.slice(0, nHaut) : [] // les n mieux cités
  return [...new Set([...bas, ...haut])]
}

const gainOrdre = (k) => {
  const d = k.dividends
  if (!Array.isArray(d)) return null
  const l = d.find((x) => x.bet_type === 'QUINTE_ORDRE' && /ordre/i.test(x.sub_type) && !/désordre/i.test(x.sub_type))
  if (!l) return null
  const v = parseFloat(String(l.payout).replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

const euros = (base, nBas, nHaut) => {
  let total = 0
  let mise = 0
  let wins = 0
  const liste = []
  for (const k of base) {
    const t = choisir(k, nBas, nHaut)
    const combi = C(t.length, 5)
    const g = gainOrdre(k)
    if (g == null || !combi) continue
    mise += combi
    const hits = k.top5.filter((x) => t.includes(x)).length
    const win = hits === 5
    if (win) { total += g; wins++; liste.push(g) }
    liste.push && 0
    if (win) base.lastWin = k.cle
  }
  liste.sort((a, b) => b - a)
  return { total, mise, wins, euro: mise ? total / mise : 0, sansLePlusGros: mise ? (total - (liste[0] || 0)) / mise : 0 }
}

const mesurer = (nom, base, nBas, nHaut) => {
  const t = base.map((k) => {
    const tk = choisir(k, nBas, nHaut)
    return { n: tk.length, hits: k.top5.filter((x) => tk.includes(x)).length }
  })
  const n = Math.round(t.reduce((s, x) => s + x.n, 0) / t.length)
  const combi = Math.round(base.reduce((s, k) => s + C(choisir(k, nBas, nHaut).length, 5), 0) / base.length)
  const moy = t.reduce((s, x) => s + x.hits, 0) / t.length
  const p = (x) => (t.filter((v) => v.hits >= x).length / t.length * 100).toFixed(0) + ' %'
  const ev = euros(base, nBas, nHaut)
  const f = (x) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2))
  return { nom, n, combi, moy, p3: p(3), p4: p(4), p5: p(5), ev, wins: ev.wins }
}

/* ------------------------------------------------------------------ run --- */
const A = avecPresse()
const B = sansPresse()

const variantes = [
  ['la méthode 3-2-1-1-1 (tous en haut)', null, null, 'methode'],
  ['top-5 (le marché)', 0, 5, 'cote'],
  ['top-7 (le marché)', 0, 7, 'cote'],
  ['top-8 (le marché)', 0, 8, 'cote'],
  ['7 = 4 en bas + 3 en haut', 4, 3, 'courage'],
  ['7 = 3 en bas + 4 en haut', 3, 4, 'courage'],
  ['7 = 5 en bas + 2 en haut', 5, 2, 'courage'],
  ['7 = 2 en bas + 5 en haut', 2, 5, 'courage'],
  ['7 = 7 en bas (tout contre)', 7, 0, 'courage'],
  ['8 = 4 en bas + 4 en haut', 4, 4, 'courage'],
  ['8 = 5 en bas + 3 en haut', 5, 3, 'courage'],
  ['8 = 3 en bas + 5 en haut', 3, 5, 'courage'],
  ['⭐⭐ 3 cotes + 4 de la bande 9-12', 'band:9:12', 3, 'band'],
  ['⭐⭐ 3 cotes + 4 de la bande 9-13', 'band:9:13', 3, 'band'],
  ['⭐⭐ 4 cotes + 4 de la bande 9-12', 'band:9:12', 4, 'band'],
  ['⭐⭐ 2 cotes + 4 de la bande 9-12', 'band:9:12', 2, 'band'],
  ['⭐ 3 cotes + 5 de la bande 9-13', 'band:9:13', 3, 'band'],
  ['⭐ 5 cotes + 5 de la bande 9-13', 'band:9:13', 5, 'band'],
  ['⭐ 4 cotes + 5 de la bande 9-14', 'band:9:14', 4, 'band'],
]

for (const [titre, base, note] of [[`${A.length} Quintés AVEC presse + cotes + gains réels`, A, 'euros disponibles'],
  [`${B.length} Quintés archives SANS presse (cote finale + arrivée)`, B, 'PAS d euros : on ne mesure que les arrivants']]) {
  console.log('')
  console.log(`  ⭐ « LE COURAGE » — ${titre}`)
  if (note.startsWith('PAS')) console.log(`     ${note}`)
  console.log('')
  console.log('  sélection                  n   combi   moyen   ≥3/5   ≥4/5    5/5   ' + (note.startsWith('euros') ? '€ par €  gagne' : ''))
  console.log('  ' + '-'.repeat(78))
  for (const [nom, nBas, nHaut, type] of variantes) {
    if (type === 'methode') {
      // 3-2-1-1-1 : impossible ici (pas de presse sur B) -> on le saute sur B
      if (base !== A) { console.log('  ' + nom.padEnd(25) + '   --   (il faut la presse)'); continue }
      const r = mesurer(nom, base, 0, 8)
      console.log('  ' + nom.padEnd(25) + String(r.n).padStart(3) + String(r.combi).padStart(7) + r.moy.toFixed(2).padStart(8) + r.p3.padStart(8) + r.p4.padStart(7) + r.p5.padStart(7) + '   ' + (r.ev.euro >= 10 ? r.ev.euro.toFixed(1) : r.ev.euro.toFixed(2)).padStart(7) + String(r.ev.wins).padStart(6))
      continue
    }
    const r = mesurer(nom, base, nBas, nHaut)
    console.log('  ' + nom.padEnd(25) + String(r.n).padStart(3) + String(r.combi).padStart(7) + r.moy.toFixed(2).padStart(8) + r.p3.padStart(8) + r.p4.padStart(7) + r.p5.padStart(7)
      + (note.startsWith('euros') ? '   ' + (r.ev.euro >= 10 ? r.ev.euro.toFixed(1) : r.ev.euro.toFixed(2)).padStart(7) + String(r.ev.wins).padStart(6) : ''))
  }
}
console.log('')
