import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients } from '../api/patients.js';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import InitialsAvatar from '../components/common/InitialsAvatar.jsx';
import SeverityBadge from '../components/common/SeverityBadge.jsx';

export default function HomeDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('medguard_user') || '{}');
    } catch {
      return {};
    }
  })();
  const caregiverFirstName = user.name ? user.name.split(' ')[0] : 'Sunita';

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPatients();
        setPatients(data);
      } catch (err) {
        console.error("Failed to load patients", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex flex-col w-full gap-space-xl">
      {/* Welcome Banner & Quick Action Bar */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md mb-1">
            <span className="material-symbols-outlined text-[20px]">waving_hand</span>
            <span>{t('dashboard.welcome', `Good morning, ${caregiverFirstName}`)}</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            {t('dashboard.monitoredEldersTitle', 'Family Elders Under Care')}
            <span className="text-primary font-normal ml-2">({patients.length} Active Profiles)</span>
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {t(
              'dashboard.subtitle',
              'Polypharmacy safety monitor for your family elders.'
            )}
          </p>
        </div>

        {/* Primary Quick Actions */}
        <div className="flex flex-wrap items-center gap-space-md">
          <Button
            variant="primary"
            onClick={() => navigate('/patients/new')}
            className="gap-space-xs shadow-md"
          >
            <span className="material-symbols-outlined text-[22px]">person_add</span>
            <span>+ {t('dashboard.addElder', 'Add Elder Profile')}</span>
          </Button>
          <Button
            variant="tealSecondary"
            onClick={() => navigate('/scan')}
            className="gap-space-xs shadow-sm"
          >
            <span className="material-symbols-outlined text-[22px]">photo_camera</span>
            <span>{t('dashboard.scanNewStrip', 'Scan Medicine Strip')}</span>
          </Button>
        </div>
      </section>

      {/* 3-Column Key Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
        {/* Stat 1: Safety Alert Status */}
        <Card className="flex flex-col justify-between border-error/30 bg-surface-container-lowest">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                {t('dashboard.activeRisks', 'Safety Alert Status')}
              </span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-error">1</span>
                <span className="font-label-md text-label-md font-bold text-error">
                  {t('severity.major', 'Major Conflict')}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
          </div>
          <div className="my-space-md bg-surface-container-low p-space-sm rounded-xl">
            <div className="flex items-center gap-space-xs text-on-surface font-label-sm text-label-sm font-bold">
              <span className="material-symbols-outlined text-error text-[18px]">emergency</span>
              <span>Ramesh Sharma</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant text-[15px] mt-0.5 leading-snug">
              Warfarin + Aspirin overlap increases bleeding risk.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => navigate('/report/pat-001')}
            className="w-full gap-space-xs"
          >
            <span className="material-symbols-outlined text-[20px]">report</span>
            <span>{t('dashboard.viewReport', 'View Safety Report')}</span>
          </Button>
        </Card>

        {/* Stat 2: Today's Dose Adherence */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                {t('dashboard.todaySchedule', 'Doses Today')}
              </span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-primary">75%</span>
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                  Completed
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px]">schedule</span>
            </div>
          </div>
          <div className="my-space-md">
            <div className="flex justify-between items-center mb-1.5 font-label-sm text-label-sm text-on-surface">
              <span>3 of 4 routine doses confirmed</span>
              <span className="font-bold text-tertiary">1 Pending</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden flex">
              <div className="bg-primary h-full rounded-full transition-all duration-500 w-[75%]" />
            </div>
            <div className="flex items-center gap-2 mt-2 text-on-surface-variant font-label-sm text-label-sm text-[13px]">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              <span>Next scheduled: Ramesh's Warf 5 at 9:30 PM</span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/schedule')}
            className="w-full gap-space-xs"
          >
            <span className="material-symbols-outlined text-[20px]">event_available</span>
            <span>View Full Routine</span>
          </Button>
        </Card>

        {/* Stat 3: Privacy & AI Shield */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                Privacy & On-Device AI
              </span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-tertiary">100%</span>
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                  Local Guardian
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px]">shield_lock</span>
            </div>
          </div>
          <div className="my-space-md space-y-2">
            <div className="flex items-center gap-space-xs text-on-surface font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
              <span>Zero cloud photo transmission</span>
            </div>
            <div className="flex items-center gap-space-xs text-on-surface font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
              <span>Deterministic interaction engine</span>
            </div>
            <div className="flex items-center gap-space-xs text-on-surface font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-tertiary text-[20px]">check_circle</span>
              <span>Indian brand & generic mapping</span>
            </div>
          </div>
          <div className="h-11 w-full rounded-xl bg-surface-container-low text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-space-xs">
            <span className="material-symbols-outlined text-[20px] text-tertiary">lock</span>
            <span>On-device screening active</span>
          </div>
        </Card>
      </section>

      {/* Main Layout: Left 8-col Elder Profiles, Right 4-col Quick Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        {/* Left Column: Elder Profiles */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
              {t('dashboard.monitoredEldersTitle', 'Monitored Family Elders')}
            </h2>
            <button
              onClick={() => navigate('/patients')}
              className="text-primary font-label-md text-label-md font-bold hover:underline"
            >
              View All ({patients.length}) →
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-on-surface-variant font-label-md">
              {t('common.loading', 'Loading elders...')}
            </div>
          ) : (
            patients.map((pat) => (
              <article
                key={pat.id}
                className="bg-surface-container-lowest p-space-lg rounded-xl border border-border-subtle shadow-sm flex flex-col gap-space-md hover:border-outline-variant/60 transition-all"
              >
                {/* Top Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
                  <div className="flex items-center gap-space-md">
                    <InitialsAvatar
                      name={pat.name}
                      size="lg"
                      showPulse={pat.id === 'pat-001'}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-space-xs">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          {pat.name}
                        </h3>
                        <span className="font-label-sm text-label-sm bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-semibold">
                          {pat.age} {t('common.years', 'yrs')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-space-xs text-on-surface-variant font-body-md text-body-md text-[15px] mt-0.5">
                        <span>Blood: <strong>{pat.bloodGroup || 'Not specified'}</strong></span>
                        <span>•</span>
                        <span>Emergency: <strong>{pat.emergencyContact?.name}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <span className="px-space-md py-1.5 rounded-full bg-surface-container font-label-md text-label-md text-primary font-bold">
                      {pat.medicines?.length || 0} {t('patient.currentMedicines', 'Current Medicines')}
                    </span>
                  </div>
                </div>

                {/* Chronic Conditions & Allergies Chips */}
                <div className="flex flex-wrap gap-space-xs">
                  {pat.conditions?.map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold"
                    >
                      {typeof c === 'string' ? c : (c.label || c.name || c.code || String(c))}
                    </span>
                  ))}
                  {pat.allergies?.map((a, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      Allergy: {typeof a === 'string' ? a : (a.name || a.label || a.id || String(a))}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs border-t border-border-subtle/60">
                  <div className="flex items-center gap-space-sm">
                    {pat.id === 'pat-001' ? (
                      <SeverityBadge severity="major" />
                    ) : (
                      <SeverityBadge severity="none" />
                    )}
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/patients/${pat.id}`)}
                    >
                      {t('dashboard.viewDetails', 'View Details')}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/report/${pat.id}`)}
                    >
                      {t('patient.runCheck', 'Run Safety Check')}
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Right Column: Quick Caregiver Actions */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          <Card className="flex flex-col gap-space-md">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {t('dashboard.quickActions', 'Quick Actions')}
            </h3>

            <button
              onClick={() => navigate('/scan')}
              className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">document_scanner</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg font-bold text-on-surface">
                  {t('dashboard.scanNewStrip', 'Scan Medicine Strip')}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t('dashboard.scanSubtitle', 'Identify medicines from photos')}
                </span>
              </div>
            </button>

            <button
              onClick={() => navigate('/emergency/pat-001')}
              className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">badge</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg font-bold text-on-surface">
                  {t('patient.emergencyCard', 'Emergency Medical Card')}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  One-tap access for doctors & ER
                </span>
              </div>
            </button>

            <button
              onClick={() => navigate('/schedule')}
              className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">alarm</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg font-bold text-on-surface">
                  {t('nav.schedule', 'Daily Medication Schedule')}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Track doses across 4 time slots
                </span>
              </div>
            </button>
          </Card>

          {/* Emergency Helplines Notice */}
          <Card className="bg-secondary-container/30 border-secondary-container/60 flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs text-on-secondary-container font-bold font-label-md">
              <span className="material-symbols-outlined text-[22px]">contact_phone</span>
              <span>Emergency Help (India)</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface text-[15px]">
              National Emergency: <strong>112</strong> / Ambulance: <strong>108</strong>
              <br />
              Elder Line (Toll-Free): <strong>14567</strong>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

