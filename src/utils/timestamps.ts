export function filterValidTimestamps(
  timestamps: number[],
  windowSize: number,
  now: number
): number[] {
  return timestamps.filter((timestamp) => now - timestamp < windowSize);
}
