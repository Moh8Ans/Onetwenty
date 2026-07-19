// src/services/extractCertificate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetText } = vi.hoisted(() => ({ mockGetText: vi.fn() }));

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(function PDFParseMock() {
    return { getText: mockGetText };
  }),
}));

import { PDFParse } from 'pdf-parse';
import { detectFileType, hasUsableTextLayer, buildCategoryCatalog, classifyCertificate } from './extractCertificate.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function geminiResponse(obj: any) {
  return { json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }) } as any;
}

const sampleCategories = [
  { id: 1, srNo: '2.1', group: 2, majorHead: 'Technical Events, Competitions & Academic Presentations', name: 'Tech-Fest — Participation', maxPoints: 40, specialConditions: null },
  { id: 2, srNo: '2.3', group: 2, majorHead: 'Technical Events, Competitions & Academic Presentations', name: 'Professional Society Events — Participation', maxPoints: 40, specialConditions: null },
  { id: 3, srNo: '3.3', group: 3, majorHead: 'Industry Exposure, Academic Projects & Internships', name: 'Long-Term Internship', maxPoints: 15, specialConditions: { minDurationMonths: 3.5 } },
];

beforeEach(() => {
  mockFetch.mockReset();
  mockGetText.mockReset();
  vi.mocked(PDFParse).mockClear();
});

describe('detectFileType', () => {
  it('trusts the client-provided mimeType hint over everything else', async () => {
    expect(await detectFileType('https://x.com/file', 'application/pdf')).toBe('pdf');
    expect(await detectFileType('https://x.com/file', 'image/jpeg')).toBe('image');
  });

  it('falls back to Content-Type header when no hint is given', async () => {
    mockFetch.mockResolvedValueOnce({ headers: { get: () => 'application/pdf' } } as any);
    expect(await detectFileType('https://x.com/report')).toBe('pdf');
  });

  it('falls back to file extension when HEAD request fails entirely', async () => {
    mockFetch.mockRejectedValueOnce(new Error('HEAD not supported'));
    expect(await detectFileType('https://x.com/cert.pdf')).toBe('pdf');
  });

  it('defaults to image when nothing indicates a PDF', async () => {
    mockFetch.mockRejectedValueOnce(new Error('HEAD not supported'));
    expect(await detectFileType('https://x.com/photo.jpg')).toBe('image');
  });
});

describe('hasUsableTextLayer', () => {
  it('returns false for empty or near-empty text (scanned PDFs)', () => {
    expect(hasUsableTextLayer('')).toBe(false);
    expect(hasUsableTextLayer('   \n\n  ')).toBe(false);
  });

  it('returns true for a realistic score-report length text block', () => {
    expect(hasUsableTextLayer('GRE Official Score Report - Verbal 160 Quant 165 - ETS')).toBe(true);
  });

  it('sits right at the boundary correctly', () => {
    expect(hasUsableTextLayer('a'.repeat(39))).toBe(false);
    expect(hasUsableTextLayer('a'.repeat(40))).toBe(true);
  });
});

describe('buildCategoryCatalog', () => {
  it('includes srNo, group, major head, name and points for each category', () => {
    const catalog = buildCategoryCatalog(sampleCategories);
    expect(catalog).toContain('2.1 | Group II | Technical Events, Competitions & Academic Presentations | Tech-Fest — Participation | max 40 pts');
  });

  it('appends eligibility notes when specialConditions are present', () => {
    expect(buildCategoryCatalog(sampleCategories)).toContain('requires min 3.5 months duration');
  });

  it('omits the notes bracket entirely when there are no special conditions', () => {
    const line = buildCategoryCatalog(sampleCategories).split('\n').find(l => l.startsWith('2.1'));
    expect(line).not.toContain('[');
  });
});

describe('classifyCertificate', () => {
  it('routes PDFs with a good text layer through text classification', async () => {
    mockFetch.mockResolvedValueOnce({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as any);
    mockGetText.mockResolvedValueOnce({ text: 'GATE Score Report - Registration Number EE12345678 - AIR 3200 - Qualified - Computer Science and Engineering' });
    mockFetch.mockResolvedValueOnce(geminiResponse({
      isCertificate: true, title: 'GATE', issuingOrg: 'IIT', date: '2026-03-01', startDate: null, endDate: null,
      levelHint: 'national', statusHint: 'unknown',
      candidates: [{ srNo: '2.1', confidence: 0.4, reasoning: 'loosely related technical event' }],
    }));

    const result = await classifyCertificate('https://x.com/gate.pdf', 'application/pdf', sampleCategories);

    expect(result.title).toBe('GATE');
    expect(result.candidates[0].srNo).toBe('2.1');
    expect(result.extractionFailed).toBeUndefined();
  });

  it('flags extractionFailed for a scanned PDF with no usable text, without calling Gemini', async () => {
    mockFetch.mockResolvedValueOnce({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as any);
    mockGetText.mockResolvedValueOnce({ text: '' });

    const result = await classifyCertificate('https://x.com/scanned.pdf', 'application/pdf', sampleCategories);

    expect(result.extractionFailed).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('routes images through vision classification, sending both bytes and the catalog', async () => {
    mockFetch.mockResolvedValueOnce({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as any);
    mockFetch.mockResolvedValueOnce(geminiResponse({
      isCertificate: true, title: 'Tech Fest', issuingOrg: 'IEEE', date: '2026-05-18', startDate: null, endDate: null,
      levelHint: 'state', statusHint: 'participation',
      candidates: [{ srNo: '2.1', confidence: 0.8, reasoning: 'clear technical competition participation' }],
    }));

    const result = await classifyCertificate('https://x.com/cert.jpg', 'image/jpeg', sampleCategories);

    expect(result.title).toBe('Tech Fest');
    expect(result.candidates[0].confidence).toBe(0.8);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(PDFParse).not.toHaveBeenCalled();
  });

  it('flags extractionFailed when Gemini explicitly says isCertificate: false — this is the chess-screenshot case', async () => {
    mockFetch.mockResolvedValueOnce({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as any);
    mockFetch.mockResolvedValueOnce(geminiResponse({ isCertificate: false, title: null, issuingOrg: null, date: null, candidates: [] }));

    const result = await classifyCertificate('https://x.com/chess.jpg', 'image/jpeg', sampleCategories);

    expect(result.extractionFailed).toBe(true);
    expect(result.candidates).toEqual([]);
  });

  it('flags extractionFailed when all fields come back empty even without an explicit isCertificate flag', async () => {
    mockFetch.mockResolvedValueOnce({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as any);
    mockFetch.mockResolvedValueOnce(geminiResponse({ title: null, issuingOrg: null, date: null, candidates: [] }));

    const result = await classifyCertificate('https://x.com/blank.jpg', 'image/jpeg', sampleCategories);

    expect(result.extractionFailed).toBe(true);
  });

  it('surfaces low confidence with a reason when a document clearly fails a stated eligibility note — this is the Metaloop 1-week-internship case', async () => {
    mockFetch.mockResolvedValueOnce({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as any);
    mockFetch.mockResolvedValueOnce(geminiResponse({
      isCertificate: true, title: '7 Day Internship', issuingOrg: 'Metaloop', date: '2025-06-18', startDate: '2025-06-11', endDate: '2025-06-17',
      levelHint: 'unknown', statusHint: 'unknown',
      candidates: [{ srNo: '3.3', confidence: 0.1, reasoning: 'Only 1 week long; Long-Term Internship requires 3.5 months, so this is a poor match' }],
    }));

    const result = await classifyCertificate('https://x.com/metaloop.jpg', 'image/jpeg', sampleCategories);

    expect(result.candidates[0].confidence).toBeLessThan(0.2);
    expect(result.candidates[0].reasoning).toContain('requires 3.5 months');
  });
});