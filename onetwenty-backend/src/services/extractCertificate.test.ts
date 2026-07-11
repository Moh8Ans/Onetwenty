// src/services/extractCertificate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetText } = vi.hoisted(() => ({ mockGetText: vi.fn() }));

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(function PDFParseMock() {
    return { getText: mockGetText };
  }),
}));

import { PDFParse } from 'pdf-parse';
import { detectFileType, hasUsableTextLayer, extractCertificateFields } from './extractCertificate.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function geminiResponse(obj: any) {
  return {
    json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
  } as any;
}

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

describe('extractCertificateFields', () => {
  it('routes PDFs with a good text layer through text extraction, not vision', async () => {
    mockFetch.mockResolvedValueOnce({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as any); // PDF bytes
    mockGetText.mockResolvedValueOnce({ text: 'GATE Score Report - Registration Number EE12345678 - AIR 3200 - Qualified - Computer Science and Engineering' });
    mockFetch.mockResolvedValueOnce(geminiResponse({ title: 'GATE', issuingOrg: 'IIT', date: '2026-03-01', levelHint: 'national', statusHint: 'unknown' })); // Gemini call

    const result = await extractCertificateFields('https://x.com/gate.pdf', 'application/pdf');

    expect(result.title).toBe('GATE');
    expect(result.extractionFailed).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('flags extractionFailed for a scanned PDF with no usable text, without calling Gemini', async () => {
    mockFetch.mockResolvedValueOnce({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as any);
    mockGetText.mockResolvedValueOnce({ text: '' });

    const result = await extractCertificateFields('https://x.com/scanned.pdf', 'application/pdf');

    expect(result.extractionFailed).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1); // only the PDF byte fetch — no Gemini call
  });

  it('routes images through the vision path: downloads bytes, then calls Gemini', async () => {
    mockFetch.mockResolvedValueOnce({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as any); // image bytes
    mockFetch.mockResolvedValueOnce(geminiResponse({ title: 'Tech Fest', issuingOrg: 'IEEE', date: '2026-05-18', levelHint: 'state', statusHint: 'participation' })); // Gemini call

    const result = await extractCertificateFields('https://x.com/cert.jpg', 'image/jpeg');

    expect(result.title).toBe('Tech Fest');
    expect(mockFetch).toHaveBeenCalledTimes(2); // changed from 1 — Gemini needs bytes, not a URL
    expect(PDFParse).not.toHaveBeenCalled();
  });
});