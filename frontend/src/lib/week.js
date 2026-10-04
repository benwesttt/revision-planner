// JS equivalent of backend services/week.py week_for_date.
// Dates are 'YYYY-MM-DD' strings. Parsing at local noon keeps each calendar
// date on its own day even when a DST change falls inside the range.

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const daysSinceMonday = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

// Returns 'A' or 'B' for the Mon–Sun week containing dateStr. anchorStr is a
// Monday that fell in Week A. Round (not floor) absorbs the one-hour DST shift
// in the millisecond gap; the sign is preserved, so dates before the anchor
// come out right (-1 week → odd → 'B').
export function weekForDate(anchorStr, dateStr) {
  const weeksSinceAnchor = Math.round((mondayOf(dateStr) - mondayOf(anchorStr)) / MS_PER_WEEK);
  return weeksSinceAnchor % 2 === 0 ? 'A' : 'B';
}
