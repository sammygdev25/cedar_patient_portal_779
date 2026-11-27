from django.urls import path

from . import views

urlpatterns = [
    path("", views.GoogleStartView.as_view(), name="google-start"),
    path("status/", views.GoogleStatusView.as_view(), name="google-status"),
    path("callback/", views.GoogleCallbackView.as_view(), name="google-callback"),
    path("exchange/", views.GoogleExchangeView.as_view(), name="google-exchange"),
]
