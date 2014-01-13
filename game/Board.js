var Component = require('../Grue/js/infrastructure/Component'),
    inherit = require('../Grue/js/OO/inherit'),
    pieces  = require('pieces'),
    colors  = pieces.colors,
    eachblock = pieces.eachblock;

// # Playfield
// The Tetris Guideline specifies a playfield 10 blocks wide by at least 22 
// blocks tall, where the tetrominoes are started in rows 21 and 22. 
// Most games hide rows 21 and up. Tetrominoes may land and lock partially 
// within the "vanish zone"; they reappear once a line is cleared below them.

function Board (rows, cols, dx, dy) {
    Component.apply(this);    
    this.__grue_props.use_event_pool = true;

    this.piece = {
        x: 0,
        y: 0,
        r: 0,
        t: ''
    };

    // we have to know about a ticker for animations to work
    this.ticker = null;
    this._frameCt = 0;

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('tabindex', '-1');
    this.ctx = this.canvas.getContext('2d');
    // this.buffer = this.canvas.cloneNode();
    this.canvas.width  = /*this.buffer.width  = */cols * dx;
    this.canvas.height = /*this.buffer.height = */rows * dy;

    this.rows = rows + 2; // allows new pieces to be partially visible

    // using the array constructor looks weird
    // but it makes sense when you know the size
    // of the array ahead of time.
    var row = new Array(cols),
        i;

    this.cols = cols;
    this.dx = dx;
    this.dy = dy;

    this.field = new Array(this.rows);

    for (i = 0; i < 10; i++)
        row[i] = false;

    for (i = 0; i < this.rows; i++)
        this.field[i] = row.slice(0);
}

Board.prototype = {
    constructor: Board,
    publishes: Object.create(Component.prototype.publishes, {
        animating: {value: true},
        rowsCleared: {value: true}
    }),
    drawPiece: function (piece, dontClear) {
        !dontClear && this.clearLastPiece();
        this.piece.x = piece.x;
        this.piece.y = piece.y - 2;
        this.piece.r = piece.r;
        this.piece.t = piece.piece;
        piece.y >= 0 && pieces.drawPiece(this.piece.t, this.piece.x, this.piece.y, this.dx, this.dy, this.piece.r, this.ctx);
    },

    clearLastPiece: function () {
        if (this.piece.x || this.piece.y)
            pieces.clearPiece(this.piece.t, this.piece.x, this.piece.y, this.dx, this.dy, this.piece.r, this.ctx);
    },

    isRowFilled: function (idx) {
        for (var i = 0, l = this.cols; i < l; i++)
            if (!this.field[idx][i])
                return false;
        return true;
    },

    maybeClearRows: function (piece) {
        var rows     = [],
            occupied = [];

        eachblock(piece, function (x, y) {rows.push(y)});

        for (var i = 0, l = rows.length; i < l; i++) {
            if (this.isRowFilled(rows[i]))
                occupied.push(i);
        }

        if (occupied.length) {
            this.clearRows(occupied);
            return true;
        }
        return false;
    },

    clearRows: function (rows) {
        if (!rows.length)
            throw Error('No rows to clear');

        var imgData = this.ctx.getImageData(0, 0, this.dx * this.cols, rows[i] * this.dy);

        // for (var i = 0, l = rows.length; i < l; i++)

         
        // var top = 0;

        // if (idx >= this.field.length)
        //     throw Error('cannot clear non-existant row ' + idx);

        // for (var i = 0; i < this.cols; i++)
        //     this.field[i] = false;

        // this.ctx.clearRect(0, idx * this.dx, this.dx, this.dy);
    },

    flashRow: function (idx, ct) {
        var imgData = this.ctx.getImageData(0, idx * this.dy, this.dx * this.cols, this.dy * ct);
    },

    willIntersect: function (piece) {
        var result = null;
        eachblock(piece, function (x, y) {
            if (this.isCellOccupied(x, y)) {
                result = {
                    left: x < 0 || piece.x < this.piece.x && this.field[y] && this.field[y][x],
                    right: x >= this.cols || piece.x > this.piece.x && this.field[y] && this.field[y][x],
                    bottom: y >= this.rows || piece.y < this.piece.y && this.field[y][x],
                    x: x,
                    y: y
                };
                return true;
            }
        }, this);
        return result;
    },

    isCellOccupied: function (x, y) {
        if (this.field[y] == null || this.field[y][x] == null)
            return true;
        return this.field[y][x];
    },

    occupy: function (piece) {
        eachblock(piece, function (x, y) {
            this.field[y][x] = true;
        }, this);
        // console.log(this.toString());
    },

    getLowestOccupiedCell: function (piece) {
        // var occupied = true;
        // for (var i = 0; i < this.rows; i++)
        //     if (!this.ce)
    },

    toString: function () {
        return this.field.map(function (row, i) {
            return [i].concat(row.map(function (cell) {
                return cell ? '#' : ' ';
            })).join('');
        }).join('\n');
    }
};
inherit(Board, Component);
module.exports = Board;
