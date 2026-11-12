import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Chip from '../components/common/Chip.jsx';
import { searchMedicines } from '../api/medicines.js';
import { addPatientMedicine } from '../api/patients.js';
import { mockBrandsDatabase } from '../mocks/medicines.mock.js';

const DEFAULT_SAMPLE_ITEMS = [
  {
    id: 15, // Warf 5
    name: 'Warf 5',
    form: 'Tablet',
    activeSalt: 'Warfarin Sodium 5mg',
    dosage: '1 tablet daily',
    frequency: 'Once daily',
    timing: 'Night',
    confidence: 'High Match'
  },
  {
    id: 14, // Ecosprin 75
    name: 'Ecosprin 75',
    form: 'Capsule',
    activeSalt: 'Aspirin 75mg Gastro-resistant',
    dosage: '1 capsule daily',
    frequency: 'Once daily',
    timing: 'Morning',
    confidence: 'High Match'
  },
  {
    id: 8, // Telma 40
    name: 'Telma 40',
    form: 'Tablet',
    activeSalt: 'Telmisartan 40mg',
    dosage: '1 tablet daily',
    frequency: 'Once daily',
    timing: 'Morning',
    confidence: 'Exact Match'
  }
];

export default function ConfirmMedicinesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const patientId = location.state?.patientId || 'pat-001';
  const patientName = location.state?.patientName || 'Ramesh Sharma';

  // State of confirmed brands and unrecognized items
  const [detectedItems, setDetectedItems] = useState(
    location.state ? (location.state.detectedItems || []) : DEFAULT_SAMPLE_ITEMS
  );

  const [unrecognizedList, setUnrecognizedList] = useState(
    location.state
      ? (Array.isArray(location.state.unrecognizedList) ? location.state.unrecognizedList : [])
      : ['UNKNOWN PILL XYZ (Strip Code: UNK-449)']
  );

  const [showAddManual, setShowAddManual] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Assign Active Salt states for unrecognized items
  const [assigningIdx, setAssigningIdx] = useState(null);
  const [saltSearch, setSaltSearch] = useState('');
  const [saltResults, setSaltResults] = useState([]);
  const [searchingSalt, setSearchingSalt] = useState(false);

  useEffect(() => {
    let active = true;
    if (manualSearch.trim().length > 1) {
      setSearching(true);
      searchMedicines(manualSearch)
        .then((res) => {
          if (!active) return;
          if (Array.isArray(res) && res.length > 0) {
            setSearchResults(res);
          } else {
            // Fallback to local mock database matching
            const q = manualSearch.toLowerCase();
            const fallback = mockBrandsDatabase.filter(
              (b) =>
                b.name.toLowerCase().includes(q) ||
                b.ingredients?.some((i) => i.name.toLowerCase().includes(q))
            );
            setSearchResults(fallback);
          }
        })
        .catch(() => {
          if (!active) return;
          const q = manualSearch.toLowerCase();
          setSearchResults(
            mockBrandsDatabase.filter((b) => b.name.toLowerCase().includes(q))
          );
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    } else {
      setSearchResults([]);
      setSearching(false);
    }
    return () => {
      active = false;
    };
  }, [manualSearch]);

  useEffect(() => {
    let active = true;
    if (saltSearch.trim().length > 1) {
      setSearchingSalt(true);
      searchMedicines(saltSearch)
        .then((res) => {
          if (!active) return;
          if (Array.isArray(res) && res.length > 0) {
            setSaltResults(res);
          } else {
            const q = saltSearch.toLowerCase();
            const fallback = mockBrandsDatabase.filter(
              (b) =>
                b.name.toLowerCase().includes(q) ||
                b.ingredients?.some((i) => i.name.toLowerCase().includes(q))
            );
            setSaltResults(fallback);
          }
        })
        .catch(() => {
          if (!active) return;
          const q = saltSearch.toLowerCase();
          setSaltResults(
            mockBrandsDatabase.filter((b) => b.name.toLowerCase().includes(q))
          );
        })
        .finally(() => {
          if (active) setSearchingSalt(false);
        });
    } else {
      setSaltResults([]);
      setSearchingSalt(false);
    }
    return () => {
      active = false;
    };
  }, [saltSearch]);

  const handleAssignSaltToUnrecognized = (brand, idx) => {
    const brandId = typeof brand.id === 'number' ? brand.id : parseInt(String(brand.id).replace(/\D+/g, ''), 10) || (detectedItems.length + 10);
    const activeSalt = Array.isArray(brand.ingredients)
      ? brand.ingredients.map((i) => `${i.name} ${i.strengthMg || ''}mg`.trim()).join(' + ')
      : brand.strength || brand.name;

    setDetectedItems((prev) => [
      ...prev,
      {
        id: brandId,
        name: brand.name || brand.brand_name || 'Brand Medicine',
        form: brand.form || 'Tablet',
        activeSalt,
        dosage: '1 tablet daily',
        frequency: 'Once daily',
        timing: 'Morning',
        confidence: 'Caregiver Assigned'
      }
    ]);

    setUnrecognizedList((prev) => prev.filter((_, i) => i !== idx));
    setAssigningIdx(null);
    setSaltSearch('');
  };

  const handleRemoveItem = (id) => {
    setDetectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveUnrecognized = (idx) => {
    setUnrecognizedList((prev) => prev.filter((_, i) => i !== idx));
  };

  const [saveToProfile, setSaveToProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleConfirmAndCheck = async () => {
    setSaving(true);
    // Navigate to safety report with confirmed integer brand IDs and unrecognized list
    const brandIds = detectedItems
      .map((item) => (typeof item.id === 'number' ? item.id : parseInt(String(item.id).replace(/\D+/g, ''), 10)))
      .filter((n) => Number.isInteger(n) && n > 0);

    // Save confirmed medicines into the elder's active regimen in DB
    if (saveToProfile && patientId) {
      try {
        await Promise.all(
          detectedItems.map((item) => {
            const bId = typeof item.id === 'number' ? item.id : parseInt(String(item.id).replace(/\D+/g, ''), 10) || 1;
            return addPatientMedicine(patientId, {
              brandId: bId,
              brandName: item.name || 'Medicine',
              genericName: item.activeSalt || item.name || '',
              form: item.form || 'Tablet',
              dosage: item.dosage || '1 tablet daily',
              timing: Array.isArray(item.timing) ? item.timing : [item.timing || 'Morning'],
              instructions: 'Take as prescribed'
            });
          })
        );
      } catch (err) {
        console.warn("Could not save confirmed medicines to profile:", err);
      }
    }

    setSaving(false);
    navigate(`/report/${patientId}`, {
      state: {
        brandIds: brandIds.length > 0 ? brandIds : [15, 14],
        unrecognized: unrecognizedList,
        confirmedItems: detectedItems
      }
    });
  };

  const handleAddManualBrand = (brand) => {
    const brandId = typeof brand.id === 'number' ? brand.id : parseInt(String(brand.id).replace(/\D+/g, ''), 10) || (detectedItems.length + 10);
    if (detectedItems.some((item) => item.id === brandId)) return;
    
    const activeSalt = Array.isArray(brand.ingredients)
      ? brand.ingredients.map((i) => `${i.name} ${i.strengthMg || ''}mg`.trim()).join(' + ')
      : brand.strength || brand.name;

    setDetectedItems((prev) => [
      ...prev,
      {
        id: brandId,
        name: brand.name || brand.brand_name || 'Brand Medicine',
        form: brand.form || 'Tablet',
        activeSalt,
        dosage: '1 tablet daily',
        frequency: 'Once daily',
        timing: 'Morning',
        confidence: 'Manually Added'
      }
    ]);
    setShowAddManual(false);
    setManualSearch('');
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header & Step progress */}
      <section className="flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-xs">
            <Link
              to="/scan"
              className="inline-flex items-center gap-space-xs text-on-surface-variant hover:text-primary font-label-md text-label-md transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span>Return to Scanner</span>
            </Link>
            <span className="text-outline-variant">•</span>
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Step 2 of 3: Confirmation
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm shadow-sm font-semibold">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>{detectedItems.length} items ready for check</span>
            </div>
            <div className="flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>On-Device OCR Privacy Guarantee</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            {t('confirmScreen.title', 'Confirm Scanned Medicines')}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl leading-relaxed">
            Please verify the detected active salts and dosages before safety evaluation for{' '}
            <strong className="text-on-surface font-bold">{patientName}</strong>.
          </p>
        </div>
      </section>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        {/* Left 8-col: Confirmed list & Unrecognized box */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {/* Confirmed Brand Cards */}
          <div className="flex flex-col gap-space-md">
            {detectedItems.map((med) => (
              <Card
                key={med.id}
                className="flex flex-col gap-space-md relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-space-md">
                  <div className="flex gap-space-md">
                    <div className="w-14 h-14 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[30px]">medication</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-space-sm flex-wrap">
                        <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          {med.name}
                        </h2>
                        <span className="px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          {med.confidence}
                        </span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant font-medium mt-0.5">
                        Active Formulation:{' '}
                        <span className="text-on-surface font-semibold">{med.activeSalt}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(med.id)}
                    aria-label={`Remove ${med.name}`}
                    className="w-10 h-10 rounded-xl text-outline hover:text-error hover:bg-error-container/40 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[22px]">delete</span>
                  </button>
                </div>

                {/* Dosage & Timing Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-space-xs border-t border-border-subtle/50">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                      Dose & Frequency
                    </span>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDetectedItems((prev) =>
                          prev.map((i) => (i.id === med.id ? { ...i, dosage: val } : i))
                        );
                      }}
                      className="h-10 px-3 rounded-lg border border-border-strong bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                      Time of Day
                    </span>
                    <select
                      value={med.timing}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDetectedItems((prev) =>
                          prev.map((i) => (i.id === med.id ? { ...i, timing: val } : i))
                        );
                      }}
                      className="h-10 px-3 rounded-lg border border-border-strong bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                      <option value="SOS">SOS / As Needed</option>
                    </select>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Safety Rule #5: Unrecognized Items Warning Banner & Active Salt Assignment */}
          {unrecognizedList.length > 0 && (
            <div className="bg-warning-container text-on-warning-container border-2 border-warning rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-warning text-[26px]">
                  warning
                </span>
                <h3 className="font-label-lg text-label-lg font-bold">
                  {t('confirmScreen.unrecognizedAlertTitle', 'Unrecognized Items Found')}
                </h3>
              </div>
              <p className="font-body-md text-body-md text-on-warning-container leading-normal">
                {t(
                  'confirmScreen.unrecognizedAlertText',
                  'The following items could not be matched with our database. They will not be evaluated for drug interactions unless you assign their active salt below.'
                )}
              </p>

              <div className="flex flex-col gap-3 mt-1">
                {unrecognizedList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Chip
                          label={item}
                          onRemove={() => handleRemoveUnrecognized(idx)}
                          variant="allergy"
                          className="bg-white/90"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningIdx(assigningIdx === idx ? null : idx);
                          setSaltSearch('');
                        }}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover font-bold text-label-sm px-3 py-1.5 rounded-lg bg-primary-container/40 hover:bg-primary-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">medication</span>
                        <span>{assigningIdx === idx ? 'Cancel Assignment' : 'Assign Active Salt'}</span>
                      </button>
                    </div>

                    {assigningIdx === idx && (
                      <div className="flex flex-col gap-2 p-3 bg-surface-container-low rounded-lg border border-primary/30 mt-1">
                        <label className="font-label-sm font-semibold text-on-surface">
                          Search catalog formulation or active ingredient printed on the strip (e.g. Paracetamol, Pantoprazole, Amlodipine):
                        </label>
                        <input
                          type="text"
                          value={saltSearch}
                          onChange={(e) => setSaltSearch(e.target.value)}
                          placeholder="Type brand name or generic salt..."
                          className="h-10 px-3 rounded-lg border border-border-strong bg-surface-container-lowest text-on-surface font-body-md"
                          autoFocus
                        />
                        {searchingSalt && (
                          <div className="text-center font-label-sm text-outline py-1">
                            Searching catalog...
                          </div>
                        )}
                        {!searchingSalt && saltSearch.trim().length > 1 && (
                          <div className="max-h-48 overflow-y-auto border border-border-subtle rounded-lg divide-y divide-border-subtle bg-surface-container-lowest">
                            {saltResults.length === 0 ? (
                              <div className="p-3 text-center font-label-sm text-on-surface-variant">
                                No catalog match found. Check spelling or try a generic name.
                              </div>
                            ) : (
                              saltResults.map((b) => {
                                const ingText = Array.isArray(b.ingredients)
                                  ? b.ingredients.map((i) => `${i.name} ${i.strengthMg || ''}mg`.trim()).join(' + ')
                                  : b.strength || b.form || 'Indian Brand Formulation';
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => handleAssignSaltToUnrecognized(b, idx)}
                                    className="w-full p-2.5 text-left hover:bg-surface-container-low flex justify-between items-center transition-colors"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold text-on-surface text-label-md">{b.name}</span>
                                      <span className="text-on-surface-variant font-label-xs">
                                        {ingText}
                                      </span>
                                    </div>
                                    <span className="material-symbols-outlined text-primary text-[20px]">
                                      check_circle
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add missing manual medicine */}
          {showAddManual ? (
            <Card className="flex flex-col gap-space-md border-primary/40 bg-surface-container-low/40">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {t('confirmScreen.actionAddManual', 'Add Missing Medicine')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddManual(false)}
                  className="text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>

              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Type brand name (e.g. Combiflam, Glycomet, Dolo)..."
                className="h-12 px-4 rounded-xl border-2 border-border-strong bg-surface-container-lowest text-on-surface font-body-md"
              />

              {searching && (
                <div className="py-2 text-center font-label-sm text-outline">
                  Searching medicine catalog...
                </div>
              )}

              {!searching && manualSearch.trim() && (
                <div className="max-h-48 overflow-y-auto border border-border-subtle rounded-xl divide-y divide-border-subtle bg-surface-container-lowest">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center font-label-md text-on-surface-variant">
                      No matching brands found. Check spelling or try a generic name.
                    </div>
                  ) : (
                    searchResults.map((b) => {
                      const ingText = Array.isArray(b.ingredients)
                        ? b.ingredients.map((i) => `${i.name} ${i.strengthMg || ''}mg`.trim()).join(' + ')
                        : b.strength || b.form || 'Indian Brand Formulation';
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleAddManualBrand(b)}
                          className="w-full p-space-sm text-left hover:bg-surface-container-low flex justify-between items-center transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{b.name}</span>
                            <span className="text-on-surface-variant font-label-sm">
                              {ingText}
                            </span>
                          </div>
                          <span className="material-symbols-outlined text-primary text-[20px]">
                            add_circle
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </Card>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAddManual(true)}
              className="gap-space-xs border-dashed border-2 py-4"
            >
              <span className="material-symbols-outlined text-[22px]">add_circle</span>
              <span>+ {t('confirmScreen.actionAddManual', 'Add Missing Medicine Manually')}</span>
            </Button>
          )}
        </div>

        {/* Right 4-col: Action Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          <Card className="flex flex-col gap-space-md shadow-md">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Evaluation Readiness
            </h3>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-xl">
                <span className="font-label-md text-label-md text-on-surface">Target Elder</span>
                <span className="font-bold text-on-surface">{patientName}</span>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-xl">
                <span className="font-label-md text-label-md text-on-surface">Confirmed Brands</span>
                <span className="font-bold text-primary text-headline-sm">
                  {detectedItems.length}
                </span>
              </div>
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-xl">
                <span className="font-label-md text-label-md text-on-surface">Unrecognized</span>
                <span className="font-bold text-warning text-headline-sm">
                  {unrecognizedList.length}
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer mt-1 p-1 bg-surface-container-low/60 rounded-xl px-3 py-2 border border-border-subtle/50">
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={(e) => setSaveToProfile(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
              />
              <span className="font-label-sm text-label-sm text-on-surface font-medium">
                Save confirmed medicines to <strong>{patientName}</strong>'s profile
              </span>
            </label>

            <Button
              variant="primary"
              onClick={handleConfirmAndCheck}
              disabled={detectedItems.length === 0 || saving}
              className="w-full gap-space-xs mt-2 shadow-md"
            >
              <span className="material-symbols-outlined text-[22px]">security</span>
              <span>{saving ? 'Saving & Checking...' : t('confirmScreen.actionConfirm', 'Confirm & Check Interactions')}</span>
            </Button>
          </Card>

          {/* Privacy Note */}
          <div className="p-space-md bg-surface-container-lowest rounded-xl border border-border-subtle flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
              shield
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant text-[14px]">
              Safety Rule: Confirmed brand IDs and unrecognized entries are evaluated deterministically against our safety rules without external AI guesswork.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

