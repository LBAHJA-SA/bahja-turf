// backend/COUPLE/neutre.js — الغائب = الوسيط المحايد، لا الإعدام.
// Importé par les fonctions de sélection UNIQUEMENT.
export function mediane(ns) {
  const s = ns.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
  if (!s.length) return null
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
// Cote manquante → médiane des cotes valides (neutre). Jamais 999.
export function coteOuMediane(p, med) {
  const n = Number(p.coteRef ?? p.cote_pmu)
  if (Number.isFinite(n) && n > 0) return n
  const c = Number(p.cote)
  if (Number.isFinite(c) && c > 0) return c
  return med
}
