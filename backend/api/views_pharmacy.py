from django.db.models import Q
from rest_framework import filters, permissions, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from api.models import Product
from api.order_flow import OrderItemViewSet, OrderViewSet  # noqa: F401
from api.serializers_pharmacy import ProductSerializer
from api.access import AccessMixin, AccessPermission  # Shikshya's access table

try:
    from django_filters.rest_framework import DjangoFilterBackend
    _FILTER_BACKENDS = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
except ImportError:  # pragma: no cover
    _FILTER_BACKENDS = [filters.SearchFilter, filters.OrderingFilter]


__all__ = ['ProductViewSet', 'OrderViewSet', 'OrderItemViewSet']


def _is_pharmacy_staff(user):
    """Receptionists (and Django staff/superusers) run the pharmacy desk and inventory."""
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    return getattr(user, 'role', None) == 'receptionist'


class IsStaffOrReadOnly(permissions.BasePermission):
    """Anyone may browse the catalog; only pharmacy staff may change it."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return _is_pharmacy_staff(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return _is_pharmacy_staff(request.user)


class ProductViewSet(AccessMixin, viewsets.ModelViewSet):
    """OTC and prescription-only catalog for the Cedar Hollow Health pharmacy.

    Patients and visitors see active products; receptionists see everything
    (including inactive items) and manage inventory through POST/PATCH/DELETE.
    """
    access_model = 'Product'

    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    permission_classes = [AccessPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = _FILTER_BACKENDS
    filterset_fields = ['is_prescription_only', 'is_active', 'in_stock']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'stock_quantity', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Product.objects.none()
        queryset = Product.objects.all().order_by('name')
        if _is_pharmacy_staff(self.request.user):
            return queryset
        return queryset.filter(Q(is_active=True))

    @staticmethod
    def _in_stock_value(serializer):
        """Keep in_stock consistent with stock_quantity."""
        instance = serializer.instance
        quantity = serializer.validated_data.get(
            'stock_quantity',
            instance.stock_quantity if instance is not None else 0,
        )
        if quantity <= 0:
            return False
        if 'in_stock' in serializer.validated_data:
            return serializer.validated_data['in_stock']
        return True

    def perform_create(self, serializer):
        serializer.save(in_stock=self._in_stock_value(serializer))

    def perform_update(self, serializer):
        serializer.save(in_stock=self._in_stock_value(serializer))

    def perform_destroy(self, instance):
        # Soft delete: past orders and prescriptions keep pointing at the product.
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])