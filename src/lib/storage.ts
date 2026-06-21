// ============================================================
// Supabase Storage Adapter — Serverless File Upload
// بديل MinIO/S3 — يعمل من السودان بدون حظر
// ============================================================

import { createClient } from '@supabase/supabase-js';

let supabaseAdmin: ReturnType<typeof createClient> | null = null;
let supabasePublic: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_SERVICE_KEY are required');
  }

  supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return supabaseAdmin;
}

function getSupabasePublic() {
  if (supabasePublic) return supabasePublic;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }

  supabasePublic = createClient(url, anonKey);
  return supabasePublic;
}

// ===========================
// حدود رفع الملفات / File upload limits
// ===========================
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_MIME_TYPES: Record<string, { ext: string; maxSize: number; type: 'image' | 'video' }> = {
  'image/jpeg': { ext: 'jpg', maxSize: MAX_IMAGE_SIZE, type: 'image' },
  'image/jpg': { ext: 'jpg', maxSize: MAX_IMAGE_SIZE, type: 'image' },
  'image/png': { ext: 'png', maxSize: MAX_IMAGE_SIZE, type: 'image' },
  'image/webp': { ext: 'webp', maxSize: MAX_IMAGE_SIZE, type: 'image' },
  'image/gif': { ext: 'gif', maxSize: MAX_IMAGE_SIZE, type: 'image' },
  'video/mp4': { ext: 'mp4', maxSize: MAX_VIDEO_SIZE, type: 'video' },
  'video/webm': { ext: 'webm', maxSize: MAX_VIDEO_SIZE, type: 'video' },
  'video/quicktime': { ext: 'mov', maxSize: MAX_VIDEO_SIZE, type: 'video' },
};

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'video/mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
};

class UploadValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return true;
  if (buffer.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false;
  }
  return true;
}

function getFilePath(prefix: string, filename: string, mimeType: string): string {
  const config = ALLOWED_MIME_TYPES[mimeType];
  const ext = config?.ext || filename.split('.').pop() || 'bin';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 12)}.${ext}`;
  const datePath = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  return `${prefix}/${datePath}/${uniqueName}`;
}

// Bucket name — default to 'fastfood-media'
const BUCKET = 'fastfood-media';

export const storageService = {
  async upload(
    prefix: string,
    filename: string,
    buffer: Buffer,
    contentType: string
  ): Promise<{ key: string; url: string; size: number; contentType: string }> {
    // 1) Validate MIME type
    const config = ALLOWED_MIME_TYPES[contentType];
    if (!config) {
      throw new UploadValidationError(`نوع الملف غير مسموح: ${contentType}`, 'INVALID_MIME_TYPE');
    }

    // 2) Validate size
    if (buffer.length > config.maxSize) {
      const maxMB = Math.floor(config.maxSize / (1024 * 1024));
      throw new UploadValidationError(`حجم الملف يتجاوز الحد الأقصى (${maxMB}MB)`, 'FILE_TOO_LARGE');
    }

    // 3) Validate magic bytes
    if (!validateMagicBytes(buffer, contentType)) {
      throw new UploadValidationError('محتوى الملف لا يطابق نوعه المعلن', 'MAGIC_BYTES_MISMATCH');
    }

    // 4) Safe filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_').substring(0, 100);
    if (safeFilename.includes('..') || safeFilename.includes('/') || safeFilename.includes('\\')) {
      throw new UploadValidationError('اسم الملف غير صالح', 'INVALID_FILENAME');
    }

    // 5) Upload to Supabase Storage
    const client = getSupabaseAdmin();
    const path = getFilePath(prefix, safeFilename, contentType);

    const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      cacheControl: config.type === 'image' || config.type === 'video'
        ? 'public, max-age=31536000, immutable'
        : 'private, max-age=0',
      upsert: false,
    });

    if (error) {
      throw new UploadValidationError(`فشل رفع الملف: ${error.message}`, 'UPLOAD_FAILED');
    }

    // Get public URL
    const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(path);

    return {
      key: path,
      url: urlData.publicUrl,
      size: buffer.length,
      contentType,
    };
  },

  async delete(path: string): Promise<void> {
    if (path.includes('..') || path.startsWith('/')) {
      throw new Error('Invalid path');
    }
    const client = getSupabaseAdmin();
    const { error } = await client.storage.from(BUCKET).remove([path]);
    if (error) {
      console.warn('[Storage] Delete failed:', error.message);
    }
  },

  async getPublicUrl(path: string): Promise<string> {
    if (path.includes('..') || path.startsWith('/')) {
      throw new Error('Invalid path');
    }
    const client = getSupabasePublic();
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  validateFile(buffer: Buffer, contentType: string): { valid: boolean; error?: string; code?: string } {
    const config = ALLOWED_MIME_TYPES[contentType];
    if (!config) {
      return { valid: false, error: `نوع ملف غير مسموح: ${contentType}`, code: 'INVALID_MIME_TYPE' };
    }
    if (buffer.length > config.maxSize) {
      const maxMB = Math.floor(config.maxSize / (1024 * 1024));
      return { valid: false, error: `حجم الملف يتجاوز ${maxMB}MB`, code: 'FILE_TOO_LARGE' };
    }
    if (!validateMagicBytes(buffer, contentType)) {
      return { valid: false, error: 'محتوى الملف لا يطابق نوعه', code: 'MAGIC_BYTES_MISMATCH' };
    }
    return { valid: true };
  },

  getAllowedTypes(): { mime: string; maxSize: number; type: string }[] {
    return Object.entries(ALLOWED_MIME_TYPES).map(([mime, cfg]) => ({
      mime,
      maxSize: cfg.maxSize,
      type: cfg.type,
    }));
  },

  /**
   * إنشاء bucket إذا لم يكن موجوداً — شغّله مرة واحدة فقط
   * Create bucket if not exists — run once
   */
  async ensureBucket(): Promise<void> {
    const client = getSupabaseAdmin();
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.find(b => b.name === BUCKET);
    if (!exists) {
      await client.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 100 * 1024 * 1024, // 100MB
      });
      console.log(`[Storage] Created bucket: ${BUCKET}`);
    }
  },
};

export { UploadValidationError };
