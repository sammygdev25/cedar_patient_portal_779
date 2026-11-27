"""Serializers aggregator — explicit imports from domain files."""
from .serializers_auth import LoginSerializer, RegisterSerializer, UserSerializer  # noqa: F401
from .serializers_billing import InvoiceSerializer  # noqa: F401
from .serializers_clinical import PrescriptionSerializer, VisitNoteSerializer  # noqa: F401
from .serializers_core import ContactMessageSerializer, DoctorProfileSerializer, OpeningHoursSerializer, ServiceSerializer  # noqa: F401
from .serializers_documents import DocumentSerializer  # noqa: F401
from .serializers_pharmacy import ProductSerializer  # noqa: F401
from .serializers_reports import MonthlyReportInvoiceSerializer, MonthlyReportSerializer  # noqa: F401
from .serializers_scheduling import AppointmentSerializer, AvailabilitySerializer, AvailabilitySlotSerializer  # noqa: F401
