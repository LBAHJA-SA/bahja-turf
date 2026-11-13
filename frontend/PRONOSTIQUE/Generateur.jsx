import { useEffect, useState, useCallback } from 'react'
import { MAX_FIXES, DISTRIBUTIONS, rangerToutes, lignesPartants, resoudreFixes, groupeDeNum, caseDeNum } from '../../src/lib/generateur'
import { useLang } from '../../src/lib/langue'

function dateFr(date) {
  if (!date) return ''
  const [a, m, j] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(Date.UTC(a, m - 1, j)))
}

function heureFr(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Casablanca', day: '2-digit', month: '2-digit', hour: '2-digit', minute: 'digit',
  }).format(d)
}

const PEAU = {
  bord: 'rgba(45,212,191,.34)',
  fond: 'rgba(4,47,40,.42)',
  label: '#f1f7f4',
  caseFond: 'rgba(16,185,129,.10)',
  caseBord: 'rgba(52,211,153,.42)',
  chiffre: '#8ef0c8',
}

const casesDe = (valeur) => String(valeur ?? '').split(/[^\p{L}\p{N}]+/u).filter(Boolean)

function Rangee({ valeurs }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {valeurs.map((n, i) => (
        <span key={i} style={{
          minWidth: 42, height: 30, boxSizing: 'border-box', padding: '0 8px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 7, border: `1px solid ${PEAU.caseBord}`, background: PEAU.caseFond,
          color: PEAU.chiffre, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 14, fontWeight: 700,
        }}>{n}</span>
      ))}
    </div>
  )
}

export default function Generateur() {
  const { t } = useLang()
  const [grille, setGrille] = useState(null)
  const [classement, setClassement] = useState([])
  const [participants, setParticipants] = useState([])
  const [infos, setInfos] = useState(null)
  const [discipline, setDiscipline] = useState('PLAT')
  const [cotes, setCotes] = useState(null)
  const [archive, setArchive] = useState(null)

  // Charger les données du jour (similaire à /quinte)
  useEffect(() => {
    // Simuler le chargement - en production ce serait le même mécanisme que /quinte
    // Pour l'instant, on charge des données factices ou via l'API
    async function charger() {
      try {
        // Essayer de récupérer les données via l'API admin
        const r = await fetch('/api/admin?action=pronostics', { credentials: 'same-origin', cache: 'no-store' })
        const data = await r.json().catch(() => ({}))
        if (data && data.pronostics && data.pronostics.length > 0) {
          const p = data.pronostics[0]
          setClassement(p.classement || [])
          setParticipants(p.participants || [])
          setInfos(p.infos || null)
          setDiscipline(p.discipline || 'PLAT')
          setCotes(p.cotes || null)
          setArchive(p.archive || null)
        }
      } catch (e) {
        console.error('Erreur chargement générateur:', e)
      }
    }
    charger()
  }, [])

  // Calcule les lignes de chevaux
  const rowsPartants = grille ? lignesPartants({ grille, classement, tickets: [] }) : []

  // État de fixation
  const [fixes, setFixes] = useState([])
  const [message, setMessage] = useState('')

  // Appliquer les fixes et générer les distributions
  const resultats = useMemo(() => {
    if (!grille) return null
    // Valider et nettoyer les fixes saisis
    const { gardes, ignores } = resoudreFixes(grille, fixes)
    if (ignores.length > 0) {
      setMessage(ignores.map(i => i.motif).join(' · '))
    }
    // Générer les 5 distributions
    return rangerToutes({ grille, classement, discipline, cotes, fixes })
  }, [grille, classement, discipline, cotes, fixes.join(',')])

  // Message d'aide
  const aide = useMemo(() => {
    if (!grille) return 'Chargement de la grille du jour…'
    return `Fixez ${MAX_FIXES} numéros maximum (cases P1-P20). Le générateur complètera les cases restantes selon la règle sélectionnée.`
  }, [grille])

  // Section "Modifications possibles du moteur"
  const modifications = useMemo(() => {
    if (!grille || !resultats) return null
    // Analyser les écarts entre distributions
    const distNames = resultats.map(r => r.nom)
    return (
      <section style={{
        marginTop: 24, padding: 16, border: '1px solid rgba(232,121,249,.3)', borderRadius: 10,
        background: 'linear-gradient(145deg, rgba(25,21,45,.88), rgba(7,12,24,.94))',
      }}>
        <h3 style={{ margin: '0 0 12px', color: '#f0abfc' }}>Modifications possibles du moteur</h3>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            <strong>Production ({distNames[0]})</strong> : ticket de référence, quotas 3-2-1-1-1 → 8 chevaux
          </li>
          <li>
            <strong>Le carnet partout ({distNames[1]})</strong> : G1 à G5 par place de presse
          </li>
          <li>
            <strong>Le marché partout ({distNames[2]})</strong> : G1 à G5 par cote la plus courte
          </li>
          <li>
            <strong>Le marché dans le haut ({distNames[3]})</strong> : G1-G2 par cote, G3-G5 par carnet
          </li>
          <li>
            <strong>L'échange fort partout ({distNames[4]})</strong> : carnet sauf cote ≥ 2× plus courte
          </li>
        </ul>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#a9b6c9' }}>
          ⚠ Ces règles ne modifient JAMAIS les quotas (3-2-1-1-1 = 8 chevaux). Elles changent seulement
          <em>qui</em> entre dans chaque bloc.
        </p>
      </section>
    )
  }, [grille, resultats])

  return (
    <>      <Entete page="pronostic" />
    <main style={{ minHeight: 'calc(100vh - 68px)', padding: 'clamp(20px, 5vw, 48px) 16px', color: '#e7f1ff', background: 'radial-gradient(900px 480px at 15% 0%, #1a1934 0%, #050812 65%)' }}>
      <div style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gap: 14 }}>
        <section style={{ padding: 'clamp(20px, 4vw, 36px)', border: '1px solid rgba(232,121,249,.3)', borderRadius: 18, background: 'linear-gradient(145deg, rgba(25,21,45,.88), rgba(7,12,24,.94))', boxShadow: '0 18px 50px rgba(0,0,0,.35)' }}>
          <div style={{ color: '#e879f9', fontSize: 12, fontWeight: 800, letterSpacing: '.12em' }}> ESPACE GÉNÉRATEUR </div>
          <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(24px, 4vw, 36px)', lineHeight: 1.15 }}> GÉNÉRATEUR DE TICKET </h1>
          <p style={{ margin: 0, color: '#a9b6c9', fontSize: 15, lineHeight: 1.7 }}>
            Fixez 1 à 3 numéros de cheval ; le générateur complettera le ticket à 8 chevaux selon la règle choisie.
          </p>
        </section>

        {/* === TABLEAU DES CHEVAUX RÉTENUS === */}
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 8px', color: '#f0abfc' }}>Tableau des partants du jour</h3>
          <p style={{ fontSize: 12, color: '#a9b6c9' }}>{aide}</p>
          {rowsPartants.map((x) => {
            const nom = x.nom || '—'
            const caseP = x.caseP != null ? String(x.caseP) : '—'
            const groupe = x.groupe || '—'
            const musique = x.musique || '—'
            const forme = x.forme != null ? String(x.forme).substring(0, 6) : '—'
            const serie = x.serie || '—'
            const purete = x.purete || '—'
            const poids = x.poids != null ? String(x.poids) : '—'
            const valeur = x.valeur != null ? String(x.valeur) : '—'
            const jockey = x.jockey || '—'
            const entraineur = x.entraineur || '—'
            const score = x.score != null ? String(x.score).substring(0, 4) : '—'
            const dansTicket = x.dansTicket ? 'OUI' : 'non'
            return (
              <div key={x.rang} style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 4, margin: '4px 0' }}>
                <div style={{ gridColumn: 1, fontWeight: 700, color: '#e879f9' }}>{x.rang}</div>
                <div style={{ gridColumn: 2, color: '#fff' }}>{nom}</div>
                <div style={{ gridColumn: 3, color: '#fff', fontFamily: 'ui-monospace' }}>{caseP}</div>
                <div style={{ gridColumn: 4, color: '#fff', fontSize: 11 }}>{musique}</div>
                <div style={{ gridColumn: 5, color: '#fff', fontSize: 11 }}>{forme}</div>
                <div style={{ gridColumn: 6, color: '#fff', fontSize: 11 }}>{serie}</div>
                <div style={{ gridColumn: 7, color: '#fff', fontSize: 11 }}>{purete}</div>
                <div style={{ gridColumn: 8, color: '#fff', fontSize: 11 }}>{poids}</div>
                <div style={{ gridColumn: 9, color: '#fff', fontSize: 11 }}>{valeur}</div>
                <div style={{ gridColumn: 10, color: '#fff', fontSize: 11 }}>{jockey}</div>
                <div style={{ gridColumn: 11, color: '#fff', fontSize: 11 }}>{entraineur}</div>
                <div style={{ gridColumn: 12, color: '#fff', fontSize: 11 }}>{score}</div>
                <div style={{ gridColumn: 13, color: '#e879f9' }}>{dansTicket}</div>
                <div style={{ gridColumn: 14, color: '#fff' }}>{groupe}</div>
              </div>
            )
          })}
          {rowsPartants.length === 0 && <p style={{ color: '#f9a825' }}>Aucune donnée de course chargée</p>}
        </section>

        {/* === SAISIE DE FIXES === */}
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 8px', color: '#f0abfc' }}>Numéros à fixer</h3>
          <p style={{ fontSize: 13, color: '#a9b6c9' }}>
            Saisissez de 1 à {MAX_FIXES} numéros de cheval (numéros de départ) séparés par des espaces. Exemple : <kbd>3 7 12</kbd>
          </p>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0', flexWrap: 'wrap' }}>
            <input
              type="number"
              min={1}
              max={999}
              placeholder="Numéro..."
              style={{
                minWidth: 60, height: 32, padding: '0 10px', fontSize: 13,
                border: '1px solid #4a90e2', borderRadius: 6, background: 'rgba(255,255,255,.08)',
                color: '#fff', '&:focus': { outline: 'none', borderColor: '#6cabe9' },
              }}
              onChange={(e) => {
                const val = Number(e.target.value)
                if (!isNaN(val) && val > 0) {
                  setFixes([...fixes, val].sort((a, b) => a - b).slice(0, MAX_FIXES))
                }
              }}
            />
            <button
              onClick={() => setFixes([])}
              style={{
                minWidth: 36, height: 32, padding: '0 10px', fontSize: 12,
                border: '1px solid #6c757d', borderRadius: 6, background: 'rgba(255,255,255,.05)',
                color: '#aaa', cursor: 'pointer',
              }}
            >
              Tout effacer
            </button>
          </div>
          {message && (
            <p style={{ margin: '8px 0 0', color: '#f9a825', fontSize: 12 }}>{message}</p>
          )}
        </section>

        {/* === DISTRIBUTIONS GÉNÉRÉES === */}
        {resultats && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 8px', color: '#f0abfc' }}>5 distributions (8 chevaux chacune)</h3>
            <p style={{ fontSize: 12, color: '#a9b6c9' }}>
              Chaque rangée applique une règle de choix différente à l'intérieur des blocs G1–G5.
              Les quotas restent <strong>3-2-1-1-1</strong> (8 chevaux au total).
            </p>
            {resultats.map((dist, di) => (
              <div key={dist.id} style={{ marginBottom: 20, padding: 12, border: '1px solid rgba(232,121,249,.3)', borderRadius: 8, background: 'rgba(255,255,255,.03)' }}>
                <div style={{ display: 'flex', justify-content: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#f0abfc', fontWeight: 700 }}>{dist.nom}</span>
                  <span style={{ fontSize: 11, color: '#6c757d' }}>{dist.note}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: repeat(8, 36px), gap: 4, gridTemplateRows: 'auto auto' }}>
                  {dist.ticket.map((num, ti) => (
                    <span key={ti} style={{
                      minWidth: 36, height: 28, boxSizing: 'border-box', padding: '0 6px',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 5, border: `1px solid ${di === 0 && ti < 8 ? '#e879f9' : '#4a90e2'}`, background: di === 0 && ti < 8 ? 'rgba(232,121,249,.2)' : 'rgba(74,144,226,.15)',
                      color: '#fff', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13, fontWeight: di === 0 && ti < 8 ? 700 : 400,
                    }}>{num}</span>
                  ))}
                </div>
                <details style={{ marginTop: 8, fontSize: 12, color: '#a9b6c9' }}>
                  <summary>Détail du bloc</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, margin: 0 }}>
                    Blocs : {dist.blocs.map((b, bi) => `${b.id}: ${b.choisis.length}/${b.quota} fixes=${b.fixes.length} horsQuota=${b.horsQuota ? 'OUI' : 'non'} surplus=${b.surplus}`).join(' | ')}
                    Swaps : {dist.swaps.length > 0 ? dist.swaps.map((s) => `${s.bloc}: ${s.sorti}→${s.entre}`).join(' | ') : 'aucun'}
                    Ajoutés : {dist.ajoutés.length}, Retirés : {dist.retires.length}
                  </pre>
                </details>
              </div>
            ))}
          </section>
        )}

        {/* === MODIFICATIONS POSSIBLES DU MOTEUR === */}
        {modifications}

        {/* === CONSERVATION DE LA LISTE ÉDITORIALE === */}
        <section style={{ padding: 12, border: '1px solid rgba(232,121,249,.3)', borderRadius: 8, background: 'rgba(255,255,255,.02)' }}>
          <h3 style={{ margin: '0 0 8px', color: '#f0abfc' }}>Liste éditoriale (conservée)</h3>
          <p style={{ fontSize: 12, color: '#a9b6c9' }}>
            Les pronostics existants restent affichés ci-dessous inchangés.
          </p>
          {/* Ici pourraient s'afficher les pronostics éditoriaux */}
        </section>
      </div>
    </main>
  )
}