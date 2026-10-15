import React, { useState } from 'react';
import { FlaggedListing, LostFoundItem, User } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Dialog } from '../components/common/Dialog';

export interface AdminFlaggedPageProps {
  flaggedListings: FlaggedListing[];
  items: LostFoundItem[];
  currentUser: User;
  onHideListing: (listingId: string | number, itemId: string | number) => void;
  onResolveFlag: (listingId: string | number) => void;
  onViewReport: (item: LostFoundItem) => void;
}

export const AdminFlaggedPage: React.FC<AdminFlaggedPageProps> = ({
  flaggedListings,
  items,
  currentUser,
  onHideListing,
  onResolveFlag,
  onViewReport
}) => {
  const [selectedListing, setSelectedListing] = useState<FlaggedListing | null>(null);

  if (!currentUser.isAdmin) {
    return (
      <div className="empty">
        <h2>Administrator Access Required</h2>
        <p>This section is restricted to authorized campus moderators and administrators.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Flagged listings</h1>
          <p>Review reported public content. Private ownership evidence is not shown here.</p>
        </div>
      </div>

      <div className="admin-table">
        <div className="admin-row header">
          <span>Listing</span>
          <span>Flag reason</span>
          <span>Submitted</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {flaggedListings.map((listing) => {
          const correspondingItem = items.find((i) => i.id === listing.itemId);

          return (
            <div key={listing.id} className="admin-row">
              <div>
                <b>{listing.itemTitle}</b>
                <small>
                  {listing.itemType} · {listing.category}
                </small>
              </div>

              <span>{listing.reason}</span>
              <span>{listing.submittedDate}</span>

              <div>
                <Badge
                  tone={
                    listing.status === 'Needs review'
                      ? 'warning'
                      : listing.status === 'Resolved'
                      ? 'neutral'
                      : 'neutral'
                  }
                >
                  {listing.status}
                </Badge>
              </div>

              <div>
                {correspondingItem && (
                  <Button
                    variant="secondary"
                    onClick={() => onViewReport(correspondingItem)}
                  >
                    View report
                  </Button>
                )}

                {listing.status === 'Needs review' && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => onHideListing(listing.id, listing.itemId)}
                    >
                      Hide listing
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onResolveFlag(listing.id)}
                    >
                      Resolve
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {flaggedListings.length === 0 && (
        <div className="empty" style={{ marginTop: '20px' }}>
          <h2>No flagged listings</h2>
          <p>All reported items have been reviewed by administrators.</p>
        </div>
      )}
    </>
  );
};

