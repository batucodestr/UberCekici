from django.urls import path

from .views import (
    MyDriverProfileView,
    NearbyDriversView,
    PurchaseSubscriptionView,
    ToggleOnlineView,
    UpdateLocationView,
)

urlpatterns = [
    path("drivers/me/", MyDriverProfileView.as_view(), name="driver-me"),
    path("drivers/nearby/", NearbyDriversView.as_view(), name="driver-nearby"),
    path("drivers/toggle-online/", ToggleOnlineView.as_view(), name="driver-toggle-online"),
    path("driver/location/", UpdateLocationView.as_view(), name="driver-location"),
    path(
        "driver/subscription/purchase/",
        PurchaseSubscriptionView.as_view(),
        name="driver-subscription-purchase",
    ),
]
