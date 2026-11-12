import React from 'react';

export default function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  onClear,
  placeholder,
  icon,
  error,
  helperText,
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="font-label-md text-on-surface flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </span>
        </label>
      )}
      <div className="relative flex items-center w-full">
        {icon && (
          <span className="material-symbols-outlined absolute left- space-md left-4 text-outline text-[22px] pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full min-h-[56px] h-14 rounded-xl bg-surface-container-lowest text-on-surface font-body-lg text-body-lg placeholder:text-outline border-2 transition-all focus:outline-none ${
            icon ? 'pl-12' : 'pl-4'
          } ${onClear && value ? 'pr-12' : 'pr-4'} ${
            error
              ? 'border-error focus:ring-2 focus:ring-error'
              : 'border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20'
          }`}
          {...props}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 w-10 h-10 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-low transition-all"
            aria-label="Clear input"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>
      {error && (
        <span className="text-error font-label-sm text-label-sm mt-0.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="text-on-surface-variant font-label-sm text-label-sm mt-0.5">
          {helperText}
        </span>
      )}
    </div>
  );
}

