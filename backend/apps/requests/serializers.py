from rest_framework import serializers

from apps.common.geo import estimate_duration_minutes, haversine_km, reverse_geocode
from apps.pricing.serializers import ServiceTypeSerializer, VehicleTypeSerializer
from apps.pricing.services import calculate_price
from apps.users.serializers import UserSerializer

from .models import ServiceRequest


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
        price = calculate_price(
            distance_km=distance_km,
            vehicle_type=validated_data["vehicle_type"],
            service_type=validated_data["service_type"],
        )

        validated_data["distance_km"] = distance_km
        validated_data["duration_minutes"] = duration_minutes
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
