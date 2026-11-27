"""Register, sign in and the profile, through the app's own auth routes. Written by Shikshya."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

USER = {"username": "testuser", "email": "test@example.com", "password": "testpass123"}


def make_user():
    return get_user_model().objects.create_user(**USER)


class RegistrationTests(APITestCase):
    def test_register_success(self):
        response = self.client.post("/api/auth/register/", {
            "username": "newuser", "email": "new@example.com", "password": "newpass123"})
        self.assertIn(response.status_code, (200, 201))
        self.assertIn("token", response.data)

    def test_register_duplicate_email(self):
        make_user()
        response = self.client.post("/api/auth/register/", {
            "username": "another", "email": USER["email"].upper(), "password": "Another-pass-4821"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)


class LoginTests(APITestCase):
    def test_login_success(self):
        make_user()
        response = self.client.post("/api/auth/login/", {"username": USER["username"], "password": USER["password"]})
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)

    def test_login_wrong_password(self):
        make_user()
        response = self.client.post("/api/auth/login/", {"username": USER["username"], "password": "wrongpassword"})
        self.assertIn(response.status_code, (400, 401))

    def test_login_nonexistent_user(self):
        response = self.client.post("/api/auth/login/", {"username": "nobody", "password": "nopass123"})
        self.assertIn(response.status_code, (400, 401))


class ProfileTests(APITestCase):
    def test_profile_authenticated(self):
        login = self.client.post("/api/auth/login/", {"username": make_user().username, "password": USER["password"]})
        self.client.credentials(HTTP_AUTHORIZATION="Token " + login.data["token"])
        response = self.client.get("/api/auth/profile/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("username", response.data)

    def test_profile_cannot_take_another_accounts_email(self):
        get_user_model().objects.create_user(username="other", email="other@example.com", password="Other-pass-4821")
        self.client.force_authenticate(make_user())
        response = self.client.patch("/api/auth/profile/", {"email": "Other@Example.com"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_profile_unauthenticated(self):
        self.assertEqual(self.client.get("/api/auth/profile/").status_code, 401)
