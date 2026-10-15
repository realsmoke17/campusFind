import React from 'react';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  action?: React.ReactNode;
  helperText?: string;
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  action,
  helperText,
  error,
  required,
  id,
  className = '',
  ...rest
}) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label className={`field ${className}`} htmlFor={inputId}>
      <span>
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <div className="input-wrap">
        <input
          id={inputId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
          {...rest}
        />
        {action}
      </div>
      {error ? (
        <small id={`${inputId}-error`} style={{ color: 'var(--error)' }}>
          {error}
        </small>
      ) : helperText ? (
        <small id={`${inputId}-help`}>{helperText}</small>
      ) : null}
    </label>
  );
};

