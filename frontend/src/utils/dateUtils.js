import moment from 'moment-jalaali'

/**
 * Convert ISO date string to Persian (Jalali) date with timezone
 * @param {string} isoDateString - ISO format date string
 * @returns {string} - Formatted Persian date string
 */
export function toPersianDateTime(isoDateString) {
  if (!isoDateString) return ''
  
  try {
    // Parse the ISO date string
    const date = moment(isoDateString)
    
    // Convert UTC to Tehran timezone (UTC+3:30 = 210 minutes)
    // Tehran is UTC+3:30, so we add 3.5 hours
    const tehranOffsetMinutes = 3.5 * 60 // 210 minutes
    const adjustedDate = moment(date).utcOffset(tehranOffsetMinutes)
    
    // Convert to Persian (Jalali) calendar
    return adjustedDate.format('jYYYY/jMM/jDD HH:mm:ss')
  } catch (error) {
    console.error('Error converting date to Persian:', error)
    return isoDateString
  }
}

/**
 * Convert ISO date string to Persian date only (without time)
 * @param {string} isoDateString - ISO format date string
 * @returns {string} - Formatted Persian date string
 */
export function toPersianDate(isoDateString) {
  if (!isoDateString) return ''
  
  try {
    const date = moment(isoDateString)
    const tehranOffsetMinutes = 3.5 * 60
    const adjustedDate = moment(date).utcOffset(tehranOffsetMinutes)
    return adjustedDate.format('jYYYY/jMM/jDD')
  } catch (error) {
    console.error('Error converting date to Persian:', error)
    return isoDateString
  }
}

/**
 * Convert ISO date string to Persian time only
 * @param {string} isoDateString - ISO format date string
 * @returns {string} - Formatted Persian time string
 */
export function toPersianTime(isoDateString) {
  if (!isoDateString) return ''
  
  try {
    const date = moment(isoDateString)
    const tehranOffsetMinutes = 3.5 * 60
    const adjustedDate = moment(date).utcOffset(tehranOffsetMinutes)
    return adjustedDate.format('HH:mm:ss')
  } catch (error) {
    console.error('Error converting time to Persian:', error)
    return isoDateString
  }
}

/**
 * Convert ISO date string to both Persian (Jalali) and Gregorian dates with timezone
 * @param {string} isoDateString - ISO format date string
 * @returns {object} - Object with persian and gregorian date strings
 */
export function toDualDateTime(isoDateString) {
  if (!isoDateString) return { persian: '', gregorian: '' }
  
  try {
    // Parse the ISO date string
    const date = moment(isoDateString)
    
    // Convert UTC to Tehran timezone (UTC+3:30 = 210 minutes)
    const tehranOffsetMinutes = 3.5 * 60 // 210 minutes
    const adjustedDate = moment(date).utcOffset(tehranOffsetMinutes)
    
    // Persian (Jalali) format
    const persian = adjustedDate.format('jYYYY/jMM/jDD HH:mm:ss')
    
    // Gregorian format with Persian month names in English
    const gregorian = adjustedDate.format('YYYY-MM-DD HH:mm:ss')
    
    return {
      persian: persian,
      gregorian: gregorian
    }
  } catch (error) {
    console.error('Error converting date to dual format:', error)
    return { persian: isoDateString, gregorian: isoDateString }
  }
}

