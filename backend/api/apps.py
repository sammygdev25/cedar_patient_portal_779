"""API app configuration."""
from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Mail (PX.302): the confirmations api/mail.py sends after a commit, and a warning when no server is set.
        from . import mail
        mail.connect()
