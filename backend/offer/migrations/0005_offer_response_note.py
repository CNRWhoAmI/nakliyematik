# Generated by Django 5.1.6 on 2025-03-05 20:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('offer', '0004_remove_offer_offer_offer_status_95ef93_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='offer',
            name='response_note',
            field=models.TextField(blank=True, null=True, verbose_name='Yanıt Notu'),
        ),
    ]
