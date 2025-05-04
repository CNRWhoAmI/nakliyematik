from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from .models import CargoOwner, Transporter
from .serializers import UserSerializer, CargoOwnerSerializer, TransporterSerializer
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class ProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)
    
    # PUT ve LIST metotlarını açıkça tanımlayarak sorunları çözelim
    def list(self, request, *args, **kwargs):
        """GET /profile/ endpoint'i için özel işlev"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """PUT /profile/ endpoint'i için özel işlev"""
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['GET', 'PUT', 'PATCH'])
    def me(self, request):
        """Current user's profile"""
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        
        elif request.method in ['PUT', 'PATCH']:
            logger.info(f"Updating user with data: {request.data}")
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            logger.warning(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CargoOwnerRegisterView(generics.CreateAPIView):
    # Yetkilendirmeyi kaldır, herkesin erişimine izin ver
    permission_classes = [AllowAny]
    serializer_class = CargoOwnerSerializer
    
    def create(self, request, *args, **kwargs):
        logger.info(f"Received cargo owner registration request: {request.data}")
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class TransporterRegisterView(generics.CreateAPIView):
    # Yetkilendirmeyi kaldır, herkesin erişimine izin ver
    permission_classes = [AllowAny]
    serializer_class = TransporterSerializer
    
    def create(self, request, *args, **kwargs):
        logger.info(f"Received transporter registration request: {request.data}")
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_data(request):
    """Detaylı kullanıcı verileri getir"""
    user = request.user
    user_data = UserSerializer(user).data
    
    # Kullanıcı tipine göre detaylı profil bilgilerini ekle
    if user.user_type == 'cargo_owner':
        try:
            cargo_owner = CargoOwner.objects.get(user=user)
            cargo_owner_data = CargoOwnerSerializer(cargo_owner).data
            
            # User nesnesini çıkar, zaten ana user_data içinde var
            if 'user' in cargo_owner_data:
                del cargo_owner_data['user']
                
            return Response({
                "success": True,
                "user": user_data,
                "cargo_owner": cargo_owner_data  # Detaylı cargo owner verileri
            })
        except CargoOwner.DoesNotExist:
            logger.warning(f"No cargo owner profile found for user {user.id}")
        except Exception as e:
            logger.error(f"Error fetching cargo owner details: {str(e)}")
            
    elif user.user_type == 'transporter':
        try:
            transporter = Transporter.objects.get(user=user)
            transporter_data = TransporterSerializer(transporter).data
            
            # User nesnesini çıkar, zaten ana user_data içinde var
            if 'user' in transporter_data:
                del transporter_data['user']
                
            return Response({
                "success": True, 
                "user": user_data,
                "transporter": transporter_data  # Detaylı transporter verileri
            })
        except Transporter.DoesNotExist:
            logger.warning(f"No transporter profile found for user {user.id}")
        except Exception as e:
            logger.error(f"Error fetching transporter details: {str(e)}")
            
    return Response({"success": True, "user": user_data})

class CargoOwnerViewSet(viewsets.ModelViewSet):
    """
    API endpoint for cargo owners
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CargoOwnerSerializer
    
    def get_queryset(self):
        return CargoOwner.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['GET', 'PUT'])
    def me(self, request):
        """Get or update current cargo owner's profile"""
        try:
            cargo_owner = CargoOwner.objects.get(user=request.user)
        except CargoOwner.DoesNotExist:
            return Response(
                {"detail": "You do not have a cargo owner profile."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            serializer = self.get_serializer(cargo_owner)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            # Kısmi güncellemeye izin vermek için partial=True
            serializer = self.get_serializer(cargo_owner, data=request.data, partial=True)
            if serializer.is_valid():
                try:
                    serializer.save()
                    return Response(serializer.data)
                except Exception as e:
                    logger.error(f"Error updating cargo owner: {str(e)}")
                    return Response(
                        {"detail": f"Error updating profile: {str(e)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['GET'], url_path='me/ratings')
    def my_ratings(self, request):
        """Get ratings for the current cargo owner"""
        try:
            cargo_owner = CargoOwner.objects.get(user=request.user)
            # Import here to avoid circular import
            try:
                from transportation.models import TransportationRating
                from transportation.serializers import TransportationRatingSerializer
                
                # Get all ratings for this cargo owner (from_cargo_owner=False means given TO cargo owner)
                ratings = TransportationRating.objects.filter(
                    transportation__cargo_owner=cargo_owner,
                    from_cargo_owner=False  # Ratings given by transporters to cargo owner
                ).order_by('-created_at')
                
                serializer = TransportationRatingSerializer(ratings, many=True)
                return Response(serializer.data)
            except ImportError:
                logger.error("Transportation app not found or models not properly set up")
                return Response([], status=status.HTTP_200_OK)  # Boş liste döndür
                
        except CargoOwner.DoesNotExist:
            return Response(
                {"detail": "You do not have a cargo owner profile."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error fetching cargo owner ratings: {str(e)}")
            return Response(
                {"detail": f"Error fetching ratings: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TransporterViewSet(viewsets.ModelViewSet):
    """
    API endpoint for transporters
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TransporterSerializer
    
    def get_queryset(self):
        return Transporter.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['GET', 'PUT'])
    def me(self, request):
        """Get or update current transporter's profile"""
        try:
            transporter = Transporter.objects.get(user=request.user)
        except Transporter.DoesNotExist:
            return Response(
                {"detail": "You do not have a transporter profile."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            serializer = self.get_serializer(transporter)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            data = request.data
            logger.info(f"Updating transporter with data: {data}")
            
            # Frontend'den farklı bir yapıda veri gelebilir, uyumlu hale getirelim
            user_data = {}
            for key in ['first_name', 'last_name', 'email']:
                if key in data.get('user', {}):
                    user_data[key] = data['user'][key]
                elif key in data:
                    user_data[key] = data[key]
            
            # Düzeltme: cargo_owner_data yerine transporter_data kullanmalıyız
            transporter_data = {}
            for key in ['company_name', 'phone', 'address', 'vehicle_type']:
                if key in data:
                    transporter_data[key] = data[key]
            
            # User ve transporter verilerini birleştir
            update_data = transporter_data
            if user_data:
                update_data['user'] = user_data
            
            # Kısmi güncellemeye izin vermek için partial=True
            serializer = self.get_serializer(transporter, data=update_data, partial=True)
            if serializer.is_valid():
                try:
                    serializer.save()
                    return Response(serializer.data)
                except Exception as e:
                    logger.error(f"Error updating transporter: {str(e)}")
                    return Response(
                        {"detail": f"Error updating profile: {str(e)}"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            logger.warning(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=False, methods=['GET'], url_path='me/ratings')
    def my_ratings(self, request):
        """Get ratings for the current transporter"""
        try:
            transporter = Transporter.objects.get(user=request.user)
            
            # Import here to avoid circular import
            try:
                from transportation.models import TransportationRating
                from transportation.serializers import TransportationRatingSerializer
                
                # Get all ratings for this transporter (from_cargo_owner=True means given TO transporter)
                ratings = TransportationRating.objects.filter(
                    transportation__transporter=transporter,
                    from_cargo_owner=True  # Rating given by cargo owner to transporter
                ).order_by('-created_at')
                
                serializer = TransportationRatingSerializer(ratings, many=True)
                return Response(serializer.data)
            except ImportError:
                logger.error("Transportation app not found or models not properly set up")
                return Response([], status=status.HTTP_200_OK)
                
        except Transporter.DoesNotExist:
            return Response(
                {"detail": "You do not have a transporter profile."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error fetching transporter ratings: {str(e)}")
            return Response(
                {"detail": f"Error fetching ratings: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Frontend'in istediği özel URL'lere uygun yeni view fonksiyonları
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def cargo_owner_profile_view(request):
    """Get or update cargo owner profile - Matches frontend URL expectations"""
    try:
        # Kullanıcının yük sahibi olup olmadığını kontrol et
        if request.user.user_type != 'cargo_owner':
            return Response(
                {"detail": "You are not registered as a cargo owner."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        cargo_owner = CargoOwner.objects.get(user=request.user)
    except CargoOwner.DoesNotExist:
        return Response(
            {"detail": "You do not have a cargo owner profile."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = CargoOwnerSerializer(cargo_owner)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = CargoOwnerSerializer(cargo_owner, data=request.data, partial=True)
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(serializer.data)
            except Exception as e:
                logger.error(f"Error updating cargo owner: {str(e)}")
                return Response(
                    {"detail": f"Error updating profile: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def transporter_profile_view(request):
    """Get or update transporter profile - Matches frontend URL expectations"""
    try:
        # Kullanıcının taşıyıcı olup olmadığını kontrol et
        if request.user.user_type != 'transporter':
            return Response(
                {"detail": "You are not registered as a transporter."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        transporter = Transporter.objects.get(user=request.user)
    except Transporter.DoesNotExist:
        return Response(
            {"detail": "You do not have a transporter profile."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = TransporterSerializer(transporter)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        data = request.data
        logger.info(f"Updating transporter with data: {data}")
        
        # Frontend'den farklı bir yapıda veri gelebilir, uyumlu hale getirelim
        user_data = {}
        for key in ['first_name', 'last_name', 'email']:
            if key in data.get('user', {}):
                user_data[key] = data['user'][key]
            elif key in data:
                user_data[key] = data[key]
        
        transporter_data = {}
        for key in ['company_name', 'phone', 'address', 'vehicle_type']:
            if key in data:
                transporter_data[key] = data[key]
        
        # User ve transporter verilerini birleştir
        update_data = transporter_data
        if user_data:
            update_data['user'] = user_data
        
        serializer = TransporterSerializer(transporter, data=update_data, partial=True)
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(serializer.data)
            except Exception as e:
                logger.error(f"Error updating transporter: {str(e)}")
                return Response(
                    {"detail": f"Error updating profile: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        logger.warning(f"Validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cargo_owner_ratings_view(request):
    """Get ratings for the cargo owner - Matches frontend URL expectations"""
    try:
        # Kullanıcı tipi kontrolü
        if request.user.user_type != 'cargo_owner':
            return Response(
                {"detail": "You are not registered as a cargo owner."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        cargo_owner = CargoOwner.objects.get(user=request.user)
        
        # Import here to avoid circular import
        try:
            from transportation.models import TransportationRating
            from transportation.serializers import TransportationRatingSerializer
            
            # Get all ratings for this cargo owner (from_cargo_owner=False means given TO cargo owner)
            ratings = TransportationRating.objects.filter(
                transportation__cargo_owner=cargo_owner,
                from_cargo_owner=False  # Ratings given by transporters to cargo owner
            ).order_by('-created_at')
            
            serializer = TransportationRatingSerializer(ratings, many=True)
            return Response(serializer.data)
        except ImportError:
            logger.error("Transportation app not found or models not properly set up")
            return Response([], status=status.HTTP_200_OK)
            
    except CargoOwner.DoesNotExist:
        return Response(
            {"detail": "You do not have a cargo owner profile."},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error fetching cargo owner ratings: {str(e)}")
        return Response(
            {"detail": f"Error fetching ratings: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transporter_ratings_view(request):
    """Get ratings for the transporter - Matches frontend URL expectations"""
    try:
        # Kullanıcı tipi kontrolü
        if request.user.user_type != 'transporter':
            return Response(
                {"detail": "You are not registered as a transporter."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        transporter = Transporter.objects.get(user=request.user)
        
        # Import here to avoid circular import
        try:
            from transportation.models import TransportationRating
            from transportation.serializers import TransportationRatingSerializer
            
            # Get all ratings for this transporter (from_cargo_owner=True means given TO transporter)
            ratings = TransportationRating.objects.filter(
                transportation__transporter=transporter,
                from_cargo_owner=True  # Ratings given by cargo owners to transporter
            ).order_by('-created_at')
            
            serializer = TransportationRatingSerializer(ratings, many=True)
            return Response(serializer.data)
        except ImportError:
            logger.error("Transportation app not found or models not properly set up")
            return Response([], status=status.HTTP_200_OK)
            
    except Transporter.DoesNotExist:
        return Response(
            {"detail": "You do not have a transporter profile."},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error fetching transporter ratings: {str(e)}")
        return Response(
            {"detail": f"Error fetching ratings: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_detail_view(request, user_id):
    """Get basic user information for display"""
    try:
        user = User.objects.get(id=user_id)
        
        # Create a limited response with non-sensitive information
        response_data = {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': user.phone,
            'address': user.address,
            'company_name': user.company_name,
            'user_type': user.user_type,
            'verified': True,  # Default olarak doğrulanmış kabul edelim
            'completed_jobs': 0  # Varsayılan değer
        }
        
        # Add additional profile information if available
        if user.user_type == 'cargo_owner':
            try:
                cargo_owner = CargoOwner.objects.get(user=user)
                response_data.update({
                    'company_name': cargo_owner.company_name,
                    'phone': cargo_owner.phone,
                    'address': cargo_owner.address,
                })
                
                # Tamamlanan taşıma sayısını getir
                try:
                    from transportation.models import Transportation
                    completed_count = Transportation.objects.filter(
                        cargo_owner=cargo_owner,
                        status='completed'
                    ).count()
                    
                    response_data['completed_jobs'] = completed_count
                except ImportError:
                    pass
                
                # Cargo owner değerlendirme bilgilerini ekle
                try:
                    from transportation.models import TransportationRating
                    from django.db.models import Avg, Count
                    
                    ratings = TransportationRating.objects.filter(
                        transportation__cargo_owner=cargo_owner,
                        from_cargo_owner=False  # Taşıyıcıların yük sahibine verdiği puanlar
                    )
                    
                    if ratings.exists():
                        rating_stats = ratings.aggregate(
                            rating_avg=Avg('rating'),
                            rating_count=Count('id')
                        )
                        
                        response_data.update({
                            'rating_avg': rating_stats['rating_avg'],
                            'rating_count': rating_stats['rating_count'],
                        })
                except ImportError:
                    pass
                
            except CargoOwner.DoesNotExist:
                pass
                
        elif user.user_type == 'transporter':
            try:
                transporter = Transporter.objects.get(user=user)
                response_data.update({
                    'company_name': transporter.company_name,
                    'phone': transporter.phone,
                    'address': transporter.address,
                    'vehicle_type': transporter.vehicle_type,
                })
                
                # Tamamlanan taşıma sayısını getir
                try:
                    from transportation.models import Transportation
                    completed_count = Transportation.objects.filter(
                        transporter=transporter,
                        status='completed'
                    ).count()
                    
                    response_data['completed_jobs'] = completed_count
                except ImportError:
                    pass
                
                # Transporter değerlendirme bilgilerini ekle
                try:
                    from transportation.models import TransportationRating
                    from django.db.models import Avg, Count
                    
                    ratings = TransportationRating.objects.filter(
                        transportation__transporter=transporter,
                        from_cargo_owner=True  # Yük sahiplerinin taşıyıcıya verdiği puanlar
                    )
                    
                    if ratings.exists():
                        rating_stats = ratings.aggregate(
                            rating_avg=Avg('rating'),
                            rating_count=Count('id')
                        )
                        
                        response_data.update({
                            'rating_avg': rating_stats['rating_avg'],
                            'rating_count': rating_stats['rating_count'],
                        })
                except ImportError:
                    pass
                
            except Transporter.DoesNotExist:
                pass
                
        return Response(response_data)
        
    except User.DoesNotExist:
        return Response(
            {"detail": "Kullanıcı bulunamadı"},
            status=status.HTTP_404_NOT_FOUND
        )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_ratings_view(request, user_id):
    """Get ratings for a specific user"""
    try:
        user = User.objects.get(id=user_id)
        
        # Değerlendirme bilgilerini almak için transportation app'i kullan
        try:
            from transportation.models import TransportationRating
            from transportation.serializers import TransportationRatingSerializer
            
            if user.user_type == 'cargo_owner':
                try:
                    cargo_owner = CargoOwner.objects.get(user=user)
                    # Taşıyıcıların yük sahibine verdikleri puanlar
                    ratings = TransportationRating.objects.filter(
                        transportation__cargo_owner=cargo_owner,
                        from_cargo_owner=False
                    ).order_by('-created_at')
                except CargoOwner.DoesNotExist:
                    return Response([], status=status.HTTP_200_OK)
                    
            elif user.user_type == 'transporter':
                try:
                    transporter = Transporter.objects.get(user=user)
                    # Yük sahiplerinin taşıyıcıya verdikleri puanlar
                    ratings = TransportationRating.objects.filter(
                        transportation__transporter=transporter,
                        from_cargo_owner=True
                    ).order_by('-created_at')
                except Transporter.DoesNotExist:
                    return Response([], status=status.HTTP_200_OK)
            else:
                return Response([], status=status.HTTP_200_OK)
            
            # Değerlendirmeleri serialize et ve döndür
            serializer = TransportationRatingSerializer(ratings, many=True)
            return Response(serializer.data)
            
        except ImportError:
            logger.error("Transportation app not found or models not properly set up")
            return Response([], status=status.HTTP_200_OK)
            
    except User.DoesNotExist:
        return Response(
            {"detail": "Kullanıcı bulunamadı"},
            status=status.HTTP_404_NOT_FOUND
        )