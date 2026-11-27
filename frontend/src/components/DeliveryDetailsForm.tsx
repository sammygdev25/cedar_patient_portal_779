import { useId } from 'react';
import type { ChangeEvent } from 'react';
import { Icon } from '../components/icons';

interface DeliveryDetailsValue {
  delivery_address?: string;
  phone?: string;
  notes?: string;
}

interface DeliveryDetailsFormProps {
  value: DeliveryDetailsValue;
  onChange: (next: DeliveryDetailsValue) => void;
  fulfillment: string;
}

export default function DeliveryDetailsForm({ value, onChange, fulfillment }: DeliveryDetailsFormProps) {
  const baseId = useId();
  const isDelivery = fulfillment === 'delivery';
  const current: DeliveryDetailsValue = value || {};

  const update = (field: keyof DeliveryDetailsValue) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...current, [field]: e.target.value });
    };

  return (
    <div className="ds-form">
      {isDelivery ? (
        <div className="ds-field">
          <label className="ds-label" htmlFor={`${baseId}-address`}>
            Delivery address
          </label>
          <textarea
            id={`${baseId}-address`}
            className="input"
            rows={3}
            required
            placeholder="Street, apartment or unit, city and postal code"
            value={current.delivery_address || ''}
            onChange={update('delivery_address')}
          />
          <span className="ds-help">
            Our pharmacy team delivers within the Cedar Hollow service area. Someone must be home to receive the order.
          </span>
        </div>
      ) : (
        <div className="ds-alert">
          <Icon name="map-pin" size={18} />
          <span>
            Pick up your order at the Cedar Hollow Health pharmacy desk. We will have it packed and ready when you arrive.
          </span>
        </div>
      )}

      <div className="ds-field">
        <label className="ds-label" htmlFor={`${baseId}-phone`}>
          Contact phone
        </label>
        <input
          id={`${baseId}-phone`}
          className="input"
          type="tel"
          autoComplete="tel"
          required={isDelivery}
          placeholder="(555) 123-4567"
          value={current.phone || ''}
          onChange={update('phone')}
        />
        <span className="ds-help">
          {isDelivery
            ? 'The driver will call this number on arrival.'
            : 'We will text or call if there is a question about your order.'}
        </span>
      </div>

      <div className="ds-field">
        <label className="ds-label" htmlFor={`${baseId}-notes`}>
          Notes for the pharmacist (optional)
        </label>
        <textarea
          id={`${baseId}-notes`}
          className="input"
          rows={3}
          placeholder={
            isDelivery
              ? 'Gate code, preferred delivery window, allergies we should know about'
              : 'Allergies, questions about dosage, or who will collect the order'
          }
          value={current.notes || ''}
          onChange={update('notes')}
        />
      </div>
    </div>
  );
}