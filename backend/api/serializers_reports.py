from decimal import Decimal

from rest_framework import serializers

from api.models import Appointment, Invoice


def _person_name(user):
    """Readable name for a user, falling back to username or email."""
    if user is None:
        return ''
    full_name = user.get_full_name().strip() if hasattr(user, 'get_full_name') else ''
    return full_name or user.username or getattr(user, 'email', '') or ''


class MonthlyReportInvoiceSerializer(serializers.ModelSerializer):
    """One bill row of the monthly report."""

    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.CharField(source='user.email', read_only=True)
    appointment_start = serializers.DateTimeField(source='appointment.start_time', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'user',
            'patient_name',
            'patient_email',
            'appointment',
            'appointment_start',
            'created_by',
            'created_by_name',
            'description',
            'amount',
            'status',
            'due_date',
            'paid_at',
            'created_at',
        ]
        read_only_fields = fields

    def get_patient_name(self, obj):
        return _person_name(obj.user)

    def get_created_by_name(self, obj):
        return _person_name(obj.created_by)


class MonthlyReportSerializer(serializers.ModelSerializer):
    """One appointment row of the monthly report with its billing totals.

    Only reads Appointment and its related Invoice rows (related_name='invoices').
    """

    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    doctor_name = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    booked_by_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    invoice_count = serializers.SerializerMethodField()
    billed_total = serializers.SerializerMethodField()
    paid_total = serializers.SerializerMethodField()
    unpaid_total = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id',
            'patient',
            'patient_name',
            'patient_email',
            'doctor',
            'doctor_name',
            'service',
            'service_name',
            'booked_by',
            'booked_by_name',
            'start_time',
            'end_time',
            'reason',
            'status',
            'status_label',
            'checked_in_at',
            'invoice_count',
            'billed_total',
            'paid_total',
            'unpaid_total',
        ]
        read_only_fields = fields

    def _invoices(self, obj):
        # Uses the prefetch cache when the view prefetches 'invoices'.
        return list(obj.invoices.all())

    @staticmethod
    def _money(value):
        return str(Decimal(value).quantize(Decimal('0.01')))

    def get_patient_name(self, obj):
        return _person_name(obj.patient)

    def get_doctor_name(self, obj):
        return _person_name(obj.doctor)

    def get_service_name(self, obj):
        return obj.service.name if obj.service else ''

    def get_booked_by_name(self, obj):
        return _person_name(obj.booked_by)

    def get_invoice_count(self, obj):
        return len([i for i in self._invoices(obj) if i.status != 'void'])

    def get_billed_total(self, obj):
        total = sum(
            (i.amount for i in self._invoices(obj) if i.status != 'void'),
            Decimal('0'),
        )
        return self._money(total)

    def get_paid_total(self, obj):
        total = sum(
            (i.amount for i in self._invoices(obj) if i.status == 'paid'),
            Decimal('0'),
        )
        return self._money(total)

    def get_unpaid_total(self, obj):
        total = sum(
            (i.amount for i in self._invoices(obj) if i.status == 'unpaid'),
            Decimal('0'),
        )
        return self._money(total)