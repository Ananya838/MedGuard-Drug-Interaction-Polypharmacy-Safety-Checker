import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './context/I18nContext.jsx';
import { TextScaleProvider } from './context/TextScaleContext.jsx';

import AppShell from './components/layout/AppShell.jsx';
import HomeDashboard from './pages/HomeDashboard.jsx';
import PatientsListPage from './pages/PatientsListPage.jsx';
import PatientDetailPage from './pages/PatientDetailPage.jsx';
import PatientFormPage from './pages/PatientFormPage.jsx';
import ConfirmMedicinesPage from './pages/ConfirmMedicinesPage.jsx';
import SafetyReportPage from './pages/SafetyReportPage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import CaregiverSettingsPage from './pages/CaregiverSettingsPage.jsx';
import ScanStripsPage from './pages/ScanStripsPage.jsx';
import EmergencyCardPage from './pages/EmergencyCardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

export default function App() {
  return (
    <I18nProvider>
      <TextScaleProvider>
        <BrowserRouter>
          <Routes>
            {/* Standalone Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Desktop App Shell Routes */}
            <Route element={<AppShell />}>
              <Route path="/" element={<HomeDashboard />} />
              <Route path="/patients" element={<PatientsListPage />} />
              <Route path="/patients/new" element={<PatientFormPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
              <Route path="/confirm" element={<ConfirmMedicinesPage />} />
              <Route path="/report/:id" element={<SafetyReportPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/settings" element={<CaregiverSettingsPage />} />
              <Route path="/scan" element={<ScanStripsPage />} />
              <Route path="/emergency/:id" element={<EmergencyCardPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TextScaleProvider>
    </I18nProvider>
  );
}

