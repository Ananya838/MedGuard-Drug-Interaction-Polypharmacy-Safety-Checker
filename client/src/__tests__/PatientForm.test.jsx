import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PatientFormPage from '../pages/PatientFormPage.jsx';
import { I18nProvider } from '../context/I18nContext.jsx';
import * as patientsApi from '../api/patients.js';

describe('PatientFormPage Component', () => {
  const renderForm = () => {
    return render(
      <I18nProvider>
        <BrowserRouter>
          <PatientFormPage />
        </BrowserRouter>
      </I18nProvider>
    );
  };

  it('renders Add New Elder Profile form with required fields', () => {
    renderForm();
    expect(screen.getByText(/Add New Elder Profile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Elder's Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Contact Information/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it('successfully creates new patient profile upon form submission', async () => {
    const createSpy = vi.spyOn(patientsApi, 'createPatient').mockResolvedValueOnce({
      id: 'pat-999',
      name: 'Kamla Devi',
      dob: '1948-03-20'
    });

    renderForm();
    const nameInput = screen.getByLabelText(/Elder's Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Kamla Devi' } });

    const submitBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Kamla Devi'
        })
      );
    });

    createSpy.mockRestore();
  });

  it('displays error banner if creation fails', async () => {
    const createSpy = vi.spyOn(patientsApi, 'createPatient').mockRejectedValueOnce(
      new Error('Connection error: backend server unavailable')
    );

    renderForm();
    const nameInput = screen.getByLabelText(/Elder's Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Elder' } });

    const submitBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Connection error: backend server unavailable/i)).toBeInTheDocument();
    });

    createSpy.mockRestore();
  });
});
