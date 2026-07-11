// src/services/matchCategory.test.ts
import { describe, it, expect, vi } from 'vitest';

// realistic sample using your actual seeded names — including the hyphen/slash cases that exposed the bug
const mockCategories = [
  { id: 1, name: 'Tech-Fest — Participation', majorHead: 'Technical Events, Competitions & Academic Presentations' },
  { id: 2, name: 'Sports/Games/Arts — Participation', majorHead: 'Sports, Arts & Cultural Activities' },
  { id: 3, name: 'Blood Donation', majorHead: 'Community Outreach & Social Initiatives' },
  { id: 4, name: 'Paper Presentation — Participation (IITs etc.)', majorHead: 'Technical Events, Competitions & Academic Presentations' },
];

vi.mock('../db/index.js', () => ({
  db: { select: () => ({ from: () => mockCategories }) },
}));

import { tokenize, overlapScore, matchCategoryCandidates } from './matchCategory.js';

describe('tokenize', () => {
  it('lowercases and splits on whitespace', () => {
    expect(tokenize('Tech Fest Participation')).toEqual(['tech', 'fest', 'participation']);
  });

  it('normalizes hyphens to spaces instead of deleting them — regression test for the merge bug', () => {
    expect(tokenize('Tech-Fest')).toEqual(['tech', 'fest']);
  });

  it('normalizes slashes to spaces instead of deleting them — regression test for the merge bug', () => {
    expect(tokenize('Sports/Games/Arts')).toEqual(['sports', 'games', 'arts']);
  });

  it('strips other punctuation cleanly', () => {
    expect(tokenize('IEEE, IET & ASME!')).toEqual(['ieee', 'iet', 'asme']);
  });

  it('preserves digits', () => {
    expect(tokenize('Smart India Hackathon 2026')).toEqual(['smart', 'india', 'hackathon', '2026']);
  });

  it('collapses multiple spaces and trims empty tokens', () => {
    expect(tokenize('  Extra   Spaces  ')).toEqual(['extra', 'spaces']);
  });
});

describe('overlapScore', () => {
  it('returns 1.0 for a full match', () => {
    expect(overlapScore(['tech', 'fest'], ['tech', 'fest'])).toBe(1);
  });

  it('returns 0 for no overlap', () => {
    expect(overlapScore(['abc'], ['def'])).toBe(0);
  });

  it('returns a fractional score for partial overlap', () => {
    expect(overlapScore(['tech', 'fest', 'extra'], ['tech', 'fest'])).toBeCloseTo(2 / 3);
  });

  it('returns 0 rather than dividing by zero when a is empty', () => {
    expect(overlapScore([], ['tech', 'fest'])).toBe(0);
  });

  it('does not double-count duplicate tokens in b (Set dedupes b, not a)', () => {
    // b has 'tech' effectively once after Set(); a has 'tech' twice — both occurrences in a still count as hits
    expect(overlapScore(['tech', 'tech'], ['tech', 'tech', 'tech'])).toBe(1);
  });
});

describe('matchCategoryCandidates', () => {
  it('ranks the correct category highest for a clean match, including hyphenated names', async () => {
    const result = await matchCategoryCandidates({ title: 'Tech Fest 2026', issuingOrg: 'IEEE Student Chapter' });
    expect(result[0].category.id).toBe(1); // Tech-Fest — would have scored 0 before the tokenize fix
    expect(result[0].confidence).toBeGreaterThan(0);
  });

  it('ranks the correct category highest for slash-joined names', async () => {
    const result = await matchCategoryCandidates({ title: 'Sports Day Arts Competition', issuingOrg: 'College Union' });
    expect(result[0].category.id).toBe(2); // Sports/Games/Arts
  });

  it('returns at most 3 candidates even when more categories exist', async () => {
    const result = await matchCategoryCandidates({ title: 'Paper Presentation', issuingOrg: 'IIT Madras' });
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('returns candidates sorted by descending confidence', async () => {
    const result = await matchCategoryCandidates({ title: 'Tech Fest', issuingOrg: 'IEEE' });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].confidence).toBeGreaterThanOrEqual(result[i].confidence);
    }
  });

  it('still returns candidates (low confidence) when nothing matches well, rather than throwing', async () => {
    const result = await matchCategoryCandidates({ title: 'Completely Unrelated Xyz', issuingOrg: 'Nowhere' });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].confidence).toBe(0);
  });
});