// src/services/supabaseStorage.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const BUCKET = 'certificates';
let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are not configured');
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

export async function uploadCertificate(userId: string, buffer: Buffer, originalName: string, mimeType: string) {
  const ext = originalName.split('.').pop() || 'bin';
  const path = `${userId}/${randomUUID()}.${ext}`;

  const { error } = await getClient().storage.from(BUCKET).upload(path, buffer, { contentType: mimeType });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return path;
}

export async function getSignedUrl(path: string, expiresInSeconds = 3600) {
  const { data, error } = await getClient().storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Signing failed: ${error.message}`);
  return data.signedUrl;
}