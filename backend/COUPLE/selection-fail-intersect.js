// backend/COUPLE/selection-fail-intersect.js — fail-intersect: fallback لـ inverse-score (لا يحتاج أرشيف في المتصفح).
import { selectionInverseScore } from './selection-inverse.js'

export async function selectionFailIntersect(partants, course) {
  // fail-intersect يحتاج أرشيف الماضي (passe) — غير متاح في المتصفح.
  // fallback ذكي: inverse-score (أفضل قاعدة عالمية).
  return selectionInverseScore(partants, course)
}