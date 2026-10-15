import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteField,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryDocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LostFoundItem, ReportDraft, UpdateReportPayload, User } from '../types';

const DRAFT_STORAGE_KEY = 'campusfind_report_draft';

function docSnapshotToItem(docSnap: { id: string; data: () => any }): LostFoundItem {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    title: data.title || '',
    type: data.type || 'Found',
    category: data.category || 'Other',
    location: data.location || '',
    eventDate: data.eventDate || '',
    rawEventDate: data.rawEventDate || '',
    reportedDate: data.reportedDate || 'Recently',
    status: data.status || 'Open',
    visibility: data.visibility || 'visible',
    description: data.description || '',
    ownerUid: data.ownerUid || '',
    ownerName: data.ownerName || 'Campus Student',
    icon: data.icon || 'box',
    imageUrl: data.imageUrl || undefined,
    imagePublicId: data.imagePublicId || undefined,
    claims: typeof data.claims === 'number' ? data.claims : 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export interface PaginatedReportsResult {
  items: LostFoundItem[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export const itemService = {
  /**
   * Bounded query for visible reports with pagination
   * Security rule: requires isVerifiedStudent() && visibility == 'visible'
   */
  async getVisibleReports(
    pageSize: number = 6,
    lastDoc?: QueryDocumentSnapshot | null
  ): Promise<PaginatedReportsResult> {
    const constraints: QueryConstraint[] = [
      where('visibility', '==', 'visible'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    ];

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, 'items'), ...constraints);
    const snap = await getDocs(q);

    const items = snap.docs.map(docSnapshotToItem);
    const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === pageSize;

    return { items, lastDoc: lastVisible, hasMore };
  },

  /**
   * Query current user's own reports (even if hidden by moderation)
   * Security rule: requires isOwner(resource.data.ownerUid)
   */
  async getUserReports(ownerUid: string): Promise<LostFoundItem[]> {
    if (!ownerUid) return [];

    const q = query(
      collection(db, 'items'),
      where('ownerUid', '==', ownerUid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(docSnapshotToItem);
  },

  /**
   * Fetch single report by ID
   */
  async getItemById(itemId: string): Promise<LostFoundItem | null> {
    if (!itemId) return null;
    const snap = await getDoc(doc(db, 'items', itemId));
    if (!snap.exists()) return null;
    return docSnapshotToItem(snap);
  },

  /**
   * Create a new item report
   * Derives ownerUid from authenticated user
   * Never stores base64 image data in Firestore
   */
  async createReport(
    itemData: {
      title: string;
      type: 'Lost' | 'Found';
      category: LostFoundItem['category'];
      location: string;
      eventDate: string;
      rawEventDate: string;
      reportedDate?: string;
      description: string;
      icon: string;
      imageUrl?: string;
      imagePublicId?: string;
    },
    currentUser: User
  ): Promise<LostFoundItem> {
    // Never save base64 image data in Firestore
    let safeImageUrl: string | undefined = undefined;
    if (itemData.imageUrl && !itemData.imageUrl.startsWith('data:') && !itemData.imageUrl.startsWith('blob:')) {
      safeImageUrl = itemData.imageUrl;
    }

    const safeImagePublicId =
      itemData.imagePublicId && typeof itemData.imagePublicId === 'string'
        ? itemData.imagePublicId.trim()
        : undefined;

    const newDoc: Record<string, any> = {
      title: itemData.title.trim(),
      type: itemData.type,
      category: itemData.category,
      location: itemData.location.trim(),
      eventDate: itemData.eventDate,
      rawEventDate: itemData.rawEventDate,
      reportedDate: itemData.reportedDate || 'Today',
      status: 'Open' as const,
      visibility: 'visible' as const,
      description: itemData.description.trim(),
      ownerUid: currentUser.uid,
      ownerName: currentUser.displayName,
      icon: itemData.icon || 'box',
      claims: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (safeImageUrl) {
      newDoc.imageUrl = safeImageUrl;
    }
    if (safeImagePublicId) {
      newDoc.imagePublicId = safeImagePublicId;
    }

    const docRef = await addDoc(collection(db, 'items'), newDoc);

    return {
      id: docRef.id,
      ...newDoc,
      imageUrl: safeImageUrl,
      imagePublicId: safeImagePublicId
    } as LostFoundItem;
  },

  /**
   * Allow authors to safely edit descriptive fields of their open reports
   * Security rule: allows only safe descriptive updates on open reports by owner
   */
  async updateOpenReport(
    itemId: string,
    updates: UpdateReportPayload,
    _currentUserUid: string
  ): Promise<void> {
    const itemRef = doc(db, 'items', itemId);
    const payload: Record<string, any> = {
      title: updates.title.trim(),
      category: updates.category,
      location: updates.location.trim(),
      description: updates.description.trim(),
      eventDate: updates.eventDate,
      rawEventDate: updates.rawEventDate,
      updatedAt: serverTimestamp()
    };

    if (updates.icon) {
      payload.icon = updates.icon;
    }

    if (updates.imageUrl !== undefined) {
      if (updates.imageUrl && !updates.imageUrl.startsWith('data:') && !updates.imageUrl.startsWith('blob:')) {
        payload.imageUrl = updates.imageUrl;
      } else if (updates.imageUrl === null) {
        payload.imageUrl = deleteField();
      }
    }

    if (updates.imagePublicId !== undefined) {
      if (updates.imagePublicId) {
        payload.imagePublicId = updates.imagePublicId.trim();
      } else if (updates.imagePublicId === null) {
        payload.imagePublicId = deleteField();
      }
    }

    await updateDoc(itemRef, payload);
  },

  /**
   * Allow author to close their own open report
   */
  async closeReport(itemId: string, _currentUserUid: string): Promise<void> {
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, {
      status: 'Closed',
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Client-side open-first sorting with stable secondary date order
   */
  sortOpenFirst(items: LostFoundItem[]): LostFoundItem[] {
    return [...items].sort((a, b) => {
      const getPriority = (status: string) => {
        if (status === 'Open') return 1;
        if (status === 'Reserved') return 2;
        if (status === 'Returned') return 3;
        return 4; // Closed
      };

      const diff = getPriority(a.status) - getPriority(b.status);
      if (diff !== 0) return diff;

      return b.rawEventDate.localeCompare(a.rawEventDate);
    });
  },

  /**
   * Client-side refinement over loaded visible items
   */
  filterItems(
    items: LostFoundItem[],
    filter: {
      type: string;
      category: string;
      location: string;
      dateRange: string;
      query: string;
      statusFilter?: string;
    }
  ): LostFoundItem[] {
    const now = new Date();
    const ms7Days = 7 * 24 * 60 * 60 * 1000;
    const ms30Days = 30 * 24 * 60 * 60 * 1000;

    return items.filter((item) => {
      // Hidden items are omitted from public browse
      if (item.visibility === 'hidden') return false;

      // Type
      if (filter.type !== 'All' && item.type !== filter.type) return false;

      // Category
      if (filter.category !== 'All categories' && item.category !== filter.category) return false;

      // Location
      if (filter.location !== 'All locations' && item.location !== filter.location) return false;

      // Status
      if (filter.statusFilter && filter.statusFilter !== 'All statuses' && item.status !== filter.statusFilter) {
        return false;
      }

      // Date Range based on rawEventDate
      if (filter.dateRange !== 'Any date') {
        const itemDate = new Date(item.rawEventDate + 'T12:00:00');
        const diffMs = now.getTime() - itemDate.getTime();
        if (filter.dateRange === 'Past 7 days' && diffMs > ms7Days) return false;
        if (filter.dateRange === 'Past 30 days' && diffMs > ms30Days) return false;
      }

      // Keyword search covers title, location, category, description
      if (filter.query.trim()) {
        const q = filter.query.toLowerCase().trim();
        const searchable = `${item.title} ${item.location} ${item.category} ${item.description}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  },

  // Device-local draft operations
  saveDraft(draft: ReportDraft): void {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  },

  getDraft(): ReportDraft | null {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  },

  clearDraft(): void {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }
};
