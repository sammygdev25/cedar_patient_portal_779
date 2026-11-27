import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, EmptyState, Grid, Media, Price, Section, SkeletonCards } from '../components/ui';
import { Icon } from '../components/icons';
import type { Product } from '../types';

interface PharmacyContentProps {
  products: Product[];
  loading?: boolean;
  error?: string;
  onAdd: (product: Product) => void;
}

type CatalogMode = 'all' | 'otc' | 'rx';

const MODES: { key: CatalogMode; label: string }[] = [
  { key: 'all', label: 'All medicines' },
  { key: 'otc', label: 'Over the counter' },
  { key: 'rx', label: 'Prescription only' },
];

function PharmacyContent({ products, loading = false, error = '', onAdd }: PharmacyContentProps) {
  const [query, setQuery] = useState<string>('');
  const [mode, setMode] = useState<CatalogMode>('all');

  const visible = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const needle = query.trim().toLowerCase();
    return list.filter((product) => {
      if (mode === 'otc' && product.is_prescription_only) return false;
      if (mode === 'rx' && !product.is_prescription_only) return false;
      if (!needle) return true;
      return `${product.name} ${product.description ?? ''}`.toLowerCase().includes(needle);
    });
  }, [products, query, mode]);

  const resetFilters = () => {
    setQuery('');
    setMode('all');
  };

  return (
    <Section
      eyebrow="Cedar Hollow Pharmacy"
      title="Medicines ready for pickup or delivery"
      subtitle="Over-the-counter items go straight to your cart. Prescription medicines are ordered from a prescription your doctor has written."
    >
      <div className="ds-filters">
        <input
          className="input"
          type="search"
          placeholder="Search pain relief, allergy, vitamins..."
          aria-label="Search medicines"
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        />
        {MODES.map((option) => (
          <Button
            key={option.key}
            variant={mode === option.key ? 'primary' : 'secondary'}
            onClick={() => setMode(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {loading ? (
        <SkeletonCards count={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="package"
          title={query || mode !== 'all' ? 'No medicines match your search' : 'The pharmacy shelves are being restocked'}
          text="Try a different search, or order a prescription your doctor has written for you."
          action={
            query || mode !== 'all' ? (
              <Button variant="secondary" onClick={resetFilters}>Clear filters</Button>
            ) : (
              <Button to="/patient/prescription-order">Order a prescription</Button>
            )
          }
        />
      ) : (
        <Grid size="md">
          {visible.map((product) => {
            const available = product.in_stock && Number(product.stock_quantity) > 0;
            return (
              <Card key={product.id}>
                <Media
                  src={product.image || undefined}
                  alt={product.name}
                  ratio="wide"
                  badge={product.is_prescription_only ? 'Prescription only' : undefined}
                />
                <CardBody>
                  <CardTitle>{product.name}</CardTitle>
                  <CardMeta>{product.description}</CardMeta>
                  <Badge tone={available ? 'success' : 'danger'}>
                    {available ? `${product.stock_quantity} in stock` : 'Out of stock'}
                  </Badge>
                </CardBody>
                <CardFooter>
                  <Price value={Number(product.price)} />
                  {product.is_prescription_only ? (
                    <Button variant="secondary" to="/patient/prescription-order">
                      <Icon name="shield" size={16} /> Use prescription
                    </Button>
                  ) : (
                    <Button disabled={!available} onClick={() => onAdd(product)}>
                      <Icon name="cart" size={16} /> Add to cart
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </Grid>
      )}
    </Section>
  );
}

export default PharmacyContent;