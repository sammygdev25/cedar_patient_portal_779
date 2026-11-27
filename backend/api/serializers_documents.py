from rest_framework import serializers

from api.models import Document
from api.picture_field import StoredFileField
from api.picture_field import PictureField, StoredFileField

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_CONTENT_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
}

ALLOWED_EXTENSIONS = {
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif',
}


class DocumentSerializer(serializers.ModelSerializer):
    file = StoredFileField(required=False)

    class Meta:
        model = Document
        fields = [
            'id',
            'user',
            'title',
            'category',
            'file',
            'content_type',
            'size_bytes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'user',
            'content_type',
            'size_bytes',
            'created_at',
            'updated_at',
        ]

    def validate_file(self, value):
        size = getattr(value, 'size', None)
        name = getattr(value, 'name', '') or ''
        # Only uploaded files are checked; an already stored value is left alone.
        if size is None or not hasattr(value, 'read'):
            return value

        if size > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError(
                'This file is larger than 10 MB. Please upload a smaller PDF or image.'
            )
        if size == 0:
            raise serializers.ValidationError('This file is empty.')

        lowered = name.lower()
        extension = lowered[lowered.rfind('.'):] if '.' in lowered else ''
        declared_type = (getattr(value, 'content_type', '') or '').lower()

        if extension not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                'Only PDF files and images (JPG, PNG, GIF, WEBP, HEIC) can be uploaded.'
            )
        if declared_type and declared_type not in ALLOWED_CONTENT_TYPES \
                and declared_type != 'application/octet-stream':
            raise serializers.ValidationError(
                'Only PDF files and images (JPG, PNG, GIF, WEBP, HEIC) can be uploaded.'
            )
        return value

    @staticmethod
    def _file_details(uploaded):
        details = {}
        if uploaded is not None and hasattr(uploaded, 'read'):
            details['size_bytes'] = getattr(uploaded, 'size', 0) or 0
            details['content_type'] = (getattr(uploaded, 'content_type', '') or '')[:100]
        return details

    def create(self, validated_data):
        request = self.context.get('request')
        if request is not None and getattr(request, 'user', None) is not None \
                and request.user.is_authenticated:
            validated_data.setdefault('user', request.user)
        validated_data.update(self._file_details(validated_data.get('file')))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'file' in validated_data:
            validated_data.update(self._file_details(validated_data.get('file')))
        return super().update(instance, validated_data)