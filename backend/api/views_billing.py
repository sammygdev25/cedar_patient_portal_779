from django.db.models import Count, Sum
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from api.models import Invoice
from api.serializers_billing import InvoiceSerializer
from api.access import AccessMixin, AccessPermission  # Shikshya's access table


PAYMENT_ONLY_FIELDS = ('paid_at', 'stripe_session_id')


def is_receptionist(user):
    """Receptionists (and superusers) run the clinic's billing desk."""
    if not user or not user.is_authenticated:
        return False
    return user.is_superuser or getattr(user, 'role', '') == 'receptionist'


class InvoicePermission(permissions.BasePermission):
    """
    Signed-in users may read their own bills. Only receptionists create,
    edit, void or delete bills. Payment is never handled here: the
    scaffold's Stripe webhook is the only thing that marks a bill paid.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if view.action == 'create' or request.method in ('PUT', 'PATCH', 'DELETE'):
            return is_receptionist(request.user)
        return is_receptionist(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return is_receptionist(request.user) or obj.user_id == request.user.id
        return is_receptionist(request.user)


class InvoiceViewSet(AccessMixin, viewsets.ModelViewSet):
    access_model = 'Invoice'
    queryset = (
        Invoice.objects.select_related('user', 'appointment', 'created_by')
        .all()
        .order_by('-created_at')
    )
    serializer_class = InvoiceSerializer
    permission_classes = [AccessPermission]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ['user', 'appointment', 'created_by', 'status']
    search_fields = ['description', 'user__email', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at', 'amount', 'due_date', 'paid_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if is_receptionist(user):
            return qs
        return qs.filter(user=user)

    def perform_create(self, serializer):
        patient = serializer.validated_data.get('user')
        if patient is not None and getattr(patient, 'role', 'patient') != 'patient':
            raise ValidationError({'user': 'Bills can only be issued to patients.'})
        for field in PAYMENT_ONLY_FIELDS:
            if serializer.validated_data.get(field):
                raise PermissionDenied('Payment details are set by the payment system only.')
        if serializer.validated_data.get('status', 'unpaid') != 'unpaid':
            raise ValidationError({'status': 'A new bill always starts as unpaid.'})
        serializer.save(created_by=self.request.user, status='unpaid')

    def perform_update(self, serializer):
        invoice = serializer.instance
        data = serializer.validated_data
        if invoice.status == 'paid':
            raise ValidationError('A paid bill can no longer be changed.')
        if data.get('status') == 'paid':
            raise PermissionDenied('A bill is marked paid only when the Stripe payment succeeds.')
        for field in PAYMENT_ONLY_FIELDS:
            if field in data:
                raise PermissionDenied('Payment details are set by the payment system only.')
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        if invoice.status == 'paid':
            return Response(
                {'detail': 'A paid bill cannot be deleted. It is part of the payment record.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='void')
    def void(self, request, pk=None):
        """Receptionist cancels an unpaid bill (for example, a billing mistake)."""
        invoice = self.get_object()
        if invoice.status == 'paid':
            return Response(
                {'detail': 'A paid bill cannot be voided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invoice.status != 'void':
            invoice.status = 'void'
            invoice.save(update_fields=['status', 'updated_at'])
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """Totals of the bills this user may see, grouped by status."""
        rows = (
            self.filter_queryset(self.get_queryset())
            .order_by()
            .values('status')
            .annotate(total=Sum('amount'), count=Count('id'))
        )
        result = {
            'unpaid': {'count': 0, 'total': 0},
            'paid': {'count': 0, 'total': 0},
            'void': {'count': 0, 'total': 0},
        }
        for row in rows:
            result[row['status']] = {
                'count': row['count'],
                'total': row['total'] or 0,
            }
        return Response(result)