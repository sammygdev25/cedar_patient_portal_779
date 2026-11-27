from django.core.exceptions import ValidationError as DjangoValidationError  # noqa: F401
import mimetypes
import os

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from api.models import Document
from api.serializers_documents import DocumentSerializer
from api.access import AccessMixin, AccessPermission  # Shikshya's access table


MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
}


def inspect_upload(upload):
    """Validate an uploaded file (PDF or image, max 10 MB).

    Returns (content_type, size_bytes) or raises a DRF ValidationError.
    """
    size = getattr(upload, 'size', 0) or 0
    if size <= 0:
        raise ValidationError({'file': 'The uploaded file is empty.'})
    if size > MAX_UPLOAD_BYTES:
        raise ValidationError({'file': 'The file is larger than the 10 MB limit.'})

    extension = os.path.splitext(upload.name or '')[1].lower()
    declared = (getattr(upload, 'content_type', '') or '').split(';')[0].strip().lower()
    guessed = mimetypes.guess_type(upload.name or '')[0] or ''
    content_type = declared or guessed or ALLOWED_EXTENSIONS.get(extension, '')

    extension_ok = extension in ALLOWED_EXTENSIONS
    type_ok = content_type == 'application/pdf' or content_type.startswith('image/')
    if not (extension_ok and type_ok):
        raise ValidationError({'file': 'Only PDF files and images (JPG, PNG, GIF, WebP, HEIC) can be uploaded.'})

    return content_type[:100], size


class DocumentViewSet(AccessMixin, viewsets.ModelViewSet):
    """A patient's own documents. Every query is scoped to the signed-in user."""
    access_model = 'Document'

    serializer_class = DocumentSerializer
    queryset = Document.objects.all().order_by('-created_at')
    permission_classes = [AccessPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'category']
    search_fields = ['title', 'category']
    ordering_fields = ['created_at', 'title', 'size_bytes']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Document.objects.all().order_by('-created_at')
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        return queryset.filter(user=user)

    def perform_create(self, serializer):
        upload = serializer.validated_data.get('file')
        if upload is None:
            raise ValidationError({'file': 'Choose a file to upload.'})
        content_type, size = inspect_upload(upload)
        serializer.save(
            user=self.request.user,
            content_type=content_type,
            size_bytes=size,
        )

    def perform_update(self, serializer):
        upload = serializer.validated_data.get('file')
        if upload is not None:
            content_type, size = inspect_upload(upload)
            serializer.save(content_type=content_type, size_bytes=size)
        else:
            serializer.save()

    def perform_destroy(self, instance):
        stored_file = instance.file
        instance.delete()
        if stored_file:
            try:
                stored_file.delete(save=False)
            except Exception:
                pass