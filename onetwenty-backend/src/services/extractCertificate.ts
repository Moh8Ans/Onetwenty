// src/services/extractCertificate.ts
import { PDFParse } from 'pdf-parse';

// extractCertificate.ts — replace SYSTEM_PROMPT
const SYSTEM_PROMPT =
  'You are looking at an image or document a student submitted as proof of an extracurricular activity. ' +
  'First determine isCertificate: true if this is plausibly a certificate, award letter, internship completion ' +
  'document, ID card, scorecard, or similar official proof-of-activity document. Set it false for anything else ' +
  '(screenshots of apps/games, unrelated photos, random text, memes, etc.). ' +
  'Then, only if isCertificate is true, extract: title, issuingOrg, date (YYYY-MM-DD), ' +
  'startDate (YYYY-MM-DD, only if a duration is described, else null), endDate (YYYY-MM-DD, else null), ' +
  'levelHint (college|zonal|state|national|international|unknown), statusHint (participation|winner|unknown). ' +
  'If isCertificate is false, set all other fields to null. Return strict JSON only, no commentary.';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

function isUsableExtraction(result: any): boolean {
  if (result.isCertificate === false) return false;
  const hasAnyRealField = result.title || result.issuingOrg || result.date;
  return Boolean(hasAnyRealField);
}

function notACertificateResult(): any {
  return {
    title: null, issuingOrg: null, date: null, startDate: null, endDate: null,
    levelHint: 'unknown', statusHint: 'unknown',
    extractionFailed: true,
    reason: "This doesn't appear to be a certificate or proof-of-activity document. Please double-check the file, or continue manually if this is correct.",
  };
}

async function callGemini(userParts: any[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
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

async function extractFromText(text: string) {
  const truncated = text.slice(0, 6000);
  return callGemini([{ text: truncated }]);
}

async function extractFromImage(fileUrl: string, mimeType: string) {
  const res = await fetch(fileUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const base64 = buffer.toString('base64');
  return callGemini([{ inline_data: { mime_type: mimeType, data: base64 } }]);
}

export async function extractCertificateFields(fileUrl: string, mimeTypeHint?: string) {
  const fileType = await detectFileType(fileUrl, mimeTypeHint);

  if (fileType === 'pdf') {
    const text = await extractPdfText(fileUrl);
    if (!hasUsableTextLayer(text)) {
      return {
        title: null, issuingOrg: null, date: null, startDate: null, endDate: null,
        levelHint: 'unknown', statusHint: 'unknown',
        extractionFailed: true,
        reason: 'PDF has no extractable text layer — likely a scanned document requiring manual entry',
      };
    }
    const result = await extractFromText(text);
    return isUsableExtraction(result) ? result : notACertificateResult();
  }

  const imageMime = mimeTypeHint?.startsWith('image/') ? mimeTypeHint : 'image/jpeg';
  const result = await extractFromImage(fileUrl, imageMime);
  return isUsableExtraction(result) ? result : notACertificateResult();
}