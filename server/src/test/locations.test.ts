import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import {
  auth,
  createApprovedLocation,
  createCategory,
  createUser,
  login,
} from './helpers.js';

const app = createApp();

describe('locations', () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let admin: Awaited<ReturnType<typeof createUser>>;
  let student: Awaited<ReturnType<typeof createUser>>;
  let catId: string;
  let approvedId: string;

  beforeAll(async () => {
    owner = await createUser('STORE_OWNER');
    admin = await createUser('ADMIN');
    student = await createUser('STUDENT');
    const cat = await createCategory('Quan an test');
    catId = cat.id;
    const loc = await createApprovedLocation(owner.id, catId, { name: 'Qua An Test' });
    approvedId = loc.id;
  });

  it('searches approved locations without auth', async () => {
    const res = await request(app).get('/api/v1/locations?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.meta).toHaveProperty('total');
  });

  it('filters by category slug', async () => {
    const slug = (await request(app).get(`/api/v1/categories`)).body.data.find(
      (c: { id: string }) => c.id === catId,
    ).slug;
    const res = await request(app).get(`/api/v1/locations?category=${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.every((i: { category: { id: string } }) => i.category.id === catId)).toBe(true);
  });

  it('sorts by nearest with coordinates', async () => {
    const res = await request(app).get(
      '/api/v1/locations?sort=nearest&lat=21.0133&lng=105.5247',
    );
    expect(res.status).toBe(200);
    const items = res.body.data.items;
    if (items.length > 1) {
      expect(items[0].distanceKm).not.toBeNull();
      expect(items[0].distanceKm).toBeLessThanOrEqual(items[items.length - 1].distanceKm);
    }
  });

  it('returns detail with opening hours and open status', async () => {
    const res = await request(app).get(`/api/v1/locations/${approvedId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Qua An Test');
    expect(res.body.data.openingHours.length).toBe(7);
    expect(res.body.data.openStatus).toHaveProperty('state');
  });

  it('404 for unknown location', async () => {
    const res = await request(app).get('/api/v1/locations/nonexistent-id');
    expect(res.status).toBe(404);
  });

  it('owner creates a location (PENDING) then admin approves it', async () => {
    const { token: ownerToken } = await login(app, owner);
    const create = await request(app)
      .post('/api/v1/locations')
      .set(auth(ownerToken))
      .send({
        name: 'Qua An Moi',
        address: '2 Đường Test',
        lat: 21.015,
        lng: 105.526,
        categoryId: catId,
        priceLevel: 2,
      });
    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe('PENDING');

    const { token: adminToken } = await login(app, admin);
    const decide = await request(app)
      .post(`/api/v1/locations/${create.body.data.id}/decide`)
      .set(auth(adminToken))
      .send({ decision: 'APPROVED' });
    expect(decide.status).toBe(200);
    expect(decide.body.data.status).toBe('APPROVED');

    // owner gets a notification
    const notif = await request(app)
      .get('/api/v1/notifications?limit=5')
      .set(auth(ownerToken));
    expect(notif.body.data.items.some((n: { type: string }) => n.type === 'LOCATION_APPROVED')).toBe(true);
  });

  it('rejects approval without reason when rejecting', async () => {
    const { token: ownerToken } = await login(app, owner);
    const create = await request(app)
      .post('/api/v1/locations')
      .set(auth(ownerToken))
      .send({
        name: 'Bi Tu Choi',
        address: '3 Đường Test',
        lat: 21.016,
        lng: 105.527,
        categoryId: catId,
        priceLevel: 1,
      });
    const { token: adminToken } = await login(app, admin);
    const noReason = await request(app)
      .post(`/api/v1/locations/${create.body.data.id}/decide`)
      .set(auth(adminToken))
      .send({ decision: 'REJECTED' });
    expect(noReason.status).toBe(400);

    const withReason = await request(app)
      .post(`/api/v1/locations/${create.body.data.id}/decide`)
      .set(auth(adminToken))
      .send({ decision: 'REJECTED', reason: 'Sai dia chi' });
    expect(withReason.status).toBe(200);
    expect(withReason.body.data.rejectionReason).toBe('Sai dia chi');
  });

  it('forbids student from creating locations', async () => {
    const { token } = await login(app, student);
    const res = await request(app)
      .post('/api/v1/locations')
      .set(auth(token))
      .send({
        name: 'Not Allowed',
        address: 'X',
        lat: 21,
        lng: 105,
        categoryId: catId,
        priceLevel: 1,
      });
    expect(res.status).toBe(403);
  });

  it('validates required fields on create', async () => {
    const { token } = await login(app, owner);
    const res = await request(app)
      .post('/api/v1/locations')
      .set(auth(token))
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});
