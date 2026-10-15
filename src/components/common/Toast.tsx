import React from 'react';
import { Icon } from './Icon';

export interface ToastProps {
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>
        <Icon name="check" size={18} />
      </span>
      {message}
    </div>
  );
};

