from django.db import models
from django.utils import timezone
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from django.db.models import F
from Profile.models import CargoOwner, Transporter
from cargo.models import CargoPost

class Offer(models.Model):
    OFFER_STATUS = [
        ('pending', _('Beklemede')),
        ('accepted', _('Kabul Edildi')),
        ('rejected', _('Reddedildi')),
        ('cancelled', _('İptal Edildi')),
        ('expired', _('Süresi Doldu')),
        ('withdrawn', _('Geri Çekildi'))  # Yeni durum eklendi
    ]

    cargo_post = models.ForeignKey(
        CargoPost,
        on_delete=models.SET_NULL,  # CASCADE yerine SET_NULL kullanıyoruz
        related_name='offers',
        verbose_name=_('Yük İlanı'),
        null=True  # null=True eklemeliyiz
    )
    cargo_owner = models.ForeignKey(
        'Profile.CargoOwner', 
        on_delete=models.CASCADE, 
        related_name="offers_received",
        verbose_name=_('Yük Sahibi')
    )
    transporter = models.ForeignKey(
        'Profile.Transporter', 
        on_delete=models.CASCADE, 
        related_name="offers_sent",
        verbose_name=_('Taşıyıcı')
    )
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name=_('Teklif Fiyatı (TL)')
    )
    status = models.CharField(
        max_length=10, 
        choices=OFFER_STATUS, 
        default='pending',
        verbose_name=_('Durum')
    )
    message = models.TextField(
        blank=True, 
        null=True,
        verbose_name=_('Mesaj')
    )
    # Yeni alan: Yanıt notu
    response_note = models.TextField(
        blank=True, 
        null=True,
        verbose_name=_('Yanıt Notu')
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Oluşturma Tarihi')
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_('Güncelleme Tarihi')
    )
    expires_at = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name=_('Geçerlilik Süresi')
    )

    class Meta:
        verbose_name = _('Teklif')
        verbose_name_plural = _('Teklifler')
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.transporter} -> {self.cargo_post.title} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        # Hatalı kontrol kaldırıldı - offer_count Offer modeline ait değil
        # if not isinstance(self.offer_count, F) and self.offer_count < 0:
        #    self.offer_count = 0
        
        # Normal kaydetme işlemine devam et
        super().save(*args, **kwargs)


    def is_expired(self):
        """Check if the offer is expired"""
        if self.status != 'pending':
            return False
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    def get_hours_remaining(self):
        """Get the number of hours remaining before expiry"""
        if not self.expires_at or not self.status == 'pending':
            return None
        delta = self.expires_at - timezone.now()
        total_seconds = max(0, delta.total_seconds())
        return total_seconds / 3600  # Convert seconds to hours

    def expire(self):
        """Mark the offer as expired if it is pending and past expiry time"""
        if self.status == 'pending' and self.is_expired():
            self.status = 'expired'
            self.save(update_fields=['status'])
            return True
        return False

    def accept(self, response_note=None):
        """Yük sahibi tarafından kabul et"""
        from django.db import transaction
        
        with transaction.atomic():
            # İlanı kilit altına al ve durumu kontrol et
            cargo_post = CargoPost.objects.select_for_update().get(id=self.cargo_post.id)
            
            # Eğer ilan zaten atandıysa kabul etme
            if cargo_post.status != 'active':
                return False
                
            if self.status == 'pending':
                self.status = 'accepted'
                
                # Yanıt notu varsa ekle
                if response_note:
                    self.response_note = response_note
                    
                self.save()
                
                # Diğer bekleyen teklifleri reddet
                Offer.objects.filter(
                    cargo_post=cargo_post,
                    status='pending'
                ).exclude(id=self.id).update(status='rejected')
                
                # İlan durumunu "Taşıyıcıya Atandı" olarak güncelle
                cargo_post.status = 'assigned'
                cargo_post.selected_transporter = self.transporter
                cargo_post.save()
                
                return True
        return False

    def reject(self, response_note=None):
        """Yük sahibi tarafından reddet"""
        if self.status == 'pending':
            self.status = 'rejected'
            
            # Yanıt notu varsa ekle
            if response_note:
                self.response_note = response_note
                
            self.save()
            
            # Teklif sayısını azalt
            try:
                from django.db.models import F
                from cargo.models import CargoPost
                CargoPost.objects.filter(id=self.cargo_post.id, offer_count__gt=0).update(
                    offer_count=F('offer_count') - 1
                )
            except Exception as e:
                print(f"Teklif sayısı azaltılırken hata: {e}")
                
            return True
        return False

    def cancel(self):
        """Taşıyıcı tarafından iptal et"""
        if self.status == 'pending':
            self.status = 'cancelled'
            self.save()
            
            # Teklif sayısını azalt
            try:
                from django.db.models import F
                from cargo.models import CargoPost
                CargoPost.objects.filter(id=self.cargo_post.id, offer_count__gt=0).update(
                    offer_count=F('offer_count') - 1
                )
            except Exception as e:
                print(f"Teklif sayısı azaltılırken hata: {e}")
                
            return True
        return False
    
    def withdraw(self):
        """Taşıyıcı tarafından geri çek (yeni fonksiyon)"""
        if self.status == 'pending':
            self.status = 'withdrawn'
            self.save()
            
            # Teklif sayısını azalt
            try:
                from django.db.models import F
                from cargo.models import CargoPost
                CargoPost.objects.filter(id=self.cargo_post.id, offer_count__gt=0).update(
                    offer_count=F('offer_count') - 1
                )
            except Exception as e:
                print(f"Teklif sayısı azaltılırken hata: {e}")
                
            return True
        return False


# Signal handlers to update cargo post statistics
@receiver(post_save, sender=Offer)
def update_cargo_statistics(sender, instance, created, **kwargs):
    """Bir teklif kaydedildiğinde, ilgili CargoPost'un istatistiklerini günceller."""
    if created:
        # Yeni teklif oluşturulduğunda teklif sayısını artır
        cargo_post = instance.cargo_post
        
        try:
            # Doğrudan veritabanı güncelleme (atomik işlem)
            from django.db.models import F
            from cargo.models import CargoPost
            CargoPost.objects.filter(id=cargo_post.id).update(
                offer_count=F('offer_count') + 1
            )
        except Exception as e:
            # Hata durumunda loglama yap
            print(f"Teklif sayısı artırılırken hata: {e}")

@receiver(post_save, sender=Offer)
def update_offer_count_on_status_change(sender, instance, created, **kwargs):
    """
    Teklif durumu değiştiğinde teklif sayısını güncelle.
    Created=False ise durum değişikliği olabilir.
    """
    if not created and instance.status != 'pending':
        # Durum "pending" değilse ve yeni oluşturulmadıysa, aktif teklif sayısını güncelle
        cargo_post = instance.cargo_post
        
        if cargo_post:
            # Aktif teklif sayısını hesapla
            active_offers = Offer.objects.filter(
                cargo_post=cargo_post, 
                status='pending'
            ).count()
            
            # CargoPost'u güncelle
            cargo_post.offer_count = active_offers
            cargo_post.save(update_fields=['offer_count'])

@receiver(post_delete, sender=Offer)
def update_offer_count_on_delete(sender, instance, **kwargs):
    """Bir teklif silindiğinde, ilgili CargoPost'un teklif sayısını güncelle."""
    if instance.status == 'pending':  # Sadece aktif teklifler için güncelle
        cargo_post = instance.cargo_post
        
        if cargo_post:
            # Aktif teklif sayısını hesapla
            active_offers = Offer.objects.filter(
                cargo_post=cargo_post, 
                status='pending'
            ).count()
            
            # CargoPost'u güncelle
            cargo_post.offer_count = active_offers
            cargo_post.save(update_fields=['offer_count'])