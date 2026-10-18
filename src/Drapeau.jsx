/* ══════════════════════════════════════════════════════════════════════════
 *  src/Drapeau.jsx — LE DRAPEAU DU PAYS D'UNE RÉUNION (18/10/2026)
 *
 *  ⚠ POURQUOI PAS UN EMOJI 🇫🇷
 *  Windows ne dessine PAS les drapeaux emoji : « 🇨🇭 » sort « CH » en clair,
 *  « 🇺🇾 » sort « UY ». Sur la machine de l'utilisateur, un drapeau emoji n'est
 *  pas un drapeau — c'est deux lettres. On dessine donc de VRAIES images :
 *  les SVG de `flag-icons`, copiés dans `public/drapeaux/<iso2>.svg`.
 *
 *  Pourquoi des fichiers dans `public/` plutôt que le paquet npm :
 *  le paquet livre 271 drapeaux (1,9 Mo) et sa feuille de style les
 *  embarquerait tous. Ici on ne copie que les pays qui jouent au PMU, et le
 *  navigateur ne télécharge QUE le drapeau affiché (~1 à 10 Ko).
 *
 *  Usage :
 *      import Drapeau from '../../src/Drapeau.jsx'
 *      <Drapeau pays={m.pays} />                 // « SUISSE », « FR », « UY »
 *      <Drapeau code="ch" titre="Suisse" h={15} />
 *
 *  ⚠ Le pays arrive écrit de deux façons selon la page : le nom français en
 *  capitales (« ETATS-UNIS », « ROYAUME-UNI ») ou le code à deux lettres
 *  (« FR », « CH »). Les deux sont acceptés. Pays inconnu → le composant
 *  n'affiche RIEN (jamais une image cassée, jamais un carré vide).
 * ══════════════════════════════════════════════════════════════════════════ */

/** « Royaume-Uni » → « ROYAUMEUNI », « États-Unis » → « ETATSUNIS ». */
function normalise(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '')
}

/** Le nom du pays → le code ISO2 du drapeau (le fichier `public/drapeaux/…`). */
const CODES = {
  /* ── France et les siens ─────────────────────────────────────────────── */
  FRANCE: 'fr', FR: 'fr', METROPOLE: 'fr', GUADELOUPE: 'fr', MARTINIQUE: 'fr',
  REUNION: 'fr', GUYANE: 'fr', MAYOTTE: 'fr', CORSE: 'fr',
  /* ── Europe ──────────────────────────────────────────────────────────── */
  ROYAUMEUNI: 'gb', GB: 'gb', UK: 'gb', ANGLETERRE: 'gb', ECOSSE: 'gb',
  IRLANDEDUNORD: 'gb', GRANDEBRETAGNE: 'gb',
  IRLANDE: 'ie', IE: 'ie',
  SUISSE: 'ch', CH: 'ch', SUI: 'ch',
  ALLEMAGNE: 'de', DE: 'de', ALL: 'de',
  BELGIQUE: 'be', BE: 'be', BEL: 'be',
  PAYSBAS: 'nl', NL: 'nl', PB: 'nl', HOLLANDE: 'nl',
  ESPAGNE: 'es', ES: 'es', ESP: 'es',
  ITALIE: 'it', IT: 'it', ITA: 'it',
  PORTUGAL: 'pt', PT: 'pt',
  SUEDE: 'se', SE: 'se', SU: 'se', SUEDE: 'se',
  NORVEGE: 'no', NO: 'no', NOR: 'no',
  DANEMARK: 'dk', DK: 'dk', DAN: 'dk',
  FINLANDE: 'fi', FI: 'fi',
  ISLANDE: 'is', IS: 'is',
  AUTRICHE: 'at', AT: 'at',
  POLOGNE: 'pl', PL: 'pl',
  TCHEQUIE: 'cz', CZ: 'cz', REPUBLIQUETCHEQUE: 'cz',
  SLOVAQUIE: 'sk', SK: 'sk',
  HONGRIE: 'hu', HU: 'hu',
  GRECE: 'gr', GR: 'gr',
  ROUMANIE: 'ro', RO: 'ro',
  BULGARIE: 'bg', BG: 'bg',
  CROATIE: 'hr', HR: 'hr',
  SLOVENIE: 'si', SI: 'si',
  SERBIE: 'rs', RS: 'rs',
  BOSNIE: 'ba', BA: 'ba', BOSNIEHERZEGOVINE: 'ba',
  MACEDOINE: 'mk', MK: 'mk',
  ALBANIE: 'al', AL: 'al',
  MONTENEGRO: 'me', ME: 'me',
  MOLDAVIE: 'md', MD: 'md',
  ESTONIE: 'ee', EE: 'ee',
  LETTONIE: 'lv', LV: 'lv',
  LITUANIE: 'lt', LT: 'lt',
  UKRAINE: 'ua', UA: 'ua',
  RUSSIE: 'ru', RU: 'ru',
  TURQUIE: 'tr', TR: 'tr',
  LUXEMBOURG: 'lu', LU: 'lu',
  MONACO: 'mc', MC: 'mc',
  ANDORRE: 'ad', AD: 'ad',
  MALTE: 'mt', MT: 'mt',
  CHYPRE: 'cy', CY: 'cy',
  SAINTMARIN: 'sm', LECHTENSTEIN: 'li',
  /* ── Afrique du Nord et Moyen-Orient ─────────────────────────────────── */
  MAROC: 'ma', MA: 'ma', MAR: 'ma',
  TUNISIE: 'tn', TN: 'tn',
  ALGERIE: 'dz', DZ: 'dz',
  EGYPTE: 'eg', EG: 'eg',
  LIBYE: 'ly', LY: 'ly',
  ARABIESAOUDITE: 'sa', SA: 'sa',
  EMIRATS: 'ae', AE: 'ae', EMIRATSARABESUNIS: 'ae',
  QATAR: 'qa', QA: 'qa',
  BAHREIN: 'bh', BH: 'bh',
  KOWEIT: 'kw', KW: 'kw',
  OMAN: 'om', OM: 'om',
  JORDANIE: 'jo', JO: 'jo',
  LIBAN: 'lb', LB: 'lb',
  ISRAEL: 'il', IL: 'il',
  /* ── Amériques ───────────────────────────────────────────────────────── */
  ETATSUNIS: 'us', US: 'us', USA: 'us', ETATSUNISDAMERIQUE: 'us',
  CANADA: 'ca', CA: 'ca',
  MEXIQUE: 'mx', MX: 'mx',
  BRESIL: 'br', BR: 'br',
  ARGENTINE: 'ar', AR: 'ar',
  CHILI: 'cl', CL: 'cl', CHILE: 'cl',
  URUGUAY: 'uy', UY: 'uy',
  PEROU: 'pe', PE: 'pe',
  BOLIVIE: 'bo', BO: 'bo',
  PARAGUAY: 'py', PY: 'py',
  COLOMBIE: 'co', CO: 'co',
  EQUATEUR: 'ec', EC: 'ec',
  VENEZUELA: 've', VE: 've',
  PANAMA: 'pa', PA: 'pa',
  GUATEMALA: 'gt', GT: 'gt',
  HONDURAS: 'hn', HN: 'hn',
  NICARAGUA: 'ni', NI: 'ni',
  COSTARICA: 'cr', CR: 'cr',
  SALVADOR: 'sv', ELSALVADOR: 'sv', SV: 'sv',
  CUBA: 'cu', CU: 'cu',
  JAMAIQUE: 'jm', JM: 'jm',
  TRINITEETTOBAGO: 'tt', TRINITETOBAGO: 'tt',
  REPUBLIQUEDOMINICAINE: 'do', DO: 'do',
  /* ── Océan Indien, Afrique, Asie, Océanie ────────────────────────────── */
  AFRIQUEDUSUD: 'za', ZA: 'za',
  MAURICE: 'mu', MU: 'mu', ILEMAURICE: 'mu',
  AUSTRALIE: 'au', AU: 'au',
  JAPON: 'jp', JP: 'jp',
  HONGKONG: 'hk', HK: 'hk',
  SINGAPOUR: 'sg', SG: 'sg',
  COREDUSUD: 'kr', KR: 'kr',
  INDE: 'in', IN: 'in',
  INDONESIE: 'id', ID: 'id',
  THAILANDE: 'th', TH: 'th',
  MALAISIE: 'my', MY: 'my',
  PHILIPPINES: 'ph', PH: 'ph',
  VIETNAM: 'vn', VN: 'vn',
  CHINE: 'cn', CN: 'cn',
  TAIWAN: 'tw', TW: 'tw',
}

/** Le pays (nom français ou code) → son code ISO2. '' si on ne le connaît pas. */
export function drapeauCode(pays) {
  const cle = normalise(pays)
  if (!cle) return ''
  if (CODES[cle]) return CODES[cle]
  /* un code à 2 lettres déjà bon (« CH », « UY ») — à condition d'avoir copié
     son drapeau, sinon on n'affiche rien. */
  if (cle.length === 2 && CODES[cle]) return CODES[cle]
  return ''
}

/**
 *  Le drapeau. `pays` suffit dans 99 % des cas.
 *    h    : la hauteur en pixels (la largeur suit, le drapeau est en 4/3)
 *    titre: l'infobulle (par défaut le pays tel qu'il est écrit)
 */
export default function Drapeau({ pays, code, h = 13, titre, style }) {
  const c = code || drapeauCode(pays)
  if (!c) return null
  return (
    <img
      src={'/drapeaux/' + c + '.svg'}
      alt={titre || pays || c}
      title={titre || pays || ''}
      style={{
        height: h, width: 'auto', flex: '0 0 auto', display: 'block',
        borderRadius: 2,
        boxShadow: '0 0 0 1px rgba(255,255,255,.25), 0 1px 3px rgba(0,0,0,.55)',
        ...style,
      }}
    />
  )
}
