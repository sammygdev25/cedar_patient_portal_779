import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { createDocument } from '../api';
import { Alert, Button } from './ui';
import { Icon } from './icons';

const MAX_BYTES = 10 * 1024 * 1024;

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'insurance', label: 'Insurance card' },
  { value: 'lab_result', label: 'Lab result' },
  { value: 'other', label: 'Other' },
];

interface DocumentUploadFormProps {
  onUploaded: (...args: any[]) => void;
}

function isAllowedType(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  if (file.type.startsWith('image/')) return true;
  return /\.(pdf|png|jpe?g|gif|webp|heic)$/i.test(file.name);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data.length < 300) return data;
  if (data && typeof data === 'object') {
    const parts = Object.entries(data as Record<string, unknown>).map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(' ') : String(value);
      return key === 'detail' || key === 'non_field_errors' ? text : `${key}: ${text}`;
    });
    if (parts.length > 0) return parts.join(' ');
  }
  return 'We could not upload your document. Please try again.';
}

function DocumentUploadForm({ onUploaded }: DocumentUploadFormProps) {
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('other');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setSuccess('');
    setError('');
    if (!chosen) {
      setFile(null);
      return;
    }
    if (!isAllowedType(chosen)) {
      setError('Please choose a PDF or an image (PNG, JPG, GIF, WEBP).');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setError(`That file is ${formatSize(chosen.size)}. The limit is 10 MB.`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(chosen);
    if (!title.trim()) {
      setTitle(chosen.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!title.trim()) {
      setError('Please give the document a title.');
      return;
    }
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { title: title.trim(), category, file } as unknown as Parameters<typeof createDocument>[0];
      const created = await createDocument(payload);
      setTitle('');
      setCategory('other');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess('Document uploaded. Only you and your care team can see it.');
      if (typeof onUploaded === 'function') onUploaded(created);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="ds-form" onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert tone="danger">
          <Icon name="alert" size={16} /> {error}
        </Alert>
      )}
      {success && (
        <Alert tone="success">
          <Icon name="check" size={16} /> {success}
        </Alert>
      )}

      <div className="ds-form-row">
        <div className="ds-field">
          <label className="ds-label" htmlFor="document-title">Title</label>
          <input
            id="document-title"
            className="input"
            type="text"
            maxLength={200}
            placeholder="e.g. Blood panel, March results"
            value={title}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="document-category">Category</label>
          <select
            id="document-category"
            className="input"
            value={category}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
            disabled={submitting}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="ds-field">
        <label className="ds-label" htmlFor="document-file">File</label>
        <input
          id="document-file"
          ref={fileInputRef}
          className="input"
          type="file"
          accept="application/pdf,image/*"
          onChange={handleFileChange}
          disabled={submitting}
        />
        <span className="ds-help">
          {file
            ? `${file.name} (${formatSize(file.size)})`
            : 'PDF or image, up to 10 MB. Insurance cards and lab results are kept private to your account.'}
        </span>
      </div>

      <div className="ds-form-actions">
        <Button type="submit" variant="primary" disabled={submitting || !file}>
          <Icon name="upload" size={16} /> {submitting ? 'Uploading...' : 'Upload document'}
        </Button>
      </div>
    </form>
  );
}

export default DocumentUploadForm;