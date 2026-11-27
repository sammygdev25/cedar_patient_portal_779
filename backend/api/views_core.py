from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.viewsets import ModelViewSet

from api.models import ContactMessage, DoctorProfile, OpeningHours, Service
from api.serializers_core import (
    ContactMessageSerializer,
    DoctorProfileSerializer,
    OpeningHoursSerializer,
    ServiceSerializer,
)
from api.access import AccessMixin, AccessPermission  # Shikshya's access table

User = get_user_model()


def _is_front_desk(user):
    """Receptionists (and superusers) run the public clinic content."""
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False):
        return True
    return getattr(user, 'role', None) == 'receptionist'


class IsFrontDeskOrReadOnly(permissions.BasePermission):
    """Anyone may read the public clinic content; only the front desk may change it."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return _is_front_desk(request.user)


class DoctorProfilePermission(permissions.BasePermission):
    """Public read. Front desk creates and deletes profiles; a doctor may edit their own bio."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if _is_front_desk(user):
            return True
        if getattr(user, 'role', None) == 'doctor':
            return request.method in ('PUT', 'PATCH')
        return False

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if _is_front_desk(request.user):
            return True
        return obj.user_id == request.user.id


class ContactMessagePermission(permissions.BasePermission):
    """Visitors may send a message without signing in; only the front desk reads or handles them."""

    def has_permission(self, request, view):
        if request.method == 'POST':
            return True
        return _is_front_desk(request.user)

    def has_object_permission(self, request, view, obj):
        return _is_front_desk(request.user)


class ServiceViewSet(AccessMixin, ModelViewSet):
    access_model = 'Service'
    queryset = Service.objects.all().order_by('display_order', 'name')
    serializer_class = ServiceSerializer
    permission_classes = [AccessPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['display_order', 'name', 'duration_minutes', 'created_at']
    ordering = ['display_order', 'name']

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Service.objects.none()
        queryset = Service.objects.all().order_by('display_order', 'name')
        if not _is_front_desk(self.request.user):
            queryset = queryset.filter(is_active=True)
        return queryset


class DoctorProfileViewSet(AccessMixin, ModelViewSet):
    access_model = 'DoctorProfile'
    queryset = DoctorProfile.objects.select_related('user').order_by('display_name')
    serializer_class = DoctorProfileSerializer
    permission_classes = [AccessPermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'specialty', 'is_accepting_patients']
    search_fields = ['display_name', 'specialty', 'bio']
    ordering_fields = ['display_name', 'specialty', 'consultation_minutes', 'created_at']
    ordering = ['display_name']


class OpeningHoursViewSet(AccessMixin, ModelViewSet):
    access_model = 'OpeningHours'
    queryset = OpeningHours.objects.all().order_by('weekday')
    serializer_class = OpeningHoursSerializer
    permission_classes = [AccessPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['weekday', 'is_closed']
    search_fields = ['label']
    ordering_fields = ['weekday', 'created_at']
    ordering = ['weekday']


class ContactMessageViewSet(AccessMixin, ModelViewSet):
    access_model = 'ContactMessage'
    queryset = ContactMessage.objects.all().order_by('-created_at')
    serializer_class = ContactMessageSerializer
    permission_classes = [AccessPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_handled']
    search_fields = ['name', 'email', 'message']
    ordering_fields = ['created_at', 'name', 'is_handled']
    ordering = ['-created_at']