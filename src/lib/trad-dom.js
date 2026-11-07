/* ═══════════════════════════════════════════════════════════════════════════
 *  trad-dom.js — TRADUCTION AUTOMATIQUE DE TOUTE L'APPLICATION (07/11/2026)
 *
 *  Pourquoi un traducteur DOM et pas 3 000 appels `t('…')` ?
 *    La page Quinté seule contient plus de 3 000 chaînes françaises. Les
 *    envelopper une à une est ingérable et fragile. On traduit donc les
 *    NŒUDS DE TEXTE affichés, avec :
 *      ① un dictionnaire livré avec le site (1 261 phrases figées, 0 réseau) ;
 *      ② l'API Google publique pour les phrases longues non prévues
 *         (contenu éditorial dynamique), avec cache navigateur.
 *
 *  Ce qui PROTÈGE React :
 *    · on ne remplace QUE `nodeValue` d'un nœud texte (jamais de structure
 *      DOM : c'est `insertBefore` de Google Translate qui faisait crasher) ;
 *    · on mémorise ce qu'on a écrit (`applique`), donc quand React réécrit
 *      le français on retraduit, et on ne se bat jamais avec nous-mêmes ;
 *    · au retour en français on restaure la valeur d'origine.
 *
 *  Ce qui n'est JAMAIS traduit :
 *    · script / style / code / pre / textarea ;
 *    · tout élément portant `data-no-trad` ;
 *    · les nombres, unités, couleurs, URL ;
 *    · les noms propres (tous les mots en majuscule) → pas de « Prix de… »
 *      massacré ;
 *    · les noms de chevaux / jockeys (1 à 2 mots) → l'API ne les voit jamais.
 * ═══════════════════════════════════════════════════════════════════════════ */

const CLE_CACHE = 'bahja-trad-cache-v2'
const MAX_CACHE = 2500

/* ── ① LE LEXIQUE — les termes de courses, corrigés à la main ──────────────
 *  La traduction automatique rend « Quinté » par « الخامس » (le cinquième),
 *  « cote » par « التقييم » (l'évaluation), « corde » par « حبل » (la ficelle).
 *  Inacceptable sur un site de turf : on corrige le vocabulaire métier après
 *  la traduction, en s'aidant du texte français d'origine. */

/* ── ① bis LE LEXIQUE COURT — les mots seuls, traduits à la main ────────────
 *  Le dictionnaire extrait ne contient que les phrases longues. Les libellés
 *  d'un seul mot (« Cote », « Course », « Jockey »…) doivent quand même
 *  basculer : on les gère ici, avant toute recherche dans le dictionnaire. */
const LEXIQUE_COURT = {
  'Quinté': 'Quinté', 'Quinté+': 'Quinté+', 'quinté': 'كوينتي',
  'Quinté du jour': 'Quinté اليوم', 'N°': 'رقم', 'Nº': 'رقم', 'N°.': 'رقم',
  'du jour': 'اليوم',
  'Réunion': 'الشوط', 'réunion': 'الشوط',
  'Course': 'سباق', 'course': 'سباق', 'Courses': 'سباقات',
  'Partants': 'المشاركون', 'Partant': 'مشارك', 'partant': 'مشارك', 'partants': 'المشاركون',
  'Arrivée': 'ترتيب الوصول', 'arrivée': 'ترتيب الوصول', 'arrivee': 'ترتيب الوصول',
  'Cote': 'الاحتمال', 'cote': 'الاحتمال', 'Cotes': 'الاحتمالات', 'cotes': 'الاحتمالات',
  'Corde': 'خط الانطلاق', 'corde': 'خط الانطلاق',
  'Terrain': 'الأرضية', 'terrain': 'الأرضية',
  'Distance': 'المسافة', 'distance': 'المسافة',
  "Entraîneur": 'المدرب', 'entraineur': 'المدرب', 'Entraîneurs': 'المدربون',
  'Jockey': 'الفارس', 'jockey': 'الفارس', 'Jockeys': 'الفرسان',
  'Cheval': 'الحصان', 'cheval': 'الحصان', 'Chevaux': 'خيول',
  'Poids': 'الوزن', 'poids': 'الوزن',
  'Valeur': 'القيمة', 'valeur': 'القيمة', 'VH': 'القيمة',
  'Discipline': 'التخصص', 'discipline': 'التخصص',
  'Plat': 'مسطّح', 'plat': 'مسطّح',
  'Trot': 'تـروت', 'trot': 'تـروت',
  'Attelé': 'بالعربة', 'attelé': 'بالعربة', 'attelé': 'بالعربة',
  'Haies': 'الحواجز', 'haies': 'الحواجز',
  'Steeple': 'ستوبّل', 'steeple': 'ستوبّل',
  'Hippodrome': 'المضمار', 'hippodrome': 'المضمار',
  'Synthèse': 'التوليفة', 'synthese': 'التوليفة', 'Synthese': 'التوليفة',
  'Presse': 'الصحافة', 'presse': 'الصحافة',
  'Grille': 'الشبكة', 'grille': 'الشبكة',
  'Ticket': 'التذكرة', 'ticket': 'التذكرة',
  'Jeu': 'اللعب', 'jeu': 'اللعب',
  'Quota': 'الحصة', 'quota': 'الحصة',
  'Pronostic': 'التوقع', 'pronostic': 'التوقع', 'Pronostics': 'التوقعات',
  'Favori': 'المرشح الأول', 'favori': 'المرشح الأول',
  'Outsider': 'المفاجأة', 'outsider': 'المفاجأة',
  'Tocard': 'الحصان الضعيف', 'tocard': 'الحصان الضعيف',
  'Écart': 'الفارق', 'écart': 'الفارق', 'Ecarts': 'الفارق',
  'Statistiques': 'الإحصاءات', 'statistiques': 'الإحصاءات', 'Stats': 'الإحصاءات',
  'Archive': 'الأرشيف', 'archive': 'الأرشيف',
  'Résultats': 'النتائج', 'résultats': 'النتائج', 'Resultats': 'النتائج',
  'Programme': 'البرنامج', 'programme': 'البرنامج',
  'Direct': 'مباشر', 'direct': 'مباشر', 'Live': 'مباشر', 'live': 'مباشر',
  'Gains': 'الأرباح', 'gains': 'الأرباح',
  'Musique': 'السجل', 'musique': 'السجل',
  'Handicap': 'هانديكاب', 'handicap': 'هانديكاب',
  'Maiden': 'ميدن', 'maiden': 'ميدن',
  'Classe': 'صنف', 'classe': 'صنف',
  'Peloton': 'الحزمة', 'peloton': 'الحزمة',
  'Non partant': 'غير مشارك', 'non partant': 'غير مشارك',
  'Filtre': 'تصفية', 'filtre': 'تصفية',
  'Détails': 'التفاصيل', 'détails': 'التفاصيل', 'Details': 'التفاصيل',
  'Fermer': 'إغلاق', 'fermer': 'إغلاق',
  'Ouvrir': 'فتح', 'ouvrir': 'فتح',
  'Rafraîchir': 'تحديث', 'rafraichir': 'تحديث', 'Rafraichir': 'تحديث',
  'Annuler': 'إلغاء', 'annuler': 'إلغاء',
  'Valider': 'تأكيد', 'valider': 'تأكيد',
  'Enregistrer': 'حفظ', 'enregistrer': 'حفظ',
  'Supprimer': 'حذف', 'supprimer': 'حذف',
  'Ajouter': 'إضافة', 'ajouter': 'إضافة',
  'Modifier': 'تعديل', 'modifier': 'تعديل',
  'Exporter': 'تصدير', 'exporter': 'تصدير',
  'Importer': 'استيراد', 'importer': 'استيراد',
  'Rechercher': 'بحث', 'rechercher': 'بحث',
  'Charger': 'تحميل', 'charger': 'تحميل',
  'Afficher': 'إظهار', 'afficher': 'إظهار',
  'Masquer': 'إخفاء', 'masquer': 'إخفاء',
  'Paramètres': 'الإعدادات', 'parametres': 'الإعدادات', 'Parametres': 'الإعدادات',
  'Options': 'الخيارات', 'options': 'الخيارات',
  'Aide': 'مساعدة', 'aide': 'مساعدة',
  'Accueil': 'الرئيسية', 'accueil': 'الرئيسية',
  'Retour': 'رجوع', 'retour': 'رجوع',
  'Suivant': 'التالي', 'suivant': 'التالي',
  'Précédent': 'السابق', 'précédent': 'السابق', 'Precedent': 'السابق',
  'Page': 'صفحة', 'page': 'صفحة',
  'Ligne': 'سطر', 'ligne': 'سطر',
  'Colonne': 'عمود', 'colonne': 'عمود',
  'Tableau': 'جدول', 'tableau': 'جدول',
  'Carte': 'بطاقة', 'carte': 'بطاقة',
  'Bouton': 'زر', 'bouton': 'زر',
  'Menu': 'قائمة', 'menu': 'قائمة',
  'Navigation': 'تنقل', 'navigation': 'تنقل',
  'Contenu': 'محتوى', 'contenu': 'محتوى',
  'Titre': 'عنوان', 'titre': 'عنوان',
  'Texte': 'نص', 'texte': 'نص',
  'Image': 'صورة', 'image': 'صورة',
  'Icône': 'أيقونة', 'icone': 'أيقونة', 'Icone': 'أيقونة',
  'Lien': 'رابط', 'lien': 'رابط',
  'Date': 'تاريخ', 'date': 'تاريخ',
  'Heure': 'وقت', 'heure': 'وقت',
  'Nom': 'اسم', 'nom': 'اسم',
  'Numéro': 'رقم', 'numero': 'رقم', 'numéro': 'رقم',
  'Place': 'مركز', 'place': 'مركز',
  'Rang': 'مرتبة', 'rang': 'مرتبة',
  'Score': 'نتيجة', 'score': 'نتيجة',
  'Total': 'المجموع', 'total': 'المجموع',
  'Moyenne': 'متوسط', 'moyenne': 'متوسط',
  'Minimum': 'الحد الأدنى', 'minimum': 'الحد الأدنى',
  'Maximum': 'الحد الأقصى', 'maximum': 'الحد الأقصى',
  'Oui': 'نعم', 'oui': 'نعم',
  'Non': 'لا', 'non': 'لا',
  'Tous': 'الكل', 'tous': 'الكل', 'Tout': 'الكل', 'tout': 'الكل',
  'Aucun': 'لا شيء', 'aucun': 'لا شيء', 'Aucune': 'لا شيء',
  'Erreur': 'خطأ', 'erreur': 'خطأ',
  'Chargement': 'تحميل', 'chargement': 'تحميل',
  'Chargé': 'محمّل', 'charge': 'محمّل',
  'Vide': 'فارغ', 'vide': 'فارغ',
  'Prêt': 'جاهز', 'pret': 'جاهز', 'Pret': 'جاهز',
  'Ok': 'حسنًا', 'ok': 'حسنًا',
  'Oui,': 'نعم،', 'non,': 'لا،',
  'Fermeture': 'إغلاق', 'fermeture': 'إغلاق',
  'Ouverture': 'فتح', 'ouverture': 'فتح',
  'Début': 'بداية', 'debut': 'بداية', 'Debut': 'بداية',
  'Fin': 'نهاية', 'fin': 'نهاية',
  'Départ': 'انطلاق', 'départ': 'انطلاق', 'Depart': 'انطلاق', 'depart': 'انطلاق',
  'Arrivé': 'وصل', 'arrivé': 'وصل',
  'Gagnant': 'الفائز', 'gagnant': 'الفائز',
  'Perdant': 'الخاسر', 'perdant': 'الخاسر',
  'Vainqueur': 'المنتصر', 'vainqueur': 'المنتصر',
  'Deuxième': 'الثاني', 'deuxieme': 'الثاني',
  'Troisième': 'الثالث', 'troisieme': 'الثالث',
  'Quatrième': 'الرابع', 'quatrieme': 'الرابع',
  'Cinquième': 'الخامس', 'cinquieme': 'الخامس',
}

function corriger(ar, fr) {
  if (!ar) return ar
  let out = ar
  // « cote » → le moteur a rendu « évaluation »
  if (/cote/i.test(fr)) out = out.replace(/التقييمات/g, 'الاحتمالات').replace(/التقييم/g, 'الاحتمال')
  // « corde » → « corde » (ficelle) devient « ligne de départ »
  if (/corde/i.test(fr)) out = out.replace(/الحبال/g, 'خطوط الانطلاق').replace(/حبل/g, 'خط الانطلاق')
  // « réunion » (PMU) → « rencontre » devient « réunion de courses »
  if (/r[ée]union/i.test(fr)) out = out.replace(/مقابلة/g, 'الشوط')
  // « Quinté » → « le cinquième »
  if (/quint[ée]/i.test(fr)) out = out.replace(/الخامس/g, 'كوينتي')
  return out
}

/* ── ② état ──────────────────────────────────────────────────────────────── */
const originaux = new WeakMap()      // TextNode → texte FR d'origine
const applique = new WeakMap()       // TextNode → texte AR que NOUS avons écrit
const attrOriginaux = new WeakMap()  // Element → { attr: valeur FR }

let dico = null
let dicoPret = null
let langue = 'fr'
let obs = null
let fileApi = []
let minuteurApi = null
let cacheMem = null
let apiCompteur = 0
const LIMITE_API = 120

const ATTRS = ['title', 'placeholder', 'alt', 'aria-label']
const BALISES_MUETTES = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'SVG', 'CANVAS'])

function cache() {
  if (cacheMem) return cacheMem
  try { cacheMem = JSON.parse(localStorage.getItem(CLE_CACHE) || '{}') } catch { cacheMem = {} }
  return cacheMem
}
function sauverCache() {
  try {
    const c = cache()
    const cles = Object.keys(c)
    if (cles.length > MAX_CACHE) for (const k of cles.slice(0, cles.length - MAX_CACHE)) delete c[k]
    localStorage.setItem(CLE_CACHE, JSON.stringify(c))
  } catch {}
}

/* ── ③ normalisation / filtres ───────────────────────────────────────────── */
const normaliser = (s) => String(s).replace(/\s+/g, ' ').trim()

function muet(el) {
  for (let n = el; n; n = n.parentElement) {
    if (BALISES_MUETTES.has(n.tagName)) return true
    if (n.getAttribute && n.getAttribute('data-no-trad') != null) return true
    if (n.isContentEditable) return true
  }
  return false
}

const MOTS_FONCTION = new Set(['pour','que','le','la','les','de','du','des','et','ou','à','au','aux','dans','sur','par','avec','sans','sous','vers','en','y','on','il','elle','ce','se','ne','pas','plus','très','bien','tout','tous','toute','toutes','un','une','son','sa','ses','leur','leurs','mon','ma','mes','ton','ta','tes','notre','nos','votre','vos','je','tu','nous','vous','ils','elles','est','sont','a','ont','va','vais','as','fait','faire','être','avoir','aller','voir','savoir','pouvoir','vouloir','devoir','falloir','jamais','toujours','souvent','parfois','encore','déjà','aussi','très','bien','mal','trop','peu','beaucoup','quoi','dont','où','quand','comment','pourquoi','si','ni','mais','or','donc','car','or','ni','ne','n','l','d','s','j','t','m','c','qu'])

function estPhrase(fr) {
  const mots = String(fr).toLowerCase().replace(/[^a-zà-ÿ\s]/g, ' ').split(/\s+/).filter(Boolean)
  return mots.some((m) => MOTS_FONCTION.has(m))
}

function motsMajuscules(v) {
  const mots = v.replace(/[·•|/–—:,;!?()[\]«»"'’]/g, ' ').split(/\s+/).filter((m) => m.length > 2)
  if (mots.length < 2) return true                    // 1 mot = nom propre probable
  return mots.every((m) => /^[A-ZÀ-Þ]/.test(m))       // tous capitalisés = nom propre
}

function aTraduire(v) {
  if (!v || v.length < 2) return false
  if (!/[A-Za-zÀ-ÿ]/.test(v)) return false            // aucune lettre latine
  if (!/[a-zà-ÿ]/.test(v)) return false               // tout en majuscules = sigle
  if (/^(https?:|mailto:|tel:)/i.test(v)) return false
  if (/^[\d\s.,:;%€$£+\-–—/()·°★⚠✅❌|#]+$/.test(v)) return false
  if (/^[\w.+-]+@[\w.-]+$/.test(v)) return false
  if (/^[\w-]+\.(js|json|css|png|jpe?g|svg|m3u8)$/i.test(v)) return false
  return true
}

/* une phrase « longue » : candidate à l'API si le dictionnaire ne la connaît pas */
function estProse(v) {
  return v.length >= 55 && v.split(/\s+/).length >= 8 && !motsMajuscules(v)
}

/* ── ④ le dictionnaire livré ─────────────────────────────────────────────── */
async function chargerDico() {
  if (dicoPret) return dicoPret
  dicoPret = (async () => {
    try {
      const mod = await import('./trad-ar.json')
      dico = mod.default || mod
    } catch { dico = {} }
    return dico
  })()
  return dicoPret
}

/* ── ⑤ l'API pour le contenu non prévu ───────────────────────────────────── */
async function apiTraduire(txt) {
  const c = cache()
  if (c[txt]) return c[txt]
  try {
    const u = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=ar&dt=t&q=' + encodeURIComponent(txt)
    const r = await fetch(u, { signal: AbortSignal.timeout(12000) })
    if (!r.ok) return null
    const j = await r.json()
    const out = (j?.[0] || []).map((p) => p?.[0] || '').join('').trim()
    if (!out || out === txt) return null
    c[txt] = out
    sauverCache()
    return out
  } catch { return null }
}

function viderFileApi() {
  minuteurApi = null
  const lot = fileApi
  fileApi = []
  let i = 0
  const suivant = async () => {
    while (i < lot.length) {
      const { noeud, fr } = lot[i++]
      if (!noeud.isConnected) continue
      if (applique.get(noeud) && noeud.nodeValue === applique.get(noeud)) continue
      const ar = await apiTraduire(fr)
      if (!ar) continue
      if (langue !== 'ar') continue
      const propre = corriger(ar, fr)
      originaux.set(noeud, noeud.nodeValue)
      applique.set(noeud, propre)
      noeud.nodeValue = avecEspaces(noeud.nodeValue, propre)
    }
  }
  for (let k = 0; k < 4; k++) suivant()
}

function echapper(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function patcherMots(fr) {
  let out = fr
  const keys = Object.keys(LEXIQUE_COURT).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (k.length < 3) continue
    const v = LEXIQUE_COURT[k]
    const re = new RegExp(echapper(k), 'g')
    out = out.replace(re, v)
  }
  // « du jour » est un libellé courant ; « du/le/la/les » seuls ne sont PAS
  // touchés (sinon les phrases longues sont massacréees par le patcheur).
  out = out.replace(/\bdu jour\b/g, 'اليوم')
  return out
}

function avecEspaces(orig, nouveau) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(orig)
  return m ? m[1] + nouveau + m[3] : nouveau
}

/* ── ⑥ le cœur : un nœud texte ───────────────────────────────────────────── */
function traiterNoeud(noeud) {
  if (!noeud || noeud.nodeType !== 3) return
  const parent = noeud.parentElement
  if (!parent || muet(parent)) return

  /* déjà à nous ? */
  const deja = applique.get(noeud)
  if (deja != null && noeud.nodeValue === deja) return

  const fr = noeud.nodeValue
  const cle = normaliser(fr)
  if (!aTraduire(cle)) return

  /* le français a été réécrit par React : on repart de la nouvelle valeur */
  if (originaux.has(noeud) && normaliser(originaux.get(noeud)) !== cle) {
    originaux.delete(noeud)
    applique.delete(noeud)
  }

  /* le lexique court prime sur le dictionnaire long */
  let trad = LEXIQUE_COURT[cle] || LEXIQUE_COURT[fr]
  if (!trad) trad = dico?.[cle]
  if (trad) {
    if (!originaux.has(noeud)) originaux.set(noeud, fr)
    const propre = corriger(trad, cle)
    applique.set(noeud, avecEspaces(fr, propre))
    noeud.nodeValue = avecEspaces(fr, propre)
    return
  }

  /* ① patch mot-à-mot pour les libellés courts (« Réunion 1 · Course 4 »).
   *    On ne patche QUE les libellés (pas de mot-outil français) : sinon les
   *    phrases sont massacrées (« texte » → « نص » au milieu d'une phrase). */
  if (cle.length < 120 && !estPhrase(cle)) {
    const patche = patcherMots(cle)
    if (patche && patche !== cle) {
      if (!originaux.has(noeud)) originaux.set(noeud, fr)
      const propre = corriger(patcherMots(cle), cle)
      applique.set(noeud, avecEspaces(fr, propre))
      noeud.nodeValue = avecEspaces(fr, propre)
      return
    }
  }

  /* ② l'API pour tout le reste (y compris les phrases courtes non connues) */
  if (aTraduire(cle) && !motsMajuscules(cle) && apiCompteur < LIMITE_API) {
    if (!originaux.has(noeud)) originaux.set(noeud, fr)
    apiCompteur++
    fileApi.push({ noeud, fr: cle })
    if (!minuteurApi) minuteurApi = setTimeout(viderFileApi, 350)
  }
}

/* ── ⑦ les attributs (title, placeholder… ) ──────────────────────────────── */
function traiterAttributs(el) {
  if (!el || el.nodeType !== 1 || muet(el)) return
  for (const a of ATTRS) {
    const v = el.getAttribute && el.getAttribute(a)
    if (!v) continue
    const cle = normaliser(v)
    if (!aTraduire(cle)) continue
    let map = attrOriginaux.get(el)
    if (!map) { map = {}; attrOriginaux.set(el, map) }
    if (map[a] == null) map[a] = v
    let trad = LEXIQUE_COURT[cle] || LEXIQUE_COURT[v] || dico?.[cle]
    if (trad) {
      const propre = corriger(trad, cle)
      if (el.getAttribute(a) !== propre) el.setAttribute(a, propre)
    }
  }
}

/* ── ⑧ parcours d'un arbre ───────────────────────────────────────────────── */
function traiterArbre(racine) {
  if (!racine) return
  if (racine.nodeType === 3) { traiterNoeud(racine); return }
  if (racine.nodeType !== 1) return
  if (muet(racine)) return
  traiterAttributs(racine)
  const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, {
    acceptNode(n) { return muet(n.parentElement || racine) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT },
  })
  const lot = []
  let n
  while ((n = w.nextNode())) lot.push(n)
  for (const x of lot) traiterNoeud(x)
  racine.querySelectorAll?.('*[title],*[placeholder],*[alt],*[aria-label]').forEach(traiterAttributs)
}

function restaurer() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const lot = []
  let n
  while ((n = w.nextNode())) if (originaux.has(n)) lot.push(n)
  for (const x of lot) {
    const fr = originaux.get(x)
    if (fr != null && x.nodeValue !== fr) x.nodeValue = fr
    applique.delete(x)
  }
  document.querySelectorAll('*[title],*[placeholder],*[alt],*[aria-label]').forEach((el) => {
    const map = attrOriginaux.get(el)
    if (!map) return
    for (const a of ATTRS) if (map[a] != null && el.getAttribute(a) !== map[a]) el.setAttribute(a, map[a])
  })
}

/* ── ⑨ point d'entrée ────────────────────────────────────────────────────── */
export async function appliquerTraduction(lang) {
  langue = lang === 'ar' ? 'ar' : 'fr'
  if (typeof document === 'undefined') return

  if (langue === 'fr') {
    if (obs) { obs.disconnect(); obs = null }
    restaurer()
    return
  }

  await chargerDico()
  if (langue !== 'ar') return
  apiCompteur = 0
  traiterArbre(document.body)

  if (!obs) {
    obs = new MutationObserver((muts) => {
      if (langue !== 'ar') return
      for (const m of muts) {
        if (m.type === 'childList') {
          for (const a of m.addedNodes) traiterArbre(a)
        } else if (m.type === 'characterData') {
          traiterNoeud(m.target)
        } else if (m.type === 'attributes' && m.target.nodeType === 1) {
          traiterAttributs(m.target)
        }
      }
    })
    obs.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    })
  }
}
