export const BUSINESS_TIME_ZONE = "Asia/Kolkata";
const DELHI_OFFSET = "+05:30";

export function getDelhiDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getNextDelhiDates(count: number): string[] {
  const today = getDelhiDate();
  const [year, month, day] = today.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

/** Convert a stored Delhi-local date/time into an absolute instant. */
export function toDelhiInstant(date: string, time: string): Date {
  return new Date(`${date}T${time.slice(0, 5)}:00${DELHI_OFFSET}`);
}

export function formatDelhiDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", {
    ...options,
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(`${date}T00:00:00${DELHI_OFFSET}`));
}

export function getDelhiDayOfWeek(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "short",
  })
    .format(new Date(`${date}T00:00:00${DELHI_OFFSET}`))
    .toLowerCase();
}
