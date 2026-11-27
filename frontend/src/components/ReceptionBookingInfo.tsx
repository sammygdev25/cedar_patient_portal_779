import { Section, Grid, Card, CardBody, CardTitle, CardMeta } from '../components/ui';
import { Icon } from '../components/icons';

interface ReceptionBookingInfoProps {
  clinicPhone?: string;
  onViewSchedule?: () => void;
}

function ReceptionBookingInfo({ clinicPhone, onViewSchedule }: ReceptionBookingInfoProps) {
  return (
    <Section
      tight
      eyebrow="Good to know"
      title="Before you confirm a booking"
      subtitle="A few front desk reminders for booking on behalf of a patient at Cedar Hollow Health."
    >
      <Grid size="sm">
        <Card>
          <CardBody>
            <Icon name="users" size={24} title="Find the patient" />
            <CardTitle>Find the patient first</CardTitle>
            <CardMeta>
              Search by name or email and confirm the patient's details before choosing a doctor.
              New patients need a portal account so visit notes, prescriptions and bills reach them.
            </CardMeta>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Icon name="calendar" size={24} title="No double booking" />
            <CardTitle>One patient per slot</CardTitle>
            <CardMeta>
              Each doctor can hold only one active appointment per time slot. If a slot is taken,
              it disappears from the list. Pick another time or another doctor.
            </CardMeta>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Icon name="check" size={24} title="What happens next" />
            <CardTitle>What happens next</CardTitle>
            <CardMeta>
              The patient sees the booking in their portal straight away. On the day, check them in
              from the front desk so the doctor's live schedule updates.
            </CardMeta>
            {clinicPhone ? (
              <CardMeta>
                <Icon name="phone" size={16} title="Phone" /> Patient needs to change it? Call {clinicPhone}.
              </CardMeta>
            ) : null}
            {onViewSchedule ? (
              <button type="button" className="btn btn-secondary" onClick={onViewSchedule}>
                <Icon name="list" size={16} /> View all appointments
              </button>
            ) : null}
          </CardBody>
        </Card>
      </Grid>
    </Section>
  );
}

export default ReceptionBookingInfo;