/* /api/gz -> www.lagazettedescourses.fr (LE PAPIER DU JOUR, en texte).
   Son WordPress expose un REST ouvert : /wp-json/wp/v2/posts?categories=…
   ⚠ Le site n'envoie aucun en-tête CORS. Même code que le middleware de
   vite.config.js. */
import { proxy } from './_proxy.js'
export default proxy('gz')
