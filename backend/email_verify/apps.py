from django.apps import AppConfig


class EmailVerifyConfig(AppConfig):
    name = "email_verify"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        # A sign-up or a changed email waits for the link; a Google link counts as confirmed (core.connect).
        from . import core
        core.connect()
