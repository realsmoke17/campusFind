import React, { useState } from 'react';
import { User } from '../types';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { FormField } from '../components/common/FormField';
import { useAuth } from '../context/AuthContext';

export interface ProfilePageProps {
  currentUser: User;
  onSignOut: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentUser,
  onSignOut
}) => {
  const {
    updateDisplayName,
    sendPasswordReset,
    resendVerificationEmail,
    reloadUser
  } = useAuth();

  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [toast, setToast] = useState('');
  const [errorToast, setErrorToast] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const showSuccess = (msg: string) => {
    setToast(msg);
    setErrorToast('');
    setTimeout(() => setToast(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setToast('');
    setTimeout(() => setErrorToast(''), 5000);
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setIsSavingName(true);
    try {
      await updateDisplayName(displayName.trim());
      showSuccess('Display name updated successfully.');
    } catch (err: any) {
      showError(err.message || 'Could not update display name.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePasswordRecovery = async () => {
    setIsSendingReset(true);
    try {
      await sendPasswordReset(currentUser.email);
      showSuccess(`Password reset email sent to ${currentUser.email}.`);
    } catch (err: any) {
      showError(err.message || 'Could not send password recovery email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsReloading(true);
    try {
      const isVerified = await reloadUser();
      if (isVerified) {
        showSuccess('University email verified successfully! Full access is now enabled.');
      } else {
        showError(
          'Email is not yet verified. Please open the link sent to your inbox by Firebase, then click Check again.'
        );
      }
    } catch (err: any) {
      showError(err.message || 'Error checking verification status.');
    } finally {
      setIsReloading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsSendingVerification(true);
    try {
      await resendVerificationEmail();
      showSuccess('Verification link resent. Please check your inbox.');
    } catch (err: any) {
      showError(err.message || 'Could not resend verification email.');
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>Profile and account</h1>
          <p>Manage your campus profile, verification and account access.</p>
        </div>
      </div>

      {toast && (
        <div
          className="safety-note"
          style={{ maxWidth: '800px', marginBottom: '20px', background: 'var(--green-soft)', color: 'var(--success)' }}
        >
          <Icon name="check" />
          <span>{toast}</span>
        </div>
      )}

      {errorToast && (
        <div
          className="error-panel"
          style={{ maxWidth: '800px', marginBottom: '20px' }}
        >
          <Icon name="alert" />
          <span>{errorToast}</span>
        </div>
      )}

      <div className="profile-card">
        <div className="profile-head">
          <span>{currentUser.initials}</span>
          <div>
            <h2>{currentUser.displayName}</h2>
            <p>{currentUser.email}</p>
          </div>
          <Badge tone={currentUser.isVerified ? 'success' : 'warning'}>
            {currentUser.isVerified ? 'Email verified' : 'Email not verified'}
          </Badge>
        </div>

        {!currentUser.isVerified && (
          <div className="warning-box" style={{ marginBottom: '24px' }}>
            <Icon name="alert" />
            <div style={{ flex: 1 }}>
              <p>
                <b>Verify your university email to continue</b>
                <br />
                Browsing, reporting, and recovery actions require a verified student account ending in{' '}
                <code>@tut4life.ac.za</code>.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                <Button
                  style={{ minHeight: '34px', fontSize: '12px' }}
                  onClick={handleCheckVerification}
                  disabled={isReloading}
                >
                  {isReloading ? 'Checking...' : 'Check verification status'}
                </Button>
                <Button
                  variant="secondary"
                  style={{ minHeight: '34px', fontSize: '12px' }}
                  onClick={handleResendVerification}
                  disabled={isSendingVerification}
                >
                  {isSendingVerification ? 'Sending...' : 'Resend verification email'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="profile-fields">
          <FormField
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <FormField
            label="Account email"
            value={currentUser.email}
            disabled
            helperText="University campus email address cannot be changed."
          />
        </div>

        <div className="profile-actions">
          <Button onClick={handleSaveName} disabled={isSavingName}>
            {isSavingName ? 'Saving...' : 'Save display name'}
          </Button>
          <Button variant="secondary" onClick={handlePasswordRecovery} disabled={isSendingReset}>
            {isSendingReset ? 'Sending...' : 'Send password recovery link'}
          </Button>
          <Button variant="ghost" icon="logout" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </>
  );
};
