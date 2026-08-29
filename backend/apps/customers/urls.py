from django.urls import path

from .views import MyCustomerProfileView

urlpatterns = [
    path("customers/me/", MyCustomerProfileView.as_view(), name="customer-me"),
]
