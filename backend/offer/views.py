from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, F
from django.utils import timezone
from django.db import transaction
from .models import Offer
from .serializers import (
    OfferCreateSerializer, OfferListSerializer, OfferDetailSerializer
)
from cargo.models import CargoPost
import logging

logger = logging.getLogger(__name__)

class OfferViewSet(viewsets.ModelViewSet):
    """
    Teklifleri yönetmek için ViewSet
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """İşlem tipine göre uygun serializer'ı seç"""
        if self.action == 'create' or self.action == 'update' or self.action == 'partial_update':
            return OfferCreateSerializer
        elif self.action == 'list' or self.action in ['my_offers', 'received_offers', 'pending_offers']:
            return OfferListSerializer
        return OfferDetailSerializer
    
    def get_queryset(self):
        """Kullanıcı rolüne göre uygun sorgu setini oluştur"""
        user = self.request.user
        
        # Taşıyıcı kullanıcılar sadece kendi tekliflerini görebilir
        if hasattr(user, 'transporter'):
            return Offer.objects.filter(transporter=user.transporter)
        
        # Yük sahipleri sadece kendi ilanlarına gelen teklifleri görebilir
        elif hasattr(user, 'cargo_owner'):
            return Offer.objects.filter(cargo_owner=user.cargo_owner)
            
        return Offer.objects.none()
    
    def perform_create(self, serializer):
        """Teklif oluştururken transporter ve cargo_owner bilgisini otomatik ekle"""
        user = self.request.user
        
        if not hasattr(user, 'transporter'):
            logger.warning(f"User {user} attempted to create offer but is not a transporter")
            raise PermissionDenied("Sadece taşıyıcı kullanıcılar teklif verebilir")
    
        # İlgili cargo_post'u al
        cargo_post_id = self.request.data.get('cargo_post')
        
        # Transaction başlat - race condition için
        with transaction.atomic():
            try:
                # İlanı kilitleyerek al
                cargo_post = CargoPost.objects.select_for_update().get(pk=cargo_post_id)
            except CargoPost.DoesNotExist:
                logger.warning(f"Attempted to create offer for non-existent cargo post {cargo_post_id}")
                raise PermissionDenied("Belirtilen yük ilanı bulunamadı")
                
            # İlanın aktif olduğunu kontrol et
            if cargo_post.status != 'active':
                logger.warning(f"Attempted to create offer for non-active cargo post {cargo_post_id}")
                raise PermissionDenied(f"Bu ilan şu anda '{cargo_post.get_status_display()}' durumunda olduğu için teklif verilemez")
            
            # İlanda kabul edilmiş teklif var mı kontrol et
            if Offer.objects.filter(cargo_post=cargo_post, status='accepted').exists():
                logger.warning(f"Attempted to create offer for cargo post {cargo_post_id} that already has an accepted offer")
                raise PermissionDenied("Bu ilana ait bir teklif zaten kabul edilmiş durumda. Yeni teklif verilemez.")
                
            # Tekrarlanan teklif kontrolü
            existing_offer = Offer.objects.filter(
                cargo_post=cargo_post,
                transporter=user.transporter,
                status='pending'
            ).first()
        
        if existing_offer:
            logger.warning(f"User {user} attempted to create duplicate offer for cargo post {cargo_post_id}")
            raise PermissionDenied("Bu ilana zaten bir teklif verdiniz. Lütfen bekleyen teklifinizi güncelleyin.")
        
        # Teklifi oluştur ve ilan tekif sayısını arttır
        try:
            offer = serializer.save(
                transporter=user.transporter,
                cargo_owner=cargo_post.cargo_owner
            )
            
            # F() ifadesi yerine, veritabanından güncel değeri alıp Python'da işlem yap
            cargo_post.offer_count += 1
            cargo_post.save(update_fields=['offer_count'])
            
            logger.info(f"Offer created successfully by {user} for cargo post {cargo_post_id}")
        except Exception as e:
            logger.error(f"Error creating offer: {e}", exc_info=True)
            raise
    
    def perform_update(self, serializer):
        """
        Teklif güncelleme işlemi
        Sadece kendi tekliflerini ve sadece 'pending' durumundayken güncelleyebilirler
        """
        user = self.request.user
        offer = self.get_object()
        
        # Taşıyıcı olmayanlar güncelleyemez
        if not hasattr(user, 'transporter'):
            logger.warning(f"User {user} attempted to update offer but is not a transporter")
            raise PermissionDenied("Sadece taşıyıcı kullanıcılar tekliflerini güncelleyebilir")
        
        # Sadece kendi tekliflerini güncelleyebilir
        if offer.transporter != user.transporter:
            logger.warning(f"User {user} attempted to update another transporter's offer")
            raise PermissionDenied("Sadece kendi tekliflerinizi güncelleyebilirsiniz")
            
        # Sadece 'pending' durumundaki teklifler güncellenebilir
        if offer.status != 'pending':
            logger.warning(f"User {user} attempted to update non-pending offer {offer.id}")
            raise PermissionDenied("Sadece bekleyen teklifleri güncelleyebilirsiniz")
        
        # Transaction ile güncelleme
        with transaction.atomic():
            # İlanın durumunu kontrol et
            cargo_post = CargoPost.objects.select_for_update().get(id=offer.cargo_post.id)
            if cargo_post.status != 'active':
                logger.warning(f"User {user} attempted to update offer for non-active cargo post")
                raise PermissionDenied("Bu ilana ait teklifler artık güncellenemez çünkü ilan aktif değil")
                
            serializer.save()
            logger.info(f"Offer {offer.id} updated successfully by {user}")
    
    def perform_destroy(self, instance):
        """
        Teklif silme işlemi
        Sadece kendi tekliflerini ve sadece 'pending' durumundayken silebilirler
        """
        user = self.request.user
        
        # Taşıyıcı olmayanlar silemez
        if not hasattr(user, 'transporter'):
            logger.warning(f"User {user} attempted to delete offer but is not a transporter")
            raise PermissionDenied("Sadece taşıyıcı kullanıcılar tekliflerini silebilir")
        
        # Sadece kendi tekliflerini silebilir
        if instance.transporter != user.transporter:
            logger.warning(f"User {user} attempted to delete another transporter's offer")
            raise PermissionDenied("Sadece kendi tekliflerinizi silebilirsiniz")
            
        # Sadece 'pending' durumundaki teklifler silinebilir
        if instance.status != 'pending':
            logger.warning(f"User {user} attempted to delete non-pending offer {instance.id}")
            raise PermissionDenied("Sadece bekleyen teklifleri silebilirsiniz")
        
        # Teklif sayısını güncelle
        try:
            with transaction.atomic():
                cargo_post = CargoPost.objects.select_for_update().get(id=instance.cargo_post.id)
                if cargo_post.offer_count > 0:  # Sayı negatif olmasın
                    cargo_post.offer_count = F('offer_count') - 1
                    cargo_post.save(update_fields=['offer_count'])
                
                # Teklifi sil
                instance.delete()
                logger.info(f"Offer {instance.id} deleted successfully by {user}")
        except Exception as e:
            logger.error(f"Error deleting offer {instance.id}: {e}", exc_info=True)
            raise
    
    @action(detail=False, methods=['get'])
    def my_offers(self, request):
        """
        Taşıyıcının kendi tekliflerini listeler
        """
        user = request.user
        
        if not hasattr(user, 'transporter'):
            return Response(
                {"detail": "Bu endpoint sadece taşıyıcı kullanıcılar içindir"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        offers = Offer.objects.filter(transporter=user.transporter)
        page = self.paginate_queryset(offers)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(offers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def received_offers(self, request):
        """
        Yük sahibinin aldığı teklifleri listeler
        """
        user = request.user
        
        if not hasattr(user, 'cargo_owner'):
            return Response(
                {"detail": "Bu endpoint sadece yük sahibi kullanıcılar içindir"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        offers = Offer.objects.filter(cargo_owner=user.cargo_owner)
        page = self.paginate_queryset(offers)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(offers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_offers(self, request):
        """
        Bekleyen teklifleri listeler (rol bazlı)
        """
        user = request.user
        
        if hasattr(user, 'transporter'):
            offers = Offer.objects.filter(
                transporter=user.transporter,
                status='pending'
            )
        elif hasattr(user, 'cargo_owner'):
            offers = Offer.objects.filter(
                cargo_owner=user.cargo_owner,
                status='pending'
            )
        else:
            return Response(
                {"detail": "Yetkisiz erişim"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        page = self.paginate_queryset(offers)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(offers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Teklifi kabul et (sadece yük sahipleri)"""
        user = request.user
        
        if not hasattr(user, 'cargo_owner'):
            return Response(
                {"detail": "Sadece yük sahipleri teklif kabul edebilir"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        offer = self.get_object()
        
        # Transportation import'u ekleyin
        from transportation.models import Transportation
        
        # Transaction ile race condition'ı önle
        try:
            with transaction.atomic():
                # Teklifin kabul edilmesi
                if offer.accept(request.data.get('response_note', '')):
                    # Transportation nesne oluşturma mantığı
                    transportation_id = None
                    transportation = None
                    
                    try:
                        # Var olan taşıma kaydını kontrol et
                        try:
                            transportation = Transportation.objects.get(offer=offer)
                            transportation_id = transportation.id
                            logger.info(f"Found existing transportation {transportation_id} for offer {offer.id}")
                        except Transportation.DoesNotExist:
                            # Taşıma kaydı yoksa, yeni oluştur
                            logger.info(f"Creating new transportation for offer {offer.id}")
                            cargo_post = offer.cargo_post
                            
                            # Cargo post kontrolü
                            if not cargo_post:
                                logger.error(f"No cargo post found for offer {offer.id}")
                                raise ValueError("Teklif için cargo_post bulunamadı")
                            
                            # Güvenli değer atama fonksiyonu
                            def safe_get(obj, attr, default=None):
                                return getattr(obj, attr, default) if obj else default
                            
                            # Taşıma kaydı oluşturma
                            transportation = Transportation.objects.create(
                                offer=offer,
                                cargo_post=cargo_post,
                                cargo_owner=offer.cargo_owner,
                                transporter=offer.transporter,
                                price=offer.price,
                                status='awaiting_pickup',  # pending yerine awaiting_pickup kullan
                                pickup_address=safe_get(cargo_post, 'pickup_location', ''),
                                pickup_country='Türkiye',
                                delivery_address=safe_get(cargo_post, 'delivery_location', ''),
                                delivery_country='Türkiye',
                                estimated_pickup_date=safe_get(cargo_post, 'pickup_date'),
                                estimated_delivery_date=safe_get(cargo_post, 'delivery_date'),
                                cargo_type=safe_get(cargo_post, 'cargo_type', ''),
                                weight=safe_get(cargo_post, 'weight', 0),
                            )
                            
                            # Koordinatları aktar (güvenli)
                            if hasattr(cargo_post, 'pickup_latitude') and cargo_post.pickup_latitude is not None:
                                transportation.pickup_latitude = cargo_post.pickup_latitude
                            
                            if hasattr(cargo_post, 'pickup_longitude') and cargo_post.pickup_longitude is not None:
                                transportation.pickup_longitude = cargo_post.pickup_longitude
                            
                            if hasattr(cargo_post, 'delivery_latitude') and cargo_post.delivery_latitude is not None:
                                transportation.delivery_latitude = cargo_post.delivery_latitude
                            
                            if hasattr(cargo_post, 'delivery_longitude') and cargo_post.delivery_longitude is not None:
                                transportation.delivery_longitude = cargo_post.delivery_longitude
                            
                            transportation.save()
                            transportation_id = transportation.id
                            logger.info(f"Successfully created new transportation {transportation_id}")
                    
                    except Exception as trans_error:
                        logger.error(f"Error creating transportation for offer {offer.id}: {trans_error}", exc_info=True)
                    
                    return Response({
                        "message": "Teklif başarıyla kabul edildi",
                        "transportation_id": transportation_id
                    }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in offer accept process: {e}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Teklifi reddet (sadece yük sahipleri)
        """
        user = request.user
        
        if not hasattr(user, 'cargo_owner'):
            return Response(
                {"detail": "Sadece yük sahipleri teklif reddedebilir"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        offer = self.get_object()
        
        # Teklif bu kullanıcıya mı ait?
        if offer.cargo_owner != user.cargo_owner:
            return Response(
                {"detail": "Sadece size ait teklifleri reddedebilirsiniz"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Teklif beklemede mi?
        if offer.status != 'pending':
            return Response(
                {"detail": f"Bu teklif şu anda '{offer.get_status_display()}' durumunda olduğu için reddedilemez"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            with transaction.atomic():
                # Teklif sayısını azaltmak için ilan kilitleniyor
                cargo_post = CargoPost.objects.select_for_update().get(id=offer.cargo_post.id)
                
                # İsteğe bağlı yanıt notu
                response_note = request.data.get('response_note', '')
                
                # Teklifi reddet
                offer.status = 'rejected'
                offer.response_note = response_note
                offer.save()
                
                # Teklif sayısını azalt
                if cargo_post.offer_count > 0:
                    cargo_post.offer_count = F('offer_count') - 1
                    cargo_post.save(update_fields=['offer_count'])
            
            return Response(
                {"detail": "Teklif başarıyla reddedildi", "offer_id": offer.id},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error rejecting offer {offer.id}: {e}", exc_info=True)
            return Response(
                {"detail": f"Teklif reddedilirken bir hata oluştu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Teklifi iptal et (sadece taşıyıcılar kendi tekliflerini)
        """
        user = request.user
        
        if not hasattr(user, 'transporter'):
            return Response(
                {"detail": "Sadece taşıyıcılar teklif iptal edebilir"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        offer = self.get_object()
        
        # Teklif bu kullanıcıya mı ait?
        if offer.transporter != user.transporter:
            return Response(
                {"detail": "Sadece kendi tekliflerinizi iptal edebilirsiniz"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Teklif beklemede mi?
        if offer.status != 'pending':
            return Response(
                {"detail": f"Bu teklif şu anda '{offer.get_status_display()}' durumunda olduğu için iptal edilemez"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            with transaction.atomic():
                # Teklif sayısını azaltmak için ilan kilitleniyor
                cargo_post = CargoPost.objects.select_for_update().get(id=offer.cargo_post.id)
                
                # Teklifi iptal et
                offer.status = 'cancelled'
                offer.save()
                
                # Teklif sayısını azalt
                if cargo_post.offer_count > 0:
                    cargo_post.offer_count = F('offer_count') - 1
                    cargo_post.save(update_fields=['offer_count'])
            
            return Response(
                {"detail": "Teklif başarıyla iptal edildi", "offer_id": offer.id},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error cancelling offer {offer.id}: {e}", exc_info=True)
            return Response(
                {"detail": f"Teklif iptal edilirken bir hata oluştu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        """
        Teklifi geri çek (sadece taşıyıcılar kendi tekliflerini)
        """
        user = request.user
        
        if not hasattr(user, 'transporter'):
            return Response(
                {"detail": "Sadece taşıyıcılar tekliflerini geri çekebilir"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        offer = self.get_object()
        
        # Teklif bu kullanıcıya mı ait?
        if offer.transporter != user.transporter:
            return Response(
                {"detail": "Sadece kendi tekliflerinizi geri çekebilirsiniz"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Teklif beklemede mi?
        if offer.status != 'pending':
            return Response(
                {"detail": f"Bu teklif şu anda '{offer.get_status_display()}' durumunda olduğu için geri çekilemez"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            with transaction.atomic():
                # Offer modelindeki withdraw metodunu kullan
                if offer.withdraw():
                    # CargoPost'un offer_count değerini direkt olarak güncellemek yerine
                    # Offer modelinin withdraw() metodu içinde bu işlem yapılıyor
                    return Response(
                        {"detail": "Teklif başarıyla geri çekildi", "offer_id": offer.id},
                        status=status.HTTP_200_OK
                    )
                else:
                    return Response(
                        {"detail": "Teklif geri çekilemedi."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except Exception as e:
            logger.error(f"Error withdrawing offer {offer.id}: {e}", exc_info=True)
            return Response(
                {"detail": f"Teklif geri çekilirken bir hata oluştu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='transportation/(?P<transportation_id>[^/.]+)')
    def offers_for_transportation(self, request, transportation_id=None):
        """
        Belirli bir taşıma işlemindeki teklifleri listele
        """
        user = request.user
        
        try:
            from transportation.models import Transportation
            
            # Taşıma işlemini bul
            transportation = Transportation.objects.get(pk=transportation_id)
            
            # Erişim kontrolü
            if (hasattr(user, 'transporter') and transportation.transporter == user.transporter) or \
               (hasattr(user, 'cargo_owner') and transportation.cargo_post.cargo_owner == user.cargo_owner):
                # İlgili teklifleri getir
                offers = Offer.objects.filter(
                    cargo_post=transportation.cargo_post
                )
                
                serializer = self.get_serializer(offers, many=True)
                return Response(serializer.data)
            else:
                return Response(
                    {"detail": "Bu taşıma işlemine ait teklifleri görüntüleme yetkiniz yok"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Transportation.DoesNotExist:
            return Response(
                {"detail": "Taşıma işlemi bulunamadı"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error fetching offers for transportation {transportation_id}: {e}", exc_info=True)
            return Response(
                {"detail": f"Teklifler getirilirken bir hata oluştu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='cargo-post/(?P<cargo_post_id>[^/.]+)')
    def offers_for_cargo_post(self, request, cargo_post_id=None):
        """
        Belirli bir ilana ait teklifleri listele
        """
        user = request.user
        
        try:
            # İlanı bul
            cargo_post = CargoPost.objects.get(pk=cargo_post_id)
            
            # Erişim kontrolü
            if (hasattr(user, 'cargo_owner') and cargo_post.cargo_owner == user.cargo_owner) or \
               (hasattr(user, 'transporter') and 
                Offer.objects.filter(cargo_post=cargo_post, transporter=user.transporter).exists()):
                # İlgili teklifleri getir - taşıyıcılar sadece kendi tekliflerini görebilir
                if hasattr(user, 'transporter'):
                    offers = Offer.objects.filter(
                        cargo_post=cargo_post,
                        transporter=user.transporter
                    )
                else:
                    offers = Offer.objects.filter(cargo_post=cargo_post)
                
                serializer = self.get_serializer(offers, many=True)
                return Response(serializer.data)
            else:
                return Response(
                    {"detail": "Bu ilana ait teklifleri görüntüleme yetkiniz yok"},
                    status=status.HTTP_403_FORBIDDEN
                )
        except CargoPost.DoesNotExist:
            return Response(
                {"detail": "İlan bulunamadı"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error fetching offers for cargo post {cargo_post_id}: {e}", exc_info=True)
            return Response(
                {"detail": f"Teklifler getirilirken bir hata oluştu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def my_offers_count(self, request):
        """Taşıyıcının kendi tekliflerinin sayısını döndürür"""
        user = request.user
        
        if not hasattr(user, 'transporter'):
            return Response(
                {"detail": "Bu endpoint sadece taşıyıcı kullanıcılar içindir"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        count = Offer.objects.filter(transporter=user.transporter).count()
        return Response({"count": count})

    @action(detail=False, methods=['get'])
    def received_offers_count(self, request):
        """Yük sahibinin aldığı tekliflerin sayısını döndürür"""
        user = request.user
        
        if not hasattr(user, 'cargo_owner'):
            return Response(
                {"detail": "Bu endpoint sadece yük sahibi kullanıcılar içindir"},
                status=status.HTTP_403_FORBIDDEN
            )
            
        count = Offer.objects.filter(cargo_owner=user.cargo_owner).count()
        return Response({"count": count})