from rest_framework import serializers

from .models import PriceRule, ServiceType, VehicleType


class VehicleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleType
        fields = ("id", "name", "icon", "price_multiplier", "is_active")


class ServiceTypeSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="get_name_display", read_only=True)

    class Meta:
        model = ServiceType
        fields = ("id", "name", "display_name", "recovery_multiplier", "is_active")


class PriceRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceRule
        fields = (
            "id",
            "city",
            "base_fee",
            "price_per_km",
            "night_surcharge",
            "night_start_hour",
            "night_end_hour",
            "is_active",
            "updated_at",
        )


class QuoteRequestSerializer(serializers.Serializer):
    vehicle_type_id = serializers.IntegerField()
    service_type_id = serializers.IntegerField()
    distance_km = serializers.FloatField(min_value=0)
    duration_minutes = serializers.FloatField(min_value=0)
    city = serializers.CharField(required=False, allow_blank=True, default="")


class QuoteResponseSerializer(serializers.Serializer):
    base_fee = serializers.FloatField()
    distance_fee = serializers.FloatField()
    night_fee = serializers.FloatField()
    vehicle_fee = serializers.FloatField()
    recovery_fee = serializers.FloatField()
    total = serializers.FloatField()
    is_night = serializers.BooleanField()
    distance_km = serializers.FloatField()
    eta_minutes = serializers.FloatField()
