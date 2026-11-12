import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth.js';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

export default function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ name, email, phone, password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl border border-border-subtle p-space-xl shadow-lg flex flex-col gap-space-lg">
        <div>
          <div className="flex items-center gap-space-xs text-primary font-bold mb-1">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
            <span>MedGuard</span>
          </div>
          <h1 className="font-headline-md font-bold text-on-surface">
            Create Caregiver Account
          </h1>
          <p className="text-on-surface-variant font-body-md mt-0.5">
            Safeguard your family elders from adverse drug reactions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          <Input
            id="reg-name"
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sunita Sharma"
            icon="person"
            required
          />

          <Input
            id="reg-email"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sunita@example.com"
            icon="mail"
            required
          />

          <Input
            id="reg-phone"
            label="Mobile Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98111 22233"
            icon="call"
            required
          />

          <Input
            id="reg-password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            icon="lock"
            required
          />

          {error && (
            <div className="p-space-sm bg-error-container text-on-error-container rounded-xl text-label-sm font-semibold">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full mt-2"
          >
            {loading ? 'Creating account...' : 'Register'}
          </Button>

          <div className="text-center text-on-surface-variant font-label-sm mt-1">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

