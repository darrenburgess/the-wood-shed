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

/**
 * Add or subtract days from a date string, staying in Eastern timezone
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} days - Number of days to add (positive) or subtract (negative)
 * @returns {string} New date in YYYY-MM-DD format
 */
export function addDaysET(dateString, days) {
  // Parse the date string
  const [year, month, day] = dateString.split('-').map(Number)

  // Create a date object (this will be in local timezone, but we just use it for math)
  const date = new Date(year, month - 1, day)

  // Add/subtract days
  date.setDate(date.getDate() + days)

  // Format back to YYYY-MM-DD
  const newYear = date.getFullYear()
  const newMonth = String(date.getMonth() + 1).padStart(2, '0')
  const newDay = String(date.getDate()).padStart(2, '0')

  return `${newYear}-${newMonth}-${newDay}`
}
