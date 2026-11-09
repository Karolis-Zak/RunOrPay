// Strava activity pages may provide a calendar date without a time or timezone.
// Keep that distinction: this does not create a timestamp for ingestion.
export function parseActivityDate(text) {
  if (typeof text !== 'string') return null;
  const match = text.trim().match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})$/);
  if (!match) return null;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const month = months.indexOf(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  if (['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getUTCDay()] !== text.trim().split(',')[0]) return null;
  return `${match[3]}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Parse the observed activity-detail page conservatively. Dates and displayed
// distances are not precise timestamps or exact measurements.
export function parseActivityDetails({title, date, text} = {}) {
  if (typeof title !== 'string' || !/\|\s*(?:run|running|trail run|virtual run)\s*\|\s*strava\s*$/i.test(title)) return null;
  const day = parseActivityDate(date);
  if (!day || typeof text !== 'string') return null;
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const distanceLabels = lines.flatMap((line, index) => line === 'Distance' ? [lines[index - 1]] : []);
  const timeLabels = lines.flatMap((line, index) => line === 'Moving Time' ? [lines[index - 1]] : []);
  if (distanceLabels.length !== 1 || timeLabels.length !== 1) return null;
  const distance = distanceLabels[0]?.match(/^(\d+(?:\.\d+)?)\s*(km|mi|m)$/i);
  const duration = timeLabels[0];
  if (!distance || !/^(?:\d{1,3}:\d{2}(?::\d{2})?|\d{1,5}s)$/.test(duration || '')) return null;
  if (!(Number(distance[1]) > 0)) return null;
  const unit = distance[2].toLowerCase();
  const metres = Math.round(Number(distance[1]) * ({km:1000, mi:1609.344, m:1}[unit]));
  if (!Number.isSafeInteger(metres) || metres > 1000000) return null;
  return {date:day, distance:`${distance[1]} ${unit}`, metres, movingTime:duration};
}

// Strict parser for candidate activity cards.
export function parseCard(card) {
  if (!card || !/^\d+$/.test(card.id || '') || typeof card.start !== 'string' || !/(Z|[+-]\d\d:\d\d)$/.test(card.start) || !Number.isFinite(Date.parse(card.start))) return null;
  const lines = (card.text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
  // Use Strava's activity type, not an editable activity title.
  if (!/^(run|running|trail run|virtual run)$/i.test(card.type || '')) return null;
  const distances = lines.map(line => line.match(/^(\d+(?:\.\d+)?)\s*(km|mi|m)$/i)).filter(Boolean);
  if (distances.length !== 1) return null;
  const quantity = Number(distances[0][1]);
  const unit = distances[0][2].toLowerCase();
  const metres = Math.round(quantity * ({km:1000,mi:1609.344,m:1}[unit]));
  if (!Number.isSafeInteger(metres) || metres <= 0 || metres > 1000000) return null;
  return {id:card.id, startedAt:card.start, metres};
}
