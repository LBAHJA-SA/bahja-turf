/* /api/tf -> www.turf-france.com (reu.php, tqqjour.php : les tableaux du Quinte).
   Le site n'envoie AUCUN en-tete CORS : sans ce proxy, le navigateur refuse.
   Meme code que le middleware de vite.config.js. */
import { proxy } from './_proxy.js'
export default proxy('tf')