import React, { useState } from 'react';
import { LostFoundItem, Claim, User } from '../types';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { Badge, getStatusTone } from '../components/common/Badge';
import { TypeLabel } from '../components/common/TypeLabel';
import { Dialog } from '../components/common/Dialog';
import { claimService } from '../services/claimService';

export interface MyReportsPageProps {
  items: LostFoundItem[];
  claims: Claim[];
  currentUser: User;
  isLoading?: boolean;
  error?: string | null;
  onOpenItem: (item: LostFoundItem) => void;
  onReviewClaims: (item: LostFoundItem) => void;
  onEditItem: (item: LostFoundItem) => void;
  onCloseItem: (itemId: string) => Promise<void> | void;
  onRefresh?: () => void;
}

export const MyReportsPage: React.FC<MyReportsPageProps> = ({
  items,
  claims,
  currentUser,
  isLoading = false,
  error = null,
  onOpenItem,
  onReviewClaims,
  onEditItem,
  onCloseItem,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Lost' | 'Found'>('All');
  const [closingItemId, setClosingItemId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Filter only items owned by currentUser
  const myItems = items.filter((item) => item.ownerUid === currentUser.uid);

  const filtered = myItems.filter((item) => {
    if (activeTab === 'All') return true;
    return item.type === activeTab;
  });

  const handleConfirmClose = async () => {
    if (!closingItemId) return;
    setIsClosing(true);
    try {
      await onCloseItem(closingItemId);
      setClosingItemId(null);
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR ACTIVITY</span>
          <h1>My reports</h1>
          <p>Manage your lost and found reports and continue recovery actions.</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="error-panel" role="alert" style={{ marginBottom: '20px' }}>
          <Icon name="alert" />
          <div style={{ flex: 1 }}>
            <b>Could not load your reports:</b> {error}
            {onRefresh && (
              <div style={{ marginTop: '8px' }}>
                <Button variant="secondary" style={{ minHeight: '32px', fontSize: '12px' }} onClick={onRefresh}>
                  Retry loading
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="tabs" role="tablist">
        <button
          type="button"
          className={activeTab === 'All' ? 'active' : ''}
          onClick={() => setActiveTab('All')}
        >
          All <small>{myItems.length}</small>
        </button>
        <button
          type="button"
          className={activeTab === 'Lost' ? 'active' : ''}
          onClick={() => setActiveTab('Lost')}
        >
          Lost <small>{myItems.filter((i) => i.type === 'Lost').length}</small>
        </button>
        <button
          type="button"
          className={activeTab === 'Found' ? 'active' : ''}
          onClick={() => setActiveTab('Found')}
        >
          Found <small>{myItems.filter((i) => i.type === 'Found').length}</small>
        </button>
      </div>

      {isLoading && myItems.length === 0 ? (
        <div className="empty" style={{ marginTop: '30px' }}>
          <div>
            <Icon name="file" size={30} />
          </div>
          <h2>Loading your reports...</h2>
          <p>Fetching your personal lost and found submissions from Cloud Firestore.</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="record-list">
          {filtered.map((item) => {
            const pendingClaimsCount = claimService.getPendingClaimCountForItem(Number(item.id) || 0, claims);
            const isOpen = item.status === 'Open';

            return (
              <article key={item.id} className="record-row">
                <div className={`record-thumb item-${item.icon}`} style={{ overflow: 'hidden' }}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : (
                    <Icon name={item.icon} />
                  )}
                </div>

                <div className="record-main">
                  <h3>{item.title}</h3>
                  <p>
                    {item.category} · {item.eventDate}
                  </p>
                </div>

                <TypeLabel type={item.type} />
                <Badge tone={getStatusTone(item.status)}>{item.status}</Badge>

                {pendingClaimsCount > 0 ? (
                  <span className="pending-count">
                    {pendingClaimsCount} pending {pendingClaimsCount === 1 ? 'claim' : 'claims'}
                  </span>
                ) : (
                  <span />
                )}

                <div className="row-actions">
                  <Button variant="secondary" onClick={() => onOpenItem(item)}>
                    View
                  </Button>

                  {isOpen && (
                    <Button variant="secondary" onClick={() => onEditItem(item)}>
                      Edit
                    </Button>
                  )}

                  {isOpen && (
                    <Button variant="ghost" onClick={() => setClosingItemId(item.id)}>
                      Close
                    </Button>
                  )}

                  {item.type === 'Found' && item.status !== 'Returned' && item.status !== 'Closed' && (
                    <Button variant="ghost" onClick={() => onReviewClaims(item)}>
                      Review claims
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: '24px' }}>
          <div>
            <Icon name="file" size={30} />
          </div>
          <h2>No reports found</h2>
          <p>
            {activeTab === 'All'
              ? 'You have not submitted any reports under this account yet.'
              : `You have no ${activeTab.toLowerCase()} reports.`}
          </p>
        </div>
      )}

      <div className="info-line" style={{ marginTop: '24px' }}>
        <Icon name="help" />
        <span>Closing a report removes it from active recovery. It does not record a physical return.</span>
      </div>

      {/* Close Report Confirmation Modal */}
      {closingItemId && (
        <Dialog title="Close report" onClose={() => setClosingItemId(null)}>
          <p className="dialog-copy">
            Are you sure you want to close this report? Closing a report removes it from active recovery. It
            does not record a physical return.
          </p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setClosingItemId(null)} disabled={isClosing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmClose} disabled={isClosing}>
              {isClosing ? 'Closing report...' : 'Close report'}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
};
