from django.urls import re_path

from .consumers import DriverLocationConsumer

websocket_urlpatterns = [
    re_path(r"ws/driver/location/$", DriverLocationConsumer.as_asgi()),
]
