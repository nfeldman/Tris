var p = require('pieces'),
    pieces = p.pieces,
    colors = p.colors,
    drawPiece = require('PieceRenderer').drawPiece;

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
    // TODO an algorithm to position pieces without knowing
    // what they are in advance.
    draw: function () {
        var n = this._showNextCt,
            next = this.bag.preview(n),
            x = 0,
            y = 0,
            nxt, pre;

        for (var i = 0; i < n; i++) {
            pre = nxt;
            nxt = next[i];
            y += 4;

            switch (pre) {
                case 'S':
                case 'Z':
                case 'T':
                case 'J':
                case 'L':
                    if (nxt == 'O' || nxt == 'I')
                        y -= 2;
                    else
                        y -= 1;
                    break;
                case 'I':
                    if (nxt == 'O')
                        y -= 2;
                    else
                        y -= 1;
            }

            if (!pre) { 
                if (nxt != 'I' && nxt != 'O')
                    y = 1;
                else
                    y = 0;
            } else if (pre == 'O' && nxt == 'I') {
                y -= 1;
            }

            if (nxt != 'I' && nxt != 'O')
                x = 0.5
            else
                x = 0;

            drawPiece(pieces[nxt][0], colors[nxt], x, y, 20, 20, 0, this.ctx);
        }
    },
    clear: function () {
        this.ctx.clearRect(0, 0, this._w, this._h);
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
                this.ctx.clearRect(0, 0, this._w, this._h);
                this.draw();
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
