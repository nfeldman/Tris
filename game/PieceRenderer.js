var mix = require('../Grue/js/object/mix'),
    eachblock = require('eachblock');

/**
 * Constructs an object that handles drawing and clearing pieces.
 * @constructor
 * @param  {Object} models An object where each key is the name of a piece
 *                         and each value is an array of 4 items representing
 *                         the piece in each of its 4 orientations.
 *                         
 * @param  {Object} colors An object where each key is the name of a piece
 *                         and each value is the name of a color
 * @param  {number} dx     the width of a single block
 * @param  {number} dy     the height of a single block
 */
function PieceRenderer () {
    arguments.length && this.refresh.apply(this, arguments);
}

module.exports = PieceRenderer;

mix(/** @lends PieceRenderer.prototype */ {
    /**
     * @param  {Object} models An object where each key is the name of a piece
     *                         and each value is an array of 4 items represent-
     *                         ing the piece in each of its 4 orientations.
     *                         
     * @param  {Object} colors An object where each key is the name of a piece
     *                         and each value is the name of a color
     * @param  {number} dx     the width of a single block
     * @param  {number} dy     the height of a single block
     */
    refresh: function (models, colors, dx, dy) {
        /**@private*/this._models  = models;
        /**@private*/this._colors  = colors;
        /**@private*/this._sprites = document.createElement('canvas');
        /**@private*/this._spritePos = Object.create(null);
        /**@private*/this._dx = dx;
        /**@private*/this._dy = dy;

        var keys  = Object.keys(models),
            floor = Math.floor,
            tileW = 4 * dx,
            tileH = 4 * dy,
            ctx;

        this._sprites.width  = 4 * tileW;
        this._sprites.height = keys.length * tileH;


        ctx = this._sprites.getContext('2d');

        keys.forEach(function (k, row) {
            this._spritePos[k] = row;
            var top = row * tileH;
            models[k].forEach(function (m, col) {
                eachblock(m, col * 4, row * 4, function (x, y) {
                    drawBlock(colors[k], x, y, dx, dy, ctx);
                });
            });
        }, this);

        return this;
    },

    /**
     * Draw a piece to a supplied canvas
     * @param  {Piece} piece
     * @param  {CanvasRenderingContext2D} ctx
     */
    draw: function (piece, ctx) {
        if (this._spritePos[piece.name] == null)
            throw new Error('Was expecting one of "' + Object.keys(this.models)
                        .join('", "') + '" but saw ' + piece.name + ' instead');

        ctx.drawImage(
                        this._sprites, 
                        4 * piece.r * this._dx, 
                        4 * this._spritePos[piece.name] * this._dy,
                        4 * this._dx, 
                        4 * this._dy, 
                        piece.x * this._dx,
                        piece.y * this._dy,
                        4 * this._dx, 
                        4 * this._dy
                     );
    },
    /**
     * Clear a piece from a supplied canvas
     * @param  {Piece} piece
     * @param  {CanvasRenderingContext2D} ctx
     */
    clear: function (piece, ctx) {
        var dx = this._dx,
            dy = this._dy;

        eachblock(this._models[piece.name][piece.r], piece.x, piece.y, function (x, y) {
            ctx.clearRect(x * dx, y * dy, dx, dy);
        });
    }
}, PieceRenderer.prototype);


function drawBlock (color, x, y, dx, dy, ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(x * dx, y * dy, dx, dy);

    var xx = dx * .1,
    yy = dy * .1;

    ctx.beginPath();
    ctx.moveTo(x * dx, y * dy);
    ctx.lineTo(x * dx + xx, y * dy + yy);
    ctx.lineTo(x * dx + xx, y * dy + 9 * yy);
    ctx.lineTo(x * dx + 9 * xx, y * dy + 9 * yy);
    ctx.lineTo(x * dx + dx, y * dy + dy);
    ctx.lineTo(x * dx, y * dy + dy);
    ctx.lineTo(x * dx, y * dy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x * dx, y * dy);
    ctx.lineTo(x * dx + dx, y * dy);
    ctx.lineTo(x * dx + dx, y * dy + dy);
    ctx.lineTo(x * dx + 9 * xx, y * dy + 9 * yy);
    ctx.lineTo(x * dx + 9 * xx, y * dy + yy);
    ctx.lineTo(x * dx + xx, y * dy + yy);
    ctx.lineTo(x * dx, y * dy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
}

/** @static */
PieceRenderer.drawBlock = drawBlock;

/** @static */
PieceRenderer.drawPiece = function (type, color, x, y, dx, dy, dir, ctx) {
    eachblock(type, x, y, function (x, y) {
        drawBlock(color, x, y, dx, dy, ctx);
    });
}

/** @static */
PieceRenderer.eachblock = eachblock;