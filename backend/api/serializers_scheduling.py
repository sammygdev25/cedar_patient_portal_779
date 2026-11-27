from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from api.models import Appointment, DoctorProfile, Service

User = get_user_model()

ACTIVE_STATUSES = ['booked', 'checked_in', 'completed']
STAFF_ROLES = ('doctor', 'receptionist')
DEFAULT_SLOT_MINUTES = 30
WALK_IN_GRACE = timedelta(minutes=15)

# Which statuses an appointment may move to from its current one.
STATUS_TRANSITIONS = {
    'booked': {'checked_in', 'cancelled', 'no_show', 'completed'},
    'checked_in': {'completed', 'cancelled'},
    'completed': set(),
    'cancelled': set(),
    'no_show': set(),
}


def _person_name(user):
    """Readable name for a user, falling back to the email address."""
    if user is None:
        return ''
    full_name = ''
    getter = getattr(user, 'get_full_name', None)
    if callable(getter):
        full_name = (getter() or '').strip()
    return full_name or getattr(user, 'email', '') or getattr(user, 'username', '')


def _doctor_profile(user):
    return getattr(user, 'doctor_profile', None)


def _is_staff_user(user):
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, 'role', None) in STAFF_ROLES or user.is_staff)
    )


def _slot_minutes(service, doctor):
    """Length of an appointment: the service duration, else the doctor's consultation time."""
    if service is not None and service.duration_minutes:
        return service.duration_minutes
    profile = _doctor_profile(doctor)
    if profile is not None and profile.consultation_minutes:
        return profile.consultation_minutes
    return DEFAULT_SLOT_MINUTES


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.SerializerMethodField()
    patient_phone = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    doctor_specialty = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    booked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id',
            'patient',
            'patient_name',
            'patient_email',
            'patient_phone',
            'doctor',
            'doctor_name',
            'doctor_specialty',
            'service',
            'service_name',
            'booked_by',
            'booked_by_name',
            'start_time',
            'end_time',
            'reason',
            'status',
            'checked_in_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['booked_by', 'checked_in_at', 'created_at', 'updated_at']
        extra_kwargs = {
            'patient': {'required': False},
            'end_time': {'required': False},
            'status': {'required': False},
        }
        # The partial unique constraint is enforced in validate() with a clear message.
        validators = []

    # ------------------------------------------------------------------
    # Read-only display helpers (cross-domain data via the User / profile)
    # ------------------------------------------------------------------
    def get_patient_name(self, obj):
        return _person_name(obj.patient)

    def get_patient_email(self, obj):
        return getattr(obj.patient, 'email', '') or ''

    def get_patient_phone(self, obj):
        return getattr(obj.patient, 'phone', '') or ''

    def get_doctor_name(self, obj):
        profile = _doctor_profile(obj.doctor)
        if profile is not None and profile.display_name:
            return profile.display_name
        return _person_name(obj.doctor)

    def get_doctor_specialty(self, obj):
        profile = _doctor_profile(obj.doctor)
        return profile.specialty if profile is not None else ''

    def get_service_name(self, obj):
        return obj.service.name if obj.service_id else ''

    def get_booked_by_name(self, obj):
        return _person_name(obj.booked_by) if obj.booked_by_id else ''

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------
    def _current_user(self):
        request = self.context.get('request')
        return getattr(request, 'user', None) if request else None

    def validate_patient(self, value):
        if getattr(value, 'role', 'patient') != 'patient':
            raise serializers.ValidationError('The selected user is not a patient.')
        return value

    def validate_doctor(self, value):
        if getattr(value, 'role', None) != 'doctor':
            raise serializers.ValidationError('The selected user is not a doctor.')
        profile = _doctor_profile(value)
        if profile is not None and not profile.is_accepting_patients:
            raise serializers.ValidationError('This doctor is not accepting new appointments.')
        return value

    def validate_service(self, value):
        if value is not None and not value.is_active:
            raise serializers.ValidationError('This service is no longer offered.')
        return value

    def validate(self, attrs):
        user = self._current_user()
        if user is None or not user.is_authenticated:
            raise serializers.ValidationError('Sign in to manage appointments.')

        instance = self.instance
        staff = _is_staff_user(user)

        if instance is None:
            return self._validate_create(attrs, user, staff)
        return self._validate_update(attrs, instance, user, staff)

    def _validate_create(self, attrs, user, staff):
        if not staff:
            attrs['patient'] = user
        elif 'patient' not in attrs:
            raise serializers.ValidationError({'patient': 'Choose the patient for this appointment.'})

        if 'doctor' not in attrs:
            raise serializers.ValidationError({'doctor': 'Choose a doctor.'})
        if 'start_time' not in attrs:
            raise serializers.ValidationError({'start_time': 'Choose a time slot.'})

        earliest = timezone.now() - (WALK_IN_GRACE if staff else timedelta(0))
        if attrs['start_time'] < earliest:
            raise serializers.ValidationError({'start_time': 'Appointments must be booked in the future.'})

        attrs['status'] = 'booked'
        attrs['booked_by'] = user

        if not attrs.get('end_time'):
            minutes = _slot_minutes(attrs.get('service'), attrs['doctor'])
            attrs['end_time'] = attrs['start_time'] + timedelta(minutes=minutes)
        self._check_times_and_conflicts(attrs['doctor'], attrs['start_time'], attrs['end_time'], None)
        return attrs

    def _validate_update(self, attrs, instance, user, staff):
        if not staff:
            if instance.patient_id != user.id:
                raise serializers.ValidationError('You can only change your own appointments.')
            if 'patient' in attrs and attrs['patient'].id != instance.patient_id:
                raise serializers.ValidationError({'patient': 'You cannot reassign an appointment.'})

        current_status = instance.status
        new_status = attrs.get('status', current_status)

        if new_status != current_status:
            allowed = STATUS_TRANSITIONS.get(current_status, set())
            if new_status not in allowed:
                raise serializers.ValidationError(
                    {'status': 'An appointment that is %s cannot be marked %s.'
                               % (instance.get_status_display().lower(), new_status.replace('_', ' '))}
                )
            if not staff and new_status != 'cancelled':
                raise serializers.ValidationError({'status': 'Patients can only cancel their appointments.'})
            if new_status == 'checked_in':
                attrs['checked_in_at'] = timezone.now()

        doctor = attrs.get('doctor', instance.doctor)
        service = attrs['service'] if 'service' in attrs else instance.service
        timing_changed = any(
            key in attrs and attrs[key] != getattr(instance, key)
            for key in ('start_time', 'end_time', 'doctor')
        )

        if timing_changed:
            if current_status != 'booked':
                raise serializers.ValidationError('Only booked appointments can be rescheduled.')
            start_time = attrs.get('start_time', instance.start_time)
            if start_time < timezone.now() - (WALK_IN_GRACE if staff else timedelta(0)):
                raise serializers.ValidationError({'start_time': 'Choose a time in the future.'})
            if 'end_time' not in attrs or not attrs['end_time'] or attrs['end_time'] == instance.end_time:
                attrs['end_time'] = start_time + timedelta(minutes=_slot_minutes(service, doctor))
            end_time = attrs['end_time']
            if new_status in ACTIVE_STATUSES:
                self._check_times_and_conflicts(doctor, start_time, end_time, instance.pk)
            elif end_time <= start_time:
                raise serializers.ValidationError({'end_time': 'The end time must be after the start time.'})
        return attrs

    def _check_times_and_conflicts(self, doctor, start_time, end_time, exclude_pk):
        if end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'The end time must be after the start time.'})
        clashes = Appointment.objects.filter(
            doctor=doctor,
            status__in=ACTIVE_STATUSES,
            start_time__lt=end_time,
            end_time__gt=start_time,
        )
        if exclude_pk is not None:
            clashes = clashes.exclude(pk=exclude_pk)
        if clashes.exists():
            raise serializers.ValidationError(
                {'start_time': 'That time is already booked for this doctor. Please choose another slot.'}
            )

    # ------------------------------------------------------------------
    # Persistence (the DB constraint is the final guard against races)
    # ------------------------------------------------------------------
    def create(self, validated_data):
        try:
            with transaction.atomic():
                return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError(
                {'start_time': 'That time was just taken for this doctor. Please choose another slot.'}
            )

    def update(self, instance, validated_data):
        try:
            with transaction.atomic():
                return super().update(instance, validated_data)
        except IntegrityError:
            raise serializers.ValidationError(
                {'start_time': 'That time was just taken for this doctor. Please choose another slot.'}
            )


class AvailabilitySlotSerializer(serializers.Serializer):
    start_time = serializers.DateTimeField(read_only=True)
    end_time = serializers.DateTimeField(read_only=True)


class AvailabilitySerializer(serializers.Serializer):
    """Query parameters (doctor, date, service) in; free slots out."""

    doctor = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role='doctor'))
    date = serializers.DateField()
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    slots = AvailabilitySlotSerializer(many=True, read_only=True, required=False, default=list)

    def validate_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('Choose today or a future date.')
        return value

    def validate_doctor(self, value):
        profile = _doctor_profile(value)
        if profile is not None and not profile.is_accepting_patients:
            raise serializers.ValidationError('This doctor is not accepting new appointments.')
        return value