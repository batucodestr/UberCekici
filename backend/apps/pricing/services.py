from datetime import datetime

from django.core.cache import cache
from django.utils import timezone

from .models import PriceRule, ServiceType, VehicleType

PRICE_RULES_CACHE_KEY = "pricing:active_price_rules"
PRICE_RULES_CACHE_TTL = 300


def invalidate_price_rules_cache() -> None:
    cache.delete(PRICE_RULES_CACHE_KEY)


def _active_price_rules() -> list[PriceRule]:
    rules = cache.get(PRICE_RULES_CACHE_KEY)
    if rules is None:
        rules = list(PriceRule.objects.filter(is_active=True))
        cache.set(PRICE_RULES_CACHE_KEY, rules, PRICE_RULES_CACHE_TTL)
    return rules


def _find_rule(city: str) -> PriceRule | None:
    rules = _active_price_rules()
    city_rule = next((r for r in rules if r.city.lower() == city.lower()), None)
    if city_rule is not None:
        return city_rule
    return next((r for r in rules if r.city == ""), None)


def calculate_price(
    distance_km: float,
    vehicle_type: VehicleType,
    service_type: ServiceType,
    city: str = "",
    at: datetime | None = None,
) -> dict:
    rule = _find_rule(city)
    if rule is None:
        rule = PriceRule(base_fee=150, price_per_km=12, night_surcharge=50)

    base_fee = float(rule.base_fee)
    price_per_km = float(rule.price_per_km)
    night_surcharge = float(rule.night_surcharge)
    vehicle_multiplier = float(vehicle_type.price_multiplier) if vehicle_type else 1.0
    recovery_multiplier = float(service_type.recovery_multiplier) if service_type else 1.0

    at = at or timezone.localtime()
    is_night = at.hour >= rule.night_start_hour or at.hour < rule.night_end_hour
    night_fee = night_surcharge if is_night else 0.0

    distance_fee = price_per_km * distance_km
    vehicle_fee = distance_fee * (vehicle_multiplier - 1)
    recovery_fee = distance_fee * (recovery_multiplier - 1)

    total = base_fee + distance_fee + night_fee + vehicle_fee + recovery_fee

    return {
        "base_fee": base_fee,
        "distance_fee": distance_fee,
        "night_fee": night_fee,
        "vehicle_fee": vehicle_fee,
        "recovery_fee": recovery_fee,
        "total": round(total, 2),
        "is_night": is_night,
        "distance_km": distance_km,
    }
