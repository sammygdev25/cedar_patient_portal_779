import type { VisitNote } from '../types';
import { Badge, Card, CardBody, CardTitle, CardMeta, EmptyState, Stack } from '../components/ui';
import { Icon } from '../components/icons';

interface VisitNoteListProps {
  notes: VisitNote[];
}

function formatVisitDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function VisitNoteList({ notes }: VisitNoteListProps) {
  const items: VisitNote[] = Array.isArray(notes) ? notes : [];

  if (items.length === 0) {
    return (
      <EmptyState
        icon="book"
        title="No visit notes yet"
        text="After a consultation at Cedar Hollow Health, your doctor's notes and follow-up instructions will appear here, visible only to you."
      />
    );
  }

  return (
    <Stack gap="md">
      {items.map((note) => {
        const visitDate = formatVisitDate(note.created_at);
        const updatedDate = formatVisitDate(note.updated_at);
        const wasUpdated = updatedDate !== '' && updatedDate !== visitDate;

        return (
          <Card key={note.id}>
            <CardBody>
              <Stack gap="sm">
                <div className="ds-between">
                  <CardTitle>{note.diagnosis}</CardTitle>
                  {visitDate && (
                    <Badge tone="soft">
                      <Icon name="calendar" size={14} /> {visitDate}
                    </Badge>
                  )}
                </div>

                <p>{note.summary}</p>

                {note.follow_up_instructions && (
                  <div className="ds-alert">
                    <Stack gap="xs">
                      <strong>
                        <Icon name="info" size={16} /> Follow-up instructions
                      </strong>
                      <span>{note.follow_up_instructions}</span>
                    </Stack>
                  </div>
                )}

                <CardMeta>
                  Visit note #{note.id}
                  {wasUpdated ? ` · Updated ${updatedDate}` : ''}
                </CardMeta>
              </Stack>
            </CardBody>
          </Card>
        );
      })}
    </Stack>
  );
}

export default VisitNoteList;