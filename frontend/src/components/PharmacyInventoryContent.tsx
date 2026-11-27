import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, Badge, Button, EmptyState, Grid, Price, Section, SkeletonCards, Stat } from '../components/ui';
import { Icon } from '../components/icons';
import type { Product } from '../types';

interface PharmacyInventoryContentProps {
  products?: Product[];
  loading?: boolean;
  error?: string;
  onEdit?: (product: Product) => void;
  onAdd?: () => void;
}

const LOW_STOCK_THRESHOLD = 10;

function PharmacyInventoryContent({
  products = [],
  loading = false,
  error = '',
  onEdit,
  onAdd,
}: PharmacyInventoryContentProps) {
  const [query, setQuery] = useState<string>('');

  const list: Product[] = Array.isArray(products) ? products : [];

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) => p.name.toLowerCase().includes(term));
  }, [list, query]);

  const outCount = list.filter((p) => !p.in_stock || p.stock_quantity <= 0).length;
  const lowCount = list.filter(
    (p) => p.in_stock && p.stock_quantity > 0 && p.stock_quantity <= LOW_STOCK_THRESHOLD
  ).length;
  const rxCount = list.filter((p) => p.is_prescription_only).length;

  const addAction = onAdd ? (
    <Button variant="primary" onClick={onAdd}>
      <Icon name="plus" size={16} /> Add product
    </Button>
  ) : undefined;

  return (
    <Section
      title="Pharmacy stock"
      subtitle="Everything the Cedar Hollow Health pharmacy sells over the counter or dispenses on prescription."
      actions={addAction}
    >
      {error && <Alert tone="danger">{error}</Alert>}

      {loading ? (
        <SkeletonCards count={6} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="package"
          title="No products in the pharmacy yet"
          text="Add your first over-the-counter item or prescription medicine so patients can order it."
          action={addAction}
        />
      ) : (
        <>
          <Grid size="sm">
            <Stat value={list.length} label="Products listed" icon="package" />
            <Stat value={lowCount} label="Running low" icon="alert" />
            <Stat value={outCount} label="Out of stock" icon="info" />
            <Stat value={rxCount} label="Prescription only" icon="shield" />
          </Grid>

          <div className="ds-filters">
            <input
              className="input"
              type="search"
              placeholder="Search products by name"
              aria-label="Search products"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon="search"
              title="No products match your search"
              text="Try a different name or clear the search box."
            />
          ) : (
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const soldOut = !p.in_stock || p.stock_quantity <= 0;
                    const low = !soldOut && p.stock_quantity <= LOW_STOCK_THRESHOLD;
                    return (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          {p.description && <div className="ds-small ds-muted">{p.description}</div>}
                        </td>
                        <td>
                          <Price value={Number(p.price)} />
                        </td>
                        <td>
                          <Badge tone={soldOut ? 'danger' : low ? 'soft' : 'success'}>
                            {soldOut ? 'Out of stock' : `${p.stock_quantity} in stock`}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={p.is_prescription_only ? 'primary' : 'neutral'}>
                            {p.is_prescription_only ? 'Prescription' : 'Over the counter'}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={p.is_active ? 'success' : 'neutral'}>
                            {p.is_active ? 'Active' : 'Hidden'}
                          </Badge>
                        </td>
                        <td>
                          {onEdit && (
                            <Button variant="ghost" onClick={() => onEdit(p)}>
                              <Icon name="edit" size={16} /> Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

export default PharmacyInventoryContent;