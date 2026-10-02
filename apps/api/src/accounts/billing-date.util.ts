export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/**
 * The most recent billing cutoff on or before `asOf`, recurring monthly on
 * `billingDate`'s day-of-month (clamped to the last day of shorter months,
 * e.g. a day-31 card cuts on Feb 28/29).
 */
export function lastCutoffDate(billingDate: Date, asOf: Date): Date {
  const day = billingDate.getUTCDate();
  const y = asOf.getUTCFullYear();
  const m = asOf.getUTCMonth();

  const thisMonthCutoff = new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m))));
  if (thisMonthCutoff.getTime() <= asOf.getTime()) {
    return thisMonthCutoff;
  }

  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  return new Date(Date.UTC(prevY, prevM, Math.min(day, daysInMonth(prevY, prevM))));
}

/**
 * The next occurrence (on or after `asOf`) of a recurring monthly date —
 * same day-of-month/clamping rule as `lastCutoffDate`, just looking forward
 * instead of back. Used to find a card's upcoming payment due date.
 */
export function nextOccurrenceOnOrAfter(recurringDate: Date, asOf: Date): Date {
  const day = recurringDate.getUTCDate();
  const y = asOf.getUTCFullYear();
  const m = asOf.getUTCMonth();

  const thisMonth = new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m))));
  if (thisMonth.getTime() >= asOf.getTime()) {
    return thisMonth;
  }

  const nextM = m === 11 ? 0 : m + 1;
  const nextY = m === 11 ? y + 1 : y;
  return new Date(Date.UTC(nextY, nextM, Math.min(day, daysInMonth(nextY, nextM))));
}
