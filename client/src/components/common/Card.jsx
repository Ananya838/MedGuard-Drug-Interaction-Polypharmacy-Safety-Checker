import React from 'react';

export default function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-container-lowest rounded-xl p-space-lg border border-border-subtle shadow-[0_1px_4px_rgba(0,0,0,0.03)] ${
        hoverable ? 'hover:shadow-md hover:border-outline-variant/60 cursor-pointer transition-all' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

