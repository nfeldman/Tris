var p = require('./Piece'),
    pieces = p.pieces,
    colors = p.colors,
    drawBlock = require('./PieceRenderer').drawBlock;

/**  @module tris/game/Preivew */
module.exports = Preview;

/**
 * Creates a Preview object that manages the rendering of
 * 1, 2, or 3 upcoming pieces. Instances must be provided
 * with a Bag object.
 * @constructor
 */
function Preview () {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this._showNextCt = 1;
    this._h = 0;
    this._w = 0;
    this._bag = null;
    Object.defineProperties(this, {
        _showNextCt: {enumerable: false},
        _h: {enumerable: false},
        _w: {enumerable: false},
        _bag: {enumerable: false}
    });
    this.height = 200;
    this.width  = 100;
}

Preview.prototype = {
    constructor: Preview,

    draw: function () {
        var n = this._showNextCt,
            next = this.bag.preview(n),
            y = 0,
            row = false,
            piece, x;

        for (var i = 0; i < n; i++) {
            piece = pieces[next[i]][0];
            for (var j = 0; j < 5; j++) {
                row = false;
                for (var k = 0; k < 5; k++) {
                    if (piece[j][k]) {
                        if (!row) {
                            row = true;
                            ++y;
                        }
                        x = next[i] == 'I' ? k - 0.5 : next[i] == 'O' ? k + 0.5 : k;
                        drawBlock(colors[next[i]], x, y, 20, 20, this.ctx);
                    }
                }
            }
            ++y;
        }

        return this;
    },
    clear: function () {
        this.ctx.clearRect(0, 0, this._w, this._h);
        return this;
    }
};

Object.defineProperties(Preview.prototype, {
    bag: {
        get: function () {
            return this._bag;
        },
        set: function (bag) {
            if (this._bag)
                throw Error('cannot reset bag');
            this._bag = bag;

            bag.on('next', function (val) {
                this.clear().draw();
            }, this);
        }
    },
    showNext: {
        get: function () {
            return this._showNextCt;
        },
        set: function (val) {
            if (val > 3)
                val = 3;
            else if (0 > val)
                val = 0;
            else
                val = Math.floor(val);
            this._showNextCt = val;
        },
        enumerable: true
    },
    height: {
        get: function () {
            return this._h;
        },
        set: function (val) {
            this.canvas.height = this._h = val;
        }
    },
    width: {
        get: function () {
            return this._w;
        },
        set: function (val) {
            this.canvas.width = this._w = val;
        }
    }
});
