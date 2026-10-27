/* /api/pmu -> online.turfinfo.api.pmu.fr (les RAPPORTS OFFICIELS).
 *
 * La page `/resultats` demande, course par course :
 *   /api/pmu/rest/client/61/programme/23102026/R1/C4/rapports-definitifs
 * et reçoit le dividende de chaque pari en centimes pour 1 €.
 *
 * ⭐ POURQUOI UN RELAIS : l'API du PMU n'envoie aucun en-tête CORS (mesuré le
 *   24/10/2026 : « Failed to fetch » depuis la page). Même code que /api/eq.
 */
import { proxy } from './_proxy.js'
export default proxy('pmu')
