/* /api/eq -> www.equidia.fr (le marche : rapp_evol = la cote en direct).
   equidia colle l'etat du marche dans <script id=serverApp-state>.
   Meme code que le middleware de vite.config.js. */
import { proxy } from './_proxy.js'
export default proxy('eq')