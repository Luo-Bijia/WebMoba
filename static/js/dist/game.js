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
class ChatField{
    constructor(playground){
        this.playground = playground;
        
        this.$history = $(`<div class="ac-game-chat-field-history"></div>`);    // 历史聊天记录
        this.$input = $(`<input type="text" class="ac-game-chat-field-input">`);    // 输入时跳出的文本框

        this.func_id = null;
        this.$history.hide();
        this.$input.hide();

        this.playground.$playground.append(this.$history);
        this.playground.$playground.append(this.$input);
        
        this.start();
    }

    start(){
        this.add_listening_events();
    }

    add_listening_events(){     // 焦点在输入框上时也要监听事件
        let outer = this;
        this.$input.keydown(function (e) {
            if(e.which === 27){
                outer.hide_input();
                return false;
            }else if(e.which === 13){
                let username = outer.playground.root.settings.username;
                let text = outer.$input.val();
                if(text){
                    outer.$input.val("");        // 清空输入框
                    outer.add_message(username, text);

                    outer.playground.mps.send_message(text);        // 聊天信息广播出去
                }
                return false;
            }
        });
    }

    show_history(){
        let outer = this;
        this.$history.fadeIn();
        if(this.func_id)        clearTimeout(this.func_id);

        this.func_id = setTimeout(function(){
            outer.$history.fadeOut();
            outer.func_id = null;
        }, 3000);
    }

    render_message(message){
        return $(`<div>${message}</div>`);
    }

    add_message(username, text){
        this.show_history();
        let message = `[${username}]${text}`;     // 封装成message
        this.$history.append(this.render_message(message));
        this.$history.scrollTop(this.$history[0].scrollHeight);
    }

    show_input(){
        this.show_history();        // 打字 ——> 显示历史聊天记录
        this.$input.show();
        this.$input.focus();        // 显示并聚焦
    }

    hide_input(){
        this.$input.hide();
        this.playground.game_map.$canvas.focus();       // 焦点还给游戏界面
    }
}class GameMap extends AcGameObject{
    constructor(playground){
        super();
        this.playground = playground;
        this.$canvas = $(`<canvas tabindex=0></canvas>`);   // tabindex: 1.接收键盘事件 2.点击 canvas 后，键盘输入会直接作用于游戏
        this.ctx = this.$canvas[0].getContext('2d');        // 用于调节画布参数的变量
        this.ctx.canvas.width = this.playground.width;
        this.ctx.canvas.height = this.playground.height;
        this.playground.$playground.append(this.$canvas);
    }
    start(){
        this.$canvas.focus();       // 进到页面里 首先默认聚焦在canvas上（主要会与输入框争夺焦点）
    }
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
class NoticeBoard extends AcGameObject{
    constructor(playground){
        super();
        this.playground = playground;
        this.ctx = this.playground.game_map.ctx;
        this.text = "已就绪: 0人";

    }

    start(){
    }

    update(){
        this.render();
    }

    write(text){
        this.text = text;
    }

    render(){
        this.ctx.font = "20px serif";
        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.text, this.playground.width / 2, 20);
    }
}class Particle extends AcGameObject {
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

        this.fireballs = [];        // 该玩家已发过的子弹都存进一个数组

        this.cur_skill = null;
        if(this.character !== "robot"){     // 只要非人机，就要渲染头像
            this.img = new Image();
            this.img.src = this.photo;
        }

        if(this.character === "me"){        // 各自主机上只需约定让自己有冷却时间即实现效果
            // 普通攻击
            this.fireball_coldtime = 3;      // 单位：秒
            this.fireball_img = new Image();
            this.fireball_img.src = "https://cdn.acwing.com/media/article/image/2021/12/02/1_9340c86053-fireball.png";
        
            // 闪现
            this.flash_coldtime = 5;
            this.flash_img = new Image();
            this.flash_img.src = "https://cdn.acwing.com/media/article/image/2021/12/02/1_daccabdc53-blink.png";
        }
    }

    start() {
        this.playground.player_count ++;
        this.playground.notice_board.write("已就绪：" + this.playground.player_count + "人");

        if(this.playground.player_count >= 3){
            this.playground.state = "fighting";
            this.playground.notice_board.write("Fighting!!");
        }

        if (this.character === "me") {      // 自己屏幕上只有自己角色才需要监听事件
            this.add_listening_events();
        } else if (this.character === "robot"){     // 只有人机出场需要随机动一下
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
            if(outer.playground.state !== "fighting")
                return true;

            const rect = outer.ctx.canvas.getBoundingClientRect();
            let tx = (e.clientX - rect.left) / outer.playground.scale;
            let ty = (e.clientY - rect.top) / outer.playground.scale;
            if (e.which === 3) {    
                outer.move_to(tx, ty);

                if(outer.playground.mode === "multi mode")
                    outer.playground.mps.send_move_to(tx, ty);      // 多机同步
            } else if (e.which === 1) {                
                if (outer.cur_skill === "fireball") {    
                    if(outer.fireball_coldtime > outer.eps)      // 攻击冷却未结束
                        return false;
                    let fireball = outer.shoot_fireball(tx, ty);
                    
                    if(outer.playground.mode === "multi mode")
                        outer.playground.mps.send_shoot_fireball(tx, ty, fireball.uuid);
                }
                else if(outer.cur_skill === "flash") {
                    if(outer.flash_coldtime > outer.eps)        // 闪现冷却未结束
                        return false;
                    outer.flash(tx, ty);

                    if(outer.playground.mode === "multi mode")
                        outer.playground.mps.send_flash(tx, ty);
                }

                outer.cur_skill = null;
            }
        });

        this.playground.game_map.$canvas.keydown(function(e) {      // 键盘事件由主机中的canvas接收
            // 聊天功能入场就可以用
            if(e.which === 13){     // Enter
                if(outer.playground.mode === "multi mode"){
                    outer.playground.chat_field.show_input();
                    return false;
                }
            }
            else if(e.which == 27){     // Esc
                if(outer.playground.mode === "multi mode"){
                    outer.playground.chat_field.hide_input();
                    return false;
                }
            }
            
            if(outer.playground.state !== "fighting")
                return true;

            if (e.which === 81) {  // q
                if(outer.fireball_coldtime > outer.eps)
                    return true;

                outer.cur_skill = "fireball";
                return false;
            }
            else if(e.which === 70) {   // f
                if(outer.flash_coldtime > outer.eps)
                    return true;
                
                outer.cur_skill = "flash";
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
        let fireball = new FireBall(this.playground, this, x, y, radius, vx, vy, color, speed, move_length, 0.01);
        this.fireballs.push(fireball);
        
        this.fireball_coldtime = 3;     // 发射一次，冷却一次
        return fireball;        // 便于后续获取到击出的子弹的uuid
    }

    destroy_fireball(uuid){     // 在attackee接收到击中的时候回调，从而在所属attacker里删除掉自己
        for(let i = 0;i < this.fireballs.length;i ++){
            let fireball = this.fireballs[i];
            if(fireball.uuid === uuid){
                fireball.destroy();
                break;
            }
        }
    }

    flash(tx, ty){
        let d = this.get_dist(this.x, this.y, tx, ty);
        d = Math.min(d, 0.8);
        let angle = Math.atan2(ty - this.y, tx - this.x);
        this.x += d * Math.cos(angle);
        this.y += d * Math.sin(angle);

        this.flash_coldtime = 5;
        this.move_length = 0;       // 闪现后急停下来
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

    // ※注意理解：x、y是在attacker视角里传过来的(统一x、y从而减小网络延迟、精度误差带来的影响)
    // 有无打中自己是在敌人主机上动画渲染的结果说了算，同时被打中的位置也是被敌人主机击中时定下来的
    receive_attack(x, y, angle, damage, ball_uuid, attacker){
        attacker.destroy_fireball(ball_uuid)
        this.x = x;
        this.y = y;
        this.is_attacked(angle, damage);
    }

    update() {
        this.spent_time += this.timedelta / 1000;

        if(this.character === "me" && this.playground.state === "fighting"){
            this.update_coldtime();
        }
        this.update_move();
        this.render();
    }

    update_coldtime(){
        this.fireball_coldtime -= this.timedelta / 1000;
        this.fireball_coldtime = Math.max(this.fireball_coldtime, 0);

        this.flash_coldtime -= this.timedelta / 1000;
        this.flash_coldtime = Math.max(this.flash_coldtime, 0);
    }

    update_move() {     // 只负责更新玩家移动
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

        if(this.character === "me" && this.playground.state === "fighting"){
            this.render_skill_coldtime();
        }
    }

    render_skill_coldtime(){        // 主机界面上的冷却图标（依赖于player的攻击状态来渲染）
        let x = 1.5, y = 0.9, r = 0.04, scale = this.playground.scale;
        
        // 渲染火球攻击图标
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.fireball_img, (x - r) * scale, (y - r) * scale, r * 2 * scale, r * 2 * scale); 
        this.ctx.restore();

        // CD中的图标-被半透明的蓝覆盖
        if(this.fireball_coldtime > 0){
            this.ctx.beginPath();
            this.ctx.moveTo(x * scale, y * scale);
            this.ctx.arc(x * scale, y * scale, r * scale, 0 - Math.PI / 2, Math.PI * 2 * (1 - this.fireball_coldtime / 3) - Math.PI / 2, true);
            this.ctx.lineTo(x * scale, y * scale);
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
            this.ctx.fill();
        }


        // 渲染闪现图标
        x = 1.62, y = 0.9, r = 0.04;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2, false);
        this.ctx.stroke();
        this.ctx.clip();
        this.ctx.drawImage(this.flash_img, (x - r) * scale, (y - r) * scale, r * 2 * scale, r * 2 * scale); 
        this.ctx.restore();

        if(this.flash_coldtime > 0){
            this.ctx.beginPath();
            this.ctx.moveTo(x * scale, y * scale);
            this.ctx.arc(x * scale, y * scale, r * scale, 0 - Math.PI / 2, Math.PI * 2 * (1 - this.flash_coldtime / 5) - Math.PI / 2, true);
            this.ctx.lineTo(x * scale, y * scale);
            this.ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
            this.ctx.fill();
        }
    }

    on_destroy() {
        if(this.character === "me")
            this.playground.state = "over";

        for (let i = 0; i < this.playground.players.length; i ++ ) {
            if (this.playground.players[i] === this) {
                this.playground.players.splice(i, 1);
                break;
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
        
        this.update_move();
        if(this.player.character !== "enemy")       // 不更新敌人在主机界面中击出的子弹攻击效果
            this.update_attack();

        this.render();
    }

    update_move(){
        let moved = Math.min(this.move_length, this.speed * this.timedelta / 1000);
        this.x += this.vx * moved;
        this.y += this.vy * moved;
        this.move_length -= moved;
    }

    update_attack(){
        for (let i = 0; i < this.playground.players.length; i ++ ) {
            let player = this.playground.players[i];
            if (this.player !== player && this.is_collision(player)) {
                this.attack(player);
                break;      // 只攻击一名玩家
            }
        }
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
        let attackee = player;
        let angle = Math.atan2(attackee.y - this.y, attackee.x - this.x);
        attackee.is_attacked(angle, this.damage);

        if(this.playground.mode === "multi mode"){
            this.playground.mps.send_attack(attackee.uuid, attackee.x, attackee.y, angle, this.damage, this.uuid);
        }
        this.destroy();     // 击中目标，使命完成
    }

    render() {
        let scale = this.playground.scale;
        this.ctx.beginPath();
        this.ctx.arc(this.x * scale, this.y * scale, this.radius * scale, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
    }

    on_destroy(){
        let fireballs = this.player.fireballs;
        for(let i = 0;i < fireballs.length;i ++){
            if(fireballs[i] === this){
                fireballs.splice(i, 1);
                break;
            }
        }
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
            let uuid = data.uuid;       // 引起event的player_uuid
            if(uuid === outer.uuid)     return false;       // 广播的消息会发给自己，只需筛选掉
            
            let event = data.event;
            if(event === "create_player") {
                outer.receive_create_player(uuid, data.username, data.photo);
            }
            else if(event === "move_to") {
                outer.receive_move_to(uuid, data.tx, data.ty);
            }
            else if(event === "shoot_fireball") {
                outer.receive_shoot_fireball(uuid, data.tx, data.ty, data.ball_uuid);
            }
            else if(event === "attack") {
                outer.receive_attack(uuid, data.attackee_uuid,
                    data.x, data.y, data.angle, data.damage, data.ball_uuid
                );
            }
            else if(event === "flash") {
                outer.receive_flash(uuid, data.tx, data.ty);
            }
            else if(event === "message"){
                outer.receive_message(uuid, data.text);
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
    
    // ※发送该玩家移动的消息给后端，从而广播给房间内其他玩家
    send_move_to(tx, ty){
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "move_to",
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty
        }));
    }

    // ※发送该玩家击出了子弹的消息给后端，从而广播给房间内其他玩家
    send_shoot_fireball(tx, ty, ball_uuid){
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "shoot_fireball",
            'uuid': outer.uuid,         // 追踪击出子弹的玩家uuid
            'tx': tx,
            'ty': ty,
            'ball_uuid': ball_uuid
        }));
    }

    // ※发送该玩家击出子弹命中敌人的消息给后端，在子弹attack成功时回调
    send_attack(attackee_uuid, x, y, angle, damage, ball_uuid){
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "attack",
            'uuid': outer.uuid,     // attacker_uuid，与子弹传递的信息拼在一个json里
            'attackee_uuid': attackee_uuid,
            'x': x,
            'y': y,
            'angle': angle,
            'damage': damage,
            'ball_uuid': ball_uuid
        }));
    }

    send_flash(tx, ty){     // 可视为move_to的进阶版
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "flash",
            'uuid': outer.uuid,
            'tx': tx,
            'ty': ty
        }));
    }

    // 同步各主机上的聊天消息动态
    send_message(text){
        let outer = this;
        this.ws.send(JSON.stringify({
            'event': "message",
            'uuid': outer.uuid,
            'text': text
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

    get_player(uuid){
        for(let i = 0;i < this.playground.players.length;i ++){
            let player = this.playground.players[i];
            if(player.uuid === uuid){
                return player;
            }
        }
        return null;
    }

    // 实时多次调用该函数来渲染场上（除自己外）所有玩家的移动轨迹
    receive_move_to(uuid, tx, ty){
        let player = this.get_player(uuid);
        if(player)  
            player.move_to(tx, ty);
    }
    
    // 实时渲染场上所有玩家击出的子弹轨迹（过程动画）
    receive_shoot_fireball(uuid, tx, ty, ball_uuid){
        let player = this.get_player(uuid);
        if(player){
            let fireball = player.shoot_fireball(tx, ty);
            fireball.uuid = ball_uuid;      // 统一子弹的uuid，取决于击出的主机
        }
    }

    // 实时渲染场上所有玩家之间射出子弹的击中效果
    receive_attack(attacker_uuid, attackee_uuid, x, y, angle, damage, ball_uuid){
        let attacker = this.get_player(attacker_uuid);
        let attackee = this.get_player(attackee_uuid);
        if(attacker && attackee){
            attackee.receive_attack(x, y, angle, damage, ball_uuid, attacker);
        }
    }

    // 实时渲染场上所有玩家的闪现情况
    receive_flash(uuid, tx ,ty){
        let player = this.get_player(uuid);
        if(player)
            player.flash(tx, ty);
    }

    receive_message(uuid, text){
        let player = this.get_player(uuid);
        this.playground.chat_field.add_message(player.username, text);
    }
}class AcGamePlayground {
    constructor(root) {
        this.root = root;
        // playground对象里的 $playground html元素
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

        this.width = this.$playground.width();
        this.height = this.$playground.height();
        this.game_map = new GameMap(this);
        
        this.mode = mode;
        this.state = "waiting";     // FSM: waiting ——> fighting ——> over
        this.notice_board = new NoticeBoard(this);
        this.player_count = 0;

        this.resize();
        this.players = [];
        this.players.push(new Player(this, this.width / 2 / this.scale, this.height / 2 / this.scale, this.height * 0.05 / this.scale, "white", this.height * 0.15 / this.scale, "me", this.root.settings.username, this.root.settings.photo));
        
        if(mode === "single mode") {    // 单人模式，需要加入5个机器人
            for (let i = 0; i < 5; i ++ ) {
                this.players.push(new Player(this, this.width / 2 / this.scale, this.height / 2 / this.scale, this.height * 0.05 / this.scale, this.get_random_color(), this.height * 0.15 / this.scale, "robot"));
            }
        } 
        // 自playground起创建多人游戏的WebSocket连接，主机玩家的uuid跟其mps的uuid一致（动态添加uuid成员变量）
        else if(mode === "multi mode") {
            this.chat_field = new ChatField(this);      // multi mode-only
            
            this.mps = new MultiPlayerSocket(this);
            this.mps.uuid = this.players[0].uuid;

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
