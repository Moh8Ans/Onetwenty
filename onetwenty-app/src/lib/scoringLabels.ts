// src/lib/scoringLabels.ts
const OVERRIDES: Record<string, string> = {
  first: '1st Prize', secondThird: '2nd / 3rd Prize', second: '2nd Prize', third: '3rd Prize',
  certB: 'NCC "B" Certificate', certC: 'NCC "C" Certificate', oneYearParade: '1-Year NCC + Parade Attendance',
  officeBearer: 'Office Bearer', execCommittee: 'Executive Committee Member',
  universityOfficeBearer: 'University Union Office Bearer', universityMember: 'University Union Member',
  filed: 'Filed', published: 'Published', granted: 'Granted / Approved', licensed: 'Licensed',
  state: 'State Award', national: 'National Award',
  q1q2: 'SCI/Scopus Q1–Q2 Journal', q3q4: 'SCI/Scopus Q3–Q4 Journal',
};

export function humanizeTierKey(key: string): string {
  if (OVERRIDES[key]) return OVERRIDES[key];
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase());
}