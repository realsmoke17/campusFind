import { Claim, LostFoundItem, User } from '../types';
import { getInitialClaims } from '../constants/mockData';

const CLAIMS_STORAGE_KEY = 'campusfind_claims';

export const claimService = {
  getClaims(): Claim[] {
    const saved = localStorage.getItem(CLAIMS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    const initial = getInitialClaims();
    this.saveClaims(initial);
    return initial;
  },

  saveClaims(claims: Claim[]): void {
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(claims));
  },

  resetClaims(): Claim[] {
    const initial = getInitialClaims();
    this.saveClaims(initial);
    return initial;
  },

  canUserClaimItem(item: LostFoundItem, user: User, claims: Claim[]): { canClaim: boolean; reason?: string } {
    if (!user.isVerified) {
      return { canClaim: false, reason: 'You must verify your campus email before claiming items.' };
    }
    if (item.ownerUid === user.uid) {
      return { canClaim: false, reason: 'You cannot claim an item you reported.' };
    }
    if (item.type === 'Lost') {
      return { canClaim: false, reason: 'Lost reports do not accept ownership claims.' };
    }
    if (item.status === 'Reserved') {
      return { canClaim: false, reason: 'This item is currently reserved for an approved claimant.' };
    }
    if (item.status === 'Returned') {
      return { canClaim: false, reason: 'This item has already been physically returned.' };
    }
    if (item.status === 'Closed' || item.visibility === 'hidden') {
      return { canClaim: false, reason: 'This listing is closed or inactive.' };
    }
    const existingActiveClaim = claims.find(
      c => String(c.itemId) === String(item.id) && c.claimantUid === user.uid && (c.status === 'Pending' || c.status === 'Approved')
    );
    if (existingActiveClaim) {
      return { canClaim: false, reason: 'You already have an active claim on this item.' };
    }
    return { canClaim: true };
  },

  submitClaim(
    item: LostFoundItem,
    claimant: User,
    evidence: string,
    imageUrl?: string
  ): { claim: Claim; updatedClaims: Claim[] } {
    const claims = this.getClaims();
    const newClaim: Claim = {
      id: Date.now(),
      itemId: item.id,
      itemTitle: item.title,
      claimantUid: claimant.uid,
      claimantName: claimant.displayName,
      date: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Pending',
      evidence,
      imageUrl
    };
    const updated = [newClaim, ...claims];
    this.saveClaims(updated);
    return { claim: newClaim, updatedClaims: updated };
  },

  approveClaim(
    claimId: string | number,
    itemId: string | number
  ): { updatedClaims: Claim[] } {
    const claims = this.getClaims().map(c => {
      if (String(c.itemId) === String(itemId)) {
        if (String(c.id) === String(claimId)) {
          return { ...c, status: 'Approved' as const };
        } else if (c.status === 'Pending') {
          // Other pending claims on this item are rejected
          return { ...c, status: 'Rejected' as const };
        }
      }
      return c;
    });
    this.saveClaims(claims);
    return { updatedClaims: claims };
  },

  rejectClaim(claimId: string | number): Claim[] {
    const claims = this.getClaims().map(c => {
      if (String(c.id) === String(claimId)) {
        return { ...c, status: 'Rejected' as const };
      }
      return c;
    });
    this.saveClaims(claims);
    return claims;
  },

  withdrawClaim(claimId: string | number): Claim[] {
    const claims = this.getClaims().map(c => {
      if (String(c.id) === String(claimId)) {
        return { ...c, status: 'Withdrawn' as const };
      }
      return c;
    });
    this.saveClaims(claims);
    return claims;
  },

  confirmReturn(
    claimId: string | number,
    method: 'Direct handover' | 'Campus collection',
    location: string
  ): { updatedClaims: Claim[] } {
    const claims = this.getClaims().map(c => {
      if (String(c.id) === String(claimId)) {
        return {
          ...c,
          status: 'Returned' as const,
          handoverMethod: method,
          handoverLocation: location
        };
      }
      return c;
    });
    this.saveClaims(claims);
    return { updatedClaims: claims };
  },

  /**
   * Derive live pending claim count for an item
   */
  getPendingClaimCountForItem(itemId: string | number, claims: Claim[]): number {
    return claims.filter(c => String(c.itemId) === String(itemId) && c.status === 'Pending').length;
  },

  /**
   * Derive total pending claim count for items owned by a user
   */
  getTotalPendingForOwner(ownerUid: string, items: LostFoundItem[], claims: Claim[]): number {
    const userItemIds = new Set(items.filter(i => i.ownerUid === ownerUid).map(i => String(i.id)));
    return claims.filter(c => userItemIds.has(String(c.itemId)) && c.status === 'Pending').length;
  }
};
