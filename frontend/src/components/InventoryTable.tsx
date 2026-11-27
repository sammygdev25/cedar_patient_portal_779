import type { Product } from '../types';
import { Badge, Button, EmptyState, Media, Price } from './ui';
import { Icon } from './icons';

interface InventoryTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
}

const LOW_STOCK_THRESHOLD = 10;

function stockTone(quantity: number): 'danger' | 'success' | 'primary' {
  if (quantity <= 0) return 'danger';
  if (quantity <= LOW_STOCK_THRESHOLD) return 'primary';
  return 'success';
}

function stockLabel(quantity: number): string {
  if (quantity <= 0) return 'Out of stock';
  if (quantity <= LOW_STOCK_THRESHOLD) return 'Low stock';
  return 'In stock';
}

function InventoryTable({ products, onEdit }: InventoryTableProps) {
  const rows: Product[] = Array.isArray(products) ? products : [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="package"
        title="No products in the pharmacy yet"
        text="Add your first over-the-counter product to start tracking stock for Cedar Hollow Health."
      />
    );
  }

  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Type</th>
            <th>Status</th>
            <th>
              <span className="ds-small">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((product) => {
            const quantity = Number(product.stock_quantity) || 0;
            const available = product.is_active && product.in_stock && quantity > 0;
            return (
              <tr key={product.id}>
                <td>
                  <div className="ds-cluster">
                    <div style={{ width: 56, flexShrink: 0 }}>
                      <Media src={product.image || undefined} alt={product.name} ratio="square" />
                    </div>
                    <div className="ds-stack">
                      <strong>{product.name}</strong>
                      {product.description ? (
                        <span className="ds-small ds-muted">
                          {product.description.length > 70
                            ? `${product.description.slice(0, 70)}…`
                            : product.description}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td>
                  <Price value={Number(product.price) || 0} />
                </td>
                <td>
                  <div className="ds-stack">
                    <strong>{quantity}</strong>
                    <Badge tone={stockTone(quantity)}>{stockLabel(quantity)}</Badge>
                  </div>
                </td>
                <td>
                  {product.is_prescription_only ? (
                    <Badge tone="soft">Prescription only</Badge>
                  ) : (
                    <Badge tone="neutral">Over the counter</Badge>
                  )}
                </td>
                <td>
                  {!product.is_active ? (
                    <Badge tone="neutral">Hidden</Badge>
                  ) : available ? (
                    <Badge tone="success">Listed</Badge>
                  ) : (
                    <Badge tone="danger">Unavailable</Badge>
                  )}
                </td>
                <td>
                  <Button variant="secondary" onClick={() => onEdit(product)}>
                    <Icon name="edit" size={16} /> Edit
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default InventoryTable;