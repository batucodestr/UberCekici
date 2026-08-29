import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

from apps.requests.routing import websocket_urlpatterns as request_ws  # noqa: E402
from apps.drivers.routing import websocket_urlpatterns as driver_ws  # noqa: E402
from apps.analytics.routing import websocket_urlpatterns as admin_ws  # noqa: E402
from apps.notifications.routing import websocket_urlpatterns as notifications_ws  # noqa: E402
from apps.common.jwt_ws_auth import JWTAuthMiddlewareStack  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddlewareStack(
            URLRouter(request_ws + driver_ws + admin_ws + notifications_ws)
        ),
    }
)
