// backend/COUPLE/contextual-selection.js — اختيار سياقي من artifact.
// Importé par frontend/COUPLE/Couple.jsx UNIQUEMENT.

import { selectionKillerCombo } from './selection.js'
import { selectionInverseScore } from './selection-inverse.js'
import { selectionFailIntersect } from './selection-fail-intersect.js'
import { selection2m1f } from './selection-2m1f.js'
import { selection1m2f } from './selection-1m2f.js'
import { selectionForm3 } from './selection-form.js'
import { selectionMarket3 } from './selection-market.js'
import { selectionKillFav2 } from './selection-kill-fav2.js'
import { selectionKillFav1 } from './selection-kill-fav1.js'

const RULE_FNS = {
  'market-3': selectionMarket3,
  'form-3': selectionForm3,
  '2m+1f': selection2m1f,
  '1m+2f': selection1m2f,
  'killer-combo': selectionKillerCombo,
  'fail-intersect': selectionFailIntersect,
  'kill-fav2': selectionKillFav2,
  'inverse-score': selectionInverseScore,
  'kill-fav1': selectionKillFav1,
}

/**
 * اختيار سياقي: يقرأ artifact، يطابق سياق السباق، يطبق القاعدة المناسبة.
 * artifact يحتوي: { globalBest, rules: { "CONTEXT_KEY": "ruleName" } }
 */
export async function selectionContextuelle(partants, course) {
  // تحميل artifact (مخزن في الذاكرة بعد أول استدعاء)
  if (!selectionContextuelle._artifact) {
    try {
      const res = await fetch('/data/contextual-selection.json', { headers: { Accept: 'application/json' } })
      if (res.ok) selectionContextuelle._artifact = await res.json()
    } catch { /* fallback */ }
  }
  const artifact = selectionContextuelle._artifact
  if (!artifact || !artifact.rules) return { picks: selectionMarket3(partants), rule: 'market-3' }

  // مفتاح السياق: مضمار × مسافة_فئة (UpperCase ليطابق artifact)
  const dist = course.distance || 0
  const distBucket = dist <= 1200 ? 'S' : dist <= 1800 ? 'M' : dist <= 2500 ? 'L' : 'XL'
  const hippo = (course.hippodrome || 'UNK').toUpperCase().replace(/\s+/g, '_')
  
  // خريطة أسماء مستعارة: الاسم القصير -> الاسم في النموذج
  const HIPPO_ALIASES = {
    'BORELY': 'BORDEAUX_LE_BOUSCAT',
    'VINCENNES': 'PARIS_VINCENNES',
    'ENGHIEN': 'ENGHIEN',
    'CHANTILLY': 'CHANTILLY',
    'DEAUVILLE': 'DEAUVILLE',
    'PAU': 'PAU',
    'TOULOUSE': 'TOULOUSE',
    'AUTEUIL': 'AUTEUIL',
    'CAGNES_SUR_MER': 'CAGNES_SUR_MER',
    'MARSEILLE_VIVAUX': 'MARSEILLE_VIVAUX',
    'LVAL': 'LAVAL',
    'LE_CROISE_LAROCHE': 'LE_CROISE_LAROCHE',
    'SAINT_CLOUD': 'SAINT_CLOUD',
    'LONGCHAMP': 'PARIS_LONGCHAMP',
    'COMPIGNE': 'COMPIEGNE',
    'FONTAINEBLEAU': 'FONTAINEBLEAU',
    'VALPARAISO': 'VALPARAISO',
    'SON_PARDO': 'SON_PARDO',
    'WOLVEGA': 'WOLVEGA',
    'MONS': 'MONS',
    'LYON_LA_SOIE': 'LYON_LA_SOIE',
    'LYON_PARILLY': 'LYON_LA_SOIE',
  }
  
  const hippoNorm = HIPPO_ALIASES[hippo] || hippo
  const ctxKey = `${hippoNorm}|${distBucket}`

  const entry = artifact.rules[ctxKey]
  const ruleName = (entry && entry.rule) || artifact.globalBest || 'market-3'
  const fn = RULE_FNS[ruleName] || selectionMarket3

  const picks = await fn(partants, course)
  return { picks, rule: ruleName }
}