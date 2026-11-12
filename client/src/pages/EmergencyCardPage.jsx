import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientById } from '../api/patients.js';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import InitialsAvatar from '../components/common/InitialsAvatar.jsx';

export default function EmergencyCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPatientById(id || 'pat-001');
        setPatient(data);
      } catch (err) {
        console.error("Failed to load patient", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center font-label-lg text-on-surface-variant">
        {t('common.loading', 'Loading emergency card...')}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-20 text-center">
        <h2>Patient not found</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-space-lg max-w-4xl mx-auto">
      {/* Header and Print Control */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="font-headline-lg font-bold text-on-surface">
            {t('emergencyCardScreen.title', 'Emergency Medical Card')}
          </h1>
          <p className="font-body-md text-on-surface-variant">
            {t('emergencyCardScreen.subtitle', 'Keep this card accessible in case of medical emergencies or hospitalization.')}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => window.print()}
          className="gap-2 shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">print</span>
          <span>{t('emergencyCardScreen.printCard', 'Print Emergency Card')}</span>
        </Button>
      </div>

      {/* Emergency Physical Card Representation */}
      <div className="bg-surface-container-lowest rounded-2xl border-4 border-error/70 p-space-xl shadow-xl flex flex-col gap-space-lg print:border-2 print:p-4">
        {/* Top Emergency Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pb-space-md border-b-2 border-border-subtle">
          <div className="flex items-center gap-space-md">
            <InitialsAvatar
              name={patient.name}
              size="lg"
              className="w-20 h-20 text-[28px]"
            />
            <div className="flex flex-col">
              <span className="font-label-sm text-error font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">emergency</span>
                CRITICAL MEDICAL PROFILE
              </span>
              <h2 className="font-headline-lg text-[28px] font-bold text-on-surface">
                {patient.name}
              </h2>
              <span className="font-body-md text-on-surface-variant">
                DOB: {patient.dob || '1952-04-12'} ({patient.age} yrs) • Gender: {patient.gender}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="px-space-md py-2 rounded-xl bg-error text-on-error font-headline-md font-bold tracking-wider shadow-sm">
              BLOOD: {patient.bloodGroup || 'B+'}
            </div>
            <span className="text-outline font-label-sm mt-1">UID: {patient.id.toUpperCase()}</span>
          </div>
        </div>

        {/* 2-Column Emergency Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          {/* Critical Allergies */}
          <div className="bg-error-container/60 border-2 border-error/50 rounded-xl p-space-md flex flex-col gap-1">
            <span className="font-label-md font-bold text-on-error-container flex items-center gap-1">
              <span className="material-symbols-outlined text-[20px] text-error">warning</span>
              {t('emergencyCardScreen.criticalAllergies', 'Severe Allergies')}
            </span>
            {patient.allergies?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {patient.allergies.map((a, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-lg bg-error text-on-error font-label-md font-bold"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="font-body-md text-on-error-container">No documented drug allergies</p>
            )}
          </div>

          {/* Chronic Diagnoses */}
          <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-1 border border-border-strong">
            <span className="font-label-md font-bold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[20px] text-primary">clinical_notes</span>
              {t('emergencyCardScreen.chronicConditions', 'Diagnosed Conditions')}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {patient.conditions?.map((c, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg bg-surface-container-lowest text-on-surface font-label-md font-semibold border border-border-subtle"
                >
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Active Medications List */}
        <div className="flex flex-col gap-space-xs">
          <h3 className="font-headline-sm font-bold text-on-surface">
            {t('emergencyCardScreen.activeMedications', 'Current Medication Regimen')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-border-strong font-label-md text-on-surface">
                  <th className="py-2 px-3">Brand Name</th>
                  <th className="py-2 px-3">Active Formulation</th>
                  <th className="py-2 px-3">Dosage</th>
                  <th className="py-2 px-3">Timing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-body-md text-[16px]">
                {patient.medicines?.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-low">
                    <td className="py-2 px-3 font-bold text-on-surface">{m.brandName}</td>
                    <td className="py-2 px-3 text-on-surface-variant">{m.genericName}</td>
                    <td className="py-2 px-3">{m.dosage}</td>
                    <td className="py-2 px-3 font-semibold text-primary">{m.timing?.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Emergency Contacts & Physician Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-space-md border-t-2 border-border-subtle">
          <div className="flex flex-col">
            <span className="font-label-sm text-outline font-semibold uppercase">
              Primary Caregiver Contact
            </span>
            <span className="font-headline-sm text-[18px] font-bold text-on-surface">
              {patient.emergencyContact?.name}
            </span>
            <a
              href={`tel:${patient.emergencyContact?.phone}`}
              className="font-label-lg font-bold text-primary hover:underline"
            >
              {patient.emergencyContact?.phone}
            </a>
          </div>

          <div className="flex flex-col sm:items-end">
            <span className="font-label-sm text-outline font-semibold uppercase">
              Emergency Response Numbers (India)
            </span>
            <span className="font-label-lg font-bold text-error">
              National Emergency: 112 • Ambulance: 108
            </span>
            <span className="font-label-md font-bold text-primary">
              Senior Helpline: 14567
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

