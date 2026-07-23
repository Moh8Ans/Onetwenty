// src/services/duplicateDetection.ts
export type ActivityForDuplicateCheck = {
  id: number;
  categoryId: number;
  title: string;
  eventDate: string | null;
  status: string;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  matchedActivityId: number | null;
  reason: string | null;
};

const SIMILARITY_THRESHOLD = 0.75;
const DATE_WINDOW_DAYS = 5;
const IGNORED_STATUSES = new Set(['sfa_rejected']);

function normalizeTitle(title: string | undefined | null): string[] {
  return (title ?? '')
    .toLowerCase()
    .replace(/[-/]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function titleSimilarity(a: string, b: string): number {
  const tokensA = normalizeTitle(a);
  const tokensB = normalizeTitle(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24);
}

export function checkForDuplicate(
  candidate: { categoryId: number; title: string; eventDate: string | null },
  existing: ActivityForDuplicateCheck[]
): DuplicateCheckResult {
  for (const activity of existing) {
    if (IGNORED_STATUSES.has(activity.status)) continue;
    if (activity.categoryId !== candidate.categoryId) continue;

    const similarity = titleSimilarity(candidate.title, activity.title);
    if (similarity < SIMILARITY_THRESHOLD) continue;

    if (candidate.eventDate && activity.eventDate) {
      if (daysBetween(candidate.eventDate, activity.eventDate) > DATE_WINDOW_DAYS) continue;
    }

    return {
      isDuplicate: true,
      matchedActivityId: activity.id,
      reason: `This looks similar to "${activity.title}" already logged under this category (${Math.round(similarity * 100)}% title match).`,
    };
  }

  return { isDuplicate: false, matchedActivityId: null, reason: null };
}