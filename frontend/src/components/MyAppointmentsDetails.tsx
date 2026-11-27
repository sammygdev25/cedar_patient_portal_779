import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Section, Button, Alert, Stack } from '../components/ui';
import { Icon } from '../components/icons';
import type { User } from '../types';

export interface AccountDetailsValues {
  phone: string;
  date_of_birth: string | null;
}

interface MyAppointmentsDetailsProps {
  section?: string;
  page?: string;
  user?: Partial<User> | null;
  onSave?: (values: AccountDetailsValues) => Promise<unknown> | void;
}

export default function MyAppointmentsDetails({ user = null, onSave }: MyAppointmentsDetailsProps) {
  const [phone, setPhone] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setPhone(user?.phone ?? '');
    setDateOfBirth(user?.date_of_birth ?? '');
  }, [user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onSave) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await onSave({ phone: phone.trim(), date_of_birth: dateOfBirth || null });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'We could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      narrow
      eyebrow="Your account"
      title="Contact details"
      subtitle="Cedar Hollow Health uses these details to confirm appointments and reach you if your doctor needs to reschedule."
    >
      <form className="ds-form" onSubmit={handleSubmit}>
        <Stack gap="md">
          {error && <Alert tone="danger">{error}</Alert>}
          {saved && <Alert tone="success">Your details have been updated.</Alert>}

          <div className="ds-field">
            <label className="ds-label" htmlFor="account-email">Email</label>
            <input
              id="account-email"
              className="input"
              type="email"
              value={user?.email ?? ''}
              readOnly
              disabled
            />
            <span className="ds-help">Your email is your sign-in. Contact reception to change it.</span>
          </div>

          <div className="ds-form-row">
            <div className="ds-field">
              <label className="ds-label" htmlFor="account-phone">Phone</label>
              <input
                id="account-phone"
                className="input"
                type="tel"
                value={phone}
                placeholder="e.g. 555 010 2288"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
              />
              <span className="ds-help">We text appointment reminders to this number.</span>
            </div>

            <div className="ds-field">
              <label className="ds-label" htmlFor="account-dob">Date of birth</label>
              <input
                id="account-dob"
                className="input"
                type="date"
                value={dateOfBirth}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDateOfBirth(e.target.value)}
              />
              <span className="ds-help">Helps us match you to the right patient record.</span>
            </div>
          </div>

          <div className="ds-form-actions">
            <Button type="submit" variant="primary" disabled={saving || !onSave}>
              <Icon name="check" size={16} />
              {saving ? 'Saving...' : 'Save details'}
            </Button>
          </div>
        </Stack>
      </form>
    </Section>
  );
}