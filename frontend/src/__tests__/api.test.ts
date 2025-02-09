import api from '../services/api';

describe('API Service', () => {
  it('should have correct base configuration', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:5001');
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should export axios instance with expected methods', () => {
    expect(api.get).toBeDefined();
    expect(api.post).toBeDefined();
    expect(api.put).toBeDefined();
    expect(api.delete).toBeDefined();
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
    expect(typeof api.put).toBe('function');
    expect(typeof api.delete).toBe('function');
  });
});