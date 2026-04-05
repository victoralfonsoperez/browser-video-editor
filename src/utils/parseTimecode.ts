/**
 * Parse a user-typed timecode string into seconds.
 *
 * Accepted formats (all numeric parts accept decimals on the last segment):
 *   ss           →  seconds only
 *   mm:ss        →  minutes : seconds
 *   hh:mm:ss     →  hours : minutes : seconds
 *
 * A trailing decimal is accepted on the final part, e.g. `1:23.4`.
 * Returns null when the string cannot be parsed or contains negative values.
 */
export function parseTimecode(input: string): number | null {
  const s = input.trim()
  if (!s) return null

  const parts = s.split(':')
  if (parts.length > 3) return null

  const nums = parts.map((p) => parseFloat(p))
  if (nums.some((n) => !isFinite(n) || n < 0)) return null

  if (parts.length === 1) return nums[0]
  if (parts.length === 2) return nums[0] * 60 + nums[1]
  return nums[0] * 3600 + nums[1] * 60 + nums[2]
}
