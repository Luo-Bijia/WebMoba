class AcGameMenu{
    constructor(root){      // 将AcGame对象传给root  作为整个界面的索引
        this.root = root;
        // 在js中创建html内对象的方法
        this.$menu = $(`
<div class="ac-game-menu">
    <div class="ac-game-menu-field">
        <div class="ac-game-menu-field-item ac-game-menu-field-item-single-mode">
        单人模式
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-multi-mode">
        多人模式
        </div>
        <br>
        <div class="ac-game-menu-field-item ac-game-menu-field-item-settings">
        退出
        </div>
    </div>

</div>
        `);
        this.$menu.hide();
        this.$single_mode = this.$menu.find('.ac-game-menu-field-item-single-mode');
        this.$multi_mode = this.$menu.find('.ac-game-menu-field-item-multi-mode');
        this.$settings = this.$menu.find('.ac-game-menu-field-item-settings');
        
        this.root.$ac_game.append(this.$menu);
        
        this.start();
    }

    start(){
        this.add_listening_events();
    }

    add_listening_events(){
        let outer = this;
        this.$single_mode.click(function(){
            outer.hide();
            outer.root.playground.show("single mode");
        });
        this.$multi_mode.click(function(){
            outer.hide();
            outer.root.playground.show("multi mode");   // 显示多人模式界面
        });
        this.$settings.click(function(){
            outer.root.settings.logout_on_remote();
        });
    }

    show(){
        this.$menu.show();
    }
    hide(){
        this.$menu.hide();
    }
}
let AC_GAME_OBJECTS = [];

class AcGameObject{     // 游戏上物体的基类
    constructor(){
        AC_GAME_OBJECTS.push(this);
        this.has_called_start = false;
        this.timedelta = 0;
        
        this.uuid = this.create_uuid();
    }

    create_uuid(){      // 为场上的any对象生成一个随机的8位数uuid
        let res = "";
        for(let i = 0;i < 8;i ++){
            let x = parseInt(Math.floor(Math.random() * 10));
            res += x;
        }
        return res;
    }

    start(){        // 只会在第一帧执行
    
    }
    update(){       // 后面每一帧都会执行
    
    }
    on_destroy(){       // 被删除前保留现场

    }
    destroy(){      // 删掉物体
        this.on_destroy();
        for(let i = 0;i < AC_GAME_OBJECTS.length;i ++){
            if(AC_GAME_OBJECTS[i] === this){
                AC_GAME_OBJECTS.splice(i, 1);
                break;
            }
        }
    }
}


let last_timestamp;
let AC_GAME_ANIMATION_FRAME = function(timestamp){
    for(let i = 0;i < AC_GAME_OBJECTS.length;i ++){
        let obj = AC_GAME_OBJECTS[i];
        if(!obj.has_called_start){
            obj.start();
            obj.has_called_start = true;
        }
        else{
            obj.timedelta = timestamp - last_timestamp;
            obj.update();
        }
    }
    last_timestamp = timestamp;
    
    requestAnimationFrame(AC_GAME_ANIMATION_FRAME);
};
requestAnimationFrame(AC_GAME_ANIMATION_FRAME);
class GameMap extends AcGameObject{
    constructor(playground){
        super();
        this.playground = playground;
        this.$canvas = $(`<canvas></canvas>`);
        this.ctx = this.$canvas[0].getContext('2d');        // 用于调节画布参数的变量
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.playground.$playground.append(this.$canvas);
    }
    start(){}
    resize(){       // 根据playground的变化调整画布大小
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.ctx.fillStyle = "rgba(0, 0, 0, 1)";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
    update(){
        this.render();
    }
    render(){
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
}
class Particle extends AcGameObject {
    constructor(playground, x, y, radius, vx, vy, color, speed, move_length) {
        super();
        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.speed = speed;
        this.move_length = move_length;
        this.friction = 0.9;
        this.eps = 0.01;
    }

    start() {
    }

    update() {
        if (this.move_length < this.eps || this.speed < this.eps) {
            this.destroy();
            return false;
        }

        let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
        this.x += this.vx * moved;
        this.y += this.vy * moved;
        this.speed *= this.friction;
        this.move_length -= moved;
        this.render();
    }

    render() {
        let scale = this.playground.scale;

        this.ctx.beginPath();
        this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }
}

class Player extends AcGameObject {
    // 主机、机器人、其他玩家都会映射成Player对象，在Player里执行何种逻辑取决于character属性
    constructor(playground, x, y, radius, color, speed, character, username, photo) {
        console.log(character, username, photo);
        super();
        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.damage_x = 0;
        this.damage_y = 0;
        this.damage_speed = 0;
        this.move_length = 0;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.character = character;         // is_me -> character: 3种类型的角色
        this.username = username;
        this.photo = photo;
        
        this.eps = 0.01;
        this.friction = 0.9;
        this.spent_time = 0;

        this.cur_skill = null;
        if(this.character !== "robot"){     // 只要非人机，就要渲染头像
            this.img = new Image();
            this.img.src = this.photo;
        }

    }

    start() {
        if (this.character === "me") {      // 自己屏幕上只有自己角色才需要监听事件
            this.add_listening_events();
        } else {
            let tx = Math.random() * this.playground.width / this.playground.scale;
            let ty = Math.random() * this.playground.height / this.playground.scale;
            this.move_to(tx, ty);
        }
    }

    add_listening_events() {
        let outer = this;
        this.playground.game_map.$canvas.on("contextmenu", function() {
            return false;
        });
        this.playground.game_map.$canvas.mousedown(function(e) {
            const rect = outer.ctx.canvas.getBoundingClientRect();
            if (e.which === 3) {
                outer.move_to((e.clientX - rect.left) / outer.playground.scale, (e.clientY - rect.top) / outer.playground.scale);
            } else if (e.which === 1) {
                if (outer.cur_skill === "fireball") {
                    outer.shoot_fireball((e.clientX - rect.left) / outer.playground.scale, (e.clientY - rect.top) / outer.playground.scale);
                }

                outer.cur_skill = null;
            }
        });

        $(window).keydown(function(e) {
            if (e.which === 81) {  // q
                outer.cur_skill = "fireball";
                return false;
            }
        });
    }

    shoot_fireball(tx, ty) {
        let x = this.x, y = this.y;
        let radius = 0.01;          // /scale ->，这表示根据画布调整的相对值
        let angle = Math.atan2(ty - this.y, tx - this.x);
        let vx = Math.cos(angle), vy = Math.sin(angle);
        let color = "orange";
        let speed = 0.5;
        let move_length = 1;
        new FireBall(this.playground, this, x, y, radius, vx, vy, color, speed, move_length, 0.01);
    }

    get_dist(x1, y1, x2, y2) {
        let dx = x1 - x2;
        let dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    move_to(tx, ty) {
        this.move_length = this.get_dist(this.x, this.y, tx, ty);
        let angle = Math.atan2(ty - this.y, tx - this.x);
        this.vx = Math.cos(angle);
        this.vy = Math.sin(angle);
    }

    is_attacked(angle, damage) {
        for (let i = 0; i < 20 + Math.random() * 10; i ++ ) {
            let x = this.x, y = this.y;
            let radius = this.radius * Math.random() * 0.1;
            let angle = Math.PI * 2 * Math.random();
            let vx = Math.cos(angle), vy = Math.sin(angle);
            let color = this.color;
            let speed = this.speed * 10;
            let move_length = this.radius * Math.random() * 5;
            new Particle(this.playground, x, y, radius, vx, vy, color, speed, move_length);
        }
        this.radius -= damage;
        if (this.radius < this.eps) {
            this.destroy();
            return false;
        }
        this.damage_x = Math.cos(angle);
        this.damage_y = Math.sin(angle);
        this.damage_speed = damage * 100;
        this.speed *= 0.8;
    }

    update() {
        this.update_move();
        this.render();
    }

    update_move() {     // 只负责更新玩家移动
        this.spent_time += this.timedelta / 1000;
        if (this.character === "robot" && this.spent_time > 4 && Math.random() < 1 / 300.0) {
            let player = this.playground.players[Math.floor(Math.random() * this.playground.players.length)];
            let tx = player.x + player.speed * this.vx * this.timedelta / 1000 * 0.3;
            let ty = player.y + player.speed * this.vy * this.timedelta / 1000 * 0.3;
            this.shoot_fireball(tx, ty);
        }

        if (this.damage_speed > this.eps) {
            this.vx = this.vy = 0;
            this.move_length = 0;
            this.x += this.damage_x * this.damage_speed * this.timedelta / 1000;
            this.y += this.damage_y * this.damage_speed * this.timedelta / 1000;
            this.damage_speed *= this.friction;
        } else {
            if (this.move_length < this.eps) {
                this.move_length = 0;
                this.vx = this.vy = 0;
                if (this.character === "robot") {
                    let tx = Math.random() * this.playground.width / this.playground.scale;
                    let ty = Math.random() * this.playground.height / this.playground.scale;
                    this.move_to(tx, ty);
                }
            } else {
                let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
                this.x += this.vx * moved;
                this.y += this.vy * moved;
                this.move_length -= moved;
            }
        }
    }

    render() {
        let scale = this.playground.scale;
        if(this.character !== "robot"){
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
            this.ctx.stroke();
            this.ctx.clip();
            this.ctx.drawImage(this.img, (this.x - this.radius) * scale, (this.y - this.radius) * scale, this.radius * 2 * scale, this.radius * 2 * scale); 
            this.ctx.restore();
        }
        else{
            this.ctx.beginPath();
            this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
            this.ctx.fillStyle = this.color;
            this.ctx.fill();
        }
    }

    on_destroy() {
        for (let i = 0; i < this.playground.players.length; i ++ ) {
            if (this.playground.players[i] === this) {
                this.playground.players.splice(i, 1);
            }
        }
    }
}

class FireBall extends AcGameObject {
    constructor(playground, player, x, y, radius, vx, vy, color, speed, move_length, damage) {
        super();
        this.playground = playground;
        this.player = player;
        this.ctx = this.playground.game_map.ctx;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.move_length = move_length;
        this.damage = damage;
        this.eps = 0.01;
    }

    start() {
    }

    update() {
        if (this.move_length < this.eps) {
            this.destroy();
            return false;
        }

        let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
        this.x += this.vx * moved;
        this.y += this.vy * moved;
        this.move_length -= moved;

        for (let i = 0; i < this.playground.players.length; i ++ ) {
            let player = this.playground.players[i];
            if (this.player !== player && this.is_collision(player)) {
                this.attack(player);
            }
        }

        this.render();
    }

    get_dist(x1, y1, x2, y2) {
        let dx = x1 - x2;
        let dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    is_collision(player) {
        let distance = this.get_dist(this.x, this.y, player.x, player.y);
        if (distance < this.radius + player.radius)
            return true;
        return false;
    }

    attack(player) {
        let angle = Math.atan2(player.y - this.y, player.x - this.x);
        player.is_attacked(angle, this.damage);
        this.destroy();
    }

    render() {
        let scale = this.playground.scale;
        this.ctx.beginPath();
        this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }
}

class MultiPlayerSocket{
    constructor(playground) {
        this.playground = playground;
        let web_host = "app7624.acapp.acwing.com.cn/"
        this.ws = new WebSocket("wss://" + web_host + "wss/multiplayer/");   // 建立与后端的WebSocket连接

        this.start();
    }
    start() {
        this.receive();
    }
    
    // ※接收并处理后端发送过来的消息
    receive(){
        let outer = this;
        this.ws.onmessage = function (e) {
            let data = JSON.parse(e.data);
            let uuid = data.uuid;
            if(uuid === outer.uuid)     return false;       // 群发的消息逻辑上自己不需要处理
            
            let event = data.event;
            if(event === "create_player") {
                outer.receive_create_player(uuid, data.username, data.photo);
            }
        };
    }

    // ※发送创建玩家的消息给后端服务器，后端在index.receive中处理
    send_create_player(username, photo){
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "create_player",
            'uuid': outer.uuid,
            'username': username,
            'photo': photo
        }));
    }
    
    // 实时多次调用该函数来渲染场上还未创建的所有玩家
    receive_create_player(uuid, username, photo){
        let player = new Player(
            this.playground, 
            this.playground.width / 2 / this.playground.scale, 
            0.5, 
            0.05,
            "white",
            0.15,
            "enemy",
            username,
            photo
        );
        player.uuid = uuid;         // ※统一uuid，谁主机上创建的player，就用在那主机上的uuid
        this.playground.players.push(player);
    }
}class AcGamePlayground {
    constructor(root) {
        this.root = root;
        this.$playground = $(`<div class="ac-game-playground"></div>`);

        this.hide();
        this.root.$ac_game.append(this.$playground);

        this.start();
    }

    get_random_color() {
        let colors = ["blue", "red", "pink", "grey", "green"];
        return colors[Math.floor(Math.random() * 5)];
    }

    start() {
        let outer = this;
        $(window).resize(function() {
            outer.resize();
        })
    }

    resize() {
        this.width = this.$playground.width();
        this.height = this.$playground.height();
        let unit = Math.min(this.width / 16, this.height / 9);
        this.width = unit * 16;
        this.height = unit * 9;
        this.scale = this.height;
        if (this.game_map) this.game_map.resize();
    }

    show(mode) {  // 打开playground界面
        let outer = this;
        this.$playground.show();
        
        this.resize();

        this.width = this.$playground.width();
        this.height = this.$playground.height();
        this.game_map = new GameMap(this);
        this.players = [];
        this.players.push(new Player(this, this.width / 2 / this.scale, this.height / 2 / this.scale, this.height * 0.05 / this.scale, "white", this.height * 0.15 / this.scale, "me", this.root.settings.username, this.root.settings.photo));
        
        if(mode === "single mode") {    // 单人模式，需要加入5个机器人
            for (let i = 0; i < 5; i ++ ) {
                this.players.push(new Player(this, this.width / 2 / this.scale, this.height / 2 / this.scale, this.height * 0.05 / this.scale, this.get_random_color(), this.height * 0.15 / this.scale, "robot"));
            }
        } else if(mode === "multi mode") {
            this.mps = new MultiPlayerSocket(this);     // 自playground起创建多人游戏的WebSocket连接
            this.mps.uuid = this.players[0].uuid;    // 将每个主机玩家的uuid传给主机的连接mps（动态添加uuid成员变量），方便后续操作

            this.mps.ws.onopen = function () {    // WebSocket连接建立成功后的回调函数
                outer.mps.send_create_player(outer.root.settings.username, outer.root.settings.photo);
            };
        }
    }

    hide() {  // 关闭playground界面
        this.$playground.hide();
    }
}

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
        if(this.platform === "ACAPP")       return false;

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
export class AcGame{
    constructor(id, AcWingOS){
        this.id = id;
        this.$ac_game = $('#' + id);        // 找到html里定义的主要对象(大div块)，取名为ac_game对象
        this.settings = new Settings(this);
        this.menu = new AcGameMenu(this);
        this.playground = new AcGamePlayground(this);
        this.AcWingOS = AcWingOS;
        this.start();
    }
    start(){}
}
