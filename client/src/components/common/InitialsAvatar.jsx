import React from 'react';

export default function InitialsAvatar({
  name = '',
  size = 'md',
  className = '',
  showPulse = false
}) {
  const getInitials = (n) => {
    if (!n) return 'MG';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeStyles = {
    sm: 'w-9 h-9 text-label-sm min-w-[36px]',
    md: 'w-12 h-12 text-label-lg min-w-[48px]',
    lg: 'w-16 h-16 text-headline-sm min-w-[64px]'
  };

  // Deterministic soft color generation based on name
  const bgColors = [
    'bg-primary-container text-on-primary',
    'bg-secondary-container text-on-secondary-container',
    'bg-surface-container-high text-primary',
    'bg-primary text-on-primary'
  ];
  const charCode = name ? name.charCodeAt(0) : 0;
  const colorClass = bgColors[charCode % bgColors.length];

  return (
    <div
      className={`relative rounded-xl flex items-center justify-center font-bold select-none shadow-sm ${
        sizeStyles[size] || sizeStyles.md
      } ${colorClass} ${className}`}
      aria-label={name}
      title={name}
    >
      <span>{getInitials(name)}</span>
      {showPulse && (
        <span
          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-error rounded-full ring-2 ring-surface-container-lowest"
          title="Attention required"
        />
      )}
    </div>
  );
}

