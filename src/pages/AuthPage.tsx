import React, { useState, useEffect } from 'react';
import { Logo } from '../components/common/Logo';
import { Icon } from '../components/common/Icon';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { useAuth } from '../context/AuthContext';
import { isAllowedStudentDomain } from '../utils/authValidation';

export type AuthMode = 'signin' | 'register' | 'forgot' | 'verify';

export interface AuthPageProps {
  initialMode?: AuthMode;
  onSuccess: () => void;
  onCancelToWelcome: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'signin',
  onSuccess,
  onCancelToWelcome
}) => {
  const {
    signIn,
    signUp,
    sendPasswordReset,
    resendVerificationEmail,
    reloadUser,
    firebaseUser,
    currentUser,
    isFirebaseConfigured
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status feedback
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend verification
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // If already authenticated and email is verified, advance
  useEffect(() => {
    if (currentUser?.isVerified) {
      onSuccess();
    }
  }, [currentUser, onSuccess]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!isFirebaseConfigured) {
      setError(
        'Firebase configuration is missing in .env.local. Please add your credentials from Firebase Console before signing in.'
      );
      return;
    }

    const trimmedEmail = email.trim();

    // 1. Validate email input
    if (!trimmedEmail) {
      setError('University email address is required.');
      return;
    }

    // Usability check: strict student email domain validation
    if (mode === 'register' && !isAllowedStudentDomain(trimmedEmail)) {
      setError(
        'Registration is restricted strictly to @tut4life.ac.za student accounts. Lookalike or unauthorized domains are rejected.'
      );
      return;
    }

    // 2. Forgot Password Flow
    if (mode === 'forgot') {
      setIsSubmitting(true);
      try {
        await sendPasswordReset(trimmedEmail);
        setInfoMessage(`Password reset link sent to ${trimmedEmail}. Please check your inbox.`);
      } catch (err: any) {
        setError(err.message || 'Failed to send password reset email.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 3. Password Validation
    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // 4. Registration Flow
    if (mode === 'register') {
      if (!displayName.trim()) {
        setError('Display name is required.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setIsSubmitting(true);
      try {
        await signUp(trimmedEmail, password, displayName.trim());
        setMode('verify');
        setInfoMessage(
          `Verification email sent to ${trimmedEmail}. Please click the link in your email to activate access.`
        );
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 5. Sign-in Flow
    setIsSubmitting(true);
    try {
      await signIn(trimmedEmail, password);
      // AuthProvider onAuthStateChanged will handle session and user mapping
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Requirement 6: Reload the user and refresh token without local fake bypass
  const handleCheckVerification = async () => {
    setError('');
    setInfoMessage('');
    setIsCheckingVerification(true);

    try {
      const isVerified = await reloadUser();
      if (isVerified) {
        onSuccess();
      } else {
        setError(
          'Your email is not verified yet. Please check your inbox (including spam/junk), click the verification link from Firebase, and try again.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Could not verify status. Please try again.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setInfoMessage('');

    try {
      await resendVerificationEmail();
      setInfoMessage('A fresh verification link has been sent to your university email.');
      setResendCooldown(45);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    }
  };

  // Screen: Email Verification Required
  if (mode === 'verify') {
    const targetEmail = email || firebaseUser?.email || 'your @tut4life.ac.za email';

    return (
      <main className="auth-page">
        <div className="auth-card verify-card">
          <Logo />
          <div className="mail-icon">
            <Icon name="file" size={30} />
          </div>
          <h1>Check your university email</h1>
          <p>
            We sent an official verification link to <strong>{targetEmail}</strong>.
          </p>

          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '8px 0 16px', lineHeight: 1.5 }}>
            Open your university email, click the verification link, and then return here to confirm.
          </p>

          {error && (
            <div className="error-panel" role="alert" style={{ marginBottom: '16px' }}>
              <Icon name="alert" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="info-line" style={{ marginBottom: '16px' }}>
              <Icon name="check" />
              <span>{infoMessage}</span>
            </div>
          )}

          <Button
            className="full"
            onClick={handleCheckVerification}
            disabled={isCheckingVerification}
          >
            {isCheckingVerification ? 'Checking verification status...' : 'I have verified my email'}
          </Button>

          <Button
            variant="secondary"
            className="full"
            onClick={handleResendVerification}
            disabled={resendCooldown > 0}
            style={{ marginTop: '8px' }}
          >
            {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend verification email'}
          </Button>

          <div className="auth-links">
            <button
              type="button"
              onClick={() => {
                setError('');
                setInfoMessage('');
                setMode('register');
              }}
            >
              Change email
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setInfoMessage('');
                setMode('signin');
              }}
            >
              Sign out / Sign in
            </button>
          </div>
        </div>
        <p className="project-foot">CampusFind — student project for the TUT community.</p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo />
          <button
            type="button"
            className="text-btn"
            style={{ fontSize: '12px' }}
            onClick={onCancelToWelcome}
          >
            ← Welcome
          </button>
        </div>

        <div className="auth-heading">
          <h1>
            {mode === 'register'
              ? 'Create your account'
              : mode === 'forgot'
              ? 'Reset your password'
              : 'Welcome back'}
          </h1>
          <p>
            {mode === 'forgot'
              ? 'Enter your university email to receive a password reset link.'
              : mode === 'register'
              ? 'Enter your @tut4life.ac.za student email to get started.'
              : 'Use your university email to continue.'}
          </p>
        </div>

        {error && (
          <div className="error-panel" role="alert" style={{ marginBottom: '16px' }}>
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="info-line" style={{ marginBottom: '16px' }}>
            <Icon name="check" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} noValidate>
          {mode === 'register' && (
            <FormField
              label="Display name"
              placeholder="Your full name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}

          <FormField
            label="University email"
            type="email"
            placeholder="studentnumber@tut4life.ac.za"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText={mode === 'register' ? 'Must be a student email ending in @tut4life.ac.za' : undefined}
            required
          />

          {mode !== 'forgot' && (
            <FormField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              action={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              }
            />
          )}

          {mode === 'register' && (
            <FormField
              label="Confirm password"
              type="password"
              placeholder="Enter password again"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          <Button className="full" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'register'
                ? 'Creating account...'
                : mode === 'forgot'
                ? 'Sending reset link...'
                : 'Signing in...'
              : mode === 'register'
              ? 'Create account'
              : mode === 'forgot'
              ? 'Send reset link'
              : 'Sign in'}
          </Button>
        </form>

        {mode === 'signin' && (
          <button
            type="button"
            className="forgot"
            onClick={() => {
              setError('');
              setInfoMessage('');
              setMode('forgot');
            }}
          >
            Forgot password?
          </button>
        )}

        {mode === 'forgot' ? (
          <p className="switch">
            Remembered it?{' '}
            <button
              type="button"
              onClick={() => {
                setError('');
                setInfoMessage('');
                setMode('signin');
              }}
            >
              Back to sign in
            </button>
          </p>
        ) : (
          <p className="switch">
            {mode === 'register' ? 'Already have an account?' : 'New to CampusFind?'}{' '}
            <button
              type="button"
              onClick={() => {
                setError('');
                setInfoMessage('');
                setMode(mode === 'register' ? 'signin' : 'register');
              }}
            >
              {mode === 'register' ? 'Sign in' : 'Create account'}
            </button>
          </p>
        )}
      </div>

      <p className="project-foot">CampusFind — student project for the TUT community.</p>
    </main>
  );
};
