import { sessionValide } from './api/_acces.js'
import { next } from '@vercel/functions'

/* Les fichiers publics de données alimentent les écrans du site : ils exigent
 * eux aussi une session. Le shell et ses scripts restent accessibles pour
 * afficher le formulaire de connexion. */
export const config = { matcher: ['/data/:path*'] }

export default async function middleware(request) {
  if (await sessionValide(request)) return next()
  return new Response(JSON.stringify({ erreur: 'session requise' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
