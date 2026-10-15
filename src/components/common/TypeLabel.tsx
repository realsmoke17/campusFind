import React from 'react';
import { ItemType } from '../../types';

export interface TypeLabelProps {
  type: ItemType;
  className?: string;
}

export const TypeLabel: React.FC<TypeLabelProps> = ({ type, className = '' }) => {
  return (
    <span className={`type-label ${type.toLowerCase()} ${className}`}>
      {type}
    </span>
  );
};

