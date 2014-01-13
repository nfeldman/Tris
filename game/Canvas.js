function Canvas () {
    this.canvas = document.createElement('canvas');
    this.context = null;
    this._h = 0;
    this._w = 0;
}

Canvas.prototype.reset = function () {
    this.canvas.width = this._w;
};

Object.defineProperties(Canvas.prototype, {
    context2d: {
        get: function () {
            if (!this.context)
                this.context = this.canvas.getContext('2d');
            return this.context;
        }
    },
    height: {
        get: function () {
            return this._h;
        },
        set: function (n) {
            this._h = this.canvas.height = n;
        }
    },
    width: {
        get: function () {
            return this._w;
        },
        set: function (n) {
            this._w = this.canvas.width = n;
        }
    }
});