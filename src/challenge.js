export const challenge = Object.freeze({
  start: '2026-11-09',
  end: '2026-12-31',
  timezone: 'Europe/London',
  penaltyPounds: 50,
});

const formatDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: challenge.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
});

export function londonDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid timestamp');
  const parts = Object.fromEntries(formatDate.formatToParts(date).map(({type, value}) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDay(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function challengePeriod(timestamp) {
  const day = londonDate(timestamp);
  if (day < challenge.start || day > challenge.end) return null;
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  const start = shiftDay(day, -((weekday + 6) % 7));
  const sunday = shiftDay(start, 6);
  return { start, end: sunday < challenge.end ? sunday : challenge.end };
}
