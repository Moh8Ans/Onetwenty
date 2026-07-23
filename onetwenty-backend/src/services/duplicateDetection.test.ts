// src/services/duplicateDetection.test.ts
import { describe, it, expect } from 'vitest';
import { checkForDuplicate } from './duplicateDetection.js';

const existing = [
  { id: 1, categoryId: 20, title: 'Internship in Artificial Intelligence', eventDate: '2025-06-02', status: 'pending_review' },
];

describe('checkForDuplicate', () => {
  it('flags an exact title/category/date match — the real case that slipped through tonight', () => {
    const result = checkForDuplicate({ categoryId: 20, title: 'Internship in Artificial Intelligence', eventDate: '2025-06-02' }, existing);
    expect(result.isDuplicate).toBe(true);
    expect(result.matchedActivityId).toBe(1);
  });

  it('does not flag the same title in a different category', () => {
    const result = checkForDuplicate({ categoryId: 99, title: 'Internship in Artificial Intelligence', eventDate: '2025-06-02' }, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it('does not flag a genuinely different title in the same category', () => {
    const result = checkForDuplicate({ categoryId: 20, title: 'Robotics Hackathon Certificate', eventDate: '2025-06-02' }, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it('does not flag a similar title when the dates are far apart', () => {
    const result = checkForDuplicate({ categoryId: 20, title: 'Internship in Artificial Intelligence', eventDate: '2026-01-01' }, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it('still flags when one side is missing an eventDate, based on title alone', () => {
    const result = checkForDuplicate({ categoryId: 20, title: 'Internship in Artificial Intelligence', eventDate: null }, existing);
    expect(result.isDuplicate).toBe(true);
  });

  it('ignores a prior sfa_rejected submission, allowing genuine resubmission', () => {
    const rejected = [{ ...existing[0], status: 'sfa_rejected' }];
    const result = checkForDuplicate({ categoryId: 20, title: 'Internship in Artificial Intelligence', eventDate: '2025-06-02' }, rejected);
    expect(result.isDuplicate).toBe(false);
  });

  it('returns isDuplicate false with nulls when nothing matches', () => {
    const result = checkForDuplicate({ categoryId: 1, title: 'Completely unrelated', eventDate: null }, []);
    expect(result).toEqual({ isDuplicate: false, matchedActivityId: null, reason: null });
  });
});