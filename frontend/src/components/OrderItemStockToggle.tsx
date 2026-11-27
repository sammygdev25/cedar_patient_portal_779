import { useState } from 'react';
import type { OrderItem } from '../types';
import { Badge, Button, Cluster } from './ui';
import { Icon } from './icons';

interface OrderItemStockToggleProps {
  item: OrderItem;
  onToggle: (item: OrderItem, isOutOfStock: boolean) => unknown;
}

function OrderItemStockToggle({ item, onToggle }: OrderItemStockToggleProps) {
  const [busy, setBusy] = useState<boolean>(false);
  const outOfStock = Boolean(item.is_out_of_stock);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onToggle(item, !outOfStock);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Cluster gap="sm" align="center">
      <span className="ds-small">
        {item.medicine_name} <span className="ds-muted">x {item.quantity}</span>
      </span>
      <Badge tone={outOfStock ? 'danger' : 'success'}>
        {outOfStock ? 'Out of stock' : 'Available'}
      </Badge>
      <Button
        type="button"
        variant={outOfStock ? 'secondary' : 'ghost'}
        onClick={handleClick}
        disabled={busy}
        aria-pressed={outOfStock}
        title={outOfStock ? 'Mark this line as available again' : 'Flag this line as out of stock'}
      >
        <Icon name={outOfStock ? 'check' : 'alert'} size={16} />
        {busy ? 'Saving...' : outOfStock ? 'Mark available' : 'Mark out of stock'}
      </Button>
    </Cluster>
  );
}

export default OrderItemStockToggle;