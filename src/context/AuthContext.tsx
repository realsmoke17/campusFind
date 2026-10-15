import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { User } from '../types';
import { isAllowedStudentDomain, getFirebaseErrorMessage } from '../utils/authValidation';

export interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentUser: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
  updateDisplayName: (newName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseUser(fbUser: FirebaseUser | null, firestoreName?: string): User | null {
  if (!fbUser) return null;

  const email = fbUser.email || '';
  const domainOk = isAllowedStudentDomain(email);
  const isVerified = fbUser.emailVerified && domainOk;

  const displayName =
    firestoreName?.trim() ||
    fbUser.displayName?.trim() ||
    (email.includes('@') ? email.split('@')[0] : 'Campus Student');

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'CS';

  return {
    uid: fbUser.uid,
    displayName,
    email,
    role: isVerified ? 'finder' : 'unverified',
    isVerified,
    isAdmin: false, // Administrative privileges cannot be assigned by clients
    initials,
    roleLabel: isVerified ? 'Verified student' : 'Email not verified'
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize Firebase Auth user state and restore session
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        let firestoreDisplayName: string | undefined;
        try {
          // Attempt to read minimal profile document
          const profileSnap = await getDoc(doc(db, 'users', fbUser.uid));
          if (profileSnap.exists()) {
            firestoreDisplayName = profileSnap.data()?.displayName;
          }
        } catch {
          // Expected when initial deny-all security rules are in place
        }

        setCurrentUser(mapFirebaseUser(fbUser, firestoreDisplayName));
      } else {
        setCurrentUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    const trimmedEmail = email.trim();
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    // Usability check: strict domain matching
    if (!isAllowedStudentDomain(trimmedEmail)) {
      throw new Error(
        'Registration is restricted to confirmed @tut4life.ac.za student email addresses. Lookalike or unauthorized domains are rejected.'
      );
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

      // Update Firebase Auth display name
      if (trimmedName) {
        await updateProfile(cred.user, { displayName: trimmedName });
      }

      // Send Firebase verification email
      await sendEmailVerification(cred.user);

      // Store ONLY minimal profile information in users/{uid}
      // Never store passwords, roles, or administrative flags
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          displayName: trimmedName,
          createdAt: serverTimestamp()
        });
      } catch (firestoreErr) {
        // Will fail under initial deny-all Firestore rules until security rules are configured
        console.warn(
          '[Firestore] Minimal profile creation rejected by security rules (expected under deny-all rules):',
          firestoreErr
        );
      }

      // Update local state
      setFirebaseUser(cred.user);
      setCurrentUser(mapFirebaseUser(cred.user, trimmedName));
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setCurrentUser(null);
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      throw new Error('Please enter your university email address.');
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  const resendVerificationEmail = async (): Promise<void> => {
    if (!auth.currentUser) {
      throw new Error('No signed-in user found. Please sign in to request a verification email.');
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  // Requirement 6: Reload the user and refresh ID token without locally faking verified status
  const reloadUser = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;

    try {
      await auth.currentUser.reload();
      await auth.currentUser.getIdToken(true);

      const refreshed = auth.currentUser;
      setFirebaseUser(refreshed);

      let firestoreDisplayName: string | undefined;
      try {
        const profileSnap = await getDoc(doc(db, 'users', refreshed.uid));
        if (profileSnap.exists()) {
          firestoreDisplayName = profileSnap.data()?.displayName;
        }
      } catch {
        // Deny-all rules
      }

      const mapped = mapFirebaseUser(refreshed, firestoreDisplayName);
      setCurrentUser(mapped);

      return mapped?.isVerified ?? false;
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  const updateDisplayName = async (newName: string): Promise<void> => {
    const trimmed = newName.trim();
    if (!trimmed || !auth.currentUser) return;

    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });

      try {
        await setDoc(
          doc(db, 'users', auth.currentUser.uid),
          { displayName: trimmed },
          { merge: true }
        );
      } catch (fsErr) {
        console.warn('[Firestore] Profile update failed under security rules:', fsErr);
      }

      const mapped = mapFirebaseUser(auth.currentUser, trimmed);
      setCurrentUser(mapped);
    } catch (err: any) {
      throw new Error(getFirebaseErrorMessage(err));
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({
      firebaseUser,
      currentUser,
      loading,
      isFirebaseConfigured,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      resendVerificationEmail,
      reloadUser,
      updateDisplayName
    }),
    [firebaseUser, currentUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

