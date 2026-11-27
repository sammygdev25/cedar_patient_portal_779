import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { createContactMessage } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Section, Split, Stack } from '../components/ui';
import { Icon } from '../components/icons';

interface ContactFormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const emptyForm: ContactFormState = { name: '', email: '', phone: '', message: '' };

function ContactSection() {
  const { user } = useAuth();
  const [form, setForm] = useState<ContactFormState>(emptyForm);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const emailValue = form.email || user?.email || '';

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSent(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !emailValue.trim() || !form.message.trim()) {
      setError('Please add your name, email and a short message so we can reply.');
      return;
    }
    setSubmitting(true);
    try {
      await createContactMessage({
        name: form.name.trim(),
        email: emailValue.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      });
      setForm(emptyForm);
      setSent(true);
    } catch (err) {
      setError('We could not send your message. Please try again or call the clinic.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section
      id="contact"
      eyebrow="Contact us"
      title="Questions for Cedar Hollow Health?"
      subtitle="Send a note to our front desk team. For urgent medical concerns, call the clinic or your local emergency number."
    >
      <Split>
        <Stack gap="md">
          <div className="ds-cluster">
            <Icon name="map-pin" />
            <div>
              <strong>Visit</strong>
              <p className="ds-muted ds-small">214 Mill Street, Cedar Hollow</p>
            </div>
          </div>
          <div className="ds-cluster">
            <Icon name="phone" />
            <div>
              <strong>Call</strong>
              <p className="ds-muted ds-small">Front desk and pharmacy line</p>
            </div>
          </div>
          <div className="ds-cluster">
            <Icon name="mail" />
            <div>
              <strong>Email</strong>
              <p className="ds-muted ds-small">We reply within one business day</p>
            </div>
          </div>
          <div className="ds-cluster">
            <Icon name="clock" />
            <div>
              <strong>Hours</strong>
              <p className="ds-muted ds-small">See the opening hours above</p>
            </div>
          </div>
        </Stack>

        <form className="ds-form" onSubmit={handleSubmit} noValidate>
          {sent && (
            <Alert tone="success">
              Thank you. Your message has reached our front desk and we will be in touch soon.
            </Alert>
          )}
          {error && <Alert tone="danger">{error}</Alert>}

          <div className="ds-form-row">
            <div className="ds-field">
              <label className="ds-label" htmlFor="contact-name">Full name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                className="input"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>
            <div className="ds-field">
              <label className="ds-label" htmlFor="contact-phone">Phone (optional)</label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                className="input"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="ds-field">
            <label className="ds-label" htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              className="input"
              value={emailValue}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="ds-field">
            <label className="ds-label" htmlFor="contact-message">How can we help?</label>
            <textarea
              id="contact-message"
              name="message"
              className="input"
              rows={5}
              value={form.message}
              onChange={handleChange}
              placeholder="Ask about appointments, services, prescriptions or the pharmacy"
              required
            />
            <span className="ds-help">Please do not include sensitive medical details here.</span>
          </div>

          <div className="ds-form-actions">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send message'}
            </Button>
          </div>
        </form>
      </Split>
    </Section>
  );
}

export default ContactSection;