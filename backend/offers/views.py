from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

# Diğer view'ların yanına ekleyin
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_offers_count(request):
    """Kullanıcının verdiği tekliflerin sayısını döndürür"""
    count = Offer.objects.filter(transporter__user=request.user).count()
    return Response({'count': count})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def received_offers_count(request):
    """Yük sahibinin aldığı tekliflerin sayısını döndürür"""
    count = Offer.objects.filter(cargo_post__owner__user=request.user).count()
    return Response({'count': count})