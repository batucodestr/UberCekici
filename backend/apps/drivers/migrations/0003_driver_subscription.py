from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("drivers", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="driver",
            name="subscription_status",
            field=models.CharField(
                choices=[
                    ("inactive", "Paketi yok"),
                    ("pending_approval", "Ödeme onayı bekliyor"),
                    ("active", "Aktif"),
                    ("expired", "Süresi doldu"),
                ],
                default="inactive",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="driver",
            name="subscription_plan",
            field=models.CharField(
                blank=True,
                choices=[("daily", "Günlük"), ("weekly", "Haftalık")],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="driver",
            name="subscription_expires_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="DriverSubscription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("plan", models.CharField(choices=[("daily", "Günlük"), ("weekly", "Haftalık")], max_length=20)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending_approval", "Ödeme onayı bekliyor"),
                            ("active", "Aktif"),
                            ("rejected", "Reddedildi"),
                        ],
                        default="pending_approval",
                        max_length=20,
                    ),
                ),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "driver",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subscriptions",
                        to="drivers.driver",
                    ),
                ),
            ],
            options={"ordering": ("-created_at",)},
        ),
    ]
