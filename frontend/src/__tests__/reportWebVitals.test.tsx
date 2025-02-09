import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Metric, ReportHandler } from 'web-vitals';
import reportWebVitals from '../reportWebVitals';

// Mock web-vitals module
jest.mock('web-vitals', () => ({
  getCLS: (cb: ReportHandler) => cb({ 
    value: 100, 
    name: 'CLS', 
    id: 'cls', 
    delta: 100, 
    entries: [] 
  } as Metric),
  getFID: (cb: ReportHandler) => cb({ 
    value: 100, 
    name: 'FID', 
    id: 'fid', 
    delta: 100, 
    entries: [] 
  } as Metric),
  getFCP: (cb: ReportHandler) => cb({ 
    value: 100, 
    name: 'FCP', 
    id: 'fcp', 
    delta: 100, 
    entries: [] 
  } as Metric),
  getLCP: (cb: ReportHandler) => cb({ 
    value: 100, 
    name: 'LCP', 
    id: 'lcp', 
    delta: 100, 
    entries: [] 
  } as Metric),
  getTTFB: (cb: ReportHandler) => cb({ 
    value: 100, 
    name: 'TTFB', 
    id: 'ttfb', 
    delta: 100, 
    entries: [] 
  } as Metric),
}));

describe('reportWebVitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the onPerfEntry callback with web vitals', async () => {
    const mockPerfEntry = jest.fn() as unknown as ReportHandler;
    await reportWebVitals(mockPerfEntry);

    // Verify callback was called for each metric
    expect(mockPerfEntry).toHaveBeenCalledTimes(5);
    expect(mockPerfEntry).toHaveBeenCalledWith(
      expect.objectContaining({ 
        value: 100, 
        name: expect.any(String),
        id: expect.any(String),
        delta: expect.any(Number),
        entries: expect.any(Array)
      })
    );
  });

  it('should handle null onPerfEntry', async () => {
    await expect(reportWebVitals(undefined)).resolves.not.toThrow();
  });

  it('should handle undefined onPerfEntry', async () => {
    await expect(reportWebVitals(undefined)).resolves.not.toThrow();
  });

  it('should handle non-function onPerfEntry', async () => {
    await expect(reportWebVitals('not a function' as unknown as ReportHandler)).resolves.not.toThrow();
  });

  it('should handle web-vitals import error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Import failed');
    
    // Force import to fail
    jest.resetModules();
    jest.mock('web-vitals', () => {
      throw mockError;
    });
    
    const mockPerfEntry = jest.fn() as unknown as ReportHandler;
    await reportWebVitals(mockPerfEntry);
    
    expect(consoleSpy).toHaveBeenCalledWith('Error loading web-vitals:', 'Import failed');
    expect(mockPerfEntry).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});