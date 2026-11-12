import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatient } from '../api/patients.js';
import { useI18n } from '../context/I18nContext.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Input from '../components/common/Input.jsx';
import Chip from '../components/common/Chip.jsx';

export default function PatientFormPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [dob, setDob] = useState('1952-05-15');
  const [gender, setGender] = useState('male');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('Sunita Sharma');
  const [emergencyPhone, setEmergencyPhone] = useState('+91 98111 22233');

  const [conditions, setConditions] = useState([
    { code: 'I10', label: 'Hypertension' },
    { code: 'E11', label: 'Type 2 Diabetes' }
  ]);
  const [newCondition, setNewCondition] = useState('');

  const [allergies, setAllergies] = useState([
    { id: 'a1', name: 'Sulfa Drugs' }
  ]);
  const [newAllergy, setNewAllergy] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuth] = useState(() => {
    try {
      return !!localStorage.getItem('medguard_token');
    } catch {
      return false;
    }
  });

  const handleAddCondition = () => {
    if (newCondition.trim()) {
      setConditions([...conditions, { code: 'CUSTOM', label: newCondition.trim() }]);
      setNewCondition('');
    }
  };

  const handleAddAllergy = () => {
    if (newAllergy.trim()) {
      setAllergies([...allergies, { id: `alg-${Date.now()}`, name: newAllergy.trim() }]);
      setNewAllergy('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the elder\'s full name.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const birthYear = new Date(dob).getFullYear();
      const calculatedAge = new Date().getFullYear() - birthYear;

      const newPatient = await createPatient({
        name: name.trim(),
        dob,
        age: calculatedAge,
        gender,
        bloodGroup,
        phone,
        emergencyContact: {
          name: emergencyName,
          phone: emergencyPhone
        },
        conditions,
        allergies
      });

      const targetId = newPatient?.id || newPatient?.patient?.id;
      if (targetId) {
        navigate(`/patients/${targetId}`);
      } else {
        navigate('/patients');
      }
    } catch (err) {
      console.error("Failed to create patient", err);
      setError(err.message || 'Could not save elder profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-lg max-w-3xl mx-auto">
      <div>
        <h1 className="font-headline-lg font-bold text-on-surface">
          {t('patient.addPatientTitle', 'Add New Elder Profile')}
        </h1>
        <p className="font-body-md text-on-surface-variant">
          Enter clinical background, documented allergies, and emergency points of contact.
        </p>
      </div>

      {!isAuth && (
        <div className="p-3.5 rounded-xl bg-secondary-container/40 border border-secondary-container text-on-secondary-container flex items-center justify-between gap-3 text-label-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">info</span>
            <span>Guest Mode: Profiles are saved to your current browser session.</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-bold underline hover:text-primary shrink-0"
          >
            Sign In
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[22px]">error</span>
            <span className="font-body-md font-semibold">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-on-error-container hover:text-error"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-space-lg">
        {/* Basic Identification */}
        <Card className="flex flex-col gap-space-md">
          <h2 className="font-headline-sm font-bold text-on-surface">
            Basic Details
          </h2>

          <Input
            id="elder-name"
            label="Elder's Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Sharma"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
            <Input
              id="elder-dob"
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="elder-gender" className="font-label-md text-on-surface">
                Gender
              </label>
              <select
                id="elder-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-14 px-3 rounded-xl border-2 border-border-strong bg-surface-container-lowest font-body-lg text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="elder-blood" className="font-label-md text-on-surface">
                Blood Group
              </label>
              <select
                id="elder-blood"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="h-14 px-3 rounded-xl border-2 border-border-strong bg-surface-container-lowest font-body-lg text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card className="flex flex-col gap-space-md">
          <h2 className="font-headline-sm font-bold text-on-surface">
            Emergency Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <Input
              id="em-name"
              label="Emergency Contact Name & Relation"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="e.g. Sunita Sharma (Daughter)"
              required
            />

            <Input
              id="em-phone"
              label="Contact Phone Number"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="+91 98111 22233"
              required
            />
          </div>
        </Card>

        {/* Chronic Conditions */}
        <Card className="flex flex-col gap-space-md">
          <h2 className="font-headline-sm font-bold text-on-surface">
            {t('patient.conditions', 'Chronic Conditions')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {conditions.map((c, idx) => (
              <Chip
                key={idx}
                label={c.label}
                onRemove={() => setConditions(conditions.filter((_, i) => i !== idx))}
                variant="condition"
              />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              placeholder="Add condition (e.g. Osteoarthritis, Glaucoma)..."
              className="h-12 px-4 rounded-xl border border-border-strong bg-surface-container-low flex-1"
            />
            <Button variant="secondary" onClick={handleAddCondition}>
              Add
            </Button>
          </div>
        </Card>

        {/* Documented Allergies */}
        <Card className="flex flex-col gap-space-md">
          <h2 className="font-headline-sm font-bold text-on-surface">
            {t('patient.allergies', 'Documented Allergies')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {allergies.map((a, idx) => (
              <Chip
                key={idx}
                label={a.name}
                onRemove={() => setAllergies(allergies.filter((_, i) => i !== idx))}
                variant="allergy"
              />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              placeholder="Add drug or substance allergy (e.g. Penicillin)..."
              className="h-12 px-4 rounded-xl border border-border-strong bg-surface-container-low flex-1"
            />
            <Button variant="secondary" onClick={handleAddAllergy}>
              Add
            </Button>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-space-md">
          <Button
            variant="secondary"
            onClick={() => navigate('/patients')}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading || !name.trim()}
          >
            {loading ? 'Saving...' : t('common.save', 'Save Elder Profile')}
          </Button>
        </div>
      </form>
    </div>
  );
}

