import React from 'react';
import { Icon } from './Icon';

export interface LogoProps {
  compact?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ compact = false }) => {
  return (
    <div className="logo">
      <span className="logo-mark">
        <Icon name="search" size={22} />
        <i />
      </span>
      {!compact && (
        <span>
          Campus<span>Find</span>
        </span>
      )}
    </div>
  );
};

