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

describe('reviews', () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let student: Awaited<ReturnType<typeof createUser>>;
  let student2: Awaited<ReturnType<typeof createUser>>;
  let admin: Awaited<ReturnType<typeof createUser>>;
  let locId: string;

  beforeAll(async () => {
    owner = await createUser('STORE_OWNER');
    student = await createUser('STUDENT');
    student2 = await createUser('STUDENT');
    admin = await createUser('ADMIN');
    const cat = await createCategory('Review Cat');
    const loc = await createApprovedLocation(owner.id, cat.id, { name: 'Review Target' });
    locId = loc.id;
  });

  it('creates a review and recomputes rating', async () => {
    const { token } = await login(app, student);
    const res = await request(app)
      .post('/api/v1/reviews')
      .set(auth(token))
      .send({ locationId: locId, rating: 5, comment: 'Rat tot' });
    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(5);

    const detail = await request(app).get(`/api/v1/locations/${locId}`);
    expect(detail.body.data.ratingCount).toBe(1);
    expect(detail.body.data.ratingAvg).toBe(5);
  });

  it('rejects duplicate review from same user', async () => {
    const { token } = await login(app, student);
    const res = await request(app)
      .post('/api/v1/reviews')
      .set(auth(token))
      .send({ locationId: locId, rating: 4, comment: 'Sua danh gia' });
    expect(res.status).toBe(409);
  });

  it('rejects owner reviewing own location', async () => {
    // STORE_OWNER is blocked at the route level (403); the service-level rule
    // covers an admin who happens to own a location.
    const cat = await createCategory('Own Cat');
    const ownLoc = await createApprovedLocation(owner.id, cat.id);
    const { token } = await login(app, owner);
    const res = await request(app)
      .post('/api/v1/reviews')
      .set(auth(token))
      .send({ locationId: ownLoc.id, rating: 5, comment: 'Tam' });
    expect(res.status).toBe(403);

    const adminOwner = await createUser('ADMIN');
    const adminLoc = await createApprovedLocation(adminOwner.id, cat.id);
    const { token: adminToken } = await login(app, adminOwner);
    const adminSelf = await request(app)
      .post('/api/v1/reviews')
      .set(auth(adminToken))
      .send({ locationId: adminLoc.id, rating: 5, comment: 'Tam' });
    expect(adminSelf.status).toBe(400);
  });

  it('validates rating range', async () => {
    const { token } = await login(app, student2);
    const res = await request(app)
      .post('/api/v1/reviews')
      .set(auth(token))
      .send({ locationId: locId, rating: 9, comment: 'Sai so sao' });
    expect(res.status).toBe(400);
  });

  it('lets owner reply to a review and notifies reviewer', async () => {
    const { token: ownerToken } = await login(app, owner);
    const reviews = await request(app).get(`/api/v1/reviews?locationId=${locId}`);
    const reviewId = reviews.body.data.items[0].id;

    const res = await request(app)
      .post(`/api/v1/reviews/${reviewId}/reply`)
      .set(auth(ownerToken))
      .send({ content: 'Cam on ban!' });
    expect(res.status).toBe(201);

    const { token: studentToken } = await login(app, student);
    const notif = await request(app)
      .get('/api/v1/notifications?limit=5')
      .set(auth(studentToken));
    expect(notif.body.data.items.some((n: { type: string }) => n.type === 'REVIEW_REPLY')).toBe(true);
  });

  it('blocks non-owner from replying', async () => {
    const reviews = await request(app).get(`/api/v1/reviews?locationId=${locId}`);
    const reviewId = reviews.body.data.items[0].id;
    const { token } = await login(app, student2);
    const res = await request(app)
      .post(`/api/v1/reviews/${reviewId}/reply`)
      .set(auth(token))
      .send({ content: 'Xin chao' });
    expect(res.status).toBe(403);
  });

  it('admin moderates a review (hide) and rating is recomputed', async () => {
    const { token: student2Token } = await login(app, student2);
    const created = await request(app)
      .post('/api/v1/reviews')
      .set(auth(student2Token))
      .send({ locationId: locId, rating: 1, comment: 'Kem' });
    expect(created.status).toBe(201);

    const { token: adminToken } = await login(app, admin);
    const hide = await request(app)
      .patch(`/api/v1/reviews/${created.body.data.id}/moderate`)
      .set(auth(adminToken))
      .send({ status: 'HIDDEN' });
    expect(hide.status).toBe(200);

    const detail = await request(app).get(`/api/v1/locations/${locId}`);
    expect(detail.body.data.ratingBreakdown['1']).toBe(0);
    expect(detail.body.data.ratingCount).toBe(1);
  });

  it('blocks student from moderating', async () => {
    const { token } = await login(app, student);
    const reviews = await request(app).get(`/api/v1/reviews?locationId=${locId}`);
    const res = await request(app)
      .patch(`/api/v1/reviews/${reviews.body.data.items[0].id}/moderate`)
      .set(auth(token))
      .send({ status: 'HIDDEN' });
    expect(res.status).toBe(403);
  });
});

describe('favorites', () => {
  let student: Awaited<ReturnType<typeof createUser>>;
  let locId: string;

  beforeAll(async () => {
    student = await createUser('STUDENT');
    const owner = await createUser('STORE_OWNER');
    const cat = await createCategory('Fav Cat');
    const loc = await createApprovedLocation(owner.id, cat.id, { name: 'Fav Target' });
    locId = loc.id;
  });

  it('toggles favorite on and off', async () => {
    const { token } = await login(app, student);

    const add = await request(app).post(`/api/v1/favorites/${locId}`).set(auth(token));
    expect([200, 201]).toContain(add.status);

    const list = await request(app).get('/api/v1/favorites').set(auth(token));
    expect(list.body.data.items.some((f: { id: string }) => f.id === locId)).toBe(true);

    // detail reflects favorite
    const detail = await request(app).get(`/api/v1/locations/${locId}`).set(auth(token));
    expect(detail.body.data.isFavorite).toBe(true);

    const remove = await request(app).delete(`/api/v1/favorites/${locId}`).set(auth(token));
    expect(remove.status).toBe(200);
    const listAfter = await request(app).get('/api/v1/favorites').set(auth(token));
    expect(listAfter.body.data.items.some((f: { id: string }) => f.id === locId)).toBe(false);
  });

  it('requires auth', async () => {
    const res = await request(app).post(`/api/v1/favorites/${locId}`);
    expect(res.status).toBe(401);
  });
});
