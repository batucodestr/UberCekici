from django.urls import re_path

from .consumers import AdminLiveConsumer

websocket_urlpatterns = [
    re_path(r"ws/admin/live/$", AdminLiveConsumer.as_asgi()),
]
