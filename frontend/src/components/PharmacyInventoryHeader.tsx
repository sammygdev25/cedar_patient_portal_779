import { PageHeader, Button, Badge, Cluster } from '../components/ui';
import { Icon } from '../components/icons';

interface PharmacyInventoryHeaderProps {
  productCount?: number;
  lowStockCount?: number;
  onAddProduct?: () => void;
}

export default function PharmacyInventoryHeader({
  productCount,
  lowStockCount,
  onAddProduct,
}: PharmacyInventoryHeaderProps) {
  const hasCount = typeof productCount === 'number';
  const hasLowStock = typeof lowStockCount === 'number' && lowStockCount > 0;

  const actions = (
    <Cluster gap="sm" align="center">
      {hasCount && (
        <Badge tone="soft">
          <Icon name="package" size={14} /> {productCount} {productCount === 1 ? 'product' : 'products'}
        </Badge>
      )}
      {hasLowStock && (
        <Badge tone="danger">
          <Icon name="alert" size={14} /> {lowStockCount} low on stock
        </Badge>
      )}
      {onAddProduct && (
        <Button variant="primary" onClick={onAddProduct}>
          <Icon name="plus" size={16} /> Add product
        </Button>
      )}
    </Cluster>
  );

  return (
    <PageHeader
      eyebrow="Pharmacy inventory"
      title="Pharmacy inventory"
      subtitle="Keep the Cedar Hollow Health pharmacy shelves accurate: update prices and stock levels, mark prescription-only medicines, and retire products so patients only order what we can fill."
      actions={actions}
    />
  );
}