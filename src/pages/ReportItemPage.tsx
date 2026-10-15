import React, { useState, useEffect, useRef } from 'react';
import { ItemType, ItemCategory, LostFoundItem, User, ReportDraft, UpdateReportPayload } from '../types';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { ReportPreviewModal } from './ReportPreviewModal';
import { itemService } from '../services/itemService';
import { formatDateZA } from '../utils/dateUtils';
import {
  validateImageFile,
  uploadImageToCloudinary,
  isCloudinaryConfigured,
  cloudinaryCleanup
} from '../services/cloudinaryService';

export interface ReportItemPageProps {
  currentUser: User;
  itemToEdit?: LostFoundItem | null;
  onSubmitReport: (itemData: {
    title: string;
    type: 'Lost' | 'Found';
    category: ItemCategory;
    location: string;
    eventDate: string;
    rawEventDate: string;
    description: string;
    icon: string;
    imageUrl?: string;
    imagePublicId?: string;
  }) => Promise<void> | void;
  onUpdateReport?: (itemId: string, updates: UpdateReportPayload) => Promise<void> | void;
  onCancel: () => void;
  initialType?: ItemType;
}

export const ReportItemPage: React.FC<ReportItemPageProps> = ({
  currentUser,
  itemToEdit = null,
  onSubmitReport,
  onUpdateReport,
  onCancel,
  initialType = 'Found'
}) => {
  const isEditing = !!itemToEdit;
  const isCloudinaryReady = isCloudinaryConfigured();

  // Form field state
  const [type, setType] = useState<ItemType>(itemToEdit?.type || initialType);
  const [title, setTitle] = useState(itemToEdit?.title || '');
  const [category, setCategory] = useState<ItemCategory | ''>(itemToEdit?.category || '');
  const [location, setLocation] = useState(itemToEdit?.location || '');
  const [description, setDescription] = useState(itemToEdit?.description || '');
  const [eventDate, setEventDate] = useState(itemToEdit?.rawEventDate || '');

  // Photograph & Cloudinary upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(itemToEdit?.imageUrl);
  const [uploadedImage, setUploadedImage] = useState<{ secure_url: string; public_id: string } | null>(
    itemToEdit?.imageUrl && itemToEdit?.imagePublicId
      ? { secure_url: itemToEdit.imageUrl, public_id: itemToEdit.imagePublicId }
      : null
  );
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Distinct error states
  const [validationError, setValidationError] = useState<string>('');
  const [imageSelectionError, setImageSelectionError] = useState<string>('');
  const [cloudinaryError, setCloudinaryError] = useState<string>('');
  const [firestoreError, setFirestoreError] = useState<string>('');

  // Flow & modal state
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftBanner, setDraftBanner] = useState<ReportDraft | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  const todayISO = new Date().toISOString().split('T')[0];

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Check for existing recoverable draft (only in create mode)
  useEffect(() => {
    if (isEditing) return;
    const draft = itemService.getDraft();
    if (draft) {
      setDraftBanner(draft);
    }
  }, [isEditing]);

  const handleResumeDraft = (draft: ReportDraft) => {
    setType(draft.type);
    setTitle(draft.title);
    setCategory(draft.category);
    setLocation(draft.location);
    setDescription(draft.description);
    setEventDate(draft.eventDate);
    if (draft.imageUrl) {
      setImagePreview(draft.imageUrl);
      if (draft.imagePublicId) {
        setUploadedImage({ secure_url: draft.imageUrl, public_id: draft.imagePublicId });
      }
    }
    setDraftBanner(null);
    setToastMessage('Draft restored successfully.');
  };

  const handleDiscardDraft = () => {
    itemService.clearDraft();
    setDraftBanner(null);
    setToastMessage('Draft discarded.');
  };

  const handleSaveDraft = () => {
    // Only persist valid external URLs (e.g. already-uploaded Cloudinary images), never blob/base64
    const safeUrl = uploadedImage
      ? uploadedImage.secure_url
      : imagePreview && !imagePreview.startsWith('data:') && !imagePreview.startsWith('blob:')
      ? imagePreview
      : undefined;

    const draft: ReportDraft = {
      type,
      title,
      category,
      location,
      eventDate,
      description,
      imageUrl: safeUrl,
      imagePublicId: uploadedImage?.public_id,
      savedAt: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    };

    itemService.saveDraft(draft);
    setToastMessage(`Draft saved at ${draft.savedAt}. You can safely finish this later.`);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageSelectionError('');
    setCloudinaryError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format (JPEG, PNG, WebP) and size (max 5 MB)
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setImageSelectionError(validation.error || 'Invalid image file.');
      return;
    }

    // If an image was previously uploaded in this session and is now replaced, track abandoned public_id
    if (uploadedImage && uploadedImage.secure_url !== itemToEdit?.imageUrl) {
      cloudinaryCleanup.trackAbandoned(uploadedImage.public_id);
    }

    // Reset uploaded reference because a new file has been chosen
    setUploadedImage(null);
    setSelectedFile(file);

    // Create a local blob preview
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleRemoveImage = () => {
    if (uploadedImage && uploadedImage.secure_url !== itemToEdit?.imageUrl) {
      cloudinaryCleanup.trackAbandoned(uploadedImage.public_id);
    }
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedFile(null);
    setUploadedImage(null);
    setImagePreview(undefined);
    setImageSelectionError('');
    setCloudinaryError('');
  };

  const isValid =
    title.trim().length >= 2 &&
    category &&
    location.trim().length >= 2 &&
    description.trim().length >= 5 &&
    eventDate &&
    eventDate <= todayISO;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setValidationError('');
    setCloudinaryError('');
    setFirestoreError('');

    if (eventDate > todayISO) {
      setValidationError('Event date cannot be in the future. Your entered data has been preserved.');
      return;
    }

    if (!isValid) {
      setValidationError('Please complete all required fields marked with an asterisk (*). Your entered data has been preserved.');
      return;
    }

    setShowPreviewModal(true);
  };

  const deriveIcon = () => {
    return category === 'Bags'
      ? 'bag'
      : category === 'Keys'
      ? 'key'
      : category === 'Electronics'
      ? 'headphones'
      : category === 'Cards'
      ? 'card'
      : 'box';
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsPublishing(false);
    setUploadStage('idle');
  };

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    setCloudinaryError('');
    setFirestoreError('');

    let currentUploadedRef = uploadedImage;

    // Step 1: Upload image to Cloudinary if an unuploaded file is selected
    if (selectedFile && !currentUploadedRef) {
      setUploadStage('uploading');
      setUploadProgress(0);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const uploadResult = await uploadImageToCloudinary(selectedFile, {
          onProgress: (pct) => setUploadProgress(pct),
          signal: controller.signal
        });

        currentUploadedRef = {
          secure_url: uploadResult.secure_url,
          public_id: uploadResult.public_id
        };
        // Retain the uploaded reference in state so subsequent retries won't re-upload
        setUploadedImage(currentUploadedRef);
      } catch (err: any) {
        setIsPublishing(false);
        setUploadStage('idle');
        abortControllerRef.current = null;

        if (err.name === 'AbortError' || err.message === 'Upload cancelled.') {
          return;
        }

        // Display Cloudinary upload error separately, retaining all entered form data
        setCloudinaryError(err.message || 'Failed to upload photograph to Cloudinary.');
        setShowPreviewModal(false);
        return;
      } finally {
        abortControllerRef.current = null;
      }
    }

    // Step 2: Save report to Firestore with safe Cloudinary metadata
    setUploadStage('saving');
    const icon = deriveIcon();
    const formattedDate = formatDateZA(new Date(eventDate + 'T12:00:00'));

    // Safe URL check: NEVER save base64 or blob URLs to Firestore
    const safeUrl = currentUploadedRef
      ? currentUploadedRef.secure_url
      : imagePreview && !imagePreview.startsWith('data:') && !imagePreview.startsWith('blob:')
      ? imagePreview
      : undefined;

    const safePublicId = currentUploadedRef ? currentUploadedRef.public_id : undefined;

    try {
      if (isEditing && itemToEdit && onUpdateReport) {
        await onUpdateReport(itemToEdit.id, {
          title: title.trim(),
          category: category as ItemCategory,
          location: location.trim(),
          eventDate: formattedDate,
          rawEventDate: eventDate,
          description: description.trim(),
          icon,
          imageUrl: safeUrl ?? null,
          imagePublicId: safePublicId ?? null
        });
      } else {
        await onSubmitReport({
          title: title.trim(),
          type,
          category: category as ItemCategory,
          location: location.trim(),
          eventDate: formattedDate,
          rawEventDate: eventDate,
          description: description.trim(),
          icon,
          imageUrl: safeUrl,
          imagePublicId: safePublicId
        });
        itemService.clearDraft();
      }

      setShowPreviewModal(false);
    } catch (err: any) {
      // Retain the uploaded reference for retry and avoid duplicate uploads
      setFirestoreError(err.message || 'Failed to save report to Firestore.');
      setShowPreviewModal(false);
    } finally {
      setIsPublishing(false);
      setUploadStage('idle');
    }
  };

  // Explicitly submit without photograph when upload fails
  const handleSubmitWithoutPhotograph = async () => {
    // If an upload occurred, mark for cleanup
    if (uploadedImage && uploadedImage.public_id) {
      cloudinaryCleanup.trackAbandoned(uploadedImage.public_id);
    }

    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedFile(null);
    setUploadedImage(null);
    setImagePreview(undefined);
    setCloudinaryError('');
    setFirestoreError('');

    setIsPublishing(true);
    setUploadStage('saving');

    const icon = deriveIcon();
    const formattedDate = formatDateZA(new Date(eventDate + 'T12:00:00'));

    try {
      if (isEditing && itemToEdit && onUpdateReport) {
        await onUpdateReport(itemToEdit.id, {
          title: title.trim(),
          category: category as ItemCategory,
          location: location.trim(),
          eventDate: formattedDate,
          rawEventDate: eventDate,
          description: description.trim(),
          icon,
          imageUrl: null,
          imagePublicId: null
        });
      } else {
        await onSubmitReport({
          title: title.trim(),
          type,
          category: category as ItemCategory,
          location: location.trim(),
          eventDate: formattedDate,
          rawEventDate: eventDate,
          description: description.trim(),
          icon,
          imageUrl: undefined,
          imagePublicId: undefined
        });
        itemService.clearDraft();
      }

      setShowPreviewModal(false);
    } catch (err: any) {
      setFirestoreError(err.message || 'Failed to save report to Firestore.');
    } finally {
      setIsPublishing(false);
      setUploadStage('idle');
    }
  };

  const categories: ItemCategory[] = ['Electronics', 'Cards', 'Keys', 'Bags', 'Clothing', 'Other'];

  return (
    <div className="form-page">
      <div className="page-heading">
        <div>
          <button
            type="button"
            className="back-link"
            onClick={onCancel}
            disabled={isPublishing}
            style={{ marginBottom: '8px' }}
          >
            ← Back
          </button>
          <span className="eyebrow">{isEditing ? 'EDIT REPORT' : 'NEW REPORT'}</span>
          <h1>{isEditing ? 'Edit your report' : 'Report an item'}</h1>
          <p>
            {isEditing
              ? 'Update the public details of your open listing. Core recovery details stay protected.'
              : 'Share enough to help someone identify it, without revealing private details.'}
          </p>
        </div>
      </div>

      {/* Recoverable draft notice */}
      {!isEditing && draftBanner && (
        <div className="info-line" style={{ marginBottom: '20px', alignItems: 'center' }}>
          <Icon name="file" />
          <div style={{ flex: 1 }}>
            <b>Recoverable draft found:</b> You have an unsaved draft from {draftBanner.savedAt} (
            {draftBanner.title || 'Untitled'}).
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px' }}
              onClick={() => handleResumeDraft(draftBanner)}
              disabled={isPublishing}
            >
              Resume draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              style={{ minHeight: '34px', padding: '0 8px', fontSize: '12px' }}
              onClick={handleDiscardDraft}
              disabled={isPublishing}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Informational Toast Message */}
      {toastMessage && (
        <div className="safety-note" style={{ marginBottom: '20px', background: 'var(--blue-soft)', color: 'var(--blue)' }}>
          <Icon name="check" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Separate Error Display 1: Validation Error */}
      {validationError && (
        <div className="error-panel" role="alert" style={{ marginBottom: '20px' }}>
          <Icon name="alert" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Separate Error Display 2: Cloudinary Upload Error with Retry / Submit Without Photo */}
      {cloudinaryError && (
        <div
          className="error-panel"
          role="alert"
          style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
        >
          <Icon name="alert" />
          <div style={{ flex: 1 }}>
            <b>Photograph upload failed:</b> {cloudinaryError}
            <p style={{ margin: '4px 0 10px', fontSize: '13px', color: 'var(--muted)' }}>
              Your text details have been preserved. You can retry uploading the photograph or submit your report without it.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                type="button"
                variant="secondary"
                style={{ minHeight: '34px', fontSize: '12px', padding: '0 12px' }}
                disabled={isPublishing}
                onClick={() => setShowPreviewModal(true)}
              >
                Retry upload & preview
              </Button>
              <Button
                type="button"
                variant="ghost"
                style={{ minHeight: '34px', fontSize: '12px', padding: '0 12px' }}
                disabled={isPublishing}
                onClick={handleSubmitWithoutPhotograph}
              >
                Submit without photograph
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Separate Error Display 3: Firestore Database Error */}
      {firestoreError && (
        <div className="error-panel" role="alert" style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <Icon name="alert" />
          <div style={{ flex: 1 }}>
            <b>Failed to save report to database:</b> {firestoreError}
            {uploadedImage && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Your photograph was uploaded successfully and is safely held. Retrying will not re-upload the photograph.
              </p>
            )}
          </div>
        </div>
      )}

      <form className="report-form" onSubmit={handleFormSubmit} noValidate>
        {/* Step 1: Lost or Found Choice Cards */}
        <fieldset>
          <legend>What happened?</legend>
          {isEditing && (
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--muted)' }}>
              Report type ({type}) is locked after publication.
            </p>
          )}
          <div className="choice-cards">
            <label className={`${type === 'Lost' ? 'selected' : ''} ${isEditing ? 'opacity-50' : ''}`}>
              <input
                type="radio"
                name="type"
                checked={type === 'Lost'}
                onChange={() => !isEditing && setType('Lost')}
                disabled={isEditing || isPublishing}
              />
              <span className="choice-icon">
                <Icon name="search" />
              </span>
              <span>
                <b>I lost an item</b>
                <small>Ask the community to look out for it</small>
              </span>
            </label>

            <label className={`${type === 'Found' ? 'selected' : ''} ${isEditing ? 'opacity-50' : ''}`}>
              <input
                type="radio"
                name="type"
                checked={type === 'Found'}
                onChange={() => !isEditing && setType('Found')}
                disabled={isEditing || isPublishing}
              />
              <span className="choice-icon">
                <Icon name="shield" />
              </span>
              <span>
                <b>I found an item</b>
                <small>Help the owner identify and recover it</small>
              </span>
            </label>
          </div>
        </fieldset>

        {/* Step 2: Item details */}
        <div className="form-section">
          <h2>Item details</h2>
          <div className="two-col">
            <FormField
              label="Item title"
              placeholder="e.g. Black backpack"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              error={hasAttemptedSubmit && title.trim().length < 2 ? 'Item title is required (at least 2 characters).' : undefined}
            />

            <label className="field">
              <span>
                Category <b aria-hidden="true">*</b>
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                required
                disabled={isPublishing}
                aria-invalid={hasAttemptedSubmit && !category}
              >
                <option value="">Choose a category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {hasAttemptedSubmit && !category && (
                <small style={{ color: 'var(--error)' }}>Please select a category.</small>
              )}
            </label>
          </div>

          <label className="field">
            <span>
              Public description <b aria-hidden="true">*</b>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item clearly without sharing private identifying information."
              required
              disabled={isPublishing}
              aria-invalid={hasAttemptedSubmit && description.trim().length < 5}
            />
            {hasAttemptedSubmit && description.trim().length < 5 ? (
              <small style={{ color: 'var(--error)' }}>Public description is required (at least 5 characters).</small>
            ) : (
              <small>
                {type === 'Found'
                  ? 'Keep a distinctive detail private so the owner can describe it when claiming.'
                  : 'Do not include phone numbers, student numbers or other sensitive contact information.'}
              </small>
            )}
          </label>

          <div className="two-col">
            <label className="field">
              <span>
                Location <b aria-hidden="true">*</b>
              </span>
              <input
                list="locations-list"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Library entrance"
                required
                disabled={isPublishing}
                aria-invalid={hasAttemptedSubmit && location.trim().length < 2}
              />
              <datalist id="locations-list">
                <option value="Library entrance" />
                <option value="Lecture building" />
                <option value="Lecture building foyer" />
                <option value="Student centre" />
                <option value="Walkway near library" />
                <option value="Campus cafeteria" />
              </datalist>
              {hasAttemptedSubmit && location.trim().length < 2 && (
                <small style={{ color: 'var(--error)' }}>Location is required (at least 2 characters).</small>
              )}
            </label>

            <FormField
              label={type === 'Found' ? 'Date found' : 'Date lost'}
              type="date"
              max={todayISO}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              error={
                hasAttemptedSubmit && !eventDate
                  ? 'Event date is required.'
                  : eventDate > todayISO
                  ? 'Event date cannot be in the future.'
                  : undefined
              }
            />
          </div>
        </div>

        {/* Step 3: Photograph Upload Area */}
        <div className="form-section">
          <h2>
            Photograph <span>Optional</span>
          </h2>

          {/* User-facing photograph notice (outdated implementation details removed) */}
          <div className="info-line" style={{ marginBottom: '14px' }}>
            <Icon name="help" />
            <span>
              Adding a photograph helps the campus community identify items faster. Photographs are optional.
            </span>
          </div>

          {!isCloudinaryReady ? (
            /* Missing image configuration banner: does NOT block text-only reports */
            <div
              className="info-line"
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: '1px dashed var(--border)',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '14px'
              }}
            >
              <Icon name="help" size={24} />
              <div>
                <b>Photograph uploads are currently unavailable</b>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Cloudinary configuration has not been set in environment variables. You can still publish your report with text details only.
                </p>
              </div>
            </div>
          ) : imagePreview ? (
            /* Selected photograph preview with Replace and Remove controls */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                background: 'var(--bg)'
              }}
            >
              <img
                src={imagePreview}
                alt="Selected item preview"
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
              />
              <div style={{ flex: 1 }}>
                <b>Photograph preview</b>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  {uploadedImage
                    ? 'Photograph uploaded and ready.'
                    : 'Selected photograph ready to upload with report.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <label
                  className={`btn btn-secondary ${isPublishing ? 'opacity-50' : ''}`}
                  style={{ minHeight: '36px', fontSize: '12px', padding: '0 12px', cursor: isPublishing ? 'not-allowed' : 'pointer' }}
                >
                  Replace
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleImageFileChange}
                    disabled={isPublishing}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  style={{ minHeight: '36px', fontSize: '12px', padding: '0 10px', color: 'var(--error)' }}
                  onClick={handleRemoveImage}
                  disabled={isPublishing}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            /* Empty photograph upload picker */
            <label className={`upload ${isPublishing ? 'opacity-50' : ''}`} style={{ cursor: isPublishing ? 'not-allowed' : 'pointer' }}>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleImageFileChange}
                disabled={isPublishing}
              />
              <span className="upload-icon">
                <Icon name="image" />
              </span>
              <b>Add a photograph</b>
              <small>JPEG, PNG or WebP up to 5 MB · Optional</small>
            </label>
          )}

          {/* Photograph selection / validation error */}
          {imageSelectionError && (
            <div className="error-panel" style={{ marginTop: '12px' }}>
              <Icon name="alert" />
              <span>{imageSelectionError}</span>
            </div>
          )}

          {category === 'Cards' && (
            <div className="safety-note" style={{ marginTop: '14px' }}>
              <Icon name="shield" />
              <span>
                <b>Protect personal details:</b> Cover names, student numbers and barcodes before adding a photograph.
              </span>
            </div>
          )}
        </div>

        {/* Validation Error Banner at bottom */}
        {hasAttemptedSubmit && !isValid && (
          <div className="error-panel" role="alert">
            <Icon name="alert" />
            <span>
              <b>Complete the required fields.</b> Your entered data has been preserved.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="form-actions">
          {!isEditing ? (
            <Button type="button" variant="ghost" onClick={handleSaveDraft} disabled={isPublishing}>
              Save and finish later
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isPublishing}>
              Cancel edit
            </Button>
          )}
          <Button type="submit" disabled={isPublishing}>
            {isPublishing
              ? 'Processing...'
              : isEditing
              ? 'Preview and save changes'
              : 'Preview and publish report'}
          </Button>
        </div>
      </form>

      {/* Report Preview Modal */}
      {showPreviewModal && (
        <ReportPreviewModal
          item={{
            title: title.trim(),
            type,
            category: category as ItemCategory,
            location: location.trim(),
            eventDate: formatDateZA(new Date(eventDate + 'T12:00:00')),
            rawEventDate: eventDate,
            reportedDate: 'Today',
            status: 'Open',
            visibility: 'visible',
            description: description.trim(),
            ownerUid: currentUser.uid,
            ownerName: currentUser.displayName,
            icon: deriveIcon(),
            imageUrl: imagePreview
          }}
          isPublishing={isPublishing}
          uploadProgress={uploadProgress}
          uploadStage={uploadStage}
          onCancelUpload={handleCancelUpload}
          onClose={() => !isPublishing && setShowPreviewModal(false)}
          onConfirmPublish={handleConfirmPublish}
        />
      )}
    </div>
  );
};
