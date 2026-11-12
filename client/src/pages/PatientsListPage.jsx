import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPatients } from '../api/patients.js';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import InitialsAvatar from '../components/common/InitialsAvatar.jsx';
import SeverityBadge from '../components/common/SeverityBadge.jsx';

export default function PatientsListPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('search') || '';

  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState(query);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPatients();
        setPatients(data);
      } catch (err) {
        console.error("Failed to load patients", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredPatients = (Array.isArray(patients) ? patients : []).filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = p.name ? p.name.toLowerCase().includes(term) : false;
    const medMatch = p.medicines?.some((m) => (m.brandName || m.name || '').toLowerCase().includes(term));
    const condMatch = p.conditions?.some((c) => {
      const label = typeof c === 'string' ? c : c.label || c.name || '';
      return label.toLowerCase().includes(term);
    });
    return nameMatch || medMatch || condMatch;
  });

  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {t('nav.patients', 'Family Elders')}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage profiles, conditions, allergies, and daily medications.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/patients/new')}
          className="gap-space-xs shadow-md"
        >
          <span className="material-symbols-outlined text-[22px]">person_add</span>
          <span>+ {t('dashboard.addElder', 'Add Elder Profile')}</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[22px]">
          search
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by elder name, condition, or medicine..."
          className="w-full h-12 pl-11 pr-space-md rounded-xl bg-surface-container-lowest border border-border-strong text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-on-surface-variant font-label-md">
          {t('common.loading', 'Loading profiles...')}
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card className="py-16 text-center text-on-surface-variant">
          No elder profiles found matching your search.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          {filteredPatients.map((pat) => (
            <Card
              key={pat.id}
              hoverable
              onClick={() => navigate(`/patients/${pat.id}`)}
              className="flex flex-col justify-between gap-space-md"
            >
              <div className="flex items-start justify-between gap-space-sm">
                <div className="flex items-center gap-space-md">
                  <InitialsAvatar
                    name={pat.name}
                    size="lg"
                    showPulse={pat.id === 'pat-001'}
                  />
                  <div className="flex flex-col">
                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      {pat.name}
                    </h2>
                    <span className="text-on-surface-variant font-body-md text-body-md">
                      {pat.age || (pat.dob ? new Date().getFullYear() - new Date(pat.dob).getFullYear() : '70')} {t('common.years', 'yrs')} • Blood: {pat.bloodGroup || 'N/A'}
                    </span>
                    <span className="text-outline font-label-sm text-[13px] mt-0.5">
                      Doctor: {pat.primaryDoctor?.name || 'Primary Physician'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {pat.id === 'pat-001' ? (
                    <SeverityBadge severity="major" />
                  ) : (
                    <SeverityBadge severity="none" />
                  )}
                </div>
              </div>

              {/* Conditions */}
              <div className="flex flex-wrap gap-1.5">
                {pat.conditions?.map((c, idx) => {
                  const label = typeof c === 'string' ? c : c.label || c.name || 'Condition';
                  return (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>

              {/* Footer info & Actions */}
              <div className="flex items-center justify-between pt-space-xs border-t border-border-subtle/60">
                <span className="font-label-md text-label-md font-bold text-primary">
                  {pat.medicines?.length || 0} {t('patient.currentMedicines', 'Current Medicines')}
                </span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/patients/${pat.id}`)}
                  >
                    {t('dashboard.viewDetails', 'Details')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/report/${pat.id}`)}
                  >
                    {t('patient.runCheck', 'Check')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

