import React from 'react';

export default function Chip({
  label,
  onRemove,
  icon,
  variant = 'default',
  className = ''
}) {
  const variantStyles = {
    default: 'bg-secondary-container/60 text-on-secondary-container border border-secondary-container',
    allergy: 'bg-error-container/70 text-on-error-container border border-error-container',
    condition: 'bg-surface-container-high text-on-surface border border-outline-variant/50'
  };

  return (
    <div
      className={`inline-flex items-center gap-space-xs h-11 px-space-md rounded-full font-label-md select-none transition-all ${
        variantStyles[variant] || variantStyles.default
      } ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 active:scale-95 transition-all text-current"
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}

