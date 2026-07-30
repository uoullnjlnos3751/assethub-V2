import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

describe('API routes', () => {
  const app = createApp();

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/borrow/requests requires authentication', async () => {
    const res = await request(app)
      .post('/api/borrow/requests')
      .send({ assetIds: [1], purpose: 'test' });
    expect(res.status).toBe(401);
  });

  it('GET /api/borrow/requests requires authentication', async () => {
    const res = await request(app).get('/api/borrow/requests');
    expect(res.status).toBe(401);
  });

  it('GET /uploads without auth is rejected', async () => {
    const res = await request(app).get('/uploads/pmswhub/test.jpg');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login rejects empty credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: '', password: '' });
    expect(res.status).toBe(400);
  });
});
