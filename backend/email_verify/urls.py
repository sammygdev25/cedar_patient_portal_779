from django.urls import path

from . import views

urlpatterns = [
    path("confirm/", views.ConfirmView.as_view(), name="verify-confirm"),
    path("resend/", views.ResendView.as_view(), name="verify-resend"),
    path("status/", views.StatusView.as_view(), name="verify-status"),
]
