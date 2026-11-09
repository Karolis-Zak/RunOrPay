const km = metres => (metres / 1000).toFixed(3).replace(/\.?0+$/, '');

export function progressMessage(name, distanceMetres, result, movingTime, startedAt) {
  const duration = movingTime ? ` in ${movingTime}` : '';
  const date = startedAt ? ` (${new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', day:'numeric', month:'short', year:'numeric'}).format(new Date(startedAt))})` : '';
  const line = `🏃 ${name} ran ${km(distanceMetres)} km${duration}${date}.\nThis week: ${km(result.metres)} / ${km(result.target)} km.`;
  if (result.status === 'unverified') return result.remaining === 0 ? `${line}\n🎉 Weekly target reached!` : `${line}\nRemaining: ${km(result.remaining)} km.`;
  return result.remaining === 0 ? `${line}\n✅ Weekly target reached!` : `${line}\nRemaining: ${km(result.remaining)} km.`;
}

export function outcomeMessage(scored) {
  if (!scored.settlement) return '⏳ Weekly result pending: activity data has not been verified.';
  const lines = Object.entries(scored.results).map(([name, result]) => `${name}: ${km(result.metres)} / ${km(result.target)} km ${result.status === 'pass' ? '✅' : '❌'}`);
  const settlement = scored.settlement.pounds === 0 ? 'No net payment is due.' : `${scored.settlement.debtor} owes ${scored.settlement.creditor} £${scored.settlement.pounds}.`;
  return `🏁 Weekly result\n${lines.join('\n')}\n${settlement}`;
}
