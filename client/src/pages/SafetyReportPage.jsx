import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { runSafetyCheck } from '../api/check.js';
import { getPatientById, downloadDoctorPdf } from '../api/patients.js';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import FindingCard from '../components/common/FindingCard.jsx';
import DoseLimitBar from '../components/common/DoseLimitBar.jsx';
import InitialsAvatar from '../components/common/InitialsAvatar.jsx';
import SeverityBadge from '../components/common/SeverityBadge.jsx';

export default function SafetyReportPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  const [patient, setPatient] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const pat = await getPatientById(id || 'pat-001');
        setPatient(pat);

        const brandIds =
          location.state?.brandIds ||
          (pat?.medicines || []).map((m) => m.brandId || m.brand_id).filter(Boolean);
        const unrecognized = location.state?.unrecognized || [];

        const rep = await runSafetyCheck({
          patientId: pat?.id,
          brandIds,
          unrecognized
        });
        setReport(rep);
      } catch (err) {
        console.error("Failed to run safety check", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [id, location.state]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!patient) return;
    try {
      setDownloadingPdf(true);
      await downloadDoctorPdf(patient.id, patient.name);
    } catch (err) {
      console.error("PDF download error", err);
      alert("Failed to download PDF report. Using print dialog instead.");
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const toggleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!report || !report.findings) return;

    const speechText = [
      `Safety report for ${patient?.name || 'patient'}.`,
      `${report.summary?.majorCount || 0} major conflicts detected.`,
      ...report.findings.map(
        (f) => `${f.severity} alert: ${f.title}. ${f.explanation}. Action: ${f.action}`
      )
    ].join(' ');

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = locale === 'hi' ? 'hi-IN' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-label-lg text-on-surface-variant">
        {t('common.loading', 'Generating safety report...')}
      </div>
    );
  }

  if (report?.empty) {
    return (
      <div className="flex flex-col w-full gap-space-lg max-w-2xl mx-auto py-12">
        <Card className="py-12 text-center flex flex-col items-center gap-space-md shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary-container text-primary flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-[36px]">medication</span>
          </div>
          <h2 className="font-headline-md font-bold text-on-surface">No Medicines to Screen</h2>
          <p className="font-body-md text-on-surface-variant text-center max-w-md">
            <strong>{patient?.name}</strong> does not have any active medications recorded yet.
            Add their prescribed medicines or scan a strip to evaluate polypharmacy safety.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-space-sm mt-4">
            <Button variant="primary" onClick={() => navigate(`/patients/${patient?.id}`)}>
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Add Medicine to Profile</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                navigate('/scan', {
                  state: { patientId: patient?.id, patientName: patient?.name }
                })
              }
            >
              <span className="material-symbols-outlined text-[20px]">document_scanner</span>
              <span>Scan Medicine Strip</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!report || !patient) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-4">
        <h2 className="font-headline-md text-error">Unable to load report</h2>
        <p className="font-body-md text-on-surface-variant max-w-md">
          Could not retrieve interaction data for this profile.
        </p>
        <div className="flex items-center gap-3 mt-2">
          <Button onClick={() => navigate(`/patients/${id || ''}`)}>Back to Patient Profile</Button>
          <Button variant="secondary" onClick={() => navigate('/patients')}>View All Patients</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Clinical Summary Banner */}
      <section className="w-full bg-surface-container-lowest rounded-xl p-space-lg border border-border-subtle shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-lg">
        {/* Left: Patient Identity */}
        <div className="flex items-center gap-space-md min-w-[280px]">
          <InitialsAvatar
            name={patient.name}
            size="lg"
            showPulse={(report?.summary?.majorCount || 0) > 0}
            className="w-16 h-16 text-[24px]"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                {patient.name}
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                {patient.age} {t('common.years', 'yrs')}
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant truncate">
              {patient.primaryDoctor?.name || 'Primary Physician'} • {patient.bloodGroup || 'Blood N/A'}
            </p>
            <span className="font-label-sm text-label-sm text-outline tracking-wider uppercase mt-0.5">
              Ref #{(report.checkId || ('chk-' + (patient.id || '9821').slice(-6))).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Center: Triple-Encoded Semantic Severity Pills */}
        <div className="flex flex-wrap items-center gap-space-sm justify-start xl:justify-center">
          {(report.summary?.majorCount || 0) > 0 && (
            <SeverityBadge
              severity="major"
              customLabel={`${report.summary.majorCount} ${t('severity.major', 'Major Conflict')}`}
            />
          )}
          {(report.summary?.moderateCount || 0) > 0 && (
            <SeverityBadge
              severity="moderate"
              customLabel={`${report.summary.moderateCount} ${t('severity.moderate', 'Moderate Conflict')}`}
            />
          )}
          <SeverityBadge
            severity="none"
            customLabel={`${report.summary?.noKnownInteractionsCount || (report.findings?.length === 1 && report.findings[0].severity === 'info' ? 1 : 3)} ${t('report.safePairsCount', 'No Known Interactions')}`}
          />
        </div>

        {/* Right: Desktop Actions */}
        <div className="flex flex-wrap items-center gap-space-sm w-full xl:w-auto justify-end no-print">
          <Button
            variant="primary"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="gap-space-xs shadow-sm"
          >
            <span className="material-symbols-outlined text-[22px]">
              {downloadingPdf ? 'hourglass_top' : 'download'}
            </span>
            <span>{downloadingPdf ? 'Downloading PDF...' : t('report.printPdf', 'Doctor Report (PDF)')}</span>
          </Button>

          <Button
            variant="secondary"
            onClick={handlePrint}
            className="gap-space-xs"
          >
            <span className="material-symbols-outlined text-[22px]">print</span>
            <span>Print View</span>
          </Button>

          <Button
            variant="secondary"
            onClick={toggleReadAloud}
            className="gap-space-xs"
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                isSpeaking ? 'text-error animate-pulse' : 'text-primary'
              }`}
            >
              {isSpeaking ? 'stop_circle' : 'volume_up'}
            </span>
            <span>
              {isSpeaking ? 'Stop Audio' : t('report.readAloud', 'Read Aloud')}
            </span>
          </Button>
        </div>
      </section>

      {/* 2-Column Clinical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column: Context, Stack & Doctor Card (5-cols) */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          {/* Clinical Vitals & Chronic Conditions */}
          <Card className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs text-primary font-label-lg text-label-lg font-bold">
                <span className="material-symbols-outlined text-[24px]">clinical_notes</span>
                <span>Clinical Context</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm font-semibold">
                Age: {patient.age} yrs
              </span>
            </div>

            <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">
                {t('patient.conditions', 'Chronic Conditions')}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {patient.conditions?.map((c, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-sm"
                  >
                    {typeof c === 'string' ? c : (c.label || c.name || c.code || String(c))}
                  </span>
                ))}
              </div>
            </div>

            {/* Allergies Red Flag Zone */}
            {patient.allergies?.length > 0 && (
              <div className="bg-error-container/60 border border-error/30 rounded-xl p-space-md flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-error text-[26px] mt-0.5 shrink-0">
                  do_not_disturb_on
                </span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-error-container font-bold">
                    {t('patient.allergies', 'Documented Allergies')}
                  </span>
                  <p className="font-body-md text-body-md text-on-error-container mt-0.5">
                    {patient.allergies.map((a) => (typeof a === 'string' ? a : (a.name || a.label || a.id || String(a)))).join(' • ')}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Active Medicines Evaluated */}
          {(() => {
            const analyzedMeds = (patient.medicines && patient.medicines.length > 0)
              ? patient.medicines
              : (location.state?.confirmedItems && location.state.confirmedItems.length > 0)
                ? location.state.confirmedItems.map((item) => ({
                    id: item.id,
                    brandName: item.name || item.brandName || 'Brand Medicine',
                    genericName: item.activeSalt || 'Prescription Formulation',
                    dosage: item.dosage || '1 tablet daily'
                  }))
                : (location.state?.brandIds || []).map((bId) => ({
                    id: bId,
                    brandName: bId === 198 ? 'Vozet 5' : `Medicine #${bId}`,
                    genericName: 'Prescription Formulation',
                    dosage: '1 tablet daily'
                  }));

            return (
              <Card className="flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[24px]">medication</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Analyzed Regimen
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-bold">
                    {analyzedMeds.length} Total
                  </span>
                </div>

                <div className="flex flex-col gap-space-xs">
                  {analyzedMeds.map((med, idx) => {
                    const bName = med.brandName || med.brand_name || med.name || 'Medicine';
                    const gName = med.genericName || med.activeSalt || med.strength || '';
                    const doseText = med.dosage || '1 tablet daily';
                    const isConflict = bName.toLowerCase().includes('warf') || bName.toLowerCase().includes('ecosprin') ||
                      (report.findings || []).some((f) => (f.severity === 'major' || f.severity === 'moderate') && (f.items || f.drugs || []).some((d) => (typeof d === 'string' ? d : (d?.name || '')).toLowerCase().includes(bName.toLowerCase())));
                    return (
                      <div
                        key={med.id || idx}
                        className={`p-space-sm rounded-xl flex items-center justify-between border ${
                          isConflict
                            ? 'bg-error-container/30 border-error/30'
                            : 'bg-surface-container-low border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-space-sm min-w-0">
                          <span
                            className={`material-symbols-outlined text-[24px] ${
                              isConflict ? 'text-error' : 'text-primary'
                            }`}
                          >
                            {isConflict ? 'warning' : 'check_circle'}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                              {bName}
                            </span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                              {gName ? `${gName} • ` : ''}{doseText}
                            </span>
                          </div>
                        </div>
                        {isConflict ? (
                          <span className="px-2 py-0.5 rounded bg-error text-on-error font-label-sm text-label-sm font-bold uppercase shrink-0">
                            Conflict
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-tertiary font-label-sm text-label-sm font-bold shrink-0">
                            No conflict
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })()}

          {/* Physician Card */}
          <Card className="flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">medical_services</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-lg text-label-lg font-bold text-on-surface">
                  {patient.primaryDoctor?.name || 'Primary Physician'}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {patient.primaryDoctor?.clinic || 'Community Care Clinic'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-space-sm pt-2 border-t border-border-subtle">
              <a
                href="tel:112"
                className="h-11 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-1 shadow-sm hover:opacity-95"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span>Contact Clinic</span>
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/emergency/${patient.id}`)}
              >
                Emergency Card
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Detailed Findings & Dose Limits (7-cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          {/* Findings Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              {t('report.findingsHeader', 'Clinical Safety Findings')}
            </h2>
            <span className="text-outline font-label-sm text-label-sm">
              {report.findings?.length || 0} Flags Identified
            </span>
          </div>

          {/* Finding Cards */}
          <div className="flex flex-col gap-space-md">
            {report.findings?.map((finding, idx) => (
              <FindingCard key={finding.id || idx} finding={finding} />
            ))}
          </div>

          {/* Daily Cumulative Dose Limits Tracking */}
          {report.doseTracking?.length > 0 && (
            <div className="flex flex-col gap-space-md">
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[24px]">balance</span>
                <span>{t('report.doseLimitsHeader', 'Daily Cumulative Dose Tracking')}</span>
              </h3>
              <div className="flex flex-col gap-space-sm">
                {report.doseTracking.map((doseItem, idx) => (
                  <DoseLimitBar key={idx} item={doseItem} />
                ))}
              </div>
            </div>
          )}

          {/* Checked Pairs with No Known Interaction (Safety Rule #4: Never say "Safe") */}
          {report.checkedPairsNoInteraction?.length > 0 && (
            <Card className="flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs font-label-lg text-label-lg font-bold text-on-surface">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  verified_user
                </span>
                <span>{t('report.safePairsCount', 'No Known Interactions')} ({report.checkedPairsNoInteraction.length})</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant text-[15px]">
                The following pairs were evaluated against our interaction database:
              </p>
              <div className="flex flex-col gap-2 mt-1">
                {report.checkedPairsNoInteraction.map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-space-sm bg-surface-container-low rounded-xl flex items-center justify-between font-label-md text-label-md"
                  >
                    <span className="font-semibold text-on-surface">
                      {pair.drugA} + {pair.drugB}
                    </span>
                    <span className="text-secondary font-medium text-[14px]">
                      {t('common.noKnownInteractions', 'No known interaction found in our data.')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Questions for Doctor */}
          <Card className="bg-surface-container-lowest border-2 border-primary-container/40 flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs text-primary font-label-lg text-label-lg font-bold">
              <span className="material-symbols-outlined text-[24px]">help_center</span>
              <span>{t('report.doctorDiscussionPoints', 'Questions to Ask Your Doctor')}</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 font-body-md text-body-md text-on-surface">
              <li>
                Is the combination of <strong>Warfarin</strong> and <strong>Aspirin</strong> strictly necessary, or can one antiplatelet be adjusted?
              </li>
              <li>
                Should routine INR clotting checks be performed more frequently given the patient's age (74 yrs)?
              </li>
              <li>
                Is a gastroprotective agent (like Pantoprazole) recommended to prevent mucosal bleed hazards?
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

