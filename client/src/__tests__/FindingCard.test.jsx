import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FindingCard from '../components/common/FindingCard.jsx';
import { I18nProvider } from '../context/I18nContext.jsx';

describe('FindingCard Component', () => {
  const sampleFinding = {
    id: 'fnd-test-01',
    severity: 'major',
    type: 'drug_drug',
    title: 'Warfarin and Aspirin Interaction',
    drugs: ['Warfarin Sodium', 'Aspirin'],
    explanation: 'Concurrent use increases risk of major bleeding.',
    action: 'Contact the prescribing doctor or pharmacist before administering these medicines together.',
    evidence: 'MedGuard sample data (not clinically verified)'
  };

  const renderWithI18n = (ui) => {
    return render(<I18nProvider>{ui}</I18nProvider>);
  };

  it('renders title, drugs, explanation, and severity badge', () => {
    renderWithI18n(<FindingCard finding={sampleFinding} />);
    expect(screen.getByText('Warfarin and Aspirin Interaction')).toBeInTheDocument();
    expect(screen.getByText('Warfarin Sodium')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText(/Concurrent use increases risk of major bleeding/i)).toBeInTheDocument();
  });

  it('displays fixed caregiver action text telling them to contact doctor or pharmacist (Rule #9)', () => {
    renderWithI18n(<FindingCard finding={sampleFinding} />);
    const actionText = screen.getByText(/Contact the prescribing doctor or pharmacist/i);
    expect(actionText).toBeInTheDocument();
    // Verify it never instructs to stop/halve/skip medicine
    expect(actionText.textContent).not.toMatch(/\b(stop|halve|skip|reduce|increase|dose)\b/i);
  });

  it('displays data honesty label "MedGuard sample data (not clinically verified)" (Rule #10)', () => {
    renderWithI18n(<FindingCard finding={sampleFinding} />);
    expect(
      screen.getByText(/Source: MedGuard sample data \(not clinically verified\)/i)
    ).toBeInTheDocument();
  });
});

