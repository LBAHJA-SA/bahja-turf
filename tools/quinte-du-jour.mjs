/** Affiche, pour chaque réunion FR d'une date, les courses qui ont déjà un résultat. */
const CC = 'https://pro.casacourses.com/api'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
const get = async (u) => (await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } })).json()

const date = process.argv[2] || new Date().toISOString().slice(0, 10)
const prog = await get(`${CC}/programme?date=${date}`)
const fr = prog.meetings.filter((m) => (m.country || '').toUpperCase() === 'FR')
console.log(`\n  ${date} — ${fr.length} réunions FR, ${fr.reduce((n, m) => n + m.races.length, 0)} courses`)

for (const m of fr) {
  for (const [i, c] of m.races.entries()) {
    const det = await get(`${CC}/race/${c.id}?date=${date}`)
    const res = det.results || []
    const cinq = res.slice(0, 5).map((x) => Number(x.number))
    console.log(`  R${String(m.reunion_code || '').replace(/\D/g, '')}C${i + 1}  ${(c.track || '').padEnd(14)} ${String(c.distance || '').padStart(5)}m  ` +
      `${String(c.runners?.length || 0).padStart(2)} partants  bets=${(c.bet_types || []).join('/') || '—'}`)
    if (cinq.length) console.log(`        arrivée : ${cinq.join(' · ')}`)
  }
}
console.log()