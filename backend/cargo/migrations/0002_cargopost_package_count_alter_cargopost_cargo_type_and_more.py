# Generated by Django 5.1.6 on 2025-03-02 20:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cargo', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='cargopost',
            name='package_count',
            field=models.IntegerField(default=1, verbose_name='Paket Sayısı'),
        ),
        migrations.AlterField(
            model_name='cargopost',
            name='cargo_type',
            field=models.CharField(choices=[('general', 'Genel Kargo'), ('bulk', 'Dökme Yük'), ('container', 'Konteyner'), ('breakbulk', 'Parça Yük'), ('liquid', 'Sıvı'), ('vehicle', 'Araç'), ('machinery', 'Makine/Ekipman'), ('furniture', 'Mobilya'), ('dangerous', 'Tehlikeli Madde'), ('other', 'Diğer')], default='general', max_length=20, verbose_name='Yük Tipi'),
        ),
        migrations.AlterField(
            model_name='cargopost',
            name='description',
            field=models.TextField(blank=True, verbose_name='Açıklama'),
        ),
        migrations.AlterField(
            model_name='cargopost',
            name='price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='Teklif Edilen Fiyat'),
        ),
        migrations.AlterField(
            model_name='cargopost',
            name='required_vehicle',
            field=models.CharField(blank=True, choices=[('kamyon', 'Kamyon'), ('tir', 'TIR'), ('minivan', 'Minivan'), ('pickup', 'Pickup'), ('diger', 'Diğer')], default='', max_length=20, verbose_name='Gerekli Araç Tipi'),
        ),
        migrations.AlterField(
            model_name='cargopost',
            name='weight',
            field=models.FloatField(blank=True, null=True, verbose_name='Ağırlık (kg)'),
        ),
    ]
