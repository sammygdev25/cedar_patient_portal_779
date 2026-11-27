from django.contrib.auth import get_user_model
from rest_framework import serializers

from api.models import Appointment, Prescription, Product, VisitNote


User = get_user_model()


def _display_name(user):
    """Readable name for a user, falling back to the email address."""
    if user is None:
        return ''
    full_name = ''
    if hasattr(user, 'get_full_name'):
        full_name = (user.get_full_name() or '').strip()
    return full_name or getattr(user, 'email', '') or getattr(user, 'username', '')


def _request_user(serializer):
    request = serializer.context.get('request')
    user = getattr(request, 'user', None)
    if user is not None and getattr(user, 'is_authenticated', False):
        return user
    return None


def _check_can_write_for_appointment(user, appointment):
    """Only the doctor who owns the appointment may write clinical records for it."""
    if user is None:
        raise serializers.ValidationError('You must be signed in to write clinical records.')
    if getattr(user, 'is_superuser', False):
        return
    if getattr(user, 'role', None) != 'doctor':
        raise serializers.ValidationError('Only doctors can write visit notes and prescriptions.')
    if appointment is not None and appointment.doctor_id != user.id:
        raise serializers.ValidationError(
            {'appointment': 'You can only write records for your own appointments.'}
        )


class VisitNoteSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    appointment_start_time = serializers.DateTimeField(
        source='appointment.start_time', read_only=True
    )
    appointment_reason = serializers.CharField(
        source='appointment.reason', read_only=True
    )
    service_name = serializers.CharField(
        source='appointment.service.name', read_only=True, allow_null=True
    )

    class Meta:
        model = VisitNote
        fields = [
            'id',
            'appointment',
            'patient',
            'doctor',
            'diagnosis',
            'summary',
            'follow_up_instructions',
            'created_at',
            'updated_at',
            'patient_name',
            'doctor_name',
            'appointment_start_time',
            'appointment_reason',
            'service_name',
        ]
        read_only_fields = [
            'id',
            'patient',
            'doctor',
            'created_at',
            'updated_at',
            'patient_name',
            'doctor_name',
            'appointment_start_time',
            'appointment_reason',
            'service_name',
        ]

    def get_patient_name(self, obj):
        return _display_name(obj.patient)

    def get_doctor_name(self, obj):
        return _display_name(obj.doctor)

    def validate_appointment(self, value):
        if self.instance is not None and value.pk != self.instance.appointment_id:
            raise serializers.ValidationError(
                'A visit note cannot be moved to a different appointment.'
            )
        return value

    def validate(self, attrs):
        if self.instance is None:
            appointment = attrs.get('appointment')
            if appointment is None:
                raise serializers.ValidationError(
                    {'appointment': 'An appointment is required for a visit note.'}
                )
            if VisitNote.objects.filter(appointment=appointment).exists():
                raise serializers.ValidationError(
                    {'appointment': 'This appointment already has a visit note.'}
                )
            _check_can_write_for_appointment(_request_user(self), appointment)
        else:
            _check_can_write_for_appointment(
                _request_user(self), self.instance.appointment
            )
        return attrs

    def create(self, validated_data):
        appointment = validated_data['appointment']
        validated_data.setdefault('patient', appointment.patient)
        validated_data.setdefault('doctor', appointment.doctor)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('appointment', None)
        return super().update(instance, validated_data)


class PrescriptionSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False
    )
    medicine_name = serializers.CharField(max_length=200, required=False)
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    product_name = serializers.CharField(
        source='product.name', read_only=True, allow_null=True
    )
    product_price = serializers.DecimalField(
        source='product.price',
        max_digits=8,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    product_in_stock = serializers.BooleanField(
        source='product.in_stock', read_only=True, allow_null=True
    )

    class Meta:
        model = Prescription
        fields = [
            'id',
            'appointment',
            'patient',
            'doctor',
            'product',
            'medicine_name',
            'dosage',
            'instructions',
            'notes',
            'refills_allowed',
            'is_active',
            'created_at',
            'updated_at',
            'patient_name',
            'doctor_name',
            'product_name',
            'product_price',
            'product_in_stock',
        ]
        read_only_fields = [
            'id',
            'doctor',
            'created_at',
            'updated_at',
            'patient_name',
            'doctor_name',
            'product_name',
            'product_price',
            'product_in_stock',
        ]

    def get_patient_name(self, obj):
        return _display_name(obj.patient)

    def get_doctor_name(self, obj):
        return _display_name(obj.doctor)

    def validate_refills_allowed(self, value):
        if value < 0:
            raise serializers.ValidationError('Refills cannot be negative.')
        return value

    def validate_product(self, value):
        if value is not None and not value.is_active:
            raise serializers.ValidationError('This product is no longer available.')
        return value

    def validate(self, attrs):
        if self.instance is not None:
            # Who the prescription belongs to never changes after it is written.
            attrs.pop('patient', None)
            attrs.pop('appointment', None)
            _check_can_write_for_appointment(_request_user(self), None)
            user = _request_user(self)
            if (
                user is not None
                and not getattr(user, 'is_superuser', False)
                and self.instance.doctor_id != user.id
            ):
                raise serializers.ValidationError(
                    'You can only change prescriptions you wrote.'
                )
            return attrs

        appointment = attrs.get('appointment')
        patient = attrs.get('patient')

        if appointment is not None:
            if patient is None:
                patient = appointment.patient
                attrs['patient'] = patient
            elif patient.pk != appointment.patient_id:
                raise serializers.ValidationError(
                    {'patient': 'The patient does not match the appointment.'}
                )
        if patient is None:
            raise serializers.ValidationError(
                {'patient': 'A patient is required for a prescription.'}
            )

        _check_can_write_for_appointment(_request_user(self), appointment)

        product = attrs.get('product')
        if not attrs.get('medicine_name'):
            if product is not None:
                attrs['medicine_name'] = product.name
            else:
                raise serializers.ValidationError(
                    {'medicine_name': 'Enter the medicine name or choose a pharmacy product.'}
                )
        return attrs

    def create(self, validated_data):
        if 'doctor' not in validated_data:
            user = _request_user(self)
            appointment = validated_data.get('appointment')
            if user is not None and getattr(user, 'role', None) == 'doctor':
                validated_data['doctor'] = user
            elif appointment is not None:
                validated_data['doctor'] = appointment.doctor
        return super().create(validated_data)