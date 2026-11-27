import { useState } from 'react';
import type { Document as ClinicDocument } from '../types';
import { Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, EmptyState, Grid, Media } from '../components/ui';
import { Icon } from '../components/icons';

interface DocumentListProps {
  documents: ClinicDocument[];
  onDelete: (id: number) => void | Promise<void>;
}

const CATEGORY_LABELS: Record<string, string> = {
  insurance: 'Insurance card',
  lab_result: 'Lab result',
  other: 'Other',
};

function formatSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploaded(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function DocumentList({ documents, onDelete }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const items: ClinicDocument[] = Array.isArray(documents) ? documents : [];

  const handleDelete = async (doc: ClinicDocument) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    try {
      await onDelete(doc.id);
    } finally {
      setDeletingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon="book"
        title="No documents yet"
        text="Upload your insurance card or lab results and they will be kept here, private to you and available to the clinic when you visit Cedar Hollow Health."
      />
    );
  }

  return (
    <Grid size="md">
      {items.map((doc) => {
        const isImage = (doc.content_type || '').startsWith('image/');
        const isDeleting = deletingId === doc.id;
        return (
          <Card key={doc.id}>
            <Media
              src={isImage ? doc.file : undefined}
              alt={doc.title}
              ratio="wide"
              badge={CATEGORY_LABELS[doc.category] || 'Other'}
            />
            <CardBody>
              <CardTitle>{doc.title}</CardTitle>
              <CardMeta>
                <Badge tone="soft">{CATEGORY_LABELS[doc.category] || 'Other'}</Badge>{' '}
                {formatSize(doc.size_bytes)} · Uploaded {formatUploaded(doc.created_at)}
              </CardMeta>
            </CardBody>
            <CardFooter>
              <a className="btn btn-secondary" href={doc.file} target="_blank" rel="noopener noreferrer">
                <Icon name="eye" size={16} /> View
              </a>
              <Button variant="danger" onClick={() => handleDelete(doc)} disabled={isDeleting}>
                <Icon name="trash" size={16} /> {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </Grid>
  );
}

export default DocumentList;