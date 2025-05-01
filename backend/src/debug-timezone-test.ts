import {
  toPTTimezone,
  formatInPTTimezone,
  getStartOfDayPT,
  getEndOfDayPT,
  toDateStringPT,
  createPTDate
} from './utils/timezoneUtils';

// Test date: April 30, 2025, noon UTC
const testDate = new Date('2025-04-30T12:00:00Z');

console.log('===== Timezone Utilities Debug Test =====');
console.log('Test date (UTC):', testDate.toISOString());

// Test toPTTimezone
const ptDate = toPTTimezone(testDate);
console.log('\n--- toPTTimezone ---');
console.log('PT date:', ptDate);
console.log('PT hours:', ptDate.getHours());
console.log('PT date (ISO):', ptDate.toISOString());

// Test formatInPTTimezone
console.log('\n--- formatInPTTimezone ---');
console.log('Formatted PT date:', formatInPTTimezone(testDate, 'yyyy-MM-dd HH:mm:ss'));

// Test getStartOfDayPT
const startOfDay = getStartOfDayPT(testDate);
console.log('\n--- getStartOfDayPT ---');
console.log('Start of day (UTC):', startOfDay.toISOString());
console.log('UTC hours:', startOfDay.getUTCHours());

// Test getEndOfDayPT
const endOfDay = getEndOfDayPT(testDate);
console.log('\n--- getEndOfDayPT ---');
console.log('End of day (UTC):', endOfDay.toISOString());
console.log('UTC hours:', endOfDay.getUTCHours());
console.log('UTC date:', endOfDay.getUTCDate());

// Test toDateStringPT
console.log('\n--- toDateStringPT ---');
console.log('Date string PT:', toDateStringPT(testDate));

// Test createPTDate
const createdDate = createPTDate('2025-04-30');
console.log('\n--- createPTDate ---');
console.log('Created date (UTC):', createdDate.toISOString());
console.log('UTC hours:', createdDate.getUTCHours());

// Test day boundary edge cases
console.log('\n===== Day Boundary Edge Cases =====');

// 11:59pm PT on April 29 (just before midnight)
const beforeMidnight = new Date('2025-04-30T06:59:00Z');
console.log('Before midnight (UTC):', beforeMidnight.toISOString());
console.log('Before midnight PT date string:', toDateStringPT(beforeMidnight));

// 12:01am PT on April 30 (just after midnight)
const afterMidnight = new Date('2025-04-30T07:01:00Z');
console.log('After midnight (UTC):', afterMidnight.toISOString());
console.log('After midnight PT date string:', toDateStringPT(afterMidnight));

// Start of day for a date after midnight
const startOfDayAfterMidnight = getStartOfDayPT(afterMidnight);
console.log('Start of day after midnight (UTC):', startOfDayAfterMidnight.toISOString());
console.log('UTC hours:', startOfDayAfterMidnight.getUTCHours());

// End of day for a date before midnight
const endOfDayBeforeMidnight = getEndOfDayPT(beforeMidnight);
console.log('End of day before midnight (UTC):', endOfDayBeforeMidnight.toISOString());
console.log('UTC hours:', endOfDayBeforeMidnight.getUTCHours());

// Test DST transitions
console.log('\n===== DST Transitions =====');

// March 9, 2025 is the DST transition date (2am becomes 3am)
// 1:30am PT before DST transition (9:30am UTC)
const beforeTransition = new Date('2025-03-09T09:30:00Z');
console.log('Before DST transition (UTC):', beforeTransition.toISOString());
console.log('Before DST transition PT date string:', toDateStringPT(beforeTransition));

// 3:30am PT after DST transition (10:30am UTC)
const afterTransition = new Date('2025-03-09T10:30:00Z');
console.log('After DST transition (UTC):', afterTransition.toISOString());
console.log('After DST transition PT date string:', toDateStringPT(afterTransition));

// Start of day for a date before DST transition
const startOfDayBeforeTransition = getStartOfDayPT(beforeTransition);
console.log('Start of day before DST transition (UTC):', startOfDayBeforeTransition.toISOString());
console.log('UTC hours:', startOfDayBeforeTransition.getUTCHours());

// End of day for a date after DST transition
const endOfDayAfterTransition = getEndOfDayPT(afterTransition);
console.log('End of day after DST transition (UTC):', endOfDayAfterTransition.toISOString());
console.log('UTC hours:', endOfDayAfterTransition.getUTCHours());
console.log('UTC date:', endOfDayAfterTransition.getUTCDate());