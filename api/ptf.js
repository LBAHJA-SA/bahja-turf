/* /api/ptf -> horse-racing-api.paris-turf.com (la carrière des chevaux : la
   page Chevaux lit cette API). Le MEME code que le middleware de
   vite.config.js : ce qui marche en local marche en ligne.

   ⚠ L'API REFUSE LE DOMAINE VERCEL (« Origin … is not allowed », 403 au
   preflight). Le relais serveur enlève l'en-tête `Origin` et pose la clé :
   mesuré le 17/10/2026. Sans lui, la page ne peut pas marcher en ligne. */
import { proxy } from './_proxy.js'
export default proxy('ptf')
