import { LostFoundItem, Claim, FlaggedListing } from '../types';
import { getDateDaysAgo } from '../utils/dateUtils';
import { DEMO_USERS } from './demoUsers';

export function getInitialItems(): LostFoundItem[] {
  const d0 = getDateDaysAgo(0);
  const d1 = getDateDaysAgo(1);
  const d2 = getDateDaysAgo(2);
  const d3 = getDateDaysAgo(3);
  const d5 = getDateDaysAgo(5);
  const d7 = getDateDaysAgo(7);

  return [
    {
      id: '1',
      title: 'Black backpack',
      type: 'Found',
      category: 'Bags',
      location: 'Library entrance',
      eventDate: d0.formatted,
      rawEventDate: d0.raw,
      reportedDate: d0.formatted,
      status: 'Open',
      visibility: 'visible',
      description: 'Medium black backpack with two main compartments. A distinctive detail has been kept private.',
      ownerUid: DEMO_USERS.finder.uid,
      ownerName: DEMO_USERS.finder.displayName,
      icon: 'bag',
      claims: 2
    },
    {
      id: '2',
      title: 'Set of silver keys',
      type: 'Lost',
      category: 'Keys',
      location: 'Lecture building',
      eventDate: d1.formatted,
      rawEventDate: d1.raw,
      reportedDate: d1.formatted,
      status: 'Open',
      visibility: 'visible',
      description: 'A small set of keys on a plain metal ring.',
      ownerUid: DEMO_USERS.claimant.uid,
      ownerName: DEMO_USERS.claimant.displayName,
      icon: 'key',
      claims: 0
    },
    {
      id: '3',
      title: 'Over-ear headphones',
      type: 'Found',
      category: 'Electronics',
      location: 'Student centre',
      eventDate: d2.formatted,
      rawEventDate: d2.raw,
      reportedDate: d2.formatted,
      status: 'Reserved',
      visibility: 'visible',
      description: 'Dark over-ear headphones found near the seating area.',
      ownerUid: DEMO_USERS.finder.uid,
      ownerName: DEMO_USERS.finder.displayName,
      icon: 'headphones',
      claims: 1
    },
    {
      id: '4',
      title: 'Student card',
      type: 'Found',
      category: 'Cards',
      location: 'Walkway near library',
      eventDate: d3.formatted,
      rawEventDate: d3.raw,
      reportedDate: d3.formatted,
      status: 'Open',
      visibility: 'visible',
      description: 'Student card with all personal details obscured in this listing.',
      ownerUid: DEMO_USERS.claimant.uid,
      ownerName: DEMO_USERS.claimant.displayName,
      icon: 'card',
      claims: 0
    },
    {
      id: '5',
      title: 'Navy rain jacket',
      type: 'Lost',
      category: 'Clothing',
      location: 'Lecture building foyer',
      eventDate: d5.formatted,
      rawEventDate: d5.raw,
      reportedDate: d5.formatted,
      status: 'Closed',
      visibility: 'visible',
      description: 'Lightweight navy jacket. No photograph available.',
      ownerUid: DEMO_USERS.finder.uid,
      ownerName: DEMO_USERS.finder.displayName,
      icon: 'image',
      claims: 0
    },
    {
      id: '6',
      title: 'Blue pencil case',
      type: 'Found',
      category: 'Other',
      location: 'Student centre',
      eventDate: d7.formatted,
      rawEventDate: d7.raw,
      reportedDate: d7.formatted,
      status: 'Returned',
      visibility: 'visible',
      description: 'Blue zip pencil case, returned to its claimant.',
      ownerUid: DEMO_USERS.finder.uid,
      ownerName: DEMO_USERS.finder.displayName,
      icon: 'box',
      claims: 1
    }
  ];
}

export function getInitialClaims(): Claim[] {
  const d0 = getDateDaysAgo(0);
  const d1 = getDateDaysAgo(1);
  const d2 = getDateDaysAgo(2);

  return [
    {
      id: 1,
      itemId: '1',
      itemTitle: 'Black backpack',
      claimantUid: DEMO_USERS.claimant.uid,
      claimantName: DEMO_USERS.claimant.displayName,
      date: d0.formatted,
      status: 'Pending',
      evidence: 'There is a small stitched orange mark beneath the left strap, and a green notebook is inside the front pocket.'
    },
    {
      id: 2,
      itemId: '1',
      itemTitle: 'Black backpack',
      claimantUid: 'user-other-05',
      claimantName: 'Sam K.',
      date: d1.formatted,
      status: 'Pending',
      evidence: 'The bag has a keyring inside. I can describe the contents when we meet.'
    },
    {
      id: 3,
      itemId: '3',
      itemTitle: 'Over-ear headphones',
      claimantUid: 'user-other-06',
      claimantName: 'Naledi P.',
      date: d2.formatted,
      status: 'Approved',
      evidence: 'The right ear cup has a thin scratch shaped like a crescent and the case contains a short black cable.'
    }
  ];
}

export function getInitialFlaggedListings(): FlaggedListing[] {
  const d1 = getDateDaysAgo(1);
  const d3 = getDateDaysAgo(3);

  return [
    {
      id: 101,
      itemId: '101',
      itemTitle: 'Red water bottle',
      itemType: 'Found',
      category: 'Other',
      reason: 'Personal details visible',
      submittedDate: d1.formatted,
      status: 'Needs review'
    },
    {
      id: 102,
      itemId: '102',
      itemTitle: 'Calculator',
      itemType: 'Lost',
      category: 'Electronics',
      reason: 'Duplicate report',
      submittedDate: d3.formatted,
      status: 'Resolved'
    }
  ];
}
