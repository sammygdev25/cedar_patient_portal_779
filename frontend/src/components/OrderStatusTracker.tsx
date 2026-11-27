import { Alert, Badge, Cluster, Stack } from '../components/ui';
import { Icon } from '../components/icons';

interface OrderStatusTrackerProps {
  status: string;
  fulfillment?: string;
  approvalStatus?: string;
}

interface TrackerStep {
  key: string;
  label: string;
  hint: string;
  icon: 'credit-card' | 'check' | 'shield' | 'package' | 'truck' | 'home';
}

function buildSteps(fulfillment: string, needsApproval: boolean): TrackerStep[] {
  const isDelivery = fulfillment === 'delivery';
  const steps: TrackerStep[] = [
    {
      key: 'pending_payment',
      label: 'Awaiting payment',
      hint: 'Pay online to send your order to the pharmacy.',
      icon: 'credit-card',
    },
    {
      key: 'received',
      label: 'Order received',
      hint: 'Payment confirmed. The pharmacy team has your order.',
      icon: 'check',
    },
  ];

  if (needsApproval) {
    steps.push({
      key: 'approved',
      label: 'Doctor approved',
      hint: 'Your prescribing doctor has signed off on this prescription.',
      icon: 'shield',
    });
  }

  steps.push({
    key: 'packed',
    label: isDelivery ? 'Packed' : 'Ready for pickup',
    hint: isDelivery
      ? 'Your medicines are packed and waiting for the courier.'
      : 'Collect your order at the Cedar Hollow Health pharmacy desk.',
    icon: 'package',
  });

  if (isDelivery) {
    steps.push({
      key: 'out_for_delivery',
      label: 'Out for delivery',
      hint: 'Your order is on its way to your address.',
      icon: 'truck',
    });
  }

  steps.push({
    key: 'delivered',
    label: isDelivery ? 'Delivered' : 'Picked up',
    hint: isDelivery ? 'Your order has arrived.' : 'You have collected your order.',
    icon: 'home',
  });

  return steps;
}

function OrderStatusTracker({ status, fulfillment = 'pickup', approvalStatus = 'not_required' }: OrderStatusTrackerProps) {
  if (status === 'cancelled') {
    return (
      <Alert tone="danger">
        This order was cancelled. If you were charged, the clinic billing team will contact you about a refund.
      </Alert>
    );
  }

  if (status === 'rejected' || approvalStatus === 'rejected') {
    return (
      <Alert tone="danger">
        Your doctor did not approve this prescription order. Please book an appointment or contact the clinic to
        discuss alternatives.
      </Alert>
    );
  }

  const needsApproval = approvalStatus !== 'not_required';
  const steps = buildSteps(fulfillment, needsApproval);
  const currentIndex = steps.findIndex((step) => step.key === status);
  const awaitingApproval = needsApproval && approvalStatus === 'pending' && status === 'received';

  return (
    <Stack gap="sm">
      <ol className="ds-stack" aria-label="Order progress">
        {(Array.isArray(steps) ? steps : []).map((step, index) => {
          const isDone = currentIndex > index || status === 'delivered';
          const isCurrent = currentIndex === index && status !== 'delivered';
          const tone = isDone ? 'success' : isCurrent ? 'primary' : 'neutral';
          const stateLabel = isDone ? 'Done' : isCurrent ? 'Current' : 'Upcoming';

          return (
            <li key={step.key} aria-current={isCurrent ? 'step' : undefined}>
              <Cluster gap="sm" align="center">
                <Icon name={isDone ? 'check' : step.icon} size={20} />
                <Stack gap="xs">
                  <Cluster gap="sm" align="center">
                    <strong>{step.label}</strong>
                    <Badge tone={tone}>{stateLabel}</Badge>
                  </Cluster>
                  {(isCurrent || (index === currentIndex + 1 && currentIndex >= 0)) && (
                    <span className="ds-small ds-muted">{step.hint}</span>
                  )}
                </Stack>
              </Cluster>
            </li>
          );
        })}
      </ol>
      {awaitingApproval && (
        <Alert tone="neutral">
          Waiting for your doctor to review this prescription before the pharmacy can pack it.
        </Alert>
      )}
    </Stack>
  );
}

export default OrderStatusTracker;
