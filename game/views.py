from django.http import HttpResponse

# Create your views here.
def index(request):
    line1 = '<h1 style="text-align: center">术士之战</h1>'
    line3 = "<hr>"
    line4 = '<a href="/play/">进入游戏界面</a>'
    line2 = '<img src="https://img.3dmgame.com/uploads/allimg/170406/363_170406132854_4.png">'
    return HttpResponse(line1 + line3 + line4 + line2)

def play(request):
    line1 = '<h1 style="text-align: center">游戏界面</h1>'
    line2 = '<a href="/">返回主菜单</a>'
    line3 = '<img src="https://img.3dmgame.com/uploads/allimg/160810/324_160810161209_11_lit.jpg">'
    return HttpResponse(line1 + line2 + line3)
