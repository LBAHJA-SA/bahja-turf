/* =============================================================================
 * backend/ANALYSE/turfFrance.js
 *
 * ⛔ COPIÉ de `backend/ARTICLE/turfFrance.js` — « chaque page ses outils »
 *    (même règle que le `parisVersGMT` de backend/PROGRAMME/donnees.js).
 *    La page Chevaux a besoin des mêmes extractions — tops, aptitudes,
 *    synthèse des %, pronostics — PLUS les OUTILS (les pastilles de couleur et
 *    les boutons) qu'elle affiche sous CHAQUE course.
 *    ⚠ On ne touche JAMAIS à la copie de l'ARTICLE.
 *
 * CE QUE LA SOURCE PUBLIE, POUR N'IMPORTE QUELLE COURSE :
 *
 *   reu.php?view=program&date=AAAA-MM-JJ
 *     → toutes les courses du jour, avec leur PAYS (R1-C1 = FRANCE,
 *       R4-C1 = ROYAUME-UNI…) : c'est ce pays qu'exige l'appel suivant.
 *
 *   reu.php?view=detail&date=AAAA-MM-JJ&reunion=Rn&course=Cm&pays=XX
 *     → « Etudes, Analyses, Synthèse et Pronostics » : les 16 tableaux,
 *       la Synthèse des %, le tableau Aptitude, les 2 lignes de pronostic,
 *       et tous les OUTILS (10 pastilles + 13 boutons).
 *
 * Aucune CORS sur ces pages → proxy `/api/tf` (vite.config.js en dev,
 * api/_proxy.js en ligne) puis, en dernier recours, le direct.
 * ========================================================================== */

const TF_PROXY = '/api/tf'
const TF_DIRECT = 'https://www.turf-france.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * Va chercher la page, en réessayant : un raté réseau isolé ne doit pas
 * condamner la page. 3 essais.
 * ⚠ Le proxy exige la forme `?p=` (voir le commentaire long de la copie de
 *   l'ARTICLE) : `vercel.json` réécrit `/api/tf/<chemin>` → `/api/tf?p=<chemin>`
 *   et le rewrite CONSOMME la query string d'origine.
 */
async function lirePage(chemin) {
  let dernierStatut = 0
  for (let essai = 1; essai <= 3; essai++) {
    const cibles = [
      TF_PROXY + '?p=' + encodeURIComponent(chemin.replace(/^\/+/, '')),  // les deux
      TF_DIRECT + chemin,                                                 // direct
    ]
    for (const url of cibles) {
      try {
        const r = await fetch(url, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(12000) }).catch(() => null)
        if (r && r.ok) return r
        if (r) dernierStatut = r.status
      } catch (e) { /* essai suivant */ }
    }
    if (essai < 3) await new Promise((r) => setTimeout(r, 700 * essai))
  }
  throw new Error(`source injoignable après 3 essais${dernierStatut ? ` (dernier HTTP ${dernierStatut})` : ''}`)
}

/* ─────────────────────────── les libellés des tableaux ────────────────────── */

export const TF_ALIAS = {
  topcotesdirect: 'topCotesDirect',
  topchevaux: 'topChevaux',
  toppalmares: 'topPalmares',
  topforme: 'topForme',
  topclasse: 'topClasse',
  topjockeys: 'topJockeys',
  topdrivers: 'topJockeys',
  topentraineurs: 'topEntraineurs',
  toptrainer: 'topEntraineurs',
  aptitudeplace: 'aptitudePlace',
  aptitude1er: 'aptitudeGagnant',
  aptitudegagnant: 'aptitudeGagnant',
  topchronos: 'topChronos',
  topcordes: 'topCordes',
  topcordespmu: 'topCordes',
  topposition: 'topPosition',
  ecartschevaux: 'ecartsChevaux',
  ecarts: 'ecartsChevaux',
  incontournables: 'incontournables',
  pouruneplace: 'pourUnePlace',
  outiders: 'outiders',
  outsiders: 'outiders',
  lasynthese: 'syntheseTf',
  synthese: 'syntheseTf',
}

function cle(lbl) {
  return String(lbl).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')
}

/** « 1 - 16 - 10 » → ['1','16','10'] */
function nums(txt) {
  const n = String(txt).match(/\d+/g)
  return n || []
}

const texte = (x) => String(x)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&#039;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&agrave;/g, 'à')
  .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)) } catch (e) { return '' } })
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim()

/** Fenêtre de texte SANS balises autour d'un marqueur (les <strong> coupent les regex). */
export function fenetreSansBalises(html, marqueur, longueur = 500) {
  const i = String(html).indexOf(marqueur)
  if (i < 0) return ''
  return String(html).slice(i, i + longueur).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
}

/* ═══════════════════════ LES 16 TABLEAUX « Études / Analyses » ══════════════ */

/**
 * Le tableau « Top Cotes Direct · Top Chevaux · … · La Synthèse ».
 * ⚠ Une ligne dont la 2ᵉ cellule est VIDE reste VIDE : aller chercher la
 *   valeur de la ligne suivante décalait tout (bug du 04/10/2026, corrigé
 *   dans la copie de l'ARTICLE — la correction est reprise ici).
 */
export function parseTopsTf(html) {
  const h = String(html)
  if (!/Top Chevaux/i.test(h)) return {}

  const tops = {}
  // le bloc « Top10 des Cotes de Références » : ses <td> ne sont pas toujours
  // dans un <tr>. On le lit donc au marqueur, jusqu'à la fin de SON tableau.
  const iTop = h.search(/Top10 des Cotes/i)
  if (iTop >= 0) {
    const finTop = h.indexOf('</table>', iTop)
    const seg = h.slice(iTop, finTop > 0 ? finTop : iTop + 2000)
    for (const m of seg.matchAll(/(chevaux|drivers|entraineurs)\s*:\s*([\d\s\-–]+)/gi)) {
      const k10 = { chevaux: 'top10chevaux', drivers: 'top10drivers', entraineurs: 'top10entraineurs' }[m[1].toLowerCase()]
      if (k10 && !tops[k10]) tops[k10] = nums(m[2])
    }
  }
  for (const tb of h.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...tb[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((c) => c[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
    if (cells.length === 1) {
      const m10 = cells[0].match(/^(chevaux|drivers|entraineurs)\s*:\s*([\d\s\-–]+)$/i)
      if (m10) {
        const k10 = { chevaux: 'top10chevaux', drivers: 'top10drivers', entraineurs: 'top10entraineurs' }[m10[1].toLowerCase()]
        if (k10 && !tops[k10]) tops[k10] = nums(m10[2])
      }
      continue
    }
    if (cells.length < 2) continue
    const k = TF_ALIAS[cle(cells[0])]
    if (!k) continue
    tops[k] = nums(cells[1])          // [] quand la cellule est vide
  }
  return tops
}

/** Tableau Aptitude : N° Cheval Courses Victoires Placés %V %P AptG AptP */
export function parseAptitudesTf(html) {
  const h = String(html)
  const i = h.indexOf('Aptitude G</th>')
  if (i < 0) return []
  const fin = h.indexOf('</table>', i)
  const seg = h.slice(i, fin > 0 ? fin : i + 25000)
  const out = []
  for (const m of seg.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => texte(c[1]))
    if (cells.length < 9) continue
    const num = Number(cells[0])
    if (!Number.isFinite(num) || num < 1) continue
    out.push({
      num, cheval: cells[1],
      courses: Number(cells[2]) || null, victoires: Number(cells[3]) || 0, places: Number(cells[4]) || 0,
      pctV: cells[5] || null, pctP: cells[6] || null, aptG: cells[7] || null, aptP: cells[8] || null,
    })
  }
  return out
}

/** « Synthèse des % : 3 - 9 - 1 - 6 - 4 - 8 - 5 - 10 » → « 3 - 9 - … » */
export function parseSynthesePctTf(html) {
  const m = fenetreSansBalises(html, 'Synthèse des %').match(/:\s*((?:\d+\s*-\s*){1,}\d+)/)
  return m ? m[1].trim() : ''
}

/** « Pronostic, une analyse … et IA » → [« 3 - 5 - 6 - 8 - 2 - 7 », « 3 - 4 », …] */
export function parsePronosTf(html) {
  const h = String(html)
  const i = h.indexOf('Pronostic, une analyse')
  if (i < 0) return []
  const seg = h.slice(i, i + 3000)
  const out = []
  for (const m of seg.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = texte(m[1]).replace(/^[►\s]+/, '')
    if (/(\d+\s*-\s*){2,}\d+/.test(t)) out.push(t)
    if (out.length >= 3) break
  }
  return out
}

/* ═══════════════════════════════ LES OUTILS ═════════════════════════════════ */

/** Le nom court d'une pastille, lu dans son URL (jamais deviné). */
function nomPastille(url, titre) {
  const m = url.match(/mode=([a-z]+)/i)
  if (m) return { standard: 'standard', custom: 'custom', pro: 'pro', ia: 'IA', final: 'final', discipline: 'discipline' }[m[1].toLowerCase()] || m[1]
  const a = url.match(/astuce(\d+)/i)
  if (a) return 'matrice ' + a[1]
  if (/matricedv3/i.test(url)) return 'matrice'
  return titre.slice(0, 22)
}

/**
 * LES OUTILS DE LA PAGE, tels qu'elle les publie — rien n'est calculé ici.
 *
 *   pastilles  les carrés de couleur : `<a class="btnAction" href=… style="background:#…" title=…>`
 *   boutons    les boutons verts : `<button onclick="window.open('<url>'…)">libellé</button>`
 *
 * On ne garde que ce qui PORTE une URL : les boutons de formulaire
 * (Appliquer, Tout cocher…) ne veulent rien dire hors de la page d'origine.
 */
export function parseOutilsTf(html) {
  const h = String(html)

  const pastilles = []
  for (const m of h.matchAll(/<a\s[^>]*class="btnAction"[^>]*>[\s\S]{0,600}?<\/a>/gi)) {
    const t = m[0]
    const url = (t.match(/href="([^"]+)"/) || [])[1] || ''
    if (!url) continue
    const titre = (t.match(/title="([^"]*)"/) || [])[1] || ''
    const couleur = (t.match(/background\s*:\s*(#[0-9a-fA-F]{3,6})/) || [])[1] || '#888'
    const nom = nomPastille(url, titre) + (/view=compact/i.test(url) ? ' compact' : '')
    pastilles.push({ nom, titre, couleur, url: url.replace(/&amp;/g, '&') })
  }

  const boutons = []
  for (const m of h.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const url = (m[1].match(/window\.open\('([^']+)'/) || [])[1] || ''
    if (!url) continue
    const titre = (m[1].match(/title="([^"]*)"/) || [])[1] || ''
    const libelle = texte(m[2]).replace(/^window.*?\);\s*/, '').slice(0, 40)
    if (!libelle) continue
    boutons.push({ libelle, titre, url: url.replace(/&amp;/g, '&') })
  }

  /* les 4 outils mis en avant par la page (bordure verte dans la capture),
     reconnus par leur FICHIER — pas par leur libellé, qui peut changer. */
  const CLE = ['sdin.php', 'matricedv3.php', 'zonetri.php', 'ereparti-turf-france.php']
  for (const b of boutons) b.vedette = CLE.some((f) => b.url.includes('/' + f))

  return { pastilles, boutons }
}

/* ══════════════════════════ LE PROGRAMME (le pays) ═════════════════════════ */

/**
 * Toutes les courses du jour telles que la source les publie.
 * → Map « R1-C1 » → { pays, hippodrome, nom, heure, discipline, distance,
 *                      partants, conditions, arrivee }
 * ⚠ C'est LA façon d'obtenir le `pays` : il n'est pas devinable (ROYAUME-UNI,
 *   PAYS-BAS, ETATS-UNIS…), et reu.php le refuse s'il est faux.
 */
export function parseProgrammeTf(html) {
  const h = String(html).replace(/&amp;/g, '&')
  const out = new Map()
  for (const m of h.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    /* ⚠ le pays peut être ACCENTUÉ et donc ENCODÉ dans le lien (SUÈDE →
       `SU%C3%88DE`) : on prend la valeur entière jusqu'au séparateur, puis on
       la décode. Sinon on ne lisait que « SU » (bug mesuré le 10/10 : les
       fichiers d'archive s'appelaient `…_C12_SU.json`). */
    const lien = m[1].match(/view=detail&date=(\d{4}-\d{2}-\d{2})&reunion=(R\d+)&course=(C\d+)&pays=([^&"'>]+)/)
    if (!lien) continue
    let pays = lien[4]
    try { pays = decodeURIComponent(pays.replace(/\+/g, ' ')) } catch (e) { /* laissé tel quel */ }
    pays = pays.replace(/\s+/g, ' ').trim().toUpperCase()
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => texte(c[1]))
    const k = lien[2] + '-' + lien[3]
    if (out.has(k)) continue
    out.set(k, {
      reunion: Number(lien[2].slice(1)), course: Number(lien[3].slice(1)), date: lien[1], pays,
      arrivee: nums(cells[0] || '').slice(0, 5).map(Number),
      hippodrome: cells[1] || '', nom: cells[5] || '', heure: cells[4] || '',
      discipline: cells[6] || '', distance: Number(cells[7]) || null,
      conditions: (cells[8] || '').replace(/Terrain\s*:.*$/i, '').trim(),
      terrain: ((cells[8] || '').match(/Terrain\s*:\s*([^0-9]+)/i) || [])[1]?.trim() || '',
      partants: Number(cells[9]) || null,
      prix: cells[10] || '',
    })
  }
  return out
}

/**
 * LA BARRE DES RÉUNIONS — l'en-tête collant de LA MÊME page (reu.php). Elle
 * donne, pour chaque réunion :
 *
 *   · son NOM tel que le site l'écrit (« ZURICH », pas « Dielsdorf » — la source
 *     de chevaux nomme certains hippodromes autrement) ;
 *   · son TERRAIN du jour (« Très souple 4.0 »), son nombre de courses, ses
 *     disciplines, et si elle porte le Quinté (`class="quinte"`).
 *
 * → [{ nom, terrain, courses, disciplines, quinte }]  dans l'ordre des R.
 */
export function parseReunionsTf(html) {
  const h = String(html).replace(/&amp;/g, '&')
  const out = []
  const re = /<a class="([^"]*)" href="#[^"]*">([^<]*)<\/a>\s*<div class="tooltip-content">([\s\S]*?)<\/div>/g
  for (const m of h.matchAll(re)) {
    const nom = texte(m[2])
    if (!nom) continue
    const corps = m[3]
    const champ = (libelle) => {
      const mm = corps.match(new RegExp('<' + 'strong>' + libelle + '[^<]*</strong>\\s*</td>\\s*<td>([\\s\\S]*?)</td>', 'i'))
      return mm ? texte(mm[1].replace(/<[^>]+>/g, ' ')).trim() : ''
    }
    out.push({
      nom,
      terrain: champ('Terrain'),
      courses: Number(champ('Courses')) || null,
      disciplines: champ('Disciplines'),
      quinte: /quinte/i.test(m[1]),
    })
  }
  return out
}

/** Le programme du jour : UN appel, gardé en mémoire pour la session. */
const cacheProg = new Map()          // date → { prog, reunions }
async function pageProgTf(date) {
  if (cacheProg.has(date)) return cacheProg.get(date)
  const r = await lirePage(`/php/reu.php?view=program&date=${date}`)
  const html = await r.text()
  const v = { prog: parseProgrammeTf(html), reunions: parseReunionsTf(html) }
  cacheProg.set(date, v)
  return v
}
export async function chargerProgrammeTf(date) {
  return (await pageProgTf(date)).prog
}
/** La barre des réunions du jour : le nom, le terrain, les disciplines. */
export async function reunionsTf(date) {
  return (await pageProgTf(date)).reunions
}
/* ═════════════════════ RETROUVER LA COURSE DANS LA SOURCE ══════════════════
 *
 * ⚠ LE PROBLÈME, MESURÉ LE 18/10/2026
 *   Le programme de la page ne porte le n° de réunion PMU que de **4 réunions
 *   sur 20** (`pmuNumber` vaut 0 partout ailleurs : Dielsdorf, Angers, Hyères,
 *   Maure-de-Bretagne…). Une clé `R0-C1` ne veut rien dire pour la source →
 *   le bloc n'apparaissait que sur le Quinté et les 3 autres réunions
 *   numérotées. Or la source publie 11 réunions le 18/10, et 12 le 17/10.
 *
 * ⚠ LA SOLUTION
 *   L'hippodrome, lui, est toujours là — et c'est le MÊME des deux côtés :
 *   « Bordeaux - Le Bouscat » = « LE BOUSCAT », « ParisLongchamp » =
 *   « PARISLONGCHAMP », « Maure-de-Bretagne » = « MAURE DE BRETAGNE ».
 *   On apparie donc par nom (l'un contient l'autre), puis on prend le MÊME
 *   numéro de course. Un nom de moins de 5 lettres ne sert pas d'ancre.
 *   Le n° de réunion reste prioritaire quand la page le donne : il a été
 *   vérifié identique à celui de la source (R1 ParisLongchamp, R2 Dielsdorf =
 *   « ZURICH », R3 Caen, R6 Tarbes…).
 */

/** « Bordeaux - Le Bouscat » et « LE BOUSCAT » → « BORDEAUXLEBOUSCAT ». */
export function normHippo(t) {
  return String(t || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '')
}

/** « PRIX RIEUSSEC » === « Prix Rieussec » → même course. */
function memeCourseTf(ligne, nom, distance) {
  if (distance && ligne.distance && Math.abs(Number(distance) - ligne.distance) > 50) return false
  const a = normHippo(nom)
  const b = normHippo(ligne.nom)
  if (a.length < 6 || b.length < 6) return true          // rien de fiable à comparer
  return a.includes(b) || b.includes(a) || a.slice(0, 14) === b.slice(0, 14)
}

/** Index du programme du jour : par réunion, par hippodrome, et sa barre. */
const cacheIndex = new Map()
export async function indexTf(date) {
  if (cacheIndex.has(date)) return cacheIndex.get(date)
  const prog = await chargerProgrammeTf(date)
  const reunions = await reunionsTf(date).catch(() => [])
  const parReunion = new Map()
  const parHippo = new Map()
  for (const c of prog.values()) {
    if (!parReunion.has(c.reunion)) parReunion.set(c.reunion, [])
    parReunion.get(c.reunion).push(c)
    const h = normHippo(c.hippodrome)
    if (h && !parHippo.has(h)) parHippo.set(h, c.reunion)
  }
  const idx = { prog, reunions, parReunion, parHippo }
  cacheIndex.set(date, idx)
  return idx
}

/** Les infos de la barre pour un hippodrome donné : terrain, disciplines, nom. */
export function metaReunion(idx, hippodrome) {
  const h = normHippo(hippodrome)
  if (!h) return null
  return (idx.reunions || []).find((r) => normHippo(r.nom) === h) || null
}

/**
 * Le n° de réunion de la source pour une course de la page.
 * → un nombre, ou `null` si la source ne publie pas cette réunion.
 */
export function reunionSource(idx, reunion, hippodrome) {
  if (reunion && idx.parReunion.has(Number(reunion))) return Number(reunion)
  const cible = normHippo(hippodrome)
  if (cible.length >= 5) {
    for (const [h, r] of idx.parHippo) {
      if (h.length >= 5 && (h.includes(cible) || cible.includes(h))) return r
    }
  }
  return null
}

/* ══════════════════════ LE BLOC D'UNE COURSE, PRÊT À AFFICHER ═══════════════ */

const cacheEtudes = new Map()

/**
 * « Études, Analyses, Synthèse et Pronostics » d'UNE course.
 * → { pays, reunion, tops, aptitudes, synthesePct, pronos, outils }
 * Renvoie `null` si la source ne publie pas cette course (hors de sa
 * couverture) : la page le dit alors en une ligne, sans bloc vide.
 *
 * `course` = l'objet de la page : { reunion, num, hippodrome, nom, distance }.
 */
export async function chargerEtudesTf(date, course) {
  const c = course || {}
  const num = Number(c.num)
  if (!date || !Number.isFinite(num) || num < 1) return null

  let r = null
  let pays = ''
  if (c.tf && c.tf.reunion) {
    /* la liste du jour SAIT déjà de quelle réunion il s'agit (elle vient du
       programme PMU) : aucune recherche à refaire, aucun risque d'erreur. */
    r = Number(c.tf.reunion)
    pays = c.tf.pays || ''
  } else {
    const idx = await indexTf(date).catch(() => null)
    if (!idx) return null
    r = reunionSource(idx, c.reunion, c.hippodrome)
    if (r == null) return null
    const ligne = idx.prog.get(`R${r}-C${num}`)
    if (!ligne) return null
    if (!memeCourseTf(ligne, c.nom, c.distance)) return null
    pays = ligne.pays
  }

  const k = `${date}_R${r}_C${num}`
  if (cacheEtudes.has(k)) return cacheEtudes.get(k)

  let html = ''
  for (const essaiPays of [...new Set([pays, 'FRANCE'].filter(Boolean))]) {
    try {
      const resp = await lirePage(`/php/reu.php?view=detail&date=${date}&reunion=R${r}&course=C${num}&pays=${encodeURIComponent(essaiPays)}`)
      const t = await resp.text()
      if (/Top Chevaux/i.test(t) || /Pronostic, une analyse/i.test(t)) { html = t; break }
    } catch (e) { /* pays suivant */ }
  }
  if (!html) return null

  const res = {
    pays,
    reunion: r,
    course: num,
    tops: parseTopsTf(html),
    aptitudes: parseAptitudesTf(html),
    synthesePct: parseSynthesePctTf(html),
    pronos: parsePronosTf(html),
    outils: parseOutilsTf(html),
  }
  if (!Object.keys(res.tops).length && !res.pronos.length && !res.outils.pastilles.length) return null
  cacheEtudes.set(k, res)
  return res
}
