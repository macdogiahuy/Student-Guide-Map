import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createUser, login } from './helpers.js';

const app = createApp();

describe('auth', () => {
  it('registers a student and logs in immediately (OTP disabled by default)', async () => {
    const email = `reg_${Date.now()}@test.local`;
    const reg = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Nguyen Van A',
      email,
      password: 'Test@1234',
      role: 'STUDENT',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.data.email).toBe(email);
    expect(reg.body.data.status).toBe('ACTIVE');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'Test@1234',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTruthy();
    expect(loginRes.body.data.user.role).toBe('STUDENT');
  });

  it('rejects duplicate email', async () => {
    const email = `dup_${Date.now()}@test.local`;
    const payload = { fullName: 'Dup User', email, password: 'Test@1234', role: 'STUDENT' };
    const first = await request(app).post('/api/v1/auth/register').send(payload);
    expect(first.status).toBe(201);
    const second = await request(app).post('/api/v1/auth/register').send(payload);
    expect(second.status).toBe(409);
  });

  it('rejects weak password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Weak Pass',
      email: `weak_${Date.now()}@test.local`,
      password: '123',
      role: 'STUDENT',
    });
    expect(res.status).toBe(400);
  });

  it('rejects wrong password', async () => {
    const user = await createUser('STUDENT');
    const res = await request(app).post('/api/v1/auth/login').send({
      email: user.email,
      password: 'WrongPass@999',
    });
    expect(res.status).toBe(401);
  });

  it('returns current user on /auth/me', async () => {
    const user = await createUser('STUDENT');
    const { token } = await login(app, user);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(user.email);
  });

  it('blocks /auth/me without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rotates refresh token', async () => {
    const user = await createUser('STUDENT');
    const { refresh } = await login(app, user);
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`sgm_refresh=${refresh}`]);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).not.toBe(refresh);

    // old token revoked after rotation
    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`sgm_refresh=${refresh}`]);
    expect(reuse.status).toBe(401);
  });
});
