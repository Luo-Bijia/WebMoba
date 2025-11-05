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
