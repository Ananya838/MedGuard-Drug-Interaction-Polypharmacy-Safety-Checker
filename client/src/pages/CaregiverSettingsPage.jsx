import React from 'react';
import { useI18n } from '../context/I18nContext.jsx';
import { useTextScale } from '../context/TextScaleContext.jsx';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import PrivacyPromiseBanner from '../components/common/PrivacyPromiseBanner.jsx';
import { logout, deleteAccount } from '../api/auth.js';
import { useNavigate } from 'react-router-dom';

export default function CaregiverSettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { isLargeText, toggleLargeText } = useTextScale();
  const navigate = useNavigate();

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('medguard_user') || '{}');
    } catch {
      return {};
    }
  })();
  const caregiverName = user.name || 'Sunita Sharma';
  const caregiverEmail = user.email || 'sunita.caregiver@example.com';
  const caregiverPhone = user.phone || '+91 98111 22233';
  const initials = caregiverName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SS';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account and all elder data? This action is permanent.")) {
      await deleteAccount();
      navigate('/login');
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-lg max-w-4xl">
      <div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
          {t('settingsScreen.title', 'Caregiver & App Settings')}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t('settingsScreen.subtitle', 'Manage preferences, accessibility options, and data privacy.')}
        </p>
      </div>

      {/* Profile Section */}
      <Card className="flex flex-col gap-space-md">
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          {t('settingsScreen.profileSection', 'Caregiver Profile')}
        </h2>
        <div className="flex items-center gap-space-md">
          <div className="w-16 h-16 rounded-full bg-primary text-on-primary font-bold text-headline-sm flex items-center justify-center">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-[20px] font-bold text-on-surface">
              {caregiverName}
            </span>
            <span className="text-on-surface-variant font-body-md">
              {caregiverEmail} {caregiverPhone ? `• ${caregiverPhone}` : ''}
            </span>
            <span className="text-primary font-label-sm font-semibold mt-0.5">
              Primary Caregiver Suite
            </span>
          </div>
        </div>
      </Card>

      {/* Accessibility Section */}
      <Card className="flex flex-col gap-space-md">
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          {t('settingsScreen.accessibilitySection', 'Accessibility Options')}
        </h2>

        {/* Large Text Mode Toggle */}
        <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl">
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg font-bold text-on-surface">
              {t('settingsScreen.largeTextToggle', 'Large Text Mode')}
            </span>
            <span className="text-on-surface-variant font-body-md text-[15px]">
              Expands body font by 1.2x (to 21.6px) for comfortable reading without eye strain
            </span>
          </div>
          <button
            type="button"
            onClick={toggleLargeText}
            className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 ${
              isLargeText ? 'bg-primary' : 'bg-outline-variant'
            }`}
            aria-checked={isLargeText}
            role="switch"
          >
            <span
              className={`w-6 h-6 rounded-full bg-white transition-transform ${
                isLargeText ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Language Preference */}
        <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl">
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg font-bold text-on-surface">
              {t('settingsScreen.languagePreference', 'Preferred Language')}
            </span>
            <span className="text-on-surface-variant font-body-md text-[15px]">
              Select language for warnings, directions, and labels
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`px-4 py-2 rounded-xl font-label-md transition-all ${
                locale === 'en'
                  ? 'bg-primary text-on-primary font-bold shadow-sm'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLocale('hi')}
              className={`px-4 py-2 rounded-xl font-label-md transition-all ${
                locale === 'hi'
                  ? 'bg-primary text-on-primary font-bold shadow-sm'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </Card>

      {/* Privacy Promise Banner */}
      <PrivacyPromiseBanner />

      {/* Account Controls */}
      <Card className="flex flex-col gap-space-md">
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
          Account Actions
        </h2>
        <div className="flex flex-wrap items-center gap-space-md">
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>{t('settingsScreen.logout', 'Log Out')}</span>
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            className="gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            <span>{t('settingsScreen.deleteAccount', 'Delete Account & All Data')}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

