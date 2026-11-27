from django.db.models import Q
from rest_framework import filters, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from api.models import Appointment, Prescription, VisitNote
from api.serializers_clinical import PrescriptionSerializer, VisitNoteSerializer
from api.access import AccessMixin, AccessPermission  # Shikshya's access table


def _role(user):
    """Return the clinic role of the signed-in user ('' when unknown)."""
    return getattr(user, 'role', '') or ''


def _to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class ClinicalRecordPermission(BasePermission):
    """
    Clinical records are private to the patient they describe and the doctor
    who wrote them. Receptionists never see them. Only doctors write.
    """

    message = 'Clinical records are only available to the patient and their doctor.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        role = _role(user)
        if role == 'receptionist':
            return False
        if request.method in SAFE_METHODS:
            return role in ('patient', 'doctor')
        return role == 'doctor'

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True
        if request.method in SAFE_METHODS:
            return obj.patient_id == user.id or obj.doctor_id == user.id
        return _role(user) == 'doctor' and obj.doctor_id == user.id


class ClinicalScopedMixin:
    """Limits every queryset to the records the signed-in user may read."""

    permission_classes = [ClinicalRecordPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def scope_queryset(self, queryset):
        user = self.request.user
        if not user.is_authenticated:
            return queryset.none()
        if user.is_superuser:
            return queryset
        role = _role(user)
        if role == 'patient':
            return queryset.filter(patient=user)
        if role == 'doctor':
            return queryset.filter(doctor=user)
        return queryset.none()

    def get_queryset(self):
        return self.scope_queryset(super().get_queryset())


class VisitNoteViewSet(AccessMixin, ClinicalScopedMixin, viewsets.ModelViewSet):
    access_model = 'VisitNote'
    permission_classes = [AccessPermission]
    queryset = VisitNote.objects.select_related(
        'appointment', 'patient', 'doctor'
    ).order_by('-created_at')
    serializer_class = VisitNoteSerializer
    filterset_fields = ['appointment', 'patient', 'doctor']
    search_fields = ['diagnosis', 'summary', 'follow_up_instructions']
    ordering_fields = ['created_at', 'updated_at', 'diagnosis']
    ordering = ['-created_at']

    def create(self, request, *args, **kwargs):
        appointment_id = _to_int(request.data.get('appointment'))
        if appointment_id is None:
            raise ValidationError({'appointment': 'Choose the appointment this note belongs to.'})

        appointment = Appointment.objects.filter(pk=appointment_id).first()
        if appointment is None:
            raise ValidationError({'appointment': 'That appointment does not exist.'})
        if appointment.doctor_id != request.user.id and not request.user.is_superuser:
            return Response(
                {'detail': 'You can only write notes for your own appointments.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if VisitNote.objects.filter(appointment=appointment).exists():
            raise ValidationError(
                {'appointment': 'A visit note already exists for this appointment. Edit it instead.'}
            )

        data = request.data.copy()
        data['patient'] = appointment.patient_id
        data['doctor'] = appointment.doctor_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(patient=appointment.patient, doctor=appointment.doctor)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        instance = serializer.instance
        serializer.save(
            appointment=instance.appointment,
            patient=instance.patient,
            doctor=instance.doctor,
        )


class PrescriptionViewSet(AccessMixin, ClinicalScopedMixin, viewsets.ModelViewSet):
    access_model = 'Prescription'
    permission_classes = [AccessPermission]
    queryset = Prescription.objects.select_related(
        'appointment', 'patient', 'doctor', 'product'
    ).order_by('-created_at')
    serializer_class = PrescriptionSerializer
    filterset_fields = ['appointment', 'patient', 'doctor', 'product', 'is_active']
    search_fields = ['medicine_name', 'dosage', 'instructions', 'notes']
    ordering_fields = ['created_at', 'updated_at', 'medicine_name']
    ordering = ['-created_at']

    def create(self, request, *args, **kwargs):
        user = request.user
        appointment = None
        patient_id = _to_int(request.data.get('patient'))

        appointment_raw = request.data.get('appointment')
        if appointment_raw not in (None, ''):
            appointment_id = _to_int(appointment_raw)
            appointment = Appointment.objects.filter(pk=appointment_id).first() if appointment_id else None
            if appointment is None:
                raise ValidationError({'appointment': 'That appointment does not exist.'})
            if appointment.doctor_id != user.id and not user.is_superuser:
                return Response(
                    {'detail': 'You can only prescribe from your own appointments.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            patient_id = appointment.patient_id

        if patient_id is None:
            raise ValidationError({'patient': 'Choose the patient this prescription is for.'})

        has_relationship = Appointment.objects.filter(
            Q(patient_id=patient_id) & Q(doctor=user)
        ).exists()
        if not has_relationship and not user.is_superuser:
            return Response(
                {'detail': 'You can only prescribe for patients you have an appointment with.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        data['patient'] = patient_id
        data['doctor'] = user.id
        if appointment is not None:
            data['appointment'] = appointment.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(patient_id=patient_id, doctor=user)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        instance = serializer.instance
        serializer.save(
            patient=instance.patient,
            doctor=instance.doctor,
            appointment=instance.appointment,
        )