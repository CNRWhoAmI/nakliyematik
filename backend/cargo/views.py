from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django.db import transaction
from .models import CargoPost
from offer.models import Offer
from .serializers import CargoPostListSerializer, CargoPostDetailSerializer, CargoPostCreateSerializer
import logging

logger = logging.getLogger(__name__)

class CargoPostViewSet(viewsets.ModelViewSet):
    """
    Yük ilanları için ViewSet.
    GET, POST, PUT, PATCH, DELETE işlemlerini destekler.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """
        İşlem tipine göre uygun serializer'ı döndürür.
        Liste görünümleri için özet serializer, detay için tam serializer kullanır.
        """
        if self.action == 'create':
            return CargoPostCreateSerializer
        elif self.action in ['list', 'active', 'my_posts', 'my', 'my_dash', 'filtered']:
            return CargoPostListSerializer
        return CargoPostDetailSerializer

    def get_queryset(self):
        """
        Kullanıcı tipine göre filtrelenmiş queryset döndürür:
        - Yük sahipleri: Tüm aktif ilanları ve kendi tüm ilanlarını görür
        - Taşıyıcılar: Aktif ilanları veya kendilerine atanmış ilanları görür
        """
        user = self.request.user
        logger.debug(f"Current user: {user}, is_authenticated: {user.is_authenticated}")
        
        if not user.is_authenticated:
            return CargoPost.objects.none()
            
        if hasattr(user, 'cargo_owner'):
            logger.debug(f"User is cargo owner: {user.cargo_owner}")
            return CargoPost.objects.filter(
                Q(cargo_owner=user.cargo_owner) | Q(status='active')
            ).distinct().order_by('-created_at')
        elif hasattr(user, 'transporter'):
            logger.debug(f"User is transporter: {user.transporter}")
            return CargoPost.objects.filter(
                Q(status='active') | Q(selected_transporter=user.transporter)
            ).order_by('-created_at')
        return CargoPost.objects.none()
    
    def get_serializer_context(self):
        """
        Serializer'a ilave context bilgisi ekler - özellikle request nesnesini.
        """
        context = super().get_serializer_context()
        # Context zaten request içeriyor mu kontrol et
        if 'request' not in context:
            context['request'] = self.request
        return context

    def perform_create(self, serializer):
        """İlan oluştururken yük sahibi bilgisini otomatik ekle"""
        user = self.request.user
        
        if not hasattr(user, 'cargo_owner'):
            logger.warning(f"User {user} attempted to create cargo post but is not a cargo owner")
            raise PermissionDenied("Sadece yük sahibi kullanıcılar ilan oluşturabilir")
        
        try:
            # İlanı oluştur ve yük sahibi bilgisini otomatik ekle
            cargo_post = serializer.save(cargo_owner=user.cargo_owner)
            logger.info(f"Cargo post created successfully by {user}")
            return cargo_post
        except Exception as e:
            logger.error(f"Error creating cargo post: {e}", exc_info=True)
            raise
        
    def perform_update(self, serializer):
            """
            İlan güncelleme işlemi sırasında, kullanıcının sadece kendi ilanlarını güncelleyebilmesini sağlar.
            """
            user = self.request.user
            logger.info(f"Updating post by user: {user}")
            
            if not hasattr(user, 'cargo_owner'):
                logger.warning(f"User {user} attempted to update post but is not a cargo owner")
                raise PermissionDenied("Only cargo owners can update posts")
            
            # İlan sahibi kontrolü
            cargo_post = self.get_object()
            if cargo_post.cargo_owner != user.cargo_owner:
                logger.warning(f"User {user} attempted to update another owner's post")
                raise PermissionDenied("You can only update your own posts")
            
            # Frontend'den gelen veriyi düzenle
            data = self.request.data.copy()
            
            # required_vehicle boş veya null ise '' olarak ayarla
            if 'required_vehicle' not in data or data['required_vehicle'] is None:
                data['required_vehicle'] = ''
                
            # cargo_type kontrolü
            if 'cargo_type' in data:
                valid_cargo_types = dict(CargoPost.CARGO_TYPE_CHOICES).keys()
                if data['cargo_type'] not in valid_cargo_types:
                    data['cargo_type'] = 'general'  # varsayılan değer
                
            serializer.save()
            logger.info(f"Post updated successfully by {user}")

    def perform_destroy(self, instance):
        """
        İlan silme işlemi sırasında, kullanıcının sadece kendi ilanlarını silebilmesini sağlar.
        """
        user = self.request.user
        logger.info(f"Deleting post by user: {user}")
        
        if not hasattr(user, 'cargo_owner'):
            logger.warning(f"User {user} attempted to delete post but is not a cargo owner")
            raise PermissionDenied("Only cargo owners can delete posts")
        
        # İlan sahibi kontrolü
        if instance.cargo_owner != user.cargo_owner:
            logger.warning(f"User {user} attempted to delete another owner's post")
            raise PermissionDenied("You can only delete your own posts")
        
        instance.delete()
        logger.info(f"Post deleted successfully by {user}")
    
    def create(self, request, *args, **kwargs):
        """
        İlan oluşturma işlemi - hata mesajlarını daha iyi formatlama
        """
        try:
            # İstek verilerinde cargo_owner var mı kontrol et
            if 'cargo_owner' not in request.data:
                logger.debug("cargo_owner not found in request data, will be added in perform_create")
            
            # Request data'yı logla
            logger.debug(f"Request data: {request.data}")
            logger.debug(f"Request user: {request.user}, has cargo_owner: {hasattr(request.user, 'cargo_owner')}")
            if hasattr(request.user, 'cargo_owner'):
                logger.debug(f"User's cargo_owner ID: {request.user.cargo_owner.id}")
            
            return super().create(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error creating post: {e}", exc_info=True)
            if hasattr(e, 'detail'):
                return Response({'detail': str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            
            # Daha detaylı hata mesajı
            error_msg = str(e)
            status_code = status.HTTP_400_BAD_REQUEST
            
            if isinstance(e, PermissionDenied):
                status_code = status.HTTP_403_FORBIDDEN
            
            # Eğer validation error varsa, serileştir
            if hasattr(e, 'get_full_details'):
                error_msg = e.get_full_details()
            
            return Response({'detail': error_msg}, status=status_code)
            
    def update(self, request, *args, **kwargs):
        """
        İlan güncelleme işlemi - hata mesajlarını daha iyi formatlama
        """
        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error updating post: {e}", exc_info=True)
            if hasattr(e, 'detail'):
                return Response({'detail': str(e.detail)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def retrieve(self, request, *args, **kwargs):
        """
        İlan detaylarını getirirken ek izin kontrolü yapar.
        """
        try:
            instance = self.get_object()
            # İlan görüntüleme sayısını artır
            if hasattr(instance, 'increment_view_count'):
                instance.increment_view_count()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in retrieve: {e}", exc_info=True)
            return Response(
                {"detail": "An error occurred while fetching the post"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Sadece aktif ilanları görüntülemek için özel endpoint.
        /api/cargo/posts/active/ URL'inde erişilebilir.
        """
        logger.info(f"Active posts requested by: {request.user}")
        try:
            # Filtreleme parametrelerini al
            params = request.query_params
            
            # Temel filtreleri başlat - aktif ilanlar
            posts = CargoPost.objects.filter(status='active')
            
            # Filtreleri uygula
            posts = self._apply_filters(posts, params)
            
            page = self.paginate_queryset(posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(posts, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in active posts: {e}", exc_info=True)
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def filtered(self, request):
        """
        Filtrelenmiş ilanları getirmek için özel endpoint.
        /api/cargo/posts/filtered/ URL'inde erişilebilir.
        """
        logger.info(f"Filtered posts requested by: {request.user}")
        try:
            # Filtreleme parametrelerini al
            params = request.query_params
            
            # Temel filtreleri başlat - aktif ilanlar
            posts = CargoPost.objects.filter(status='active')
            
            # Filtreleri uygula
            posts = self._apply_filters(posts, params)
            
            # Sıralama seçeneği eklendi
            sort_by = params.get('sort_by', '-created_at')
            valid_sort_fields = ['created_at', '-created_at', 'price', '-price', 'offer_count', '-offer_count']
            
            if sort_by in valid_sort_fields:
                posts = posts.order_by(sort_by)
            else:
                posts = posts.order_by('-created_at')  # Varsayılan sıralama
                
            logger.debug(f"Found {posts.count()} filtered posts")
            
            page = self.paginate_queryset(posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(posts, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in filtered posts: {e}", exc_info=True)
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _apply_filters(self, queryset, params):
        """
        Verilen query parametrelerine göre filtreleri uygular.
        Bu fonksiyon tüm filtreleme işlemleri için ortak kod sağlar.
        """
        # Query parametrelerini al
        keyword = params.get('keyword', None)
        pickup_location = params.get('pickup_location', None)
        delivery_location = params.get('delivery_location', None)
        cargo_type = params.get('cargo_type', None)
        has_offers = params.get('hasOffers', None)
        no_offers = params.get('noOffers', None)
        price_min = params.get('priceMin', None)
        price_max = params.get('priceMax', None)
        date_min = params.get('dateMin', None)
        date_max = params.get('dateMax', None)
        
        # Anahtar kelime araması
        if keyword:
            queryset = queryset.filter(
                Q(title__icontains=keyword) | 
                Q(description__icontains=keyword)
            )
        
        # Konumlar
        if pickup_location:
            queryset = queryset.filter(pickup_location__icontains=pickup_location)
            
        if delivery_location:
            queryset = queryset.filter(delivery_location__icontains=delivery_location)
        
        # Yük tipi
        if cargo_type:
            queryset = queryset.filter(cargo_type=cargo_type)
        
        # Teklif sayısı filtreleri
        if has_offers == 'true':
            queryset = queryset.filter(offer_count__gt=0)
        
        if no_offers == 'true':
            queryset = queryset.filter(offer_count=0)
        
        # Fiyat aralığı
        if price_min:
            try:
                price_min = float(price_min)
                queryset = queryset.filter(price__gte=price_min)
            except (ValueError, TypeError):
                logger.warning(f"Invalid price_min value: {price_min}")
                
        if price_max:
            try:
                price_max = float(price_max)
                queryset = queryset.filter(price__lte=price_max)
            except (ValueError, TypeError):
                logger.warning(f"Invalid price_max value: {price_max}")
        
        # Tarih aralığı - yükleme tarihi için
        if date_min:
            try:
                queryset = queryset.filter(pickup_date__gte=date_min)
            except Exception as e:
                logger.warning(f"Invalid date_min value: {date_min}, error: {e}")
                
        if date_max:
            try:
                queryset = queryset.filter(pickup_date__lte=date_max)
            except Exception as e:
                logger.warning(f"Invalid date_max value: {date_max}, error: {e}")
        
        return queryset

    @action(detail=False, methods=['get'], url_path='my-posts')
    def my_dash(self, request):
        """
        Frontend'in beklediği my-posts URL'i için endpoint.
        /api/cargo/posts/my-posts/ URL'inde erişilebilir.
        """
        return self._get_user_posts(request)
    
    @action(detail=False, methods=['get'])
    def my(self, request):
        """
        Frontend'in beklediği alternatif URL için endpoint.
        /api/cargo/posts/my/ URL'inde erişilebilir.
        """
        return self._get_user_posts(request)
    
    @action(detail=False, methods=['get'])
    def my_posts(self, request):
        """
        Kullanıcının kendi ilanlarını görüntülemek için özel endpoint.
        /api/cargo/posts/my_posts/ URL'inde erişilebilir.
        """
        return self._get_user_posts(request)
    
    def _get_user_posts(self, request):
        """
        Kullanıcının kendi ilanlarını getiren ortak fonksiyon.
        my, my-posts ve my_posts action'ları tarafından kullanılır.
        """
        user = request.user
        logger.info(f"Fetching posts for user: {user}")
        
        if not hasattr(user, 'cargo_owner'):
            logger.warning(f"User {user} attempted to view own posts but is not a cargo owner")
            return Response(
                {"detail": "Only cargo owners can view their posts"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Sadece kullanıcının kendi ilanlarını getir (aktif olup olmadığına bakılmaksızın)
            posts = CargoPost.objects.filter(cargo_owner=user.cargo_owner).order_by('-created_at')
            
            # Filtreleme parametrelerini al ve uygula
            params = request.query_params
            if params:
                posts = self._apply_filters(posts, params)
                
            logger.debug(f"Found {posts.count()} posts for user {user}")
            
            page = self.paginate_queryset(posts)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(posts, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching user posts: {e}", exc_info=True)
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def my_posts_count(self, request):
        """Yük sahibinin ilanlarının sayısını döndürür"""
        user = request.user
        
        if not hasattr(user, 'cargo_owner'):
            return Response(
                {"detail": "Bu işlem için yük sahibi yetkisi gereklidir"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 'owner' yerine 'cargo_owner' alanını kullanmalıyız
        count = CargoPost.objects.filter(cargo_owner=user.cargo_owner).count()
        return Response({"count": count})


# Bu sınıf artık gerekli değil çünkü viewset action'ları kullanıyoruz
# Ancak önceden yapılan URL yapılandırması için koruyoruz
class MyCargoPostsView(generics.ListAPIView):
    """
    Kullanıcının kendi ilanları için ayrı bir view.
    /api/cargo/posts/my/ URL düzenlenmesi için kullanılır.
    Tüm işlevsellik artık CargoPostViewSet içindeki action'larda.
    """
    serializer_class = CargoPostListSerializer
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        """
        Kullanıcının kendi ilanlarını döndürür.
        """
        user = self.request.user
        logger.info(f"MyCargoPostsView: Fetching posts for user {user}")
        
        if not hasattr(user, 'cargo_owner'):
            logger.warning(f"User {user} attempted to access MyCargoPostsView but is not a cargo owner")
            return CargoPost.objects.none()
        
        posts = CargoPost.objects.filter(cargo_owner=user.cargo_owner).order_by('-created_at')
        logger.debug(f"Found {posts.count()} posts for cargo owner {user.cargo_owner}")
        return posts
    
    def list(self, request, *args, **kwargs):
        """
        İlan listesini döndürmeden önce kullanıcı tipini kontrol eder.
        """
        user = request.user
        if not hasattr(user, 'cargo_owner'):
            logger.warning(f"Access denied: User {user} is not a cargo owner")
            return Response(
                {"detail": "Only cargo owners can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().list(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_filtered_posts(request):
    """
    Filtrelenmiş ilanları getiren özel API endpoint fonksiyonu.
    Bu varsayılan ViewSet dışında ek bir endpoint olarak kullanılabilir.
    """
    try:
        # Temel filtreleri başlat - aktif ilanlar
        posts = CargoPost.objects.filter(status='active')
        
        # Query parametrelerini al
        params = request.query_params
        
        # Anahtar kelime araması
        keyword = params.get('keyword', None)
        if keyword:
            posts = posts.filter(
                Q(title__icontains=keyword) | 
                Q(description__icontains=keyword)
            )
        
        # Konumlar
        pickup_location = params.get('pickup_location', None)
        if pickup_location:
            posts = posts.filter(pickup_location__icontains=pickup_location)
            
        delivery_location = params.get('delivery_location', None)
        if delivery_location:
            posts = posts.filter(delivery_location__icontains=delivery_location)
        
        # Yük tipi
        cargo_type = params.get('cargo_type', None)
        if cargo_type:
            posts = posts.filter(cargo_type=cargo_type)
        
        # Teklif sayısı filtreleri
        has_offers = params.get('hasOffers', None)
        if has_offers == 'true':
            posts = posts.filter(offer_count__gt=0)
        
        no_offers = params.get('noOffers', None)
        if no_offers == 'true':
            posts = posts.filter(offer_count=0)
        
        # Fiyat aralığı
        price_min = params.get('priceMin', None)
        if price_min:
            try:
                price_min = float(price_min)
                posts = posts.filter(price__gte=price_min)
            except (ValueError, TypeError):
                pass
                
        price_max = params.get('priceMax', None)
        if price_max:
            try:
                price_max = float(price_max)
                posts = posts.filter(price__lte=price_max)
            except (ValueError, TypeError):
                pass
        
        # Tarih filtreleri
        date_min = params.get('dateMin', None)
        if date_min:
            try:
                posts = posts.filter(pickup_date__gte=date_min)
            except Exception:
                pass
                
        date_max = params.get('dateMax', None)
        if date_max:
            try:
                posts = posts.filter(pickup_date__lte=date_max)
            except Exception:
                pass
        
        # Sıralama 
        sort_by = params.get('sort_by', '-created_at')
        valid_sort_fields = ['created_at', '-created_at', 'price', '-price', 'offer_count', '-offer_count']
        
        if sort_by in valid_sort_fields:
            posts = posts.order_by(sort_by)
        else:
            posts = posts.order_by('-created_at')  # Varsayılan sıralama
        
        # Sonuçları serialize et ve dön
        serializer = CargoPostListSerializer(posts, many=True)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Error in get_filtered_posts: {e}", exc_info=True)
        return Response(
            {"detail": "An error occurred while filtering posts"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )