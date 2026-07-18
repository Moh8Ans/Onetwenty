// src/services/validateSpecialConditions.test.ts
import { describe, it, expect } from 'vitest';
import { validateSpecialConditions, monthsBetween } from './validateSpecialConditions.js';

describe('monthsBetween', () => {
  it('computes a simple whole-month duration', () => {
    expect(monthsBetween('2026-01-01', '2026-04-15')).toBeCloseTo(3.46, 1);
  });
});

describe('validateSpecialConditions', () => {
  it('passes when there are no special conditions and a high-confidence match', () => {
    const result = validateSpecialConditions({ specialConditions: null }, { title: 'Anything', matchConfidence: 0.9 });
    expect(result.status).toBe('passed');
  });

  describe('minDurationMonths', () => {
    const category = { specialConditions: { minDurationMonths: 3.5 } };

    it('fails when duration is provided but too short — this is the exact bug the AI internship exposed', () => {
      const result = validateSpecialConditions(category, {
        title: 'AI Internship', startDate: '2025-06-02', endDate: '2025-08-02', matchConfidence: 0.9,
      });
      expect(result.status).toBe('failed');
      expect(result.reason).toContain('requires at least 3.5 months');
    });

    it('passes when duration meets the minimum and confidence is high', () => {
      const result = validateSpecialConditions(category, {
        title: 'AI Internship', startDate: '2025-01-01', endDate: '2025-05-01', matchConfidence: 0.9,
      });
      expect(result.status).toBe('passed');
    });

    it('flags for manual check when dates are missing entirely', () => {
      const result = validateSpecialConditions(category, { title: 'AI Internship', matchConfidence: 0.9 });
      expect(result.status).toBe('needs_manual_check');
    });
  });

  describe('excludeIfCollegeFest', () => {
    const category = { specialConditions: { excludeIfCollegeFest: true } };

    it('fails when the title mentions Ragam', () => {
      const result = validateSpecialConditions(category, { title: 'Workshop at Ragam 2026', matchConfidence: 0.9 });
      expect(result.status).toBe('failed');
    });

    it('passes for an unrelated workshop with high confidence', () => {
      const result = validateSpecialConditions(category, { title: 'IIT Madras STTP on AI', matchConfidence: 0.9 });
      expect(result.status).toBe('passed');
    });
  });

  it('flags mustBeDuringProgramme for manual check — known limitation, no admission-date data exists yet', () => {
    const result = validateSpecialConditions(
      { specialConditions: { mustBeDuringProgramme: true } },
      { title: 'Four-wheeler license', matchConfidence: 0.9 }
    );
    expect(result.status).toBe('needs_manual_check');
  });

  it('combines multiple manual-check conditions into one reason string', () => {
    const category = { specialConditions: { minClassStrength: 30, maxCoordinators: 2, atLeastOneFemale: true } };
    const result = validateSpecialConditions(category, { title: 'Placement Cell Coordinator', matchConfidence: 0.9 });
    expect(result.status).toBe('needs_manual_check');
    expect(result.reason).toContain('class had at least 30');
    expect(result.reason).toContain('composition requirements');
  });

  it('prioritizes a hard failure over collecting manual-check reasons for other conditions', () => {
    const category = { specialConditions: { minDurationMonths: 6, mustBeDuringProgramme: true } };
    const result = validateSpecialConditions(category, {
      title: 'Short Internship', startDate: '2026-01-01', endDate: '2026-02-01', matchConfidence: 0.9,
    });
    expect(result.status).toBe('failed'); // duration fails outright, never reaches the mustBeDuringProgramme check
  });
});

describe('matchConfidence trust checks', () => {
  it('flags for manual check when matchConfidence is null (manually browsed)', () => {
    const result = validateSpecialConditions({}, { title: 'IEEE Orientation Session', matchConfidence: null });
    expect(result.status).toBe('needs_manual_check');
    expect(result.reason).toContain('manually selected');
  });

  it('flags for manual check when matchConfidence is undefined', () => {
    const result = validateSpecialConditions({}, { title: 'Something' });
    expect(result.status).toBe('needs_manual_check');
    expect(result.reason).toContain('manually selected');
  });

  it('flags for manual check when matchConfidence is below the high-confidence threshold', () => {
    const result = validateSpecialConditions({}, { title: 'Something', matchConfidence: 0.15 });
    expect(result.status).toBe('needs_manual_check');
    expect(result.reason).toContain('not high-confidence');
  });

  it('does not flag on this check alone when matchConfidence meets the high threshold', () => {
    const result = validateSpecialConditions({}, { title: 'Something', matchConfidence: 0.6 });
    expect(result.status).toBe('passed');
  });

  it('sits right at the threshold boundary correctly', () => {
    const belowResult = validateSpecialConditions({}, { title: 'Something', matchConfidence: 0.49 });
    expect(belowResult.status).toBe('needs_manual_check');
    const atResult = validateSpecialConditions({}, { title: 'Something', matchConfidence: 0.5 });
    expect(atResult.status).toBe('passed');
  });
});

describe('informational-session heuristic', () => {
  it('flags an orientation session matched against a competitive-only category — this is the exact IEEE certificate case', () => {
    const result = validateSpecialConditions(
      { srNo: '2.3' },
      { title: 'IEEE Orientation Session', matchConfidence: 0.6 }
    );
    expect(result.status).toBe('needs_manual_check');
    expect(result.reason).toContain('informational/orientation session');
  });

  it('does not flag an orientation-titled certificate against a non-competitive category', () => {
    const result = validateSpecialConditions(
      { srNo: '2.19' },
      { title: 'ICFOSS Orientation Workshop', matchConfidence: 0.6 }
    );
    expect(result.status).toBe('passed');
  });

  it('does not flag a genuinely competitive title', () => {
    const result = validateSpecialConditions(
      { srNo: '2.3' },
      { title: 'IEEE Robotics Challenge', matchConfidence: 0.6 }
    );
    expect(result.status).toBe('passed');
  });

  it('catches other informational keywords beyond "orientation"', () => {
    const result = validateSpecialConditions(
      { srNo: '2.1' },
      { title: 'Tech Fest Induction and Welcome Session', matchConfidence: 0.6 }
    );
    expect(result.status).toBe('needs_manual_check');
  });

  it('is case-insensitive on the keyword match', () => {
    const result = validateSpecialConditions(
      { srNo: '2.4' },
      { title: 'IEEE ORIENTATION Program', matchConfidence: 0.6 }
    );
    expect(result.status).toBe('needs_manual_check');
  });

  it('combines a low-confidence match and an informational title into one joined reason', () => {
    const result = validateSpecialConditions(
      { srNo: '2.1' },
      { title: 'Tech Fest Induction Session', matchConfidence: 0.1 }
    );
    expect(result.status).toBe('needs_manual_check');
    expect(result.reason).toContain('not high-confidence');
    expect(result.reason).toContain('informational/orientation session');
  });
});