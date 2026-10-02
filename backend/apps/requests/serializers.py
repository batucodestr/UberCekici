from decimal import Decimal

from rest_framework import serializers

from apps.common.geo import (
    estimate_duration_minutes,
    haversine_km,
    reverse_geocode,
    reverse_geocode_city,
)
from apps.pricing.serializers import ServiceTypeSerializer, VehicleTypeSerializer
from apps.pricing.services import calculate_price
from apps.users.serializers import UserSerializer

from .models import Offer, ServiceRequest


class ServiceRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = (
            "id",
            "vehicle_type",
            "service_type",
            "pickup_lat",
            "pickup_lng",
            "pickup_address",
            "dropoff_lat",
            "dropoff_lng",
            "dropoff_address",
            "distance_km",
            "duration_minutes",
            "price",
            "contact_name",
            "contact_phone",
            "note",
        )
        # distance_km/duration_minutes/price are server-computed to prevent price
        # manipulation — a client can no longer submit an arbitrary fare.
        # pickup_address/dropoff_address are server-computed (reverse geocoded) so
        # drivers/customers see a real address instead of a client-supplied label.
        read_only_fields = (
            "id",
            "distance_km",
            "duration_minutes",
            "price",
            "pickup_address",
            "dropoff_address",
        )

    def create(self, validated_data):
        pickup_lat = float(validated_data["pickup_lat"])
        pickup_lng = float(validated_data["pickup_lng"])
        dropoff_lat = float(validated_data["dropoff_lat"])
        dropoff_lng = float(validated_data["dropoff_lng"])

        distance_km = haversine_km(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)
        duration_minutes = estimate_duration_minutes(distance_km)
        city = reverse_geocode_city(pickup_lat, pickup_lng)
        price = calculate_price(
            distance_km=distance_km,
            vehicle_type=validated_data["vehicle_type"],
            service_type=validated_data["service_type"],
            city=city,
        )

        validated_data["distance_km"] = distance_km
        validated_data["duration_minutes"] = duration_minutes

        client_price = self.initial_data.get("price")
        if client_price is not None:
            try:
                validated_data["price"] = float(client_price)
            except (ValueError, TypeError):
                validated_data["price"] = price["total"]
        else:
            validated_data["price"] = price["total"]
        validated_data["pickup_address"] = reverse_geocode(pickup_lat, pickup_lng)
        validated_data["dropoff_address"] = reverse_geocode(dropoff_lat, dropoff_lng)
        validated_data["customer"] = self.context["request"].user
        return super().create(validated_data)


class ServiceRequestSerializer(serializers.ModelSerializer):
    customer = UserSerializer(read_only=True)
    driver = UserSerializer(read_only=True)
    vehicle_type = VehicleTypeSerializer(read_only=True)
    service_type = ServiceTypeSerializer(read_only=True)

    class Meta:
        model = ServiceRequest
        fields = (
            "id",
            "customer",
            "driver",
            "vehicle_type",
            "service_type",
            "pickup_lat",
            "pickup_lng",
            "pickup_address",
            "dropoff_lat",
            "dropoff_lng",
            "dropoff_address",
            "distance_km",
            "duration_minutes",
            "price",
            "contact_name",
            "contact_phone",
            "note",
            "status",
            "rating",
            "rating_comment",
            "created_at",
            "updated_at",
        )


class RequestStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ServiceRequest.Status.choices)


class RateRequestSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class OfferCreateSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("1"))
    eta_minutes = serializers.IntegerField(
        min_value=1, max_value=1440, required=False, allow_null=True
    )

    class Meta:
        model = Offer
        fields = ("amount", "eta_minutes", "note")


class OfferSerializer(serializers.ModelSerializer):
    driver = UserSerializer(read_only=True)
    driver_rating = serializers.SerializerMethodField()
    vehicle_plate = serializers.SerializerMethodField()
    vehicle_model = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = (
            "id",
            "request",
            "driver",
            "driver_rating",
            "vehicle_plate",
            "vehicle_model",
            "amount",
            "eta_minutes",
            "note",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @staticmethod
    def _profile(obj):
        return getattr(obj.driver, "driver_profile", None)

    def get_driver_rating(self, obj) -> float | None:
        profile = self._profile(obj)
        return float(profile.rating) if profile else None

    def get_vehicle_plate(self, obj) -> str:
        profile = self._profile(obj)
        return profile.vehicle_plate if profile else ""

    def get_vehicle_model(self, obj) -> str:
        profile = self._profile(obj)
        return profile.vehicle_model if profile else ""
