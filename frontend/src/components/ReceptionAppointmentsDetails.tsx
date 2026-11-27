import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Section, Button, Alert, Badge, Stack, Cluster } from '../components/ui';
import { Icon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';

export interface ReceptionAppointmentsDetailsProps {
  section?: string;
  page?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  saving?: boolean;
  error?: string;
  onSave?: (details: { first_name: string; last_name: string; phone: string }) => void | Promise<void>;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export default function ReceptionAppointmentsDetails({
  firstName,
  lastName,
  email,
  phone,
  saving = false,
  error = '',
  onSave,
}: ReceptionAppointmentsDetailsProps) {
  const { user } = useAuth();
  const account = (user ?? {}) as unknown as Record<string, unknown>;

  const [first, setFirst] = useState<string>(firstName ?? text(account.first_name));
  const [last, setLast] = useState<string>(lastName ?? text(account.last_name));
  const [phoneValue, setPhoneValue] = useState<string>(phone ?? text(account.phone));
  const [saved, setSaved] = useState<boolean>(false);

  const emailValue = email ?? text(account.email);

  useEffect(() => {
    setFirst(firstName ?? text(account.first_name));
    setLast(lastName ?? text(account.last_name));
    setPhoneValue(phone ?? text(account.phone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, phone, user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!onSave) return;
    setSaved(false);
    await onSave({ first_name: first.trim(), last_name: last.trim(), phone: phoneValue.trim() });
    setSaved(true);
  };

  const edit = (setter: (value: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setter(e.target.value);
  };

  return (
    <Section
      narrow
      eyebrow="Front desk"
      title="Account details"
      subtitle="The contact details patients and doctors at Cedar Hollow Health see when you book, move or check in an appointment."
    >
      <form className="ds-form" onSubmit={handleSubmit}>
        <Cluster gap="sm" align="center">
          <Badge tone="soft">Receptionist</Badge>
          <span className="ds-small ds-muted">Signed in on the clinic scheduling desk</span>
        </Cluster>

        {error && <Alert tone="danger">{error}</Alert>}
        {saved && !error && (
          <Alert tone="success">Your details were saved.</Alert>
        )}

        <div className="ds-form-row">
          <div className="ds-field">
            <label className="ds-label" htmlFor="reception-first-name">First name</label>
            <input
              id="reception-first-name"
              className="input"
              value={first}
              onChange={edit(setFirst)}
              autoComplete="given-name"
            />
          </div>
          <div className="ds-field">
            <label className="ds-label" htmlFor="reception-last-name">Last name</label>
            <input
              id="reception-last-name"
              className="input"
              value={last}
              onChange={edit(setLast)}
              autoComplete="family-name"
            />
          </div>
        </div>

        <Stack gap="md">
          <div className="ds-field">
            <label className="ds-label" htmlFor="reception-email">
              <Icon name="mail" size={14} /> Email
            </label>
            <input id="reception-email" className="input" value={emailValue} readOnly disabled />
            <span className="ds-help">Your email is your sign-in. Ask the clinic manager to change it.</span>
          </div>
          <div className="ds-field">
            <label className="ds-label" htmlFor="reception-phone">
              <Icon name="phone" size={14} /> Desk phone
            </label>
            <input
              id="reception-phone"
              className="input"
              type="tel"
              value={phoneValue}
              onChange={edit(setPhoneValue)}
              autoComplete="tel"
            />
            <span className="ds-help">Shown to patients who call back about a booking.</span>
          </div>
        </Stack>

        <div className="ds-form-actions">
          <Button type="submit" variant="primary" disabled={saving || !onSave}>
            <Icon name="check" size={16} /> {saving ? 'Saving...' : 'Save details'}
          </Button>
        </div>
      </form>
    </Section>
  );
}