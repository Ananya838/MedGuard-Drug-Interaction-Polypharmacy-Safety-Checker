import React from 'react';
import SeverityBadge from './SeverityBadge.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

export default function FindingCard({ finding = {} }) {
  const { t } = useI18n();

  const {
    severity = 'moderate',
    title,
    drugs,
    explanation,
    action,
    type,
    evidence
  } = finding;

  const findingTitle = title || finding.summary || 'Clinical Safety Finding';
  const involvedDrugs = (Array.isArray(drugs) && drugs.length > 0)
    ? drugs
    : (Array.isArray(finding.items) ? finding.items : []);
  const findingExplanation = explanation || finding.description || 'Evaluated against clinical safety rules.';

  // Rule #9: Fallback to fixed human-written action text if not provided
  const fixedAction =
    action ||
    t(`actions.${severity.toLowerCase()}`, 'Contact your doctor or pharmacist.');

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-space-lg shadow-sm flex flex-col gap-space-md">
      {/* Top row: Severity badge & Type */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <SeverityBadge severity={severity} />
        {type && (
          <span className="font-label-sm text-label-sm text-outline px-2.5 py-1 rounded-md bg-surface-container-low uppercase tracking-wider">
            {type.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold leading-snug">
        {findingTitle}
      </h3>

      {/* Involved Drugs */}
      {involvedDrugs.length > 0 && (
        <div className="flex flex-wrap items-center gap-space-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold mr-1">
            {t('report.drugsInvolved', 'Medicines Involved')}:
          </span>
          {involvedDrugs.map((drug, idx) => (
            <span
              key={idx}
              className="px-space-sm py-1 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold"
            >
              {typeof drug === 'string' ? drug : (drug?.name || String(drug))}
            </span>
          ))}
        </div>
      )}

      {/* Clinical Explanation */}
      <div className="bg-surface-container-low/60 rounded-xl p-space-md">
        <h4 className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider mb-1">
          {t('report.clinicalSummary', 'Clinical Impact')}
        </h4>
        <p className="font-body-md text-body-md text-on-surface leading-relaxed">
          {findingExplanation}
        </p>
      </div>

      {/* Fixed Caregiver Action - Human-written safety directive */}
      <div className="bg-primary-container/10 border-2 border-primary-container/30 rounded-xl p-space-md flex items-start gap-space-sm">
        <span className="material-symbols-outlined text-primary text-[26px] mt-0.5 shrink-0">
          support_agent
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-label-md text-label-md font-bold text-primary">
            {t('report.caregiverAdvice', 'Caregiver Action Required')}
          </span>
          <p className="font-body-md text-body-md text-on-surface font-medium leading-normal">
            {fixedAction}
          </p>
        </div>
      </div>

      {/* Evidence Source Label (Rule #10) */}
      <div className="flex items-center justify-between text-outline font-label-sm text-[13px] pt-1 border-t border-border-subtle/50">
        <span>Source: {evidence || finding.source || 'MedGuard sample data (not clinically verified)'}</span>
      </div>
    </div>
  );
}

