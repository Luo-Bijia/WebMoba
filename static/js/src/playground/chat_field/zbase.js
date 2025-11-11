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
}