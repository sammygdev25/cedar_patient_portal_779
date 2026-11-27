import { useMemo } from 'react';
import { Button, Stack, Cluster, EmptyState, LoadingBlock, Badge } from './ui';
import { Icon } from './icons';

interface SlotItem {
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
}

interface SlotPickerProps {
  slots: SlotItem[];
  selectedSlot: SlotItem | null;
  onSelect: (slot: SlotItem) => void;
  loading: boolean;
}

interface SlotGroup {
  key: string;
  label: string;
  items: SlotItem[];
}

function slotStart(slot: SlotItem | null | undefined): string {
  if (!slot) return '';
  return slot.start_time || slot.start || '';
}

function slotEnd(slot: SlotItem | null | undefined): string {
  if (!slot) return '';
  return slot.end_time || slot.end || '';
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDay(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function dayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function SlotPicker({ slots, selectedSlot, onSelect, loading }: SlotPickerProps) {
  const safeSlots: SlotItem[] = Array.isArray(slots) ? slots : [];

  const groups = useMemo<SlotGroup[]>(() => {
    const map = new Map<string, SlotGroup>();
    safeSlots.forEach((slot) => {
      const start = slotStart(slot);
      if (!start) return;
      const key = dayKey(start);
      const existing = map.get(key);
      if (existing) {
        existing.items.push(slot);
      } else {
        map.set(key, { key, label: formatDay(start), items: [slot] });
      }
    });
    return Array.from(map.values());
  }, [safeSlots]);

  const selectedStart = slotStart(selectedSlot);

  if (loading) {
    return <LoadingBlock label="Finding open appointment times" />;
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="No open times for this selection"
        text="Try another day or choose a different doctor to see available appointments at Cedar Hollow Health."
      />
    );
  }

  return (
    <Stack gap="md">
      {groups.map((group) => (
        <Stack key={group.key} gap="sm">
          <Cluster gap="sm" align="center">
            <Icon name="calendar" size={16} />
            <strong>{group.label}</strong>
          </Cluster>
          <Cluster gap="sm">
            {group.items.map((slot) => {
              const start = slotStart(slot);
              const end = slotEnd(slot);
              const isSelected = selectedStart !== '' && start === selectedStart;
              return (
                <Button
                  key={start}
                  type="button"
                  variant={isSelected ? 'primary' : 'secondary'}
                  aria-pressed={isSelected}
                  title={end ? `${formatTime(start)} to ${formatTime(end)}` : formatTime(start)}
                  onClick={() => onSelect(slot)}
                >
                  {formatTime(start)}
                </Button>
              );
            })}
          </Cluster>
        </Stack>
      ))}
      {selectedSlot && selectedStart && (
        <Cluster gap="sm" align="center">
          <Icon name="check" size={16} />
          <span className="ds-small">Selected time:</span>
          <Badge tone="primary">
            {formatDay(selectedStart)}, {formatTime(selectedStart)}
          </Badge>
        </Cluster>
      )}
    </Stack>
  );
}

export default SlotPicker;