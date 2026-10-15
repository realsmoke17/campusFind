import React from 'react';
import { LostFoundItem } from '../types';
import { Dialog } from '../components/common/Dialog';
import { Button } from '../components/common/Button';
import { TypeLabel } from '../components/common/TypeLabel';
import { Badge } from '../components/common/Badge';

export interface ReportPreviewModalProps {
  item: Omit<LostFoundItem, 'id' | 'claims'>;
  onClose: () => void;
  onConfirmPublish: () => void;
  isPublishing: boolean;
  uploadProgress?: number | null;
  uploadStage?: 'idle' | 'uploading' | 'saving';
  onCancelUpload?: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  item,
  onClose,
  onConfirmPublish,
  isPublishing,
  uploadProgress = null,
  uploadStage = 'idle',
  onCancelUpload
}) => {
  return (
    <Dialog title="Preview your report before publishing" onClose={isPublishing ? () => {} : onClose}>
      <p className="dialog-copy" style={{ marginBottom: '16px' }}>
        Check how your listing will appear to the campus community. Make sure no sensitive personal details
        (such as phone numbers, student numbers or card numbers) are visible.
      </p>

      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', background: '#fff' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <TypeLabel type={item.type} />
          <Badge tone="success">Open</Badge>
        </div>

        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--navy)' }}>{item.title}</h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 16px 0' }}>
          {item.description}
        </p>

        <dl className="meta" style={{ margin: 0 }}>
          <div>
            <dt>Category</dt>
            <dd>{item.category}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{item.location}</dd>
          </div>
          <div>
            <dt>{item.type === 'Found' ? 'Date found' : 'Date lost'}</dt>
            <dd>{item.eventDate}</dd>
          </div>
          <div>
            <dt>Reported by</dt>
            <dd>{item.ownerName}</dd>
          </div>
        </dl>

        {item.imageUrl && (
          <div style={{ marginTop: '14px' }}>
            <img
              src={item.imageUrl}
              alt="Photograph preview"
              style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '8px', objectFit: 'cover' }}
            />
          </div>
        )}
      </div>

      {/* Upload progress & stage indicator */}
      {isPublishing && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: 'var(--bg)',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            <span>
              {uploadStage === 'uploading'
                ? 'Uploading photograph to Cloudinary...'
                : uploadStage === 'saving'
                ? 'Saving report to Firestore database...'
                : 'Processing submission...'}
            </span>
            {uploadStage === 'uploading' && uploadProgress !== null && (
              <span>{uploadProgress}%</span>
            )}
          </div>

          {uploadStage === 'uploading' && uploadProgress !== null && (
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'var(--border)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'var(--blue)',
                  transition: 'width 0.2s ease'
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="dialog-actions">
        {uploadStage === 'uploading' && onCancelUpload ? (
          <Button type="button" variant="ghost" onClick={onCancelUpload} style={{ color: 'var(--error)' }}>
            Cancel upload
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose} disabled={isPublishing}>
            Back to edit
          </Button>
        )}

        <Button onClick={onConfirmPublish} disabled={isPublishing}>
          {isPublishing
            ? uploadStage === 'uploading'
              ? `Uploading photograph (${uploadProgress ?? 0}%)...`
              : 'Saving report...'
            : 'Publish report now'}
        </Button>
      </div>
    </Dialog>
  );
};
