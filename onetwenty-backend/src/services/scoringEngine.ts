// src/services/scoringEngine.ts
import { SHARED_CAP_CEILINGS } from '../config/sharedCapCeilings.js';

type Category = {
  id: number; scoringType: string; scoringTable: any; maxPoints: number;
  sharedCapGroup: string | null; specialConditions: any;
};

type ScoringInput = {
  level?: string;              // 'college'|'zonal'|'state'|'national'|'international'
  achievementStatus?: string;  // 'participation'|'winner'
  tierKey?: string;            // for tiered types, e.g. 'first', 'certB', 'q1q2'
  hours?: number;              // for hourly type
  priorInstancesTotal?: number; // sum already awarded in this exact category, for per_unit_capped
};

export function computeRawPoints(category: Category, input: ScoringInput): number {
  switch (category.scoringType) {
    case 'flat':
      return category.maxPoints;

    case 'level_based': {
      if (!input.level) throw new Error('level required for level_based scoring');
      const table = category.scoringTable as Record<string, number>;
      const val = table[input.level];
      if (val == null) throw new Error(`No point value for level "${input.level}"`);
      return val;
    }

    case 'tiered': {
      if (!input.tierKey) throw new Error('tierKey required for tiered scoring');
      const table = category.scoringTable as Record<string, any>;
      const val = table[input.tierKey];
      if (typeof val !== 'number') throw new Error(`No point value for tier "${input.tierKey}"`);
      return val;
    }

    case 'per_unit_capped': {
      const perInstance = (category.scoringTable as any).perInstance;
      const already = input.priorInstancesTotal ?? 0;
      const remaining = Math.max(0, category.maxPoints - already);
      return Math.min(perInstance, remaining);
    }

    case 'hourly': {
      if (!input.hours) throw new Error('hours required for hourly scoring');
      const perHour = (category.scoringTable as any).pointsPerHour;
      return Math.min(input.hours * perHour, category.maxPoints);
    }

    default:
      throw new Error(`Unknown scoringType: ${category.scoringType}`);
  }
}

/** Applies per-activity cap, then shared-cap-group ceiling on top */
export function applyCapsAndLedger(
  category: Category,
  rawPoints: number,
  currentLedgerTotal: number
): { awarded: number; cappedFromRaw: boolean; ledgerAfter: number } {
  const perActivityCapped = Math.min(rawPoints, category.maxPoints);

  if (!category.sharedCapGroup) {
    return { awarded: perActivityCapped, cappedFromRaw: perActivityCapped < rawPoints, ledgerAfter: currentLedgerTotal };
  }

  const ceiling = SHARED_CAP_CEILINGS[category.sharedCapGroup];
  const remainingRoom = Math.max(0, ceiling - currentLedgerTotal);
  const awarded = Math.min(perActivityCapped, remainingRoom);

  return {
    awarded,
    cappedFromRaw: awarded < rawPoints,
    ledgerAfter: currentLedgerTotal + awarded,
  };
}