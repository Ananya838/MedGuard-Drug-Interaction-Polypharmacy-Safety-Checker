import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ConfirmMedicinesPage from '../pages/ConfirmMedicinesPage.jsx';
import { I18nProvider } from '../context/I18nContext.jsx';

describe('ConfirmMedicinesPage Component', () => {
  const renderPage = () => {
    return render(
      <I18nProvider>
        <BrowserRouter>
          <ConfirmMedicinesPage />
        </BrowserRouter>
      </I18nProvider>
    );
  };

  it('renders confirmed scanned medicines (Warf 5, Ecosprin 75, Telma 40)', () => {
    renderPage();
    expect(screen.getByText('Warf 5')).toBeInTheDocument();
    expect(screen.getByText('Ecosprin 75')).toBeInTheDocument();
    expect(screen.getByText('Telma 40')).toBeInTheDocument();
  });

  it('clearly displays unrecognized medicines alert and does not skip them silently (Rule #5)', () => {
    renderPage();
    expect(screen.getByText(/Unrecognized Items Found/i)).toBeInTheDocument();
    expect(
      screen.getByText(/UNKNOWN PILL XYZ \(Strip Code: UNK-449\)/i)
    ).toBeInTheDocument();
  });

  it('allows removing unrecognized items', () => {
    renderPage();
    const removeBtn = screen.getByLabelText(/Remove UNKNOWN PILL XYZ/i);
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);
    expect(
      screen.queryByText(/UNKNOWN PILL XYZ \(Strip Code: UNK-449\)/i)
    ).not.toBeInTheDocument();
  });

  it('has Confirm & Check Interactions button enabled with confirmed brands', () => {
    renderPage();
    const confirmBtn = screen.getByRole('button', {
      name: /Confirm & Check Interactions/i
    });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).not.toBeDisabled();
  });
});

