// src/services/suggestionEngine.test.ts
import { describe, it, expect } from 'vitest';
import { classifyEffort, bestCaseRawPoints, generateSuggestions } from './suggestionEngine.js';

const flatCat = { id: 1, group: 1, srNo: '1.5', name: 'Four-wheeler License', majorHead: 'Sports', maxPoints: 5, scoringType: 'flat', scoringTable: null, sharedCapGroup: null };
const levelCat = { id: 2, group: 1, srNo: '1.1', name: 'Sports Participation', majorHead: 'Sports', maxPoints: 40, scoringType: 'level_based', scoringTable: { college: 1, national: 20, international: 40 }, sharedCapGroup: null };
const perUnitCat = { id: 3, group: 1, srNo: '1.8', name: 'Blood Donation', majorHead: 'Community', maxPoints: 10, scoringType: 'per_unit_capped', scoringTable: { perInstance: 5 }, sharedCapGroup: null };
const hourlyCat = { id: 4, group: 3, srNo: '3.17', name: 'Skilling Certificate', majorHead: 'Skill Development', maxPoints: 40, scoringType: 'hourly', scoringTable: { pointsPerHour: 1 }, sharedCapGroup: null };
const sharedCat = { id: 5, group: 1, srNo: '1.11', name: 'NSS Volunteer', majorHead: 'NSS/NCC', maxPoints: 30, scoringType: 'flat', scoringTable: null, sharedCapGroup: 'g1_nss_ncc' };
const longTermCat = { id: 6, group: 3, srNo: '3.3', name: 'Long-Term Internship', majorHead: 'Industry Exposure', maxPoints: 15, scoringType: 'flat', scoringTable: null, sharedCapGroup: null, specialConditions: { minDurationMonths: 3.5 } };

describe('classifyEffort', () => {
  it('classifies flat and per_unit_capped as quick', () => {
    expect(classifyEffort(flatCat, null)).toBe('quick');
    expect(classifyEffort(perUnitCat, null)).toBe('quick');
  });
  it('classifies hourly as flexible', () => {
    expect(classifyEffort(hourlyCat, null)).toBe('flexible');
  });
  it('classifies level_based and tiered as moderate', () => {
    expect(classifyEffort(levelCat, null)).toBe('moderate');
  });
  it('classifies long-duration categories as long_term regardless of scoringType', () => {
    expect(classifyEffort(longTermCat, { minDurationMonths: 3.5 })).toBe('long_term');
  });
});

describe('bestCaseRawPoints', () => {
  it('returns maxPoints for flat', () => expect(bestCaseRawPoints(flatCat)).toBe(5));
  it('returns the highest table value for level_based', () => expect(bestCaseRawPoints(levelCat)).toBe(40));
  it('returns perInstance for per_unit_capped, not maxPoints', () => expect(bestCaseRawPoints(perUnitCat)).toBe(5));
  it('returns maxPoints for hourly (best case = full cap)', () => expect(bestCaseRawPoints(hourlyCat)).toBe(40));
});

describe('generateSuggestions', () => {
  const categories = [flatCat, levelCat, perUnitCat, hourlyCat, sharedCat, longTermCat];

  it('suggests nothing for a group that has already met the 40-point target', () => {
    const activities = [{ categoryId: 1, computedPoints: 40, status: 'sfa_approved' }];
    const result = generateSuggestions([flatCat], activities, [], {});
    expect(result).toHaveLength(0);
  });

  it('ignores draft and rejected activities when computing verified totals', () => {
    const activities = [
      { categoryId: 1, computedPoints: 40, status: 'draft' },
      { categoryId: 1, computedPoints: 40, status: 'sfa_rejected' },
    ];
    const result = generateSuggestions([flatCat], activities, [], {});
    expect(result.length).toBeGreaterThan(0); // group still shows as needing points — neither counted
  });

  it('excludes a category that is already fully used up', () => {
    const activities = [{ categoryId: 1, computedPoints: 5, status: 'sfa_approved' }]; // flatCat maxPoints is 5
    const result = generateSuggestions([flatCat], activities, [], {});
    expect(result.find(s => s.category.id === 1)).toBeUndefined();
  });

  it('caps potentialPoints at remaining room in a partially-used category', () => {
    const activities = [{ categoryId: 3, computedPoints: 5, status: 'sfa_approved' }]; // perUnitCat: 5 of 10 used
    const result = generateSuggestions([perUnitCat], activities, [], {});
    expect(result[0].potentialPoints).toBe(5); // remaining room, not the full perInstance(5) blindly
  });

  it('excludes a category whose shared cap group is fully exhausted', () => {
    const ledger = [{ sharedCapGroup: 'g1_nss_ncc', totalAwarded: 40 }];
    const result = generateSuggestions([sharedCat], [], ledger, { g1_nss_ncc: 40 });
    expect(result).toHaveLength(0);
  });

  it('caps potentialPoints at remaining shared-cap room even if the category cap alone allows more', () => {
    const ledger = [{ sharedCapGroup: 'g1_nss_ncc', totalAwarded: 25 }]; // 15 of 40 shared room left
    const result = generateSuggestions([sharedCat], [], ledger, { g1_nss_ncc: 40 }); // sharedCat maxPoints is 30
    expect(result[0].potentialPoints).toBe(15);
  });

  it('prioritizes the group with the largest remaining gap first', () => {
    const catGroup1 = { ...flatCat, id: 10, group: 1 };
    const catGroup2 = { ...flatCat, id: 11, group: 2, srNo: '2.20' };
    const activities = [{ categoryId: 10, computedPoints: 35, status: 'sfa_approved' }]; // group 1 needs only 5 more
    const result = generateSuggestions([catGroup1, catGroup2], activities, [], {});
    expect(result[0].category.group).toBe(2); // group 2 needs the full 40, ranks first
  });

  it('ranks quick-effort suggestions above moderate-effort ones within the same group', () => {
    const result = generateSuggestions([flatCat, levelCat], [], [], {});
    const quickIdx = result.findIndex(s => s.category.id === flatCat.id);
    const moderateIdx = result.findIndex(s => s.category.id === levelCat.id);
    expect(quickIdx).toBeLessThan(moderateIdx);
  });

  it('marks alreadyStarted true when the student has a non-rejected submission in that category', () => {
    const activities = [{ categoryId: 3, computedPoints: 5, status: 'pending_review' }];
    const result = generateSuggestions([perUnitCat], activities, [], {});
    expect(result[0].alreadyStarted).toBe(true);
  });

  it('marks alreadyStarted false for a category with no submissions at all', () => {
    const result = generateSuggestions([flatCat], [], [], {});
    expect(result[0].alreadyStarted).toBe(false);
  });
});