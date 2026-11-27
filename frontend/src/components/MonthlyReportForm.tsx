import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Alert, Button, Card, CardBody, CardMeta, CardTitle } from './ui';
import { Icon } from './icons';

interface MonthlyReportFormProps {
  onDownload: (month: string) => void | Promise<void>;
  loading?: boolean;
}

const MONTH_NAMES: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function MonthlyReportForm({ onDownload, loading = false }: MonthlyReportFormProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const initialMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const initialYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const [month, setMonth] = useState<number>(initialMonth);
  const [year, setYear] = useState<number>(initialYear);
  const [error, setError] = useState<string>('');

  const years: number[] = [];
  for (let y = currentYear; y > currentYear - 5; y -= 1) {
    years.push(y);
  }

  const handleMonthChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setMonth(Number(e.target.value));
    setError('');
  };

  const handleYearChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setYear(Number(e.target.value));
    setError('');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    const isFuture = year > currentYear || (year === currentYear && month > currentMonth);
    if (isFuture) {
      setError('That month has not started yet. Choose the current month or an earlier one.');
      return;
    }
    setError('');
    onDownload(`${year}-${pad(month)}`);
  };

  return (
    <Card>
      <CardBody>
        <CardTitle>Monthly clinic report</CardTitle>
        <CardMeta>
          Download a CSV of every appointment and bill for the month you choose, ready for the
          Cedar Hollow Health front desk to review or share with accounts.
        </CardMeta>

        <form className="ds-form" onSubmit={handleSubmit} noValidate>
          <div className="ds-form-row">
            <div className="ds-field">
              <label className="ds-label" htmlFor="report-month">
                Month
              </label>
              <select
                id="report-month"
                className="input"
                value={month}
                onChange={handleMonthChange}
                disabled={loading}
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="ds-field">
              <label className="ds-label" htmlFor="report-year">
                Year
              </label>
              <select
                id="report-year"
                className="input"
                value={year}
                onChange={handleYearChange}
                disabled={loading}
              >
                {(Array.isArray(years) ? years : []).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="ds-help">
            The file includes appointment status, doctor, service, invoice amounts and payment
            status for {MONTH_NAMES[month - 1]} {year}.
          </p>

          {error && <Alert tone="danger">{error}</Alert>}

          <div className="ds-form-actions">
            <Button type="submit" variant="primary" disabled={loading}>
              <Icon name="download" size={16} />
              {loading ? 'Preparing report...' : 'Download CSV'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export default MonthlyReportForm;