import { db } from '../db/index.js';
import { categories } from '../db/schema.js';

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[-/]/g, ' ')        // normalize word-joining punctuation to spaces first
    .replace(/[^a-z0-9 ]/g, '')   // then strip everything else non-alphanumeric
    .split(/\s+/)
    .filter(Boolean);
}

export function overlapScore(a: string[], b: string[]): number {
  const setB = new Set(b);
  const hits = a.filter(t => setB.has(t)).length;
  return hits / Math.max(a.length, 1);
}

export async function matchCategoryCandidates(extracted: { title: string; issuingOrg: string }) {
  const all = await db.select().from(categories);
  const queryTokens = tokenize(`${extracted.title} ${extracted.issuingOrg}`);

  const scored = all.map(cat => ({
    category: cat,
    confidence: overlapScore(queryTokens, tokenize(`${cat.name} ${cat.majorHead}`)),
  }));

  return scored.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}