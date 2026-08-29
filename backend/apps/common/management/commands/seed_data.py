import random
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.customers.models import Customer
from apps.drivers.models import Driver, DriverLocation
from apps.pricing.models import PriceRule, ServiceType, VehicleType
from apps.requests.models import ServiceRequest

User = get_user_model()

CITIES = [
    ("İstanbul", 41.0082, 28.9784),
    ("Ankara", 39.9334, 32.8597),
    ("İzmir", 38.4237, 27.1428),
    ("Bursa", 40.1885, 29.0610),
    ("Antalya", 36.8969, 30.7133),
]

VEHICLE_TYPES = [
    ("Otomobil", "🚗", 1.0),
    ("Motosiklet", "🏍️", 0.7),
    ("SUV", "🚙", 1.2),
    ("Kamyonet", "🛻", 1.4),
    ("Kamyon", "🚚", 2.0),
    ("Otobüs", "🚌", 2.2),
    ("Traktör", "🚜", 1.6),
    ("Kapalı Kasa", "🚐", 1.5),
]


class Command(BaseCommand):
    help = "Geliştirme ve demo ortamı için örnek veri oluşturur."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seed işlemi başlıyor...")

        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@ubercekici.local",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("Admin123!")
            admin_user.save()
        self.stdout.write(self.style.SUCCESS("Admin kullanıcı hazır: admin / Admin123!"))

        vehicle_types = []
        for name, icon, multiplier in VEHICLE_TYPES:
            vt, _ = VehicleType.objects.get_or_create(
                name=name, defaults={"icon": icon, "price_multiplier": Decimal(str(multiplier))}
            )
            vehicle_types.append(vt)

        service_types = []
        for kind, multiplier in [
            (ServiceType.Kind.TOWING, 1.0),
            (ServiceType.Kind.ROADSIDE, 0.8),
            (ServiceType.Kind.BATTERY, 0.6),
            (ServiceType.Kind.TIRE, 0.6),
            (ServiceType.Kind.FUEL, 0.5),
            (ServiceType.Kind.RECOVERY, 1.8),
            (ServiceType.Kind.MULTI, 1.6),
        ]:
            st, _ = ServiceType.objects.get_or_create(
                name=kind, defaults={"recovery_multiplier": Decimal(str(multiplier))}
            )
            service_types.append(st)

        for city, _, _ in CITIES:
            PriceRule.objects.get_or_create(
                city=city,
                defaults={
                    "base_fee": Decimal("150.00"),
                    "price_per_km": Decimal("12.00"),
                    "night_surcharge": Decimal("50.00"),
                },
            )
        PriceRule.objects.get_or_create(
            city="",
            defaults={
                "base_fee": Decimal("150.00"),
                "price_per_km": Decimal("12.00"),
                "night_surcharge": Decimal("50.00"),
            },
        )

        drivers = []
        for i in range(1, 21):
            username = f"surucu{i}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@ubercekici.local",
                    "role": User.Role.DRIVER,
                    "phone_number": f"05{random.randint(300000000, 599999999)}",
                },
            )
            if created:
                user.set_password("Surucu123!")
                user.save()
            driver, _ = Driver.objects.get_or_create(
                user=user,
                defaults={
                    "approval_status": Driver.ApprovalStatus.APPROVED,
                    "is_online": random.choice([True, False]),
                    "vehicle_plate": f"34 ABC {100 + i}",
                    "vehicle_model": random.choice(["Ford Cargo", "Isuzu NPR", "Mercedes Atego"]),
                    "rating": Decimal(str(round(random.uniform(4.0, 5.0), 2))),
                },
            )
            city, lat, lng = random.choice(CITIES)
            DriverLocation.objects.get_or_create(
                driver=driver,
                defaults={
                    "latitude": Decimal(str(lat + random.uniform(-0.05, 0.05))),
                    "longitude": Decimal(str(lng + random.uniform(-0.05, 0.05))),
                },
            )
            drivers.append(driver)

        customers = []
        for i in range(1, 51):
            username = f"musteri{i}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@ubercekici.local",
                    "role": User.Role.CUSTOMER,
                    "phone_number": f"05{random.randint(300000000, 599999999)}",
                },
            )
            if created:
                user.set_password("Musteri123!")
                user.save()
            customer, _ = Customer.objects.get_or_create(user=user)
            customers.append(customer)

        requests_to_create = 30 - ServiceRequest.objects.count()
        for i in range(max(requests_to_create, 0)):
            customer = random.choice(customers)
            city, lat, lng = random.choice(CITIES)
            distance = round(random.uniform(2, 40), 1)
            ServiceRequest.objects.create(
                customer=customer.user,
                driver=random.choice(drivers).user if random.random() > 0.3 else None,
                vehicle_type=random.choice(vehicle_types),
                service_type=random.choice(service_types),
                pickup_lat=Decimal(str(lat)),
                pickup_lng=Decimal(str(lng)),
                pickup_address=f"{city} Merkez",
                dropoff_lat=Decimal(str(lat + random.uniform(-0.2, 0.2))),
                dropoff_lng=Decimal(str(lng + random.uniform(-0.2, 0.2))),
                dropoff_address=f"{city} Servis",
                distance_km=distance,
                duration_minutes=round(distance * 2.2, 1),
                price=Decimal(str(150 + distance * 12)),
                contact_name=customer.user.get_full_name() or customer.user.username,
                contact_phone=customer.user.phone_number,
                status=random.choice(
                    [
                        ServiceRequest.Status.COMPLETED,
                        ServiceRequest.Status.COMPLETED,
                        ServiceRequest.Status.CANCELLED,
                        ServiceRequest.Status.EN_ROUTE,
                    ]
                ),
            )

        self.stdout.write(self.style.SUCCESS("Seed işlemi tamamlandı."))
