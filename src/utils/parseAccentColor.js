/**
 * Normalise a raw hex string from a URL param into a valid CSS colour.
 * Accepts values with or without a leading '#'.
 * Returns the value unchanged if it doesn't look like a short/long hex.
 *
 * @param {string} raw  e.g. 'ff0066' or '#ff0066'
 * @returns {string}    e.g. '#ff0066'
 */
export function parseAccentColor (raw) {
  if (!raw) return raw
  if (raw.startsWith('#')) return raw
  if (/^[0-9A-F]{6}$/i.test(raw) || /^[0-9A-F]{3}$/i.test(raw)) {
    return `#${raw}`
  }
  return raw
}
