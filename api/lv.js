/* /api/lv -> www.leveinard.com (LE VEINARD — le quotidien hippique et ses
   actualités). Même code que le middleware de vite.config.js.
   ⚠ Le site n'envoie AUCUN en-tête CORS : le navigateur ne peut pas le lire
   en direct (mesuré le 18/10/2026). D'où le relais. */
import { proxy } from './_proxy.js'
export default proxy('lv')
