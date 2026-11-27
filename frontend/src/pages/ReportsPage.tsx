import { useCallback, useState } from 'react';
import api, { getAppointmentList, getInvoiceList } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingBlock } from '../components/ui';
import MonthlyReportForm from '../components/MonthlyReportForm';
import ReportsHeader from '../components/ReportsHeader';
import ReportsContent from '../components/ReportsContent';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function labelForMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  if (!year || !mon) return month;
  return new Date(year, mon - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function inMonth(value: string | null | undefined, month: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return key === month;
}

function filenameFromHeader(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : fallback;
}

function ReportsPage() {
  const { loading: authLoading } = useAuth();
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [filename, setFilename] = useState<string | null>(null);
  const [appointmentCount, setAppointmentCount] = useState<number | null>(null);
  const [invoiceCount, setInvoiceCount] = useState<number | null>(null);

  const download = useCallback(async (selected: string) => {
    setMonth(selected);
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/reports/monthly/', {
        params: { month: selected },
        responseType: 'blob',
      });
      const fallback = `cedar-hollow-report-${selected}.csv`;
      const name = filenameFromHeader(
        response.headers ? (response.headers['content-disposition'] as string | undefined) : undefined,
        fallback,
      );
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setFilename(name);

      try {
        const [appointments, invoices] = await Promise.all([getAppointmentList(), getInvoiceList()]);
        setAppointmentCount(appointments.filter((a) => inMonth(a.start_time, selected)).length);
        setInvoiceCount(invoices.filter((i) => inMonth(i.created_at, selected)).length);
      } catch {
        setAppointmentCount(null);
        setInvoiceCount(null);
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setFilename(null);
      setError(
        status === 403 || status === 401
          ? 'Only reception staff can download the monthly report. Please sign in with a reception account.'
          : 'The report could not be generated. Please try again in a moment.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRedownload = useCallback(() => {
    void download(month);
  }, [download, month]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (authLoading) {
    return <LoadingBlock label="Loading your session..." />;
  }

  return (
    <div className="ds-stack-lg">
      <ReportsHeader monthLabel={labelForMonth(month)} onPrint={handlePrint} />
      <MonthlyReportForm onDownload={download} loading={loading} />
      <ReportsContent
        loading={loading}
        error={error}
        monthLabel={labelForMonth(month)}
        filename={filename}
        appointmentCount={appointmentCount}
        invoiceCount={invoiceCount}
        onDownload={handleRedownload}
      />
    </div>
  );
}

export default ReportsPage;