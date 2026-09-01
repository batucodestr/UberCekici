from django.db import migrations, models


def reassign_and_remove_fuel(apps, schema_editor):
    ServiceType = apps.get_model("pricing", "ServiceType")
    ServiceRequest = apps.get_model("requests", "ServiceRequest")

    fuel = ServiceType.objects.filter(name="fuel").first()
    if fuel is None:
        return

    roadside, _ = ServiceType.objects.get_or_create(
        name="roadside", defaults={"recovery_multiplier": 0.8}
    )
    ServiceRequest.objects.filter(service_type=fuel).update(service_type=roadside)
    fuel.delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("pricing", "0002_alter_servicetype_name"),
        ("requests", "0003_servicerequest_rating_servicerequest_rating_comment"),
    ]

    operations = [
        migrations.RunPython(reassign_and_remove_fuel, noop),
        migrations.AlterField(
            model_name="servicetype",
            name="name",
            field=models.CharField(choices=[('towing', 'Çekici'), ('roadside', 'Yol Yardım'), ('battery', 'Akü'), ('tire', 'Lastik'), ('recovery', 'Kurtarma'), ('multi', 'Çoklu Araç Çekimi')], max_length=20, unique=True),
        ),
    ]
