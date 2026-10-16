from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("requests", "0004_offer_and_accepted_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicerequest",
            name="payment_method",
            field=models.CharField(
                choices=[
                    ("cash", "Nakit"),
                    ("card", "Kart"),
                    ("bank_transfer", "Havale/EFT"),
                ],
                default="cash",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="servicerequest",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("unpaid", "Ödenmedi"),
                    ("pending_approval", "Onay Bekliyor"),
                    ("approved", "Onaylandı"),
                    ("rejected", "Reddedildi"),
                ],
                default="unpaid",
                max_length=20,
            ),
        ),
    ]
