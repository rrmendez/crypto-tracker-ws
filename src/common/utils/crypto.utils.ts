/**
 * Compare two crypto addresses
 *
 * @param a
 * @param b
 * @returns
 */
export function cryptoAddressEquals(a?: string | null, b?: string | null) {
  if (!a || !b) {
    return false;
  }

  return a.toLowerCase() === b.toLowerCase();
}
