"""Orders, written by Shikshya from the plan. The server prices every order: a line names an item and a quantity, or
one of the customer's own source records (a prescription) whose linked item it is, the price is read from the item,
the total is the sum of price times quantity, and nothing a request sends sets a price, a total, the owner, a paid
mark or the status. Who reaches an order comes from the plan's access table (api/access.py).

The status follows the plan's steps and this file is its only writer: the first step means unpaid, and when the app
takes payment only a verified payment moves an order to the next one (on_paid, called by the payments app); a staff
role that runs the orders then moves it one step forward at a time, never back; the approval step of an order that
carries a source record is taken only by that record's own staff author (the prescribing doctor). The customer
cancels an unpaid order; staff cancel a paid one, which stays marked paid (the refund is done in Stripe). Stock is
taken in the same step as the payment and given back when a paid order is cancelled or rejected: an unpaid order
holds none. Lines are written with their order only: the line route reads, it never writes."""
import logging
import re
from contextlib import contextmanager
from contextvars import ContextVar
from decimal import Decimal
from typing import Any, Dict, Iterator, List, Optional, Tuple

from django.apps import apps
from django.core.exceptions import PermissionDenied as ModelPermissionDenied
from django.db import models, transaction
from django.db.models import F, Q
from django.db.models.signals import pre_save
from django.utils import timezone
from rest_framework import mixins, permissions, serializers, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from api.access import OWNERS, STAFF_ROLES, SUPERUSER, AccessPermission, level_for, role_of, scope

logger = logging.getLogger(__name__)

ORDER_MODEL = 'api.Order'
LINE_MODEL = 'api.OrderItem'
OWNER_FIELD = 'user'
AMOUNT_FIELD = 'total_amount'
STATUS_FIELD = 'status'
LINES = 'items'
LINE_ORDER = 'order'
LINE_ITEM = 'product'
QUANTITY = 'quantity'
LINE_PRICE = 'unit_price'
LINE_LABEL = 'medicine_name'
ITEM_PRICE = 'price'
ITEM_LABEL = 'name'
ITEM_FLAG = 'is_prescription_only'
STOCK_FIELD = 'stock_quantity'
STOCK_TAKEN = 'stock_taken'
PAID_FLAG = ''
# The status steps in plan order: the first is unpaid, PAID_STEP ('' when the app takes no payment) only a payment
# sets, APPROVAL_STEP ('' when none) only the source record's author takes. The two exits leave the steps.
STEPS = ('pending_payment', 'received', 'approved', 'packed', 'out_for_delivery', 'delivered')
PAID_STEP = 'received'
APPROVAL_STEP = 'approved'
CANCELLED = 'cancelled'
REJECTED = 'rejected'
APPROVED_BY = ''
APPROVED_AT = ''
# The record a customer orders from (a prescription): the link to it on the order or on a line, and its item.
SOURCE_MODEL = 'api.Prescription'
SOURCE_LINK = 'prescription'
SOURCE_ON = 'line'
SOURCE_ITEM = 'product'
SOURCE_QUANTITY = ''
# Set only by the payments app's verified webhook.
PAYMENT_FIELDS = ('paid_at', 'stripe_session_id')
ITEMS_KEY = 'items'
MAX_QUANTITY = 99
MAX_LINES = 100
EXITS = tuple(s for s in (CANCELLED, REJECTED) if s)
# The names the plan's access table (api/access.py) knows the models by.
ORDER_NAME = ORDER_MODEL.rsplit('.', 1)[-1]
LINE_NAME = LINE_MODEL.rsplit('.', 1)[-1]
SOURCE_NAME = SOURCE_MODEL.rsplit('.', 1)[-1] if SOURCE_MODEL else ''
REFUSED = 'An order changes status through the order routes only.'
_STEPPING: ContextVar[bool] = ContextVar('order_flow_stepping', default=False)


def order_model() -> type:
    return apps.get_model(ORDER_MODEL)


def line_model() -> type:
    return apps.get_model(LINE_MODEL)


def item_model() -> type:
    return line_model()._meta.get_field(LINE_ITEM).related_model


def source_model() -> Optional[type]:
    return apps.get_model(SOURCE_MODEL) if SOURCE_MODEL else None


def _field_names(model: type) -> List[str]:
    return [f.name for f in model._meta.concrete_fields]


def _auto_dates(model: type) -> List[str]:
    return [f.name for f in model._meta.concrete_fields
            if getattr(f, 'auto_now', False) or getattr(f, 'auto_now_add', False)]


def _touched(model: type) -> List[str]:
    """The fields a save refreshes on its own (auto_now), kept in update_fields so they stay current."""
    return [f.name for f in model._meta.concrete_fields if getattr(f, 'auto_now', False)]


def locked_order_fields() -> Tuple[str, ...]:
    """The order's fields no request writes: the owner, the money, the status, the paid mark, the approval, the stock
    mark, the timestamps."""
    names = set(_field_names(order_model()))
    locked = {OWNER_FIELD, AMOUNT_FIELD, STATUS_FIELD, PAID_FLAG, APPROVED_BY, APPROVED_AT, STOCK_TAKEN,
              *PAYMENT_FIELDS, *_auto_dates(order_model())}
    return tuple(sorted((locked - {''}) & names))


@contextmanager
def stepping() -> Iterator[None]:
    """This file's context: inside it an order's status may change."""
    token = _STEPPING.set(True)
    try:
        yield
    finally:
        _STEPPING.reset(token)


def refuse_status_outside_flow(sender: type, instance: models.Model, raw: bool = False, update_fields: Any = None,
                               **kwargs: Any) -> None:
    """One owner of the status: a save that changes it outside this file (a view, a serializer, the admin, a shell)
    is refused with a 403. A new order starts at the first step; fixture loads pass (the seed is the developer's)."""
    if raw or _STEPPING.get() or not STATUS_FIELD:
        return
    if update_fields is not None and STATUS_FIELD not in update_fields:
        return
    now = getattr(instance, STATUS_FIELD)
    if instance.pk is None or not sender._default_manager.filter(pk=instance.pk).exists():
        if now not in ('', None, STEPS[0]):
            raise ModelPermissionDenied(REFUSED)
        return
    before = sender._default_manager.filter(pk=instance.pk).values_list(STATUS_FIELD, flat=True).first()
    if before != now:
        raise ModelPermissionDenied(REFUSED)


pre_save.connect(refuse_status_outside_flow, sender=ORDER_MODEL, dispatch_uid='order_flow.refuse_status')


def is_paid(order: models.Model) -> bool:
    if getattr(order, 'paid_at', None):
        return True
    return bool(getattr(order, PAID_FLAG)) if PAID_FLAG else False


def _source_ids(order: models.Model) -> List[Any]:
    """The source records an order carries: the order's own link, or its lines' links."""
    if not SOURCE_MODEL:
        return []
    if SOURCE_ON == 'order':
        found = getattr(order, SOURCE_LINK + '_id', None)
        return [found] if found is not None else []
    ids = getattr(order, LINES).exclude(**{SOURCE_LINK: None}).values_list(SOURCE_LINK, flat=True)
    return sorted(set(ids))


def steps_of(order: models.Model) -> Tuple[str, ...]:
    """The steps this order takes: the approval step only when it carries a source record."""
    if APPROVAL_STEP and not _source_ids(order):
        return tuple(s for s in STEPS if s != APPROVAL_STEP)
    return STEPS


def _owner_paths(model: str, role: str) -> Tuple[str, ...]:
    return tuple(OWNERS.get(model, {}).get(role, ()))


def _owned(user: Any, model: type, name: str, role: str) -> models.QuerySet:
    """The rows of a model that are this user's own for this role, by the access table's owner links."""
    mine: Optional[Q] = None
    for path in _owner_paths(name, role):
        mine = Q(**{path: user}) if mine is None else mine | Q(**{path: user})
    return model._default_manager.filter(mine) if mine is not None else model._default_manager.none()


def approver_roles() -> Tuple[str, ...]:
    """The staff roles that author a source record (the doctor of a prescription), from the access table."""
    return tuple(r for r in STAFF_ROLES if _owner_paths(SOURCE_NAME, r)) if SOURCE_NAME else ()


def approves(user: Any, order: models.Model) -> bool:
    """True when the user authored every source record of the order: the one who takes its approval step."""
    ids = _source_ids(order)
    role = role_of(user)
    if not ids or role not in approver_roles():
        return False
    return _owned(user, source_model(), SOURCE_NAME, role).filter(pk__in=ids).count() == len(ids)


def runs_orders(user: Any, order: models.Model) -> bool:
    """A staff role that may change this order by the plan's access table (the desk): it moves the steps."""
    if role_of(user) not in STAFF_ROLES + (SUPERUSER,):
        return False
    if level_for(user, ORDER_NAME) == 'manage':
        return True
    return scope(user, ORDER_NAME, order_model().objects.filter(pk=order.pk), True).exists()


def _owns(user: Any, order: models.Model) -> bool:
    return getattr(user, 'pk', None) is not None and getattr(order, OWNER_FIELD + '_id', None) == user.pk


def _label(value: str) -> str:
    """A name as a page says it: out_for_delivery is 'out for delivery', PharmacyOrder 'pharmacy order'."""
    return re.sub(r'(?<=[a-z0-9])(?=[A-Z])', ' ', value).replace('_', ' ').lower()


def _price(item: models.Model) -> Decimal:
    return Decimal(str(getattr(item, ITEM_PRICE) or 0))


def refusal(user: Any, order: models.Model, target: Any) -> Optional[Tuple[int, str]]:
    """Why this user may not move this order to the target status, as (HTTP status, message); None when they may."""
    current = getattr(order, STATUS_FIELD)
    steps = steps_of(order)
    mine, desk, author = _owns(user, order), runs_orders(user, order), approves(user, order)
    if not (mine or desk or author):
        return 403, 'You cannot change this order.'
    if not isinstance(target, str) or target not in STEPS + EXITS:
        return 400, 'Choose one of: ' + ', '.join(STEPS + EXITS)
    if current in EXITS or current == steps[-1]:
        return 400, 'This order is %s and does not change any more.' % _label(current)
    if target == CANCELLED:
        if desk:
            return None
        if not mine:
            return 403, 'Only the customer or the staff who run the orders cancel an order.'
        if current == STEPS[0] and not is_paid(order):
            return None
        return 403, 'A paid order is cancelled by the staff, who refund the payment.'
    if current not in steps:
        return 400, 'This order is at %s, which is not one of its steps.' % _label(current)
    following = steps[steps.index(current) + 1]
    if target == REJECTED:
        if author and following == APPROVAL_STEP:
            return None
        if not SOURCE_NAME:
            return 400, 'This order has no approval step to reject at.'
        return 403, 'Only the author of its %s rejects this order, before it is approved.' % _label(SOURCE_NAME)
    if not desk and not author:
        return 403, 'Only the staff who run the orders move this order.'
    if target != following:
        return 400, 'The next step for this order is %s.' % _label(following)
    if PAID_STEP and target == PAID_STEP:
        return 400, 'Only a payment moves an order to %s.' % _label(PAID_STEP)
    if target == APPROVAL_STEP and not author:
        return 403, 'Only the author of its %s approves this order.' % _label(SOURCE_NAME)
    if target != APPROVAL_STEP and not desk:
        return 403, 'Only the staff who run the orders move this order.'
    if PAID_STEP and not is_paid(order):
        return 400, 'This order is not paid yet.'
    return None


def allowed_steps(user: Any, order: models.Model) -> List[str]:
    """The statuses this user may move this order to now, for the page's buttons."""
    if not STATUS_FIELD:
        return []
    return [s for s in STEPS + EXITS if refusal(user, order, s) is None]


def _needed(order: models.Model) -> Dict[Any, int]:
    """How many of each item the order's lines take."""
    out: Dict[Any, int] = {}
    for item_id, quantity in getattr(order, LINES).values_list(LINE_ITEM, QUANTITY):
        if item_id is not None:
            out[item_id] = out.get(item_id, 0) + int(quantity or 0)
    return out


def short_items(order: models.Model, lock: bool = False) -> List[str]:
    """The items the order needs more of than the stock holds; lock=True locks their rows first."""
    if not STOCK_FIELD:
        return []
    needed = _needed(order)
    rows = item_model().objects.filter(pk__in=list(needed)).order_by('pk')
    if lock:
        rows = rows.select_for_update(of=('self',))
    short = []
    for row in rows:
        if int(getattr(row, STOCK_FIELD) or 0) < needed[row.pk]:
            short.append(str(getattr(row, ITEM_LABEL)) if ITEM_LABEL else str(row.pk))
    return short


def _take_stock(order: models.Model) -> bool:
    """Take the order's items from stock, in the caller's transaction; False (nothing taken) when one is short."""
    if not STOCK_FIELD or not STOCK_TAKEN or getattr(order, STOCK_TAKEN):
        return False
    if short_items(order, lock=True):
        return False
    for item_id, quantity in _needed(order).items():
        item_model().objects.filter(pk=item_id).update(**{STOCK_FIELD: F(STOCK_FIELD) - quantity})
    setattr(order, STOCK_TAKEN, True)
    return True


def _give_back(order: models.Model) -> bool:
    """Put back what the order took, once, in the caller's transaction."""
    if not STOCK_FIELD or not STOCK_TAKEN or not getattr(order, STOCK_TAKEN):
        return False
    needed = _needed(order)
    list(item_model().objects.select_for_update(of=('self',)).filter(pk__in=list(needed)).order_by('pk'))
    for item_id, quantity in needed.items():
        item_model().objects.filter(pk=item_id).update(**{STOCK_FIELD: F(STOCK_FIELD) + quantity})
    setattr(order, STOCK_TAKEN, False)
    return True


def stock_short(order: models.Model) -> bool:
    """A paid order whose items could not be taken from stock: the desk sees a warning, cancels and refunds it."""
    if not STOCK_TAKEN or not is_paid(order) or getattr(order, STOCK_TAKEN):
        return False
    return getattr(order, STATUS_FIELD) not in EXITS if STATUS_FIELD else True


def move(user: Any, order: models.Model, target: str) -> models.Model:
    """Move an order to the target status for this user, or raise why not. The row is locked and checked again."""
    with transaction.atomic(), stepping():
        locked = order_model().objects.select_for_update(of=('self',)).get(pk=order.pk)
        why = refusal(user, locked, target)
        if why is not None:
            raise (PermissionDenied if why[0] == 403 else ValidationError)({STATUS_FIELD: why[1]})
        fields = [STATUS_FIELD]
        if target == APPROVAL_STEP:
            if APPROVED_BY:
                setattr(locked, APPROVED_BY, user)
                fields.append(APPROVED_BY)
            if APPROVED_AT:
                setattr(locked, APPROVED_AT, timezone.now())
                fields.append(APPROVED_AT)
        if target in EXITS and _give_back(locked):
            fields.append(STOCK_TAKEN)
        setattr(locked, STATUS_FIELD, target)
        locked.save(update_fields=fields + _touched(order_model()))
    logger.info('order %s moved to %s', locked.pk, target)
    return locked


def checkout_refusal(order: models.Model) -> str:
    """Why this order cannot be paid now ('' when it can): it left the unpaid step, or the stock is short."""
    if STATUS_FIELD and getattr(order, STATUS_FIELD) != STEPS[0]:
        return 'This order is %s and cannot be paid.' % _label(getattr(order, STATUS_FIELD))
    short = short_items(order)
    if short:
        return 'Out of stock: %s.' % ', '.join(short)
    return ''


def on_paid(order: models.Model) -> None:
    """Called by the payments app's verified webhook, in its transaction, once per order: the order moves to the
    paid step (one cancelled meanwhile stays cancelled, marked paid, for the staff to refund) and its items leave the
    stock. When an item ran out since checkout the order stays paid and the desk sees stock_short."""
    with stepping():
        locked = order_model().objects.select_for_update(of=('self',)).get(pk=order.pk)
        fields: List[str] = []
        current = getattr(locked, STATUS_FIELD) if STATUS_FIELD else ''
        if STATUS_FIELD and PAID_STEP and current == STEPS[0]:
            setattr(locked, STATUS_FIELD, PAID_STEP)
            fields.append(STATUS_FIELD)
        if current not in EXITS and _take_stock(locked):
            fields.append(STOCK_TAKEN)
        elif STOCK_TAKEN and current not in EXITS and not getattr(locked, STOCK_TAKEN):
            logger.warning('order %s paid with an item out of stock; the desk is shown stock_short', locked.pk)
        if fields:
            locked.save(update_fields=fields + _touched(order_model()))


class OrderLineSerializer(serializers.ModelSerializer):
    """One line: the item and the quantity are written (or a source record, when lines carry one); the price, the
    label and the order are the server's."""

    class Meta:
        model = line_model()
        fields = '__all__'
        read_only_fields = tuple(n for n in _field_names(line_model())
                                 if n not in (LINE_ITEM, QUANTITY) + ((SOURCE_LINK,) if SOURCE_ON == 'line' else ()))
        extra_kwargs = {QUANTITY: {'min_value': 1, 'max_value': MAX_QUANTITY, 'required': SOURCE_ON != 'line'},
                        LINE_ITEM: {'required': SOURCE_ON != 'line', 'allow_null': SOURCE_ON == 'line'}}

    def get_fields(self) -> Dict[str, serializers.Field]:
        fields = super().get_fields()
        if SOURCE_ON == 'line':
            fields[SOURCE_LINK] = serializers.PrimaryKeyRelatedField(queryset=_own_sources(self), required=False,
                                                                     allow_null=True)
        if ITEM_LABEL:
            fields[LINE_ITEM + '_' + ITEM_LABEL] = serializers.CharField(source=LINE_ITEM + '.' + ITEM_LABEL,
                                                                         read_only=True, default=None)
        fields[LINE_ITEM + '_price'] = serializers.DecimalField(source=LINE_ITEM + '.' + ITEM_PRICE, max_digits=12,
                                                                decimal_places=2, read_only=True, default=None)
        return fields


def _own_sources(serializer: serializers.Serializer) -> models.QuerySet:
    """The source records the signed-in customer may order from: their own, by the access table. Another person's
    record answers the same as one that does not exist."""
    model = source_model()
    request = serializer.context.get('request')
    user = getattr(request, 'user', None)
    if user is None:
        return model._default_manager.none()
    return _owned(user, model, SOURCE_NAME, role_of(user))


class OrderSerializer(serializers.ModelSerializer):
    """An order with its lines. Created with its lines in one request; the total is computed here. It reads back with
    the statuses the caller may move it to and, for the desk, whether its stock ran short after payment."""

    class Meta:
        model = order_model()
        fields = '__all__'
        read_only_fields = locked_order_fields()

    def get_fields(self) -> Dict[str, serializers.Field]:
        fields = super().get_fields()
        options = {} if LINES == ITEMS_KEY else {'source': LINES}
        fields[ITEMS_KEY] = OrderLineSerializer(many=True, required=False, **options)
        if SOURCE_ON == 'order':
            fields[SOURCE_LINK] = serializers.PrimaryKeyRelatedField(queryset=_own_sources(self), required=False,
                                                                     allow_null=True)
        if not PAID_FLAG and 'paid_at' in fields:
            fields['is_paid'] = serializers.SerializerMethodField()
        fields['allowed_steps'] = serializers.SerializerMethodField()
        if STOCK_TAKEN:
            fields['stock_short'] = serializers.SerializerMethodField()
        return fields

    def get_is_paid(self, order: models.Model) -> bool:
        return bool(getattr(order, 'paid_at', None))

    def get_allowed_steps(self, order: models.Model) -> List[str]:
        request = self.context.get('request')
        return allowed_steps(request.user, order) if request is not None else []

    def get_stock_short(self, order: models.Model) -> bool:
        return stock_short(order)

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        lines = attrs.get(LINES) or []
        source = attrs.get(SOURCE_LINK) if SOURCE_ON == 'order' and SOURCE_LINK else None
        if self.instance is None and not lines and source is None:
            raise ValidationError({ITEMS_KEY: 'An order needs at least one item.'})
        if len(lines) > MAX_LINES:
            raise ValidationError({ITEMS_KEY: 'An order takes at most %d lines.' % MAX_LINES})
        for line in lines:
            if SOURCE_ON == 'line' and line.get(SOURCE_LINK) is not None:
                continue
            item = line.get(LINE_ITEM)
            if item is None:
                raise ValidationError({ITEMS_KEY: 'Each line names an item or one of your %s records.'
                                       % _label(SOURCE_NAME)})
            if ITEM_FLAG and getattr(item, ITEM_FLAG, False):
                raise ValidationError({ITEMS_KEY: '%s is ordered from a %s only.'
                                       % (getattr(item, ITEM_LABEL) if ITEM_LABEL else item.pk,
                                          _label(SOURCE_NAME))})
            if QUANTITY not in line:
                raise ValidationError({ITEMS_KEY: 'Each item needs a quantity.'})
        for record in ([source] if source is not None else []) + [l[SOURCE_LINK] for l in lines
                                                                  if SOURCE_ON == 'line' and l.get(SOURCE_LINK)]:
            if getattr(record, SOURCE_ITEM + '_id', None) is None:
                raise ValidationError({SOURCE_LINK: 'This %s has no item in the shop yet; ask the staff.'
                                       % _label(SOURCE_NAME)})
        return attrs

    @staticmethod
    def _from_source(record: Any) -> Tuple[Any, Any, int]:
        quantity = min(int(getattr(record, SOURCE_QUANTITY) or 1), MAX_QUANTITY) if SOURCE_QUANTITY else 1
        return record, getattr(record, SOURCE_ITEM), quantity

    def _wanted(self, lines: List[Dict[str, Any]], source: Any) -> List[Tuple[Any, Any, int]]:
        """(source record or None, item, quantity) for each line the order gets, in request order."""
        out = []
        for line in lines:
            record = line.get(SOURCE_LINK) if SOURCE_ON == 'line' else None
            plain = (None, line.get(LINE_ITEM), int(line.get(QUANTITY) or 1))
            out.append(self._from_source(record) if record is not None else plain)
        if source is not None:
            out.append(self._from_source(source))
        return out

    @transaction.atomic
    def create(self, validated_data: Dict[str, Any]) -> models.Model:
        lines = validated_data.pop(LINES, None) or []
        source = validated_data.get(SOURCE_LINK) if SOURCE_ON == 'order' else None
        wanted = self._wanted(lines, source)
        validated_data[AMOUNT_FIELD] = sum((_price(item) * quantity for _, item, quantity in wanted), Decimal('0'))
        if STATUS_FIELD:
            validated_data[STATUS_FIELD] = STEPS[0]
        order = order_model().objects.create(**validated_data)
        size = line_model()._meta.get_field(LINE_LABEL).max_length if LINE_LABEL else None
        for record, item, quantity in wanted:
            row = {LINE_ORDER: order, LINE_ITEM: item, QUANTITY: quantity}
            if LINE_PRICE:
                row[LINE_PRICE] = _price(item)
            if LINE_LABEL and ITEM_LABEL:
                row[LINE_LABEL] = str(getattr(item, ITEM_LABEL))[:size]
            if record is not None and SOURCE_ON == 'line':
                row[SOURCE_LINK] = record
            line_model().objects.create(**row)
        return order

    def update(self, instance: models.Model, validated_data: Dict[str, Any]) -> models.Model:
        raise PermissionDenied('An order changes through its status only.')


class OrderAccess(AccessPermission):
    """The plan's access table on the order routes. A method a route does not have keeps its 405 (no order is deleted
    through the API). A status change is asked of every caller who may read the order: the steps decide (refusal)."""

    def has_permission(self, request: Request, view: Any) -> bool:
        action = getattr(view, 'action', None)
        if action is None:
            return True
        if action in ('update', 'partial_update'):
            return bool(request.user and request.user.is_authenticated)
        return super().has_permission(request, view)

    def has_object_permission(self, request: Request, view: Any, obj: Any) -> bool:
        if getattr(view, 'action', None) in ('update', 'partial_update'):
            return True
        return super().has_object_permission(request, view, obj)


class OrderFlowViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                       viewsets.GenericViewSet):
    """Customers place and read their own orders; another user's order answers 404. A role reads the orders the
    plan's access table gives it (api/access.py). PATCH or PUT with a status moves an order by its steps (refusal
    says who may take which). No order is deleted through the API."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, OrderAccess]
    access_model = ORDER_NAME
    owner_field = OWNER_FIELD

    def get_queryset(self) -> models.QuerySet:
        rows = scope(self.request.user, ORDER_NAME, order_model().objects.all())
        rows = rows.prefetch_related(LINES).order_by('-pk')
        wanted = self.request.query_params.get(STATUS_FIELD) if STATUS_FIELD else None
        if wanted:
            rows = rows.filter(**{STATUS_FIELD: wanted})
        return rows

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        serializer.save(**{OWNER_FIELD: self.request.user})

    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """A status change (PATCH or PUT with a status); every other key is ignored."""
        order = self.get_object()
        if not STATUS_FIELD:
            raise PermissionDenied('This order has no status to change.')
        moved = move(request.user, order, request.data.get(STATUS_FIELD))
        return Response(self.get_serializer(moved).data)

    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return self.update(request, *args, **kwargs)


class OrderLineReadViewSet(viewsets.ReadOnlyModelViewSet):
    """Lines read on their own: the lines the plan's access table gives the caller (their own orders' lines, every
    line for a role that reads them all). Lines are never written here."""
    serializer_class = OrderLineSerializer
    permission_classes = [permissions.IsAuthenticated, OrderAccess]
    access_model = LINE_NAME

    def get_queryset(self) -> models.QuerySet:
        return scope(self.request.user, LINE_NAME, line_model().objects.all()).order_by('pk')


# The plan's own names for these classes, so code that imports them from here finds them.
OrderItemSerializer = OrderLineSerializer
OrderViewSet = OrderFlowViewSet
OrderItemViewSet = OrderLineReadViewSet
