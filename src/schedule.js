import { challengePeriod, londonDate } from './challenge.js';

export function scheduledMessages(timestamp) {
  const date = new Date(timestamp);
  const day = londonDate(date);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(date).map(x => [x.type,x.value]));
  const result = [];
  if (challengePeriod(date) && parts.weekday === 'Mon' && parts.hour === '08' && parts.minute === '00') result.push({id:`week-start:${day}`, text:'🏃 New challenge week! Karolis: 10 km. Lorenas: 5 km. Each missed target is £50.'});
  if (challengePeriod(date) && ['Fri','Sun'].includes(parts.weekday) && parts.hour === '17' && parts.minute === '00') result.push({id:`reminder:${day}`, text:'🏃 Challenge reminder: check your weekly running targets in Strava.'});
  const prior = challengePeriod(new Date(date.getTime() - 86400000));
  if (prior && parts.hour === '12' && parts.minute === '00' && (parts.weekday === 'Mon' || day === '2027-01-01')) {
    result.push({id:`result-pending:${prior.start}`, text:`⏳ The challenge period ending ${prior.end} is awaiting verification. No penalty has been assessed.`});
  }
  return result;
}
