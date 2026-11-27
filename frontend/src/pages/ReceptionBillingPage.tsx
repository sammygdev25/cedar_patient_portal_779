import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import api, { getInvoiceList, updateInvoice } from '../api';
import { useAuth } from '../contexts/AuthContext';
import type { Invoice } from '../types';
import InvoiceForm from '../components/InvoiceForm';
import ReceptionBillingHeader from '../components/ReceptionBillingHeader';
import ReceptionBillingContent from '../components/ReceptionBillingContent';
import { Alert, Card, CardBody, EmptyState, Section } from '../components/ui';

type PatientList = ComponentProps<typeof InvoiceForm>['patients'];

function ReceptionBillingPage() {
  const { user } = useAuth();
  const role = (user as { role?: string } | null)?.role;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<PatientList>([] as unknown as PatientList);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);

  const loadInvoices = useCallback(async () => {
    try {
      const list = await getInvoiceList();
      setInvoices(Array.isArray(list) ? list : []);
      setError('');
    } catch {
      setError('We could not load the clinic invoices. Please try again.');
    }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const res = await api.get('/people/?role=patient');
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.results || [];
      setPatients(list as PatientList);
    } catch {
      setPatients([] as unknown as PatientList);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      setLoading(true);
      await Promise.all([loadInvoices(), loadPatients()]);
      if (active) setLoading(false);
    };
    init();
    return () => {
      active = false;
    };
  }, [loadInvoices, loadPatients]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 2000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const handleCreated = async () => {
    setShowForm(false);
    setActionError('');
    await loadInvoices();
    setNotice('Invoice created');
  };

  const handleVoid = async (invoiceId: number) => {
    setActionError('');
    try {
      await updateInvoice(invoiceId, { status: 'void' });
      await loadInvoices();
      setNotice('Invoice voided');
    } catch {
      setActionError('That invoice could not be voided. Paid invoices cannot be changed.');
    }
  };

  const { unpaidCount, outstandingTotal } = useMemo(() => {
    const unpaid = invoices.filter((inv) => inv.status === 'unpaid');
    const total = unpaid.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    return { unpaidCount: unpaid.length, outstandingTotal: total };
  }, [invoices]);

  if (user && role !== 'receptionist') {
    return (
      <Section narrow>
        <EmptyState
          icon="shield"
          title="Reception access only"
          text="Billing for Cedar Hollow Health is managed by the front desk team."
        />
      </Section>
    );
  }

  return (
    <div className="ds-stack-lg">
      <ReceptionBillingHeader
        unpaidCount={unpaidCount}
        outstandingTotal={outstandingTotal}
        onNewInvoice={() => setShowForm((open) => !open)}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      {(actionError || notice) && (
        <Section tight>
          {actionError && <Alert tone="danger">{actionError}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
        </Section>
      )}
      {showForm && (
        <Section tight>
          <Card>
            <CardBody>
              <InvoiceForm patients={patients} onCreated={handleCreated} />
            </CardBody>
          </Card>
        </Section>
      )}
      <ReceptionBillingContent
        invoices={invoices}
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
        onVoid={handleVoid}
      />
    </div>
  );
}

export default ReceptionBillingPage;