import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Alert, Button, Section } from '../components/ui';
import { Icon } from '../components/icons';
import type { User } from '../types';

export interface MyOrdersDetailsValues {
  phone: string;
  date_of_birth: string;
}

interface MyOrdersDetailsProps {
  account?: Partial<User> | null;
  saving?: boolean;
  error?: string;
  saved?: boolean;
  onSave?: (values: MyOrdersDetailsValues) => void | Promise<void>;
}

function MyOrdersDetails({ account, saving = false, error = '', saved = false, onSave }: MyOrdersDetailsProps) {
  const accountPhone = String(account?.phone ?? '');
  const accountBirth = String(account?.date_of_birth ?? '');
  const [phone, setPhone] = useState<string>(accountPhone);
  const [dateOfBirth, setDateOfBirth] = useState<string>(accountBirth);

  useEffect(() => {
    setPhone(accountPhone);
    setDateOfBirth(accountBirth);
  }, [accountPhone, accountBirth]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSave) {
      void onSave({ phone: phone.trim(), date_of_birth: dateOfBirth });
    }
  };

  const dirty = phone !== accountPhone || dateOfBirth !== accountBirth;

  return (
    <Section
      id="account-details"
      narrow
      eyebrow="Account"
      title="Your contact details"
      subtitle="Cedar Hollow Pharmacy uses these details to reach you when an order is packed, ready for pickup or out for delivery."
    >
      <form className="ds-form" onSubmit={handleSubmit}>
        <div className="ds-field">
          <label className="ds-label" htmlFor="account-email">Email</label>
          <input
            id="account-email"
            className="input"
            type="email"
            value={String(account?.email ?? '')}
            readOnly
            disabled
          />
          <span className="ds-help">Your sign-in email. Contact reception to change it.</span>
        </div>

        <div className="ds-form-row">
          <div className="ds-field">
            <label className="ds-label" htmlFor="account-phone">
              <Icon name="phone" size={16} /> Phone
            </label>
            <input
              id="account-phone"
              className="input"
              type="tel"
              value={phone}
              placeholder="e.g. 555 0142"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            />
            <span className="ds-help">Used for pickup and delivery updates.</span>
          </div>

          <div className="ds-field">
            <label className="ds-label" htmlFor="account-dob">
              <Icon name="calendar" size={16} /> Date of birth
            </label>
            <input
              id="account-dob"
              className="input"
              type="date"
              value={dateOfBirth}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setDateOfBirth(e.target.value)}
            />
            <span className="ds-help">Helps the pharmacist verify prescription orders.</span>
          </div>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}
        {saved && !error && !dirty && <Alert tone="success">Your details have been saved.</Alert>}

        <div className="ds-form-actions">
          <Button type="submit" variant="primary" disabled={saving || !dirty || !onSave}>
            <Icon name="check" size={16} /> {saving ? 'Saving...' : 'Save details'}
          </Button>
        </div>
      </form>
    </Section>
  );
}

export default MyOrdersDetails;