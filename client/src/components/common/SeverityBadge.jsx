import React from 'react';
import { useI18n } from '../../context/I18nContext.jsx';

export default function SeverityBadge({
  severity = 'none',
  customLabel,
  showIcon = true,
  className = ''
}) {
  const { t } = useI18n();

  const configs = {
    major: {
      icon: 'warning',
      defaultLabel: t('severity.major', 'Major Conflict'),
      badgeClasses: 'bg-error-container text-on-error-container border-2 border-error'
    },
    moderate: {
      icon: 'help_outline',
      defaultLabel: t('severity.moderate', 'Moderate Conflict'),
      badgeClasses: 'bg-warning-container text-on-warning-container border-2 border-warning'
    },
    minor: {
      icon: 'info',
      defaultLabel: t('severity.minor', 'Minor Precaution'),
      badgeClasses: 'bg-caution-container text-on-caution-container border-2 border-caution'
    },
    none: {
      icon: 'verified_user',
      defaultLabel: t('severity.none', 'No Known Interaction'),
      badgeClasses: 'bg-secondary-container text-on-secondary-container border-2 border-secondary'
    }
  };

  const current = configs[severity?.toLowerCase()] || configs.none;
  const label = customLabel || current.defaultLabel;

  return (
    <div
      role="status"
      className={`inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-full font-label-md text-label-md font-bold tracking-tight shadow-sm select-none ${current.badgeClasses} ${className}`}
    >
      {showIcon && (
        <span className="material-symbols-outlined text-[20px] font-bold" aria-hidden="true">
          {current.icon}
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}

