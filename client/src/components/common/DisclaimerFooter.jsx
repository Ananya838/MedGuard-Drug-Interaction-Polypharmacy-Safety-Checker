import React from 'react';
import { useI18n } from '../../context/I18nContext.jsx';

export default function DisclaimerFooter({ className = '' }) {
  const { t } = useI18n();

  return (
    <footer
      className={`w-full py-space-lg px-space-md border-t border-border-subtle text-center flex flex-col items-center gap-2 ${className}`}
    >
      <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md font-bold">
        <span className="material-symbols-outlined text-[20px] text-primary">
          verified_user
        </span>
        <span>MedGuard Polypharmacy Screening Aid</span>
      </div>
      <p className="max-w-2xl text-on-surface-variant font-body-md text-body-md text-[16px] leading-relaxed">
        {t(
          'common.disclaimer',
          'MedGuard is a screening aid and does not replace a doctor or pharmacist. Consult a qualified healthcare professional before starting, stopping, or altering any medication.'
        )}
      </p>
    </footer>
  );
}

