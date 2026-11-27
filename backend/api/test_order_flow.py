"""The order flow's own tests, written by Shikshya with the app: the server prices an order, a request never sets the
money, the owner, the status or a paid mark, a customer reaches only their own orders, the status follows the plan's
steps (one forward at a time, a payment past the unpaid step, the approval by the source record's author), stock
leaves with the payment and comes back with a cancel. Run with: python manage.py test api"""
import datetime
from contextlib import nullcontext
from decimal import Decimal
from typing import Any

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied as ModelPermissionDenied
from django.db import models, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from api.order_flow import (AMOUNT_FIELD, APPROVAL_STEP, CANCELLED, ITEM_FLAG, ITEM_PRICE, ITEMS_KEY, LINE_ITEM,
                            LINE_PRICE, LINES, OWNER_FIELD, PAID_FLAG, PAID_STEP, ORDER_NAME, QUANTITY, REJECTED,
                            SOURCE_ITEM, SOURCE_LINK, SOURCE_NAME, SOURCE_ON, STATUS_FIELD, STEPS, STOCK_FIELD,
                            STOCK_TAKEN, OrderFlowViewSet, OrderLineReadViewSet, OrderSerializer, approver_roles,
                            checkout_refusal, line_model, on_paid, order_model, source_model)
from api.access import ACCESS, DEFAULT_ROLE, OWNERS, ROLE_FIELD, STAFF_ROLES
from api.permissions import IsStaffOrReadOnly, is_staff_user

LIST = OrderFlowViewSet.as_view({'get': 'list', 'post': 'create'})
DETAIL = OrderFlowViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update'})
_SEQ = [0]


def _value(field: models.Field) -> Any:
    """A valid value for a required field of a row the test needs."""
    _SEQ[0] += 1
    if field.choices:
        return field.choices[0][0]
    if isinstance(field, (models.ForeignKey, models.OneToOneField)):
        return _row(field.related_model)
    if isinstance(field, models.EmailField):
        return 'row%d@example.com' % _SEQ[0]
    if isinstance(field, (models.CharField, models.TextField, models.SlugField, models.URLField)):
        return 'row%d' % _SEQ[0]
    if isinstance(field, models.DecimalField):
        return Decimal('4.75')
    if isinstance(field, models.FloatField):
        return 4.75
    if isinstance(field, models.IntegerField):
        return 1
    if isinstance(field, models.BooleanField):
        return False
    if isinstance(field, models.DateTimeField):
        return timezone.now()
    if isinstance(field, models.DateField):
        return datetime.date.today()
    if isinstance(field, models.TimeField):
        return datetime.time(12, 0)
    return ''


def _row(model: type, **given: Any) -> models.Model:
    """A saved row of any model: the given values, then a value for every required field without a default."""
    if model is get_user_model():
        _SEQ[0] += 1
        return model.objects.create_user(username='user%d' % _SEQ[0], password='Unused-pass-123')
    data = dict(given)
    for field in model._meta.concrete_fields:
        if field.primary_key or field.name in data or field.null or field.has_default():
            continue
        if getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False):
            continue
        data[field.name] = _value(field)
    return model.objects.create(**data)


def _user(role: str = '') -> Any:
    user = _row(get_user_model())
    if role and ROLE_FIELD:
        setattr(user, ROLE_FIELD, role)
        user.save()
    return user


def _staff() -> Any:
    """A user who runs the orders: a staff role the plan's access table lets manage them, or a staff user."""
    managers = [r for r in STAFF_ROLES if ACCESS.get(ORDER_NAME, {}).get(r) == 'manage']
    if ROLE_FIELD and managers:
        return _user(managers[0])
    user = _user()
    user.is_staff = True
    user.save()
    return user


def _json(value: Any) -> Any:
    """A value as the browser sends it."""
    if isinstance(value, models.Model):
        return value.pk
    if isinstance(value, Decimal):
        return str(value)
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return value


def _order_fields() -> dict:
    """A value for every field the order form must send besides its lines (an address, a phone)."""
    data = {}
    for name, field in OrderSerializer().fields.items():
        if name == ITEMS_KEY or field.read_only or not field.required:
            continue
        data[name] = _json(_value(order_model()._meta.get_field(field.source)))
    return data


def _payment_writer() -> Any:
    """The payments app's context, when the app takes payment: inside it a payment may be recorded."""
    if django_apps.is_installed('payments'):
        from payments.guard import payment_writer
        return payment_writer()
    return nullcontext()


def _pay(order_id: Any) -> Any:
    """What the payments webhook does for a verified payment: the paid mark, then the flow's on_paid."""
    with transaction.atomic(), _payment_writer():
        marks = {'paid_at': timezone.now()} if 'paid_at' in [f.name for f in order_model()._meta.fields] else {}
        if PAID_FLAG:
            marks[PAID_FLAG] = True
        order_model().objects.filter(pk=order_id).update(**marks)
        on_paid(order_model().objects.get(pk=order_id))
    return order_model().objects.get(pk=order_id)


class OrderFlowTests(TestCase):
    def setUp(self) -> None:
        self.factory = APIRequestFactory()
        self.customer = _user()
        self.other = _user()
        self.staff = _staff()
        values = {ITEM_PRICE: Decimal('4.75')}
        if STOCK_FIELD:
            values[STOCK_FIELD] = 10
        self.item = _row(line_model()._meta.get_field(LINE_ITEM).related_model, **values)

    def _call(self, view: Any, method: str, user: Any, data: Any = None, pk: Any = None) -> Any:
        request = getattr(self.factory, method)('/orders/', data or {}, format='json')
        if user is not None:
            force_authenticate(request, user=user)
        return view(request, pk=pk) if pk is not None else view(request)

    def _place(self, who: Any, quantity: int = 1, extra: Any = None, item: Any = None) -> Any:
        line = {LINE_ITEM: (item or self.item).pk, QUANTITY: quantity}
        body = {ITEMS_KEY: [line], **_order_fields(), **(extra or {})}
        return self._call(LIST, 'post', who, body)

    def _move(self, who: Any, pk: Any, status: str) -> Any:
        return self._call(DETAIL, 'patch', who, {STATUS_FIELD: status}, pk=pk)

    def _status(self, pk: Any) -> str:
        return getattr(order_model().objects.get(pk=pk), STATUS_FIELD)

    def _stock(self) -> int:
        return getattr(type(self.item).objects.get(pk=self.item.pk), STOCK_FIELD)

    def _needs(self, *names: str) -> None:
        missing = [n for n in names if not globals()[n]]
        if missing:
            self.skipTest('the plan has no ' + ', '.join(missing))

    def _source(self, owner: Any, author: Any, item: Any = None) -> models.Model:
        """A source record (a prescription) of this customer, written by this staff author, for an item."""
        own = OWNERS[SOURCE_NAME][DEFAULT_ROLE][0]
        by = OWNERS[SOURCE_NAME][approver_roles()[0]][0]
        return _row(source_model(), **{own: owner, by: author, SOURCE_ITEM: item})

    def _place_from(self, who: Any, record: Any) -> Any:
        if SOURCE_ON == 'order':
            body = {ITEMS_KEY: [], SOURCE_LINK: record.pk, **_order_fields()}
        else:
            body = {ITEMS_KEY: [{SOURCE_LINK: record.pk}], **_order_fields()}
        return self._call(LIST, 'post', who, body)

    def _author(self) -> Any:
        return _user(approver_roles()[0])

    def test_an_order_of_three_charges_three(self) -> None:
        res = self._place(self.customer, 3)
        self.assertEqual(res.status_code, 201, res.data)
        order = order_model().objects.get(pk=res.data['id'])
        self.assertEqual(Decimal(str(getattr(order, AMOUNT_FIELD))), Decimal('14.25'))
        line = getattr(order, LINES).get()
        self.assertEqual(getattr(line, QUANTITY), 3)
        if LINE_PRICE:
            self.assertEqual(Decimal(str(getattr(line, LINE_PRICE))), Decimal('4.75'))

    def test_a_posted_total_owner_status_or_paid_mark_is_ignored(self) -> None:
        extra = {AMOUNT_FIELD: '0.50', OWNER_FIELD: self.other.pk}
        if STATUS_FIELD:
            extra[STATUS_FIELD] = STEPS[-1]
        if PAID_FLAG:
            extra[PAID_FLAG] = True
        res = self._place(self.customer, 2, extra)
        self.assertEqual(res.status_code, 201, res.data)
        order = order_model().objects.get(pk=res.data['id'])
        self.assertEqual(Decimal(str(getattr(order, AMOUNT_FIELD))), Decimal('9.50'))
        self.assertEqual(getattr(order, OWNER_FIELD + '_id'), self.customer.pk)
        if STATUS_FIELD:
            self.assertEqual(getattr(order, STATUS_FIELD), STEPS[0])
        if PAID_FLAG:
            self.assertFalse(getattr(order, PAID_FLAG))

    def test_an_order_needs_items_and_a_quantity_of_at_least_one(self) -> None:
        self.assertEqual(self._call(LIST, 'post', self.customer, {ITEMS_KEY: []}).status_code, 400)
        self.assertEqual(self._place(self.customer, 0).status_code, 400)
        self.assertEqual(self._call(LIST, 'post', None, {ITEMS_KEY: []}).status_code, 401)

    def test_a_customer_reaches_only_their_own_orders(self) -> None:
        mine = self._place(self.customer).data['id']
        theirs = self._place(self.other).data['id']
        self.assertEqual(self._call(DETAIL, 'get', self.customer, pk=theirs).status_code, 404)
        listed = self._call(LIST, 'get', self.customer)
        rows = listed.data['results'] if isinstance(listed.data, dict) else listed.data
        self.assertEqual([r['id'] for r in rows], [mine])
        if STATUS_FIELD and CANCELLED:
            self.assertEqual(self._move(self.customer, theirs, CANCELLED).status_code, 404)
            self.assertEqual(self._status(theirs), STEPS[0])

    def test_a_customer_cannot_move_the_status_or_delete_an_order(self) -> None:
        mine = self._place(self.customer).data['id']
        if STATUS_FIELD:
            for status in STEPS[1:]:
                self.assertIn(self._move(self.customer, mine, status).status_code, (400, 403), status)
            self.assertEqual(self._status(mine), STEPS[0])
        self.assertEqual(self._call(DETAIL, 'delete', self.customer, pk=mine).status_code, 405)
        self.assertFalse(hasattr(OrderFlowViewSet, 'destroy'))
        self.assertFalse(hasattr(OrderLineReadViewSet, 'create'))

    def test_staff_move_one_step_forward_never_back_or_past_a_step(self) -> None:
        self._needs('STATUS_FIELD')
        if len(STEPS) < 3:
            self.skipTest('the order has fewer than three steps')
        mine = self._place(self.customer).data['id']
        if PAID_STEP:
            self.assertEqual(self._move(self.staff, mine, PAID_STEP).status_code, 400)
            self.assertIn(self._move(self.staff, mine, STEPS[2]).status_code, (400, 403))
            self.assertEqual(self._status(mine), STEPS[0])
            _pay(mine)
        current = self._status(mine)
        steps = [s for s in STEPS if s != APPROVAL_STEP]
        following = steps[steps.index(current) + 1]
        later = steps[steps.index(following) + 1] if steps.index(following) + 1 < len(steps) else ''
        if later:
            self.assertEqual(self._move(self.staff, mine, later).status_code, 400)
        res = self._move(self.staff, mine, following)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self._move(self.staff, mine, current).status_code, 400)
        self.assertEqual(self._move(self.staff, mine, 'paid').status_code, 400)
        self.assertEqual(self._status(mine), following)

    def test_an_unpaid_order_waits_for_the_payment(self) -> None:
        self._needs('STATUS_FIELD', 'PAID_STEP')
        mine = self._place(self.customer).data['id']
        for status in STEPS[1:]:
            self.assertIn(self._move(self.staff, mine, status).status_code, (400, 403), status)
        self.assertEqual(self._status(mine), STEPS[0])
        self.assertEqual(getattr(_pay(mine), STATUS_FIELD), PAID_STEP)

    def test_the_payment_takes_the_stock_once_and_an_unpaid_order_holds_none(self) -> None:
        self._needs('STATUS_FIELD', 'PAID_STEP', 'STOCK_FIELD', 'STOCK_TAKEN')
        mine = self._place(self.customer, 3).data['id']
        self.assertEqual(self._stock(), 10)
        order = _pay(mine)
        self.assertTrue(getattr(order, STOCK_TAKEN))
        self.assertEqual(self._stock(), 7)
        with transaction.atomic(), _payment_writer():
            on_paid(order)
        self.assertEqual(self._stock(), 7)
        self.assertEqual(self._status(mine), PAID_STEP)

    def test_checkout_is_refused_when_the_stock_is_short_or_the_order_closed(self) -> None:
        self._needs('STATUS_FIELD', 'STOCK_FIELD')
        mine = self._place(self.customer, 3).data['id']
        self.assertEqual(checkout_refusal(order_model().objects.get(pk=mine)), '')
        type(self.item).objects.filter(pk=self.item.pk).update(**{STOCK_FIELD: 2})
        self.assertIn('Out of stock', checkout_refusal(order_model().objects.get(pk=mine)))
        if CANCELLED:
            type(self.item).objects.filter(pk=self.item.pk).update(**{STOCK_FIELD: 10})
            self.assertEqual(self._move(self.customer, mine, CANCELLED).status_code, 200)
            self.assertIn('cannot be paid', checkout_refusal(order_model().objects.get(pk=mine)))

    def test_a_payment_after_the_stock_ran_out_stays_paid_and_warns_the_desk(self) -> None:
        self._needs('STATUS_FIELD', 'PAID_STEP', 'STOCK_FIELD', 'STOCK_TAKEN')
        mine = self._place(self.customer, 3).data['id']
        type(self.item).objects.filter(pk=self.item.pk).update(**{STOCK_FIELD: 1})
        order = _pay(mine)
        self.assertEqual(getattr(order, STATUS_FIELD), PAID_STEP)
        self.assertFalse(getattr(order, STOCK_TAKEN))
        self.assertEqual(self._stock(), 1)
        self.assertTrue(self._call(DETAIL, 'get', self.staff, pk=mine).data['stock_short'])

    def test_a_customer_cancels_only_an_unpaid_order(self) -> None:
        self._needs('STATUS_FIELD', 'CANCELLED')
        first = self._place(self.customer).data['id']
        self.assertEqual(self._move(self.customer, first, CANCELLED).status_code, 200)
        self.assertEqual(self._status(first), CANCELLED)
        if PAID_STEP:
            second = self._place(self.customer).data['id']
            _pay(second)
            self.assertEqual(self._move(self.customer, second, CANCELLED).status_code, 403)
            self.assertEqual(self._status(second), PAID_STEP)

    def test_staff_cancel_a_paid_order_it_stays_paid_and_the_stock_comes_back(self) -> None:
        self._needs('STATUS_FIELD', 'CANCELLED', 'PAID_STEP')
        mine = self._place(self.customer, 2).data['id']
        _pay(mine)
        res = self._move(self.staff, mine, CANCELLED)
        self.assertEqual(res.status_code, 200, res.data)
        order = order_model().objects.get(pk=mine)
        self.assertEqual(getattr(order, STATUS_FIELD), CANCELLED)
        self.assertTrue(getattr(order, 'paid_at', None) or (PAID_FLAG and getattr(order, PAID_FLAG)))
        if STOCK_FIELD and STOCK_TAKEN:
            self.assertEqual(self._stock(), 10)
            self.assertFalse(getattr(order, STOCK_TAKEN))

    def test_a_cancelled_order_never_moves_again_and_gives_no_stock_back_twice(self) -> None:
        self._needs('STATUS_FIELD', 'CANCELLED')
        mine = self._place(self.customer).data['id']
        self.assertEqual(self._move(self.customer, mine, CANCELLED).status_code, 200)
        for status in STEPS + (CANCELLED,):
            self.assertIn(self._move(self.staff, mine, status).status_code, (400, 403), status)
        if PAID_STEP:
            order = _pay(mine)
            self.assertEqual(getattr(order, STATUS_FIELD), CANCELLED)
            if STOCK_FIELD and STOCK_TAKEN:
                self.assertFalse(getattr(order, STOCK_TAKEN))
                self.assertEqual(self._stock(), 10)

    def test_the_status_changes_through_the_order_routes_only(self) -> None:
        self._needs('STATUS_FIELD')
        mine = order_model().objects.get(pk=self._place(self.customer).data['id'])
        setattr(mine, STATUS_FIELD, STEPS[-1])
        with self.assertRaises(ModelPermissionDenied):
            mine.save()
        with self.assertRaises(ModelPermissionDenied):
            _row(order_model(), **{OWNER_FIELD: self.customer, AMOUNT_FIELD: Decimal('1'), STATUS_FIELD: STEPS[-1]})

    def test_an_order_from_my_source_record_is_priced_from_its_item(self) -> None:
        self._needs('SOURCE_LINK', 'SOURCE_ITEM')
        record = self._source(self.customer, self._author(), self.item)
        res = self._place_from(self.customer, record)
        self.assertEqual(res.status_code, 201, res.data)
        order = order_model().objects.get(pk=res.data['id'])
        self.assertEqual(Decimal(str(getattr(order, AMOUNT_FIELD))), Decimal('4.75'))
        self.assertEqual(getattr(getattr(order, LINES).get(), LINE_ITEM + '_id'), self.item.pk)

    def test_another_customers_source_record_or_one_with_no_item_is_refused(self) -> None:
        self._needs('SOURCE_LINK', 'SOURCE_ITEM')
        theirs = self._source(self.other, self._author(), self.item)
        self.assertEqual(self._place_from(self.customer, theirs).status_code, 400)
        bare = self._source(self.customer, self._author(), None)
        res = self._place_from(self.customer, bare)
        self.assertEqual(res.status_code, 400)
        self.assertIn('no item', str(res.data))
        self.assertFalse(order_model().objects.exists())

    def test_an_item_that_needs_a_source_record_is_never_ordered_without_one(self) -> None:
        self._needs('ITEM_FLAG', 'SOURCE_LINK')
        type(self.item).objects.filter(pk=self.item.pk).update(**{ITEM_FLAG: True})
        self.assertEqual(self._place(self.customer).status_code, 400)
        record = self._source(self.customer, self._author(), self.item)
        self.assertEqual(self._place_from(self.customer, record).status_code, 201)

    def test_the_approval_is_taken_by_the_source_records_author_only(self) -> None:
        self._needs('STATUS_FIELD', 'APPROVAL_STEP', 'SOURCE_LINK')
        author, colleague = self._author(), self._author()
        mine = self._place_from(self.customer, self._source(self.customer, author, self.item)).data['id']
        if PAID_STEP:
            self.assertEqual(self._move(author, mine, APPROVAL_STEP).status_code, 400)
            _pay(mine)
        before = self._status(mine)
        self.assertEqual(self._move(self.staff, mine, APPROVAL_STEP).status_code, 403)
        self.assertIn(self._move(colleague, mine, APPROVAL_STEP).status_code, (403, 404))
        self.assertIn(self._move(author, mine, STEPS[-1]).status_code, (400, 403))
        self.assertEqual(self._status(mine), before)
        res = self._move(author, mine, APPROVAL_STEP)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self._status(mine), APPROVAL_STEP)
        following = STEPS[STEPS.index(APPROVAL_STEP) + 1] if STEPS.index(APPROVAL_STEP) + 1 < len(STEPS) else ''
        if following:
            self.assertEqual(self._move(author, mine, following).status_code, 403)
            self.assertEqual(self._move(self.staff, mine, following).status_code, 200)

    def test_an_order_without_a_source_record_skips_the_approval(self) -> None:
        self._needs('STATUS_FIELD', 'APPROVAL_STEP')
        mine = self._place(self.customer).data['id']
        if PAID_STEP:
            _pay(mine)
        steps = [s for s in STEPS if s != APPROVAL_STEP]
        while self._status(mine) != steps[-1]:
            following = steps[steps.index(self._status(mine)) + 1]
            res = self._move(self.staff, mine, following)
            self.assertEqual(res.status_code, 200, (following, res.data))
        self.assertNotIn(APPROVAL_STEP, self._call(DETAIL, 'get', self.staff, pk=mine).data['allowed_steps'])

    def test_the_author_rejects_before_the_approval_and_the_stock_comes_back(self) -> None:
        self._needs('STATUS_FIELD', 'APPROVAL_STEP', 'REJECTED', 'SOURCE_LINK')
        author = self._author()
        mine = self._place_from(self.customer, self._source(self.customer, author, self.item)).data['id']
        if PAID_STEP:
            _pay(mine)
        self.assertEqual(self._move(self.staff, mine, REJECTED).status_code, 403)
        self.assertEqual(self._move(author, mine, REJECTED).status_code, 200)
        self.assertEqual(self._status(mine), REJECTED)
        if STOCK_FIELD and STOCK_TAKEN:
            self.assertEqual(self._stock(), 10)

    def test_the_order_says_which_steps_the_caller_may_take(self) -> None:
        self._needs('STATUS_FIELD')
        mine = self._place(self.customer).data['id']
        mine_read = self._call(DETAIL, 'get', self.customer, pk=mine).data['allowed_steps']
        self.assertEqual(mine_read, [CANCELLED] if CANCELLED else [])
        desk_read = self._call(DETAIL, 'get', self.staff, pk=mine).data['allowed_steps']
        following = [s for s in STEPS if s != APPROVAL_STEP][1:2]
        self.assertEqual(desk_read, ([] if PAID_STEP else following) + ([CANCELLED] if CANCELLED else []))

    def test_staff_read_every_order_and_the_role_counts_as_staff(self) -> None:
        self._place(self.customer)
        self._place(self.other)
        listed = self._call(LIST, 'get', self.staff)
        rows = listed.data['results'] if isinstance(listed.data, dict) else listed.data
        self.assertEqual(len(rows), 2)
        self.assertTrue(is_staff_user(self.staff))
        self.assertFalse(is_staff_user(self.customer))

    def test_shared_data_is_read_by_anyone_and_written_by_staff(self) -> None:
        rule = IsStaffOrReadOnly()
        for method, user, allowed in (('get', None, True), ('post', None, False), ('post', 'customer', False),
                                      ('post', 'staff', True)):
            request = getattr(self.factory, method)('/x/')
            request.user = {'customer': self.customer, 'staff': self.staff}.get(user or '', None)
            if request.user is None:
                from django.contrib.auth.models import AnonymousUser
                request.user = AnonymousUser()
            self.assertEqual(rule.has_permission(request, None), allowed, (method, user))

    def test_a_staff_role_reads_and_changes_only_what_the_access_table_gives_it(self) -> None:
        mine = self._place(self.customer).data['id']
        if PAID_STEP and STATUS_FIELD:
            _pay(mine)
        for role in STAFF_ROLES if ROLE_FIELD else ():
            level = ACCESS.get(ORDER_NAME, {}).get(role, 'none')
            if level == 'manage':
                continue
            user = _user(role)
            listed = self._call(LIST, 'get', user)
            paged = isinstance(listed.data, dict) and 'results' in listed.data
            rows = (listed.data['results'] if paged else listed.data) if listed.status_code == 200 else []
            self.assertEqual([r['id'] for r in rows], [mine] if level in ('read', 'post') else [], (role, level))
            if STATUS_FIELD:
                for status in STEPS[1:] + ((CANCELLED,) if CANCELLED else ()):
                    self.assertIn(self._move(user, mine, status).status_code, (403, 404), (role, level, status))
