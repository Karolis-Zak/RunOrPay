import { challengePeriod } from './challenge.js';
import { scoreWeek } from './scoring.js';
import { outcomeMessage } from './messages.js';

// This boundary accepts normalized activities; source adapters must establish identity,
// eligibility, updates, deletions and verification before invoking it.
export function reportPeriod(timestamp, activities, verified = {}) {
  const period = challengePeriod(timestamp);
  if (!period) throw new Error('Date is outside the challenge');
  const inPeriod = activities.filter(activity => {
    const activityPeriod = challengePeriod(activity.startedAt);
    return activityPeriod?.start === period.start;
  });
  const score = scoreWeek(inPeriod, verified);
  return { period, ...score, message: outcomeMessage(score) };
}
