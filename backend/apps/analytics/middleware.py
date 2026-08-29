import json

from django.urls import Resolver404, resolve

from .models import AuditLog

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SENSITIVE_KEYS = {"password", "password1", "password2", "refresh", "access", "token"}
MAX_STORED_LENGTH = 4000


def _mask(value):
    if isinstance(value, dict):
        return {
            key: ("***" if key.lower() in SENSITIVE_KEYS else _mask(val))
            for key, val in value.items()
        }
    if isinstance(value, list):
        return [_mask(item) for item in value]
    return value


def _parse_body(raw_body):
    if not raw_body:
        return None
    try:
        return _mask(json.loads(raw_body))
    except (ValueError, UnicodeDecodeError):
        return None


def _resolve_match(request):
    try:
        return resolve(request.path)
    except Resolver404:
        return None


class AuditLogMiddleware:
    """Yönetici dışı mutasyon isteklerini otomatik olarak denetim kaydına ekler."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        is_mutating_api_call = (
            request.method in MUTATING_METHODS and request.path.startswith("/api/")
        )
        previous_value = None
        pk = None
        view_class = None
        # `request.body` must be read before the view/DRF parsers consume the
        # stream — accessing it afterwards raises RawPostDataException for
        # non-JSON-buffered content types (e.g. multipart).
        raw_body = request.body if is_mutating_api_call and request.method != "DELETE" else None

        if is_mutating_api_call:
            match = _resolve_match(request)
            view_class = getattr(match.func, "cls", None) if match else None
            pk = match.kwargs.get("pk") if match else None
            if pk and view_class is not None:
                queryset = getattr(view_class, "queryset", None)
                serializer_class = getattr(view_class, "serializer_class", None)
                if queryset is not None and serializer_class is not None:
                    try:
                        instance = queryset.model.objects.filter(pk=pk).first()
                        if instance is not None:
                            previous_value = _mask(serializer_class(instance).data)
                    except Exception:  # pragma: no cover - defensive, never break the request
                        previous_value = None

        response = self.get_response(request)

        user = getattr(request, "user", None)
        if (
            is_mutating_api_call
            and user is not None
            and getattr(user, "is_authenticated", False)
            and 200 <= response.status_code < 400
        ):
            new_value = _parse_body(raw_body)
            model_name = ""
            if view_class is not None:
                queryset = getattr(view_class, "queryset", None)
                if queryset is not None:
                    model_name = queryset.model.__name__

            object_id = pk
            if object_id is None and hasattr(response, "data") and isinstance(response.data, dict):
                object_id = response.data.get("id")

            AuditLog.objects.create(
                actor=user,
                action=self._map_action(request.method),
                model_name=model_name,
                object_id=str(object_id) if object_id is not None else "",
                path=request.path,
                method=request.method,
                previous_value=previous_value,
                new_value=new_value,
            )
        return response

    @staticmethod
    def _map_action(method):
        return {
            "POST": AuditLog.Action.CREATE,
            "PUT": AuditLog.Action.UPDATE,
            "PATCH": AuditLog.Action.UPDATE,
            "DELETE": AuditLog.Action.DELETE,
        }.get(method, AuditLog.Action.OTHER)
