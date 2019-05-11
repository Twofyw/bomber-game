angular
    .module(DEFAULT.PKG('i18n'), [])
    .factory('$I18n', [function () {

        this.prototype.isMyTurn_zhcn = "本方下棋中";
        this.prototype.notMyTurn_zhcn = "对方下棋中";

    }]);