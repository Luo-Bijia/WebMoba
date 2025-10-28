from django.shortcuts import render

def index(request):
    return render(request, "multiends/web.html")    # django默认从templates目录下开始找
