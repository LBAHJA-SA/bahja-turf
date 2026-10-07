const j = await (await fetch('https://pro.casacourses.com/api/programme?date=2026-10-01',
  { headers: { 'User-Agent': 'Mozilla/5.0' } })).json();

console.log('=== كل race عندها sorec_quinte (المصدر الحقيقي) ===\n');
for (const m of j.meetings || []) {
  for (const r of m.races || []) {
    const ab = r.available_bet_types || [];
    if (ab.includes('sorec_quinte') || ab.includes('quinte')) {
      console.log(`  ${m.country} ${String(m.reunion_code).padEnd(4)} ${String(m.track).padEnd(22)} ${r.code.padEnd(4)} ${String(r.name).slice(0, 30).padEnd(32)} starters=${r.starters}  dist=${r.distance}  type=${r.type}`);
      console.log(`        bet_types: ${JSON.stringify((r.bet_types || []).map(b => b.code))}`);
    }
  }
}
