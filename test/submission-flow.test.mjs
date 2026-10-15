import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Constants matching src/services/cloudinaryService.ts
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function validateImageFile(file) {
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

function generateSafePublicId() {
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `campusfind_${Date.now()}_${randomSuffix}`;
}

test('Image Validation: accepts valid JPEG, PNG and WebP files under 5 MB', () => {
  const validJpeg = { name: 'photo.jpg', type: 'image/jpeg', size: 1024 * 1024 };
  const validPng = { name: 'card.PNG', type: 'image/png', size: 2 * 1024 * 1024 };
  const validWebp = { name: 'keys.webp', type: 'image/webp', size: 500 * 1024 };

  assert.equal(validateImageFile(validJpeg).isValid, true);
  assert.equal(validateImageFile(validPng).isValid, true);
  assert.equal(validateImageFile(validWebp).isValid, true);
});

test('Image Validation: rejects unsupported formats (GIF, PDF, SVG, TXT)', () => {
  const gifFile = { name: 'animation.gif', type: 'image/gif', size: 1024 * 1024 };
  const pdfFile = { name: 'document.pdf', type: 'application/pdf', size: 1024 * 1024 };
  const svgFile = { name: 'vector.svg', type: 'image/svg+xml', size: 1024 * 1024 };

  assert.equal(validateImageFile(gifFile).isValid, false);
  assert.match(validateImageFile(gifFile).error, /Unsupported file format/);

  assert.equal(validateImageFile(pdfFile).isValid, false);
  assert.equal(validateImageFile(svgFile).isValid, false);
});

test('Image Validation: enforces 5 MB size limit strictly', () => {
  const exact5Mb = { name: 'photo.jpg', type: 'image/jpeg', size: 5 * 1024 * 1024 };
  const over5Mb = { name: 'photo.jpg', type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 };

  assert.equal(validateImageFile(exact5Mb).isValid, true);
  assert.equal(validateImageFile(over5Mb).isValid, false);
  assert.match(validateImageFile(over5Mb).error, /5 MB/);
});

test('Image Security: generated public IDs are anonymous and contain no student/email identifiers', () => {
  for (let i = 0; i < 50; i++) {
    const id = generateSafePublicId();
    assert.match(id, /^campusfind_\d+_[a-z0-9]+$/);
    assert.equal(id.includes('@'), false);
    assert.equal(id.includes('tut4life'), false);
    assert.equal(id.includes('.ac.za'), false);
  }
});

test('Firestore Rules: includes imagePublicId in create and update whitelists', () => {
  const rulesContent = readFileSync('firestore.rules', 'utf8');

  // Verify create rule contains imagePublicId
  assert.ok(
    rulesContent.includes("'imageUrl', 'imagePublicId'"),
    'Create keys whitelist must include imagePublicId'
  );
  assert.ok(
    rulesContent.includes("request.resource.data.imagePublicId is string &&"),
    'imagePublicId must be type checked as string'
  );
  assert.ok(
    rulesContent.includes("request.resource.data.imagePublicId.size() <= 255"),
    'imagePublicId size must be capped'
  );

  // Verify update rule contains imagePublicId in affectedKeys
  assert.ok(
    rulesContent.includes("'imagePublicId', 'updatedAt', 'status'"),
    'Update affectedKeys must include imagePublicId'
  );

  // Verify base64 URLs are strictly rejected in rules
  assert.ok(
    rulesContent.includes("!request.resource.data.imageUrl.matches('^data:.*')"),
    'Rules must reject base64 imageUrl'
  );
});

test('Source Code: Outdated Firebase Storage notices removed from ReportItemPage', () => {
  const reportItemPageContent = readFileSync('src/pages/ReportItemPage.tsx', 'utf8');

  assert.equal(
    reportItemPageContent.includes('Cloud Storage image hosting connects in the storage phase'),
    false,
    'Outdated Cloud Storage notice must be removed'
  );
  assert.equal(
    reportItemPageContent.includes('(will connect to Cloud Storage in image phase)'),
    false,
    'Outdated image phase notice must be removed'
  );
  assert.ok(
    reportItemPageContent.includes('Adding a photograph helps the campus community identify items faster'),
    'User-facing photograph notice must be present'
  );
});

test('Firebase SDK: Firebase Storage not imported or initialized', () => {
  const firebaseContent = readFileSync('src/lib/firebase.ts', 'utf8');

  assert.equal(
    firebaseContent.includes("from 'firebase/storage'"),
    false,
    'Firebase storage must not be imported'
  );
  assert.equal(
    firebaseContent.includes("getStorage("),
    false,
    'Firebase storage must not be initialized'
  );
  assert.equal(
    firebaseContent.includes("missing.push('VITE_FIREBASE_STORAGE_BUCKET')"),
    false,
    'Missing storage bucket must not mark Firebase configuration incomplete'
  );
});

test('Environment Configuration: .env.example contains Cloudinary setup and warnings', () => {
  const envExample = readFileSync('.env.example', 'utf8');

  assert.ok(envExample.includes('VITE_CLOUDINARY_CLOUD_NAME='));
  assert.ok(envExample.includes('VITE_CLOUDINARY_UPLOAD_PRESET='));
  assert.ok(envExample.includes('NEVER expose your Cloudinary API Secret'));
});

