// src/routes/activities.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// vi.hoisted runs before the vi.mock calls below are hoisted to the top of the file —
// needed because we want a mutable mock db shared across tests, reset between each.
const { db, selectResults, insertedRows, updateCalls, resetMockDb } = vi.hoisted(() => {
  let nextId = 1000;
  const selectResults = new Map<any, any[]>();
  const insertedRows: { table: any; row: any }[] = [];
  const updateCalls: { table: any; vals: any }[] = [];

  const db = {
    select: () => ({
      from: (table: any) => ({
        where: (_cond: any) => Promise.resolve(selectResults.get(table) ?? []),
      }),
    }),
    insert: (table: any) => ({
  values: (vals: any) => {
    const row = { id: nextId++, ...vals };
    insertedRows.push({ table, row });
    const result: any = Promise.resolve(undefined); // supports `await db.insert(x).values(y)` directly
    result.returning = () => Promise.resolve([row]);  // still supports `.returning()` for the other call site
    return result;
  },
}),
    update: (table: any) => ({
      set: (vals: any) => ({
        where: (_cond: any) => {
          updateCalls.push({ table, vals });
          return Promise.resolve();
        },
      }),
    }),
  };

  function resetMockDb() {
    selectResults.clear();
    insertedRows.length = 0;
    updateCalls.length = 0;
    nextId = 1000;
  }

  return { db, selectResults, insertedRows, updateCalls, resetMockDb };
});

vi.mock('../db/index.js', () => ({ db }));
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-1';
    next();
  },
}));

// imported AFTER the mocks so the router picks up the mocked db/auth
import activitiesRouter from './activities.js';
import { categories, activities, sharedCapLedger } from '../db/schema.js';
import { SHARED_CAP_CEILINGS } from '../config/sharedCapCeilings.js';

function findInserted(table: any) {
  return insertedRows.find(r => r.table === table)?.row;
}

const app = express();
app.use(express.json());
app.use(activitiesRouter);

beforeEach(() => resetMockDb());

describe('POST /confirm', () => {
  it('returns 400 when categoryId or title is missing', async () => {
    const res = await request(app).post('/confirm').send({ title: 'Missing category' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the category does not exist', async () => {
    selectResults.set(categories, []); // no matching category found
    const res = await request(app).post('/confirm').send({ categoryId: 999, title: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('flat scoring: awards maxPoints directly, no shared cap involved', async () => {
    selectResults.set(categories, [{ id: 1, scoringType: 'flat', maxPoints: 5, sharedCapGroup: null }]);

    const res = await request(app).post('/confirm').send({ categoryId: 1, title: 'Four-wheeler License' });

    expect(res.status).toBe(201);
    expect(res.body.computedPoints).toBe(5);
    expect(res.body.status).toBe('pending_review');
    expect(updateCalls.find(u => u.table === sharedCapLedger)).toBeUndefined();
  });

  it('level_based scoring: looks up the correct value for the submitted level', async () => {
    selectResults.set(categories, [{
      id: 2, scoringType: 'level_based', maxPoints: 40, sharedCapGroup: null,
      scoringTable: { college: 2, zonal: 5, state: 10, national: 20, international: 30 },
    }]);

    const res = await request(app).post('/confirm').send({ categoryId: 2, title: 'Tech Fest', level: 'state' });

    expect(res.status).toBe(201);
    expect(res.body.computedPoints).toBe(10);
  });

  it('status is always pending_review, even when requiresManualVerification is false — regression test for the dead-ternary bug', async () => {
    selectResults.set(categories, [{ id: 3, scoringType: 'flat', maxPoints: 5, sharedCapGroup: null, requiresManualVerification: false }]);
    const res = await request(app).post('/confirm').send({ categoryId: 3, title: 'Anything' });
    expect(res.body.status).toBe('pending_review');
  });

  it('returns 500 with a clean error when the engine throws (e.g. level_based missing level)', async () => {
    selectResults.set(categories, [{ id: 4, scoringType: 'level_based', maxPoints: 40, sharedCapGroup: null, scoringTable: { state: 10 } }]);
    const res = await request(app).post('/confirm').send({ categoryId: 4, title: 'Missing level field' });
    expect(res.status).toBe(500);
  });

  describe('per_unit_capped — regression coverage for the priorInstancesTotal bug', () => {
    const category = { id: 5, scoringType: 'per_unit_capped', maxPoints: 10, sharedCapGroup: null, scoringTable: { perInstance: 5 } };

    it('awards full perInstance when no prior activity exists for this category', async () => {
      selectResults.set(categories, [category]);
      selectResults.set(activities, []); // no prior submissions
      const res = await request(app).post('/confirm').send({ categoryId: 5, title: 'Blood Donation #1' });
      expect(res.body.computedPoints).toBe(5);
    });

    it('awards zero once two prior instances have already used the full cap — this is exactly the bug that shipped uncaught', async () => {
      selectResults.set(categories, [category]);
      selectResults.set(activities, [
        { status: 'pending_review', computedPoints: 5 },
        { status: 'sfa_approved', computedPoints: 5 },
      ]); // 10 already awarded, cap is 10
      const res = await request(app).post('/confirm').send({ categoryId: 5, title: 'Blood Donation #3' });
      expect(res.body.computedPoints).toBe(0);
    });

    it('excludes sfa_rejected prior activities from the running total', async () => {
      selectResults.set(categories, [category]);
      selectResults.set(activities, [
        { status: 'sfa_rejected', computedPoints: 5 }, // should not count
      ]);
      const res = await request(app).post('/confirm').send({ categoryId: 5, title: 'Blood Donation #2' });
      expect(res.body.computedPoints).toBe(5); // full amount, rejected one correctly ignored
    });
  });

  describe('shared cap group interaction', () => {
    const groupKey = 'g1_nss_ncc_1.11_1.19';
    const ceiling = SHARED_CAP_CEILINGS[groupKey];
    const category = { id: 6, scoringType: 'flat', maxPoints: 30, sharedCapGroup: groupKey };

    it('creates a new ledger row on first submission in this shared group', async () => {
      selectResults.set(categories, [category]);
      selectResults.set(sharedCapLedger, []); // no existing ledger row

      const res = await request(app).post('/confirm').send({ categoryId: 6, title: 'NSS Camp' });

      expect(res.body.computedPoints).toBe(30);
      const insertedLedger = insertedRows.find(r => r.table === sharedCapLedger)?.row;
      expect(insertedLedger?.totalAwarded).toBe(30);
    });

    it('caps at the remaining shared-group room instead of the full per-activity value', async () => {
      selectResults.set(categories, [category]);
      selectResults.set(sharedCapLedger, [{ id: 1, totalAwarded: ceiling - 5 }]); // only 5 pts of room left

      const res = await request(app).post('/confirm').send({ categoryId: 6, title: 'NSS Camp #2' });

      expect(res.body.computedPoints).toBe(5);
      const ledgerUpdate = updateCalls.find(u => u.table === sharedCapLedger);
      expect(ledgerUpdate?.vals.totalAwarded).toBe(ceiling);
    });

    it('awards zero once the shared ceiling is already fully used', async () => {
      selectResults.set(categories, [category]);
      selectResults.set(sharedCapLedger, [{ id: 1, totalAwarded: ceiling }]);

      const res = await request(app).post('/confirm').send({ categoryId: 6, title: 'NSS Camp #3' });

      expect(res.body.computedPoints).toBe(0);
    });
  });
});