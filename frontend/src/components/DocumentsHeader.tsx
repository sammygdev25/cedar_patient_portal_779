import type { ReactNode } from 'react';
import { PageHeader, Button, Badge } from '../components/ui';
import { Icon } from '../components/icons';

interface DocumentsHeaderProps {
  documentCount?: number;
  onUploadClick?: () => void;
  actions?: ReactNode;
}

export default function DocumentsHeader({ documentCount, onUploadClick, actions }: DocumentsHeaderProps) {
  const hasCount = typeof documentCount === 'number';

  return (
    <PageHeader
      eyebrow="Patient portal"
      title="My documents"
      subtitle="Keep your insurance card, lab results and other paperwork in one private place. Upload a PDF or image up to 10 MB; only you and your care team at Cedar Hollow Health can see what you add."
      actions={
        <div className="ds-cluster">
          {hasCount && (
            <Badge tone="soft">
              <Icon name="book" size={14} /> {documentCount} {documentCount === 1 ? 'file' : 'files'}
            </Badge>
          )}
          {onUploadClick && (
            <Button variant="primary" onClick={onUploadClick}>
              <Icon name="upload" size={16} /> Upload a document
            </Button>
          )}
          {actions}
        </div>
      }
    />
  );
}