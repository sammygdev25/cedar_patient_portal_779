import type { ReactNode } from 'react';
import type { Document } from '../types';
import { Section, Grid, Card, CardBody, CardTitle, CardMeta, CardFooter, Badge, Button, Stack, Cluster, EmptyState, SkeletonCards, Alert } from '../components/ui';
import { Icon } from '../components/icons';

interface DocumentsContentProps {
  documents?: Document[];
  loading?: boolean;
  error?: string;
  onDelete?: (id: number) => void;
  children?: ReactNode;
}

const CATEGORY_LABELS: Record<string, string> = {
  insurance: 'Insurance card',
  lab_result: 'Lab result',
  other: 'Other',
};

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploaded(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DocumentsContent({
  documents = [],
  loading = false,
  error = '',
  onDelete,
  children,
}: DocumentsContentProps) {
  const items: Document[] = Array.isArray(documents) ? documents : [];

  const handleDelete = (doc: Document) => {
    if (!onDelete) return;
    if (window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) {
      onDelete(doc.id);
    }
  };

  return (
    <Section
      eyebrow="Private to you"
      title="Your documents"
      subtitle="Insurance cards and lab results you have shared with Cedar Hollow Health. Only you can see these files."
    >
      <Stack gap="lg">
        {error && <Alert tone="danger">{error}</Alert>}
        {children}
        {loading ? (
          <SkeletonCards count={3} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="upload"
            title="No documents uploaded yet"
            text="Upload an insurance card or a lab result as a PDF or image (up to 10 MB) so it is ready for your next visit."
          />
        ) : (
          <Grid size="md">
            {items.map((doc) => (
              <Card key={doc.id}>
                <CardBody>
                  <Cluster gap="sm" align="center">
                    <Icon name={doc.content_type?.startsWith('image/') ? 'image' : 'book'} size={20} />
                    <Badge tone="soft">{CATEGORY_LABELS[doc.category] || 'Other'}</Badge>
                  </Cluster>
                  <CardTitle>{doc.title}</CardTitle>
                  <CardMeta>
                    {formatSize(doc.size_bytes)} · Uploaded {formatUploaded(doc.created_at)}
                  </CardMeta>
                </CardBody>
                <CardFooter>
                  <Cluster gap="sm">
                    {doc.file && (
                      <Button variant="secondary" href={doc.file}>
                        <Icon name="download" size={16} /> Download
                      </Button>
                    )}
                    {onDelete && (
                      <Button variant="danger" onClick={() => handleDelete(doc)}>
                        <Icon name="trash" size={16} /> Delete
                      </Button>
                    )}
                  </Cluster>
                </CardFooter>
              </Card>
            ))}
          </Grid>
        )}
      </Stack>
    </Section>
  );
}