import { User, UserRole } from '../types';

export const DEMO_USERS: Record<UserRole, User> = {
  finder: {
    uid: 'user-finder-01',
    displayName: 'Thandi Mokoena',
    email: 't.mokoena@tut4life.ac.za',
    role: 'finder',
    isVerified: true,
    isAdmin: false,
    initials: 'TM',
    roleLabel: 'Verified user'
  },
  claimant: {
    uid: 'user-claimant-02',
    displayName: 'Kabelo Dlamini',
    email: 'k.dlamini@tut4life.ac.za',
    role: 'claimant',
    isVerified: true,
    isAdmin: false,
    initials: 'KD',
    roleLabel: 'Verified user'
  },
  unverified: {
    uid: 'user-unverified-03',
    displayName: 'Sipho Zulu',
    email: 's.zulu@tut4life.ac.za',
    role: 'unverified',
    isVerified: false,
    isAdmin: false,
    initials: 'SZ',
    roleLabel: 'Email not verified'
  },
  admin: {
    uid: 'user-admin-04',
    displayName: 'Refilwe Molefe',
    email: 'r.molefe@tut.ac.za',
    role: 'admin',
    isVerified: true,
    isAdmin: true,
    initials: 'RM',
    roleLabel: 'Administrator demo'
  }
};

