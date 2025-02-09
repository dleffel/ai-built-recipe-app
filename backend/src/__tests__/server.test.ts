import request from 'supertest';
import app from '../server';

describe('Server API', () => {
  it('responds to health check', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('handles unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Not Found');
  });

  it('handles server errors gracefully', async () => {
    const response = await request(app)
      .get('/test-error')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe('Test error');
  });
});