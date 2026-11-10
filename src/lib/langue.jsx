/* =============================================================================
 * src/lib/langue.js — TRADUCTION AR / FR (07/11/2026)
 *  Langage de la page : FR par défaut (préférence utilisateur), AR sur demande.
 *  Système 100% React (pas de mutation DOM hors React → pas de crash
 *  NotFoundError lié à Google Translate). `translate="no"` reste dans index.html.
 *  La traduction statique vient du VOCAB ci-dessous ; le contenu dynamique
 *  long (articles Presse, analyses, commentaires) passe par useTranslatedText
 *  (MyMemory en mode AR, repli silencieux sur le texte original hors ligne).
 * ============================================================================= */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { appliquerTraduction } from './trad-dom.js'

const CLE = 'bahja-lang'

export const VOCAB = {
  // navigation
  nav_analyse: { fr: 'Analyse course', ar: 'تحليل السباق' },
  nav_quinte: { fr: 'Quinté', ar: 'Quinté' },
  nav_pronostique: { fr: 'PRONOSTIQUE BAHJA TURF', ar: 'تنبؤات باحجا تورف' },
  nav_presse: { fr: 'Presse', ar: 'الصحافة' },
  nav_lives: { fr: 'Lives', ar: 'مباشر' },
  nav_dna: { fr: 'DNA COURSE', ar: 'DNA COURSE' },
  nav_resultats: { fr: 'Résultats', ar: 'النتائج' },
  nav_probability: { fr: 'Probabilité', ar: 'الاحتمالات' },
  nav_deconnexion: { fr: 'Déconnexion', ar: 'تسجيل الخروج' },
  nav_lang: { fr: 'العربية', ar: 'Français' },
  // commun
  chargement: { fr: 'Chargement…', ar: 'جار التحميل…' },
  recharger: { fr: 'Recharger la page', ar: 'إعادة تحميل الصفحة' },
  reessayer: { fr: 'Réessayer', ar: 'إعادة المحاولة' },
  fermer: { fr: 'Fermer', ar: 'إغلاق' },
  voir: { fr: 'Voir', ar: 'عرض' },
  tout: { fr: 'Tout', ar: 'الكل' },
  plat: { fr: 'Plat', ar: 'تسطيح' },
  attele: { fr: 'Attelé', ar: 'مقرن' },
  haies: { fr: 'Haies', ar: 'حواجز' },
  monte: { fr: 'Monté', ar: 'فارس مرتفع' },
  discipline: { fr: 'Discipline', ar: 'التخصص' },
  erreur: { fr: 'Erreur', ar: 'خطأ' },
  erreur_affichage: { fr: 'Erreur d’affichage — la page s’est arrêtée', ar: 'خطأ في العرض — توقفت الصفحة' },
  erreur_detail: { fr: 'React n’a pas pu mettre l’écran à jour.', ar: 'تعذر على React تحديث الشاشة.' },
  aucune_donnee: { fr: 'Aucune donnée', ar: 'لا توجد بيانات' },
  pas_encore: { fr: 'Pas encore disponible', ar: 'غير متوفر بعد' },
  // portail
  acces_abonne: { fr: 'accès abonné', ar: 'دخول المشتركين' },
  nom_utilisateur: { fr: 'nom d’utilisateur', ar: 'اسم المستخدم' },
  mot_de_passe: { fr: 'mot de passe', ar: 'كلمة المرور' },
  entrer: { fr: 'Entrer', ar: 'دخول' },
  verification: { fr: 'vérification…', ar: 'جار التحقق…' },
  verifier_session: { fr: 'vérification de la session…', ar: 'جار التحقق من الجلسة…' },
  ecris_nom: { fr: 'écris ton nom et ton mot de passe', ar: 'اكتب اسمك وكلمة المرور' },
  mot_verifie: { fr: 'Le mot de passe est vérifié par le serveur.', ar: 'يتم التحقق من كلمة المرور من الخادم.' },
  page_non_abonnement: { fr: 'Cette page n’est pas dans ton abonnement', ar: 'هذه الصفحة ليست ضمن اشتراكك' },
  pages_ouvertes: { fr: 'Les pages ouvertes à ton compte sont celles du menu ; pour en ajouter une, vois avec l’administrateur.', ar: 'الصفحات المفتوحة لحسابك هي صفحات القائمة؛ أضف صفحة أخرى عبر المسؤول.' },
  aller_page_autorisee: { fr: 'Aller à la page autorisée', ar: 'الانتقال إلى الصفحة المسموحة' },
  se_deconnecter: { fr: 'Se déconnecter', ar: 'تسجيل الخروج' },
  acces_ferme: { fr: 'Accès fermé', ar: 'الولوج مغلق' },
  acces_non_configure: { fr: 'Le service de connexion n’est pas configuré. Le site reste inaccessible jusqu’à ce que l’administrateur rétablisse les comptes.', ar: 'خدمة الاتصال غير مهيأة. يبقى الموقع غير متاح حتى يعيد المسؤول تفعيل الحسابات.' },
  abonnement_expire: { fr: 'Abonnement expiré', ar: 'انتهى الاشتراك' },
  contact_administrateur: { fr: 'contacte l’administrateur.', ar: 'اتصل بالمسؤول.' },
  // analyse
  analyse_titre: { fr: 'Analyse course', ar: 'تحليل السباق' },
  analyse_sous: { fr: 'Toutes les courses · tous les chevaux', ar: 'كل السباقات · كل الخيول' },
  programme_jour: { fr: 'LE PROGRAMME DU JOUR', ar: 'برنامج اليوم' },
  partants: { fr: 'Partants', ar: 'المشاركون' },
  carriere: { fr: 'La carrière', ar: 'المسيرة' },
  par_pere: { fr: 'par', ar: 'عبر' },
  et: { fr: 'et', ar: 'و' },
  depuis_derniere: { fr: 'depuis la dernière course', ar: 'منذ السباق الأخير' },
  filtres: { fr: 'Filtres', ar: 'الفلاتر' },
  totaux: { fr: 'Totaux', ar: 'المجاميع' },
  courses: { fr: 'courses', ar: 'سباقات' },
  victoires: { fr: 'victoires', ar: 'انتصارات' },
  places: { fr: 'places', ar: 'مراكز' },
  hippodrome: { fr: 'Hippodrome', ar: 'مضمار السباق' },
  distance: { fr: 'Distance', ar: 'المسافة' },
  terrain: { fr: 'Terrain', ar: 'الأرضية' },
  type: { fr: 'Type', ar: 'النوع' },
  jockey: { fr: 'Jockey', ar: 'الفارس' },
  poids: { fr: 'Poids', ar: 'الوزن' },
  fer: { fr: 'Fer', ar: 'الحديد' },
  // article
  chargement_course: { fr: 'Chargement de la course…', ar: 'جار تحميل السباق…' },
  course_indispo: { fr: 'Cette course n’est pas disponible', ar: 'هذا السباق غير متوفر' },
  course_indispo2: { fr: 'course indisponible pour le moment.', ar: 'السباق غير متاح حالياً.' },
  // dna programme
  programme_titre: { fr: 'LE PROGRAMME', ar: 'البرنامج' },
  reunion_maroc: { fr: 'Réunion du Maroc pas encore publiée par la SOREC', ar: 'اجتماع المغرب لم يُنشر بعد من طرف SOREC' },
  // lives
  en_direct: { fr: 'En direct', ar: 'مباشر' },
  a_venir: { fr: 'À venir', ar: 'قادم' },
  sans_flux: { fr: 'Sans flux', ar: 'بدون بث' },
  termine: { fr: 'Terminé', ar: 'انتهى' },
  ouverture_flux: { fr: 'Ouverture du flux…', ar: 'جار فتح البث…' },
  flux_ouvre_pas: { fr: 'Le flux ne s’ouvre pas (hors direct, ou bloqué par l’éditeur).', ar: 'تعذر فتح البث (خارج المباشر أو محظور من الناشر).' },
  // presse
  presse_titre: { fr: 'Presse', ar: 'الصحافة' },
  // pronostique
  espace_pronostics: { fr: 'ESPACE PRONOSTICS', ar: 'فضاء التنبؤات' },
  prono_titre: { fr: 'PRONOSTIQUE BAHJA TURF', ar: 'تنبؤات باحجا تورف' },
  prono_sous: { fr: 'Les pronostics favoris de Bahja Turf.', ar: 'التنبؤات المفضلة لباحجا تورف.' },
  // quinte
  grille_titre: { fr: 'La grille', ar: 'الشبكة' },
  ticket_titre: { fr: 'Le ticket', ar: 'الورقة' },
  archive_titre: { fr: 'Archive', ar: 'الأرشيف' },
  stats_titre: { fr: 'Statistiques', ar: 'الإحصائيات' },
  ecarts_titre: { fr: 'Écarts', ar: 'الفروقات' },
  conditions_course: { fr: 'LES CONDITIONS DE LA COURSE', ar: 'شروط السباق' },
  p1_p5: { fr: 'P1-P5 seulement', ar: 'فقط P1-P5' },
  voir_p20: { fr: 'Voir jusqu’à P20', ar: 'العرض حتى P20' },
  // resultats
  resultats_titre: { fr: 'RÉSULTATS & RAPPORTS', ar: 'النتائج والتقارير' },
  arrivees_rapports: { fr: 'Arrivées et rapports', ar: 'الوصول والتقارير' },
  // admin
  admin_titre: { fr: 'Administration', ar: 'الإدارة' },
  // paris bets
  bet_simple_gagnant: { fr: 'Simple Gagnant', ar: 'فردي رابح' },
  bet_simple_place: { fr: 'Simple Placé', ar: 'فردي مركز' },
  bet_couple_gagnant: { fr: 'Couplé Gagnant', ar: 'زوجي رابح' },
  bet_couple_place: { fr: 'Couplé Placé', ar: 'زوجي مركز' },
  bet_tierce: { fr: 'Tiercé', ar: 'ثلاثي' },
  bet_quarte: { fr: 'Quarté', ar: 'رباعي' },
  bet_quinte: { fr: 'Quinté+', ar: 'خماسي+' },
  bet_simple: { fr: 'Simple', ar: 'فردي' },
  bet_gagnant: { fr: 'Gagnant', ar: 'رابح' },
  bet_place: { fr: 'Placé', ar: 'مركز' },
  bet_couple: { fr: 'Couplé', ar: 'زوجي' },
  // ── extension 07/11/2026 : toutes pages ──
  lecture_programme: { fr: 'Lecture du programme…', ar: 'جار قراءة البرنامج…' },
  lecture_partants: { fr: 'Lecture des partants…', ar: 'جار قراءة المشاركين…' },
  lecture_carriere: { fr: 'Lecture de la carrière…', ar: 'جار قراءة المسيرة…' },
  lecture_course: { fr: 'Lecture de la course…', ar: 'جار قراءة السباق…' },
  rien_afficher: { fr: 'Rien à afficher.', ar: 'لا شيء للعرض.' },
  sans_partants: { fr: 'sans partants', ar: 'بدون مشاركين' },
  cheval: { fr: 'Cheval', ar: 'الخيل' },
  artifices: { fr: 'Artifices', ar: 'إكسسوارات' },
  entraineur: { fr: 'Entraîneur', ar: 'المدرب' },
  cote: { fr: 'Cote', ar: 'السعر' },
  rang: { fr: 'Rang', ar: 'الترتيب' },
  corde: { fr: 'Corde', ar: 'الحبل' },
  place: { fr: 'Place', ar: 'المركز' },
  chrono: { fr: 'Chrono', ar: 'الزمن' },
  ecart: { fr: 'Écart', ar: 'الفارق' },
  gains: { fr: 'Gains', ar: 'الأرباح' },
  valeur: { fr: 'Valeur', ar: 'القيمة' },
  proprietaire: { fr: 'Propriétaire', ar: 'المالك' },
  musique: { fr: 'Musique', ar: 'الموسيقى' },
  exporter: { fr: 'Exporter', ar: 'تصدير' },
  importer: { fr: 'Importer', ar: 'استيراد' },
  enregistrer: { fr: 'Enregistrer', ar: 'حفظ' },
  annuler: { fr: 'Annuler', ar: 'إلغاء' },
  utiliser: { fr: 'Utiliser', ar: 'استعمال' },
  rafraichir: { fr: 'Rafraîchir', ar: 'تحديث' },
  lives_en_cours: { fr: 'Lives en cours', ar: 'البث المباشر' },
  aucune_reunion: { fr: 'Aucune réunion régionale', ar: 'لا اجتماع إقليمي' },
  regarder_sorec: { fr: 'Regarder sur le site SOREC', ar: 'المشاهدة على موقع SOREC' },
  relais_decale: { fr: 'Relais décalé', ar: 'مرحّل مؤجل' },
  lien_externe: { fr: 'lien externe', ar: 'رابط خارجي' },
  metre: { fr: 'Métrique', ar: 'مقياس' },
  moteur: { fr: 'Moteur', ar: 'المحرك' },
  marche_seul: { fr: 'Marché seul', ar: 'السوق وحده' },
  classement_principal: { fr: 'Classement principal', ar: 'الترتيب الرئيسي' },
  selections_outsider: { fr: 'Sélections outsider / tocard', ar: 'اختيارات الخارجين' },
  couples_trios: { fr: 'Couplés & trios', ar: 'الأزواج والثلاثيات' },
  surfaces_zone: { fr: 'Surfaces par zone', ar: 'المساحات حسب المنطقة' },
  piscines_outsider: { fr: 'Piscines outsider / tocard', ar: 'مسابح الخارجين' },
  structures_compatibles: { fr: 'Structures compatibles', ar: 'الهياكل المتوافقة' },
  aucun_cheval_bande: { fr: 'Aucun cheval dans cette bande pour cette course.', ar: 'لا خيل في هذه الفئة لهذا السباق.' },
  journal: { fr: 'Journal', ar: 'الصحيفة' },
  date: { fr: 'Date', ar: 'التاريخ' },
  arrivee: { fr: 'Arrivée', ar: 'الوصول' },
  details: { fr: 'Détails', ar: 'التفاصيل' },
  chargement_pronostics: { fr: 'Chargement des pronostics…', ar: 'جار تحميل التنبؤات…' },
  aucun_pronostic: { fr: 'Aucun pronostic publié pour le moment.', ar: 'لا تنبؤ منشور حالياً.' },
  synthese: { fr: 'La Synthèse', ar: 'الخلاصة' },
  pronostic: { fr: 'Pronostic', ar: 'التنبؤ' },
  aptitudes: { fr: 'Aptitudes — Courses · Victoires · Placés', ar: 'القدرات — سباقات · انتصارات · مراكز' },
  cas: { fr: 'Cas.', ar: 'حالة.' },
  viv: { fr: 'Vict.', ar: 'انتصارات.' },
  places_label: { fr: 'Placés', ar: 'مراكز' },
  filtre_carriere: { fr: 'Filtrer la carrière', ar: 'فلترة المسيرة' },
  afficher_commentaires: { fr: 'Afficher les commentaires', ar: 'إظهار التعليقات' },
  carriere_non_publiee: { fr: 'Carrière non publiée pour ce cheval.', ar: 'المسيرة غير منشورة لهذا الخيل.' },
  aucune_correspondance: { fr: 'Aucune course ne correspond aux filtres', ar: 'لا سباق يطابق الفلاتر' },
  tout_effacer: { fr: 'tout effacer', ar: 'حذف الكل' },
  demain_dans: { fr: 'DEMAIN · DANS', ar: 'غداً · في' },
  partie: { fr: 'partie', ar: 'جزء' },
  morale: { fr: 'Filtrer', ar: 'فلترة' },
}

function normaliser(lang) {
  return lang === 'ar' ? 'ar' : 'fr'
}

function lireLangue() {
  try {
    const v = localStorage.getItem(CLE)
    return normaliser(v || 'fr')
  } catch { return 'fr' }
}

const LangContext = createContext({ lang: 'fr', setLang: () => {}, t: (k) => (VOCAB[k]?.fr ?? k) })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => lireLangue())
  useEffect(() => {
    try { localStorage.setItem(CLE, lang) } catch {}
    document.documentElement.lang = lang === 'ar' ? 'ar' : 'fr'
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('data-lang', lang)
    /* ⭐ 07/11/2026 — la traduction de TOUT l'écran (pas seulement les clés
       `t()`). Voir `trad-dom.js` : elle traduit les nœuds de texte avec un
       dictionnaire livré (1 261 phrases) + l'API pour le contenu long. */
    appliquerTraduction(lang)
  }, [lang])
  const setLang = useCallback((l) => setLangState(normaliser(l)), [])
  const t = useCallback((k, vars) => {
    const e = VOCAB[k]
    let s = e ? e[lang] ?? e.fr : k
    if (vars) for (const [kk, vv] of Object.entries(vars)) s = s.replace('{'+kk+'}', vv)
    return s
  }, [lang])
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useLang() { return useContext(LangContext) }

export function LangToggle({ inlineStyle }) {
  const { lang, setLang } = useLang()
  const cible = lang === 'fr' ? 'ar' : 'fr'
  return (
    <button
      type="button"
      onClick={() => setLang(cible)}
      title={cible === 'ar' ? 'الترجمة إلى العربية' : 'Traduire en français'}
      aria-label="Language / اللغة"
      style={{
        padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
        fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
        color: '#e2e8f0', background: 'rgba(34,211,238,.16)',
        border: '1px solid rgba(34,211,238,.4)',
        ...inlineStyle,
      }}
    >
      <i className="bi bi-translate" /> {lang === 'fr' ? 'العربية' : 'Français'}
    </button>
  )
}

// ── Traduction du contenu dynamique long ────────────────────────────────────
const cacheTraduction = new Map()
let limiteAtteinte = false
async function traduireSegment(texte) {
  if (!texte || !texte.trim()) return texte
  if (cacheTraduction.has(texte)) return cacheTraduction.get(texte)
  // découpage ~450 caractères (limite MyMemory)
  const morceaux = []
  let reste = texte
  while (reste.length > 450) {
    let coupe = reste.lastIndexOf(' ', 450)
    if (coupe < 100) coupe = 450
    morceaux.push(reste.slice(0, coupe))
    reste = reste.slice(coupe).trimStart()
  }
  if (reste) morceaux.push(reste)
  const sorties = []
  for (const m of morceaux) {
    const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(m) + '&langpair=fr|ar'
    try {
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok) throw new Error('http ' + r.status)
      const j = await r.json()
      const out = j?.responseData?.translatedText
      if (!out || /invalid|quer|limit/i.test(out)) { limiteAtteinte = true; sorties.push(m); }
      else sorties.push(out)
    } catch { limiteAtteinte = true; sorties.push(m); }
    if (limiteAtteinte) break
  }
  const final = limiteAtteinte ? texte : sorties.join(' ')
  if (!limiteAtteinte) cacheTraduction.set(texte, final)
  return final
}

export function useTranslatedText(texte) {
  const { lang } = useLang()
  const [endu, setEndu] = useState(texte)
  const [enCours, setEnCours] = useState(false)
  useEffect(() => {
    if (lang !== 'ar' || !texte) { setEndu(texte); return }
    let monte = true
    setEnCours(true)
    traduireSegment(texte).then((tr) => { if (monte) { setEndu(tr); setEnCours(false) } }).catch(() => { if (monte) setEnCours(false) })
    return () => { monte = false }
  }, [lang, texte])
  return { texte: endu, enCours }
}

// helpers de format localisé
export function localeDe(lang) { return lang === 'ar' ? 'ar-MA' : 'fr-FR' }
export function dirDe(lang) { return lang === 'ar' ? 'rtl' : 'ltr' }

export function TraduitTexte({ texte, style, className }) {
  const { texte: tr, enCours } = useTranslatedText(texte || '')
  const { lang } = useLang()
  return <span style={style} className={className} dir={lang === 'ar' ? 'rtl' : 'ltr'}>{tr}{enCours ? ' …' : ''}</span>
}
