from django.shortcuts import redirect
from django.core.cache import cache
import requests
from django.contrib.auth.models import User
from game.models.player.player import Player
from django.contrib.auth import login
from random import randint

# 2. Receive the authorization code from AcWing
def receive_code(request):
    data = request.GET
    code = data.get("code")
    state = data.get("state")
    # print("授权码为：", code)
    # print("状态码为：", state)

    if not cache.has_key(state):
        return redirect("index")  # CSRF attack detected(or state-cache timeout), redirect to index page
    cache.delete(state)  # 删除该state，防止重复使用

    # 3. Use the authorization code to get access_token and openid
    access_token_url = "https://www.acwing.com/third_party/api/oauth2/access_token/"
    params = {
        "appid": "7624",
        "secret": "5ea38cc38be940c29362d57deb2c1d6c",
        "code": code
    }
    access_token_res = requests.get(access_token_url, params=params).json()
    
    access_token = access_token_res['access_token']
    openid = access_token_res['openid']

    # 4.1 Check if the Acwing account is already bound to a Player
    players = Player.objects.filter(openid=openid)  # 由于用户名可能会变，所以用openid来判断用户身份
    if players.exists():    # acwing账号与已有的Player条目绑定，无需再次获取更多信息，直接登录该用户
        player = players[0]
        user = player.user
        login(request, user)  
        return redirect("index")

    # 4.2 Get user info from Acwing server
    get_userinfo_url = "https://www.acwing.com/third_party/api/meta/identity/getinfo/"
    params = {
        "access_token": access_token,
        "openid": openid
    }
    userinfo_res = requests.get(get_userinfo_url, params=params).json()
    username = userinfo_res['username']
    photo = userinfo_res['photo']
    while User.objects.filter(username=username).exists():
        username += str(randint(0, 9))   # 若用户名已存在，则末尾添加随机数（保证效率logn），直到不重复为止

    # 4.3 Create new User and Player, bind them together
    user = User.objects.create(username=username)
    player = Player.objects.create(user=user, photo=photo, openid=openid)
    login(request, user)

    return redirect("index")    # Redirect to the main index page，传入"index"免去再写链接