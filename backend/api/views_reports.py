from calendar import monthrange
import csv
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.negotiation import BaseContentNegotiation
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Appointment, Invoice
from api.permissions import IsStaff  # Shikshya's permissions


class CsvFriendlyNegotiation(BaseContentNegotiation):
    """Accept any Accept header (e.g. text/csv); the view builds its own response."""

    def select_parser(self, request, parsers):
        return parsers[0] if parsers else None

    def select_renderer(self, request, renderers, format_suffix=None):
        renderer = renderers[0]
        return renderer, renderer.media_type


class IsReceptionist(BasePermission):
    """Only receptionists (and superusers) may download clinic-wide reports."""

    message = 'Only reception staff can download clinic reports.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return getattr(user, 'role', '') == 'receptionist'


def _safe(value):
    """Neutralise spreadsheet formula injection and normalise None."""
    if value is None:
        return ''
    text = str(value)
    if text and text[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + text
    return text


def _person(user):
    if user is None:
        return ''
    full_name = user.get_full_name().strip() if hasattr(user, 'get_full_name') else ''
    return full_name or user.get_username()


def _stamp(value):
    if not value:
        return ''
    if timezone.is_aware(value):
        value = timezone.localtime(value)
    return value.strftime('%Y-%m-%d %H:%M')


def _parse_month(request):
    """Return (year, month) from ?month=YYYY-MM or ?year=&month=; default is the current month."""
    raw_month = (request.query_params.get('month') or '').strip()
    raw_year = (request.query_params.get('year') or '').strip()
    today = timezone.localdate()

    if not raw_month and not raw_year:
        return today.year, today.month

    try:
        if '-' in raw_month:
            year_part, month_part = raw_month.split('-', 1)
            year, month = int(year_part), int(month_part)
        else:
            year = int(raw_year) if raw_year else today.year
            month = int(raw_month) if raw_month else today.month
    except (TypeError, ValueError):
        raise ValueError('Use month=YYYY-MM, for example 2025-03.')

    if not 1 <= month <= 12:
        raise ValueError('Month must be between 1 and 12.')
    if not 2000 <= year <= 2100:
        raise ValueError('Year must be between 2000 and 2100.')
    return year, month


class MonthlyReportView(APIView):
    """GET /api/reports/monthly/?month=YYYY-MM -> CSV of the month's appointments and bills."""

    permission_classes = [IsStaff]
    content_negotiation_class = CsvFriendlyNegotiation

    def get(self, request):
        try:
            year, month = _parse_month(request)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)

        tz = timezone.get_current_timezone()
        first_day = datetime(year, month, 1)
        last_day = datetime(year, month, monthrange(year, month)[1])
        start = timezone.make_aware(datetime.combine(first_day.date(), time.min), tz)
        end = timezone.make_aware(
            datetime.combine(last_day.date() + timedelta(days=1), time.min), tz
        )

        appointments = (
            Appointment.objects.filter(start_time__gte=start, start_time__lt=end)
            .select_related('patient', 'doctor', 'service')
            .order_by('start_time')
        )
        invoices = (
            Invoice.objects.filter(created_at__gte=start, created_at__lt=end)
            .select_related('user', 'appointment')
            .order_by('created_at')
        )

        paid_total = (
            invoices.filter(status='paid').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        )
        unpaid_total = (
            invoices.filter(status='unpaid').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        )

        filename = 'cedar-hollow-report-%04d-%02d.csv' % (year, month)
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="%s"' % filename
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'

        writer = csv.writer(response)
        writer.writerow(['Cedar Hollow Health - monthly report', '%04d-%02d' % (year, month)])
        writer.writerow(['Generated at', _stamp(timezone.now())])
        writer.writerow([])

        writer.writerow(['Summary'])
        writer.writerow(['Appointments', appointments.count()])
        for value, label in Appointment._meta.get_field('status').choices:
            writer.writerow(['  ' + str(label), appointments.filter(status=value).count()])
        writer.writerow(['Bills', invoices.count()])
        writer.writerow(['Paid total', '%.2f' % paid_total])
        writer.writerow(['Unpaid total', '%.2f' % unpaid_total])
        writer.writerow([])

        writer.writerow(['Appointments'])
        writer.writerow([
            'ID', 'Start', 'End', 'Patient', 'Doctor', 'Service',
            'Reason', 'Status', 'Checked in at', 'Booked by',
        ])
        for appt in appointments:
            writer.writerow([
                appt.id,
                _stamp(appt.start_time),
                _stamp(appt.end_time),
                _safe(_person(appt.patient)),
                _safe(_person(appt.doctor)),
                _safe(appt.service.name if appt.service else ''),
                _safe(appt.reason),
                appt.get_status_display(),
                _stamp(appt.checked_in_at),
                _safe(_person(appt.booked_by_id and appt.booked_by)),
            ])
        writer.writerow([])

        writer.writerow(['Bills'])
        writer.writerow([
            'ID', 'Created', 'Patient', 'Description', 'Appointment ID',
            'Amount', 'Status', 'Due date', 'Paid at',
        ])
        for invoice in invoices:
            writer.writerow([
                invoice.id,
                _stamp(invoice.created_at),
                _safe(_person(invoice.user)),
                _safe(invoice.description),
                invoice.appointment_id or '',
                '%.2f' % invoice.amount,
                invoice.get_status_display(),
                invoice.due_date.isoformat() if invoice.due_date else '',
                _stamp(invoice.paid_at),
            ])

        return response