from django.urls import path

from .views import (
    MyDriverProfileView,
    NearbyDriversView,
    ToggleOnlineView,
    UpdateLocationView,
)

urlpatterns = [
    path("drivers/me/", MyDriverProfileView.as_view(), name="driver-me"),
    path("drivers/nearby/", NearbyDriversView.as_view(), name="driver-nearby"),
    path("drivers/toggle-online/", ToggleOnlineView.as_view(), name="driver-toggle-online"),
    path("driver/location/", UpdateLocationView.as_view(), name="driver-location"),
]
