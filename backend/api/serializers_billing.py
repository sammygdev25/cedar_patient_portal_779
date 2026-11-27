from django.contrib.auth import get_user_model
from rest_framework import serializers

from api.models import Appointment, Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    """Bill raised by reception for a patient; paid through the Stripe checkout.

    status, paid_at and stripe_session_id are read-only: only the payment
    webhook moves an invoice to paid.
    """

    user = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.filter(role='patient')
    )
    appointment = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all(),
        required=False,
        allow_null=True,
    )
    user_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    appointment_start_time = serializers.DateTimeField(
        source='appointment.start_time', read_only=True
    )
    appointment_reason = serializers.CharField(
        source='appointment.reason', read_only=True
    )
    is_paid = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'appointment',
            'appointment_start_time',
            'appointment_reason',
            'created_by',
            'created_by_name',
            'description',
            'amount',
            'status',
            'is_paid',
            'due_date',
            'paid_at',
            'created_at',
            'updated_at',
            'stripe_session_id',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'status',
            'paid_at',
            'created_at',
            'updated_at',
            'stripe_session_id',
        ]

    def get_user_name(self, obj):
        user = obj.user
        full_name = user.get_full_name() if hasattr(user, 'get_full_name') else ''
        return full_name or user.email

    def get_created_by_name(self, obj):
        creator = obj.created_by
        if creator is None:
            return ''
        full_name = creator.get_full_name() if hasattr(creator, 'get_full_name') else ''
        return full_name or creator.email

    def get_is_paid(self, obj):
        return obj.status == 'paid'

    def validate_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('The amount must be greater than zero.')
        return value

    def validate_description(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Please describe what the bill is for.')
        return value

    def validate(self, attrs):
        patient = attrs.get('user', getattr(self.instance, 'user', None))
        appointment = attrs.get(
            'appointment', getattr(self.instance, 'appointment', None)
        )
        if appointment is not None and patient is not None:
            if appointment.patient_id != patient.id:
                raise serializers.ValidationError(
                    {'appointment': 'This appointment belongs to a different patient.'}
                )
        return attrs