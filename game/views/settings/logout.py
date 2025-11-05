from django.http import JsonResponse
from django.contrib.auth import logout

def signout(request):
    user = request.user
    if not user.is_authenticated:       # 已经登出了
        return JsonResponse({
            'result': "success"
            })
    logout(request)
    return JsonResponse({
        'result': "success"
        })
