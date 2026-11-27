import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { createPrescription } from '../api';
import type { Prescription, Product } from '../types';
import { Alert, Button } from './ui';
import { Icon } from './icons';

interface PrescriptionFormProps {
  appointmentId: number;
  patientId: number;
  products: Product[];
  onSaved: (prescription?: Prescription) => void;
}

function errorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first) && first.length > 0) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'The prescription could not be saved. Check the fields and try again.';
}

function PrescriptionForm({ appointmentId, patientId, products, onSaved }: PrescriptionFormProps) {
  const [productId, setProductId] = useState<string>('');
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [refills, setRefills] = useState('0');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const catalog = (Array.isArray(products) ? products : []).filter((p) => p.is_active !== false);

  const handleProduct = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setProductId(value);
    const chosen = catalog.find((p) => String(p.id) === value);
    if (chosen && !medicineName.trim()) setMedicineName(chosen.name);
  };

  const reset = () => {
    setProductId('');
    setMedicineName('');
    setDosage('');
    setInstructions('');
    setNotes('');
    setRefills('0');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    if (!medicineName.trim() || !dosage.trim() || !instructions.trim()) {
      setError('Medicine name, dosage and instructions are required.');
      return;
    }
    const refillCount = Math.max(0, parseInt(refills, 10) || 0);
    const payload: Record<string, unknown> = {
      appointment: appointmentId,
      patient: patientId,
      medicine_name: medicineName.trim(),
      dosage: dosage.trim(),
      instructions: instructions.trim(),
      notes: notes.trim(),
      refills_allowed: refillCount,
      is_active: true,
    };
    if (productId) payload.product = Number(productId);
    setSaving(true);
    try {
      const created = await createPrescription(payload as Partial<Prescription>);
      setSaved(true);
      reset();
      onSaved(created as Prescription);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ds-form" onSubmit={handleSubmit}>
      {error && <Alert tone="danger">{error}</Alert>}
      {saved && <Alert tone="success">Prescription saved. The patient can now see it in their records and order it from the pharmacy.</Alert>}

      <div className="ds-field">
        <label className="ds-label" htmlFor="rx-product">Pharmacy product (optional)</label>
        <select id="rx-product" className="input" value={productId} onChange={handleProduct}>
          <option value="">Not stocked by the Cedar Hollow pharmacy</option>
          {catalog.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.is_prescription_only ? ' (prescription only)' : ''}
            </option>
          ))}
        </select>
        <span className="ds-help">Linking a product lets the patient order this medicine in one step.</span>
      </div>

      <div className="ds-form-row">
        <div className="ds-field">
          <label className="ds-label" htmlFor="rx-medicine">Medicine name</label>
          <input
            id="rx-medicine"
            className="input"
            type="text"
            maxLength={200}
            value={medicineName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMedicineName(e.target.value)}
            placeholder="e.g. Amoxicillin 500 mg capsules"
            required
          />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="rx-dosage">Dosage</label>
          <input
            id="rx-dosage"
            className="input"
            type="text"
            maxLength={120}
            value={dosage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDosage(e.target.value)}
            placeholder="e.g. 1 capsule three times a day"
            required
          />
        </div>
      </div>

      <div className="ds-field">
        <label className="ds-label" htmlFor="rx-instructions">Instructions for the patient</label>
        <textarea
          id="rx-instructions"
          className="input"
          rows={3}
          value={instructions}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInstructions(e.target.value)}
          placeholder="How and when to take it, how long, what to avoid"
          required
        />
      </div>

      <div className="ds-form-row">
        <div className="ds-field">
          <label className="ds-label" htmlFor="rx-refills">Refills allowed</label>
          <input
            id="rx-refills"
            className="input"
            type="number"
            min={0}
            max={12}
            value={refills}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRefills(e.target.value)}
          />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="rx-notes">Notes (optional)</label>
          <input
            id="rx-notes"
            className="input"
            type="text"
            value={notes}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
            placeholder="Allergies checked, interactions, pharmacist remarks"
          />
        </div>
      </div>

      <div className="ds-form-actions">
        <Button type="submit" variant="primary" disabled={saving}>
          <Icon name="check" size={16} /> {saving ? 'Saving...' : 'Issue prescription'}
        </Button>
      </div>
    </form>
  );
}

export default PrescriptionForm;