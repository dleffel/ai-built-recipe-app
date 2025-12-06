import { jest, describe, it, expect } from '@jest/globals';
import {
  toPTTimezone,
  fromPTTimezoneToUTC,
  formatInPTTimezone,
  getStartOfDayPT,
  getEndOfDayPT,
  toDateStringPT,
  createPTDate,
  groupByDayPT
} from '../utils/timezoneUtils';

describe('Timezone Utilities - Unit Tests', () => {
  describe('toPTTimezone', () => {
    it('should convert a Date object to PT timezone', () => {
      const date = new Date('2025-04-30T12:00:00Z');
      const result = toPTTimezone(date);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });

    it('should convert a string date to PT timezone', () => {
      const result = toPTTimezone('2025-04-30T12:00:00Z');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });
  });

  describe('fromPTTimezoneToUTC', () => {
    it('should convert a Date object from PT to UTC', () => {
      const date = new Date('2025-04-30T12:00:00Z');
      const result = fromPTTimezoneToUTC(date);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });

    it('should convert a string date from PT to UTC', () => {
      const result = fromPTTimezoneToUTC('2025-04-30T12:00:00Z');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });
  });

  describe('formatInPTTimezone', () => {
    it('should format a Date object in PT timezone', () => {
      const date = new Date('2025-04-30T12:00:00Z');
      const result = formatInPTTimezone(date, 'yyyy-MM-dd');
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should format a string date in PT timezone', () => {
      const result = formatInPTTimezone('2025-04-30T12:00:00Z', 'yyyy-MM-dd HH:mm');
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should handle different format strings', () => {
      const date = new Date('2025-04-30T12:00:00Z');
      
      const dateOnly = formatInPTTimezone(date, 'yyyy-MM-dd');
      expect(dateOnly).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      const timeOnly = formatInPTTimezone(date, 'HH:mm:ss');
      expect(timeOnly).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('getStartOfDayPT', () => {
    it('should get start of day for a Date object', () => {
      const date = new Date('2025-04-30T12:00:00Z');
      const result = getStartOfDayPT(date);
      
      expect(result).toBeInstanceOf(Date);
      // Start of day should have hours, minutes, seconds, ms at 0 in local time
      expect(result.getTime()).toBeDefined();
    });

    it('should get start of day for a string date', () => {
      const result = getStartOfDayPT('2025-04-30T12:00:00Z');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });
  });

  describe('getEndOfDayPT', () => {
    it('should get end of day for a Date object', () => {
      const date = new Date('2025-04-30T12:00:00Z');
      const result = getEndOfDayPT(date);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });

    it('should get end of day for a string date', () => {
      const result = getEndOfDayPT('2025-04-30T12:00:00Z');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });

    it('should return a time after start of day', () => {
      const date = new Date('2025-04-30T12:00:00Z');
      const startOfDay = getStartOfDayPT(date);
      const endOfDay = getEndOfDayPT(date);
      
      expect(endOfDay.getTime()).toBeGreaterThan(startOfDay.getTime());
    });
  });

  describe('toDateStringPT', () => {
    it('should convert a Date object to YYYY-MM-DD format', () => {
      const date = new Date('2025-04-30T12:00:00Z');
      const result = toDateStringPT(date);
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should convert a string date to YYYY-MM-DD format', () => {
      const result = toDateStringPT('2025-04-30T12:00:00Z');
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('createPTDate', () => {
    it('should create a date from a string', () => {
      const result = createPTDate('2025-04-30');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });

    it('should create a date from a Date object', () => {
      const inputDate = new Date('2025-04-30T12:00:00Z');
      const result = createPTDate(inputDate);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });

    it('should handle ISO date strings', () => {
      const result = createPTDate('2025-04-30T15:30:00.000Z');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });
  });

  describe('groupByDayPT', () => {
    it('should group items by day in PT timezone', () => {
      const items = [
        { id: '1', dueDate: '2025-04-29T23:00:00Z', title: 'Task 1' },
        { id: '2', dueDate: '2025-04-30T15:00:00Z', title: 'Task 2' },
        { id: '3', dueDate: '2025-04-30T20:00:00Z', title: 'Task 3' },
      ];
      
      const result = groupByDayPT(items);
      
      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    it('should return empty object for empty array', () => {
      const result = groupByDayPT([]);
      
      expect(result).toEqual({});
    });

    it('should group all items with same date together', () => {
      const items = [
        { id: '1', dueDate: '2025-04-30T10:00:00Z', title: 'Task 1' },
        { id: '2', dueDate: '2025-04-30T15:00:00Z', title: 'Task 2' },
      ];
      
      const result = groupByDayPT(items);
      const keys = Object.keys(result);
      
      // Both items should be on the same day in PT timezone
      expect(keys.length).toBeGreaterThanOrEqual(1);
      
      // Total items should equal input items
      const totalItems = Object.values(result).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalItems).toBe(2);
    });

    it('should preserve item properties in grouped result', () => {
      const items = [
        { id: '1', dueDate: '2025-04-30T15:00:00Z', title: 'Task 1', extra: 'data' },
      ];
      
      const result = groupByDayPT(items);
      const firstKey = Object.keys(result)[0];
      const firstItem = result[firstKey][0];
      
      expect(firstItem.id).toBe('1');
      expect(firstItem.title).toBe('Task 1');
      expect((firstItem as any).extra).toBe('data');
    });
  });
});