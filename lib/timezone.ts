// Timezone utilities for inventory alerts with automatic DST handling

export interface TimezoneConfig {
  timezone: string
  targetHour: number // Hour in local timezone (0-23)
  targetDay: number // Day of week (0=Sunday, 1=Monday, etc.)
}

// Default configuration - Eastern Time, Monday 9am
export const DEFAULT_TIMEZONE_CONFIG: TimezoneConfig = {
  timezone: 'America/New_York',
  targetHour: 9,
  targetDay: 1 // Monday
}

/**
 * Get the current DST status and UTC offset for Eastern Time
 */
export function getEasternTimeInfo() {
  const now = new Date()
  
  // Create test dates for January and July to determine DST
  const january = new Date(now.getFullYear(), 0, 1)
  const july = new Date(now.getFullYear(), 6, 1)
  
  // Get timezone offsets
  const janOffset = getTimezoneOffsetForDate(january, 'America/New_York')
  const julOffset = getTimezoneOffsetForDate(july, 'America/New_York')
  const currentOffset = getTimezoneOffsetForDate(now, 'America/New_York')
  
  // DST is when offset is different from standard time (winter)
  const isDST = currentOffset !== Math.max(janOffset, julOffset)
  
  // Eastern Standard Time (EST) = UTC-5, Eastern Daylight Time (EDT) = UTC-4
  const offsetHours = isDST ? 4 : 5
  const abbreviation = isDST ? 'EDT' : 'EST'
  
  return {
    isDST,
    offsetHours,
    abbreviation,
    utcHourFor9AM: (9 + offsetHours) % 24
  }
}

/**
 * Get timezone offset in hours for a specific date and timezone
 */
function getTimezoneOffsetForDate(date: Date, timezone: string): number {
  const utc = new Date(date.getTime() + (date.getTimezoneOffset() * 60000))
  const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }))
  return (utc.getTime() - target.getTime()) / (1000 * 60 * 60)
}

/**
 * Generate the correct cron schedule for 9 AM Eastern Time
 * Automatically handles DST transitions
 */
export function generateEasternTimeCronSchedule(): string {
  const timeInfo = getEasternTimeInfo()
  return `0 ${timeInfo.utcHourFor9AM} * * 1`
}

/**
 * Get DST transition dates for the current year
 */
export function getDSTTransitionDates(year?: number): {
  springForward: Date
  fallBack: Date
} {
  const currentYear = year || new Date().getFullYear()
  
  // DST starts on the second Sunday in March
  const march = new Date(currentYear, 2, 1) // March 1st
  const firstSundayMarch = new Date(march)
  firstSundayMarch.setDate(1 + (7 - march.getDay()) % 7)
  const springForward = new Date(firstSundayMarch)
  springForward.setDate(firstSundayMarch.getDate() + 7) // Second Sunday
  springForward.setHours(2, 0, 0, 0) // 2:00 AM
  
  // DST ends on the first Sunday in November
  const november = new Date(currentYear, 10, 1) // November 1st
  const fallBack = new Date(november)
  fallBack.setDate(1 + (7 - november.getDay()) % 7) // First Sunday
  fallBack.setHours(2, 0, 0, 0) // 2:00 AM
  
  return { springForward, fallBack }
}

/**
 * Check if we're within a DST transition period (need to update cron)
 */
export function needsCronUpdate(): {
  needsUpdate: boolean
  reason?: string
  newSchedule?: string
  transitionDate?: Date
} {
  const now = new Date()
  const timeInfo = getEasternTimeInfo()
  const currentCronSchedule = generateEasternTimeCronSchedule()
  const transitions = getDSTTransitionDates()
  
  // Check if we're within 24 hours of a DST transition
  const msInDay = 24 * 60 * 60 * 1000
  const springTransition = Math.abs(now.getTime() - transitions.springForward.getTime()) < msInDay
  const fallTransition = Math.abs(now.getTime() - transitions.fallBack.getTime()) < msInDay
  
  if (springTransition) {
    return {
      needsUpdate: true,
      reason: 'Spring forward transition (EDT begins)',
      newSchedule: currentCronSchedule,
      transitionDate: transitions.springForward
    }
  }
  
  if (fallTransition) {
    return {
      needsUpdate: true,
      reason: 'Fall back transition (EST begins)',
      newSchedule: currentCronSchedule,
      transitionDate: transitions.fallBack
    }
  }
  
  return { needsUpdate: false }
}

/**
 * Get comprehensive schedule information
 */
export function getScheduleDescription(timezone: string = 'America/New_York'): {
  schedule: string
  timezone: string
  currentTime: string
  isDST: boolean
  offsetHours: number
  cronSchedule: string
  nextTransition: {
    date: Date
    type: 'spring' | 'fall'
    description: string
  }
} {
  const timeInfo = getEasternTimeInfo()
  const transitions = getDSTTransitionDates()
  const now = new Date()
  
  // Determine next transition
  const nextTransition = now < transitions.springForward 
    ? { date: transitions.springForward, type: 'spring' as const, description: 'Spring forward to EDT' }
    : { date: transitions.fallBack, type: 'fall' as const, description: 'Fall back to EST' }
  
  // Format current time in target timezone
  const currentTime = now.toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
  
  return {
    schedule: `Every Monday at 9:00 AM ${timeInfo.abbreviation}`,
    timezone: timezone,
    currentTime: currentTime,
    isDST: timeInfo.isDST,
    offsetHours: timeInfo.offsetHours,
    cronSchedule: generateEasternTimeCronSchedule(),
    nextTransition
  }
}

/**
 * Validate that the current cron schedule matches the expected timezone
 */
export function validateCronSchedule(currentCronSchedule: string): {
  isValid: boolean
  expectedSchedule: string
  message: string
} {
  const expectedSchedule = generateEasternTimeCronSchedule()
  const isValid = currentCronSchedule === expectedSchedule
  
  const timeInfo = getEasternTimeInfo()
  
  return {
    isValid,
    expectedSchedule,
    message: isValid 
      ? `Cron schedule is correct for ${timeInfo.abbreviation}`
      : `Cron schedule needs update: expected ${expectedSchedule} for ${timeInfo.abbreviation}, got ${currentCronSchedule}`
  }
}
