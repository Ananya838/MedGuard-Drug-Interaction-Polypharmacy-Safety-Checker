import React from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext.jsx';

export default function Sidebar() {
  const { t } = useI18n();

  const navItems = [
    { to: '/', label: t('nav.home', 'Home'), icon: 'home' },
    { to: '/patients', label: t('nav.patients', 'Patients'), icon: 'family_restroom' },
    { to: '/scan', label: t('nav.scanStrips', 'Scan Strips'), icon: 'document_scanner' },
    { to: '/schedule', label: t('nav.schedule', 'Schedule'), icon: 'calendar_month' },
    { to: '/settings', label: t('nav.settings', 'Settings'), icon: 'settings' }
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between py-space-lg px-gutter select-none no-print">
      {/* Brand & Navigation */}
      <div className="flex flex-col gap-space-lg">
        {/* App Logo */}
        <div className="flex items-center gap-space-sm px-space-xs">
          <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[28px]">verified_user</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-primary font-bold tracking-tight leading-none">
              {t('nav.suiteTitle', 'MedGuard')}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium mt-1 leading-tight">
              {t('nav.suiteSubtitle', 'Caregiver Suite')}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-space-xs">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-md text-label-md transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Info: AI Engine status & Elder Helpline */}
      <div className="flex flex-col gap-space-sm">
        {/* Local Engine Status */}
        <div className="flex items-center gap-space-sm p-space-sm bg-surface-container-low rounded-xl">
          <div className="w-3 h-3 rounded-full bg-tertiary-container animate-pulse shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-label-sm text-label-sm font-bold text-on-surface">
              {t('nav.engineReady', 'AI Engine Ready')}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant text-[13px]">
              {t('nav.engineSubtitle', 'On-device Indian Rx')}
            </span>
          </div>
        </div>

        {/* National Elder Helpline */}
        <div className="flex items-center gap-space-sm p-space-sm bg-secondary-container rounded-xl text-on-secondary-container">
          <span className="material-symbols-outlined text-[24px] shrink-0">
            support_agent
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-label-sm text-label-sm font-bold">
              {t('nav.elderHelpline', 'Elder Helpline')}
            </span>
            <span className="font-label-lg text-label-lg font-bold tracking-wide mt-0.5">
              {t('nav.helplineNumber', '14567')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

