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

describe('promotions', () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let admin: Awaited<ReturnType<typeof createUser>>;
  let student: Awaited<ReturnType<typeof createUser>>;
  let locId: string;

  beforeAll(async () => {
    owner = await createUser('STORE_OWNER');
    admin = await createUser('ADMIN');
    student = await createUser('STUDENT');
    const cat = await createCategory('Promo Cat');
    const loc = await createApprovedLocation(owner.id, cat.id, { name: 'Promo Target' });
    locId = loc.id;
  });

  it('owner creates promotion (PENDING), admin approves, student sees it', async () => {
    const { token: ownerToken } = await login(app, owner);
    const create = await request(app)
      .post('/api/v1/promotions')
      .set(auth(ownerToken))
      .send({
        locationId: locId,
        title: 'Giam 20%',
        content: 'Giam 20% moi ngay',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
      });
    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe('PENDING');

    // not visible to public while pending
    const before = await request(app).get('/api/v1/promotions');
    expect(before.body.data.items.some((p: { id: string }) => p.id === create.body.data.id)).toBe(false);

    const { token: adminToken } = await login(app, admin);
    const decide = await request(app)
      .post(`/api/v1/promotions/${create.body.data.id}/decide`)
      .set(auth(adminToken))
      .send({ decision: 'ACTIVE' });
    expect(decide.status).toBe(200);
    expect(decide.body.data.status).toBe('ACTIVE');

    const after = await request(app).get('/api/v1/promotions');
    expect(after.body.data.items.some((p: { id: string }) => p.id === create.body.data.id)).toBe(true);

    // owner notified
    const { token: ownerToken2 } = await login(app, owner);
    const notif = await request(app)
      .get('/api/v1/notifications?limit=5')
      .set(auth(ownerToken2));
    expect(notif.body.data.items.some((n: { type: string }) => n.type === 'PROMOTION_APPROVED')).toBe(true);
  });

  it('rejects endDate <= startDate', async () => {
    const { token } = await login(app, owner);
    const res = await request(app)
      .post('/api/v1/promotions')
      .set(auth(token))
      .send({
        locationId: locId,
        title: 'Sai ngay',
        content: 'X',
        startDate: new Date(Date.now() + 86400_000).toISOString(),
        endDate: new Date().toISOString(),
      });
    expect(res.status).toBe(400);
  });

  it('forbids student from creating promotions', async () => {
    const { token } = await login(app, student);
    const res = await request(app)
      .post('/api/v1/promotions')
      .set(auth(token))
      .send({
        locationId: locId,
        title: 'X',
        content: 'X',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400_000).toISOString(),
      });
    expect(res.status).toBe(403);
  });
});

describe('reports', () => {
  let student: Awaited<ReturnType<typeof createUser>>;
  let admin: Awaited<ReturnType<typeof createUser>>;
  let owner: Awaited<ReturnType<typeof createUser>>;
  let locId: string;

  beforeAll(async () => {
    student = await createUser('STUDENT');
    admin = await createUser('ADMIN');
    owner = await createUser('STORE_OWNER');
    const cat = await createCategory('Report Cat');
    const loc = await createApprovedLocation(owner.id, cat.id, { name: 'Report Target' });
    locId = loc.id;
  });

  it('student submits report, admin processes it, student AND shop owner are notified', async () => {
    const { token } = await login(app, student);
    const create = await request(app)
      .post('/api/v1/reports')
      .set(auth(token))
      .send({ locationId: locId, type: 'WRONG_ADDRESS', content: 'Sai dia chi' });
    expect(create.status).toBe(201);

    // duplicate blocked while pending
    const dup = await request(app)
      .post('/api/v1/reports')
      .set(auth(token))
      .send({ locationId: locId, type: 'WRONG_ADDRESS', content: 'Sai dia chi' });
    expect(dup.status).toBe(409);

    const { token: adminToken } = await login(app, admin);
    const process = await request(app)
      .patch(`/api/v1/reports/${create.body.data.id}/process`)
      .set(auth(adminToken))
      .send({ status: 'RESOLVED', adminNote: 'Da sua' });
    expect(process.status).toBe(200);
    expect(process.body.data.status).toBe('RESOLVED');

    // reporter notified
    const notif = await request(app)
      .get('/api/v1/notifications?limit=10')
      .set(auth(token));
    expect(notif.body.data.items.some((n: { type: string }) => n.type === 'REPORT_UPDATE')).toBe(true);

    // shop owner notified about wrong-info report
    const { token: ownerToken } = await login(app, owner);
    const ownerNotif = await request(app)
      .get('/api/v1/notifications?limit=10')
      .set(auth(ownerToken));
    const ownerReportNotif = ownerNotif.body.data.items.find(
      (n: { type: string; title: string }) =>
        n.type === 'REPORT_UPDATE' && n.title.includes('bao cao') || n.title.includes('báo cáo'),
    );
    expect(ownerReportNotif).toBeTruthy();
  });

  it('validates report type enum', async () => {
    const { token } = await login(app, student);
    const res = await request(app)
      .post('/api/v1/reports')
      .set(auth(token))
      .send({ locationId: locId, type: 'NOT_A_TYPE' });
    expect(res.status).toBe(400);
  });

  it('blocks student from processing reports', async () => {
    const { token } = await login(app, student);
    const mine = await request(app).get('/api/v1/reports/mine').set(auth(token));
    const id = mine.body.data.items[0]?.id;
    if (id) {
      const res = await request(app)
        .patch(`/api/v1/reports/${id}/process`)
        .set(auth(token))
        .send({ status: 'RESOLVED' });
      expect(res.status).toBe(403);
    }
  });
});

describe('admin dashboard', () => {
  it('returns stats for admin only', async () => {
    const admin = await createUser('ADMIN');
    const student = await createUser('STUDENT');
    const { token: adminToken } = await login(app, admin);
    const { token: studentToken } = await login(app, student);

    const denied = await request(app).get('/api/v1/admin/dashboard').set(auth(studentToken));
    expect(denied.status).toBe(403);

    const ok = await request(app).get('/api/v1/admin/dashboard').set(auth(adminToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.stats).toHaveProperty('totalLocations');
    expect(ok.body.data.stats).toHaveProperty('pendingLocations');
  });
});
