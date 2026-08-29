from django.urls import re_path

from .consumers import RequestTrackingConsumer

websocket_urlpatterns = [
    re_path(r"ws/request/(?P<request_id>\d+)/$", RequestTrackingConsumer.as_asgi()),
]
