import React from 'react';

export type BadgeTone = 'success' | 'warning' | 'blue' | 'neutral';

export function getStatusTone(status: string): BadgeTone {
  switch (status) {
    case 'Open':
    case 'Approved':
      return 'success';
    case 'Reserved':
    case 'Pending':
      return 'warning';
    case 'Returned':
      return 'blue';
    default:
      return 'neutral';
  }
}

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, tone = 'neutral', className = '' }) => {
  return (
    <span className={`badge badge-${tone} ${className}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
};

