import React, { useState } from 'react';
import { Claim, LostFoundItem, User } from '../types';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { Badge, getStatusTone } from '../components/common/Badge';
import { Dialog } from '../components/common/Dialog';

export interface MyClaimsPageProps {
  claims: Claim[];
  items: LostFoundItem[];
  currentUser: User;
  onWithdrawClaim: (claimId: string | number) => void;
}

export const MyClaimsPage: React.FC<MyClaimsPageProps> = ({
  claims,
  items,
  currentUser,
  onWithdrawClaim
}) => {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | number | null>(null);

  // Filter only claims submitted by currentUser
  const myClaims = claims.filter((c) => c.claimantUid === currentUser.uid);

  const getStepProgress = (status: Claim['status']) => {
    switch (status) {
      case 'Pending':
        return 2;
      case 'Approved':
        return 3;
      case 'Returned':
        return 4;
      default:
        return 1;
    }
  };

  const renderStepper = (status: Claim['status']) => {
    if (status === 'Rejected' || status === 'Withdrawn') {
      return (
        <div className="claim-alt">
          <Icon name="alert" />
          <span>This claim was {status.toLowerCase()} and is no longer active.</span>
        </div>
      );
    }

    const currentStep = getStepProgress(status);
    const steps = ['Claim submitted', 'Finder review', 'Claim approved', 'Return confirmed'];

    return (
      <div className="progress">
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum <= currentStep;
          return (
            <div key={label} className={isDone ? 'done' : ''}>
              <span>{isDone ? <Icon name="check" size={14} /> : stepNum}</span>
              <small>{label}</small>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PRIVATE CLAIMS</span>
          <h1>My claims</h1>
          <p>Track only the ownership claims you have submitted.</p>
        </div>
      </div>

      {myClaims.length > 0 ? (
        <div className="claims-list">
          {myClaims.map((claim) => {
            const item = items.find((i) => String(i.id) === String(claim.itemId));
            const icon = item?.icon || 'box';

            return (
              <article key={claim.id} className="claim-card">
                <div className="claim-card-head">
                  <div className={`record-thumb item-${icon}`}>
                    <Icon name={icon} />
                  </div>
                  <div>
                    <h2>{claim.itemTitle}</h2>
                    <p>Submitted {claim.date}</p>
                  </div>
                  <Badge tone={getStatusTone(claim.status)}>{claim.status}</Badge>
                </div>

                {renderStepper(claim.status)}

                {claim.status === 'Approved' && (
                  <div className="approved-note">
                    <Icon name="alert" />
                    <span>
                      <b>Your claim was approved.</b> The item is reserved for you. Arrange safe handover at
                      a public campus location.
                    </span>
                  </div>
                )}

                {claim.status === 'Returned' && (
                  <div className="safety-note" style={{ background: 'var(--green-soft)', color: 'var(--success)' }}>
                    <Icon name="check" />
                    <span>
                      <b>Physical return confirmed.</b> Handover completed via{' '}
                      {claim.handoverMethod || 'Direct handover'}
                      {claim.handoverLocation ? ` at ${claim.handoverLocation}` : ''}.
                    </span>
                  </div>
                )}

                <div className="claim-actions">
                  <Button variant="secondary" onClick={() => setSelectedClaim(claim)}>
                    View claim
                  </Button>
                  {claim.status === 'Pending' && (
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmWithdrawId(claim.id)}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <div>
            <Icon name="claim" size={30} />
          </div>
          <h2>No ownership claims submitted</h2>
          <p>You have not submitted an ownership claim on any found item yet.</p>
        </div>
      )}

      {/* View Claim Details Modal */}
      {selectedClaim && (
        <Dialog title="Your ownership claim" onClose={() => setSelectedClaim(null)}>
          <div className="claim-summary">
            <span>
              <Icon name="file" />
            </span>
            <div>
              <b>{selectedClaim.itemTitle}</b>
              <small>Submitted {selectedClaim.date}</small>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Badge tone={getStatusTone(selectedClaim.status)}>{selectedClaim.status}</Badge>
            </div>
          </div>

          <div className="privacy-box">
            <Icon name="shield" />
            <p>
              <b>Private ownership evidence</b>
              <br />
              This evidence is visible only to you and the person who found the item.
            </p>
          </div>

          <div className="evidence" style={{ margin: '14px 0' }}>
            <span>YOUR SUBMITTED EVIDENCE</span>
            <p>{selectedClaim.evidence}</p>
          </div>

          <div className="dialog-actions">
            <Button onClick={() => setSelectedClaim(null)}>Close</Button>
          </div>
        </Dialog>
      )}

      {/* Withdraw Confirmation Modal */}
      {confirmWithdrawId !== null && (
        <Dialog title="Withdraw ownership claim" onClose={() => setConfirmWithdrawId(null)}>
          <p className="dialog-copy">
            Are you sure you want to withdraw this ownership claim? This action will mark your claim as withdrawn
            and notify the finder.
          </p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setConfirmWithdrawId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onWithdrawClaim(confirmWithdrawId);
                setConfirmWithdrawId(null);
              }}
            >
              Withdraw claim
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
};

