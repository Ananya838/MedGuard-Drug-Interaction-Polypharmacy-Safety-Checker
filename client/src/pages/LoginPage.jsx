import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth.js';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Input from '../components/common/Input.jsx';

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('sunita.caregiver@example.com');
  const [password, setPassword] = useState('MedGuard2026!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-surface-container-lowest rounded-2xl border border-border-subtle shadow-lg overflow-hidden">
        {/* Left Col: Brand & Assurance */}
        <div className="bg-primary p-space-xl text-on-primary flex flex-col justify-between">
          <div className="flex flex-col gap-space-lg">
            <div className="flex items-center gap-space-sm">
              <div className="w-12 h-12 rounded-xl bg-white text-primary flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-[28px]">verified_user</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-headline-sm font-bold">MedGuard</span>
                <span className="text-on-primary-container text-[14px]">Caregiver Suite</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <h2 className="font-headline-md font-bold leading-tight">
                Polypharmacy Safety for Aging Parents
              </h2>
              <p className="text-on-primary-container font-body-md text-[16px] leading-relaxed">
                Deterministic interaction screening, cumulative dose tracking, and local on-device strip scanning.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-space-sm text-[14px] text-on-primary-container pt-space-lg border-t border-white/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">lock</span>
              <span>100% on-device photo processing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
              <span>Elder Helpline: 14567</span>
            </div>
          </div>
        </div>

        {/* Right Col: Login Form */}
        <div className="p-space-xl flex flex-col justify-center">
          <h1 className="font-headline-md font-bold text-on-surface mb-1">
            Caregiver Sign In
          </h1>
          <p className="text-on-surface-variant font-body-md mb-space-lg">
            Access your family members' medication records.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
            <Input
              id="login-email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="caregiver@example.com"
              icon="mail"
              required
            />

            <Input
              id="login-password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon="lock"
              required
            />

            {error && (
              <div className="p-space-sm bg-error-container text-on-error-container rounded-xl text-label-sm font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In to Suite'}
            </Button>

            <div className="text-center text-on-surface-variant font-label-sm mt-2">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Register as Caregiver
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

