import math

import requests
from django.conf import settings

EARTH_RADIUS_KM = 6371
AVERAGE_SPEED_KMH = 35
NOMINATIM_TIMEOUT_SECONDS = 3


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(EARTH_RADIUS_KM * c, 1)


def estimate_duration_minutes(distance_km: float) -> float:
    return round((distance_km / AVERAGE_SPEED_KMH) * 60, 1)


def reverse_geocode(lat: float, lng: float) -> str:
    """Koordinatı okunabilir bir adrese çevirir; servis erişilemezse koordinatı döndürür."""
    fallback = f"{lat:.6f}, {lng:.6f}"
    try:
        response = requests.get(
            f"{settings.NOMINATIM_URL}/reverse",
            params={"lat": lat, "lon": lng, "format": "jsonv2", "zoom": 18},
            headers={"User-Agent": "UberCekici/1.0 (+https://ubercekici.local)"},
            timeout=NOMINATIM_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        display_name = response.json().get("display_name")
        return display_name or fallback
    except (requests.RequestException, ValueError):
        return fallback
