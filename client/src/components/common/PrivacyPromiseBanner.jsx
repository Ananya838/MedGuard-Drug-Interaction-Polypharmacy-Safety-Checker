import React from 'react';
import { useI18n } from '../../context/I18nContext.jsx';

export default function PrivacyPromiseBanner({ className = '' }) {
  const { t } = useI18n();

  return (
    <div
      className={`bg-secondary-container/30 border-2 border-secondary-container/70 rounded-xl p-space-md flex items-start gap-space-md shadow-sm ${className}`}
    >
      <div className="w-11 h-11 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[24px]">lock</span>
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="font-label-lg text-label-lg font-bold text-on-secondary-container">
          {t('scanScreen.privacyBannerHeader', 'Your photos stay on this device')}
        </h4>
        <p className="font-body-md text-body-md text-on-surface leading-normal">
          {t(
            'scanScreen.privacyBannerText',
            'Packaging photos are processed locally on your phone or computer. Images are never uploaded to a cloud server or shared.'
          )}
        </p>
      </div>
    </div>
  );
}

