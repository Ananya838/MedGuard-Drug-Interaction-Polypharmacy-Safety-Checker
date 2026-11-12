import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPatientById, addPatientMedicine, removePatientMedicine } from '../api/patients.js';
import { searchMedicines } from '../api/medicines.js';
import { mockBrandsDatabase } from '../mocks/medicines.mock.js';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Chip from '../components/common/Chip.jsx';
import InitialsAvatar from '../components/common/InitialsAvatar.jsx';
import SeverityBadge from '../components/common/SeverityBadge.jsx';
import Input from '../components/common/Input.jsx';

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');

  // Add medicine modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [dosageForm, setDosageForm] = useState('1 tablet daily');
  const [timing, setTiming] = useState(['Morning']);

  useEffect(() => {
    async function loadPatient() {
      try {
        const data = await getPatientById(id || 'pat-001');
        setPatient(data);
      } catch (err) {
        console.error("Failed to load patient", err);
      } finally {
        setLoading(false);
      }
    }
    loadPatient();
  }, [id]);

  const handleSearchBrands = async (q) => {
    setBrandSearch(q);
    setSelectedBrand(null); // Clear previous selection so results list is visible
    const trimmed = (q || '').trim();
    if (trimmed.length > 1) {
      setSearching(true);
      try {
        const results = await searchMedicines(trimmed);
        if (Array.isArray(results) && results.length > 0) {
          setSearchResults(results);
        } else {
          // Graceful fallback to client catalog
          const lower = trimmed.toLowerCase();
          const fallback = mockBrandsDatabase.filter(
            (b) =>
              b.name.toLowerCase().includes(lower) ||
              b.ingredients?.some((i) => i.name.toLowerCase().includes(lower))
          );
          setSearchResults(fallback);
        }
      } catch (err) {
        console.warn("API medicine search error, falling back to local catalog:", err);
        const lower = trimmed.toLowerCase();
        const fallback = mockBrandsDatabase.filter(
          (b) =>
            b.name.toLowerCase().includes(lower) ||
            b.ingredients?.some((i) => i.name.toLowerCase().includes(lower))
        );
        setSearchResults(fallback);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!selectedBrand) return;
    try {
      const brandId = typeof selectedBrand.id === 'number'
        ? selectedBrand.id
        : parseInt(String(selectedBrand.id).replace(/\D+/g, ''), 10) || 1;

      const genericName = Array.isArray(selectedBrand.ingredients) && selectedBrand.ingredients.length > 0
        ? selectedBrand.ingredients.map((i) => `${i.name} (${i.strengthMg || ''}mg)`.trim()).join(' + ')
        : selectedBrand.strength || selectedBrand.name || 'Indian Brand Formulation';

      const strength = Array.isArray(selectedBrand.ingredients) && selectedBrand.ingredients.length > 0
        ? selectedBrand.ingredients.map((i) => `${i.strengthMg || ''}mg`.trim()).join(' + ')
        : selectedBrand.strength || '';

      const newMed = await addPatientMedicine(patient.id, {
        brandId,
        brandName: selectedBrand.name || selectedBrand.brand_name || 'Brand Medicine',
        genericName,
        form: selectedBrand.form || 'Tablet',
        strength,
        dosage: dosageForm,
        timing: timing
      });
      setPatient((prev) => {
        if (!prev) return prev;
        const currentMeds = Array.isArray(prev.medicines) ? prev.medicines : [];
        return {
          ...prev,
          medicines: [...currentMeds, newMed]
        };
      });
      setShowAddModal(false);
      setSelectedBrand(null);
      setBrandSearch('');
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to add medicine", err);
    }
  };

  const handleRemoveMedicine = async (medId) => {
    if (!window.confirm("Are you sure you want to remove this medicine?")) return;
    try {
      await removePatientMedicine(patient.id, medId);
      setPatient((prev) => {
        if (!prev) return prev;
        const currentMeds = Array.isArray(prev.medicines) ? prev.medicines : [];
        return {
          ...prev,
          medicines: currentMeds.filter((m) => m.id !== medId)
        };
      });
    } catch (err) {
      console.error("Failed to remove medicine", err);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-label-lg text-on-surface-variant">
        {t('common.loading', 'Loading patient details...')}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-4">
        <h2 className="font-headline-md text-error">Patient Not Found</h2>
        <Button onClick={() => navigate('/patients')}>Back to Patients</Button>
      </div>
    );
  }

  const filteredMedicines = (patient?.medicines || []).filter((med) => {
    const brandName = med.brandName || med.brand_name || med.name || '';
    const genericName = med.genericName || med.custom_name || '';
    const matchesSearch =
      brandName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      genericName.toLowerCase().includes(searchFilter.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;
    if (activeFilter === 'SOS') return med.isPrn;
    const timingList = Array.isArray(med.timing)
      ? med.timing
      : (typeof med.timing_schedule === 'string'
          ? (JSON.parse(med.timing_schedule || '[]') || [])
          : (Array.isArray(med.timing_schedule) ? med.timing_schedule : ['Morning']));
    return Array.isArray(timingList) && timingList.includes(activeFilter);
  });

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-outline font-label-md text-label-md">
        <Link to="/patients" className="hover:text-primary transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">family_restroom</span>
          {t('nav.patients', 'Patients')}
        </Link>
        <span className="text-outline-variant font-bold">/</span>
        <span className="text-on-surface font-headline-sm text-headline-sm font-bold flex items-center gap-space-xs">
          {patient.name}
          <span className="text-on-surface-variant font-body-md text-body-md font-medium">
            ({patient.age} {t('common.years', 'yrs')})
          </span>
        </span>
      </nav>

      {/* Top Patient Master Identity Card */}
      <section className="bg-surface-container-lowest rounded-xl p-space-lg border border-border-subtle shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-lg">
          <InitialsAvatar
            name={patient.name}
            size="lg"
            showPulse={patient.id === 'pat-001'}
            className="w-24 h-24 sm:w-28 sm:h-28 text-[32px]"
          />
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-space-sm">
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface leading-tight">
                {patient.name}
              </h1>
              <span className="px-space-sm py-0.5 rounded-full bg-surface-container font-label-md text-label-md text-on-surface-variant">
                UID: {patient.id.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 text-on-surface-variant font-body-md text-body-md">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-primary">cake</span>
                {patient.age} {t('common.years', 'Yrs')}
              </span>
              <span className="text-outline-variant">•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-error">bloodtype</span>
                {patient.bloodGroup || 'Not specified'}
              </span>
              <span className="text-outline-variant">•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-primary">call</span>
                {patient.emergencyContact?.name} ({patient.emergencyContact?.phone})
              </span>
            </div>

            {/* Chronic Conditions & Allergies */}
            <div className="flex flex-wrap items-center gap-space-xs mt-2">
              {patient.conditions?.map((c, i) => {
                const label = typeof c === 'string' ? c : c.label || c.name || 'Condition';
                return (
                  <span
                    key={i}
                    className="px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary">vital_signs</span>
                    {label}
                  </span>
                );
              })}
              {patient.allergies?.map((a, i) => {
                const label = typeof a === 'string' ? a : a.name || a.label || 'Allergy';
                return (
                  <span
                    key={i}
                    className="px-space-sm py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    Allergy: {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex flex-wrap xl:flex-col items-center xl:items-end gap-space-sm w-full xl:w-auto">
          <Button
            variant="primary"
            onClick={() => navigate(`/report/${patient.id}`)}
            className="w-full sm:w-auto gap-space-xs shadow-md"
          >
            <span className="material-symbols-outlined text-[22px]">verified_user</span>
            <span>{t('patient.runCheck', 'Run Safety Check')}</span>
          </Button>

          <div className="flex items-center gap-space-sm w-full sm:w-auto">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => navigate(`/emergency/${patient.id}`)}
              className="flex-1 sm:flex-initial gap-1"
            >
              <span className="material-symbols-outlined text-[20px]">badge</span>
              <span>{t('patient.emergencyCard', 'Emergency Medical Card')}</span>
            </Button>

            <Button
              variant="tealSecondary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="gap-1"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>{t('patient.addMedicine', 'Add Medicine')}</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Safety Alert Warning Banner if Ramesh */}
      {patient.id === 'pat-001' && (
        <section
          className="bg-error-container text-on-error-container rounded-xl p-space-md border-2 border-error shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md"
          role="alert"
        >
          <div className="flex items-start sm:items-center gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-error text-on-error flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="font-headline-sm text-headline-sm font-bold text-error">
                  {t('severity.major', 'Major Conflict')} Detected
                </span>
                <span className="px-space-xs py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm uppercase tracking-wider font-bold">
                  Action Required
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-error-container mt-0.5">
                Concurrent anticoagulant (Warfarin Sodium) and antiplatelet (Aspirin) therapy substantially elevates bleeding hazard.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() =>
              navigate(`/report/${patient.id}`, {
                state: {
                  brandIds: (patient.medicines || []).map((m) => m.brandId || m.brand_id || m.id).filter(Boolean)
                }
              })
            }
            className="shrink-0 gap-space-xs self-stretch md:self-auto"
          >
            <span>{t('dashboard.viewReport', 'View Safety Report')}</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Button>
        </section>
      )}

      {/* 2-Column Grid Layout: 8-col Medicines, 4-col Clinical Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        {/* Left Column: Medicines Roster */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {/* Filtering Header */}
          <Card className="flex flex-col gap-space-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
              <div>
                <h2 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-space-xs">
                  {t('patient.currentMedicines', 'Current Medicines')}
                  <span className="px-space-xs py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm">
                    {patient.medicines?.length || 0} Total
                  </span>
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  Checked against Indian brand database and standard clinical guidelines
                </p>
              </div>

              {/* Regimen Search */}
              <div className="relative w-full sm:w-[240px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search in regimen..."
                  className="w-full h-11 pl-10 pr-space-sm rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-space-xs pt-space-xs border-t border-border-subtle/50">
              {['All', 'Morning', 'Afternoon', 'Night', 'SOS'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={`px-space-md py-2 rounded-xl font-label-md text-label-md transition-all ${activeFilter === tab
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                >
                  {tab === 'SOS' ? 'SOS / As Needed' : tab}
                </button>
              ))}
            </div>
          </Card>

          {/* Medicines Cards */}
          <div className="flex flex-col gap-space-md">
            {filteredMedicines.length === 0 ? (
              <Card className="py-12 text-center text-on-surface-variant">
                {t('patient.noMedicines', 'No active medicines found in this filter.')}
              </Card>
            ) : (
              filteredMedicines.map((med) => (
                <Card
                  key={med.id}
                  className="flex flex-col gap-space-sm relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
                    <div className="flex items-start gap-space-md">
                      <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[26px]">medication</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-space-sm flex-wrap">
                          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                            {med.brandName || med.brand_name || med.name || 'Medicine'}
                          </h3>
                          <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-lg">
                            {med.genericName || med.custom_name || ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 mt-1 text-on-surface-variant font-body-md text-body-md">
                          <span>Dose: <strong>{med.dosage || (med.dose_amount ? `${med.dose_amount} ${med.dose_unit || 'tablet'}` : '1 dose daily')}</strong></span>
                          <span>•</span>
                          <span>Instructions: <em>{med.instructions || med.frequency_text || 'Take as prescribed'}</em></span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMedicine(med.id)}
                      className="text-outline hover:text-error transition-colors p-2 rounded-lg hover:bg-surface-container-low"
                      title="Remove medicine"
                    >
                      <span className="material-symbols-outlined text-[22px]">delete</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle/50">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(Array.isArray(med.timing)
                        ? med.timing
                        : (typeof med.timing_schedule === 'string'
                            ? (JSON.parse(med.timing_schedule || '[]') || [])
                            : (Array.isArray(med.timing_schedule) ? med.timing_schedule : ['Morning']))
                      ).map((tStr, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-secondary-container/60 text-on-secondary-container font-label-sm text-label-sm font-semibold"
                        >
                          {tStr}
                        </span>
                      ))}
                      {med.isPrn && (
                        <span className="px-2 py-0.5 rounded-md bg-warning-container text-on-warning-container font-label-sm text-label-sm font-semibold">
                          PRN (As Needed)
                        </span>
                      )}
                    </div>
                    <span className="text-on-surface-variant font-label-sm text-[13px]">
                      Added: {med.prescribedDate || 'Active'}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Regimen Overview */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          <Card className="flex flex-col gap-space-md">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Regimen Summary
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-xl">
                <span className="font-label-md text-label-md text-on-surface">Total Formulations</span>
                <span className="font-bold text-primary font-headline-sm">
                  {patient.medicines?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-xl">
                <span className="font-label-md text-label-md text-on-surface">Known Allergies</span>
                <span className="font-bold text-on-surface font-headline-sm">
                  {patient.allergies?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-xl">
                <span className="font-label-md text-label-md text-on-surface">Chronic Conditions</span>
                <span className="font-bold text-on-surface font-headline-sm">
                  {patient.conditions?.length || 0}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                if (!patient.medicines || patient.medicines.length === 0) {
                  setShowAddModal(true);
                } else {
                  navigate(`/report/${patient.id}`);
                }
              }}
              className="w-full gap-space-xs mt-2"
            >
              <span className="material-symbols-outlined text-[20px]">science</span>
              <span>{t('patient.runCheck', 'Run Safety Check')}</span>
            </Button>
          </Card>
        </div>
      </div>

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-xl shadow-xl flex flex-col gap-space-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                {t('patient.addMedicine', 'Add Medicine')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 rounded-xl hover:bg-surface-container-low flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddMedicine} className="flex flex-col gap-space-md">
              <Input
                label="Search Indian Medicine Brand or Ingredient"
                value={brandSearch}
                onChange={(e) => handleSearchBrands(e.target.value)}
                placeholder="e.g. Warf 5, Ecosprin, Metformin, Combiflam..."
                icon="search"
                required
              />

              {searching && (
                <div className="p-space-sm text-center font-label-sm text-primary flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  <span>Searching medicine catalog...</span>
                </div>
              )}

              {searchResults.length > 0 && !selectedBrand && (
                <div className="max-h-52 overflow-y-auto border border-border-subtle rounded-xl flex flex-col divide-y divide-border-subtle bg-surface-container-lowest shadow-md">
                  {searchResults.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBrand(b);
                        setBrandSearch(b.name);
                        setSearchResults([]);
                      }}
                      className="p-space-sm text-left hover:bg-surface-container-low flex justify-between items-center transition-all cursor-pointer w-full"
                    >
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-bold text-on-surface">
                          {b.name} ({b.form || 'Tablet'})
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {Array.isArray(b.ingredients) && b.ingredients.length > 0
                            ? b.ingredients.map((i) => `${i.name || ''} ${i.strengthMg ? i.strengthMg + 'mg' : ''}`.trim()).join(' + ')
                            : b.strength || b.form || 'Indian Brand Formulation'}{b.manufacturer ? ` • ${b.manufacturer}` : ''}
                        </span>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-lg">
                        Select +
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedBrand && (
                <div className="p-space-sm bg-secondary-container/40 rounded-xl border border-secondary-container flex items-center justify-between">
                  <div>
                    <span className="font-label-md text-label-md font-bold text-on-secondary-container flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                      {selectedBrand.name} Selected
                    </span>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {Array.isArray(selectedBrand.ingredients) && selectedBrand.ingredients.length > 0
                        ? selectedBrand.ingredients.map((i) => `${i.name || ''} ${i.strengthMg ? i.strengthMg + 'mg' : ''}`.trim()).join(' + ')
                        : selectedBrand.strength || selectedBrand.form || 'Indian Brand Formulation'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand(null);
                      setBrandSearch('');
                      setSearchResults([]);
                    }}
                    className="text-primary hover:text-error text-xs font-semibold underline px-2 py-1"
                  >
                    Change
                  </button>
                </div>
              )}

              <Input
                label="Dosage Instruction"
                value={dosageForm}
                onChange={(e) => setDosageForm(e.target.value)}
                placeholder="e.g. 1 tablet daily"
              />

              <div>
                <label className="font-label-md text-label-md text-on-surface font-semibold mb-2 block">
                  Timing Slot
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Morning', 'Afternoon', 'Evening', 'Night'].map((slot) => {
                    const isSelected = timing.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTiming(timing.filter((s) => s !== slot));
                          } else {
                            setTiming([...timing, slot]);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl font-label-md text-label-md transition-all ${isSelected
                            ? 'bg-primary text-on-primary font-bold'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                          }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-border-subtle">
                <Button
                  variant="secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={!selectedBrand}
                >
                  {t('common.save', 'Save Medicine')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

