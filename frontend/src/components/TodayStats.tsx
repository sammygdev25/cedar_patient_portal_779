import type { Appointment } from '../types';
import { Grid, Stat } from './ui';

interface TodayStatsProps {
  appointments: Appointment[];
}

function isToday(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function TodayStats({ appointments }: TodayStatsProps) {
  const list: Appointment[] = Array.isArray(appointments) ? appointments : [];
  const today = list.filter((a) => isToday(a.start_time));

  const countBy = (...statuses: string[]): number =>
    today.filter((a) => statuses.includes(a.status)).length;

  const active = today.filter(
    (a) => a.status !== 'cancelled' && a.status !== 'no_show'
  ).length;
  const waiting = countBy('checked_in');
  const expected = countBy('booked');
  const completed = countBy('completed');
  const missed = countBy('cancelled', 'no_show');

  return (
    <Grid size="sm">
      <Stat value={active} label="Visits today" icon="calendar" />
      <Stat value={expected} label="Yet to arrive" icon="clock" />
      <Stat value={waiting} label="Checked in, waiting" icon="users" />
      <Stat value={completed} label="Completed" icon="check" />
      <Stat value={missed} label="Cancelled or no-show" icon="alert" />
    </Grid>
  );
}

export default TodayStats;