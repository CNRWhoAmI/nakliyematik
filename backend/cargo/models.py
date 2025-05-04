from django.db import models
from django.db.models import F
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class CargoPost(models.Model):
    CARGO_STATUS_CHOICES = [
        ('pending', _('Beklemede')),
        ('active', _('Aktif')),
        ('assigned', _('Taşıyıcıya Atandı')),
        ('in_progress', _('Taşıma Başladı')),
        ('completed', _('Tamamlandı')),
        ('cancelled', _('İptal Edildi')),
        ('expired', _('Süresi Doldu')),
    ]
    
    CARGO_TYPE_CHOICES = [
        ('general', _('Genel Kargo')),
        ('bulk', _('Dökme Yük')),
        ('container', _('Konteyner')),
        ('breakbulk', _('Parça Yük')),
        ('liquid', _('Sıvı')),
        ('vehicle', _('Araç')),
        ('machinery', _('Makine/Ekipman')),
        ('furniture', _('Mobilya')),
        ('dangerous', _('Tehlikeli Madde')),
        ('other', _('Diğer')),
    ]
    
    VEHICLE_TYPES = [
        ('open_truck', _('Açık Kasa Kamyon')),
        ('closed_truck', _('Kapalı Kasa Kamyon')),
        ('refrigerated_truck', _('Frigorifik Kamyon')),
        ('semi_trailer', _('Yarı Römork')),
        ('lowbed', _('Lowbed')),
        ('container_carrier', _('Konteyner Taşıyıcı')),
        ('tanker', _('Tanker')),
        ('tipper', _('Damperli Kamyon')),
        ('van', _('Panelvan')),
        ('pickup', _('Kamyonet')),
        ('other', _('Diğer')),
    ]
    
    # Temel Bilgiler
    cargo_owner = models.ForeignKey(
        'Profile.CargoOwner', 
        on_delete=models.CASCADE, 
        related_name='cargo_posts',
        verbose_name=_('Yük Sahibi')
    )
    title = models.CharField(
        max_length=255,
        verbose_name=_('İlan Başlığı')
    )
    description = models.TextField(
        verbose_name=_('Açıklama'),
        blank=True,
        null=True
    )
    
    # Yük Bilgileri
    cargo_type = models.CharField(
        max_length=20,
        choices=CARGO_TYPE_CHOICES,
        default='general',
        verbose_name=_('Yük Tipi')
    )
    weight = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_('Ağırlık (kg)')
    )
    volume = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_('Hacim (m³)')
    )
    package_count = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_('Paket Sayısı')
    )
    
    # Lokasyon Bilgileri
    pickup_location = models.CharField(
        max_length=255,
        verbose_name=_('Yükleme Yeri')
    )
    delivery_location = models.CharField(
        max_length=255,
        verbose_name=_('Teslim Yeri')
    )
    pickup_date = models.DateField(
        verbose_name=_('Yükleme Tarihi'),
        null=True,
        blank=True
    )
    delivery_date = models.DateField(
        verbose_name=_('Teslim Tarihi'),
        null=True,
        blank=True
    )

    pickup_city = models.CharField(
        max_length=100,
        blank=True, 
        null=True,
        verbose_name=_('Yükleme Şehri')
    )
    pickup_country = models.CharField(
        max_length=100,
        default='Türkiye',
        verbose_name=_('Yükleme Ülkesi')
    )
    delivery_city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('Teslimat Şehri')
    )
    delivery_country = models.CharField(
        max_length=100,
        default='Türkiye',
        verbose_name=_('Teslimat Ülkesi')
    )
    
    # Koordinat alanları
    pickup_latitude = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    pickup_longitude = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True) 
    delivery_latitude = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    delivery_longitude = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    
    # Fiyat Bilgileri
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_('Fiyat (TL)')
    )
    
    # İlan Durumu ve İstatistikler
    status = models.CharField(
        max_length=20,
        choices=CARGO_STATUS_CHOICES,
        default='pending',
        verbose_name=_('Durum')
    )
    required_vehicle = models.CharField(
        max_length=20,
        choices=VEHICLE_TYPES,
        blank=True,
        null=True,
        verbose_name=_('Gerekli Araç Tipi')
    )
    selected_transporter = models.ForeignKey(
        'Profile.Transporter',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='won_cargo_posts',
        verbose_name=_('Seçilen Taşıyıcı')
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Oluşturulma Tarihi')
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Son Güncelleme Tarihi')
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Geçerlilik Süresi')
    )
    view_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_('Görüntülenme Sayısı')
    )
    
    # Teklif Sayısı - Önemli eklenen alan
    offer_count = models.PositiveIntegerField(
        default=0,
        verbose_name=_('Teklif Sayısı'),
        help_text=_('Bu ilana yapılan teklif sayısı')
    )
    
    # İletişim Bilgileri
    contact_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('İletişim Telefonu')
    )
    contact_email = models.EmailField(
        blank=True,
        null=True,
        verbose_name=_('İletişim E-posta')
    )
    
    class Meta:
        verbose_name = _('Yük İlanı')
        verbose_name_plural = _('Yük İlanları')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        # F() ifadeleri ile ilgili kontrolü sadece normal değerler için yap
        if hasattr(self, 'offer_count') and not isinstance(self.offer_count, F) and self.offer_count < 0:
            self.offer_count = 0
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """İlanın süresinin dolup dolmadığını kontrol et"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
    def expire(self):
        """İlanı 'süresi doldu' olarak işaretle"""
        if self.status in ['active', 'pending']:
            self.status = 'expired'
            self.save(update_fields=['status'])
            return True
        return False
    
    def get_days_remaining(self):
        """İlanın geçerliliğinin bitmesine kalan gün sayısını hesapla"""
        if not self.expires_at:
            return None
        delta = self.expires_at - timezone.now()
        return max(0, delta.days)
    
    def increment_view_count(self):
        """Görüntülenme sayısını artır"""
        self.view_count += 1
        self.save(update_fields=['view_count'])