// Import before mocks
import reportWebVitals from '../reportWebVitals';

// Setup mocks
const mockMetrics = {
  getCLS: jest.fn(),
  getFID: jest.fn(),
  getFCP: jest.fn(),
  getLCP: jest.fn(),
  getTTFB: jest.fn(),
};

// Mock web-vitals module
jest.mock('web-vitals', () => ({
  __esModule: true,
  getCLS: (cb) => mockMetrics.getCLS(cb),
  getFID: (cb) => mockMetrics.getFID(cb),
  getFCP: (cb) => mockMetrics.getFCP(cb),
  getLCP: (cb) => mockMetrics.getLCP(cb),
  getTTFB: (cb) => mockMetrics.getTTFB(cb),
}));

describe('reportWebVitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mock implementations
    Object.values(mockMetrics).forEach(metric => {
      metric.mockImplementation(cb => cb({ value: 100, name: metric.getMockName() }));
    });
  });

  it('should call the onPerfEntry callback with web vitals', async () => {
    const mockPerfEntry = jest.fn();
    await reportWebVitals(mockPerfEntry);

    // Verify each web vital was measured
    expect(mockMetrics.getCLS).toHaveBeenCalled();
    expect(mockMetrics.getFID).toHaveBeenCalled();
    expect(mockMetrics.getFCP).toHaveBeenCalled();
    expect(mockMetrics.getLCP).toHaveBeenCalled();
    expect(mockMetrics.getTTFB).toHaveBeenCalled();

    // Verify callback was called for each metric
    expect(mockPerfEntry).toHaveBeenCalledTimes(5);
    expect(mockPerfEntry).toHaveBeenCalledWith(
      expect.objectContaining({ value: 100, name: expect.any(String) })
    );
  });

  it('should handle null onPerfEntry', async () => {
    await expect(reportWebVitals(null)).resolves.not.toThrow();
    expect(mockMetrics.getCLS).not.toHaveBeenCalled();
  });

  it('should handle undefined onPerfEntry', async () => {
    await expect(reportWebVitals(undefined)).resolves.not.toThrow();
    expect(mockMetrics.getCLS).not.toHaveBeenCalled();
  });

  it('should handle non-function onPerfEntry', async () => {
    await expect(reportWebVitals('not a function')).resolves.not.toThrow();
    expect(mockMetrics.getCLS).not.toHaveBeenCalled();
  });

  it('should handle web-vitals import error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockError = new Error('Import failed');
    
    // Force import to fail
    jest.resetModules();
    jest.mock('web-vitals', () => {
      throw mockError;
    });
    
    const mockPerfEntry = jest.fn();
    await reportWebVitals(mockPerfEntry);
    
    expect(consoleSpy).toHaveBeenCalledWith('Error loading web-vitals:', mockError);
    expect(mockPerfEntry).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});