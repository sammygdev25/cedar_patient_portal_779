from rest_framework import serializers

from api.models import ContactMessage, DoctorProfile, OpeningHours, Service
from api.picture_field import PictureField
from api.picture_field import PictureField, StoredFileField


STAFF_ROLES = ('doctor', 'receptionist')


def _is_staff_user(request):
    user = getattr(request, 'user', None)
    if user is None or not user.is_authenticated:
        return False
    return bool(user.is_staff or getattr(user, 'role', None) in STAFF_ROLES)


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = [
            'id',
            'name',
            'description',
            'duration_minutes',
            'display_order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError('Duration must be at least one minute.')
        return value


class DoctorProfileSerializer(serializers.ModelSerializer):
    photo = PictureField(required=False)

    class Meta:
        model = DoctorProfile
        fields = [
            'id',
            'user',
            'display_name',
            'specialty',
            'bio',
            'photo',
            'consultation_minutes',
            'is_accepting_patients',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_consultation_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError('Consultation length must be at least one minute.')
        return value


class OpeningHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpeningHours
        fields = [
            'id',
            'weekday',
            'label',
            'open_time',
            'close_time',
            'is_closed',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_weekday(self, value):
        if value < 0 or value > 6:
            raise serializers.ValidationError('Weekday must be between 0 (Monday) and 6 (Sunday).')
        return value

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        is_closed = attrs.get('is_closed', getattr(instance, 'is_closed', False))
        open_time = attrs.get('open_time', getattr(instance, 'open_time', None))
        close_time = attrs.get('close_time', getattr(instance, 'close_time', None))
        if not is_closed:
            if open_time is None or close_time is None:
                raise serializers.ValidationError(
                    'Opening and closing times are required for an open day.'
                )
            if open_time >= close_time:
                raise serializers.ValidationError('Closing time must be after opening time.')
        return attrs


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = [
            'id',
            'name',
            'email',
            'phone',
            'message',
            'is_handled',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        # Only clinic staff may mark a message as handled; visitors cannot.
        request = self.context.get('request')
        if 'is_handled' in attrs and not _is_staff_user(request):
            attrs.pop('is_handled')
        return attrs