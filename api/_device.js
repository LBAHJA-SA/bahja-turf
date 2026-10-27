import { lireCleRedis, ecrireCleRedis } from './_journal.js'

const cle = (nom) => 'bahja:device-lock:' + encodeURIComponent(String(nom || '').trim().toLowerCase())

export async function lireEtatAppareil(nom) {
  const brut = await lireCleRedis(cle(nom))
  if (!brut) return null
  try { return JSON.parse(brut) } catch { return null }
}

export async function enregistrerAppareil(nom, id) {
  const k = cle(nom)
  const initial = { appareil: id, bloque: false, maj: Date.now() }
  const gagne = await ecrireCleRedis(k, JSON.stringify(initial), { nx: true })
  if (gagne === 'OK') return { ok: true, etat: initial, nouveau: true }
  const etat = await lireEtatAppareil(nom)
  if (!etat) throw new Error('état de l’appareil illisible')
  if (etat.bloque) return { ok: false, bloque: true, etat }
  if (etat.connexionRequise && !etat.appareil) {
    const lie = { appareil: id, bloque: false, maj: Date.now() }
    await ecrireCleRedis(k, JSON.stringify(lie))
    return { ok: true, etat: lie, nouveau: true }
  }
  if (etat.appareil === id) return { ok: true, etat }
  const bloque = { ...etat, bloque: true, bloqueLe: Date.now(), maj: Date.now() }
  await ecrireCleRedis(k, JSON.stringify(bloque))
  return { ok: false, bloque: true, etat: bloque }
}

export async function verifierAppareil(nom, id) {
  const etat = await lireEtatAppareil(nom)
  if (!etat) return true // compte déjà connecté avant l’activation ; le login le lie
  return !!id && !etat.bloque && etat.appareil === id
}

export async function reinitialiserAppareil(nom) {
  await ecrireCleRedis(cle(nom), JSON.stringify({ appareil: null, bloque: false, connexionRequise: true, maj: Date.now() }))
}
