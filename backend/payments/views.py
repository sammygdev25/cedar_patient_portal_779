"""api/payments/: hosted Stripe Checkout for one row of the signed-in user, the webhook that marks it paid, and the
reads the pay pages use. The same calls and reply shapes as the Express module, so the frontend files are shared; a
call may name a kind (a bill, a pharmacy order: order.py PAYABLES), and one that names none means the main kind.
Keys come from the environment only; with no STRIPE_SECRET_KEY these routes answer 503 and the rest of the app runs."""
import json
import logging
from importlib import import_module
from typing import Any, Optional

import stripe
from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .fulfill import on_order_paid
from .guard import payment_writer
from .models import StripeEvent
from .order import MAIN_KIND, PAID_STATUS, PAYABLES, amount, amount_cents, kind_model, label, owned

logger = logging.getLogger(__name__)
PAID_EVENTS = ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
UNAVAILABLE = {'error': 'Payments are not set up yet', 'code': 'payments_unavailable'}
BAD_KIND = {'error': 'This app takes no payment of that kind', 'code': 'validation_error'}


def _kind(value: Any) -> Optional[str]:
    """The kind a call names: the main kind when it names none; None for a kind the app does not charge."""
    text = str(value or '').strip()
    if not text:
        return MAIN_KIND
    return text if text in PAYABLES else None


def _positive_int(value: Any) -> Optional[int]:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value > 0 else None
    text = str(value or '').strip()
    return int(text) if text.isdigit() and int(text) > 0 else None


def _site_origin(request: Request) -> str:
    """Where Stripe sends the browser back: the request's origin when CORS allows it, else FRONTEND_URL, else this host."""
    origin = request.headers.get('Origin', '').rstrip('/')
    allowed = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False) or origin in getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
    if origin and allowed:
        return origin
    if settings.FRONTEND_URL:
        return settings.FRONTEND_URL.rstrip('/')
    return request.build_absolute_uri('/').rstrip('/')


def _open_session(order: Any) -> Optional[Any]:
    """The order's Checkout Session when it is still open, so a second click does not start a second charge."""
    if not order.stripe_session_id:
        return None
    try:
        session = stripe.checkout.Session.retrieve(order.stripe_session_id, api_key=settings.STRIPE_SECRET_KEY)
    except stripe.StripeError:
        return None
    return session if session['status'] == 'open' and session['amount_total'] == amount_cents(order) else None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkout(request: Request) -> Response:
    """POST {orderId, kind?}: a hosted Stripe Checkout Session for one unpaid row of the caller, for the amount as
    the database holds it."""
    if not settings.STRIPE_SECRET_KEY:
        return Response(UNAVAILABLE, status=503)
    kind = _kind(request.data.get('kind'))
    if kind is None:
        return Response(BAD_KIND, status=400)
    order_id = _positive_int(request.data.get('orderId'))
    if order_id is None:
        return Response({'error': 'orderId is required', 'code': 'validation_error'}, status=400)
    order = owned(request.user, kind).filter(pk=order_id).first()
    if order is None:
        return Response({'error': 'Order not found'}, status=404)
    if order.paid_at:
        return Response({'error': 'Already paid', 'code': 'already_paid'}, status=409)
    flow = PAYABLES[kind]['flow']
    refusal = import_module(flow).checkout_refusal(order) if flow else ''
    if refusal:
        return Response({'error': refusal, 'code': 'not_payable'}, status=409)
    cents = amount_cents(order)
    if cents < 50:
        return Response({'error': 'Amount too small to charge', 'code': 'amount_too_small'}, status=400)
    session = _open_session(order)
    if session is None:
        origin = _site_origin(request)
        try:
            session = stripe.checkout.Session.create(
                api_key=settings.STRIPE_SECRET_KEY,
                mode='payment',
                line_items=[{'quantity': 1, 'price_data': {
                    'currency': settings.STRIPE_CURRENCY, 'unit_amount': cents,
                    'product_data': {'name': '%s #%s' % (label(kind), order.pk)}}}],
                client_reference_id=str(order.pk),
                metadata={'orderId': str(order.pk), 'kind': kind},
                success_url=origin + '/payment-success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url='%s/payment-cancel?order=%s&kind=%s' % (origin, order.pk, kind),
            )
        except stripe.StripeError:
            logger.warning('checkout for %s %s failed at Stripe', kind, order.pk)
            return Response({'error': 'Could not start the payment', 'code': 'checkout_failed'}, status=502)
        with payment_writer():
            order.stripe_session_id = session['id']
            order.save(update_fields=['stripe_session_id'])
        logger.info('checkout session %s created for %s %s', session['id'], kind, order.pk)
    return Response({'url': session['url'], 'sessionId': session['id']})


def _mark_paid(session: Any) -> None:
    """A paid Checkout Session marks its row paid when the kind, the row, the session and the amount all match. The
    kind is read from the signed session only, never from the request: a session with none means the main kind."""
    if session.get('payment_status') != 'paid':
        return
    metadata = session.get('metadata') or {}
    kind = str(metadata.get('kind') or MAIN_KIND)
    if kind not in PAYABLES:
        logger.warning('session %s names a kind this app does not charge', session.get('id'))
        return
    order_id = _positive_int(metadata.get('orderId') or session.get('client_reference_id'))
    orders = kind_model(kind).objects.select_for_update()
    order = orders.filter(pk=order_id, stripe_session_id=session.get('id'), paid_at__isnull=True).first() if order_id else None
    if order is None:
        logger.info('session %s matches no unpaid %s', session.get('id'), kind)
        return
    currency = str(session.get('currency') or '').lower()
    if session.get('amount_total') != amount_cents(order) or currency != settings.STRIPE_CURRENCY.lower():
        logger.error('session %s paid another amount or currency than %s %s costs; left unpaid for review',
                     session.get('id'), kind, order.pk)
        return
    order.paid_at = timezone.now()
    fields = ['paid_at']
    status_field, paid_flag = PAYABLES[kind]['status'], PAYABLES[kind]['paid_flag']
    if status_field:
        setattr(order, status_field, PAID_STATUS)
        fields.append(status_field)
    if paid_flag:
        setattr(order, paid_flag, True)
        fields.append(paid_flag)
    order.save(update_fields=fields)
    if PAYABLES[kind]['flow']:
        import_module(PAYABLES[kind]['flow']).on_paid(order)
    on_order_paid(order)
    logger.info('%s %s paid by session %s', kind, order.pk, session.get('id'))


@csrf_exempt
@require_POST
def webhook(request: HttpRequest) -> JsonResponse:
    """Stripe calls this. The signature on the raw body is checked first. The event id is written in the same
    transaction as its effect, so a replayed event changes nothing; a failed effect rolls both back and Stripe retries."""
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        return JsonResponse({'error': 'Webhook is not set up yet', 'code': 'payments_unavailable'}, status=503)
    signature = request.headers.get('Stripe-Signature', '')
    if not signature:
        return JsonResponse({'error': 'Missing signature', 'code': 'bad_signature'}, status=400)
    try:
        stripe.Webhook.construct_event(request.body, signature, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError):
        logger.warning('webhook signature rejected')
        return JsonResponse({'error': 'Invalid signature', 'code': 'bad_signature'}, status=400)
    # Read from the verified body as plain JSON: Stripe's objects stopped being dicts in later versions.
    event = json.loads(request.body)
    event_id, kind = event['id'], event['type']
    try:
        with transaction.atomic(), payment_writer():
            try:
                with transaction.atomic():
                    StripeEvent.objects.create(event_id=event_id, type=kind)
            except IntegrityError:
                logger.info('event %s already applied', event_id)
                return JsonResponse({'received': True})
            if kind in PAID_EVENTS:
                _mark_paid(event['data']['object'])
    except Exception:
        logger.exception('event %s failed', event_id)
        return JsonResponse({'error': 'Fulfillment failed', 'code': 'fulfillment_failed'}, status=500)
    return JsonResponse({'received': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def status(request: Request) -> Response:
    """GET ?session_id=: the success page asks whether the webhook has marked the row paid; a Stripe session id is
    never reused, so every kind of the caller is looked at."""
    session_id = str(request.query_params.get('session_id') or '')
    if not session_id:
        return Response({'error': 'session_id is required', 'code': 'validation_error'}, status=400)
    for kind in PAYABLES:
        order = owned(request.user, kind).filter(stripe_session_id=session_id).first()
        if order is not None:
            return Response({'orderId': order.pk, 'paid': bool(order.paid_at)})
    return Response({'error': 'Order not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order(request: Request) -> Response:
    """GET ?order=<id>&kind=: the pay page reads one row of the caller, its amount and whether it is paid."""
    kind = _kind(request.query_params.get('kind'))
    if kind is None:
        return Response(BAD_KIND, status=400)
    order_id = _positive_int(request.query_params.get('order'))
    if order_id is None:
        return Response({'error': 'order is required', 'code': 'validation_error'}, status=400)
    row = owned(request.user, kind).filter(pk=order_id).first()
    if row is None:
        return Response({'error': 'Order not found'}, status=404)
    return Response({'id': row.pk, 'amount': float(amount(row)), 'paid': bool(row.paid_at), 'kind': kind,
                     'label': label(kind)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unpaid(request: Request) -> Response:
    """GET: the caller's rows not yet paid, the main kind first and each kind newest first, for the notice above
    every page."""
    out = []
    for kind in PAYABLES:
        rows = owned(request.user, kind).filter(paid_at__isnull=True).order_by('-pk')[:5]
        out += [{'id': row.pk, 'amount': float(amount(row)), 'kind': kind, 'label': label(kind)} for row in rows]
    return Response(out)
