import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { createProduct, updateProduct } from '../api';
import type { Product } from '../types';
import { Alert, Button, Media } from './ui';
import { Icon } from './icons';

interface ProductFormProps {
  product?: Product | null;
  onSaved: (product?: Product) => void;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  stock_quantity: string;
  in_stock: boolean;
  is_prescription_only: boolean;
  is_active: boolean;
}

function toFormState(product?: Product | null): FormState {
  const source = (product ?? null) as unknown as Record<string, unknown> | null;
  return {
    name: source ? String(source.name ?? '') : '',
    description: source ? String(source.description ?? '') : '',
    price: source && source.price !== undefined && source.price !== null ? String(source.price) : '',
    stock_quantity: source && source.stock_quantity !== undefined && source.stock_quantity !== null ? String(source.stock_quantity) : '0',
    in_stock: source ? Boolean(source.in_stock) : true,
    is_prescription_only: source ? Boolean(source.is_prescription_only) : false,
    is_active: source ? Boolean(source.is_active) : true,
  };
}

function describeError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object') {
    const parts = Object.entries(data as Record<string, unknown>).map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(' ') : String(value);
      return key === 'detail' || key === 'non_field_errors' ? text : `${key}: ${text}`;
    });
    if (parts.length > 0) return parts.join(' | ');
  }
  if (err instanceof Error && err.message) return err.message;
  return 'The product could not be saved. Please try again.';
}

function ProductForm({ product, onSaved }: ProductFormProps) {
  const [form, setForm] = useState<FormState>(toFormState(product));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const productId = product ? (product as unknown as { id?: number }).id : undefined;
  const currentImage = product ? ((product as unknown as { image?: string | null }).image ?? '') : '';
  const isEditing = typeof productId === 'number';

  useEffect(() => {
    setForm(toFormState(product));
    setImageFile(null);
    setError('');
  }, [product]);

  const setText = (field: 'name' | 'description' | 'price' | 'stock_quantity') =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const setFlag = (field: 'in_stock' | 'is_prescription_only' | 'is_active') =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.checked }));
    };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    setImageFile(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Math.floor(Number(form.stock_quantity));

    if (!name) {
      setError('Please enter the medicine or product name.');
      return;
    }
    if (form.price.trim() === '' || Number.isNaN(price) || price < 0) {
      setError('Please enter a valid price of zero or more.');
      return;
    }
    if (Number.isNaN(stock) || stock < 0) {
      setError('Stock quantity must be a whole number of zero or more.');
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      description: form.description.trim(),
      price: Number(price || 0).toFixed(2),
      stock_quantity: stock,
      in_stock: form.in_stock,
      is_prescription_only: form.is_prescription_only,
      is_active: form.is_active,
    };
    if (imageFile) {
      payload.image = imageFile;
    }

    setSaving(true);
    try {
      const saved = isEditing
        ? await updateProduct(productId as number, payload as unknown as Partial<Product>)
        : await createProduct(payload as unknown as Partial<Product>);
      if (!isEditing) {
        setForm(toFormState(null));
        setImageFile(null);
      }
      onSaved(saved as Product);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ds-form" onSubmit={handleSubmit} noValidate>
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="ds-field">
        <label className="ds-label" htmlFor="product-name">Product name</label>
        <input
          id="product-name"
          className="input"
          type="text"
          value={form.name}
          onChange={setText('name')}
          placeholder="e.g. Ibuprofen 200 mg, 24 tablets"
          maxLength={200}
          required
        />
      </div>

      <div className="ds-field">
        <label className="ds-label" htmlFor="product-description">Description</label>
        <textarea
          id="product-description"
          className="input"
          rows={3}
          value={form.description}
          onChange={setText('description')}
          placeholder="What it is used for, strength and any patient guidance"
        />
        <span className="ds-help">Shown to patients in the pharmacy catalog.</span>
      </div>

      <div className="ds-form-row">
        <div className="ds-field">
          <label className="ds-label" htmlFor="product-price">Price (USD)</label>
          <input
            id="product-price"
            className="input"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={form.price}
            onChange={setText('price')}
            placeholder="0.00"
            required
          />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="product-stock">Stock quantity</label>
          <input
            id="product-stock"
            className="input"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.stock_quantity}
            onChange={setText('stock_quantity')}
            required
          />
        </div>
      </div>

      <div className="ds-field">
        <label className="ds-label" htmlFor="product-image">Product picture</label>
        {currentImage && !imageFile && (
          <Media src={currentImage} alt={form.name || 'Current product picture'} ratio="square" />
        )}
        <input
          id="product-image"
          className="input"
          type="file"
          accept="image/*"
          onChange={handleFile}
        />
        <span className="ds-help">
          {imageFile
            ? `Selected: ${imageFile.name}`
            : isEditing
              ? 'Leave empty to keep the current picture.'
              : 'Optional. A clear photo of the packaging works best.'}
        </span>
      </div>

      <div className="ds-field">
        <label className="ds-cluster">
          <input type="checkbox" checked={form.is_active} onChange={setFlag('is_active')} />
          <span>Listed in the catalog</span>
        </label>
        <label className="ds-cluster">
          <input type="checkbox" checked={form.in_stock} onChange={setFlag('in_stock')} />
          <span>Available to order</span>
        </label>
        <label className="ds-cluster">
          <input
            type="checkbox"
            checked={form.is_prescription_only}
            onChange={setFlag('is_prescription_only')}
          />
          <span>Prescription only (patients order it from a doctor-approved prescription)</span>
        </label>
      </div>

      <div className="ds-form-actions">
        <Button type="submit" variant="primary" disabled={saving}>
          <Icon name={isEditing ? 'check' : 'plus'} size={16} />
          {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Add product'}
        </Button>
      </div>
    </form>
  );
}

export default ProductForm;