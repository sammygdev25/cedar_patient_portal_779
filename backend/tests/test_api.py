"""What a signed-out visitor gets from each API route, checked against the app's access table (api/access.py)
and its router (api/urls.py). Written by Shikshya: change the table, not this file. Each role's rights are checked
by the build's access probe."""
from importlib import import_module
from importlib.util import find_spec

from django.urls import NoReverseMatch, reverse
from rest_framework.test import APITestCase

from api import urls

access = import_module("api.access") if find_spec("api.access") else None
VISITOR_READS = ("read", "post", "manage")
VISITOR_CREATES = ("create", "post", "own", "manage")


def list_routes():
    """(model, list URL) for every router route that has a list."""
    router = getattr(urls, "router", None)
    found = []
    for _prefix, viewset, basename in (router.registry if router is not None else []):
        try:
            model = access.model_of(viewset) if access is not None else viewset.__name__
            found.append((model, reverse(basename + "-list")))
        except NoReverseMatch:
            continue
    return found


def visitor_level(model):
    return access.ACCESS.get(model, {}).get(access.VISITOR, "none")


class VisitorTests(APITestCase):
    def test_health(self):
        self.assertEqual(self.client.get("/health/").status_code, 200)

    def test_list(self):
        for model, url in list_routes():
            with self.subTest(model=model, url=url):
                status = self.client.get(url).status_code
                if access is None:
                    self.assertLess(status, 500)
                elif visitor_level(model) in VISITOR_READS:
                    self.assertEqual(status, 200)
                else:
                    self.assertEqual(status, 401)

    def test_create(self):
        for model, url in list_routes():
            with self.subTest(model=model, url=url):
                status = self.client.post(url, {}).status_code
                if access is None:
                    self.assertLess(status, 500)
                elif visitor_level(model) in VISITOR_CREATES:
                    self.assertNotIn(status, (401, 403))
                else:
                    self.assertEqual(status, 401)
