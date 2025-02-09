const request = require('supertest');
const app = require('../server');

describe('Server', () => {
  describe('GET /api/health', () => {
    it('should return 200 status and correct response format', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('status', 404);
      expect(response.body.error).toHaveProperty('message', 'Not Found');
    });

    it('should handle server errors', async () => {
      const response = await request(app)
        .get('/test-error')
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('status', 500);
      expect(response.body.error).toHaveProperty('message', 'Test error');
    });
  });
});