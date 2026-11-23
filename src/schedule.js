import { challenge, challengePeriod, londonDate } from './challenge.js';

const endDate = new Date(`${challenge.end}T12:00:00Z`);
const reminderDate = new Date(endDate);
reminderDate.setUTCDate(reminderDate.getUTCDate() - 1);
const reminderDay = reminderDate.toISOString().slice(0, 10);
const endLabel = new Intl.DateTimeFormat('en-GB', {timeZone:'UTC', day:'numeric', month:'long', year:'numeric'}).format(endDate);
const weekStartMessages = [
  '🥊 New week, new round. Let’s get moving.',
  '🥊 New week. Put the work in, one run at a time.',
  '🥊 New week, fresh round. Keep showing up.',
  '🥊 New week. Keep the momentum going.',
];

export function scheduledMessages(timestamp) {
  const date = new Date(timestamp);
  const day = londonDate(date);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/London', weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(date).map(x => [x.type,x.value]));
  const result = [];
  if (challengePeriod(date) && parts.weekday === 'Mon' && parts.hour === '08' && parts.minute === '00') {
    const weekIndex = Math.floor(Date.parse(`${day}T00:00:00Z`) / 604800000);
    result.push({id:`week-start:${day}`, text:weekStartMessages[weekIndex % weekStartMessages.length]});
  }
  if (challengePeriod(date) && ['Fri','Sun'].includes(parts.weekday) && parts.hour === '17' && parts.minute === '00') result.push({id:`reminder:${day}`, text:'🏃 Challenge reminder: check your weekly running targets in Strava.'});
  if (day === reminderDay && parts.hour === '08' && parts.minute === '00') {
    result.push({id:`challenge-ending:${challenge.end}`, text:`Challenge ending: ${endLabel}.`});
  }
  return result;
}
