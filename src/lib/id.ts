/** Wraps crypto.randomUUID() so the ID strategy is swappable in one place
 * later (e.g. server-assigned IDs once a backend exists). */
export function createId(): string {
  return crypto.randomUUID();
}
