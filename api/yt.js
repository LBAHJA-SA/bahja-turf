/* /api/yt -> www.youtube.com (la revue de presse EN VIDÉO : le canal qui
   feuillette les journaux chaque matin). Même code que le middleware de
   vite.config.js.
   ⚠ YouTube n'envoie aucun en-tête CORS sur ses pages : la page ne peut pas
   lire la chaîne en direct. On relaie, comme pour les journaux. */
import { proxy } from './_proxy.js'
export default proxy('yt')
