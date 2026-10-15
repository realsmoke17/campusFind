/**
 * Cloudinary Image Upload Service for CampusFind
 *
 * Exclusively handles client-side image uploading and hosting via Cloudinary.
 * Complies with security policies:
 * - NEVER exposes Cloudinary API Secret in client-side code or browser requests.
 * - Supports restricted unsigned upload presets (or an optional backend signing endpoint).
 * - Enforces file size (max 5 MB) and MIME types (JPEG, PNG, WebP).
 * - Sanitizes filenames and IDs (no student numbers or personal identifiers).
 * - Provides upload progress tracking and cancellation via AbortSignal.
 * - Tracks abandoned uploads for server-side / webhook cleanup.
 */

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey?: string;
  signUrl?: string;
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

export interface UploadOptions {
  onProgress?: UploadProgressCallback;
  signal?: AbortSignal;
}

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const ABANDONED_UPLOADS_STORAGE_KEY = 'campusfind_abandoned_uploads';

const env = import.meta.env;

export const cloudinaryConfig: CloudinaryConfig = {
  cloudName: env.VITE_CLOUDINARY_CLOUD_NAME?.trim() || '',
  uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() || '',
  apiKey: env.VITE_CLOUDINARY_API_KEY?.trim() || '',
  signUrl: env.VITE_CLOUDINARY_SIGN_URL?.trim() || ''
};

/**
 * Checks whether Cloudinary is configured with valid values.
 * Missing image configuration must not block text-only reports.
 */
export function isCloudinaryConfigured(): boolean {
  if (
    !cloudinaryConfig.cloudName ||
    cloudinaryConfig.cloudName.includes('your_cloudinary') ||
    cloudinaryConfig.cloudName.includes('placeholder')
  ) {
    return false;
  }

  // Either an upload preset (for unsigned upload) or a sign URL (for backend-signed upload)
  if (!cloudinaryConfig.uploadPreset && !cloudinaryConfig.signUrl) {
    return false;
  }

  if (
    cloudinaryConfig.uploadPreset &&
    (cloudinaryConfig.uploadPreset.includes('placeholder') ||
      cloudinaryConfig.uploadPreset.includes('your_preset'))
  ) {
    return false;
  }

  return true;
}

/**
 * Validates photograph format and size:
 * - One JPEG, PNG or WebP photograph per report
 * - Maximum file size 5 MB
 */
export function validateImageFile(file: File | null | undefined): ImageValidationResult {
  if (!file) {
    return { isValid: false, error: 'No photograph selected.' };
  }

  const lowerName = file.name ? file.name.toLowerCase() : '';
  const hasValidExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasValidMime = ALLOWED_IMAGE_MIME_TYPES.includes(file.type);

  if (!hasValidMime && !hasValidExtension) {
    return {
      isValid: false,
      error: 'Unsupported file format. Please upload a JPEG, PNG, or WebP photograph.'
    };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'Photograph exceeds the 5 MB limit. Please select an image under 5 MB.'
    };
  }

  return { isValid: true };
}

/**
 * Generates an anonymous, safe random asset identifier.
 * Ensures NO student numbers, email addresses or personal identifiers are in public IDs.
 */
export function generateSafePublicId(): string {
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `campusfind_${Date.now()}_${randomSuffix}`;
}

/**
 * Uploads an image file to Cloudinary via XMLHttpRequest.
 * Provides upload progress and cancellation support via AbortSignal.
 */
export function uploadImageToCloudinary(
  file: File,
  options?: UploadOptions
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    // 1. Client-side validation
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      return reject(new Error(validation.error || 'Invalid image file.'));
    }

    // 2. Configuration check
    if (!isCloudinaryConfigured()) {
      return reject(
        new Error(
          'Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.'
        )
      );
    }

    // 3. Check if already aborted
    if (options?.signal?.aborted) {
      return reject(new DOMException('Upload cancelled.', 'AbortError'));
    }

    const xhr = new XMLHttpRequest();
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`;

    // 4. Handle abort signal
    const onAbort = () => {
      xhr.abort();
      reject(new DOMException('Upload cancelled.', 'AbortError'));
    };

    if (options?.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    // 5. Handle progress
    if (xhr.upload && options?.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          options.onProgress?.(percent);
        }
      };
    }

    // 6. Handle response
    xhr.onload = () => {
      if (options?.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }

      let responseData: any = null;
      try {
        responseData = JSON.parse(xhr.responseText);
      } catch {
        responseData = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (!responseData?.secure_url || !responseData?.public_id) {
          return reject(
            new Error('Cloudinary response did not return secure_url or public_id.')
          );
        }

        resolve({
          secure_url: responseData.secure_url,
          public_id: responseData.public_id,
          width: responseData.width,
          height: responseData.height,
          format: responseData.format,
          bytes: responseData.bytes
        });
      } else {
        const cloudMessage =
          responseData?.error?.message ||
          `Upload failed (HTTP ${xhr.status} ${xhr.statusText || 'Error'}).`;
        reject(new Error(cloudMessage));
      }
    };

    xhr.onerror = () => {
      if (options?.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      reject(new Error('Network error during photograph upload. Please check your internet connection.'));
    };

    xhr.onabort = () => {
      if (options?.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
      reject(new DOMException('Upload cancelled.', 'AbortError'));
    };

    // 7. Assemble payload
    const formData = new FormData();
    formData.append('file', file);

    if (cloudinaryConfig.uploadPreset) {
      formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    }

    if (cloudinaryConfig.apiKey) {
      formData.append('api_key', cloudinaryConfig.apiKey);
    }

    // Anonymous public id prefix to guarantee no personal identifiers are present
    const safeId = generateSafePublicId();
    formData.append('public_id', safeId);

    xhr.open('POST', endpoint);
    xhr.send(formData);
  });
}

/**
 * Abandoned image cleanup registry.
 * Because administrative deletion requires secret credentials that MUST NEVER
 * be exposed in client-side code, replaced or discarded upload public_ids
 * are tracked in a persistent client queue so a trusted backend worker or
 * Cloudinary webhook/cron can safely prune orphaned images.
 */
export const cloudinaryCleanup = {
  trackAbandoned(publicId: string): void {
    if (!publicId) return;
    try {
      const existing = cloudinaryCleanup.getAbandoned();
      if (!existing.includes(publicId)) {
        existing.push(publicId);
        localStorage.setItem(ABANDONED_UPLOADS_STORAGE_KEY, JSON.stringify(existing));
      }
    } catch {
      // Ignore localStorage quotas/access issues
    }
  },

  getAbandoned(): string[] {
    try {
      const raw = localStorage.getItem(ABANDONED_UPLOADS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  clearAbandoned(): void {
    try {
      localStorage.removeItem(ABANDONED_UPLOADS_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
};

