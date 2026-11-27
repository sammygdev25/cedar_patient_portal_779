import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductList } from '../api';
import type { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import PharmacyHeader from '../components/PharmacyHeader';
import PharmacyContent from '../components/PharmacyContent';
import CartSummary from '../components/CartSummary';
import { Alert, Section } from '../components/ui';

function PharmacyPage() {
  const navigate = useNavigate();
  const { items, subtotal, itemCount, addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const list = await getProductList();
        if (!cancelled) {
          const all: Product[] = Array.isArray(list) ? list : [];
          setProducts(all.filter((p) => p.is_active !== false && !p.is_prescription_only));
        }
      } catch {
        if (!cancelled) setError('We could not load the pharmacy catalog. Please try again in a moment.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const handleAdd = useCallback(
    (product: Product) => {
      addItem(product, 1);
      setNotice(`${product.name} added to cart`);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(''), 2000);
    },
    [addItem]
  );

  const handleCheckout = useCallback(() => {
    navigate('/patient/cart');
  }, [navigate]);

  return (
    <div className="ds-stack-lg">
      <PharmacyHeader itemCount={itemCount} />
      {notice && (
        <Section tight>
          <Alert tone="success">{notice}</Alert>
        </Section>
      )}
      <PharmacyContent products={products} loading={loading} error={error} onAdd={handleAdd} />
      {itemCount > 0 && (
        <Section tight narrow>
          <CartSummary
            items={items}
            subtotal={subtotal}
            deliveryFee={0}
            fulfillment="pickup"
            onCheckout={handleCheckout}
            checkoutLabel="Review cart and check out"
            disabled={items.length === 0}
          />
        </Section>
      )}
    </div>
  );
}

export default PharmacyPage;