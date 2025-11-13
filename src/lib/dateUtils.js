/**
 * Date utilities that ensure all dates are in Eastern Time Zone
 */

/**
 * Get today's date in YYYY-MM-DD format, using Eastern timezone
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getTodayDateET() {
  const now = new Date()

  // Convert to Eastern Time
  const etString = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  // Parse the ET string (format: "MM/DD/YYYY, HH:MM:SS AM/PM")
  const [datePart] = etString.split(', ')
  const [month, day, year] = datePart.split('/')

  // Return in YYYY-MM-DD format
  return `${year}-${month}-${day}`
}

/**
 * Get a Date object representing the start of today in Eastern timezone
 * @returns {Date} Date object set to midnight ET today
 */
export function getTodayET() {
  const todayString = getTodayDateET()
  // Create date with explicit time to avoid timezone issues
  return new Date(todayString + 'T00:00:00')
}
