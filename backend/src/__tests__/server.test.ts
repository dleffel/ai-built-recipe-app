import { describe, it, expect } from '@jest/globals';
import supertest, { Response } from 'supertest';
import { Express } from 'express';
import app from '../server';

interface HealthResponse {
  status: string;
  timestamp: string;
}

interface ErrorResponse {
  error: {
    status: number;
    message: string;
  };
}

const request = supertest;

describe('Server', () => {
  describe('GET /api/health', () => {
    it('should return 200 status and correct response format', async () => {
      const response: Response = await request(app as Express)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      const body = response.body as HealthResponse;
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('timestamp');
      expect(new Date(body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes', async () => {
      const response: Response = await request(app as Express)
        .get('/non-existent-route')
        .expect('Content-Type', /json/)
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('status', 404);
      expect(body.error).toHaveProperty('message', 'Not Found');
    });

    it('should handle server errors', async () => {
      const response: Response = await request(app as Express)
        .get('/test-error')
        .expect('Content-Type', /json/)
        .expect(500);

      const body = response.body as ErrorResponse;
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('status', 500);
      expect(body.error).toHaveProperty('message', 'Test error');
    });
  });
});