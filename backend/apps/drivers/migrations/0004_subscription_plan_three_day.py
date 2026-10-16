from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("drivers", "0003_driver_subscription"),
    ]

    operations = [
        migrations.AlterField(
            model_name="driver",
            name="subscription_plan",
            field=models.CharField(
                blank=True,
                choices=[
                    ("three_day", "3 Gün"),
                    ("daily", "3 Gün"),
                    ("weekly", "Haftalık"),
                ],
                default="",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="driversubscription",
            name="plan",
            field=models.CharField(
                choices=[
                    ("three_day", "3 Gün"),
                    ("daily", "3 Gün"),
                    ("weekly", "Haftalık"),
                ],
                max_length=20,
            ),
        ),
    ]
