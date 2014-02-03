/**  @module tris/game/Board */
module.exports = Board;

var Component = require('../Grue/js/infrastructure/Component'),
    inherit = require('../Grue/js/OO/inherit'),
    PieceRenderer = require('PieceRenderer'),
    Dict = require('../Grue/js/structures/Dict'),
    mix  = require('../Grue/js/object/mix'),
    Piece = require('Piece'),
    pieces = Piece.pieces,
    eachblock = require('eachblock');


/**
 * Constructs the playfield/board used by games like Tetris
 * The Tetris Guideline specifies a playfield 10 blocks wide by at least 22
 * blocks tall, where the tetrominoes are started in rows 21 and 22.
 * Most games hide rows 21 and up. Tetrominoes may land and lock partially
 * within the "vanish zone"; they reappear once a line is cleared below them.
 *
 * @constructor
 * 
 * @param {Ticker} ticker Game loop object that emits `tick` and `draw` events
 * @param {number} rows   How many rows in the visible board. Two additional
 *                        rows are added internally.
 * @param {number} cols   how many columns in the board
 * @param {number} dx     how many pixels wide a block is on the visible board
 * @param {number} dy     how many pixels high a block is on the visible board
 */
function Board (ticker, rows, cols, dx, dy) {
    Component.apply(this);
    /** @private */this.__grue_props.use_event_pool = true;

    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('tabindex', '-1');

    /** @private */this._ctx = this.canvas.getContext('2d');
    /** @private */this._renderer = null;
    /** @private */this._piece = null;
    /** @private */this._emptyRow = null;
    /** @private */this.ticker = ticker;
    /** @private */this._actions = [];
    /** @private */this._flashHandle = null;

    this.reset(rows, cols, dx, dy);

    Object.defineProperties(this, {
        _piece: {enumerable: false},
        _actions: {enumerable: false},
        _ctx: {enumerable: false},
        _cols: {enumerable: false},
        _rows: {enumerable: false},
        _field: {enumerable: false},
        _dx: {enumerable: false},
        _dy: {enumerable: false},
        _flashHandle: {enumerable: false}
    });
}

// add properties to the prototype without overwriting the constructor
mix(/** @lends Board#prototype */ {
    publishes: Object.create(Component.prototype.publishes, {
        animating  : {value: true},
        rowsCleared: {value: true},
        outOfBounds: {value: true}
    }),
    /**
     * Reset the board to a clean state
     * @param {number} rows   How many rows in the visible board. Two additional
     *                        rows are added internally.
     * @param {number} cols   how many columns in the board
     * @param {number} dx     how many pixels wide a block is on the visible board
     * @param {number} dy     how many pixels high a block is on the visible board
     * @return {undefined}
     */
    reset: function (rows, cols, dx, dy) {
        this._ctx.clearRect(0, 0, cols * dx, rows * dy);
        this._piece = new Piece(null, dx, dy);

        if (dx != this._dx || dy != this._dy)
            this._renderer = new PieceRenderer(Piece.pieces, Piece.colors, dx, dy);

        this._frameCt = 0;
        this._actions.length = 0;

        // this.buffer = this.canvas.cloneNode();
        this.canvas.width  = /*this.buffer.width  = */cols * dx;
        this.canvas.height = /*this.buffer.height = */rows * dy;

        /** @private */this._rows = rows + 2; // allows new pieces to be partially visible

        // using the array constructor looks weird
        // but it makes sense when you know the size
        // of the array ahead of time.
        var row = this._emptyRow = new Array(cols),
            i;

        /** @private */this._cols = cols;
        /** @private */this._dx = dx;
        /** @private */this._dy = dy;

        /** @private */this._field = new Array(this._rows);

        for (i = 0; i < 10; i++)
            row[i] = '';

        for (i = 0; i < this._rows; i++)
            this._field[i] = row.slice(0);
    },

    refresh: function () {
        var dx  = this._dx,
            dy  = this._dy,
            f   = this._field,
            ctx = this._ctx,
            piece;

        for (var i = 2, c = this._cols, r = this._rows; i < r; i++) {
            for (var j = 0; j < c; j++)
                f[i][j] ? PieceRenderer.drawBlock(Piece.colors[f[i][j]], j, i - 2, dx, dy, ctx) : ctx.clearRect(j * dx, (i - 2) * dy, dx, dy);
        }
    },

    /**
     * Draw a piece
     * @param  {Piece} piece      The piece to draw
     * @param  {boolean} [dontClear=false] if true, the result of the last call
     *                                     to `drawPiece` won't be undone.
     * @return {undefined}
     */
    drawPiece: function (piece, dontClear) {
        !dontClear && this._renderer.clear(this._piece, this._ctx);
        this._piece.x = piece.x;
        this._piece.y = piece.y - 2;
        this._piece.r = piece.r;
        this._piece.name = piece.name;
        this._renderer.draw(piece, -2, this._ctx);
    },

    /**
     * Checks whether a row is filled
     * @param  {number}  idx The index of the row to check
     * @return {Boolean} whether the row is filled
     */
    isRowFilled: function (idx) {
        for (var i = 0, l = this._cols; i < l; i++)
            if (!this._field[idx][i])
                return false;
        return true;
    },

    /**
     * Calls Board#clearRows if the supplied piece occupies filled rows
     * @param  {Piece}
     * @return {Boolean} whether rows will be cleared
     */
    maybeClearRows: function (piece) {
        var rows = [],
            set  = {},
            occupied = new Dict();

        eachblock(piece.getModel(), piece.x, piece.y, function (x, y) {
            if (set[y])
                return;
            set[y] = true;
            rows.push(y);
        });

        for (var i = 0, l = rows.length; i < l; i++)
            if (this.isRowFilled(rows[i]))
                occupied.add(rows[i]);

        if (occupied.length)
            this.clearRows(occupied);

        return occupied.length;
    },

    /**
     * Sets up and begins clearing rows.
     * @param  {Dict} the dictionary of rows to remove
     * @return {[type]}      [description]
     */
    clearRows: function (dict) {
        var rows = dict.toArray(),
            frameCt = 0;

        if (!rows.length)
            throw Error('No rows to clear');

        this.emitEvent('animating', true);

        for (var i = 0; i < rows.length; i++)
            rows[i] -= 2;

        this._flashHandle = this.ticker.on('draw', function () {
            ++frameCt;
            if (7 > frameCt) {
                for (var i = 0; i < rows.length; i++)
                    this.fadeRow(rows[i]);
            } else {
                this._flashHandle.off();
                this._removeRows(dict);
                this.emitEvent('animating', false);
            }
        }, this).lastRegisteredHandler;
    },
   
    /**
     * Does the row clearing animation
     * @param  {number} idx the index of the row to clear
     * @param  {number} ct  the number of contiguous rows in addition to that 
     *                      at `idx` to clear.
     * @return {undefined}
     */
    fadeRow: function (idx) {
        this._ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this._ctx.fillRect(0, idx * this._dy, this._cols * this._dx, this._dy);
    },

    _removeRows: function (dict) {
        var field = new Array(this._rows),
            i = this._rows, 
            j = i;

        while (i--) {
            while(dict.contains(i))
                --i;
            field[--j] = this._field[i];
        }

        for (var i = 0, l = dict.length; i < l; i++)
            field[i] = this._emptyRow.slice(0);

        this._field = field;
        this.refresh();
    },

    /**
     * Checks whether any block of the supplied piece will intersect an occupied
     * block of this board.
     * @param  {Piece} piece
     * @return {Object|null} If not null, contains the x and y coordinates of 
     *                          the first occupied block and whether the
     *                          intersection occurs to the left, right, or
     *                          bottom of the piece.
     */
    willIntersect: function (piece) {
        var y = piece.y,
            x = piece.x,
            model = piece.getModel(),
            yy, xx;

        for (var i = 0; i < 5; i++) {
            for (var j = 0; j < 5; j++) {
                if (!model[i][j])
                    continue;
                xx = x + j;
                yy = y + i;
                if (this._field[yy] == null || this._field[yy][xx] == null || !!this._field[yy][xx])
                    return true;
            }
        }

        return false;
    },

    /**
     * Given a piece, marks all of the blocks it fills as occupied
     * @fires Board#outOfBounds if the piece has a block with a negative y
     *                          coordinate
     * @param  {Piece} piece
     * @return {undefined}
     */
    occupy: function (piece) {
        var outOfBounds = false,
            l = piece.name;

        eachblock(piece.getModel(), piece.x, piece.y, function (x, y) {
            if (0 > y || y >= this.cols)
                return outOfBounds = true;
            this._field[y][x] = l;
        }, this);

        outOfBounds && this.emitEvent('outOfBounds', true);
    },

    toString: function () {
        return this._field.map(function (row, i) {
            return [i].concat(row.map(function (cell) {
                return cell ? cell : ' ';
            })).join('');
        }).join('\n');
    }
}, Board.prototype);

inherit(Board, Component);
