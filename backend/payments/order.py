"""The models the payments module charges, written by the scaffold from the plan (PX.300). Each kind names its
model, the link to the user that owns a row (the plan's role table, api/access.py OWNERS), the amount, the status
set to PAID_STATUS with paid_at and the plan's own paid flag (each empty when the model has none), and the order
flow module that owns the kind's status and stock ('' when none: api/order_flow.py moves the order and takes the
stock in on_paid, and says in checkout_refusal why an order cannot be paid now). The main kind is the order-like
model the order flow uses; a call that names no kind means the main kind."""
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Dict

from django.apps import apps
from django.db import models
from django.utils.text import capfirst

PAYABLES: Dict[str, Dict[str, str]] = {
    'order': {'model': 'api.Order', 'amount': 'total_amount', 'owner': 'user', 'status': '', 'paid_flag': '', 'flow': 'api.order_flow'},
    'invoice': {'model': 'api.Invoice', 'amount': 'amount', 'owner': 'user', 'status': 'status', 'paid_flag': '', 'flow': ''},
}
MAIN_KIND = 'order'
PAID_STATUS = 'paid'
# The main kind's names, for the order flow, the app's tests and the access probe.
ORDER_MODEL = PAYABLES[MAIN_KIND]['model']
AMOUNT_FIELD = PAYABLES[MAIN_KIND]['amount']
OWNER_FIELD = PAYABLES[MAIN_KIND]['owner']
STATUS_FIELD = PAYABLES[MAIN_KIND]['status']
PAID_FLAG = PAYABLES[MAIN_KIND]['paid_flag']


def kind_model(kind: str) -> type[models.Model]:
    return apps.get_model(PAYABLES[kind]['model'])


def order_model() -> type[models.Model]:
    return kind_model(MAIN_KIND)


def kind_of(model: Any) -> str:
    """The kind a model class is charged as; empty when the module does not charge it."""
    for kind in PAYABLES:
        if kind_model(kind) is model:
            return kind
    return ''


def label(kind: str) -> str:
    """What the pages call a row of this kind, from the model: Bill, Pharmacy order."""
    return str(capfirst(kind_model(kind)._meta.verbose_name))


def owned(user: Any, kind: str = MAIN_KIND) -> models.QuerySet:
    """The rows of one kind the signed-in user may pay or read the payment of."""
    return kind_model(kind).objects.filter(**{PAYABLES[kind]['owner']: user})


def amount(row: models.Model) -> Decimal:
    return Decimal(str(getattr(row, PAYABLES[kind_of(type(row))]['amount']) or 0))


def amount_cents(row: models.Model) -> int:
    """What Stripe charges, in the currency's smallest unit."""
    return int((amount(row) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
