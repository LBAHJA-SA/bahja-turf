/* =============================================================================
 * backend/ARTICLE/turfFrance.js
 *
 * ⛔ UNE COPIE PRIVÉE, VOLONTAIREMENT.
 *
 * src/lib/turfFrance.js était lu par Admin.jsx (page supprimée). On ne le modifie pas et on ne
 * l'importe pas ici : si cette page a un jour besoin de changer sa source,
 * elle ne doit pas casser l'Admin.
 *
 * La seule page de turf-france qui porte les 16 tableaux du Quinté est
 *   https://www.turf-france.com/php/tqqjour.php?date=0
 * Elle ne renvoie AUCUN en-tête CORS : on passe par le proxy Vite `/tf`
 * (voir vite.config.js). En prod il faut un reverse-proxy équivalent.
 * ========================================================================== */

const TF_PROXY = '/api/tf'
const TF_DIRECT = 'https://www.turf-france.com'

/**
 * Va chercher la page, en réessayant : un raté réseau isolé ne doit pas
 * condamner la page (« turf-france injoignable » du 04/10 alors que le
 * proxy répondait 200 une minute plus tard).
 * 3 essais, 12 s max chacun. Le direct est tenté à chaque tour car le
 * proxy Vite peut redémarrer entre deux essais.
 */
async function lirePageTqq(chemin) {
  let dernierStatut = 0
  for (let essai = 1; essai <= 3; essai++) {
    for (const base of [TF_PROXY, TF_DIRECT]) {
      try {
        const r = await fetch(base + chemin, {
          headers: { Accept: 'text/html' },
          signal: AbortSignal.timeout(12000),
        }).catch(() => null)
        if (r && r.ok) return r
        if (r) dernierStatut = r.status
      } catch (e) { /* essai suivant */ }
    }
    if (essai < 3) await new Promise((r) => setTimeout(r, 800 * essai))
  }
  throw new Error(`turf-france injoignable après 3 essais${dernierStatut ? ` (dernier HTTP ${dernierStatut})` : ''}`)
}

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
}

function cle(lbl) {
  return String(lbl).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')
}

/** « 1 - 16 - 10 » → ['1','16','10'] */
function nums(txt) {
  const n = String(txt).match(/\d+/g)
  return n || []
}

/**
 * ⚠ Une ligne dont la 2e cellule est VIDE reste VIDE.
 *   Le 04/10, « Top Cotes Direct » et « Pour une place » ne sont pas publiés :
 *   aller chercher la valeur de la ligne suivante donnait « Top Cotes Direct =
 *   1 - 16 - 10 - 14 », qui est en réalité le Top Chevaux. On ne le fait plus.
 *
 * ⭐ LA MÊME PAGE porte aussi TOUTE la course :
 *      l'entête  → heure · nom · discipline · distance · corde · classe ·
 *                  partants · montant · conditions
 *      le tableau→ N° · Cheval · cotes réf. · âge · sexe · chrono estimé ·
 *                  musique · gains · corde · poids · valeur · cotes PMU ·
 *                  jockeys · cotes réf. · entraîneurs · cotes réf. ·
 *                  propriétaire · dernier départ
 *   Une seule source, un seul appel, pas de casacourses, pas de démo.
 */
export function parseTqqJour(html) {
  const h = String(html)
  if (!/Top Chevaux/i.test(h)) return {}

  const tops = {}
  // le bloc « Top10 des Cotes de Références » : ses <td> ne sont pas
  // toujours dans un <tr> (le « Chevaux » du 05/10 n'en a pas).
  // On le lit donc au marqueur, jusqu'à la fin de SON tableau.
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
    // repli : le même bloc bien formé (« Label : nums » dans UNE cellule).
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

/** Casaque : URL absolue (le HTML donne parfois //hôte/chemin). */
function normaliseSilk(u) {
  if (!u) return null
  if (/^https?:/i.test(u)) return u
  if (u.startsWith('//')) return 'https:' + u
  if (u.startsWith('/')) return TF_DIRECT + u
  return u
}

/* ═══════════════════════════ LA COURSE ET LES PARTANTS ══════════════════════ */

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

/** « 4,7 » → 4.7 ; « — » → null */
const nombre = (x) => {
  const t = texte(x).replace(',', '.').match(/-?\d+(?:\.\d+)?/g)
  return t ? Number(t[0]) : null
}

/** « 28 jours » → 28 */
const jours = (x) => {
  const n = texte(x).match(/(\d+)\s*jours?/i)
  return n ? Number(n[1]) : null
}

const SENS = { G: 'gauche', D: 'droite' }

/**
 * L'entête de la course. On lit les <th> puis la ligne de valeurs qui suit :
 *   Heure | Prix | Discipline | Distance | Corde | Partants | Montant Prix | Conditions
 * Attention : les <th> sont aussi dans le tableau des partants, on s'arrête donc
 * au PREMIER « Conditions ».
 */
export function parseEnteteTqq(html) {
  const h = String(html)
  // on travaille sur le HTML brut : les <th> sont des balises, pas du texte
  const iHeure = h.search(/>\s*Heure\s*</i)
  if (iHeure < 0) return null

  // les valeurs suivent l'entête, dans leurs propres <td>
  const valeurs = []
  for (const m of h.slice(iHeure, iHeure + 9000).matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)) {
    valeurs.push(texte(m[1]))
  }
  // Heure | Prix | Discipline | Distance | Corde+Classe | Partants | Montant | Conditions
  // ⚠ sur reu.php, Corde et Classe sont dans LA MÊME cellule (« CORDE_DROITE GROUPE I »)
  const [heure, prix, discipline, distance, piste, partants, montant, conditions] = valeurs
  const cellulePiste = String(piste || '')

  const nom = texte(prix).replace(/\s*\(Quinte\+?\)\s*$/i, '').trim()
  return {
    heure: heure || '',
    nom,
    discipline: discipline || '',
    distance: Number(String(distance).replace(/\D/g, '')) || null,
    corde: /DROITE/i.test(cellulePiste) ? 'droite' : /GAUCHE/i.test(cellulePiste) ? 'gauche' : /LIGNE/i.test(cellulePiste) ? 'ligne droite' : '',
    classe: (cellulePiste.match(/GROUPE [IV1]+|GROUP [1-3]|HANDICAP|LISTED|CLASSE \d|MAIDEN/i) || [])[0] || '',
    nbPartants: Number(String(partants).replace(/\D/g, '')) || null,
    montant: Number(String(montant).replace(/\D/g, '')) || null,
    conditions: conditions || '',
  }
}

/**
 * Les partants. Chaque ligne est <tr data-num='N'>.
 *
 * ⚠ PAS de positions en dur : les tables étrangères bougent (trot belge =
 *   Distance/Def au lieu de Corde/Poids, sans Œil ni Valeur → 19 cellules
 *   au lieu de 21). On lit la carte des colonnes dans le <thead>, et on ne
 *   retombe sur les positions historiques (France) qu'en dernier recours.
 */
export function parsePartantsTqq(html) {
  const h = String(html)
  let carte = null
  const iT = h.search(/<table[^>]*id=['"]lstpartant['"]/i)
  if (iT >= 0) {
    const finHead = h.indexOf('</thead>', iT)
    const noms = [...h.slice(iT, finHead > 0 ? finHead : iT + 3000).matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
      .map((x) => texte(x[1]).toLowerCase().replace(/\./g, ''))
    if (noms.length >= 10) {
      carte = {}
      let refs = 0
      noms.forEach((t, i) => {
        if (/^n°$|numero/.test(t)) carte.num = i
        else if (/cheval/.test(t)) carte.cheval = i
        else if (/cotes ref/.test(t)) { refs++; carte[refs === 1 ? 'coteRef' : refs === 2 ? 'coteRefJockey' : 'coteRefEntraineur'] = i }
        else if (/^age$/.test(t)) carte.age = i
        else if (/sexe/.test(t)) carte.sexe = i
        else if (/chron|record/.test(t)) carte.chrono = i
        else if (/musique/.test(t)) carte.musique = i
        else if (/gains/.test(t)) carte.gains = i
        else if (/corde/.test(t)) carte.corde = i
        else if (/poids/.test(t)) carte.poids = i
        else if (/valeur/.test(t)) carte.valeur = i
        else if (/^cotes?\s*$/.test(t)) carte.cote = i
        else if (/jockey|driver/.test(t)) carte.driver = i
        else if (/entrain/.test(t)) carte.entraineur = i
        else if (/propri/.test(t)) carte.proprietaire = i
        else if (/dern/.test(t)) carte.dernier = i
        else if (/^def/.test(t)) carte.def = i
      })
      if (carte.num == null) carte = null
    }
  }
  // repli : positions historiques France (21 cellules)
  const F = { num: 2, cheval: 3, coteRef: 4, age: 5, sexe: 6, chrono: 7, musique: 8, gains: 9, corde: 10, poids: 11, valeur: 13, cote: 14, driver: 15, coteRefJockey: 16, entraineur: 17, coteRefEntraineur: 18, proprietaire: 19, dernier: 20 }
  const C = carte || F
  const besoin = Math.max(...Object.values(C).filter((x) => Number.isFinite(x)))

  const sortie = []
  for (const m of h.matchAll(/<tr[^>]*data-num=['"](\d+)['"][^>]*>([\s\S]*?)<\/tr>/gi)) {
    const c = [...m[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => texte(x[1]))
    if (c.length <= besoin) continue
    const n = Number(c[C.num])
    if (!Number.isFinite(n) || n < 1) continue

    const cordeNum = C.corde != null ? nombre(c[C.corde]) : null
    const cotePmu = C.cote != null ? nombre(c[C.cote]) : null
    const img = (m[2].match(/<img[^>]*src=['"]([^'"]+)['"]/i) || [])[1] || null
    const lit = (k) => (C[k] != null ? c[C[k]] : '')
    sortie.push({
      num: n,
      cheval: lit('cheval'),
      // cote PMU : 0 ou « — » = pas encore publiée, ce n'est PAS 1/1
      cote: cotePmu != null && cotePmu > 1 ? cotePmu : null,
      coteRef: C.coteRef != null ? nombre(c[C.coteRef]) : null,
      age: C.age != null ? nombre(c[C.age]) : null,
      sexe: lit('sexe'),
      chrono: lit('chrono'),
      musique: lit('musique'),
      gains: C.gains != null ? nombre(c[C.gains]) : null,
      corde: cordeNum != null && cordeNum > 0 ? cordeNum : null,
      def: lit('def') || null,
      poids: C.poids != null ? nombre(c[C.poids]) : null,
      valeur: C.valeur != null ? nombre(c[C.valeur]) : null,
      driver: lit('driver'),
      coteRefJockey: lit('coteRefJockey') || null,
      entraineur: lit('entraineur'),
      coteRefEntraineur: lit('coteRefEntraineur') || null,
      silk: normaliseSilk(img),
      proprietaire: lit('proprietaire'),
      dernierPassage: C.dernier != null ? jours(c[C.dernier]) : null,
    })
  }
  return sortie.sort((a, b) => a.num - b.num)
}

/** 0 = aujourd hui, -1 = hier, 1 = demain. */
export async function chargerTopsTurfFrance(dateOffset = 0) {
  const chemin = `/php/tqqjour.php?date=${dateOffset}`
  const r = await lirePageTqq(chemin)
  const tops = parseTqqJour(await r.text())
  if (!Object.keys(tops).length) throw new Error('aucun tableau lu')
  return tops
}

/**
 * L’identité VRAIE de la course, lue dans le nom de fichier que la page
 * elle-même fabrique : « ParisLongchamp-Le-03102026-Course-R1-C4.txt ».
 * C’est la seule preuve : ni le slug, ni la date demandée ne disent
 * quelle course la page affiche VRAIMENT.
 * → { hippodrome, date: « AAAA-MM-JJ », reunion: 1, course: 4 }
 */
export function parseIdentiteTqq(html) {
  const m = String(html).match(/([A-Za-zÀ-ÿ' -]+)-Le-(\d{2})(\d{2})(\d{4})-Course-R(\d+)-C(\d+)\.txt/)
  if (!m) return null
  const brut = m[1].trim().split(/\s+/).pop()
  const hippo = /^[A-ZÉÈÇ -]+$/.test(brut) && /[A-Z]/.test(brut)
    ? brut.toLowerCase().replace(/(^|\s|-)[a-zà-ÿ]/g, (x) => x.toUpperCase())
    : brut
  return {
    hippodrome: hippo,
    date: m[4] + '-' + m[3] + '-' + m[2],
    reunion: Number(m[5]),
    course: Number(m[6]),
  }
}

/** Mini-slug pour l’URL (aucune donnée transportée : la page recharge tout). */
export function slugNorm(t) {
  return String(t || 'course').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Paris → GMT (COPIE de backend/PROGRAMME/donnees.js : chaque page ses outils). */
export function parisVersGMT(dateAAAA_MM_JJ, h, mi) {
  const part = String(dateAAAA_MM_JJ).split('-').map(Number)
  const mur = Date.UTC(part[0], part[1] - 1, part[2], Number(h), Number(mi))
  let devine = mur
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(devine)).map((x) => [x.type, x.value]))
    const commeUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute))
    devine += mur - commeUTC
  }
  const r = new Date(devine)
  return String(r.getUTCHours()).padStart(2, '0') + ':' + String(r.getUTCMinutes()).padStart(2, '0')
}

/** "16:05" (heure FR) ou timestamp → "14:05 GMT". */
export function heureGMT(dateAAAA_MM_JJ, time) {
  const brut = String(time ?? '')
  if (/^\d{10,}$/.test(brut)) {
    const ms = brut.length > 10 ? Number(brut) : Number(brut) * 1000
    if (!Number.isFinite(ms)) return brut.slice(0, 5)
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(new Date(ms)) + ' GMT'
  }
  const m = brut.match(/(\d{1,2}):(\d{2})/)
  if (!m) return brut.slice(0, 5)
  return parisVersGMT(dateAAAA_MM_JJ, m[1], m[2]) + ' GMT'
}

/** Jours entre une date « AAAA-MM-JJ » et aujourd’hui : 0, -1, -4… */
export function offsetJour(dateCible) {
  const part = String(dateCible).split('-').map(Number)
  const cible = Date.UTC(part[0], part[1] - 1, part[2])
  const now = new Date()
  const ajd = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((cible - ajd) / 86400000)
}

/**
 * ⭐ LA SOURCE UNIQUE : la course, ses partants ET les 15 tableaux.
 *
 * ⚠ bug du 04/10/2026 : on appelait TOUJOURS date=0 (aujourd’hui).
 * Résultat : le 30/09, le 02/10 et le 03/10 affichaient TOUS l’Arc du 04/10
 * (mêmes 16 chevaux). Maintenant l’offset suit la date demandée, et on
 * REFUSE d’afficher si la page ne porte pas le jour demandé.
 */
export async function chargerPageTqq(dateOffset = 0, dateAttendee = null) {
  const chemin = `/php/tqqjour.php?date=${dateOffset}`
  const r = await lirePageTqq(chemin)
  const html = await r.text()
  const partants = parsePartantsTqq(html)
  if (!partants.length) throw new Error('aucun partant lu')
  const identite = parseIdentiteTqq(html)
  if (dateAttendee && identite && identite.date !== dateAttendee) {
    throw new Error(`turf-france affiche le Quinté du ${identite.date}, pas du ${dateAttendee}`)
  }
  return { entete: parseEnteteTqq(html), partants, tops: parseTqqJour(html), identite }
}

/* ═══════════════════════════ REU.PHP — LE CONTENU COMPLET ═══════════════════
 * reu.php?view=detail&date=AAAA-MM-JJ&reunion=Rn&course=Cm&pays=XX porte
 * TOUTE la course : entête + 21 colonnes de partants + aptitude + tops +
 * arrivée. tqqjour.php ne reste qu’en secours (cette page ne couvre que
 * le Quinté des jours proches).
 * ══════════════════════════════════════════════════════════════════════════ */

const MOIS_FR = { janvier: '01', 'février': '02', fevrier: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', 'août': '08', aout: '08', septembre: '09', octobre: '10', novembre: '11', 'décembre': '12', decembre: '12' }

/** « dimanche 4 octobre 2026 » → { date: « 2026-10-04 », dateLongue, jour: « dimanche » } */
export function parseDateFr(t) {
  const m = String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/)
  if (!m) return null
  const mois = MOIS_FR[m[3]]
  if (!mois) return null
  const date = m[4] + '-' + mois + '-' + String(m[2]).padStart(2, '0')
  return { date, jour: m[1], dateLongue: m[1] + ' ' + m[2] + ' ' + m[3] + ' ' + m[4] }
}

/** « Liste des Partants hippodrome X - R1/C5 - du dimanche 4 octobre 2026 » */
export function parseIdentiteReu(html) {
  const m = String(html).match(/Liste des Partants\s+hippodrome\s+([^<]{3,70}?)\s*-\s*R(\d+)\/C(\d+)\s*-\s*du\s+([a-zéû]+\s+\d{1,2}\s+[a-zéû]+\s+\d{4})/i)
  if (!m) return null
  const d = parseDateFr(m[4])
  if (!d) return null
  // ⚠ « MONS (GHLIN) » : les parenthèses font partie du nom
  const brut = m[1].trim()
  const hippo = /^[A-ZÉÈÇ -]+$/.test(brut) && /[A-Z]/.test(brut)
    ? brut.toLowerCase().replace(/(^|\s|-)[a-zà-ÿ]/g, (x) => x.toUpperCase())
    : brut
  return { hippodrome: hippo, date: d.date, dateLongue: d.dateLongue, jour: d.jour, reunion: Number(m[2]), course: Number(m[3]) }
}

/** L’arrivée quand elle est publiée : [4, 5, 8, 17, 3]. Sinon null. */
export function parseArriveeReu(html) {
  const t = fenetreSansBalises(html, 'Arrivée', 800)
  if (!t) return null
  const m = t.match(/(\d+)\s*[-–]\s*(\d+)\s*[-–]\s*(\d+)\s*[-–]\s*(\d+)\s*[-–]\s*(\d+)/)
  if (!m) return null
  const nums = m.slice(1, 6).map(Number)
  // une vraie arrivée = 5 numéros de chevaux plausibles, pas un téléphone
  if (!nums.every((x) => x >= 1 && x <= 30)) return null
  return nums
}

/** Table Aptitude : N° Cheval Courses Victoires Placés %V %P AptG AptP */
export function parseAptitudesTqq(html) {
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
    out.push({ num, cheval: cells[1], courses: Number(cells[2]) || null, victoires: Number(cells[3]) || 0, places: Number(cells[4]) || 0, pctV: cells[5] || null, pctP: cells[6] || null, aptG: cells[7] || null, aptP: cells[8] || null })
  }
  return out
}

/** Fenêtre de texte SANS balises autour d'un marqueur (les <strong>, <span>… coupent les regex). */
export function fenetreSansBalises(html, marqueur, longueur = 500) {
  const i = String(html).indexOf(marqueur)
  if (i < 0) return ''
  return String(html).slice(i, i + longueur).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
}

/** « Synthèse des % : 3 - 9 - 1 - 6 - 4 - 8 - 5 - 10 » */
export function parseSynthesePct(html) {
  const m = fenetreSansBalises(html, 'Synthèse des %').match(/:\s*((?:\d+\s*-\s*){1,}\d+)/)
  return m ? m[1].trim() : ''
}

/** « Pronostic, une analyse Turf-France et IA » → [« 1 - 16 - … », …] */
export function parsePronosTf(html) {
  const h = String(html)
  const i = h.indexOf('Pronostic, une analyse Turf-France et IA')
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

/** Programme du jour : [{ hippodrome, pays, courses: [{ reunion, code, nom, heure, pays }] }] */
export function parseProgrammeReu(html) {
  const h = String(html)
  const reunions = []
  let cur = null
  for (const m of h.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi)) {
    const idm = m[1].match(/id="([^"]+)"/)
    if (idm) { cur = { hippodrome: idm[1].replace(/_/g, ' '), pays: '', courses: [] }; reunions.push(cur); continue }
    if (!cur) continue
    const lien = m[2].match(/\?view=detail&(amp;)?date=(\d{4}-\d{2}-\d{2})&(amp;)?reunion=(R\d+)&(amp;)?course=(C\d+)&(amp;)?pays=([A-Z ]+)/)
    if (!lien) continue
    if (cur.courses.some((c) => c.code === lien[6])) continue   // un lien par cellule : on déduplique
    const cells = [...m[2].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => texte(c[1]))
    // ⚠ le nom est la cellule JUSTE APRÈS l'heure — pas « la plus longue »
    //   (les Conditions sont un paragraphe entier et écrasaient le nom).
    const ih = cells.findIndex((c) => /^\d{1,2}:\d{2}$/.test(c))
    const heure = ih >= 0 ? cells[ih] : ''
    const nom = ih >= 0 ? (cells[ih + 1] || '') : ''
    if (!cur.pays) cur.pays = lien[8]
    cur.courses.push({ date: lien[2], reunion: lien[4], code: lien[6], pays: lien[8], nom, heure })
  }
  return reunions.filter((r) => r.courses.length)
}

/** ⭐ LA SOURCE PRINCIPALE : reu.php detail = la course EXACTE (R+C+date+pays). */
export async function chargerDetailReu(date, rNum, cNum, pays = 'FRANCE') {
  const chemin = `/php/reu.php?view=detail&date=${date}&reunion=R${rNum}&course=C${cNum}&pays=${pays}`
  const r = await lirePageTqq(chemin)
  const html = await r.text()
  const partants = parsePartantsTqq(html)
  if (!partants.length) throw new Error('reu.php : aucun partant lu')
  const identite = parseIdentiteReu(html)
  if (!identite) throw new Error('reu.php : course non identifiée')
  if (identite.date !== date || identite.reunion !== Number(rNum) || identite.course !== Number(cNum)) {
    throw new Error(`reu.php affiche ${identite.hippodrome} R${identite.reunion}-C${identite.course} du ${identite.date}, pas R${rNum}-C${cNum} du ${date}`)
  }
  return { entete: parseEnteteTqq(html), partants, tops: parseTqqJour(html), identite, arrivee: parseArriveeReu(html), aptitudes: parseAptitudesTqq(html), synthesePct: parseSynthesePct(html), pronos: parsePronosTf(html) }
}

/** Nom du fichier archive : même règle côté navigateur et côté collecteur. */
export function nomFichierCourse(date, r, c, pays) {
  return `${date}_R${r}_C${c}_${String(pays || 'FRANCE').replace(/\s+/g, '')}.json`
}

/** « 05,2 » → 5.2 ; vide → null. */
function refNum(x) {
  const m = String(x ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

/** Top 10 des numéros triés par une cote de référence croissante. */
function triRef(partants, f) {
  return (partants || [])
    .map((p) => ({ n: p.num, v: refNum(f(p)) }))
    .filter((x) => x.v != null)
    .sort((a, b) => a.v - b.v)
    .slice(0, 10)
    .map((x) => x.n)
}

/** Met le détail reu.php au format EXACT de la page (course + partants + tops + annexes). */
export function normaliserDetailReu(det, rNum, cNum, pays, source) {
  const e = det.entete || {}
  const idn = det.identite || {}
  return {
    v: 2,   // format d'archive : le lecteur ignore tout ce qui n'est pas v2
    pv: 4,   // version des PARSERS : quand un parser est corrigé, on monte pv
    source,  // et les entrées archivées avec l'ancien parsing sont ré-écrites
    race: {
      numOrdre: idn.course ?? cNum,
      nom: e.nom || '',
      prix: e.nom || '',
      heure: e.heure || '',
      distance: e.distance ?? null,
      discipline: e.discipline || '',
      corde: e.corde || '',
      classe: e.classe || '',
      conditions: e.conditions || '',
      montant: e.montant ?? null,
      arrivee: det.arrivee || null,
      dateLongue: idn.dateLongue || '',
      jour: idn.jour || '',
    },
    meeting: { num: idn.reunion ?? rNum, hippodrome: idn.hippodrome || 'Hippodrome', pays: String(pays || 'FRANCE').toUpperCase().startsWith('FR') ? 'FR' : String(pays) },
    participants: (det.partants || []).map((p) => ({
      num: p.num, cheval: p.cheval, driver: p.driver, entraineur: p.entraineur,
      cote: p.cote, coteRef: p.coteRef, musique: p.musique, gains: p.gains,
      age: p.age, sexe: p.sexe, poids: p.poids, valeur: p.valeur, chrono: p.chrono,
      coteRefJockey: p.coteRefJockey ?? null, coteRefEntraineur: p.coteRefEntraineur ?? null,
      silk: p.silk ?? null, proprietaire: p.proprietaire, dernierPassage: p.dernierPassage,
      depart: p.corde, def: p.def ?? null,
    })),
    // « Chevaux / Drivers / Entraineurs » : le bloc « Top10 des Cotes de
    // Références » publié par la source. triRef ne sert qu'en repli
    // (source sans bloc).
    tops: {
      chevaux: (det.tops?.top10chevaux?.length ? det.tops.top10chevaux : triRef(det.partants, (p) => p.coteRef)),
      drivers: (det.tops?.top10drivers?.length ? det.tops.top10drivers : triRef(det.partants, (p) => p.coteRefJockey)),
      entraineurs: (det.tops?.top10entraineurs?.length ? det.tops.top10entraineurs : triRef(det.partants, (p) => p.coteRefEntraineur)),
      ...(det.tops || {}),
    },
    aptitudes: det.aptitudes || [],
    synthesePct: det.synthesePct || '',
    pronosTf: det.pronos || [],
  }
}

/** Toutes les courses du jour, pour le sélecteur. */
export async function chargerProgrammeReu(date) {
  const r = await lirePageTqq(`/php/reu.php?view=program&date=${date}`)
  return parseProgrammeReu(await r.text())
}