from django.http import JsonResponse
from django.contrib.auth import login
from django.contrib.auth.models import User
from game.models.player.player import Player

def register(request):
    data = request.GET
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    password_confirm = data.get("password_confirm", "").strip()
    if not username or not password:
        return JsonResponse({
            'result': "用户名或密码不能为空"
            })
    if password != password_confirm:
        return JsonResponse({
            'result': "输入的两次密码不一致"
            })
    if User.objects.filter(username=username).exists():
        return JsonResponse({
            'result': "用户名已存在！"
            })
    user = User(username=username)
    user.set_password(password)
    user.save()
    Player.objects.create(user=user, photo="https://ts3.tc.mm.bing.net/th/id/OIP-C.NwamPndfqz2IZkxK_5racwHaHa?rs=1&pid=ImgDetMain&o=7&rm=3")
    login(request, user)       # 顺便执行登录
    return JsonResponse({
        'result': "success"
        })
