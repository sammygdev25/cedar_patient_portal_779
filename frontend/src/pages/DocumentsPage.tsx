import { useCallback, useEffect, useRef, useState } from 'react';
import { getDocumentList, deleteDocument } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Section } from '../components/ui';
import DocumentsHeader from '../components/DocumentsHeader';
import DocumentsContent from '../components/DocumentsContent';
import DocumentUploadForm from '../components/DocumentUploadForm';

type DocumentItem = Awaited<ReturnType<typeof getDocumentList>>[number];

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 2000);
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getDocumentList();
      setDocuments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(errorMessage(err, 'We could not load your documents. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    loadDocuments();
  }, [authLoading, user, loadDocuments]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const handleUploaded = async () => {
    setShowForm(false);
    await loadDocuments();
    showNotice('Document uploaded');
  };

  const handleDelete = async (id: number) => {
    setError('');
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      showNotice('Document deleted');
    } catch (err) {
      setError(errorMessage(err, 'We could not delete that document. Please try again.'));
    }
  };

  return (
    <div className="ds-stack-lg">
      <DocumentsHeader
        documentCount={documents.length}
        onUploadClick={() => setShowForm((prev) => !prev)}
      />
      {notice && (
        <Section tight narrow>
          <Alert tone="success">{notice}</Alert>
        </Section>
      )}
      {showForm && (
        <Section tight narrow>
          <DocumentUploadForm onUploaded={handleUploaded} />
        </Section>
      )}
      <DocumentsContent
        documents={documents}
        loading={loading || authLoading}
        error={error}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default DocumentsPage;