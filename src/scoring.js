export const runners = Object.freeze({ Karolis: 10000, Lorenas: 5000 });

// Activities are supplied by a future verified integration, in integer metres.
export function scoreWeek(activities, verified = {}) {
  const totals = Object.fromEntries(Object.keys(runners).map(name => [name, 0]));
  const ids = new Set();
  for (const activity of activities) {
    if (!Object.hasOwn(runners, activity.runner) || typeof activity.id !== 'string' || !activity.id || !Number.isSafeInteger(activity.metres) || activity.metres < 0) throw new Error('Invalid activity');
    const key = `${activity.runner}:${activity.id}`;
    if (ids.has(key)) throw new Error('Duplicate activity: ' + key);
    ids.add(key);
    totals[activity.runner] += activity.metres;
  }
  const results = Object.fromEntries(Object.entries(runners).map(([name, target]) => [name, {
    metres: totals[name], target, remaining: Math.max(0, target - totals[name]),
    status: verified[name] === true ? (totals[name] >= target ? 'pass' : 'fail') : 'unverified'
  }]));
  let settlement = null;
  if (Object.values(results).every(result => result.status !== 'unverified')) {
    const failed = Object.keys(results).filter(name => results[name].status === 'fail');
    settlement = failed.length === 1 ? { debtor: failed[0], creditor: failed[0] === 'Karolis' ? 'Lorenas' : 'Karolis', pounds: 50 } : { pounds: 0 };
  }
  return { results, settlement };
}
