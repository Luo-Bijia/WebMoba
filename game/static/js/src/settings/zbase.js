class Settings{
    constructor(root){      // root依旧是AcGame
        this.root = root;
        this.platform = "WEB";      // default
        if(this.root.AcWingOS)      this.platform = "ACAPP";
        
        this.username = "";
        this.photo = "";

        this.$settings = $(`
<div class="ac-game-settings">
    <div class="ac-game-settings-login">
        <div class="ac-game-settings-title">
        登录
        </div>
        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="用户名">
            </div>
        </div>
        <div class="ac-game-settings-password">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="密码">
            </div>
        </div>
        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>登录</button>
            </div>
        </div>
        <div class="ac-game-settings-error-message">

        </div>
        <div class="ac-game-settings-option">
        注册
        </div>
        <div class="ac-game-settings-acwing">
            <img width="30" src="https://app7624.acapp.acwing.com.cn/static/image/settings/acwing_logo.png">
            <br>
            <div>
            AccWing一键登录
            </div>
        </div>
    </div>

    <div class="ac-game-settings-register">
        <div class="ac-game-settings-title">
        注册
        </div>
        <div class="ac-game-settings-username">
            <div class="ac-game-settings-item">
                <input type="text" placeholder="用户名">
            </div>
        </div>
        <div class="ac-game-settings-password ac-game-settings-password-first">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="密码">
            </div>
        </div>
        <div class="ac-game-settings-password ac-game-settings-password-second">
            <div class="ac-game-settings-item">
                <input type="password" placeholder="确认密码">
            </div>
        </div>
        <div class="ac-game-settings-submit">
            <div class="ac-game-settings-item">
                <button>注册</button>
            </div>
        </div>
        <div class="ac-game-settings-error-message">
        
        </div>
        <div class="ac-game-settings-option">
        登录
        </div>
        <div class="ac-game-settings-acwing">
            <img width="30" src="https://app7624.acapp.acwing.com.cn/static/image/settings/acwing_logo.png">
            <br>
            <div>
            AccWing一键登录
            </div>
        </div>
    </div>
</div>
`);
        this.$login = this.$settings.find(".ac-game-settings-login");
        this.$login_username = this.$login.find(".ac-game-settings-username input");
        this.$login_password = this.$login.find(".ac-game-settings-password input");
        this.$login_submit = this.$login.find(".ac-game-settings-submit button");
        this.$login_error_message = this.$login.find(".ac-game-settings-error-message");
        this.$login_register = this.$login.find(".ac-game-settings-option");
        this.$login_acwing = this.$login.find(".ac-game-settings-acwing img");

        this.$login.hide();
        
        this.$register = this.$settings.find(".ac-game-settings-register");
        this.$register_username = this.$register.find(".ac-game-settings-username input");
        this.$register_password = this.$register.find(".ac-game-settings-password-first input");
        this.$register_password_confirm = this.$register.find(".ac-game-settings-password-second input");
        this.$register_submit = this.$register.find(".ac-game-settings-submit button");
        this.$register_error_message = this.$register.find(".ac-game-settings-error-message");
        this.$register_login = this.$register.find(".ac-game-settings-option");

        this.$register.hide();
        
        this.root.$ac_game.append(this.$settings);
        
        this.start();
    }
    
    start(){
        this.getinfo();     // 首先就是向域名(https://)发出一个请求，这个请求主要关注当前网站的用户登录状态
        this.add_listening_events();
    }

    add_listening_events(){
        this.add_listening_events_login();
        this.add_listening_events_register();

    }

    add_listening_events_login(){
        let outer = this;
        this.$login_register.click(function() {
            outer.register();
        });
        this.$login_submit.click(function(){
            outer.login_on_remote();
        });
        this.$login_acwing.click(function() {
            outer.acwing_login();
        });
    }

    add_listening_events_register(){
        let outer = this;
        this.$register_login.click(function() {
            outer.login();
        });
        this.$register_submit.click(function() {
            outer.register_on_remote();
        });
    }

    acwing_login(){    // 一键登录
        $.ajax({
            url: "https://app7624.acapp.acwing.com.cn/settings/acwing/web/apply_code/",
            type: "GET",
            success: function(resp){    // resp实际上就是后端apply_code.py return的{'result', 'apply_code_url'}的JsonResponse
                console.log(resp);
                if(resp.result === "success"){
                    window.location.replace(resp.apply_code_url);   // 跳转到y总写好的授权页面
                }
            }
        });
    }

    login_on_remote(){      // 在远程服务器上登录
        let outer = this;
        let username = this.$login_username.val();
        let password = this.$login_password.val();
        this.$login_error_message.empty();
        $.ajax({
            url: "https://app7624.acapp.acwing.com.cn/settings/login/",
            type: "GET",
            data: {
                username: username,
                password: password
            },
            success: function(resp){
                console.log(resp);
                if(resp.result === "success"){
                    location.reload();          // 刷新：确保全局状态一致性 - 避免登录状态与界面显示不同步
                }
                else{
                    outer.$login_error_message.html(resp.result);
                }
            }
        });
    }
    
    register_on_remote(){   // 在远程服务器上注册
        let outer = this;

        let username = this.$register_username.val();
        let password = this.$register_password.val();
        let password_confirm = this.$register_password_confirm.val();
        this.$register_error_message.empty();

        $.ajax({
            url: "https://app7624.acapp.acwing.com.cn/settings/register/",
            type: "GET",
            data: {
                username: username,
                password: password,
                password_confirm: password_confirm
            },
            success: function(resp){
                console.log(resp);
                if(resp.result === "success"){
                    location.reload();          // 刷新：确保全局状态一致性 - 避免登录状态与界面显示不同步
                }
                else{
                    outer.$register_error_message.html(resp.result);
                }
            }
        });

    }

    logout_on_remote(){     // 在远程服务器上登出
        if(this.platform === "ACAPP"){
            this.root.AcWingOS.api.window.close();
        }
        else{
            $.ajax({
                url: "https://app7624.acapp.acwing.com.cn/settings/logout/",
                type: "GET",
                success: function(resp) {
                    console.log(resp);
                    if(resp.result === "success"){
                        location.reload();
                    }

                }
            });
        }
    }

    register(){     // 打开注册界面
        this.$login.hide();
        this.$register.show();
    }
    
    login(){        // 打开登陆界面
        this.$register.hide();
        this.$login.show();
    }
    
    getinfo(){
        let outer = this;

        $.ajax({
            url: "https://app7624.acapp.acwing.com.cn/settings/getinfo/",
            type: "GET",
            data: {
                platform: outer.platform
            },
            success: function(resp){
                console.log(resp);
                if(resp.result === "success"){          // 说明此时用户已经登录上了
                    outer.username = resp.username;
                    outer.photo = resp.photo;
                    outer.hide();
                    outer.root.menu.show();
                }
                else{
                    outer.login();                  // 后端判断到is_authenticated为false，返回的响应result为未登录，需要在当前页面下弹出登录的窗口逻辑
                }
            }
        });
    }

    hide(){
        this.$settings.hide();
    }
    show(){
        this.$settings.show();
    }
}
