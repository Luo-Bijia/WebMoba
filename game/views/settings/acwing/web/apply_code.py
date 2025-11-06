from django.http import JsonResponse
from urllib.parse import quote # 替换url中的特殊字符，免得出bug
from random import randint
from django.core.cache import cache # 用于存储临时数据, 如state

def get_state():
    res = ""
    for i in range(8):
        res += str(randint(0, 9))
    return res

# 1. Apply to get the authorization code from AcWing(Web端请求Acwing服务器OAuth2登录)
def apply_code(request):
    appid = "7624"
    redirect_uri = quote("https://app7624.acapp.acwing.com.cn/settings/acwing/web/receive_code/")
    scope = "userinfo" # 申请获取的权限，这里只需要用户信息
    state = get_state() # 用于保持请求和回调的状态，防止CSRF攻击，这里传任意值
    
    cache.set(state, True, 7200) # 将state存入缓存，有效期2小时

    apply_code_url = "https://www.acwing.com/third_party/api/oauth2/web/authorize/"
    return JsonResponse({
        'result': "success",
        'apply_code_url': apply_code_url + "?appid=" + appid + "&redirect_uri=" + redirect_uri + "&scope=" + scope + "&state=" + state
    })