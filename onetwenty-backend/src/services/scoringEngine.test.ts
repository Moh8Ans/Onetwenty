// src/services/scoringEngine.test.ts
import { describe, it, expect } from 'vitest';
import { computeRawPoints, applyCapsAndLedger } from './scoringEngine.js';
import { SHARED_CAP_CEILINGS } from '../config/sharedCapCeilings.js';

function makeCategory(overrides: Partial<any> = {}) {
  return {
    id: 1,
    scoringType: 'flat',
    scoringTable: null,
    maxPoints: 10,
    sharedCapGroup: null,
    specialConditions: null,
    ...overrides,
  };
}

describe('computeRawPoints', () => {
  it('flat: always returns maxPoints regardless of input', () => {
    const cat = makeCategory({ scoringType: 'flat', maxPoints: 5 });
    expect(computeRawPoints(cat, {})).toBe(5);
    expect(computeRawPoints(cat, { level: 'state' })).toBe(5);
  });

  describe('level_based', () => {
    const cat = makeCategory({
      scoringType: 'level_based',
      scoringTable: { college: 2, zonal: 5, state: 10, national: 20, international: 30 },
    });

    it('returns the correct value for a valid level', () => {
      expect(computeRawPoints(cat, { level: 'state' })).toBe(10);
      expect(computeRawPoints(cat, { level: 'international' })).toBe(30);
    });

    it('throws if level is missing', () => {
      expect(() => computeRawPoints(cat, {})).toThrow('level required');
    });

    it('throws if level is not in the scoring table', () => {
      expect(() => computeRawPoints(cat, { level: 'galactic' })).toThrow('No point value for level');
    });
  });

  describe('tiered', () => {
    const cat = makeCategory({
      scoringType: 'tiered',
      scoringTable: { first: 20, secondThird: 15 },
    });

    it('returns the correct value for a valid tierKey', () => {
      expect(computeRawPoints(cat, { tierKey: 'first' })).toBe(20);
      expect(computeRawPoints(cat, { tierKey: 'secondThird' })).toBe(15);
    });

    it('throws if tierKey is missing', () => {
      expect(() => computeRawPoints(cat, {})).toThrow('tierKey required');
    });

    it('throws if tierKey is not in the scoring table', () => {
      expect(() => computeRawPoints(cat, { tierKey: 'fourth' })).toThrow('No point value for tier');
    });
  });

  describe('per_unit_capped', () => {
    const cat = makeCategory({
      scoringType: 'per_unit_capped',
      scoringTable: { perInstance: 5 },
      maxPoints: 10,
    });

    it('awards full perInstance value when no prior instances exist', () => {
      expect(computeRawPoints(cat, { priorInstancesTotal: 0 })).toBe(5);
    });

    it('awards only the remaining room when partially used', () => {
      // 10 cap, 5 already used → only 5 left, perInstance(5) fits exactly
      expect(computeRawPoints(cat, { priorInstancesTotal: 5 })).toBe(5);
    });

    it('awards a partial amount smaller than perInstance when room is tight', () => {
      // 10 cap, 8 already used → only 2 left, even though perInstance is 5
      expect(computeRawPoints(cat, { priorInstancesTotal: 8 })).toBe(2);
    });

    it('awards zero once the cap is fully used — this is the bug we just fixed', () => {
      expect(computeRawPoints(cat, { priorInstancesTotal: 10 })).toBe(0);
    });

    it('never goes negative if priorInstancesTotal somehow exceeds the cap', () => {
      expect(computeRawPoints(cat, { priorInstancesTotal: 15 })).toBe(0);
    });
  });

  describe('hourly', () => {
    const cat = makeCategory({
      scoringType: 'hourly',
      scoringTable: { pointsPerHour: 1 },
      maxPoints: 40,
    });

    it('awards hours × pointsPerHour under the cap', () => {
      expect(computeRawPoints(cat, { hours: 30 })).toBe(30);
    });

    it('caps at maxPoints even if hours would exceed it', () => {
      expect(computeRawPoints(cat, { hours: 60 })).toBe(40);
    });

    it('throws if hours is missing', () => {
      expect(() => computeRawPoints(cat, {})).toThrow('hours required');
    });
  });

  it('throws on an unrecognized scoringType', () => {
    const cat = makeCategory({ scoringType: 'made_up_type' });
    expect(() => computeRawPoints(cat, {})).toThrow('Unknown scoringType');
  });
});

describe('applyCapsAndLedger', () => {
  it('caps at per-activity maxPoints when there is no shared cap group', () => {
    const cat = makeCategory({ maxPoints: 5, sharedCapGroup: null });
    const result = applyCapsAndLedger(cat, 10, 0);
    expect(result.awarded).toBe(5);
    expect(result.cappedFromRaw).toBe(true);
    expect(result.ledgerAfter).toBe(0); // untouched — no shared group involved
  });

  it('passes rawPoints through unchanged when under the per-activity cap', () => {
    const cat = makeCategory({ maxPoints: 5, sharedCapGroup: null });
    const result = applyCapsAndLedger(cat, 3, 0);
    expect(result.awarded).toBe(3);
    expect(result.cappedFromRaw).toBe(false);
  });

  describe('with a shared cap group', () => {
    const groupKey = 'g1_nss_ncc_1.11_1.19';
    const ceiling = SHARED_CAP_CEILINGS[groupKey];

    it('awards in full when there is room left in the shared ceiling', () => {
      const cat = makeCategory({ maxPoints: ceiling, sharedCapGroup: groupKey });
      const currentLedgerTotal = ceiling - 20; // some room left
      const result = applyCapsAndLedger(cat, 15, currentLedgerTotal);
      expect(result.awarded).toBe(15);
      expect(result.cappedFromRaw).toBe(false);
      expect(result.ledgerAfter).toBe(currentLedgerTotal + 15);
    });

    it('awards only the remaining room when the request would exceed the ceiling', () => {
      const cat = makeCategory({ maxPoints: ceiling, sharedCapGroup: groupKey });
      const currentLedgerTotal = ceiling - 5; // only 5 pts of room left
      const result = applyCapsAndLedger(cat, 15, currentLedgerTotal);
      expect(result.awarded).toBe(5);
      expect(result.cappedFromRaw).toBe(true);
      expect(result.ledgerAfter).toBe(ceiling); // exactly maxed out, never over
    });

    it('awards zero once the shared ceiling is already fully used', () => {
      const cat = makeCategory({ maxPoints: ceiling, sharedCapGroup: groupKey });
      const result = applyCapsAndLedger(cat, 10, ceiling);
      expect(result.awarded).toBe(0);
      expect(result.cappedFromRaw).toBe(true);
      expect(result.ledgerAfter).toBe(ceiling); // stays at ceiling, doesn't go over
    });

    it('applies the per-activity cap before checking shared-group room', () => {
      // per-activity cap (5) is tighter than remaining shared room (30) — per-activity wins first
      const cat = makeCategory({ maxPoints: 5, sharedCapGroup: groupKey });
      const result = applyCapsAndLedger(cat, 20, 10);
      expect(result.awarded).toBe(5);
      expect(result.ledgerAfter).toBe(15);
    });
  });
});