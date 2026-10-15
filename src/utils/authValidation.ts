/**
 * CampusFind Authentication & Domain Validation Utilities
 *
 * Confirmed campus domain: tut4life.ac.za (Students)
 * Staff domains are unconfirmed and deliberately excluded.
 */

export const ALLOWED_STUDENT_DOMAIN = 'tut4life.ac.za';

/**
 * Validates whether an email belongs strictly to the allowed student domain.
 * Rejects lookalike domains (e.g. tut4life.ac.za.attacker.com), subdomains, or unconfirmed domains.
 */
export function isAllowedStudentDomain(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();

  // Ensure there is exactly one '@' character
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domainPart] = parts;

  // Local part must not be empty
  if (!localPart || localPart.length === 0) return false;

  // Domain must exactly equal the confirmed student domain
  return domainPart === ALLOWED_STUDENT_DOMAIN;
}

/**
 * Maps Firebase Auth error codes to user-friendly, consistent messages.
 */
export function getFirebaseErrorMessage(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Invalid email address format. Please use your valid @tut4life.ac.za student email.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email address or password. Please verify your details.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Access has been temporarily restricted. Please reset your password or try again later.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/user-disabled':
      return 'This campus account has been disabled. Please contact campus administration.';
    case 'auth/requires-recent-login':
      return 'This action requires recent authentication. Please sign in again to continue.';
    default:
      return error?.message || 'An unexpected authentication error occurred. Please try again.';
  }
}

