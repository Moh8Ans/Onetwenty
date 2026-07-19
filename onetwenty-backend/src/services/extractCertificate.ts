// src/services/extractCertificate.ts
import { PDFParse } from 'pdf-parse';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GROUP_NAMES: Record<number, string> = { 1: 'Group I', 2: 'Group II', 3: 'Group III' };

export type CategoryForCatalog = {
  id: number;
  srNo: string;
  name: string;
  group: number;
  majorHead: string;
  maxPoints: number;
  specialConditions?: any;
};

export type ClassificationCandidate = { srNo: string; confidence: number; reasoning: string };

export type ClassificationResult = {
  isCertificate?: boolean;
  title: string | null;
  issuingOrg: string | null;
  date: string | null;
  startDate: string | null;
  endDate: string | null;
  levelHint: string;
  statusHint: string;
  candidates: ClassificationCandidate[];
  extractionFailed?: boolean;
  reason?: string;
};

export function buildCategoryCatalog(categories: CategoryForCatalog[]): string {
  return categories.map(c => {
    const notes: string[] = [];
    if (c.specialConditions?.minDurationMonths) notes.push(`requires min ${c.specialConditions.minDurationMonths} months duration`);
    if (c.specialConditions?.mustBeDuringProgramme) notes.push('must be during programme');
    if (c.specialConditions?.excludeIfCollegeFest) notes.push('excludes college fest events like Ragam');
    if (c.specialConditions?.minIndustriesVisited) notes.push(`requires min ${c.specialConditions.minIndustriesVisited} industries visited`);
    if (c.specialConditions?.mustBeOnApprovedCourseList) notes.push('only University-approved skilling courses');
    const noteStr = notes.length ? ` [${notes.join('; ')}]` : '';
    return `${c.srNo} | ${GROUP_NAMES[c.group]} | ${c.majorHead} | ${c.name} | max ${c.maxPoints} pts${noteStr}`;
  }).join('\n');
}

function buildSystemPrompt(catalog: string): string {
  return [
    'You are classifying a student-submitted document against the APJ Abdul Kalam Technological University (KTU) 2024-scheme Activity Points catalog.',
    '',
    'Category catalog (Sr.No | Group | Major Head | Sub-Activity | Points | eligibility notes):',
    catalog,
    '',
    'Step 1 — Determine isCertificate: true only if this is plausibly a certificate, award letter, internship completion document, ID card, scorecard, or similar official proof-of-activity document. Set it false for anything else (app screenshots, unrelated photos, memes, random text).',
    '',
    'Step 2 — If isCertificate is true, extract: title, issuingOrg, date (YYYY-MM-DD or null), startDate (YYYY-MM-DD or null, only if a duration is described), endDate (YYYY-MM-DD or null), levelHint (college|zonal|state|national|international|unknown), statusHint (participation|winner|unknown).',
    '',
    'Step 3 — If isCertificate is true, propose up to 3 candidate categories from the catalog above, ranked by confidence (0 to 1). For each, return srNo, confidence, and a one-sentence reasoning. Be strict: only match competitive/technical-event categories (e.g. Tech-Fest, Professional Society Events) to genuinely competitive or technical activities, not informational sessions, orientations, or inductions. Respect the eligibility notes — do not recommend a category the document clearly fails to meet (e.g. a 1-week internship does not satisfy a "min 3.5 months" requirement; give it low confidence instead and say why). If nothing fits well, still return your best 1-3 guesses but keep confidence low.',
    '',
    'If isCertificate is false, return candidates as an empty array and set all other fields to null.',
    '',
    'Return strict JSON only, no commentary, matching this shape: { "isCertificate": boolean, "title": string|null, "issuingOrg": string|null, "date": string|null, "startDate": string|null, "endDate": string|null, "levelHint": string, "statusHint": string, "candidates": [{ "srNo": string, "confidence": number, "reasoning": string }] }',
  ].join('\n');
}

async function callGemini(systemPrompt: string, userParts: any[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: userParts }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}

export async function detectFileType(fileUrl: string, mimeTypeHint?: string): Promise<'pdf' | 'image'> {
  if (mimeTypeHint) {
    return mimeTypeHint.toLowerCase().includes('pdf') ? 'pdf' : 'image';
  }
  try {
    const res = await fetch(fileUrl, { method: 'HEAD' });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('pdf')) return 'pdf';
    if (contentType.startsWith('image/')) return 'image';
  } catch {
    // HEAD not supported — fall through to extension check
  }
  return fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
}

export function hasUsableTextLayer(text: string): boolean {
  const cleaned = text.replace(/\s+/g, '');
  return cleaned.length >= 40;
}

export async function extractPdfText(fileUrl: string): Promise<string> {
  const res = await fetch(fileUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

function notACertificateResult(reason: string): ClassificationResult {
  return {
    isCertificate: false, title: null, issuingOrg: null, date: null, startDate: null, endDate: null,
    levelHint: 'unknown', statusHint: 'unknown', candidates: [],
    extractionFailed: true, reason,
  };
}

function isUsableResult(result: any): boolean {
  if (result.isCertificate === false) return false;
  return Boolean(result.title || result.issuingOrg || result.date);
}

export async function classifyCertificate(
  fileUrl: string,
  mimeTypeHint: string | undefined,
  categories: CategoryForCatalog[]
): Promise<ClassificationResult> {
  const systemPrompt = buildSystemPrompt(buildCategoryCatalog(categories));
  const fileType = await detectFileType(fileUrl, mimeTypeHint);
  const notCertReason = "This doesn't appear to be a certificate or proof-of-activity document. Please double-check the file, or continue manually if this is correct.";

  if (fileType === 'pdf') {
    const text = await extractPdfText(fileUrl);
    if (!hasUsableTextLayer(text)) {
      return notACertificateResult('PDF has no extractable text layer — likely a scanned document requiring manual entry');
    }
    const result = await callGemini(systemPrompt, [{ text: text.slice(0, 6000) }]);
    return isUsableResult(result) ? result : notACertificateResult(notCertReason);
  }

  const res = await fetch(fileUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const base64 = buffer.toString('base64');
  const imageMime = mimeTypeHint?.startsWith('image/') ? mimeTypeHint : 'image/jpeg';
  const result = await callGemini(systemPrompt, [{ inline_data: { mime_type: imageMime, data: base64 } }]);
  return isUsableResult(result) ? result : notACertificateResult(notCertReason);
}