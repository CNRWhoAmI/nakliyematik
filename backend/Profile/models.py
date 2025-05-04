from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator

class User(AbstractUser):
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Telefon numarası '+999999999' formatında olmalıdır."
    )
    
    phone = models.CharField(
        validators=[phone_regex],
        max_length=15,
        blank=True,
        null=True,
        verbose_name=_('Telefon')
    )
    address = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('Adres')
    )
    tax_number = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        unique=True,
        verbose_name=_('Vergi Numarası')
    )
    company_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_('Firma Adı')
    )
    user_type = models.CharField(
        max_length=20,
        choices=[
            ('cargo_owner', _('Yük Sahibi')),
            ('transporter', _('Taşıyıcı')),
        ],
        blank=True,
        null=True,
        verbose_name=_('Kullanıcı Tipi')
    )

    class Meta:
        verbose_name = _('Kullanıcı')
        verbose_name_plural = _('Kullanıcılar')
        
    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"

class CargoOwner(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='cargo_owner',
        verbose_name=_('Kullanıcı')
    )
    company_name = models.CharField(
        max_length=255,
        verbose_name=_('Firma Adı')
    )
    phone = models.CharField(
        max_length=15,
        validators=[User.phone_regex],
        verbose_name=_('Telefon')
    )
    tax_number = models.CharField(
        max_length=10,
        unique=True,
        verbose_name=_('Vergi Numarası')
    )
    address = models.TextField(verbose_name=_('Adres'))
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Oluşturulma Tarihi')
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Güncellenme Tarihi')
    )

    class Meta:
        verbose_name = _('Yük Sahibi')
        verbose_name_plural = _('Yük Sahipleri')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.company_name} ({self.user.username})"

class Transporter(models.Model):
    VEHICLE_TYPES = [
        ('truck', _('Kamyon')),
        ('small_truck', _('Küçük Kamyon')),
        ('medium_truck', _('Orta Boy Kamyon')),
        ('large_truck', _('Büyük Kamyon')),
        ('semi_truck', _('Tır')),
        ('refrigerated_truck', _('Frigorifik Araç')),
        ('flatbed_truck', _('Açık Kasa')),
        ('tanker', _('Tanker')),
        ('container_truck', _('Konteyner Taşıyıcı')),
        ('car_carrier', _('Oto Taşıyıcı')),
        ('pickup', _('Kamyonet')),
        ('van', _('Van')),
        ('other', _('Diğer')),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='transporter',
        verbose_name=_('Kullanıcı')
    )
    company_name = models.CharField(
        max_length=100,
        verbose_name=_('Firma Adı')
    )
    vehicle_type = models.CharField(
        max_length=20,
        choices=VEHICLE_TYPES,
        verbose_name=_('Araç Tipi')
    )
    phone = models.CharField(
        max_length=15,
        validators=[User.phone_regex],
        verbose_name=_('Telefon')
    )
    tax_number = models.CharField(
        max_length=10,
        unique=True,
        verbose_name=_('Vergi Numarası')
    )
    address = models.TextField(verbose_name=_('Adres'))
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Oluşturulma Tarihi')
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Güncellenme Tarihi')
    )

    class Meta:
        verbose_name = _('Taşıyıcı')
        verbose_name_plural = _('Taşıyıcılar')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.company_name} ({self.get_vehicle_type_display()})"