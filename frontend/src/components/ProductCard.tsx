import type { Product } from '../types';
import { Badge, Button, Card, CardBody, CardFooter, CardMeta, CardTitle, Media, Price } from './ui';
import { Icon } from './icons';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

const LOW_STOCK_THRESHOLD = 5;
const DESCRIPTION_LIMIT = 110;

function ProductCard({ product, onAdd }: ProductCardProps) {
  const stock = Number(product.stock_quantity) || 0;
  const available = Boolean(product.in_stock) && stock > 0;
  const prescriptionOnly = Boolean(product.is_prescription_only);
  const description = product.description || '';
  const shortDescription =
    description.length > DESCRIPTION_LIMIT
      ? `${description.slice(0, DESCRIPTION_LIMIT).trimEnd()}...`
      : description;

  return (
    <Card>
      <Media
        src={product.image || undefined}
        alt={product.name}
        ratio="square"
        badge={prescriptionOnly ? 'Prescription only' : undefined}
      />
      <CardBody>
        <CardTitle>{product.name}</CardTitle>
        {shortDescription ? (
          <CardMeta>{shortDescription}</CardMeta>
        ) : (
          <CardMeta>Available from the Cedar Hollow Health pharmacy.</CardMeta>
        )}
        <div className="ds-cluster">
          {!available && <Badge tone="danger">Out of stock</Badge>}
          {available && stock <= LOW_STOCK_THRESHOLD && (
            <Badge tone="soft">Only {stock} left</Badge>
          )}
          {available && stock > LOW_STOCK_THRESHOLD && (
            <Badge tone="success">In stock</Badge>
          )}
          {prescriptionOnly && <Badge tone="primary">Rx</Badge>}
        </div>
      </CardBody>
      <CardFooter>
        <Price value={Number(product.price)} />
        {prescriptionOnly ? (
          <Button variant="secondary" to="/patient/prescription-order">
            <Icon name="shield" size={16} /> Order with prescription
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={!available}
            onClick={() => onAdd(product)}
            aria-label={`Add ${product.name} to cart`}
          >
            <Icon name="cart" size={16} /> {available ? 'Add to cart' : 'Unavailable'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default ProductCard;