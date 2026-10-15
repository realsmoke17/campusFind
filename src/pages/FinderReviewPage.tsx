import React, { useState } from 'react';
import { LostFoundItem, Claim } from '../types';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { Badge, getStatusTone } from '../components/common/Badge';
import { TypeLabel } from '../components/common/TypeLabel';
import { Dialog } from '../components/common/Dialog';

export interface FinderReviewPageProps {
  item: LostFoundItem;
  claims: Claim[];
  onBack: () => void;
  onApproveClaim: (claimId: string | number) => void;
  onRejectClaim: (claimId: string | number) => void;
  onRequestReturnConfirm: (claimId: string | number) => void;
}

export const FinderReviewPage: React.FC<FinderReviewPageProps> = ({
  item,
  claims,
  onBack,
  onApproveClaim,
  onRejectClaim,
  onRequestReturnConfirm
}) => {
  const [claimToApprove, setClaimToApprove] = useState<Claim | null>(null);

  // Filter claims belonging to this item
  const itemClaims = claims.filter((c) => String(c.itemId) === String(item.id));

  const handleConfirmApproval = () => {
    if (claimToApprove) {
      onApproveClaim(claimToApprove.id);
      setClaimToApprove(null);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <button type="button" className="back-link" onClick={onBack}>
            ← My reports
          </button>
          <h1>Review ownership claims</h1>
          <p>Compare private details carefully before choosing one claimant.</p>
        </div>
      </div>

      <div className="review-layout">
        {/* Left Side: Item Summary */}
        <aside className="review-item">
          <div className={`review-img item-${item.icon}`} style={{ overflow: 'hidden' }}>
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Icon name={item.icon} size={48} />
            )}
          </div>
          <TypeLabel type="Found" />
          <h2>{item.title}</h2>
          <p>
            {item.location} · {item.eventDate}
          </p>
          <div style={{ marginTop: '8px' }}>
            <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>
          </div>
        </aside>

        {/* Right Side: Claims List */}
        <section className="review-claims">
          <div className="section-title">
            <div>
              <h2>Claims</h2>
              <p>
                {itemClaims.length} {itemClaims.length === 1 ? 'claim' : 'claims'} on this found item
              </p>
            </div>
          </div>

          {itemClaims.length > 0 ? (
            itemClaims.map((claim) => {
              const initials = claim.claimantName
                .split(' ')
                .map((n) => n[0])
                .join('');

              return (
                <article key={claim.id} className="evidence-card">
                  <div className="evidence-head">
                    <div className="avatar">{initials}</div>
                    <div>
                      <h3>{claim.claimantName}</h3>
                      <p>Submitted {claim.date}</p>
                    </div>
                    <Badge tone={getStatusTone(claim.status)}>{claim.status}</Badge>
                  </div>

                  <div className="evidence">
                    <span>PRIVATE OWNERSHIP EVIDENCE</span>
                    <p>{claim.evidence}</p>
                  </div>

                  {claim.status === 'Pending' && item.status === 'Open' && (
                    <div className="evidence-actions">
                      <Button
                        variant="secondary"
                        onClick={() => onRejectClaim(claim.id)}
                      >
                        Reject claim
                      </Button>
                      <Button onClick={() => setClaimToApprove(claim)}>
                        Approve and reserve
                      </Button>
                    </div>
                  )}

                  {claim.status === 'Approved' && (
                    <div className="approved-action">
                      <div>
                        <Icon name="check" />
                        <span>
                          <b>Claim approved</b>
                          <small>The item is reserved for this claimant.</small>
                        </span>
                      </div>
                      <Button onClick={() => onRequestReturnConfirm(claim.id)}>
                        Confirm physical return
                      </Button>
                    </div>
                  )}

                  {claim.status === 'Returned' && (
                    <div className="approved-action">
                      <div>
                        <Icon name="check" />
                        <span>
                          <b>Physical return completed</b>
                          <small>
                            Handed over via {claim.handoverMethod || 'Direct handover'}
                            {claim.handoverLocation ? ` (${claim.handoverLocation})` : ''}.
                          </small>
                        </span>
                      </div>
                      <Badge tone="blue">Returned</Badge>
                    </div>
                  )}

                  {claim.status === 'Rejected' && (
                    <p className="muted-action">
                      This claim was closed when another claim was approved or rejected.
                    </p>
                  )}

                  {claim.status === 'Withdrawn' && (
                    <p className="muted-action">This claim was withdrawn by the claimant.</p>
                  )}
                </article>
              );
            })
          ) : (
            <div className="empty">
              <div>
                <Icon name="shield" size={30} />
              </div>
              <h2>No claims received yet</h2>
              <p>When someone identifies this item and submits private evidence, it will appear here.</p>
            </div>
          )}
        </section>
      </div>

      {/* Defect #4 Correction: Claim Approval Confirmation Dialog */}
      {claimToApprove && (
        <Dialog
          title="Confirm claim approval"
          onClose={() => setClaimToApprove(null)}
        >
          <p className="dialog-copy" style={{ fontSize: '15px', color: 'var(--text)' }}>
            Approve this claim and reserve the item? Other pending claims will be rejected. This does not confirm
            physical return.
          </p>

          <div
            style={{
              background: 'var(--gold-soft)',
              padding: '12px',
              borderRadius: '8px',
              margin: '16px 0',
              fontSize: '12px',
              color: 'var(--warning)',
              display: 'flex',
              gap: '8px'
            }}
          >
            <Icon name="alert" size={18} />
            <span>
              Claimant: <b>{claimToApprove.claimantName}</b>
              <br />
              Approving places the item in <b>Reserved</b> status until you meet and confirm physical return.
            </span>
          </div>

          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setClaimToApprove(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmApproval}>
              Approve and reserve
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
};

