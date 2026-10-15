import React, { useState } from 'react';
import { LostFoundItem, User, Claim } from '../types';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { Badge, getStatusTone } from '../components/common/Badge';
import { TypeLabel } from '../components/common/TypeLabel';
import { Dialog } from '../components/common/Dialog';
import { claimService } from '../services/claimService';

export interface ItemDetailPageProps {
  item: LostFoundItem;
  currentUser: User;
  claims: Claim[];
  onBack: () => void;
  onClaimClick: () => void;
  onReviewClick: () => void;
  onCreateFoundReport: () => void;
  onEditReport?: (item: LostFoundItem) => void;
  onCloseReport?: (itemId: string) => Promise<void> | void;
  onFlagItem?: (reason: string) => void;
}

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  item,
  currentUser,
  claims,
  onBack,
  onClaimClick,
  onReviewClick,
  onCreateFoundReport,
  onEditReport,
  onCloseReport,
  onFlagItem
}) => {
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('Personal details visible');
  const [flagSuccess, setFlagSuccess] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const isOwner = item.ownerUid === currentUser.uid;
  const claimEligibility = claimService.canUserClaimItem(item, currentUser, claims);

  // Check if current user has an active claim
  const userExistingClaim = claims.find(
    (c) => String(c.itemId) === String(item.id) && c.claimantUid === currentUser.uid
  );

  const livePendingClaims = claimService.getPendingClaimCountForItem(item.id, claims);

  const handleFlagSubmit = () => {
    if (onFlagItem) {
      onFlagItem(flagReason);
    }
    setFlagSuccess(true);
    setTimeout(() => {
      setShowFlagModal(false);
      setFlagSuccess(false);
    }, 1500);
  };

  const handleConfirmClose = async () => {
    if (!onCloseReport) return;
    setIsClosing(true);
    try {
      await onCloseReport(item.id);
      setShowCloseModal(false);
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="detail-page">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back to browse
      </button>

      <div className="detail-grid">
        {/* Visual / Image area */}
        <div className={`detail-image item-${item.icon}`} style={{ overflow: 'hidden' }}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: 'var(--radius)' }}
            />
          ) : (
            <>
              <Icon name={item.icon} size={92} />
              {item.icon === 'image' && <span>No photograph added</span>}
            </>
          )}
        </div>

        {/* Details Card */}
        <section className="detail-card">
          <div className="detail-labels">
            <TypeLabel type={item.type} />
            <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
          </div>

          <h1>{item.title}</h1>
          <p className="detail-description">{item.description}</p>

          <dl className="detail-meta">
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
              <dt>Date reported</dt>
              <dd>{item.reportedDate}</dd>
            </div>
          </dl>

          {/* Contextual Action Area */}
          <div className="claim-callout">
            {isOwner ? (
              <>
                <h2>You reported this item</h2>
                <p>Manage your report and review any ownership claims.</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {item.type === 'Found' && item.status !== 'Returned' && item.status !== 'Closed' && (
                    <Button onClick={onReviewClick}>
                      Review claims {livePendingClaims > 0 ? `(${livePendingClaims} pending)` : ''}
                    </Button>
                  )}
                  {item.status === 'Open' && onEditReport && (
                    <Button variant="secondary" onClick={() => onEditReport(item)}>
                      Edit report
                    </Button>
                  )}
                  {item.status === 'Open' && onCloseReport && (
                    <Button variant="ghost" onClick={() => setShowCloseModal(true)}>
                      Close report
                    </Button>
                  )}
                </div>
              </>
            ) : item.type === 'Lost' ? (
              <>
                <h2>Have you found this item?</h2>
                <p>
                  Lost reports do not accept ownership claims. Create a found report so the owner can
                  identify it.
                </p>
                <Button variant="secondary" onClick={onCreateFoundReport}>
                  Create a found report
                </Button>
              </>
            ) : userExistingClaim ? (
              <>
                <h2>Your ownership claim is active</h2>
                <p>
                  Status: <b>{userExistingClaim.status}</b>. Submitted on {userExistingClaim.date}. Only you
                  and the finder can view your evidence.
                </p>
                <Badge tone={getStatusTone(userExistingClaim.status)}>
                  Claim {userExistingClaim.status}
                </Badge>
              </>
            ) : item.status === 'Open' ? (
              <>
                <h2>This might be yours</h2>
                <p>Provide a detail that is not visible in this report. Only you and the finder can read it.</p>
                <Button
                  disabled={!claimEligibility.canClaim}
                  onClick={onClaimClick}
                  title={claimEligibility.reason}
                >
                  This might be mine
                </Button>
                {!claimEligibility.canClaim && claimEligibility.reason && (
                  <small style={{ display: 'block', marginTop: '8px', color: 'var(--muted)' }}>
                    {claimEligibility.reason}
                  </small>
                )}
              </>
            ) : (
              <>
                <h2>New claims are unavailable</h2>
                <p>This report is {item.status.toLowerCase()} and cannot accept another claim.</p>
                <Button disabled>Claim unavailable</Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="report-link"
            onClick={() => setShowFlagModal(true)}
          >
            Report inappropriate content
          </button>
        </section>
      </div>

      {/* Flag / Inappropriate Content Modal */}
      {showFlagModal && (
        <Dialog title="Report inappropriate listing" onClose={() => setShowFlagModal(false)}>
          {flagSuccess ? (
            <div className="safety-note" style={{ background: 'var(--green-soft)', color: 'var(--success)' }}>
              <Icon name="check" />
              <span>Thank you. This report has been submitted to campus administrators for review.</span>
            </div>
          ) : (
            <>
              <p className="dialog-copy">
                Help maintain community safety on campus. Select a reason why this listing violates campus guidelines:
              </p>

              <label className="field" style={{ marginTop: '14px' }}>
                <span>Reason for flag</span>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                >
                  <option value="Personal details visible">Personal details visible (student ID, phone number, card number)</option>
                  <option value="Inappropriate or offensive content">Inappropriate or offensive content</option>
                  <option value="Duplicate report">Duplicate report</option>
                  <option value="Suspected fraud or spam">Suspected fraud or spam</option>
                </select>
              </label>

              <div className="dialog-actions">
                <Button variant="ghost" onClick={() => setShowFlagModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleFlagSubmit}>
                  Submit report
                </Button>
              </div>
            </>
          )}
        </Dialog>
      )}

      {/* Close Report Confirmation Modal */}
      {showCloseModal && (
        <Dialog title="Close report" onClose={() => setShowCloseModal(false)}>
          <p className="dialog-copy">
            Are you sure you want to close this report? Closing a report removes it from active recovery. It does
            not record a physical return.
          </p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setShowCloseModal(false)} disabled={isClosing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmClose} disabled={isClosing}>
              {isClosing ? 'Closing report...' : 'Close report'}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};
