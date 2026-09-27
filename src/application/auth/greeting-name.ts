// Shared inboxes are not a person's name, so they get the neutral greeting instead.
const SHARED_INBOX_NAMES = new Set([
  "admin", "booking", "bookings", "contact", "enquiries", "enquiry", "hello", "info",
  "instructor", "lessons", "mail", "office", "support", "team",
]);

/**
 * A first name for in-app greetings, taken from the instructor's email address
 * ("sarah.jones+work@example.com" → "Sarah"). The workspace name is pupil-facing
 * ("Sarah's Driving School"), so it is never used to greet the instructor.
 * Returns null when the address gives no plausible first name.
 */
export function greetingNameFromEmail(email?: string | null): string | null {
  const localPart = email?.trim().split("@")[0]?.split("+")[0] ?? "";
  const firstChunk = localPart.split(/[._\-\d]+/).find(Boolean) ?? "";
  if (firstChunk.length < 2 || !/^\p{L}+$/u.test(firstChunk)) return null;
  if (SHARED_INBOX_NAMES.has(firstChunk.toLowerCase())) return null;
  return firstChunk.charAt(0).toUpperCase() + firstChunk.slice(1).toLowerCase();
}
