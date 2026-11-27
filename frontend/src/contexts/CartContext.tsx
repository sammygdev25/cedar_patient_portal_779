import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../types';
import { useAuth } from './AuthContext';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
}

const MAX_QUANTITY = 99;

export const CartContext = createContext<CartContextType | null>(null);

function clampQuantity(value: number): number {
  const whole = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(MAX_QUANTITY, whole));
}

function readStoredItems(storageKey: string): CartItem[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CartItem =>
        !!entry && typeof entry === 'object' && !!(entry as CartItem).product && Number((entry as CartItem).quantity) > 0
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user ? (user as unknown as { id?: number | string }).id : undefined;
  const storageKey = user ? `cedar-hollow-cart:${String(userId ?? 'user')}` : 'cedar-hollow-cart:guest';

  const [items, setItems] = useState<CartItem[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string>('');

  useEffect(() => {
    setItems(readStoredItems(storageKey));
    setHydratedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // storage unavailable (private mode); the cart still works in memory
    }
  }, [items, storageKey, hydratedKey]);

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    if (product.is_prescription_only || !product.in_stock) return;
    const amount = clampQuantity(quantity);
    if (amount < 1) return;
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { product, quantity: clampQuantity(item.quantity + amount) }
            : item
        );
      }
      return [...prev, { product, quantity: amount }];
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    const amount = clampQuantity(quantity);
    setItems((prev) =>
      amount < 1
        ? prev.filter((item) => item.product.id !== productId)
        : prev.map((item) => (item.product.id === productId ? { ...item, quantity: amount } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [items]
  );
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value: CartContextType = {
    items,
    subtotal,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}