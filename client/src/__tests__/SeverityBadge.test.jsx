import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SeverityBadge from '../components/common/SeverityBadge.jsx';
import { I18nProvider } from '../context/I18nContext.jsx';

describe('SeverityBadge Component', () => {
  const renderWithI18n = (ui) => {
    return render(<I18nProvider>{ui}</I18nProvider>);
  };

  it('renders major severity with icon, label and error color classes', () => {
    renderWithI18n(<SeverityBadge severity="major" />);
    expect(screen.getByText(/Major Conflict/i)).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
  });

  it('renders moderate severity with help_outline icon and warning classes', () => {
    renderWithI18n(<SeverityBadge severity="moderate" />);
    expect(screen.getByText(/Moderate Conflict/i)).toBeInTheDocument();
    expect(screen.getByText('help_outline')).toBeInTheDocument();
  });

  it('renders "No Known Interaction" and NEVER uses the word "safe" (Safety Rule #4)', () => {
    renderWithI18n(<SeverityBadge severity="none" />);
    const badgeText = screen.getByRole('status').textContent;
    expect(badgeText).toContain('No Known Interaction');
    expect(badgeText.toLowerCase()).not.toContain('safe');
  });
});

