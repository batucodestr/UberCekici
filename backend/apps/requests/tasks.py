from datetime import timedelta

from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from django.utils import timezone

from apps.common.geo import haversine_km

# Bir sürücüye bildirim göndermek için makul kabul edilen en uzak mesafe.
MATCH_RADIUS_KM = 30
# Aynı anda en fazla kaç sürücüye bildirim gönderilecek (en yakından başlayarak).
MAX_NOTIFIED_DRIVERS = 10


@shared_task
def find_driver_for_request(request_id):
    """En yakın uygun (çevrimiçi + onaylı) sürücülere anlık bildirim gönderir."""
    from apps.drivers.models import Driver
    from apps.notifications.models import Notification

    from .models import ServiceRequest
    from .serializers import ServiceRequestSerializer

    try:
        service_request = ServiceRequest.objects.get(id=request_id)
    except ServiceRequest.DoesNotExist:
        return

    if service_request.status != ServiceRequest.Status.SEARCHING:
        return

    pickup_lat = float(service_request.pickup_lat)
    pickup_lng = float(service_request.pickup_lng)

    candidates = Driver.objects.filter(
        is_online=True,
        approval_status=Driver.ApprovalStatus.APPROVED,
        location__isnull=False,
    ).select_related("user", "location")

    nearby = []
    for driver in candidates:
        distance_km = haversine_km(
            pickup_lat, pickup_lng, float(driver.location.latitude), float(driver.location.longitude)
        )
        if distance_km <= MATCH_RADIUS_KM:
            nearby.append((distance_km, driver))

    nearby.sort(key=lambda pair: pair[0])
    nearest_drivers = nearby[:MAX_NOTIFIED_DRIVERS]

    channel_layer = get_channel_layer()
    payload = ServiceRequestSerializer(service_request).data

    for distance_km, driver in nearest_drivers:
        Notification.objects.create(
            recipient=driver.user,
            title="Yeni Talep",
            body=f"#{service_request.id} numaralı talep {distance_km} km uzaklıkta.",
            category=Notification.Category.NEW_REQUEST,
        )
        async_to_sync(channel_layer.group_send)(
            f"driver_{driver.user.id}",
            {
                "type": "new.request",
                "kind": "new_request",
                "data": {**payload, "distance_to_driver_km": distance_km},
            },
        )


@shared_task
def check_request_timeouts():
    from .models import ServiceRequest
    from .services import broadcast_request_update

    timeout_threshold = timezone.now() - timedelta(minutes=10)
    stale_requests = ServiceRequest.objects.filter(
        status=ServiceRequest.Status.SEARCHING, created_at__lt=timeout_threshold
    )
    for service_request in stale_requests:
        service_request.status = ServiceRequest.Status.CANCELLED
        service_request.save(update_fields=["status"])
        broadcast_request_update(service_request)
