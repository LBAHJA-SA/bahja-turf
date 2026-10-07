import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'

import { meetingsDepuisReu, slugify, heureGMT } from '../../backend/PROGRAMME/donnees.js'

/* ── les 8 paris, couleurs duPMU (même ordre que la grille officielle) ── */
const PARIS = [
  ['simple', /simple/i, 'Simple', '#2aa9a0'],
  ['couple', /coupl|jumele/i, 'Couplé', '#f39c12'],
  ['trio', /trio/i, 'Trio', '#eab308'],
  ['tierce', /tierce/i, 'Tiercé', '#e74c3c'],
  ['sur4', /2\s*sur\s*4|sur4/i, '2sur4', '#7d3c98'],
  ['multi', /multi/i, 'Multi7', '#27ae60'],
  ['quarte', /quarte/i, 'Quarté+', '#1e3c9e'],
  ['quinte', /quinte/i, 'Quinté+', '#b91c1c'],
]
/** Les paris d’une course, dans l’ordre officiel. Sans donnée : Quinté+ seul si flag. */
function parisDe(course) {
  const src = [...(course.paris || []), ...(course.types_pari || [])].map(String)
  if (!src.length) return course.quinte ? [PARIS[7]] : []
  return PARIS.filter(([, re]) => src.some((x) => re.test(x)))
}
/** Les rubans obliques (même esprit que la grille officielle). */
function Rubans({ course }) {
  const liste = parisDe(course)
  if (!liste.length) return null
  return (
    <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', marginTop: 6 }}>
      {liste.map(([cle, , label, couleur]) => (
        <span key={cle} style={{ display: 'inline-block', transform: 'skewX(-14deg)', borderRadius: 3, padding: '2px 10px', color: '#fff', fontWeight: 800, fontSize: 11, background: couleur, boxShadow: '0 1px 2px rgba(0,0,0,.25)', margin: '2px 5px 2px 0', textShadow: '0 1px 1px rgba(0,0,0,.35)' }}>
          <span style={{ display: 'inline-block', transform: 'skewX(14deg)' }}>{label}</span>
        </span>
      ))}
    </div>
  )
}

export default function Programme(){

  const [params, setParams] = useSearchParams()
  const today = new Date().toISOString().slice(0,10)
  // La date vit dans l'URL : survives le refresh, le retour arrière et le partage.
  const date = params.get('date') || today
  const setDate = (d) => { const p = new URLSearchParams(params); p.set('date', d); setParams(p, { replace: true }) }
  const [meetings,setMeetings]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(null)
  const navigate = useNavigate()

  useEffect(() => { document.title = 'Programme — Bahja TURF' }, [])

  useEffect(()=>{
    setLoading(true); setError(null)
    /* ⭐ SEULE SOURCE : turf-france (reu.php). 07/10/2026 — casacourses a
     *  été écarté : il ne donne pas `reunion_code` de façon fiable (« RR1 »)
     *  et ses identifiants ne correspondent pas à R+C, donc les liens /r/
     *  pointaient vers des réunions inexistantes (« course indisponible »).
     *  reu.php est la MÊME source que la page Article : une seule vérité,
     *  et le lien mène forcément à un fichier d'archive qui existe. */
    meetingsDepuisReu(date).then((ms)=>{
      setMeetings(ms || [])
      setLoading(false)
      setError(null)
    }).catch((e)=>{
      setMeetings([])
      setError(e.message || 'source indisponible')
      setLoading(false)
    })
  }, [date])


  // TOUTES les courses : le Quinté (quand il est connu) passe en premier.
  const reunionsAffichees = (()=> {
    // ⚠ QUINTÉ FRANCE SEULEMENT : le Maroc n'a plus sa page.
    const HIPPO_MA = /MEKNESS|KHEMISSET|MARRAKECH|CASABLANCA|RABAT|TANGER|LARACHE|OUZZANE|BERKANE|ANFA|SIDI ?MOUSA|SOUAKA|ALGER/i
    /* ⭐ TOUTES LES RÉUNIONS DE reu.php + LE MAGHREB.
     *  reu.php donne R1→R7 : Enghien (FR), Jarlsberg (NO), Chantilly (FR),
     *  Pont-de-Vivaux (FR), Kempton (GB), Happy Valley (HK), Solvalla (SE).
     *  R9 (Khemisset, MA) vient du complément. On ne filtre plus sur le pays :
     *  le 07/10 le filtre « FR » cachait 4 réunions sur 8, soit 33 courses.
     *  Le pays voyage dans l'URL (`?pays=…`), car le fichier d'archive porte
     *  le suffixe du pays : `_NORV`, `_SU`, `_HONG`, `_ROYAUME`, `_MAROC`. */
    const base = meetings
      .filter(m => {
        const p = String(m.pays || m.country || '').toUpperCase()
        // R14/R16 : numéros locaux à un AUTRE site (Horseshoe, Belmont).
        // Aucun fichier d'archive ne porte ces numéros → liens morts.
        const rNum = Number(String(m.num ?? '').replace(/\D/g, ''))
        return !(rNum === 14 || rNum === 16)
      })
      .map(m=> ({
        ...m,
        country: String(m.pays || m.country || '').toUpperCase().startsWith('FR') ? 'FR' : 'MA',
        courses: (Array.isArray(m.courses)?m.courses:[]).slice().sort((a,b)=>((b.quinte?1:0)-(a.quinte?1:0)) || ((a.numOrdre??a.num)-(b.numOrdre??b.num)))
      })).filter(m=> m.courses.length>0)
    // suppression des doublons : R4 Vincennes + R104 Paris-Vincennes = meme course
    const toks = s=> new Set(String(s||'').toUpperCase().split(/[^A-Z0-9]+/).filter(t=>t.length>=4))
    const sameHippo = (a,b)=>{
      const ta=toks(a), tb=toks(b)
      if(!ta.size||!tb.size) return String(a).toLowerCase().trim()===String(b).toLowerCase().trim()
      for(const t of ta) if(tb.has(t)) return true
      return false
    }
    const deduped=[]
    for(const m of base){
      const isDup = deduped.some(d=> sameHippo(d.hippodrome, m.hippodrome) && d.courses.some(dc=> m.courses.some(mc=> mc.numOrdre===dc.numOrdre && String(mc.libelle||mc.name).toLowerCase().trim()===String(dc.libelle||dc.name).toLowerCase().trim())))
      if(!isDup) deduped.push(m)
    }
    return deduped
  })()
  const filtered = reunionsAffichees
  const nbCourses = reunionsAffichees.reduce((a,m)=>a+((m.courses||[]).length),0)
  const nbQuintes = reunionsAffichees.reduce((a,m)=>a+(m.courses||[]).filter(c=>c.quinte).length,0)

  return (
    <>
      {/* ── bandeau : logo + navigation. Les moteurs/sources restent privés à chaque page ── */}
      <header className="header" style={{ background: 'linear-gradient(135deg,#052e22 0%,#0b5a3c 60%,#052e22 100%)', borderBottom: '3px solid #c9a227' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-horse.png" alt="Bahja TURF" style={{ height: 44, background: 'white', borderRadius: 8, padding: 2 }} />
            <img src="/logo.svg" alt="Bahja TURF" style={{ height: 42, borderRadius: 8 }} />
          </div>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link to="/" style={{ color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Programme</Link>
            <Link to="/quinte" style={{ color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Quinté</Link>
          </nav>
        </div>
      </header>
      <div style={{background:'linear-gradient(135deg,#064e3b,#065f46)',borderRadius:14,padding:18,marginBottom:14,border:'1px solid #c9a227',boxShadow:'0 4px 14px rgba(0,0,0,.25)'}}>
        <h1 style={{fontSize:22,fontWeight:800,color:'#fef3c7',margin:0,letterSpacing:.5}}>Programme du {new Date(date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})} - Bahja TURF</h1>
        <div style={{fontSize:12,color:'#a7f3d0',marginTop:4}}>Toutes les courses • le Quinté est marqué ⭐ quand il est publié</div>
        <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #e2e8f0'}} />
          <span style={{padding:'7px 14px',borderRadius:20,border:'1px solid #0f172a',background:'#0f172a',color:'white',fontWeight:600}}>Toutes les courses ({nbCourses})</span>
          

        </div>
      </div>

      {loading && <div style={{textAlign:'center',padding:40,background:'white',borderRadius:12}}>Chargement de tous les hippodromes...</div>}
      {error && <div style={{background:'#fef2f2',padding:16,borderRadius:12,color:'#dc2626',textAlign:'center'}}>Erreur : {error}</div>}

      {!loading && !error && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {filtered.length===0 ? <div style={{textAlign:'center',padding:40,background:'white',borderRadius:12,border:'1px solid #e2e8f0'}}>Aucune course ce jour ({date}) - {meetings.length} réunions au total mais 0 course<br/><span style={{fontSize:12,color:'#64748b'}}>Choisis une autre date</span></div> :
            filtered.map(m=>(
            <div key={m.num} style={{background:'#fff',borderRadius:14,overflow:'hidden',border:'1px solid #d6d3c8',boxShadow:'0 2px 8px rgba(0,0,0,.08)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,background:'linear-gradient(90deg,#064e3b,#047857)',padding:'10px 14px'}}>
                <div style={{width:40,height:40,borderRadius:50,background:'#c9a227',display:'flex',alignItems:'center',justifyContent:'center',color:'#052e22',fontWeight:800,boxShadow:'0 0 0 2px rgba(255,255,255,.35)'}}>R{m.num}</div>
                <div><b style={{color:'#fff',fontSize:15}}>{m.hippodrome}</b> <span style={{color:'#a7f3d0',fontSize:12}}>{m.country} • {Array.isArray(m.courses)?m.courses.length:0} courses{(m.courses||[]).some(c=>c.quinte)?' • ⭐ Quinté':''}</span></div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
                {(Array.isArray(m.courses)?m.courses:[]).map(c=>{
                  // ⚠ slug seul, SANS state : Article charge tout depuis SA source (turf-france).
                  // Lui passer l'objet course = partager la source d'affichage. Interdit.
                  const slug = `r${m.num}-c${c.numOrdre}-${slugify(c.name||c.libelle||'course')}-${date}-${slugify(m.hippodrome)}`
                  /* ⚠ LE PAYS VOYAGE DANS L'URL. Le fichier d'archive porte le
                     *  suffixe du pays (`_NORV`, `_SUEDE`, `_ROYAUME`…) : sans lui,
                     *  l'Article cherche `{cle}_FRANCE.json` et répond « course
                     *  indisponible » — c'est ce qui cassait R2 et R5. reu.php
                     *  donne le pays de chaque course, on le transmet donc. */
                  const pays = String(c.pays || m.pays || 'FRANCE').trim().toUpperCase()
                  /* ⚠ LE PAYS VA DANS L'URL — TOUJOURS, même pour la France.
                     *   Le numéro de réunion est LOCAL à chaque pays : `R14` est
                     *   Horseshoe Indianapolis (USA) sur casacourses, mais la
                     *   réunion 14 de la journée du 07/10 en France n'existe
                     *   pas. Sans le pays, l'Article cherche `{cle}_FRANCE.json`
                     *   et répond « course indisponible ». */
                  const go = ()=> navigate(`/r/${slug}?pays=${encodeURIComponent(pays)}`)
                  const hhmm = heureGMT(date, c.time)
                  return (
                    <div key={c.numOrdre} style={{display:'flex',gap:8,alignItems:'stretch',padding:'8px 12px',borderBottom:'1px solid #f1efe7'}}>
                      <div style={{flex:1,padding:'8px 12px',borderRadius:10,border:'1px solid #e7e2d3',borderLeft:`5px solid ${c.quinte?'#c9a227':'#059669'}` ,background:c.quinte?'#fffbeb':'white',fontSize:12,fontWeight:600}}>
                        <b style={{color:'#064e3b',fontSize:14}}>C{c.numOrdre}</b>{c.quinte?' ⭐':''} {hhmm} • <b>{c.name||c.libelle||''}</b> • {c.runners||'?'}p • {c.distance||''}m
                        <Rubans course={c} />
                      </div>
                      <button onClick={go} style={{padding:'8px 18px',borderRadius:10,border:'1px solid #c9a227',background:'linear-gradient(180deg,#b45309,#92400e)',color:'#fef3c7',fontSize:12,fontWeight:800,cursor:'pointer',whiteSpace:'nowrap',boxShadow:'0 2px 4px rgba(0,0,0,.2)'}}>Analyse</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{marginTop:12,fontSize:11,color:'#94a3b8',textAlign:'center'}}>{nbCourses} courses • {filtered.length} réunions • {nbQuintes} Quinté(s) publié(s) • Bahja TURF</div>
    </>
  )
}
