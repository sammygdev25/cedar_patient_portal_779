import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoiceList } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { Invoice } from '../types';
import BillsHeader from '../components/BillsHeader';
import BillsContent from '../components/BillsContent';

function BillsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getInvoiceList();
      setInvoices(Array.isArray(list) ? list : []);
    } catch (err) {
      setError('We could not load your bills right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadInvoices();
  }, [authLoading, user, loadInvoices]);

  const unpaid = useMemo(
    () => invoices.filter((invoice) => invoice.status === 'unpaid'),
    [invoices]
  );

  const totalDue = useMemo(
    () => unpaid.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    [unpaid]
  );

  const handlePay = (id: number) => {
    navigate(`/order-pay?order=${id}`);
  };

  return (
    <div className="ds-stack-lg">
      <BillsHeader
        unpaidCount={unpaid.length}
        totalDue={totalDue}
        loading={loading}
        onRefresh={loadInvoices}
      />
      <BillsContent
        invoices={invoices}
        loading={loading || authLoading}
        error={error}
        onPay={handlePay}
      />
    </div>
  );
}

export default BillsPage;