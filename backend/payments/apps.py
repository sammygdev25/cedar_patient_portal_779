"""The payments app: on start it puts the guard on every save of every model it charges (PX.300)."""
from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payments'

    def ready(self) -> None:
        from django.db.models.signals import pre_save

        from .guard import refuse_paid_outside_webhook
        from .order import PAYABLES, kind_model

        for kind in PAYABLES:
            pre_save.connect(refuse_paid_outside_webhook, sender=kind_model(kind),
                             dispatch_uid='payments.refuse_paid.' + kind)
