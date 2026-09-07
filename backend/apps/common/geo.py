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


def _geocode_google(query: str) -> dict | None:
    try:
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": query, "region": "tr", "key": settings.GOOGLE_MAPS_API_KEY},
            timeout=NOMINATIM_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "OK" or not payload.get("results"):
            return None
        result = payload["results"][0]
        location = result["geometry"]["location"]
        return {
            "lat": round(float(location["lat"]), 6),
            "lng": round(float(location["lng"]), 6),
            "display_name": result.get("formatted_address", query),
        }
    except (requests.RequestException, ValueError, KeyError, IndexError):
        return None


def _reverse_geocode_google(lat: float, lng: float) -> str | None:
    try:
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"latlng": f"{lat},{lng}", "key": settings.GOOGLE_MAPS_API_KEY},
            timeout=NOMINATIM_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "OK" or not payload.get("results"):
            return None
        return payload["results"][0].get("formatted_address")
    except (requests.RequestException, ValueError, KeyError, IndexError):
        return None


def geocode(query: str) -> dict | None:
    """Serbest metin adresi koordinata çevirir; bulunamazsa None döner.

    GOOGLE_MAPS_API_KEY tanımlıysa Google Geocoding API kullanılır, aksi
    halde Nominatim/OpenStreetMap'e geri döner.
    """
    if settings.GOOGLE_MAPS_API_KEY:
        result = _geocode_google(query)
        if result is not None:
            return result
    try:
        response = requests.get(
            f"{settings.NOMINATIM_URL}/search",
            params={"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "tr"},
            headers={"User-Agent": "UberCekici/1.0 (+https://ubercekici.local)"},
            timeout=NOMINATIM_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        results = response.json()
        if not results:
            return None
        result = results[0]
        return {
            "lat": round(float(result["lat"]), 6),
            "lng": round(float(result["lon"]), 6),
            "display_name": result.get("display_name", query),
        }
    except (requests.RequestException, ValueError, KeyError, IndexError):
        return None


def reverse_geocode(lat: float, lng: float) -> str:
    """Koordinatı okunabilir bir adrese çevirir; servis erişilemezse koordinatı döndürür."""
    fallback = f"{lat:.6f}, {lng:.6f}"
    if settings.GOOGLE_MAPS_API_KEY:
        display_name = _reverse_geocode_google(lat, lng)
        if display_name:
            return display_name
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
