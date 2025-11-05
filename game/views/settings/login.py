from django.http import JsonResponse
from django.contrib.auth import authenticate, login

def signin(request):
    data = request.GET      # QueryDict 类的一个实例。QueryDict 是 Django 自定义的一个字典-like 对象,专门用于处理 HTTP 请求中的查询参数,可以处理同一个参数名对应多个值的情况
    username = data.get("username")
    password = data.get("password")
    user = authenticate(username=username, password=password)       # 封装了数据库查询等操作，实现密码哈希验证
    if not user:
        return JsonResponse({
            'result': "用户名或密码不正确"
            })

    login(request, user)
    return JsonResponse({
            'result': "success"
            })
