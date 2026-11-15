/* /api/eqa -> api.equidia.fr (les déclarations, les pronostics, la course).
   Depuis fin octobre l'API refuse les requêtes sans Referer equidia.fr
   (HTTP 403). Le proxy ajoute donc ce Referer ; la page, elle, passe par ici. */
import { proxy } from './_proxy.js'
export default proxy('eqa')