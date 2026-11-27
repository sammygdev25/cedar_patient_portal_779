"""The people a signed-in user may pick, written by Shikshya (PX.268). A form that books or assigns someone (an
appointment's doctor) needs that person's id, so GET /api/people/?role=doctor lists them: id, username, first and
last name and role, never an email. Who may list whom comes from the access table (api/access.py), never from here:
a role is listed for a caller who may create a record linking to that role, unless the server fills that link with
the caller themselves or copies it from a parent record. Do not edit: change the access table."""
from typing import Any, Set

from django.contrib.auth import get_user_model
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from api.access import ACCESS, COPIED, OWNER_FIELDS, PEOPLE, ROLE_FIELD, ROLES, SUPERUSER, role_of

CREATES = ('manage', 'own', 'post', 'create')
FIELDS = ('id', 'username', 'first_name', 'last_name')
LIMIT = 500


def listable_roles(user: Any) -> Set[str]:
    """The roles this user may pick people from."""
    who = role_of(user)
    if who == SUPERUSER:
        return set(ROLES)
    out: Set[str] = set()
    for model, links in PEOPLE.items():
        if ACCESS.get(model, {}).get(who, 'none') not in CREATES:
            continue
        for link, role in links.items():
            if link in COPIED.get(model, {}) or OWNER_FIELDS.get(model, {}).get(who) == link:
                continue
            out.add(role)
    return out


def _person(user: Any) -> dict:
    row = {name: getattr(user, name, '') for name in FIELDS}
    row['role'] = getattr(user, ROLE_FIELD, '') if ROLE_FIELD else ''
    return row


class PeopleView(APIView):
    """GET /api/people/ (every role this user may pick) or /api/people/?role=doctor; GET /api/people/<id>/."""
    permission_classes = [permissions.IsAuthenticated]

    def _queryset(self, request: Any) -> Any:
        allowed = listable_roles(request.user)
        asked = request.query_params.get('role')
        if asked is not None and asked not in allowed:
            raise PermissionDenied('You may not list people with this role.')
        roles = [asked] if asked is not None else sorted(allowed)
        users = get_user_model().objects.filter(is_active=True, is_superuser=False)
        if not ROLE_FIELD or not roles:
            return users.none()
        return users.filter(**{ROLE_FIELD + '__in': roles}).order_by('first_name', 'last_name', 'username')

    def get(self, request: Any, pk: Any = None) -> Response:
        users = self._queryset(request)
        if pk is not None:
            found = users.filter(pk=pk).first()
            return Response(_person(found)) if found is not None else Response({'detail': 'Not found.'}, status=404)
        return Response([_person(u) for u in users[:LIMIT]])
