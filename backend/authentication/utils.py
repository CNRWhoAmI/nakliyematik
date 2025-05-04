import jwt
import datetime
from django.conf import settings
import secrets
import string
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.urls import reverse
from datetime import timedelta
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

def generate_access_token(user):
    """
    Kullanıcı için JWT access token oluşturur
    """
    access_token_payload = {
        'user_id': user.id,
        'username': user.username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15),  # 15 dakika geçerlilik
        'iat': datetime.datetime.utcnow(),
        'token_type': 'access'
    }
    access_token = jwt.encode(
        access_token_payload,
        settings.SECRET_KEY,
        algorithm='HS256'
    )
    return access_token

def generate_refresh_token(user):
    """
    Kullanıcı için JWT refresh token oluşturur
    """
    refresh_token_payload = {
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),  # 7 gün geçerlilik
        'iat': datetime.datetime.utcnow(),
        'token_type': 'refresh'
    }
    refresh_token = jwt.encode(
        refresh_token_payload,
        settings.SECRET_KEY,
        algorithm='HS256'
    )
    return refresh_token

def set_token_cookies(response, access_token, refresh_token):
    """
    Response nesnesine HTTP-only cookie olarak token'ları ekler
    """
    # Access token - kısa ömürlü
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.SECURE_COOKIES, # Production'da True olmalı
        samesite=settings.COOKIE_SAMESITE,  # 'Lax' veya 'None' veya 'Strict'
        max_age=15 * 60,  # 15 dakika
    )
    
    # Refresh token - uzun ömürlü
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite=settings.COOKIE_SAMESITE,
        max_age=7 * 24 * 60 * 60,  # 7 gün
    )
    
    return response

# Token generator sınıfını güncelle
class TokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        # Şifre son değiştirilme zamanını hash'e dahil et
        login_timestamp = '' if user.last_login is None else user.last_login.replace(microsecond=0, tzinfo=None)
        password_timestamp = user.password.split('$')[1] if '$' in user.password else ''
        return f"{user.pk}{timestamp}{login_timestamp}{password_timestamp}{user.is_active}"

# Token generator örneği oluşturma
password_reset_token = TokenGenerator()

def send_password_reset_email(user, request=None):
    """Kullanıcıya HTML butonlu şifre sıfırlama e-postası gönderir"""
    # Kullanıcı ID'sini güvenli şekilde encode etme
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    # Token oluşturma
    token = password_reset_token.make_token(user)
    
    # Frontend URL'i oluştur
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
    
    # Düz metin içeriği (spam filtreleri için önemli)
    plain_text = f"""
Merhaba {user.first_name or user.username},

Nakliyematik hesabınız için şifre sıfırlama talebinde bulundunuz.
Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:

{reset_url}

Bu bağlantı 10 dakika sonra geçerliliğini yitirecektir.

Eğer şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı dikkate almayın.

Saygılarımızla,
Nakliyematik Ekibi
    """
    
    # HTML içeriği
    html_content = f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Şifre Sıfırlama</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .container {{
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
            background-color: #f9f9f9;
        }}
        .header {{
            text-align: center;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
            margin-bottom: 20px;
        }}
        .btn {{
            display: inline-block;
            background-color: #1976d2;
            color: white;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 4px;
            font-weight: bold;
            margin: 20px 0;
        }}
        .footer {{
            margin-top: 30px;
            font-size: 12px;
            text-align: center;
            color: #777;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Nakliyematik Şifre Sıfırlama</h2>
        </div>
        
        <p>Merhaba {user.first_name or user.username},</p>
        
        <p>Nakliyematik hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
        
        <div style="text-align: center;">
            <a href="{reset_url}" class="btn">Şifremi Sıfırla</a>
        </div>
        
        <p>Veya aşağıdaki bağlantıyı tarayıcınıza kopyalayın:</p>
        <p style="word-break: break-all; font-size: 14px;">{reset_url}</p>
        
        <p>Bu bağlantı <strong>10 dakika</strong> süreyle geçerlidir.</p>
        
        <p>Eğer şifre sıfırlama talebinde bulunmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
        
        <p>Saygılarımızla,<br>Nakliyematik Ekibi</p>
    </div>
    
    <div class="footer">
        <p>&copy; {datetime.datetime.now().year} Nakliyematik. Tüm Hakları Saklıdır.</p>
        <p>Bu e-posta, Nakliyematik şifre sıfırlama talebi sonucu gönderilmiştir.</p>
    </div>
</body>
</html>
    '''
    
    # E-postayı hem düz metin hem de HTML içerikle gönder
    return send_mail(
        'Nakliyematik - Şifre Sıfırlama',
        plain_text,  # Düz metin içerik
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        html_message=html_content,  # HTML içerik
        fail_silently=False,
    )

# Doğrulama fonksiyonunu güncelle
def verify_reset_token(uidb64, token):
    """Şifre sıfırlama tokenini doğrular"""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Kullanıcı ID'sini decode et
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
        
        # Token'ı doğrula
        if password_reset_token.check_token(user, token):
            return user
        return None
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None