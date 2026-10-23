/* =============================================================================
 * backend/PRESSE/donnees.js — LES DONNÉES DE LA PAGE PRESSE (18/10/2026)
 *
 * ⛔ CE FICHIER TOURNE DANS LE NAVIGATEUR. Aucun import `node:*`.
 *
 * ⚠ CE QUE L'UTILISATEUR A DEMANDÉ
 *   « une page de la presse : les nouvelles du jour sur ce que dit la presse,
 *     leurs pronostics, les déclarations des entraîneurs et des drivers, les
 *     articles et les nouvelles des chevaux. »
 *
 *   Ses journaux : La Gazette des Courses, Le Veinard avec Courses par Courses,
 *   Journaux Week-End, Paris-Turf, Parisien, Tiercé Magazine…
 *
 *   ⚠ PRÉCISION DU 18/10/2026, MOT POUR MOT : « je ne veux pas les nouvelles
 *     d'Equidia, je veux celles des journaux quotidiens et hebdomadaires. »
 *     Le ④ est donc allé chercher les journaux EUX-MÊMES — voir sa note.
 *
 *   ① LA REVUE DE PRESSE      la page « presse » de pronostics-turf.info
 *                             (proxy /api/pt) : chaque journal et ses 8 chevaux,
 *                             pour le Quinté du jour. 18 journaux le 18/10.
 *
 *   ② LES DÉCLARATIONS        api.equidia.fr … /courses/{date}/R{n}/C{m}/interview
 *                             → par cheval : la personne (« Carina Fey,
 *                             entraîneur »), sa NOTE sur 10 et son TEXTE complet.
 *                             C'est exactement « les déclarations des entraîneurs
 *                             et des drivers », et c'est la plus belle matière
 *                             de la page (16 déclarations sur le Quinté du 18/10).
 *
 *   ③ L'ANALYSE DU JOUR       … /courses/{date}/R{n}/C{m}/pronostic
 *                             → le chapeau, la présentation, les bases, les
 *                             belles chances, les outsiders, les délaissés, et
 *                             l'analyse de CHAQUE cheval avec la note du
 *                             journaliste et sa cote.
 *
 *   ④ LES JOURNAUX            LES ARTICLES DES JOURNAUX EUX-MÊMES, texte entier.
 *                             Deux titres joignables en clair le 18/10 :
 *                             Paris-Turf (via son API de contenu, `/api/ptf`) et
 *                             Le Veinard (via `/api/lv`). Les autres titres cités
 *                             par l'utilisateur sont payants ou ont disparu — le
 *                             détail, essai par essai, est au ⑤ des articles.
 *
 *   ⚠ QUI PASSE PAR QUOI
 *     · pronostics-turf.info (la revue de presse) → relais `/api/pt` (pas de CORS) ;
 *     · equidia `api.equidia.fr` (déclarations, analyse du jour, la course) →
 *       appel DIRECT en CORS ouvert ;
 *     · paris-turf.com (les articles)  → relais `/api/ptf` (clé + Cloudflare) ;
 *     · leveinard.com (les articles)   → relais `/api/lv` (pas de CORS).
 *
 * ⚠ LA RÈGLE DES PANNES : chaque bloc est indépendant. Un bloc qui échoue
 *   renvoie un objet vide et la page l'écrit — jamais un écran vide.
 * ========================================================================= */

const API_EQ = 'https://api.equidia.fr/api/public'
const PROG_CC = 'https://pro.casacourses.com/api/programme?date='

/* ══════════════════════════════ les outils ═══════════════════════════════ */

/** La date du jour au format de la source : « 2026-10-18 ». */
export function aujourdhui() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * Un GET JSON, avec deux reprises.
 * ⚠ L'API peut freiner : un 403 ou un 429 passager vaut une seconde tentative
 *   plutôt qu'un bloc vide. On attend donc 2 s puis 5 s avant de réessayer.
 */
async function json(url, essais = 3) {
  let derniere = null
  for (let i = 0; i < essais; i++) {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (r.ok) return r.json()
    derniere = r
    if ((r.status === 403 || r.status === 429 || r.status >= 500) && i < essais - 1) {
      await new Promise((res) => setTimeout(res, 2000 + i * 3000))
      continue
    }
    break
  }
  throw new Error(url.split('?')[0] + ' → HTTP ' + (derniere ? derniere.status : '?'))
}

/**
 * Un GET HTML, décodé selon le VRAI jeu de caractères de la page.
 * ⚠ `Response.text()` décode TOUJOURS en UTF-8 : la revue de presse est en
 *   windows-1252 et « Assiduité » y devenait « Assiduit� ». On lit donc les
 *   octets et on les décode d'après l'en-tête.
 */
async function htmlTexte(url) {
  const r = await fetch(url, { headers: { Accept: 'text/html,application/xhtml+xml' } })
  if (!r.ok) throw new Error(url.split('?')[0] + ' → HTTP ' + r.status)
  const type = r.headers.get('content-type') || ''
  const octets = await r.arrayBuffer()
  return new TextDecoder(/utf-?8/i.test(type) ? 'utf-8' : 'windows-1252').decode(octets)
}

const num = (x) => Number(String(x || '').replace(/\D/g, '')) || 0
const suite = (x) => (Array.isArray(x) ? x.map(Number).filter((n) => n > 0) : [])

/** « LUCAS QUENTIN » — le nom du journaliste, jamais vide.
 *  ⚠ Une signature qui porte le nom de la source devient « La rédaction » :
 *    la source ne s'écrit jamais à l'écran (règle de la maison). */
function nomAuteur(a) {
  if (!a) return ''
  const nom = [a.firstname, a.lastname].filter(Boolean).join(' ').trim()
  return /equidia/i.test(nom) ? 'La rédaction' : nom
}

/* ═══════════════════ ① LA COURSE DU JOUR (le Quinté) ═════════════════════ */

/**
 * Le Quinté du jour : sa réunion, sa course, son hippodrome.
 * → { r, c, hippodrome, nom, heure, distance, partants, date } ou null.
 * ⚠ la course est trouvée sur `sorec_quinte` — et la France d'abord : la source
 *   étiquette parfois un Quinté français en pays étranger (Reims le 14/10).
 */
export async function quinteDuJour(date) {
  const j = await json(PROG_CC + date)
  const toutes = []
  for (const m of j.meetings || []) {
    for (const c of m.races || []) {
      if (!(c.available_bet_types || []).includes('sorec_quinte')) continue
      toutes.push({ m, c })
    }
  }
  const fr = toutes.filter((x) => String(x.m.country || '').toUpperCase() === 'FR')
  const meilleur = fr[0] || toutes[0]
  if (!meilleur) return null
  const { m, c } = meilleur
  const course = {
    date,
    r: c.pmu_reunion || num(m.reunion_code),
    c: c.pmu_course || num(c.code),
    hippodrome: m.track || '',
    pays: m.country || '',
    nom: c.name || '',
    heure: c.time_hm || '',
    distance: c.distance || null,
    partants: c.starters || null,
    discipline: c.type || '',
  }

  /* ⚠ l'heure de la source casacourses est celle du Maroc (UTC+1) : le Quinté
     de ParisLongchamp y annonce 14:15 pour un départ à 15:15. On prend donc
     l'heure OFFICIELLE de la course dès qu'elle répond — sinon on se tait. */
  try {
    const officiel = await json(`${API_EQ}/v2/courses/${date}/R${course.r}/C${course.c}`)
    if (officiel) {
      if (officiel.heure_depart_course) course.heure = officiel.heure_depart_course
      else course.heure = ''
      if (officiel.liblong_prix_course) course.nom = officiel.liblong_prix_course
      if (officiel.nbdeclare_course) course.partants = officiel.nbdeclare_course
      if (officiel.discipline) course.discipline = officiel.discipline
    }
  } catch (e) { /* sans heure officielle, on n'affiche pas d'heure fausse */ }

  return course
}

/* ═══════════ ② LES DÉCLARATIONS DES ENTRAÎNEURS ET DES DRIVERS ═══════════ */

/**
 * Les déclarations du Quinté, la meilleure note d'abord.
 * → [{ num, cheval, personne, role, note, texte, auteur }]
 *   `personne` = « Carina Fey », `role` = « entraîneur » / « driver » / …
 */
export async function declarations(date, r, c) {
  const j = await json(`${API_EQ}/courses/${date}/R${r}/C${c}/interview`)
  const auteur = nomAuteur(j.author)
  const liste = (j.interview_partants || []).map((x) => {
    const brut = String(x.personne || '').trim()
    const m = brut.match(/^(.*?)\s*,\s*(.+)$/)          // « Carina Fey, entraîneur »
    return {
      num: x.partant ? Number(x.partant.num_partant) || null : null,
      cheval: (x.partant && x.partant.cheval && x.partant.cheval.nom_cheval) || '',
      personne: m ? m[1].trim() : brut,
      role: m ? m[2].trim() : '',
      note: x.note == null ? null : Number(x.note),
      texte: String(x.texte || '').trim(),
      auteur,
    }
  }).filter((x) => x.texte)
  return liste.sort((a, b) => (b.note || 0) - (a.note || 0) || (a.num || 0) - (b.num || 0))
}

/* ══════════════════ ③ L'ANALYSE DU JOURNALISTE DU JOUR ═══════════════════ */

/**
 * L'analyse complète de la course :
 *   { chapeau, presentation, auteur, bases, bellesChances, outsiders, delaisses,
 *     chevaux: [{ num, nom, note, cote, rang, texte }] }
 * Les quatre listes de numéros viennent de la source, telles quelles.
 */
export async function analyse(date, r, c) {
  const j = await json(`${API_EQ}/courses/${date}/R${r}/C${c}/pronostic`)
  const chevaux = (j.pronostic_analyses || []).map((x) => ({
    num: Number(x.num_partant) || null,
    nom: (x.cheval && x.cheval.nom_cheval) || '',
    note: x.note_numerique == null ? null : Number(x.note_numerique),
    cote: x.cote_journaliste == null ? null : Number(x.cote_journaliste),
    rang: x.position == null ? null : Number(x.position),
    texte: String(x.analysis_horse || '').trim(),
  })).filter((x) => x.num)
  return {
    chapeau: String(j.chapeau || '').trim(),
    presentation: String(j.presentation || '').trim(),
    auteur: nomAuteur(j.creator),
    bases: suite(j.bases),
    bellesChances: suite(j.belles_chances),
    outsiders: suite(j.outsiders),
    delaisses: suite(j.delaisses),
    chevaux: chevaux.sort((a, b) => (a.rang || 99) - (b.rang || 99)),
  }
}

/* ═════════════════════ ④ LA REVUE DE PRESSE DU JOUR ═════════════════════ */

/**
 * La revue de presse du Quinté : chaque journal et ses 8 chevaux.
 * → { journaux: [{ nom, picks: [8 n°] }], consensus: [{ num, voix }], nbJournaux }
 *
 * ⚠ Le tableau de la source est en `<th>` NON FERMÉS (HTML tolérant) : on lit
 *   donc ligne par ligne, on prend le nom du journal dans son lien, puis ses
 *   chiffres. Deux garde-fous, appris en lisant la page :
 *     · un n° de partant ne dépasse pas 30 — les lignes de « rentabilité »
 *       (204 COUPLE: 230 …) tombent d'elles-mêmes ;
 *     · une ligne de sélection porte 8 à 9 nombres (le nom peut en contenir un,
 *       « Canal 2 », « Europe 1 ») — au-delà, ce n'est pas une sélection.
 */
export async function revueDePresse() {
  let html = await htmlTexte('/api/pt/presse.php')

  /* ⚠ LE CORPS DE 31 OCTETS — mesuré le 18/10/2026 : le site ne rend QUE
   *   `yes118 October 2026 [ 05:10:05]`, et il le rend aussi dans un vrai
   *   navigateur (`https://www.pronostics-turf.info/presse.php`, 57 octets de
   *   HTML). Ce n'est donc pas notre relais : c'est la SOURCE qui est vide.
   *   Une seconde chance après une pause (le frein du site, lui, existe aussi :
   *   `Crawl-delay: 10`), puis on le DIT — ce n'est pas « aucun journal
   *   aujourd'hui », c'est « la source n'a rien livré ». */
  if (String(html).trim().length < 2000) {
    await new Promise((r) => setTimeout(r, 6000))
    html = await htmlTexte('/api/pt/presse.php')
  }
  if (String(html).trim().length < 2000) {
    throw new Error('le site de la revue de presse n\'a rien livré (page vide côté source) — réessayez plus tard')
  }
  const vus = new Set()
  const journaux = []
  for (const bloc of html.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const lien = bloc.match(/detail-rentabilite-[^"']+["'][^>]*>([^<]{2,40})</i)
    const cellule = bloc.match(/class="cr"[^>]*>\s*(?:<a[^>]*>)?([^<]{2,40})</i)
    const nom = String((lien ? lien[1] : cellule ? cellule[1] : '')).replace(/&nbsp;/g, ' ').trim()
    if (!nom || /^\d/.test(nom) || nom.length < 2) continue
    const brut = bloc.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
    const nombres = (brut.match(/\d{1,2}/g) || []).map(Number)
    if (nombres.length < 8 || nombres.length > 12) continue
    const picks = nombres.slice(-8)
    if (!picks.every((n) => n >= 1 && n <= 30)) continue
    const cle = nom.toUpperCase()
    if (vus.has(cle)) continue
    vus.add(cle)
    journaux.push({ nom, picks })
  }
  const compte = new Map()
  for (const j of journaux) for (const n of j.picks) compte.set(n, (compte.get(n) || 0) + 1)
  const consensus = [...compte.entries()]
    .map(([n, voix]) => ({ num: n, voix }))
    .sort((a, b) => b.voix - a.voix || a.num - b.num)
  return { journaux, consensus, nbJournaux: journaux.length }
}

/* ══════════ ⑤ LES ARTICLES DES JOURNAUX ET DES HEBDOMADAIRES ══════════
 *
 * ⚠ CE QUE L'UTILISATEUR A DEMANDÉ (18/10/2026, texte exact) :
 *   « je ne veux pas les nouvelles d'Equidia, je veux les nouvelles des
 *     journaux quotidiens et hebdomadaires : LA GAZETTE DES COURSES,
 *     LE VEINARD avec COURSES PAR COURSES, JOURNAUX WEEK-END, PARIS TURF,
 *     PARISIEN, TIERCÉ MAGAZINE. »
 *
 *   On ne sert donc plus le fil d'actualité d'une chaîne : on va CHERCHER LES
 *   JOURNAUX EUX-MÊMES. Ce que la journée du 18/10 a donné, essai par essai :
 *
 *   ✅ PARIS-TURF          son API de contenu rend les articles récents AVEC
 *                          leur texte entier en HTML (`content`), leur image,
 *                          leur auteur et leur rubrique. C'est le quotidien
 *                          hippique de référence et il est complet.
 *                          ⚠ son SITE (paris-turf.com) est derrière Cloudflare
 *                            (403) — c'est l'API qui parle, via `/api/ptf`.
 *
 *   ✅ LE VEINARD          sa page d'actualités (`/les-actualites`) publie le
 *                          texte entier de ses articles, par semaine, avec la
 *                          semaine précédente en lien. Site sans CORS → `/api/lv`.
 *
 *   ❌ LA GAZETTE DES COURSES   journal payant (Cafeyn, journaux.fr, kiosque) :
 *                               aucun contenu en clair sur le web.
 *   ❌ COURSES PAR COURSES      domaines inexistants (DNS).
 *   ❌ TIERCÉ MAGAZINE          domaines inexistants (DNS).
 *   ❌ WEEK-END (Journaux)      domaines inexistants (DNS).
 *   ❌ PARISIEN                 pas de rubrique hippique lisible.
 *   ❌ GENY                     geny.com = 404 ; geny-courses.com = un blog
 *                               d'articles SEO (fashion, gaming), pas du turf.
 *   ❌ TURFOO                   403 Cloudflare.  ❌ EQUIDIA : écarté sur demande.
 *
 *   ⚠ ceil de vérité : ces quatre-là sont INJOIGNABLES, pas « en panne ». La
 *     page ne les liste donc pas du tout — elle ne promet pas ce qu'elle n'a
 *     pas. Si l'un d'eux s'ouvre un jour, il s'ajoute ici, en trois lignes.
 */

/* Le libellé d'une rubrique de la source. Rien n'est inventé : ce qui n'est pas
 * dans la table s'affiche tel quel (nettoyé des tirets bas). */
const RUBRIQUES = {
  FRANCE: 'France',
  INTERNATIONAL: 'International',
  OPERATORS_GAMES: 'Jeu & opérateurs',
  SECTOR_INSTITUTION: 'Institutions',
  AMERICA_RACES: 'Amérique',
  MAJOR_ISSUES: 'Grands sujets',
}
const SUBS = {
  FLAT: 'Plat',
  TROT: 'Trot',
  HURDLE: 'Obstacle',
  STEEPLE: 'Steeple',
  GALLOP: 'Galop',
  NEWS: 'Actualité',
}
const joli = (mot) => String(mot || '').replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
function rubrique(cat, sub) {
  const c = RUBRIQUES[cat] || joli(cat)
  const s = SUBS[sub] || joli(sub)
  return [c, s].filter(Boolean).join(' · ')
}

/** Les entités HTML (« &rsquo; », « &#8217; ») rendues en vrais caractères. */
function dec(txt) {
  const s = String(txt == null ? '' : txt)
  if (!/[&<]/.test(s)) return s
  try {
    const boite = document.createElement('textarea')
    boite.innerHTML = s
    return boite.value.replace(/\s+/g, ' ').trim()
  } catch (e) { return s }
}

/**
 * Le HTML d'un article, NETTOYÉ avant l'affichage dans la page.
 * ⚠ Trois choses tombent : les scripts, les gestionnaires d'événement
 *   (`onclick=…`) et les liens — un lien cliqué emmènerait la page ailleurs,
 *   et la règle est que l'article se lit DANS la page. Les images, elles,
 *   restent : elles s'affichent en direct depuis le journal (mesuré le 18/10 :
 *   l'image d'un article Paris-Turf se charge sans clé, celle du Veinard aussi).
 */
export function htmlSur(texte) {
  return String(texte || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<a\b[^>]*>/gi, '<span>')
    .replace(/<\/a>/gi, '</span>')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '')
}

/* les mois du Veinard, écrits en toutes lettres dans ses articles */
const MOIS = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE']
function dateVeinard(txt) {
  const m = /(\d{1,2})\s+([A-Za-zÉÈÊÀÎÔÛÇ]+)\s+(\d{4})/.exec(txt || '')
  if (!m) return ''
  const mois = m[2].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const i = MOIS.indexOf(mois)
  if (i < 0) return ''
  const d = new Date(Number(m[3]), i, Number(m[1]), 12, 0, 0)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

/** Les articles PARIS-TURF, les plus récents d'abord.
 *  ⚠ La source PRÉPROGRAMME ses séries quotidiennes : le 18/10 au matin, son API
 *    rendait déjà « La stat de 15 h 64 » des 19, 20, 21 et 22 octobre. Un
 *    journal du jour ne peut pas publier après-demain : les articles datés à
 *    venir sont donc ÉCARTÉS (12 h de tolérance, pour ne pas perdre un article
 *    du soir à cause d'un fuseau horaire). */
const AVANCE_TOLEREE = 12 * 60 * 60 * 1000

async function articlesParisTurf(nb) {
  const j = await json(`/api/ptf/api/articles?orderBy=publishedAt&order=desc&limit=${Math.max(1, nb)}`)
  const limite = Date.now() + AVANCE_TOLEREE
  return (j.data || []).map((a) => {
    const texte = String(a.content || '').trim()
    const img = texte.match(/<img[^>]+src="([^"]+)"/i)
    return {
      cle: 'pt-' + a.id,
      journal: 'Paris-Turf',
      sorte: 'Quotidien',
      titre: dec(a.title),
      chapo: dec(a.teaser),
      texte,
      rubrique: rubrique(a.category, a.subCategory),
      date: a.publishedAt || '',
      image: img ? img[1] : ((a.media && a.media[0] && a.media[0]._link) || ''),
      auteur: a.authorName || '',
      lien: 'https://www.paris-turf.com/actualites/' + a.slug,
    }
  }).filter((a) => a.titre && a.texte && (!a.date || new Date(a.date).getTime() <= limite))
}

/** Un article du VEINARD, lu dans une page d'actualités (elle en porte 2 à 4). */
function lireVeinard(html) {
  const articles = []
  const morceaux = String(html).split('<b style="font-size: 16px;">')
  for (let i = 1; i < morceaux.length; i++) {
    const bloc = morceaux[i]
    const fin = bloc.indexOf('</b>')
    if (fin < 0) continue
    const titre = dec(bloc.slice(0, fin))
    const corps = bloc.match(/<div style="text-align: justify;">([\s\S]*?)<\/div>/i)
    if (!titre || !corps) continue
    const img = bloc.match(/<img[^>]+src="([^"]+)"/i)
    const enTete = bloc.slice(fin, (corps.index > fin ? corps.index : bloc.length))
    articles.push({
      cle: 'lv-' + titre.slice(0, 40),
      journal: 'Le Veinard',
      sorte: 'Quotidien',
      titre,
      chapo: '',
      texte: corps[1].trim(),
      rubrique: 'Actualité',
      date: dateVeinard(enTete),
      dateTexte: (enTete.match(/Publi[^<]{0,60}/i) || [''])[0].trim(),
      image: img ? new URL(img[1].replace(/^\.\//, ''), 'https://www.leveinard.com/').href : '',
      auteur: '',
      lien: 'https://www.leveinard.com/les-actualites',
    })
  }
  const prec = String(html).match(/href="\.?\/?(actualites-\d{4}-semaine-\d+)"/i)
  return { articles, precedente: prec ? '/' + prec[1] : '' }
}

/** Les articles du VEINARD : la semaine en cours, puis la précédente. */
async function articlesLeVeinard() {
  let chemin = '/les-actualites'
  const articles = []
  for (let i = 0; i < 2 && chemin; i++) {
    const html = await htmlTexte('/api/lv' + chemin)
    const lu = lireVeinard(html)
    /* ⚠ la clé porte la page ET le rang : deux articles peuvent porter le même
     *   titre d'une semaine à l'autre, une clé en double casserait la liste. */
    lu.articles.forEach((a, k) => articles.push({ ...a, cle: 'lv-' + i + '-' + k }))
    chemin = i === 0 ? lu.precedente : ''
  }
  return articles
}

/* ── le petit cache des articles (10 minutes) ───────────────────────────────
 * Les articles viennent de deux journaux : on ne les redemande pas à chaque
 * rechargement. Dix minutes suffisent pour des nouvelles. */
const TTL_ARTICLES = 10 * 60 * 1000

function cacheLire(cle) {
  try {
    const brut = window.localStorage.getItem(cle)
    if (!brut) return null
    const j = JSON.parse(brut)
    return j && typeof j.t === 'number' ? j : null
  } catch (e) { return null }
}

function cacheEcrire(cle, valeur) {
  try { window.localStorage.setItem(cle, JSON.stringify({ t: Date.now(), v: valeur })) } catch (e) { /* plein ou refusé */ }
}

/**
 * LES ARTICLES DES JOURNAUX, le plus récent d'abord.
 * → { liste: [{ cle, journal, sorte, titre, chapo, texte, rubrique, date,
 *               image, auteur, lien }], journaux: ['Paris-Turf', …], pannes: [] }
 *
 * ⚠ DEUX RÈGLES TENUES ICI :
 *   ① `Promise.allSettled` — un journal qui tombe ne condamne pas l'autre : il
 *      part dans `pannes`, la page le dit en une ligne, le reste s'affiche ;
 *   ② jamais de mélange de dates : chaque article garde la sienne, le tri se
 *      fait dessus (le Veinard écrit sa date en toutes lettres, on la convertit
 *      — si elle est illisible, l'article DESCEND au lieu de se croire récent).
 */
export async function articles(nbPT = 24) {
  const cle = 'presse.journaux.v1'
  const cache = cacheLire(cle)
  if (cache && Date.now() - cache.t < TTL_ARTICLES) return cache.v

  const [pt, lv] = await Promise.allSettled([articlesParisTurf(nbPT), articlesLeVeinard()])
  const liste = []
  const pannes = []
  if (pt.status === 'fulfilled') liste.push(...pt.value)
  else pannes.push('Paris-Turf')
  if (lv.status === 'fulfilled') liste.push(...lv.value)
  else pannes.push('Le Veinard')

  liste.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const valeur = {
    liste,
    journaux: [...new Set(liste.map((a) => a.journal))],
    pannes,
  }
  if (liste.length) cacheEcrire(cle, valeur)
  return valeur
}

/* ═══════ ⑥ LA REVUE DE PRESSE EN VIDÉO — le canal qui feuillette les journaux ═══════
 *
 * ⚠ CE QUE L'UTILISATEUR A MONTRÉ, PAR DEUX LIENS (18/10/2026) :
 *
 *   https://www.youtube.com/watch?v=RhhTRuVCwTM
 *     « PRIX RIEUSSEC 05 CINQ JOURNAUX WEEKEND PARIS TURF GENY
 *       COURSE PARISIEN TIERCÉ MAGAZINE 18/1/26 »
 *
 *   https://www.youtube.com/watch?v=Ahsn-YJs1lg
 *     « DIMANCHE 18 OCTOBRE 26 LE VEINARD AVEC COURSES PAR COURSES
 *       PRIX RIEUSSEC PARIS LONGCHAMP »
 *
 *   → « هذه هي الاخبار التي ابحث عنها من الجرائد » : **les nouvelles des
 *     journaux, c'est ÇA**. Le canal les filme et les feuillette chaque matin,
 *     et ses titres portent EXACTEMENT la liste qu'il avait donnée :
 *     LA GAZETTE DES COURSES · LE VEINARD AVEC COURSES PAR COURSES ·
 *     JOURNAUX WEEK-END · PARIS TURF · COURSE PARISIEN · TIERCÉ MAGAZINE
 *     (plus PYRAMIDE DES CHANCES / Turfomania et COUP SÛR).
 *
 *   Les journaux eux-mêmes sont payants ou ont disparu (§24.6) — mais leur
 *   REVUE existe en clair, en vidéo, tous les jours. C'est donc elle qu'on
 *   sert : les vidéos DU JOUR d'abord (le nom de la course ou la date du jour),
 *   les précédentes ensuite.
 *
 * ⚠ COMMENT ON LIT LA CHAÎNE — DEUX sources, et elles ne servent pas à la même
 *   chose (mesuré le 23/10/2026) :
 *
 *   ① LE FLUX RSS `/feeds/videos.xml?channel_id=…` — **32 Ko**, 15 entrées,
 *      avec `published` à la SECONDE. C'est la source de la FRAÎCHEUR : on le
 *      relit toutes les 60 s. (Il avait été noté « mort, 404 » le 18/10 ; il
 *      répond 200 aujourd'hui — la note était fausse ou la panne passagère.)
 *      ⚠ YouTube le cache 15 min (`cache-control: max-age=900`) : une vidéo
 *      publiée peut donc mettre jusqu'à un quart d'heure à y entrer.
 *
 *   ② LA PAGE `/channel/{id}/videos` — **1,3 Mo** de HTML dont tout l'état est
 *      dans `ytInitialData`. Elle donne 30 vidéos, la DURÉE et les vues, mais
 *      pas d'horodatage absolu (« il y a 7 h »). On l'extrait par comptage
 *      d'accolades (pas de regex sur 1,3 Mo de JSON) et on lit DEUX formes,
 *      parce que YouTube sert les unes ou les autres selon les vidéos :
 *        · `videoRenderer`       (la forme historique)
 *        · `lockupViewModel`     (la forme récente)
 *      On ne la relit que toutes les 10 min : elle enrichit (durée) et
 *      complète (les vidéos plus anciennes que les 15 du flux).
 */

const CHAINE_VIDEO = {
  nom: 'RETRO-QUINTES',
  id: 'UCinyN5Q6efFgWevTqklFi3w',
  lien: 'https://www.youtube.com/@TUBE_CHEVAL1966',
}

/** L'état JSON collé dans la page d'une chaîne. */
function etatYoutube(html) {
  const s = String(html)
  const i = s.indexOf('ytInitialData')
  if (i < 0) throw new Error("la chaîne n'a pas livré son état")
  const debut = s.indexOf('{', i)
  let prof = 0
  for (let x = debut; x < s.length; x++) {
    const c = s[x]
    if (c === '{') prof++
    else if (c === '}') {
      prof--
      if (prof === 0) return JSON.parse(s.slice(debut, x + 1))
    }
  }
  throw new Error("l'état de la chaîne est tronqué")
}

/** « 2,9 k vues · il y a 7 h » → « il y a 7 h ». */
function ilYA(txt) {
  const m = /il y a [^·|]+/i.exec(txt || '')
  return m ? m[0].trim() : String(txt || '').trim()
}

/** Les vidéos de l'onglet « Vidéos » d'une chaîne, la plus récente d'abord. */
function videosDeLaChaine(etat) {
  const liste = []
  const onglets = (etat.contents && etat.contents.twoColumnBrowseResultsRenderer && etat.contents.twoColumnBrowseResultsRenderer.tabs) || []
  for (const o of onglets) {
    const contenu = o.tabRenderer && o.tabRenderer.content && o.tabRenderer.content.richGridRenderer
      && o.tabRenderer.content.richGridRenderer.contents
    if (!contenu) continue
    for (const c of contenu) {
      const bloc = c.richItemRenderer && c.richItemRenderer.content
      if (!bloc) continue
      if (bloc.videoRenderer) {
        const v = bloc.videoRenderer
        const t = v.title || {}
        liste.push({
          id: v.videoId,
          titre: (t.runs && t.runs[0] && t.runs[0].text) || t.simpleText || '',
          vu: (v.viewCountText && v.viewCountText.simpleText) || '',
          publie: ilYA((v.publishedTimeText && v.publishedTimeText.simpleText) || ''),
          duree: (v.lengthText && v.lengthText.simpleText) || '',
        })
        continue
      }
      if (bloc.lockupViewModel) {
        const l = bloc.lockupViewModel
        const meta = l.metadata && l.metadata.lockupMetadataViewModel
        const morceaux = (meta && meta.metadata && meta.metadata.contentMetadataViewModel
          && meta.metadata.contentMetadataViewModel.metadataRows) || []
        const texte = morceaux.flatMap((r) => (r.metadataParts || []).map((p) => (p.text && p.text.content) || '')).join(' · ')
        const badges = (l.contentImage && l.contentImage.thumbnailViewModel && l.contentImage.thumbnailViewModel.overlays) || []
        const duree = badges.map((b) => b.thumbnailOverlayBadgeViewModel && b.thumbnailOverlayBadgeViewModel.thumbnailBadges
          && b.thumbnailOverlayBadgeViewModel.thumbnailBadges[0]
          && b.thumbnailOverlayBadgeViewModel.thumbnailBadges[0].thumbnailBadgeViewModel
          && b.thumbnailOverlayBadgeViewModel.thumbnailBadges[0].thumbnailBadgeViewModel.text).filter(Boolean).join('')
        liste.push({
          id: l.contentId,
          titre: (meta && meta.title && meta.title.content) || '',
          vu: texte.split('·')[0].trim(),
          publie: ilYA(texte),
          duree: duree || '',
        })
      }
    }
  }
  return liste.filter((v) => v.id && v.titre).map((v) => ({
    ...v,
    vignette: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
    grandVignette: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
  }))
}

/* ── ⑥ bis LA VEILLE : le flux RSS, la source FRAÎCHE ───────────────────────
 * Le canal publie la revue de presse de la course du LENDEMAIN le soir même :
 * le 23/10 à 22 h 03, la vidéo du Quinté du 24 (PRIX DE BEAUNE) était déjà en
 * ligne. Une page ouverte ne la voyait jamais arriver — elle ne se rechargeait
 * qu'à la main. D'où le flux, relu toutes les minutes.
 */
const TTL_FLUX = 60 * 1000            // le flux RSS : une minute
const TTL_PAGE = 10 * 60 * 1000       // la page de la chaîne : dix minutes (1,3 Mo)

/** « &amp; » → « & » — les titres du flux sont échappés. */
function decoderEntites(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

/** « 502 » → « 502 » · « 4500 » → « 4,5 k » · « 1250000 » → « 1,3 M ». */
function nbVues(n) {
  const x = Number(n)
  if (!Number.isFinite(x) || x <= 0) return ''
  if (x < 1000) return String(x)
  if (x < 1e6) return (x / 1000).toFixed(1).replace('.', ',') + ' k'
  return (x / 1e6).toFixed(1).replace('.', ',') + ' M'
}

/** Un instant ISO → « il y a 7 min », « il y a 3 h », « il y a 2 j ». */
function depuis(iso) {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const min = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.round(h / 24)} j`
}

/** Le flux RSS de la chaîne → la même forme que `videosDeLaChaine`, AVEC
 *  `publieLe` (l'instant exact) et `vu`. Pas de durée : le flux n'en donne pas. */
function videosParFlux(xml) {
  const liste = []
  for (const bloc of String(xml).split('<entry>').slice(1)) {
    const id = (/<yt:videoId>([^<]+)<\/yt:videoId>/.exec(bloc) || [])[1]
    const titre = decoderEntites((/<title>([\s\S]*?)<\/title>/.exec(bloc) || [])[1] || '')
    const publieLe = (/<published>([^<]+)<\/published>/.exec(bloc) || [])[1] || ''
    const vues = (/<media:statistics views="(\d+)"/.exec(bloc) || [])[1]
    if (!id) continue
    liste.push({
      id,
      titre: titre.trim(),
      vu: nbVues(vues),
      publie: depuis(publieLe),
      publieLe,
      duree: '',
    })
  }
  return liste
}

/** Le flux, gardé une minute. */
async function videosDuFlux() {
  const cle = 'presse.videos.flux.v1'
  const cache = cacheLire(cle)
  if (cache && Date.now() - cache.t < TTL_FLUX) return cache.v
  const xml = await htmlTexte(`/api/yt/feeds/videos.xml?channel_id=${CHAINE_VIDEO.id}`)
  const liste = videosParFlux(xml)
  if (!liste.length) throw new Error("le flux de la chaîne n'a livré aucune vidéo")
  cacheEcrire(cle, liste)
  return liste
}

/** La page de la chaîne, gardée dix minutes — durée et vues. */
async function videosDeLaPage() {
  const cle = 'presse.videos.page.v1'
  const cache = cacheLire(cle)
  if (cache && Date.now() - cache.t < TTL_PAGE) return cache.v
  const html = await htmlTexte(`/api/yt/channel/${CHAINE_VIDEO.id}/videos`)
  const liste = videosDeLaChaine(etatYoutube(html))
  if (!liste.length) throw new Error("la chaîne n'a livré aucune vidéo")
  cacheEcrire(cle, liste)
  return liste
}

/**
 * Les vidéos de la chaîne : { chaine, lien, liste: [{ id, titre, publie,
 * publieLe, vu, duree, vignette, grandVignette }] }.
 *
 * ⚠ LES DEUX SOURCES SONT FUSIONNÉES, jamais l'une à la place de l'autre :
 *   · le FLUX donne l'ordre et l'instant exact (`publieLe`) — c'est lui qui
 *     fait apparaître une vidéo dans la minute ;
 *   · la PAGE donne la durée et les 15 vidéos plus anciennes que le flux.
 *   Si l'une tombe, l'autre suffit : une panne de YouTube ne vide pas l'écran.
 */
export async function videosJournaux() {
  const [flux, page] = await Promise.allSettled([videosDuFlux(), videosDeLaPage()])
  const dePage = page.status === 'fulfilled' ? page.value : []
  const duFlux = flux.status === 'fulfilled' ? flux.value : []
  if (!dePage.length && !duFlux.length) {
    throw (flux.status === 'rejected' && flux.reason) || new Error("la chaîne n'a livré aucune vidéo")
  }

  const parId = new Map()
  for (const v of dePage) parId.set(v.id, v)
  for (const v of duFlux) parId.set(v.id, { ...(parId.get(v.id) || {}), ...v })

  /* l'ordre : d'abord ceux dont on connaît l'instant exact, du plus récent au
   * plus ancien ; puis les plus anciens de la page, dans l'ordre de YouTube. */
  const dates = [...parId.values()].filter((v) => v.publieLe)
    .sort((a, b) => String(b.publieLe).localeCompare(String(a.publieLe)))
  const sansDate = dePage.filter((v) => !parId.get(v.id).publieLe)

  const liste = [...dates, ...sansDate].map((v) => ({
    ...v,
    vignette: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
    grandVignette: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
  }))
  return { chaine: CHAINE_VIDEO.nom, lien: CHAINE_VIDEO.lien, liste }
}

/* ── lesquelles sont celles DU JOUR ? ───────────────────────────────────────
 * Deux signaux, dans cet ordre :
 *   ① LE NOM DE LA COURSE — « PRIX RIEUSSEC » → le mot distinctif (RIEUSSEC,
 *      les mots vides « PRIX », « GRAND », « HANDICAP »… ne comptent pas).
 *      C'est le signal le plus sûr : le canal le met dans ses titres.
 *   ② LA DATE DU JOUR, sous toutes ses écritures, en majuscules sans accents :
 *      « 18/10/2026 », « 18/10/26 », « 18 OCTOBRE 26 »…
 * ⚠ On ne devine jamais : sans nom ni date, tout part dans « les jours
 *   précédents » — mieux vaut ne rien mettre en avant que de mettre en avant
 *   la course d'hier.
 */
const sansAccent = (s) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

const MOTS_VIDES = ['PRIX', 'GRAND', 'HANDICAP', 'COURSE', 'COURSES', 'QUINTE', 'DU', 'DE', 'DES', 'LA', 'LE', 'LES', 'AU', 'AUX', 'ET', 'EN', 'SUR']

/** Le mot qui identifie la course dans un titre de vidéo. */
export function motCleCourse(nom) {
  const mots = sansAccent(nom).replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/)
    .filter((m) => m.length >= 5 && !MOTS_VIDES.includes(m))
  return mots.sort((a, b) => b.length - a.length)[0] || ''
}

const MOIS_VIDEO = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE']

/** « 2026-10-18 » → toutes les écritures d'un titre de vidéo. */
export function jetonsDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''))
  if (!m) return []
  const [, a, mm, jj] = m
  const mois = MOIS_VIDEO[Number(mm) - 1] || ''
  const j = String(Number(jj))
  return [
    `${jj}/${mm}/${a}`, `${jj}/${mm}/${a.slice(2)}`, `${j}/${mm}/${a.slice(2)}`,
    `${jj}-${mm}-${a.slice(2)}`, `${jj}.${mm}.${a.slice(2)}`,
    `${j} ${mois} ${a.slice(2)}`, `${j} ${mois} ${a}`,
  ].filter(Boolean)
}

/** La date de la RÉUNION écrite dans le titre, en ISO — `''` si absente.
 *  ⚠ Le titre porte la date de la COURSE, pas celle de la publication : la
 *    vidéo du Quinté du 24 est mise en ligne le 23 au soir avec « SAMEDI
 *    24 OCTOBRE 26 » dans le titre. C'est ce qui permet de la ranger comme
 *    « à venir » et non comme « jour précédent ».
 *  « … SAMEDI 24 OCTOBRE 26 » → 2026-10-24 · « 18/10/26 » → 2026-10-18 */
export function jourVideo(titre) {
  const t = sansAccent(titre)
  const jour = (j, m, a) => {
    const an = a < 100 ? 2000 + a : a
    if (!j || !m || !an) return ''
    return `${an}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`
  }
  const lettres = /\b(\d{1,2})\s+(JANVIER|FEVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE)\s+(\d{2,4})\b/.exec(t)
  if (lettres) return jour(Number(lettres[1]), MOIS_VIDEO.indexOf(lettres[2]) + 1, Number(lettres[3]))
  const chiffres = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/.exec(t)
  if (chiffres) return jour(Number(chiffres[1]), Number(chiffres[2]), Number(chiffres[3]))
  return ''
}

/** Sépare les vidéos en trois — la course du jour, celles DÉJÀ EN LIGNE pour
 *  une course à venir, et les jours précédents.
 *
 *  ⚠ CE QUI A CHANGÉ LE 23/10/2026 : une vidéo publiée le soir pour la course
 *    du lendemain tombait dans « les jours précédents » — c'est-à-dire nulle
 *    part, sous 27 autres vignettes. Elle a maintenant sa place, en haut.
 */
export function partagerVideos(liste, { nom, date } = {}) {
  const complet = sansAccent(nom).trim()
  const mot = motCleCourse(nom)
  const dates = jetonsDate(date)
  const duJour = []
  const aVenir = []
  const autres = []
  for (const v of liste || []) {
    const t = sansAccent(v.titre)
    const parNom = (complet && t.includes(complet)) || (mot && t.includes(mot)) || dates.some((x) => t.includes(x))
    const j = jourVideo(v.titre) || String(v.publieLe || '').slice(0, 10)
    if (j && date && j > date && !parNom) aVenir.push(v)
    else if (parNom || (j && date && j === date)) duJour.push(v)
    else autres.push(v)
  }
  return { duJour, aVenir, autres }
}

/* ═══════ ⑦ LE PAPIER DU JOUR — ce que dit le journal, en TEXTE, cheval par cheval ═══════
 *
 * ⚠ LA DEMANDE DU 18/10, MOT POUR MOT :
 *   « الا يمكنك ان تجلب اخبار الصحف المعروضة بالفيديو وعرضها فقط بدون عرض
 *     الفيديوهات … انا افضل ان ناخد ما تعرضه تلك الفيديوهات من موقعها الرسمي
 *     وتحدث تلقائيا كل يوم »
 *   → le CONTENU des journaux, en texte, pris À LA SOURCE, sans les vidéos.
 *
 * ⭐ CE QUI EXISTE VRAIMENT, MESURÉ LE 18/10 (voir §24.13 de AGENTS.md) :
 *
 *   ✅ LA GAZETTE DES COURSES — un WordPress dont le REST est OUVERT :
 *        GET /wp-json/wp/v2/posts?per_page=60&orderby=date&order=desc
 *        → chaque papier est UN CHEVAL, rangé dans une rubrique :
 *           125 notre-coup-de-coeur · 127 derniere-heure · 124 outsider
 *           123 repere-sur-les-pistes · 122 stop-info · 9 quinte
 *        → le TITRE est le nom du cheval, `content.rendered` est le commentaire.
 *      Vérifié : les papiers du 17/10 à 15:30 sont Step Morning (n°7),
 *      Princesse d'Amour (n°4) et Black Saxon (n°3) — les 3 courent bien le
 *      Quinté du 18/10 (PRIX RIEUSSEC). Le papier du jour existe donc en clair,
 *      et c'est CELUI DE LA COURSE DU JOUR.
 *
 *   ❌ Week-End-Turf, Tiercé Magazine : même plateforme, mais MORTS — leurs
 *      derniers papiers datent d'avril 2025. Bilto est un site de foot.
 *   ❌ Le Veinard : pas de page Quinté (`/pronostics` → 404) ; ses « unes »
 *      (`images/quotidien/enorme/VE{AAAAMMJJ}.jpg`) ont DEUX JOURS de retard
 *      (le 18/10 : VE20261016.jpg existe, VE20261018.jpg → 404).
 *   ❌ Paris-Turf : Cloudflare 403 sur le site (seule son API répond).
 *
 * → On ne raconte donc pas « les 5 journaux » : on sert LE journal qui publie
 *   son papier du jour, et on dit lequel. Un journal de plus = une ligne dans
 *   `RUBRIQUES_JOURNAL`, rien d'autre à changer.
 */

const JOURNAL_TEXTE = { nom: 'La Gazette des Courses', base: 'https://www.lagazettedescourses.fr' }

/** Les rubriques du journal, dans l'ordre où le papier les présente. */
const RUBRIQUES_JOURNAL = [
  { id: 125, nom: 'Notre coup de cœur' },
  { id: 127, nom: 'Dernière heure' },
  { id: 124, nom: 'Outsider' },
  { id: 123, nom: 'Repéré sur les pistes' },
  { id: 122, nom: 'Stop info' },
]

/** « PRINCESSE D'AMOUR » et « Princesse d&rsquo;Amour » → la même clé.
 *  ⚠ WordPress abîme les apostrophes en `&rsquo;` : sans `dec()`, le n°4 du
 *    Quinté du 18/10 (PRINCESSE D'AMOUR) ne reconnaissait pas son papier. */
const cleNom = (s) => dec(s)
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/** « 2026-10-18 » moins n jours → « 2026-10-15 ». */
function jourMoins(date, n) {
  const d = new Date(String(date) + 'T12:00:00')
  d.setDate(d.getDate() - n)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * Le papier du jour, rattaché au Quinté : chaque cheval cité par le journal,
 * son numéro de départ, sa rubrique et le commentaire entier.
 * → { journal, publie, nb, rubriques: [{ nom, chevaux: [{ num, nom, corde,
 *     vh, texte, publie }] }] } · ou `null` si la course n'est pas connue.
 * ⚠ Le rattachement se fait PAR LE NOM DU CHEVAL, jamais par la date : un
 *   papier de la veille pour une autre course ne peut pas entrer (mesuré : le
 *   lot du 16/10 — Kirikou des Mers, Loquas… — ne court pas le 18/10).
 */
export async function papierDuJour({ date, r, c } = {}) {
  if (!date || !r || !c) return null
  const cle = `presse.papier.v2.${date}.R${r}.C${c}`
  const cache = cacheLire(cle)
  if (cache && Date.now() - cache.t < TTL_ARTICLES) return cache.v

  /* ① les partants : c'est eux qui relient un papier à un numéro */
  const course = await json(`${API_EQ}/v2/courses/${date}/R${r}/C${c}`)
  const partants = (course.partants || []).map((x) => {
    const ch = x.cheval || {}
    return {
      num: x.num_partant,
      nom: ch.nom_cheval || '',
      corde: x.place_corde_partant || null,
      vh: ch.valeur != null ? ch.valeur : null,
    }
  }).filter((x) => x.nom)

  /* ② les papiers publiés dans les 3 derniers jours */
  const depuis = jourMoins(date, 3)
  const posts = await json(
    '/api/gz/wp-json/wp/v2/posts?per_page=60&orderby=date&order=desc'
    + `&after=${depuis}T00:00:00&_fields=id,date,title,categories,content`
  )

  /* ③ on garde ceux dont le TITRE est un partant, et on les range par rubrique */
  const chevaux = []
  const vus = new Set()
  for (const p of posts || []) {
    const nomTitre = String((p.title && p.title.rendered) || '').trim()
    const part = partants.find((x) => cleNom(x.nom) === cleNom(nomTitre))
    if (!part) continue
    const rub = RUBRIQUES_JOURNAL.find((x) => (p.categories || []).includes(x.id))
    if (!rub) continue
    const marque = part.num + '/' + rub.id
    if (vus.has(marque)) continue
    vus.add(marque)
    chevaux.push({
      num: part.num,
      nom: part.nom,
      corde: part.corde,
      vh: part.vh,
      rubrique: rub.id,
      texte: (p.content && p.content.rendered) || '',
      publie: (p.date || '').slice(0, 16),
    })
  }

  const rubriques = RUBRIQUES_JOURNAL
    .map((x) => ({ nom: x.nom, chevaux: chevaux.filter((v) => v.rubrique === x.id) }))
    .filter((x) => x.chevaux.length)

  const valeur = {
    journal: JOURNAL_TEXTE.nom,
    publie: chevaux.length ? chevaux.map((v) => v.publie).sort().reverse()[0] : '',
    nb: chevaux.length,
    rubriques,
  }
  if (chevaux.length) cacheEcrire(cle, valeur)
  return valeur
}
