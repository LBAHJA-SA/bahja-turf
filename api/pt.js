/* /api/pt -> pronostics-turf.info (la Synthese de la presse).
   Le MEME code que le middleware de vite.config.js : ce qui marche en local
   marche en ligne. */
import { proxy } from './_proxy.js'
export default proxy('pt')