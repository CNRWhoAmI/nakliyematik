"""
Authentication API endpoints for Nakliyematik application.
Includes JWT token handling with cookie-based authentication.
"""
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from Profile.models import CargoOwner, Transporter
from .utils import generate_access_token, generate_refresh_token, set_token_cookies

# Logger ayarla
logger = logging.getLogger(__name__)
User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token endpoint that checks if user exists and sets tokens as cookies.
    """
    def post(self, request, *args, **kwargs):
        try:
            # Kullanıcı var mı kontrol et
            username = request.data.get('username')
            logger.info(f"Login attempt for user: {username}")
            
            # Kullanıcı varlığını kontrol et (kullanıcı adı veya eposta)
            user_exists = User.objects.filter(
                Q(username=username) | Q(email=username)
            ).exists()
            
            if not user_exists:
                logger.warning(f"Login failed: User '{username}' does not exist")
                return Response(
                    {"detail": "Kullanıcı Adı Veya Şifre Bulunamadı. Lütfen Tekrar Deneyin."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            # Serializer ve token oluştur
            try:
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                user = serializer.user
                
                # TokenObtainPairSerializer validasyonu başarılı olursa, verileri al
                data = serializer.validated_data
                
                # Domain bilgisi
                domain = settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN')
                
                # Production ve development ortamları için farklı ayarlar
                is_production = settings.ENVIRONMENT == 'production'
                secure = settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE', is_production)
                
                # SameSite ayarı - development ortamında None olabilir
                samesite = settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE', 'Lax')
                
                # HTTP-only özelliği
                httponly = settings.SIMPLE_JWT.get('AUTH_COOKIE_HTTP_ONLY', True)
                
                # Path ayarı
                path = settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH', '/')
                
                # Access token cookie'si ayarla
                response = Response(data)
                response.set_cookie(
                    key=settings.SIMPLE_JWT['AUTH_COOKIE'],
                    value=data['access'],
                    expires=timezone.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
                    secure=secure,
                    httponly=httponly,
                    samesite=samesite,
                    domain=domain,
                    path=path
                )
                
                # Refresh token cookie'si ayarla
                response.set_cookie(
                    key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
                    value=data['refresh'],
                    expires=timezone.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
                    secure=secure,
                    httponly=httponly,
                    samesite=samesite,
                    domain=domain,
                    path=path
                )
                
                # Kullanıcı verilerini ekle
                user_type = "unknown"
                
                # Kullanıcı türünü tespit et
                if hasattr(user, 'cargo_owner'):
                    user_type = "cargo_owner"
                    profile = user.cargo_owner
                elif hasattr(user, 'transporter'):
                    user_type = "transporter"
                    profile = user.transporter
                
                # Response'a kullanıcı bilgilerini ekle
                response.data.update({
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'user_type': user_type,
                    }
                })
                
                logger.info(f"Login successful for user: {username}")
                return response
                
            except TokenError as e:
                logger.error(f"Token error: {str(e)}")
                return Response({'detail': 'Token error'}, status=status.HTTP_401_UNAUTHORIZED)
                
            except InvalidToken as e:
                logger.error(f"Invalid token: {str(e)}")
                return Response(
                    {"detail": "Kullanıcı Adı Veya Şifreniz Yanlış. Lütfen tekrar deneyin."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            logger.error(f"Login error: {str(e)}", exc_info=True)
            return Response(
                {"detail": "Giriş yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomTokenRefreshView(TokenRefreshView):
    """
    Custom token refresh view that reads the refresh token from cookies.
    """
    def post(self, request, *args, **kwargs):
        # Çerezlerden refresh token'ı kontrol et
        refresh_cookie = request.COOKIES.get(settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH'))
        logger.debug(f"Refresh token cookie: {'Mevcut' if refresh_cookie else 'YOK'}")
        logger.debug(f"Tüm çerezler: {request.COOKIES}")
        
        try:
            # Eğer body'de refresh yoksa, cookie'den almayı dene
            request_data = request.data.copy()
            
            if 'refresh' not in request_data or not request_data['refresh']:
                refresh_token = request.COOKIES.get(settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH'))
                if refresh_token:
                    logger.debug(f"Refresh token çerezden alındı (ilk {10} karakter): {refresh_token[:10]}...")
                    request_data['refresh'] = refresh_token
                else:
                    logger.warning("Refresh token çerezi eksik!")
                    return Response(
                        {'error': 'Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
            
            # Serializer'ı çalıştır
            serializer = self.get_serializer(data=request_data)
            
            try:
                serializer.is_valid(raise_exception=True)
                validated_data = serializer.validated_data
                
                # Yanıtı oluştur
                response = Response(validated_data, status=status.HTTP_200_OK)
                
                # Çerezleri güncelle
                if 'access' in validated_data:
                    response.set_cookie(
                        settings.SIMPLE_JWT.get('AUTH_COOKIE'),
                        validated_data['access'],
                        max_age=settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME').total_seconds(),
                        httponly=settings.SIMPLE_JWT.get('AUTH_COOKIE_HTTP_ONLY'),
                        secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE'),
                        samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE'),
                        path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH'),
                        domain=settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN')
                    )
                
                if 'refresh' in validated_data:
                    response.set_cookie(
                        settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH'),
                        validated_data['refresh'],
                        max_age=settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME').total_seconds(),
                        httponly=settings.SIMPLE_JWT.get('AUTH_COOKIE_HTTP_ONLY'),
                        secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE'),
                        samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE'),
                        path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH'),
                        domain=settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN')
                    )
                
                # Başarı mesajı ekle
                response.data.update({
                    'success': True,
                    'message': 'Token refresh successful'
                })
                
                return response
                
            except TokenError as e:
                logger.error(f"Token doğrulama hatası: {str(e)}")
                return Response(
                    {'error': 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            logger.error(f"Token refresh hatası: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Oturum yenileme sırasında bir hata oluştu. Lütfen tekrar giriş yapın.'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    """
    Kullanıcının çıkış yapmasını ve token çerezlerinin temizlenmesini sağlar.
    """
    permission_classes = [AllowAny]  # IsAuthenticated yerine AllowAny kullanıldı (çerez olmasa da çıkış yapabilmek için)
    
    def post(self, request):
        try:
            # Kullanıcı bilgisini log'a yaz
            user_id = request.user.id if request.user.is_authenticated else 'anonymous'
            logger.info(f"Logout request from user: {user_id}")
            
            # Refresh token'ı çerezden al
            refresh_token = request.COOKIES.get(settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH'))
            
            if refresh_token:
                # Token'ı blacklist'e ekle
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                    logger.info(f"Token blacklisted successfully")
                except Exception as e:
                    logger.error(f"Error blacklisting token: {e}")
            else:
                logger.warning("No refresh token found in cookies")
            
            # Yanıtı oluştur
            response = Response({"success": True, "message": "Çıkış başarılı"})
            
            # Çerezleri temizle
            response.delete_cookie(settings.SIMPLE_JWT.get('AUTH_COOKIE'))
            response.delete_cookie(settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH'))
            
            return response
            
        except Exception as e:
            logger.error(f"Logout error: {e}", exc_info=True)
            
            # Her durumda çerezleri temizle
            response = Response(
                {"success": False, "error": "Çıkış sırasında bir hata oluştu, ancak oturum sonlandırıldı."},
                status=status.HTTP_200_OK  # Hata olsa bile başarılı döndür
            )
            
            # Çerezleri temizle
            response.delete_cookie(settings.SIMPLE_JWT.get('AUTH_COOKIE'))
            response.delete_cookie(settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH'))
            
            return response


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Yeni kullanıcı kayıt view'i.
    Kullanıcı hesabı oluşturur.
    """
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        user_type = request.data.get('user_type')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        
        # Zorunlu alanları kontrol et
        if not all([username, password, email]):
            return Response(
                {'error': 'Kullanıcı adı, şifre ve e-posta zorunludur.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Kullanıcı adının benzersiz olduğunu kontrol et
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Bu kullanıcı adı zaten kullanılıyor.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Email'in benzersiz olduğunu kontrol et
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'Bu e-posta adresi zaten kayıtlı.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Kullanıcıyı oluştur
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        
        # Kullanıcı tipini işle
        if user_type == 'cargo_owner':
            CargoOwner.objects.create(user=user)
        elif user_type == 'transporter':
            Transporter.objects.create(user=user)
        
        logger.info(f"Kullanıcı başarıyla kaydedildi: {username}, türü: {user_type}")
        
        return Response(
            {
                'success': True, 
                'message': 'Kullanıcı başarıyla kaydedildi',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'user_type': user_type
                }
            },
            status=status.HTTP_201_CREATED
        )
        
    except Exception as e:
        logger.error(f"Kayıt hatası: {e}", exc_info=True)
        return Response(
            {'error': 'Kayıt sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_data(request):
    user = request.user
    
    try:
        # Kullanıcı tipini belirle
        user_type = 'unknown'
        profile_data = {}
        
        # Kullanıcı tipini kontrol et
        try:
            if hasattr(user, 'cargo_owner'):
                user_type = 'cargo_owner'
                profile = user.cargo_owner
                profile_data = {
                    'company_name': profile.company_name,
                    'phone': profile.phone,
                    'tax_number': profile.tax_number,
                    'address': profile.address,
                }
            elif hasattr(user, 'transporter'):
                user_type = 'transporter'
                profile = user.transporter
                profile_data = {
                    'company_name': profile.company_name,
                    'phone': profile.phone,
                    'tax_number': profile.tax_number,
                    'address': profile.address,
                }
            else:
                profile_data = {}
        except Exception as e:
            logger.error(f"Kullanıcı profili belirlenirken hata: {e}")
            profile_data = {}
        
        # Kullanıcı verilerini hazırla
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user_type,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile': profile_data
        }
        
        return Response({
            'success': True,
            'user': user_data
        })
    
    except Exception as e:
        logger.error(f"Kullanıcı bilgisi alınırken hata: {e}", exc_info=True)
        return Response(
            {'error': 'Kullanıcı bilgisi alınırken bir hata oluştu.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def check_registration_fields(request):
    """
    Kayıt sırasında alan kontrolü yapar:
    - Kullanıcı adı kontrolü
    - E-posta kontrolü
    - Telefon kontrolü
    - Vergi numarası kontrolü
    """
    data = request.data
    errors = {}
    
    logger.info(f"Kayıt alanları kontrol ediliyor: {data}")
    
    # Kullanıcı adı kontrolü
    if 'username' in data and data['username']:
        username = data['username']
        if User.objects.filter(username=username).exists():
            errors['username'] = 'Bu kullanıcı adı zaten kullanılıyor.'
    
    # E-posta kontrolü
    if 'email' in data and data['email']:
        email = data['email']
        if User.objects.filter(email=email).exists():
            errors['email'] = 'Bu e-posta adresi zaten kayıtlı.'
    
    # Telefon kontrolü (CargoOwner ve Transporter tablolarında da kontrol et)
    if 'phone' in data and data['phone']:
        phone = data['phone']
        
        # Cargo owner'larda kontrol
        if CargoOwner.objects.filter(phone=phone).exists():
            errors['phone'] = 'Bu telefon numarası zaten bir yük sahibi tarafından kullanılıyor.'
        
        # Transporter'larda kontrol
        if Transporter.objects.filter(phone=phone).exists():
            errors['phone'] = 'Bu telefon numarası zaten bir taşıyıcı tarafından kullanılıyor.'
    
    # Vergi numarası kontrolü
    if 'tax_number' in data and data['tax_number']:
        tax_number = data['tax_number']
        
        # Cargo owner'larda kontrol
        if CargoOwner.objects.filter(tax_number=tax_number).exists():
            errors['tax_number'] = 'Bu vergi numarası zaten bir yük sahibi tarafından kullanılıyor.'
        
        # Transporter'larda kontrol
        if Transporter.objects.filter(tax_number=tax_number).exists():
            errors['tax_number'] = 'Bu vergi numarası zaten bir taşıyıcı tarafından kullanılıyor.'
    
    # Eğer herhangi bir hata varsa 400 Bad Request döndür
    if errors:
        logger.warning(f"Kayıt alan kontrolü başarısız: {errors}")
        return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
    
    # Hata yoksa 200 OK döndür
    logger.info("Tüm kayıt alanları geçerli")
    return Response({'message': 'Tüm alanlar kullanılabilir.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def check_user_exists(request):
    """
    Kullanıcı adının sistemde olup olmadığını kontrol eder.
    Login öncesi kullanıcıya geri bildirim sağlamak için.
    """
    username = request.data.get('username')
    if not username:
        return Response(
            {'error': 'Kullanıcı adı gereklidir.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Kullanıcı adı veya email ile kontrol et
    user_exists = User.objects.filter(
        Q(username=username) | Q(email=username)
    ).exists()
    
    if user_exists:
        return Response({'exists': True})
    else:
        return Response(
            {
                'exists': False, 
                'message': 'Bu kullanıcı sistemde kayıtlı değil. Lütfen önce kayıt olun.'
            }, 
            status=status.HTTP_404_NOT_FOUND
        )


from datetime import datetime
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from .utils import send_password_reset_email, verify_reset_token

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'E-posta adresi girmek zorunludur.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Kullanıcıyı e-posta adresine göre bul
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Güvenlik için kullanıcı bulunamasa bile başarılı yanıt döndür
            return Response({
                'success': True,
                'message': 'Şifre sıfırlama talimatları e-posta adresinize gönderilmiştir, lütfen gelen kutunuzu kontrol edin.'
            })
        
        # Şifre sıfırlama e-postası gönder
        send_password_reset_email(user, request)
        
        return Response({
            'success': True,
            'message': 'Şifre sıfırlama talimatları e-posta adresinize gönderilmiştir, lütfen gelen kutunuzu kontrol edin.'
        })

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not uidb64 or not token or not new_password:
            return Response(
                {'error': 'Tüm parametreler gereklidir.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Tokeni doğrula
        user = verify_reset_token(uidb64, token)
        
        if not user:
            return Response(
                {'error': 'Geçersiz veya süresi dolmuş token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Şifreyi güncelle
        user.set_password(new_password)
        user.save()
        
        # Token kullanıldı - bu noktadan sonra aynı token tekrar kullanılamaz 
        # (şifre değiştiği için hash değeri değişecek ve token otomatik geçersiz olacak)
        
        return Response({
            'success': True,
            'message': 'Şifreniz başarıyla güncellenmiştir. Yeni şifrenizle giriş yapabilirsiniz.'
        })