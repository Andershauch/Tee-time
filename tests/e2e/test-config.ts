export const testOrigin = "http://localhost:3010";

/** Pick tomorrow noon after today's noon, so API tests are stable at any wall-clock time. */
export function testRequestedMinutes(now = new Date()) {
  const target = new Date(now);
  target.setHours(12, 0, 0, 0);
  if (target.getTime() - now.getTime() < 20 * 60_000) target.setDate(target.getDate() + 1);
  return Math.ceil((target.getTime() - now.getTime()) / 60_000);
}
