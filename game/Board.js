/**  @module tris/game/Board */
module.exports = Board;

var Component = require('../Grue/js/infrastructure/Component'),
    inherit = require('../Grue/js/OO/inherit'),
    pieces  = require('pieces'),
    mix = require('../Grue/js/object/mix'),
    colors  = pieces.colors,
    eachblock = pieces.eachblock;

/**
 * constructs an object for tracking the properties of a live piece
 * @constructor
 * @private
 */
function BoardPieceProps () {
    this.x = 0;
    this.y = 0;
    this.r = 0;
    this.t = '';
}

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

    /** @private */this._piece = null;
    /** @private */this.ticker = ticker;
    /** @private */this._frameCt = 0;
    /** @private */this._actions = [];

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
    refresh: function (rows, cols, dx, dy) {
        this._ctx.clearRect(0, 0, cols * dx, rows * dy);
        this._piece = new BoardPieceProps();

        this._frameCt = 0;
        this._actions.length = 0;

        // this.buffer = this.canvas.cloneNode();
        this.canvas.width  = /*this.buffer.width  = */cols * dx;
        this.canvas.height = /*this.buffer.height = */rows * dy;

        /** @private */this._rows = rows + 2; // allows new pieces to be partially visible

        // using the array constructor looks weird
        // but it makes sense when you know the size
        // of the array ahead of time.
        var row = new Array(cols),
            i;

        /** @private */this._cols = cols;
        /** @private */this._dx = dx;
        /** @private */this._dy = dy;

        /** @private */this._field = new Array(this._rows);

        for (i = 0; i < 10; i++)
            row[i] = false;

        for (i = 0; i < this._rows; i++)
            this._field[i] = row.slice(0);
    },

    /**
     * Draw a piece
     * @param  {Piece} piece      The piece to draw
     * @param  {boolean} [dontClear=false] if true, the result of the last call
     *                                     to `drawPiece` won't be undone.
     * @return {undefined}
     */
    drawPiece: function (piece, dontClear) {
        !dontClear && this.clearPiece(this._piece.t, this._piece.x, this._piece.y, this._piece.r);
        this._piece.x = piece.x;
        this._piece.y = piece.y - 2;
        this._piece.r = piece.r;
        this._piece.t = piece.piece;
        piece.y >= 0 && pieces.drawPiece(this._piece.t, this._piece.x, this._piece.y, this._dx, this._dy, this._piece.r, this._ctx);
    },

    /**
     * Clears a piece from the board
     * @param  {string} t Type of piece
     * @param  {number} x x coordinate of piece
     * @param  {number} y y coordinate of piece
     * @param  {number} r rotation of piece
     * @return {undefined}
     */
    clearPiece: function (t, x, y, r) {
        pieces.clearPiece(t, x, y, this._dx, this._dy, r, this._ctx);
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

    /**
     * Sets up and begins clearing rows.
     * @param  {Array} rows the indicies of rows to clear
     * @return {[type]}      [description]
     */
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
    /**
     * Does the row clearing animation
     * @param  {number} idx the index of the row to clear
     * @param  {number} ct  the number of contiguous rows in addition to that 
     *                      at `idx` to clear.
     * @return {undefined}
     */
    flashRows: function (idx, ct) {
        var imgData = this._ctx.getImageData(0, idx * this._dy, this._dx * this._cols, this._dy * ct);
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

    /**
     * Checks whether a block is occupied
     * @param  {number}  x x coordinate of the block
     * @param  {number}  y y coordinate of the block
     * @return {Boolean}
     */
    isCellOccupied: function (x, y) {
        if (this._field[y] == null || this._field[y][x] == null)
            return true;
        return this._field[y][x];
    },

    /**
     * Given a piece, marks all of the blocks it fills as occupied
     * @fires Board#outOfBounds if the piece has a block with a negative y
     *                          coordinate
     * @param  {Piece} piece
     * @return {undefined}
     */
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
