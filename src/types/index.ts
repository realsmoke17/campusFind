export type ItemCategory = 'Electronics' | 'Cards' | 'Keys' | 'Bags' | 'Clothing' | 'Other';
export type ItemType = 'Lost' | 'Found';
export type ItemStatus = 'Open' | 'Reserved' | 'Returned' | 'Closed';
export type ItemVisibility = 'visible' | 'hidden';
export type ClaimStatus = 'Pending' | 'Approved' | 'Rejected' | 'Returned' | 'Withdrawn';

export type UserRole = 'finder' | 'claimant' | 'unverified' | 'admin';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isAdmin: boolean;
  initials: string;
  roleLabel: string;
}

export interface LostFoundItem {
  id: string;
  title: string;
  type: ItemType;
  category: ItemCategory;
  location: string;
  eventDate: string; // e.g., "12 Oct 2026"
  rawEventDate: string; // "2026-10-12"
  reportedDate: string;
  status: ItemStatus;
  visibility: ItemVisibility;
  description: string;
  ownerUid: string;
  ownerName: string;
  icon: string;
  imageUrl?: string;
  imagePublicId?: string;
  claims: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface UpdateReportPayload {
  title: string;
  category: ItemCategory;
  location: string;
  eventDate: string;
  rawEventDate: string;
  description: string;
  icon?: string;
  imageUrl?: string | null;
  imagePublicId?: string | null;
}

export interface Claim {
  id: string | number;
  itemId: string | number;
  itemTitle: string;
  claimantUid: string;
  claimantName: string;
  date: string;
  status: ClaimStatus;
  evidence: string;
  imageUrl?: string;
  handoverMethod?: 'Direct handover' | 'Campus collection';
  handoverLocation?: string;
}

export interface FlaggedListing {
  id: string | number;
  itemId: string | number;
  itemTitle: string;
  itemType: ItemType;
  category: ItemCategory;
  reason: string;
  submittedDate: string;
  status: 'Needs review' | 'Resolved' | 'Hidden';
}

export interface ReportDraft {
  type: ItemType;
  title: string;
  category: ItemCategory | '';
  location: string;
  eventDate: string;
  description: string;
  imageUrl?: string;
  imagePublicId?: string;
  savedAt: string;
}
