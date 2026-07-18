// src/services/validateSpecialConditions.ts
export type ValidationResult = {
  status: 'passed' | 'failed' | 'needs_manual_check';
  reason: string | null;
};

export type SubmissionForValidation = {
  title: string;
  issuingOrg?: string;
  startDate?: string;
  endDate?: string;
  matchConfidence?: number | null; // null/undefined = manually browsed, no algorithmic corroboration
};

const HIGH_CONFIDENCE_THRESHOLD = 0.5; // matches the "High match" badge boundary shown to students
const INFORMATIONAL_KEYWORDS = /\b(orientation|induction|awareness session|inaugurat|felicitation|welcome session)\b/i;
const COMPETITIVE_ONLY_SRNOS = new Set(['2.1', '2.2', '2.3', '2.4']); // Tech-Fest / Professional Society competitions

export function monthsBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
  return (end.getTime() - start.getTime()) / msPerMonth;
}

export function validateSpecialConditions(
  category: { specialConditions?: any; srNo?: string; name?: string },
  submission: SubmissionForValidation
): ValidationResult {
  const conditions = category.specialConditions ?? {};
  const manualReasons: string[] = [];

  // --- trust checks on the category match itself, independent of any specialConditions ---
  if (submission.matchConfidence == null) {
    manualReasons.push('Category was manually selected via search rather than confirmed by automatic extraction — verify this activity genuinely matches the selected sub-activity.');
  } else if (submission.matchConfidence < HIGH_CONFIDENCE_THRESHOLD) {
    manualReasons.push(`Automatic category match was not high-confidence (${Math.round(submission.matchConfidence * 100)}%) — verify this isn't just a keyword coincidence.`);
  }

  if (category.srNo && COMPETITIVE_ONLY_SRNOS.has(category.srNo) && INFORMATIONAL_KEYWORDS.test(submission.title ?? '')) {
    manualReasons.push(`The title suggests an informational/orientation session, but Sr. No ${category.srNo} is intended for competitive or technical events — verify this genuinely qualifies rather than being a general awareness talk.`);
  }

  // --- existing specific eligibility rules, unchanged ---
  if (conditions.minDurationMonths != null) {
    if (submission.startDate && submission.endDate) {
      const months = monthsBetween(submission.startDate, submission.endDate);
      if (Number.isNaN(months)) {
        manualReasons.push('Start/end dates could not be parsed — duration must be verified manually.');
      } else if (months < conditions.minDurationMonths) {
        return {
          status: 'failed',
          reason: `Duration is approximately ${months.toFixed(1)} months, but this category requires at least ${conditions.minDurationMonths} months.`,
        };
      }
    } else {
      manualReasons.push('Start and end dates were not provided — duration could not be verified automatically.');
    }
  }

  if (conditions.excludeIfCollegeFest) {
    const text = `${submission.title ?? ''} ${submission.issuingOrg ?? ''}`.toLowerCase();
    if (/\bragam\b|college fest/.test(text)) {
      return {
        status: 'failed',
        reason: 'This appears to be part of a college fest activity, which the handbook excludes from this category.',
      };
    }
  }

  if (conditions.mustBeDuringProgramme) {
    manualReasons.push("Verify this was completed during the student's programme duration.");
  }

  if (conditions.minIndustriesVisited != null) {
    manualReasons.push(`Verify the report documents at least ${conditions.minIndustriesVisited} industries visited.`);
  }

  if (conditions.minClassStrength != null) {
    manualReasons.push(`Verify the class had at least ${conditions.minClassStrength} students.`);
  }

  if (conditions.maxCoordinators != null || conditions.atLeastOneFemale) {
    manualReasons.push('Verify coordinator count and composition requirements for this role.');
  }

  if (conditions.mustBeOnApprovedCourseList) {
    manualReasons.push("Verify this course appears on the University's currently published approved skilling course list.");
  }

  if (conditions.requiresGeoTagCert) {
    manualReasons.push('Verify the certificate is a geo-tagged certification, not a generic participation certificate.');
  }

  if (manualReasons.length > 0) {
    return { status: 'needs_manual_check', reason: manualReasons.join(' ') };
  }

  return { status: 'passed', reason: null };
}

