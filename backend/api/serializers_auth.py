"""Auth serializers -- deterministic scaffold. Sign-up runs the project's password validators; the profile says the
user's role and whether they are staff (is_staff, or one of the plan's staff roles), both read only. One email
belongs to one account: sign-up and a profile edit refuse an email another account has, in any case. A profile
edit also saves the user model's own text and date fields (profile_field_names), never a role, flag or state."""
import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()
ROLE_FIELD = 'role'
STAFF_ROLES = ('doctor', 'receptionist')
EMAIL_TAKEN = 'An account with this email already exists.'
PROFILE_TYPES = ('CharField', 'TextField', 'DateField')
PROFILE_SKIP = re.compile(r'^(?:is|has|can)_|status|stripe|token|verif|approv|tier|plan|balance|credit|secret|key|role')
BUILT_IN = ('username', 'email', 'first_name', 'last_name', 'password', 'last_login', 'date_joined')


def email_taken(value, user=None):
    """True when another account has this email, in any case; a blank email is never taken."""
    if not value:
        return False
    others = User.objects.filter(email__iexact=value)
    if user is not None:
        others = others.exclude(pk=user.pk)
    return others.exists()


def profile_field_names():
    """The user model's own fields a user edits on their profile (PX.356): text, long text and dates, never the
    role, a flag, a field with choices, a number, a link or a file, nor a name that reads like a state or a secret."""
    names = []
    for field in User._meta.concrete_fields:
        if field.get_internal_type() not in PROFILE_TYPES or field.name in BUILT_IN or field.name == ROLE_FIELD:
            continue
        if field.choices or not field.editable or field.primary_key or PROFILE_SKIP.search(field.name.lower()):
            continue
        names.append(field.name)
    return names


def profile_fields():
    """Serializer fields for those names, built as a ModelSerializer builds them, each optional."""
    names = profile_field_names()
    if not names:
        return {}
    meta = type('Meta', (), {'model': User, 'fields': names})
    built = type('ProfileFields', (serializers.ModelSerializer,), {'Meta': meta})().get_fields()
    for field in built.values():
        field.required = False
    return built


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name']

    def validate_email(self, value):
        if email_taken(value):
            raise serializers.ValidationError(EMAIL_TAKEN)
        return value

    def validate(self, attrs):
        candidate = User(**{k: attrs.get(k, '') for k in ('username', 'email', 'first_name', 'last_name')})
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    date_joined = serializers.DateTimeField(read_only=True)
    role = serializers.SerializerMethodField()
    is_staff = serializers.SerializerMethodField()

    def get_fields(self):
        fields = super().get_fields()
        fields.update(profile_fields())
        return fields

    def validate_email(self, value):
        if email_taken(value, self.instance):
            raise serializers.ValidationError(EMAIL_TAKEN)
        return value

    def get_role(self, obj):
        return getattr(obj, ROLE_FIELD, None) if ROLE_FIELD else None

    def get_is_staff(self, obj):
        role = getattr(obj, ROLE_FIELD, None) if ROLE_FIELD else None
        return bool(obj.is_staff or obj.is_superuser or role in STAFF_ROLES)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
