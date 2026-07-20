export type CategoryForSuggestions = {
  id: number;
  group: number;
  srNo: string;
  name: string;
  majorHead: string;
  maxPoints: number;
  scoringType: string;
  scoringTable: any;
  sharedCapGroup: string | null;
};

export type ActivityForSuggestions = {
  categoryId: number;
  computedPoints: number | null;
  status: string; // 'draft' | 'pending_review' | 'sfa_approved' | 'sfa_rejected' | 'flagged'
};

export type SharedLedgerRow = { sharedCapGroup: string; totalAwarded: number };

export type Effort = 'quick' | 'flexible' | 'moderate' | 'long_term';

export type Suggestion = {
  category: CategoryForSuggestions;
  potentialPoints: number;
  effort: Effort;
  alreadyStarted: boolean;
  groupPointsRemaining: number;
};

const COUNTED_STATUSES = new Set(['pending_review', 'sfa_approved']);

export function classifyEffort(category: CategoryForSuggestions, specialConditions: any): Effort {
  if (specialConditions?.minDurationMonths && specialConditions.minDurationMonths >= 2) return 'long_term';
  if (category.scoringType === 'hourly') return 'flexible';
  if (category.scoringType === 'flat' || category.scoringType === 'per_unit_capped') return 'quick';
  return 'moderate';
}

export function bestCaseRawPoints(category: CategoryForSuggestions): number {
  switch (category.scoringType) {
    case 'flat':
      return category.maxPoints;
    case 'level_based':
    case 'tiered': {
      const values = Object.values(category.scoringTable ?? {}).filter((v): v is number => typeof v === 'number');
      return values.length ? Math.max(...values) : 0;
    }
    case 'per_unit_capped':
      return category.scoringTable?.perInstance ?? 0;
    case 'hourly':
      return category.maxPoints;
    default:
      return 0;
  }
}

export function generateSuggestions(
  categories: CategoryForSuggestions[],
  activities: ActivityForSuggestions[],
  sharedLedgerRows: SharedLedgerRow[],
  sharedCapCeilings: Record<string, number>,
  targetPerGroup = 40
): Suggestion[] {
  const relevant = activities.filter(a => COUNTED_STATUSES.has(a.status));

  const verifiedByGroup: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const usedByCategory = new Map<number, number>();

  for (const activity of relevant) {
    const category = categories.find(c => c.id === activity.categoryId);
    if (!category) continue;
    const pts = activity.computedPoints ?? 0;
    usedByCategory.set(activity.categoryId, (usedByCategory.get(activity.categoryId) ?? 0) + pts);
    if (activity.status === 'sfa_approved') verifiedByGroup[category.group] += pts;
  }

  const usedBySharedGroup = new Map(sharedLedgerRows.map(r => [r.sharedCapGroup, r.totalAwarded]));
  const startedCategoryIds = new Set(relevant.map(a => a.categoryId));

  const suggestions: Suggestion[] = [];

  for (const group of [1, 2, 3]) {
    const remaining = Math.max(0, targetPerGroup - verifiedByGroup[group]);
    if (remaining === 0) continue;

    for (const category of categories.filter(c => c.group === group)) {
      const usedInCategory = usedByCategory.get(category.id) ?? 0;
      const roomInCategory = Math.max(0, category.maxPoints - usedInCategory);
      if (roomInCategory <= 0) continue;

      let potential = Math.min(bestCaseRawPoints(category), roomInCategory);

      if (category.sharedCapGroup) {
        const ceiling = sharedCapCeilings[category.sharedCapGroup] ?? Infinity;
        const used = usedBySharedGroup.get(category.sharedCapGroup) ?? 0;
        potential = Math.min(potential, Math.max(0, ceiling - used));
      }

      if (potential <= 0) continue;

      suggestions.push({
        category,
        potentialPoints: potential,
        effort: classifyEffort(category, (category as any).specialConditions),
        alreadyStarted: startedCategoryIds.has(category.id),
        groupPointsRemaining: remaining,
      });
    }
  }

  const effortRank: Record<Effort, number> = { quick: 0, flexible: 1, moderate: 2, long_term: 3 };
  return suggestions.sort((a, b) => {
    if (a.groupPointsRemaining !== b.groupPointsRemaining) return b.groupPointsRemaining - a.groupPointsRemaining;
    if (effortRank[a.effort] !== effortRank[b.effort]) return effortRank[a.effort] - effortRank[b.effort];
    return b.potentialPoints - a.potentialPoints;
  });
}