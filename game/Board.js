var Component = require('../Grue/js/infrastructure/Component'),
    inherit = require('../Grue/js/OO/inherit'),
    pieces  = require('pieces'),
    mix = require('../Grue/js/object/mix'),
    colors  = pieces.colors,
    eachblock = pieces.eachblock;


function BoardPieceProps () {
    this.x = 0;
    this.y = 0;
    this.r = 0;
    this.t = '';
}
// # Playfield
// The Tetris Guideline specifies a playfield 10 blocks wide by at least 22
// blocks tall, where the tetrominoes are started in rows 21 and 22.
// Most games hide rows 21 and up. Tetrominoes may land and lock partially
// within the "vanish zone"; they reappear once a line is cleared below them.

function Board (ticker, rows, cols, dx, dy) {
    Component.apply(this);
    this.__grue_props.use_event_pool = true;

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('tabindex', '-1');
    this._ctx = this.canvas.getContext('2d');

    this._piece = null;
    this.ticker = ticker;
    this._frameCt = 0;
    this._actions = [];

    this.refresh(rows, cols, dx, dy);

    Object.defineProperties(this, {
        _piece: {enumerable: false},
        _frameCt: {enumerable: false},
        _actions: {enumerable: false},
        _ctx: {enumerable: false},
        _cols: {enumerable: false},
        _rows: {enumerable: false},
        _field: {enumerable: false},
        _dx: {enumerable: false},
        _dy: {enumerable: false}
    });
}

mix({ // add properties to the prototype without overwriting the constructor
    publishes: Object.create(Component.prototype.publishes, {
        animating  : {value: true},
        rowsCleared: {value: true},
        outOfBounds: {value: true}
    }),
    refresh: function (rows, cols, dx, dy) {
        this._ctx.clearRect(0, 0, cols * dx, rows * dy);
        this._piece = new BoardPieceProps();

        this._frameCt = 0;
        this._actions.length = 0;

        // this.buffer = this.canvas.cloneNode();
        this.canvas.width  = /*this.buffer.width  = */cols * dx;
        this.canvas.height = /*this.buffer.height = */rows * dy;

        this._rows = rows + 2; // allows new pieces to be partially visible

        // using the array constructor looks weird
        // but it makes sense when you know the size
        // of the array ahead of time.
        var row = new Array(cols),
            i;

        this._cols = cols;
        this._dx = dx;
        this._dy = dy;

        this._field = new Array(this._rows);

        for (i = 0; i < 10; i++)
            row[i] = false;

        for (i = 0; i < this._rows; i++)
            this._field[i] = row.slice(0);
    },

    drawPiece: function (piece, dontClear) {
        console.log(piece.piece);
        !dontClear && this.clearLastPiece(this._piece.t, this._piece.x, this._piece.y, this._piece.r);
        this._piece.x = piece.x;
        this._piece.y = piece.y - 2;
        this._piece.r = piece.r;
        this._piece.t = piece.piece;
        piece.y >= 0 && pieces.drawPiece(this._piece.t, this._piece.x, this._piece.y, this._dx, this._dy, this._piece.r, this._ctx);
    },

    clearLastPiece: function (t, x, y, r) {
        pieces.clearPiece(t, x, y, this._dx, this._dy, r, this._ctx);
    },

    isRowFilled: function (idx) {
        for (var i = 0, l = this._cols; i < l; i++)
            if (!this._field[idx][i])
                return false;
        return true;
    },

    maybeClearRows: function (piece) {
        var rows     = [],
            occupied = [];

        eachblock(piece, function (x, y) {rows.push(y)});

        for (var i = 0, l = rows.length; i < l; i++)
            if (this.isRowFilled(rows[i]))
                occupied.push(rows[i]);

        if (occupied.length) {
            this.clearRows(occupied);
            return true;
        }
        return false;
    },

    clearRows: function (rows) {
        if (!rows.length)
            throw Error('No rows to clear');

        var ct = 0;
        if (rows.length == 1) {
            ct = 1;
            // do animation etc and return
        }

        for (var i = 1, l = rows.length; i < l; i++) {
            if (rows[i] - rows[i-1] == 1)
                ++ct;
        }

        // for (var i = 0, l = rows.length; i < l; i++)


        // var top = 0;

        // if (idx >= this._field.length)
        //     throw Error('cannot clear non-existant row ' + idx);

        // for (var i = 0; i < this._cols; i++)
        //     this._field[i] = false;

        // this._ctx.clearRect(0, idx * this._dx, this._dx, this._dy);
    },
    // cycle goes:
    // frames 1  -  5, overlay rows starting with opacity at 100%, reduce opacity by 20% each frame
    // frames 6  - 10, reverse
    // frames 11 - 15 reverse again
    // frame 16 draw cleaned board
    flashRows: function (idx, ct) {
        var imgData = this._ctx.getImageData(0, idx * this._dy, this._dx * this._cols, this._dy * ct);
    },

    willIntersect: function (piece) {
        var result = null;
        eachblock(piece, function (x, y) {
            if (this.isCellOccupied(x, y)) {
                result = {
                    left: x < 0 || piece.x < this._piece.x && this._field[y] && this._field[y][x],
                    right: x >= this._cols || piece.x > this._piece.x && this._field[y] && this._field[y][x],
                    bottom: y >= this._rows || piece.y < this._piece.y && this._field[y][x],
                    x: x,
                    y: y
                };
                return true;
            }
        }, this);
        return result;
    },

    isCellOccupied: function (x, y) {
        if (this._field[y] == null || this._field[y][x] == null)
            return true;
        return this._field[y][x];
    },

    occupy: function (piece) {
        var outOfBounds = false;
        eachblock(piece, function (x, y) {
            if (0 > y || y >= this.cols)
                return outOfBounds = true;
            this._field[y][x] = true;
        }, this);

        outOfBounds && this.emitEvent('outOfBounds', true);
    },

    toString: function () {
        return this._field.map(function (row, i) {
            return [i].concat(row.map(function (cell) {
                return cell ? '#' : ' ';
            })).join('');
        }).join('\n');
    }
}, Board.prototype);

inherit(Board, Component);
module.exports = Board;
