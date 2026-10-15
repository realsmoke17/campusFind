import React from 'react';
import { User } from '../../types';
import { Logo } from '../common/Logo';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button';

export interface AppShellProps {
  page: string;
  setPage: (page: string) => void;
  currentUser: User;
  pendingReviewCount: number;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  page,
  setPage,
  currentUser,
  pendingReviewCount,
  children
}) => {
  const isUnverified = !currentUser.isVerified;

  const handleNavClick = (targetPage: string) => {
    if (isUnverified && targetPage !== 'profile' && targetPage !== 'help') {
      setPage('profile');
      return;
    }
    setPage(targetPage);
  };

  const navItems = [
    { page: 'browse', label: 'Browse items', icon: 'grid' },
    { page: 'report', label: 'Report an item', icon: 'plus' },
    { page: 'reports', label: 'My reports', icon: 'file' },
    { page: 'claims', label: 'My claims', icon: 'claim' },
    { page: 'review', label: 'Claims on my items', icon: 'shield', badge: pendingReviewCount }
  ];

  const getRoleHeaderLabel = () => {
    if (!currentUser.isVerified) {
      return 'Email not verified';
    }
    return 'Verified student';
  };

  return (
    <div className="app-shell">
      {/* Dark Navy Sidebar */}
      <aside className="sidebar">
        <Logo />

        <nav aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = page === item.page;
            const isRestricted = isUnverified && item.page !== 'profile' && item.page !== 'help';

            return (
              <button
                key={item.page}
                type="button"
                className={`${isActive ? 'active' : ''} ${isRestricted ? 'opacity-50' : ''}`}
                onClick={() => handleNavClick(item.page)}
                title={isRestricted ? 'Verification required to access' : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 ? (
                  <small aria-label={`${item.badge} pending claims`}>{item.badge}</small>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="side-bottom">
          <button
            type="button"
            className={page === 'help' ? 'active' : ''}
            onClick={() => setPage('help')}
          >
            <Icon name="help" />
            <span>Help & safety</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="app-main">
        {/* Sticky Topbar */}
        <header className="topbar">
          <button
            type="button"
            className="mobile-logo"
            onClick={() => handleNavClick('browse')}
            aria-label="CampusFind home"
          >
            <Logo compact />
          </button>

          <div className="top-title">
            <span>CampusFind</span>
            <small>Tshwane University of Technology</small>
          </div>

          <div className="top-actions">
            {!isUnverified && (
              <Button
                icon="plus"
                onClick={() => setPage('report')}
              >
                Report an item
              </Button>
            )}

            <button
              type="button"
              className="account-btn"
              onClick={() => setPage('profile')}
              aria-label="Open profile"
            >
              <span>{currentUser.initials}</span>
              <div>
                <b>{currentUser.displayName}</b>
                <small>{getRoleHeaderLabel()}</small>
              </div>
              <Icon name="chevron" size={16} />
            </button>
          </div>
        </header>

        {/* Verification Alert Banner for Unverified Users */}
        {isUnverified && (
          <div className="mock-banner" style={{ background: '#fdf3d8', borderColor: '#f4c760', color: '#8a5b00' }}>
            <Icon name="alert" size={16} />
            <span>
              <b>Email verification required:</b> Verify your student account (<code>{currentUser.email}</code>) to enable browsing and recovery.
            </span>
            <button type="button" onClick={() => setPage('profile')}>
              Verify email
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="content">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 4).map((item) => (
          <button
            key={item.page}
            type="button"
            className={page === item.page ? 'active' : ''}
            onClick={() => handleNavClick(item.page)}
          >
            <Icon name={item.icon} />
            <span>{item.label.replace(' items', '').replace(' an item', '')}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
