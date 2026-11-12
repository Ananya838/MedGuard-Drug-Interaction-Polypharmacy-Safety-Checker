import React, { useState } from 'react';
import { useI18n } from '../../context/I18nContext.jsx';
import { useTextScale } from '../../context/TextScaleContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { locale, toggleLocale, t } = useI18n();
  const { isLargeText, toggleLargeText } = useTextScale();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('medguard_user') || '{}');
    } catch {
      return {};
    }
  })();
  const caregiverName = storedUser.name || 'Sunita Sharma';
  const initials = caregiverName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SS';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/patients?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-[260px] right-0 h-[70px] bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-xl no-print">
      {/* Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center gap-space-md flex-1 max-w-[420px]"
      >
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[22px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('topBar.searchPlaceholder', 'Search elder names or medicines...')}
            className="w-full h-11 pl-11 pr-space-md rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary"
          />
        </div>
      </form>

      {/* Action Controls */}
      <div className="flex items-center gap-space-md">
        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLocale}
          className="flex items-center gap-space-xs px-space-md h-11 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all font-label-md text-label-md"
          title="Switch language between English and Hindi"
        >
          <span className="material-symbols-outlined text-[20px]">language</span>
          <span>{locale === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        {/* Large Text Size Toggle (Presbyopia accessibility) */}
        <button
          type="button"
          onClick={toggleLargeText}
          className={`flex items-center justify-center w-11 h-11 rounded-xl font-label-lg text-label-lg transition-all ${
            isLargeText
              ? 'bg-primary text-on-primary font-bold shadow-sm ring-2 ring-primary/40'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
          }`}
          title={t('topBar.enlargeText', 'Enlarge Text Size')}
          aria-pressed={isLargeText}
        >
          A+
        </button>

        {/* Emergency SOS Button */}
        <a
          href="tel:112"
          className="flex items-center gap-space-xs px-space-md h-11 rounded-xl bg-error text-on-error font-label-md text-label-md shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">emergency</span>
          <span>{t('topBar.sosButton', 'SOS 108/112')}</span>
        </a>

        {/* Caregiver Profile */}
        <div
          onClick={() => navigate('/settings')}
          className="flex items-center gap-space-sm pl-space-xs border-l border-border-subtle cursor-pointer hover:opacity-85 transition-opacity"
          title="Open Caregiver Settings"
        >
          <div className="w-9 h-9 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center text-label-md shadow-sm">
            {initials}
          </div>
          <div className="hidden xl:flex flex-col text-left leading-tight">
            <span className="font-label-md text-label-md text-on-surface font-bold">
              {caregiverName}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              {t('topBar.primaryCaregiver', 'Primary Caregiver')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

