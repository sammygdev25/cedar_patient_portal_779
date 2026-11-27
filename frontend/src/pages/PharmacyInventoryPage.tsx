import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProductList } from '../api';
import type { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Button, Card, CardBody, EmptyState, LoadingBlock, Section } from '../components/ui';
import PharmacyInventoryHeader from '../components/PharmacyInventoryHeader';
import PharmacyInventoryContent from '../components/PharmacyInventoryContent';
import ProductForm from '../components/ProductForm';

const LOW_STOCK_THRESHOLD = 5;

function PharmacyInventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const role = user ? (user as unknown as { role?: string }).role : undefined;
  const isPatient = role === 'patient';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  const loadProducts = useCallback(async () => {
    setError('');
    try {
      const list = await getProductList();
      setProducts(Array.isArray(list) ? list : []);
    } catch {
      setError('We could not load the pharmacy inventory. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || isPatient) return;
    loadProducts();
  }, [authLoading, isPatient, loadProducts]);

  useEffect(() => {
    if (!savedNotice) return undefined;
    const timer = window.setTimeout(() => setSavedNotice(false), 2000);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  useEffect(() => {
    if (formOpen && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [formOpen, editing]);

  const lowStockCount = useMemo(
    () => products.filter((p) => Number(p.stock_quantity) <= LOW_STOCK_THRESHOLD).length,
    [products]
  );

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const handleCancel = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSaved = async () => {
    setFormOpen(false);
    setEditing(null);
    setSavedNotice(true);
    await loadProducts();
  };

  if (authLoading) {
    return <LoadingBlock label="Checking your access..." />;
  }

  if (isPatient) {
    return (
      <Section narrow>
        <EmptyState
          icon="shield"
          title="Staff access only"
          text="The pharmacy inventory is managed by the Cedar Hollow Health front desk team."
        />
      </Section>
    );
  }

  return (
    <div className="ds-stack-lg">
      <PharmacyInventoryHeader
        productCount={products.length}
        lowStockCount={lowStockCount}
        onAddProduct={handleAdd}
      />
      {savedNotice && (
        <Section tight>
          <Alert tone="success">Product saved. The inventory has been updated.</Alert>
        </Section>
      )}
      {formOpen && (
        <Section tight>
          <div ref={formRef}>
            <Card>
              <CardBody>
                <div className="ds-between">
                  <h2 className="ds-card-title">
                    {editing ? `Edit ${editing.name}` : 'Add a pharmacy product'}
                  </h2>
                  <Button variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
                <ProductForm
                  key={editing ? editing.id : 'new'}
                  product={editing}
                  onSaved={handleSaved}
                />
              </CardBody>
            </Card>
          </div>
        </Section>
      )}
      <PharmacyInventoryContent
        products={products}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onAdd={handleAdd}
      />
    </div>
  );
}

export default PharmacyInventoryPage;