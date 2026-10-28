import { useEffect, useRef, useState } from 'react'
import { fetchMeetings } from '../../backend/DNA/donnees.js'

const GROUPES = [
  { key: 'quinteAssurance', label: 'Assurance', count: 2 },
  { key: 'synthese', label: 'La Synthèse', count: 1 },
]

const dateCasablanca = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

const fieldsVides = () => Object.fromEntries(GROUPES.map((g) => [g.key, g.count === 1 ? '' : ['', '']]))

/** « 27/10/2026 14:32 » — l'heure de Casablanca, comme la date du programme. */
function dateHeure(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Casablanca', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d)
}

function nouveauPronostic() {
  return {
    id: globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: dateCasablanca(), reunion: '', course: '', pays: '', hippodrome: '', reunionLabel: '', courseNom: '', distance: null,
    fields: fieldsVides(),
  }
}

async function api(method = 'GET', body) {
  const response = await fetch('/api/admin?action=pronostics', {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.erreur || `Erreur HTTP ${response.status}`)
  return data
}

/* ── LES CASES — un nombre (ou un sigle) par case, comme la grille du carnet ─
 *   La Synthèse   │ [12] [5] [1] [4] [14] [3] [9] [11]
 *   quinteAssurance │ [5] [NP] [ABD]
 * Chiffres ET lettres · la case vide de droite ajoute un jeton ·
 * Retour arrière le retire · on peut coller « 12 5 1 4 » d'un coup.
 * La valeur reste une CHAÎNE : le stockage ne change pas.                    */
const PEAU = {
  bord: 'rgba(45,212,191,.34)',
  fond: 'rgba(4,47,40,.42)',
  label: '#f1f7f4',
  caseFond: 'rgba(16,185,129,.10)',
  caseBord: 'rgba(52,211,153,.42)',
  chiffre: '#8ef0c8',
}

const LONGUEUR_MAX = 6

/** les jetons d'une valeur : « 12 5 NP » → ['12', '5', 'NP'] (accents gardés) */
function versCases(valeur) {
  return String(valeur ?? '').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

const propreDe = (brut) => String(brut ?? '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, LONGUEUR_MAX)

const largeurCase = (texte) => Math.max(42, 16 + String(texte || '').length * 9)

const styleCase = {
  height: 30, boxSizing: 'border-box', padding: 0, textAlign: 'center',
  borderRadius: 7, border: `1px solid ${PEAU.caseBord}`, background: PEAU.caseFond,
  color: PEAU.chiffre, fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: 14, fontWeight: 700, outline: 'none',
}

function Cases({ valeur, onChange, nom }) {
  const refs = useRef([])
  const cases = versCases(valeur)

  const ecrire = (index, brut) => {
    const propre = propreDe(brut)
    const suite = [...cases]
    if (index >= suite.length) {
      if (!propre) return
      suite.push(propre)
    } else if (propre) suite[index] = propre
    else suite.splice(index, 1)
    onChange(suite.join(' '))
    /* un numéro à 2 chiffres enchaîne sur la case suivante */
    const suite2 = propre ? (/^\d{2}$/.test(propre) ? index + 1 : index) : Math.max(index - 1, 0)
    requestAnimationFrame(() => refs.current[suite2]?.focus())
  }

  const coller = (index, texte) => {
    const morceaux = versCases(texte)
    if (!morceaux.length) return
    const avant = cases.slice(0, Math.min(index, cases.length))
    const apres = cases.slice(Math.min(index, cases.length) + 1)
    onChange([...avant, ...morceaux, ...apres].join(' '))
    requestAnimationFrame(() => refs.current[avant.length + morceaux.length]?.focus())
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {cases.map((c, i) => (
        <input key={`c${i}`} ref={(el) => { refs.current[i] = el }} value={c}
          aria-label={`${nom || 'valeur'} ${i + 1}`} spellCheck={false}
          onChange={(e) => ecrire(i, e.target.value)}
          onPaste={(e) => { e.preventDefault(); coller(i, e.clipboardData.getData('text')) }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !c) { e.preventDefault(); ecrire(i - 1, '') } }}
          style={{ ...styleCase, width: largeurCase(c) }} />
      ))}
      <input ref={(el) => { refs.current[cases.length] = el }} value=""
        aria-label={`${nom || 'valeur'} — ajouter`} placeholder="+" spellCheck={false}
        onChange={(e) => ecrire(cases.length, e.target.value)}
        onPaste={(e) => { e.preventDefault(); coller(cases.length, e.clipboardData.getData('text')) }}
        style={{ ...styleCase, width: 42, opacity: .7, color: '#5eead4', fontSize: 13 }} />
    </div>
  )
}

function LigneGroupe({ groupe, valeur, onChange }) {
  const choix = groupe.count === 1
    ? [typeof valeur === 'string' ? valeur : '']
    : Array.from({ length: groupe.count }, (_, i) => (Array.isArray(valeur) ? (valeur[i] || '') : ''))
  const ecrireChoix = (i, texte) => {
    if (groupe.count === 1) { onChange(texte); return }
    const suite = [...choix]
    suite[i] = texte
    onChange(suite)
  }
  return (
    <section style={{
      display: 'grid', gridTemplateColumns: 'minmax(96px, auto) 1fr', alignItems: 'stretch',
      border: `1px solid ${PEAU.bord}`, borderRadius: 10, background: PEAU.fond, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 12px', borderRight: `1px solid ${PEAU.bord}`,
        color: PEAU.label, fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700, fontSize: 12.5, lineHeight: 1.25,
      }}>{groupe.label}</div>
      <div style={{ display: 'grid', gap: 6, padding: '8px 10px' }}>
        {choix.map((v, i) => <Cases key={i} valeur={v} nom={`${groupe.label} ${i + 1}`} onChange={(t) => ecrireChoix(i, t)} />)}
      </div>
    </section>
  )
}

function Editeur({ item, onChange, onSave, onDelete, saving }) {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(false)
  const [erreurProgramme, setErreurProgramme] = useState('')

  useEffect(() => {
    let vivant = true
    setLoading(true); setErreurProgramme('')
    fetchMeetings(item.date)
      .then((data) => { if (vivant) setMeetings(data.meetings || []) })
      .catch((e) => { if (vivant) setErreurProgramme(e.message || 'Programme indisponible') })
      .finally(() => { if (vivant) setLoading(false) })
    return () => { vivant = false }
  }, [item.date])

  const reunion = meetings.find((m) => Number(m.num) === Number(item.reunion))
  const courses = reunion?.courses || []
  const course = courses.find((c) => Number(c.num) === Number(item.course))
  const setGroupe = (key, valeur) => onChange({ ...item, fields: { ...item.fields, [key]: valeur } })

  return (
    <article style={{ padding: 14, borderRadius: 12, border: '1px solid rgba(232,121,249,.25)', background: 'rgba(2,6,15,.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <b style={{ color: '#f0abfc', fontSize: 14 }}>{item.modifieLe ? 'Pronostic publié' : 'Nouveau pronostic'}</b>
        {item.hippodrome && item.reunion && <span style={{ color: '#94a3b8', fontSize: 12 }}>{item.reunionLabel || `R${item.reunion}`} · {item.hippodrome} · C{item.course || '—'}</span>}
        {item.modifieLe ? (
          <span title={`Dernier enregistrement${item.modifiePar ? ` par ${item.modifiePar}` : ''}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 7px', borderRadius: 6,
            color: '#5eead4', background: 'rgba(16,185,129,.10)', border: '1px solid rgba(52,211,153,.32)',
            fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11.5,
          }}>
            <i className="bi bi-clock-history" /> enregistré le {dateHeure(item.modifieLe)}{item.modifiePar ? ` · ${item.modifiePar}` : ''}
          </span>
        ) : (
          <span style={{ color: '#64748b', fontSize: 11.5 }}>pas encore enregistré</span>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <button type="button" onClick={onSave} disabled={saving || !item.reunion || !item.course}
            style={{ border: 0, borderRadius: 8, padding: '7px 11px', color: '#06111b', background: '#c084fc', fontWeight: 800, cursor: 'pointer', opacity: saving || !item.reunion || !item.course ? .55 : 1 }}>
            {saving ? 'Publication…' : 'Enregistrer et publier'}
          </button>
          <button type="button" onClick={onDelete} disabled={saving}
            style={{ border: '1px solid rgba(248,113,113,.4)', borderRadius: 8, padding: '7px 10px', color: '#fca5a5', background: 'transparent', cursor: 'pointer' }}>Supprimer</button>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 9, marginBottom: 13 }}>
        <label style={{ display: 'grid', gap: 4, color: '#a9b6c9', fontSize: 11.5 }}>Date du programme
          <input type="date" value={item.date} onChange={(e) => onChange({ ...item, date: e.target.value, reunion: '', course: '' })}
            style={{ padding: '8px 9px', borderRadius: 8, border: '1px solid rgba(148,163,184,.24)', background: '#0b1220', color: '#e2e8f0' }} />
        </label>
        <label style={{ display: 'grid', gap: 4, color: '#a9b6c9', fontSize: 11.5 }}>Réunion {loading && '· chargement…'}
          <select value={item.reunion || ''} onChange={(e) => {
            const m = meetings.find((x) => Number(x.num) === Number(e.target.value))
            onChange({ ...item, reunion: e.target.value, course: '', pays: m?.country || '', hippodrome: m?.hippodrome || '', reunionLabel: m?.sorec || '' })
          }} style={{ padding: '8px 9px', borderRadius: 8, border: '1px solid rgba(148,163,184,.24)', background: '#0b1220', color: '#e2e8f0' }}>
            <option value="">Choisir une réunion</option>
            {meetings.map((m) => <option key={m.num} value={m.num}>{m.num >= 100 ? 'MA' : `R${m.num}`} · {m.hippodrome}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4, color: '#a9b6c9', fontSize: 11.5 }}>Course
          <select value={item.course || ''} onChange={(e) => {
            const c = courses.find((x) => Number(x.num) === Number(e.target.value))
            onChange({ ...item, course: e.target.value, courseNom: c?.nom || c?.libelle || '', distance: c?.distance || null })
          }} disabled={!reunion} style={{ padding: '8px 9px', borderRadius: 8, border: '1px solid rgba(148,163,184,.24)', background: '#0b1220', color: '#e2e8f0' }}>
            <option value="">Choisir une course</option>
            {courses.map((c) => <option key={c.num} value={c.num}>C{c.num} · {c.nom || c.libelle || 'Course'}{c.distance ? ` · ${c.distance} m` : ''}</option>)}
          </select>
        </label>
      </div>
      {erreurProgramme && <div style={{ marginBottom: 10, color: '#fca5a5', fontSize: 12 }}>{erreurProgramme}</div>}

      {item.reunion && item.course && (
        <div style={{ display: 'grid', gap: 9 }}>
          {GROUPES.map((g) => (
            <LigneGroupe key={g.key} groupe={g} valeur={item.fields?.[g.key]} onChange={(v) => setGroupe(g.key, v)} />
          ))}
        </div>
      )}
    </article>
  )
}

export default function AdminPronostiques() {
  const [liste, setListe] = useState([])
  const [brouillons, setBrouillons] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  const charger = async () => {
    setLoading(true); setErreur('')
    try { const data = await api(); setListe(data.pronostics || []) }
    catch (e) { setErreur(e.message || 'Lecture impossible') }
    finally { setLoading(false) }
  }
  useEffect(() => { charger() }, [])

  const ajouter = () => { setInfo(''); setErreur(''); setBrouillons((l) => [...l, nouveauPronostic()]) }
  const modifier = (id, p) => {
    if (brouillons.some((x) => x.id === id)) setBrouillons((l) => l.map((x) => x.id === id ? p : x))
    else setListe((l) => l.map((x) => x.id === id ? p : x))
  }
  const supprimerBrouillon = (id) => setBrouillons((l) => l.filter((x) => x.id !== id))

  const enregistrer = async (p) => {
    setSavingId(p.id); setErreur(''); setInfo('')
    try {
      const nouvelleListe = await api('POST', { action: 'save', pronostic: p })
      setListe(nouvelleListe.pronostics || [])
      setBrouillons((l) => l.filter((x) => x.id !== p.id))
      setInfo('Pronostic enregistré et publié pour les visiteurs.')
    } catch (e) { setErreur(e.message || 'Publication impossible') }
    finally { setSavingId('') }
  }

  const supprimer = async (id) => {
    const present = liste.some((p) => p.id === id)
    if (!present) { supprimerBrouillon(id); return }
    if (!window.confirm('Supprimer ce pronostic de la page des visiteurs ?')) return
    setSavingId(id); setErreur(''); setInfo('')
    try {
      const data = await api('POST', { action: 'delete', id })
      setListe(data.pronostics || [])
      setBrouillons((l) => l.filter((p) => p.id !== id))
      setInfo('Pronostic supprimé de la page des visiteurs.')
    } catch (e) { setErreur(e.message || 'Suppression impossible') }
    finally { setSavingId('') }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={ajouter} style={{ border: 0, borderRadius: 9, padding: '9px 13px', color: '#06111b', background: '#c084fc', fontWeight: 800, cursor: 'pointer' }}>
          <i className="bi bi-plus-lg" /> Ajouter pronostic
        </button>
        <button type="button" onClick={charger} disabled={loading} style={{ border: '1px solid rgba(148,163,184,.25)', borderRadius: 9, padding: '8px 11px', color: '#cbd5e1', background: 'rgba(148,163,184,.06)', cursor: 'pointer' }}>
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>{liste.length} pronostic(s) publié(s)</span>
      </div>
      {erreur && <div style={{ padding: 10, borderRadius: 8, color: '#fecaca', background: 'rgba(248,113,113,.1)', fontSize: 12.5 }}>{erreur}</div>}
      {info && <div style={{ padding: 10, borderRadius: 8, color: '#bbf7d0', background: 'rgba(34,197,94,.1)', fontSize: 12.5 }}>{info}</div>}
      {loading && !liste.length && <div style={{ color: '#94a3b8', fontSize: 12.5 }}>Lecture des pronostics…</div>}
      {!loading && !liste.length && !brouillons.length && <div style={{ color: '#94a3b8', fontSize: 12.5 }}>Aucun pronostic publié. Clique sur « Ajouter pronostic » pour commencer.</div>}
      {[...brouillons, ...liste].map((p) => (
        <Editeur key={p.id} item={p} onChange={(x) => modifier(p.id, x)} onSave={() => enregistrer(p)}
          onDelete={() => supprimer(p.id)} saving={savingId === p.id} />
      ))}
    </div>
  )
}
