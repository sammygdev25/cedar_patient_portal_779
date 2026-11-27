import type { Product } from '../types';
import { EmptyState, Grid } from './ui';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAdd: (product: Product) => void;
}

function ProductGrid({ products, onAdd }: ProductGridProps) {
  const list: Product[] = Array.isArray(products) ? products : [];

  if (list.length === 0) {
    return (
      <EmptyState
        icon="package"
        title="No medicines match your search"
        text="Try a different name or clear the filters to browse the full Cedar Hollow Health pharmacy catalog."
      />
    );
  }

  return (
    <Grid size="md">
      {list.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </Grid>
  );
}

export default ProductGrid;