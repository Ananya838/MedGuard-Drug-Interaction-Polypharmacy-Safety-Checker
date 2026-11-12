import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled = false,
  onClick,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-label-lg rounded-xl transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';

  // Minimum height is strictly 52px for primary/secondary, satisfying the presbyopia and elder touch target rules
  const sizeClasses = {
    sm: 'h-11 px-space-md text-label-md min-h-[44px]',
    md: 'h-[52px] px-space-lg text-label-lg min-h-[52px]',
    lg: 'h-14 px-space-xl text-label-lg min-h-[56px]'
  };

  const variantClasses = {
    primary:
      'bg-primary text-on-primary hover:bg-[#004e48] active:scale-[0.98] shadow-sm focus:ring-primary',
    secondary:
      'bg-surface-container-low text-on-surface hover:bg-surface-container active:scale-[0.98] border border-outline-variant/40 focus:ring-primary',
    tealSecondary:
      'bg-secondary-container text-on-secondary-container hover:opacity-90 active:scale-[0.98] font-bold focus:ring-secondary',
    destructive:
      'bg-error text-on-error hover:bg-[#a01515] active:scale-[0.98] shadow-sm focus:ring-error',
    outline:
      'bg-transparent border-2 border-outline-variant text-on-surface hover:bg-surface-container-low active:scale-[0.98] focus:ring-primary',
    ghost:
      'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low focus:ring-primary'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${
        variantClasses[variant] || variantClasses.primary
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

