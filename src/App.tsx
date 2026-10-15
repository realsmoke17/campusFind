import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { LostFoundItem, Claim, FlaggedListing, UpdateReportPayload } from './types';
import { itemService } from './services/itemService';
import { claimService } from './services/claimService';
import { getInitialFlaggedListings } from './constants/mockData';
import { useAuth } from './context/AuthContext';

// Layout & Common Components
import { AppShell } from './components/layout/AppShell';
import { Toast } from './components/common/Toast';
import { Logo } from './components/common/Logo';

// Pages
import { WelcomePage } from './pages/WelcomePage';
import { AuthPage } from './pages/AuthPage';
import { BrowsePage } from './pages/BrowsePage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { ReportItemPage } from './pages/ReportItemPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { MyClaimsPage } from './pages/MyClaimsPage';
import { FinderReviewPage } from './pages/FinderReviewPage';
import { EvidenceClaimModal } from './pages/EvidenceClaimModal';
import { ReturnConfirmModal } from './pages/ReturnConfirmModal';
import { ProfilePage } from './pages/ProfilePage';
import { HelpPage } from './pages/HelpPage';
import { AdminFlaggedPage } from './pages/AdminFlaggedPage';

export const App: React.FC = () => {
  const { currentUser, loading, signOut } = useAuth();

  // Top-level flow: 'welcome' | 'auth' | 'app'
  const [appState, setAppState] = useState<'welcome' | 'auth' | 'app'>('welcome');
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'register'>('signin');

  // Navigation page in app
  const [currentPage, setCurrentPage] = useState<string>('browse');

  // Firestore-backed item collections (no mock records auto-loaded in live mode)
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // User's own reports
  const [myReports, setMyReports] = useState<LostFoundItem[]>([]);
  const [isLoadingMyReports, setIsLoadingMyReports] = useState<boolean>(false);
  const [myReportsError, setMyReportsError] = useState<string | null>(null);

  // Item being edited by its author
  const [itemToEdit, setItemToEdit] = useState<LostFoundItem | null>(null);

  // Claims & Flags (preserved until claims stage)
  const [claims, setClaims] = useState<Claim[]>(() => claimService.getClaims());
  const [flaggedListings, setFlaggedListings] = useState<FlaggedListing[]>(() => getInitialFlaggedListings());

  // Active item selections
  const [selectedItem, setSelectedItem] = useState<LostFoundItem | null>(null);
  const [reviewItem, setReviewItem] = useState<LostFoundItem | null>(null);

  // Modals
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);
  const [returnClaimId, setReturnClaimId] = useState<string | number | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(''), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Synchronize top-level view with authentication state
  useEffect(() => {
    if (loading) return;

    if (currentUser) {
      setAppState('app');
      if (!currentUser.isVerified) {
        setCurrentPage('profile');
      }
    } else {
      if (appState === 'app') {
        setAppState('welcome');
      }
    }
  }, [currentUser, loading]);

  // Centralized Route / Access Guard for Unverified Users
  useEffect(() => {
    if (currentUser && !currentUser.isVerified && appState === 'app') {
      const allowed = ['profile', 'help'];
      if (!allowed.includes(currentPage)) {
        setCurrentPage('profile');
        showToast('Access restricted: Please verify your university email before browsing or claiming items.');
      }
    }
  }, [currentUser?.isVerified, currentPage, appState]);

  // Fetch visible reports with pagination from Firestore
  const loadReports = useCallback(
    async (isInitial = false) => {
      if (!currentUser?.isVerified) return;

      if (isInitial) {
        setIsLoadingReports(true);
        setReportsError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await itemService.getVisibleReports(6, isInitial ? null : lastDoc);
        setItems((prev) => (isInitial ? res.items : [...prev, ...res.items]));
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
      } catch (err: any) {
        setReportsError(err.message || 'Failed to load visible reports from Firestore.');
      } finally {
        setIsLoadingReports(false);
        setIsLoadingMore(false);
      }
    },
    [currentUser?.isVerified, lastDoc]
  );

  // Fetch user's own reports from Firestore
  const loadMyReports = useCallback(async () => {
    if (!currentUser?.uid || !currentUser.isVerified) return;

    setIsLoadingMyReports(true);
    setMyReportsError(null);
    try {
      const res = await itemService.getUserReports(currentUser.uid);
      setMyReports(res);
    } catch (err: any) {
      setMyReportsError(err.message || 'Failed to load your reports.');
    } finally {
      setIsLoadingMyReports(false);
    }
  }, [currentUser?.uid, currentUser?.isVerified]);

  // Trigger loads on verified entry
  useEffect(() => {
    if (currentUser?.isVerified && appState === 'app') {
      loadReports(true);
      loadMyReports();
    }
  }, [currentUser?.isVerified, currentUser?.uid, appState]);

  // Derive live pending claims count for current user's owned items
  const pendingReviewCount = useMemo(() => {
    if (!currentUser) return 0;
    return claimService.getTotalPendingForOwner(currentUser.uid, myReports, claims);
  }, [currentUser?.uid, myReports, claims]);

  // Sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      setSelectedItem(null);
      setReviewItem(null);
      setItemToEdit(null);
      setItems([]);
      setMyReports([]);
      setAppState('welcome');
      showToast('Signed out successfully.');
    } catch {
      showToast('Error signing out.');
    }
  };

  // Publish New Report to Cloud Firestore
  const handleCreateReport = async (itemData: {
    title: string;
    type: 'Lost' | 'Found';
    category: LostFoundItem['category'];
    location: string;
    eventDate: string;
    rawEventDate: string;
    description: string;
    icon: string;
    imageUrl?: string;
    imagePublicId?: string;
  }) => {
    if (!currentUser) return;
    try {
      await itemService.createReport(itemData, currentUser);
      await Promise.all([loadReports(true), loadMyReports()]);
      setCurrentPage('reports');
      showToast(`${itemData.type} report published successfully to campus listings.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to publish report to Firestore.');
      throw err;
    }
  };

  // Open Edit Mode for an open report
  const handleStartEditItem = (item: LostFoundItem) => {
    setItemToEdit(item);
    setSelectedItem(null);
    setCurrentPage('report');
    window.scrollTo(0, 0);
  };

  // Update existing open report in Firestore
  const handleUpdateReport = async (itemId: string, updates: UpdateReportPayload) => {
    if (!currentUser) return;
    try {
      await itemService.updateOpenReport(itemId, updates, currentUser.uid);
      await Promise.all([loadReports(true), loadMyReports()]);
      setItemToEdit(null);
      setCurrentPage('reports');
      showToast('Report updated successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to update report in Firestore.');
      throw err;
    }
  };

  // Close report in Firestore
  const handleCloseReport = async (itemId: string) => {
    if (!currentUser) return;
    try {
      await itemService.closeReport(itemId, currentUser.uid);
      await Promise.all([loadReports(true), loadMyReports()]);
      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => (prev ? { ...prev, status: 'Closed' } : null));
      }
      showToast('Report closed and removed from active recovery.');
    } catch (err: any) {
      showToast(err.message || 'Failed to close report.');
      throw err;
    }
  };

  // Claim Approval Handler (Preserved)
  const handleApproveClaim = (claimId: string | number) => {
    const claim = claims.find((c) => String(c.id) === String(claimId));
    if (!claim) return;

    const { updatedClaims } = claimService.approveClaim(claimId, claim.itemId);
    setClaims(updatedClaims);

    if (reviewItem && String(reviewItem.id) === String(claim.itemId)) {
      setReviewItem({ ...reviewItem, status: 'Reserved' });
    }
    if (selectedItem && String(selectedItem.id) === String(claim.itemId)) {
      setSelectedItem({ ...selectedItem, status: 'Reserved' });
    }

    showToast('Claim approved and item reserved. Other pending claims rejected.');
  };

  // Claim Rejection Handler
  const handleRejectClaim = (claimId: string | number) => {
    const updatedClaims = claimService.rejectClaim(claimId);
    setClaims(updatedClaims);
    showToast('Ownership claim rejected.');
  };

  // Claim Withdrawal Handler
  const handleWithdrawClaim = (claimId: string | number) => {
    const updatedClaims = claimService.withdrawClaim(claimId);
    setClaims(updatedClaims);
    showToast('Ownership claim withdrawn.');
  };

  // Physical Return Handler
  const handleConfirmReturn = (method: 'Direct handover' | 'Campus collection', location: string) => {
    if (returnClaimId === null) return;
    const claim = claims.find((c) => String(c.id) === String(returnClaimId));
    if (!claim) return;

    const { updatedClaims } = claimService.confirmReturn(returnClaimId, method, location);
    setClaims(updatedClaims);

    if (reviewItem && String(reviewItem.id) === String(claim.itemId)) {
      setReviewItem({ ...reviewItem, status: 'Returned' });
    }
    if (selectedItem && String(selectedItem.id) === String(claim.itemId)) {
      setSelectedItem({ ...selectedItem, status: 'Returned' });
    }

    setReturnClaimId(null);
    showToast('Physical return confirmed. Item recorded as returned.');
  };

  // Submit Evidence Claim
  const handleSubmitEvidence = (evidence: string) => {
    if (!selectedItem || !currentUser) return;
    const { updatedClaims } = claimService.submitClaim(selectedItem, currentUser, evidence);
    setClaims(updatedClaims);

    setShowEvidenceModal(false);
    setSelectedItem(null);
    setCurrentPage('claims');
    showToast('Ownership claim submitted privately to the finder.');
  };

  // Flag Item Handler
  const handleFlagItem = (reason: string) => {
    if (!selectedItem) return;
    const newFlag: FlaggedListing = {
      id: Date.now(),
      itemId: selectedItem.id,
      itemTitle: selectedItem.title,
      itemType: selectedItem.type,
      category: selectedItem.category,
      reason,
      submittedDate: 'Today',
      status: 'Needs review'
    };
    setFlaggedListings((prev) => [newFlag, ...prev]);
    showToast('Listing flagged for campus review.');
  };

  // Admin: Hide Listing
  const handleAdminHideListing = (_listingId: string | number, _itemId: string | number) => {
    const updatedFlags = flaggedListings.map((f) =>
      String(f.id) === String(_listingId) ? { ...f, status: 'Hidden' as const } : f
    );
    setFlaggedListings(updatedFlags);
    showToast('Listing marked as hidden.');
  };

  // Admin: Resolve Flag
  const handleAdminResolveFlag = (listingId: string | number) => {
    const updatedFlags = flaggedListings.map((f) =>
      String(f.id) === String(listingId) ? { ...f, status: 'Resolved' as const } : f
    );
    setFlaggedListings(updatedFlags);
    showToast('Flag marked as resolved.');
  };

  // Navigation helper
  const navigateTo = (page: string) => {
    setSelectedItem(null);
    setReviewItem(null);
    if (page !== 'report') {
      setItemToEdit(null);
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // View item details
  const openItemDetails = (item: LostFoundItem) => {
    setSelectedItem(item);
    window.scrollTo(0, 0);
  };

  // Open review for a specific found item
  const openReviewForItem = (item: LostFoundItem) => {
    setReviewItem(item);
    setSelectedItem(null);
    setCurrentPage('review');
    window.scrollTo(0, 0);
  };

  // Loading state during initial session restoration
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          flexDirection: 'column'
        }}
      >
        <Logo />
        <p style={{ marginTop: '16px', color: 'var(--muted)', fontSize: '14px', fontWeight: 500 }}>
          Restoring campus session...
        </p>
      </div>
    );
  }

  // 1. Welcome Screen (Unauthenticated)
  if (appState === 'welcome' || (!currentUser && appState !== 'auth')) {
    return (
      <WelcomePage
        onSignIn={() => {
          setAuthInitialMode('signin');
          setAppState('auth');
        }}
        onRegister={() => {
          setAuthInitialMode('register');
          setAppState('auth');
        }}
        onHelp={() => {
          setAppState('app');
          setCurrentPage('help');
        }}
      />
    );
  }

  // 2. Auth Flow (Sign in, Register, Forgot, Verify)
  if (appState === 'auth' || !currentUser) {
    return (
      <AuthPage
        initialMode={authInitialMode}
        onSuccess={() => {
          setAppState('app');
          setCurrentPage('browse');
        }}
        onCancelToWelcome={() => setAppState('welcome')}
      />
    );
  }

  // Find target item for claim review
  const activeReviewItem =
    reviewItem ||
    myReports.find((i) => i.ownerUid === currentUser.uid && i.type === 'Found') ||
    items.find((i) => i.ownerUid === currentUser.uid && i.type === 'Found');

  // 3. Main Application Shell (Authenticated)
  return (
    <AppShell
      page={currentPage}
      setPage={navigateTo}
      currentUser={currentUser}
      pendingReviewCount={pendingReviewCount}
      onSignOut={handleSignOut}
    >
      {/* Item Detail View */}
      {selectedItem ? (
        <ItemDetailPage
          item={selectedItem}
          currentUser={currentUser}
          claims={claims}
          onBack={() => setSelectedItem(null)}
          onClaimClick={() => setShowEvidenceModal(true)}
          onReviewClick={() => openReviewForItem(selectedItem)}
          onCreateFoundReport={() => {
            setSelectedItem(null);
            setItemToEdit(null);
            setCurrentPage('report');
          }}
          onEditReport={handleStartEditItem}
          onCloseReport={handleCloseReport}
          onFlagItem={handleFlagItem}
        />
      ) : currentPage === 'browse' ? (
        <BrowsePage
          items={items}
          isLoading={isLoadingReports}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          error={reportsError}
          onLoadMore={() => loadReports(false)}
          onRetry={() => loadReports(true)}
          onOpenItem={openItemDetails}
          onReportClick={() => {
            setItemToEdit(null);
            navigateTo('report');
          }}
        />
      ) : currentPage === 'report' ? (
        <ReportItemPage
          currentUser={currentUser}
          itemToEdit={itemToEdit}
          onSubmitReport={handleCreateReport}
          onUpdateReport={handleUpdateReport}
          onCancel={() => {
            setItemToEdit(null);
            navigateTo(itemToEdit ? 'reports' : 'browse');
          }}
        />
      ) : currentPage === 'reports' ? (
        <MyReportsPage
          items={myReports}
          claims={claims}
          currentUser={currentUser}
          isLoading={isLoadingMyReports}
          error={myReportsError}
          onOpenItem={openItemDetails}
          onReviewClaims={openReviewForItem}
          onEditItem={handleStartEditItem}
          onCloseItem={handleCloseReport}
          onRefresh={loadMyReports}
        />
      ) : currentPage === 'claims' ? (
        <MyClaimsPage
          claims={claims}
          items={[...items, ...myReports]}
          currentUser={currentUser}
          onWithdrawClaim={handleWithdrawClaim}
        />
      ) : currentPage === 'review' ? (
        activeReviewItem ? (
          <FinderReviewPage
            item={activeReviewItem}
            claims={claims}
            onBack={() => navigateTo('reports')}
            onApproveClaim={handleApproveClaim}
            onRejectClaim={handleRejectClaim}
            onRequestReturnConfirm={(cid) => setReturnClaimId(cid)}
          />
        ) : (
          <div className="empty">
            <h2>No found reports to review</h2>
            <p>You have not created any found reports yet.</p>
          </div>
        )
      ) : currentPage === 'help' ? (
        <HelpPage />
      ) : currentPage === 'profile' ? (
        <ProfilePage
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
      ) : currentPage === 'admin' ? (
        <AdminFlaggedPage
          flaggedListings={flaggedListings}
          items={[...items, ...myReports]}
          currentUser={currentUser}
          onHideListing={handleAdminHideListing}
          onResolveFlag={handleAdminResolveFlag}
          onViewReport={openItemDetails}
        />
      ) : null}

      {/* Screen 13: Evidence Claim Modal */}
      {showEvidenceModal && selectedItem && (
        <EvidenceClaimModal
          item={selectedItem}
          onClose={() => setShowEvidenceModal(false)}
          onSubmitEvidence={handleSubmitEvidence}
        />
      )}

      {/* Screen 15: Physical Return Confirmation Modal */}
      {returnClaimId !== null && (
        <ReturnConfirmModal
          onClose={() => setReturnClaimId(null)}
          onConfirm={handleConfirmReturn}
        />
      )}

      {/* Toast Notification */}
      <Toast message={toastMessage} />
    </AppShell>
  );
};

export default App;
