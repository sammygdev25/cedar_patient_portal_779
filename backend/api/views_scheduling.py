from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Appointment, DoctorProfile, OpeningHours, Service
from api.serializers_scheduling import AppointmentSerializer, AvailabilitySerializer
from api.access import AccessMixin, AccessPermission  # Shikshya's access table

User = get_user_model()

ACTIVE_STATUSES = ['booked', 'checked_in', 'completed']
DEFAULT_MINUTES = 30
DEFAULT_OPEN = time(9, 0)
DEFAULT_CLOSE = time(17, 0)

# Which statuses each role may set, and which moves are legal from each status.
ROLE_STATUSES = {
    'patient': {'cancelled'},
    'doctor': {'checked_in', 'completed', 'no_show', 'cancelled'},
    'receptionist': {'checked_in', 'cancelled', 'no_show'},
}
TRANSITIONS = {
    'booked': {'checked_in', 'completed', 'cancelled', 'no_show'},
    'checked_in': {'completed', 'cancelled'},
    'completed': set(),
    'cancelled': set(),
    'no_show': set(),
}
SLOT_CONFLICT_MESSAGE = 'That time is no longer available for this doctor. Please choose another slot.'


def get_role(user):
    """Return 'patient', 'doctor' or 'receptionist' for the signed-in user."""
    if not user or not user.is_authenticated:
        return None
    role = getattr(user, 'role', None)
    if role in ROLE_STATUSES:
        return role
    if user.is_superuser or user.is_staff:
        return 'receptionist'
    return 'patient'


def to_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def parse_dt(value):
    """Parse an ISO datetime into an aware datetime, or return None."""
    if isinstance(value, datetime):
        result = value
    else:
        try:
            result = parse_datetime(str(value)) if value else None
        except ValueError:
            result = None
    if result is None:
        return None
    if timezone.is_naive(result):
        result = timezone.make_aware(result, timezone.get_current_timezone())
    return result


def get_doctor(doctor_id):
    pk = to_int(doctor_id)
    if pk is None:
        return None
    return User.objects.filter(pk=pk, role='doctor').first()


def get_service(service_id):
    pk = to_int(service_id)
    if pk is None:
        return None
    return Service.objects.filter(pk=pk, is_active=True).first()


def visit_minutes(doctor, service):
    if service and service.duration_minutes:
        return service.duration_minutes
    profile = DoctorProfile.objects.filter(user=doctor).first()
    if profile and profile.consultation_minutes:
        return profile.consultation_minutes
    return DEFAULT_MINUTES


def has_conflict(doctor, start, end, exclude_pk=None):
    qs = Appointment.objects.filter(
        doctor=doctor,
        status__in=ACTIVE_STATUSES,
        start_time__lt=end,
        end_time__gt=start,
    )
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    return qs.exists()


def _first_attr(obj, names, default=None):
    for name in names:
        if hasattr(obj, name):
            value = getattr(obj, name)
            if value is not None:
                return value
    return default


def opening_window(day):
    """Return (open_time, close_time) for a date, or None if the clinic is closed."""
    try:
        rows = list(OpeningHours.objects.all())
    except Exception:
        rows = []
    weekday = day.weekday()
    matches = []
    for row in rows:
        row_day = _first_attr(row, ['weekday', 'day_of_week', 'day'])
        if to_int(row_day) == weekday:
            matches.append(row)
    if not matches:
        if rows:
            return None
        return DEFAULT_OPEN, DEFAULT_CLOSE
    row = matches[0]
    if _first_attr(row, ['is_closed', 'closed'], False):
        return None
    opens = _first_attr(row, ['open_time', 'opens_at', 'opens', 'start_time'], DEFAULT_OPEN)
    closes = _first_attr(row, ['close_time', 'closes_at', 'closes', 'end_time'], DEFAULT_CLOSE)
    return opens, closes


def within_opening_hours(start, end):
    local_start = timezone.localtime(start)
    local_end = timezone.localtime(end)
    window = opening_window(local_start.date())
    if window is None:
        return False
    if local_end.date() != local_start.date():
        return False
    return window[0] <= local_start.time() and local_end.time() <= window[1]


class AppointmentViewSet(AccessMixin, viewsets.ModelViewSet):
    """Booking, rescheduling, cancelling and check-in of clinic appointments."""
    access_model = 'Appointment'

    queryset = Appointment.objects.select_related('patient', 'doctor', 'service', 'booked_by').order_by('start_time')
    serializer_class = AppointmentSerializer
    permission_classes = [AccessPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'doctor', 'service', 'booked_by', 'status']
    search_fields = [
        'reason',
        'patient__email',
        'patient__first_name',
        'patient__last_name',
        'doctor__doctor_profile__display_name',
    ]
    ordering_fields = ['start_time', 'end_time', 'created_at', 'status']
    ordering = ['start_time']

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return super().get_queryset().none()
        user = self.request.user
        role = get_role(user)
        qs = super().get_queryset()
        if role is None:
            return qs.none()
        if role == 'patient':
            qs = qs.filter(patient=user)
        elif role == 'doctor':
            qs = qs.filter(doctor=user)

        params = self.request.query_params
        day = parse_date(params.get('date') or '')
        if day:
            qs = qs.filter(start_time__date=day)
        date_from = parse_date(params.get('date_from') or '')
        if date_from:
            qs = qs.filter(start_time__date__gte=date_from)
        date_to = parse_date(params.get('date_to') or '')
        if date_to:
            qs = qs.filter(start_time__date__lte=date_to)
        if (params.get('upcoming') or '').lower() in ('1', 'true', 'yes'):
            qs = qs.filter(start_time__gte=timezone.now(), status__in=['booked', 'checked_in'])
        return qs

    # ---- create -------------------------------------------------------

    def create(self, request, *args, **kwargs):
        user = request.user
        role = get_role(user)
        if role not in ('patient', 'receptionist'):
            raise PermissionDenied('Only patients and reception staff can book appointments.')

        data = request.data.copy()

        if role == 'patient':
            patient = user
        else:
            patient_id = to_int(data.get('patient'))
            patient = User.objects.filter(pk=patient_id, role='patient').first() if patient_id else None
            if patient is None:
                raise ValidationError({'patient': 'Choose the patient this appointment is for.'})

        doctor = get_doctor(data.get('doctor'))
        if doctor is None:
            raise ValidationError({'doctor': 'Choose a doctor for this appointment.'})
        profile = DoctorProfile.objects.filter(user=doctor).first()
        if profile is not None and not profile.is_accepting_patients:
            raise ValidationError({'doctor': 'This doctor is not accepting new appointments right now.'})

        service = None
        if data.get('service'):
            service = get_service(data.get('service'))
            if service is None:
                raise ValidationError({'service': 'That service is not available.'})

        start = parse_dt(data.get('start_time'))
        if start is None:
            raise ValidationError({'start_time': 'Choose a valid appointment time.'})
        if start <= timezone.now():
            raise ValidationError({'start_time': 'Appointments cannot be booked in the past.'})
        end = start + timedelta(minutes=visit_minutes(doctor, service))

        if not within_opening_hours(start, end):
            raise ValidationError({'start_time': 'The clinic is closed at that time.'})

        data['patient'] = patient.pk
        data['doctor'] = doctor.pk
        data['start_time'] = start.isoformat()
        data['end_time'] = end.isoformat()
        data['status'] = 'booked'
        data.pop('checked_in_at', None)

        try:
            with transaction.atomic():
                # Lock the doctor row so concurrent bookings are serialised.
                User.objects.select_for_update().get(pk=doctor.pk)
                if has_conflict(doctor, start, end):
                    raise ValidationError({'start_time': SLOT_CONFLICT_MESSAGE})
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                serializer.save(booked_by=user)
        except IntegrityError:
            raise ValidationError({'start_time': SLOT_CONFLICT_MESSAGE})

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    # ---- update / reschedule -------------------------------------------

    def _check_can_modify(self, appointment, role):
        if role is None:
            raise PermissionDenied('Sign in to manage appointments.')
        if role == 'patient' and appointment.patient_id != self.request.user.pk:
            raise PermissionDenied('You can only change your own appointments.')
        if role == 'doctor' and appointment.doctor_id != self.request.user.pk:
            raise PermissionDenied('You can only change your own appointments.')

    def _validate_status_change(self, appointment, new_status, role):
        if new_status == appointment.status:
            return
        if new_status not in ROLE_STATUSES.get(role, set()):
            raise PermissionDenied('You are not allowed to set that status.')
        if new_status not in TRANSITIONS.get(appointment.status, set()):
            raise ValidationError(
                {'status': 'An appointment that is %s cannot be marked %s.' % (appointment.status, new_status)}
            )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        role = get_role(request.user)
        appointment = self.get_object()
        self._check_can_modify(appointment, role)

        if role == 'doctor':
            # Doctors may only change status, via the status actions.
            allowed = {'status'}
            if set(request.data.keys()) - allowed:
                raise PermissionDenied('Doctors can only update the status of an appointment.')

        if appointment.status not in ('booked', 'checked_in') and set(request.data.keys()) - {'status'}:
            raise ValidationError({'status': 'This appointment can no longer be changed.'})

        data = request.data.copy()
        data.pop('patient', None) if role == 'patient' else None
        data.pop('booked_by', None)
        data.pop('checked_in_at', None)

        new_status = data.get('status')
        if new_status:
            self._validate_status_change(appointment, new_status, role)
            if new_status == 'checked_in' and not appointment.checked_in_at:
                data['checked_in_at'] = timezone.now().isoformat()

        doctor = appointment.doctor
        if data.get('doctor') and to_int(data.get('doctor')) != appointment.doctor_id:
            doctor = get_doctor(data.get('doctor'))
            if doctor is None:
                raise ValidationError({'doctor': 'Choose a doctor for this appointment.'})
        data['doctor'] = doctor.pk

        service = appointment.service
        if 'service' in data:
            if data.get('service'):
                service = get_service(data.get('service'))
                if service is None:
                    raise ValidationError({'service': 'That service is not available.'})
            else:
                service = None

        rescheduling = any(k in data for k in ('start_time', 'doctor', 'service'))
        start = appointment.start_time
        end = appointment.end_time
        if rescheduling:
            if data.get('start_time'):
                start = parse_dt(data.get('start_time'))
                if start is None:
                    raise ValidationError({'start_time': 'Choose a valid appointment time.'})
            changed_time = (
                start != appointment.start_time
                or doctor.pk != appointment.doctor_id
                or (service.pk if service else None) != appointment.service_id
            )
            if changed_time:
                if start <= timezone.now():
                    raise ValidationError({'start_time': 'Appointments cannot be moved into the past.'})
                end = start + timedelta(minutes=visit_minutes(doctor, service))
                if not within_opening_hours(start, end):
                    raise ValidationError({'start_time': 'The clinic is closed at that time.'})
            data['start_time'] = start.isoformat()
            data['end_time'] = end.isoformat()

        try:
            with transaction.atomic():
                User.objects.select_for_update().get(pk=doctor.pk)
                if (
                    (data.get('status') or appointment.status) in ACTIVE_STATUSES
                    and has_conflict(doctor, start, end, exclude_pk=appointment.pk)
                ):
                    raise ValidationError({'start_time': SLOT_CONFLICT_MESSAGE})
                serializer = self.get_serializer(appointment, data=data, partial=True if partial or True else False)
                serializer.is_valid(raise_exception=True)
                serializer.save()
        except IntegrityError:
            raise ValidationError({'start_time': SLOT_CONFLICT_MESSAGE})

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Deleting an appointment cancels it so the history is kept."""
        role = get_role(request.user)
        appointment = self.get_object()
        self._check_can_modify(appointment, role)
        self._validate_status_change(appointment, 'cancelled', role)
        appointment.status = 'cancelled'
        appointment.save()
        return Response(self.get_serializer(appointment).data)

    # ---- status actions ------------------------------------------------

    def _set_status(self, request, new_status):
        role = get_role(request.user)
        appointment = self.get_object()
        self._check_can_modify(appointment, role)
        self._validate_status_change(appointment, new_status, role)
        appointment.status = new_status
        fields = ['status']
        if new_status == 'checked_in' and hasattr(appointment, 'checked_in_at'):
            appointment.checked_in_at = timezone.now()
            fields.append('checked_in_at')
        appointment.save()
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        return self._set_status(request, 'cancelled')

    @action(detail=True, methods=['post'], url_path='check-in')
    def check_in(self, request, pk=None):
        return self._set_status(request, 'checked_in')

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        return self._set_status(request, 'completed')

    @action(detail=True, methods=['post'], url_path='no-show')
    def no_show(self, request, pk=None):
        return self._set_status(request, 'no_show')


class AvailabilityView(APIView):
    """List the free appointment slots for a doctor on a given day."""

    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        doctor = get_doctor(request.query_params.get('doctor'))
        if doctor is None:
            raise ValidationError({'doctor': 'Choose a doctor.'})
        day = parse_date(request.query_params.get('date') or '')
        if day is None:
            raise ValidationError({'date': 'Provide a date in YYYY-MM-DD format.'})

        service = None
        if request.query_params.get('service'):
            service = get_service(request.query_params.get('service'))
            if service is None:
                raise ValidationError({'service': 'That service is not available.'})

        profile = DoctorProfile.objects.filter(user=doctor).first()
        if profile is not None and not profile.is_accepting_patients:
            return Response([])

        window = opening_window(day)
        if window is None:
            return Response([])

        minutes = visit_minutes(doctor, service)
        tz = timezone.get_current_timezone()
        cursor = timezone.make_aware(datetime.combine(day, window[0]), tz)
        closing = timezone.make_aware(datetime.combine(day, window[1]), tz)
        step = timedelta(minutes=minutes)
        now = timezone.now()

        booked = list(
            Appointment.objects.filter(
                doctor=doctor,
                status__in=ACTIVE_STATUSES,
                start_time__lt=closing,
                end_time__gt=cursor,
            ).values_list('start_time', 'end_time')
        )

        slots = []
        while cursor + step <= closing:
            slot_end = cursor + step
            if cursor > now and not any(b_start < slot_end and b_end > cursor for b_start, b_end in booked):
                slots.append({'start': cursor, 'end': slot_end})
            cursor = slot_end

        serializer = AvailabilitySerializer(slots, many=True)
        return Response(serializer.data)