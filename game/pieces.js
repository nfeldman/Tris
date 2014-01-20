/**
 * This module exports 
 *  • the `Piece` constructor
 *  • the `Bag` constructor
 *
 * It also exports the following static objects and functions:
 *  • a `pieces` object, which contains an array of 4 numbers for each piece
 *    (tetromino), each number representing one orientation of that piece
 *  • a `colors` object, which maps the name of a piece to its color
 *  • `eachblock` a function for iterating over the visible blocks of a piece
 *  • `drawPiece` a function for drawing a piece
 *  • `clearPiece` a function for clearing a piece
 *  • `drawBlock` a function for filling a single block
 *  • `clearBlock` a function for clearing a single block
 */

var EventEmitter = require('../Grue/js/infrastructure/EventEmitter'),
    inherit = require('../Grue/js/OO/inherit'),
    objMap = require('../Grue/js/object/map'),
    // unlike native map, ours doesn't skip holes
    map  = require('../Grue/js/functional/map'),
    oVal = parseInt(
            ['0000',
             '0110',
             '0110',
             '0000'].join(''), 2),
    // # Tetrominos (http://tetris.wikia.com/wiki/Tetromino)
    // Tetrominoes, occasionally known alternately as Tetrads, Blocks, or 
    // Tetriminoes, are the blocks used in every known Tetris game. They come in 
    // seven shapes, all of which can be rotated and then dropped. Tetrominoes
    // all have an area of four squares.

    // A tetromino, is a polyomino made of four square blocks. The seven one-
    // sided tetrominoes are I, O, T, S, Z, J, and L.

    // I can't easily think in hex or binary, but <http://codeincomplete.com/posts/2011/10/10/javascript_tetris/>
    // cleverly suggests using a number to represent a tetromino in a specific
    // rotation.
    // 
    // Until I replace this approach with one that allows implementing SRS more
    // closely and completely, the following logic is to generate each number
    // from an easy to understand visual representation of each piece + rotation.
    // TODO replace this with a model of a piece that allows implementing SRS <http://tetrisconcept.net/wiki/SRS> simply (ish) 
    pieces = objMap({
        O: map(new Array(4), function () {return oVal}),
        I: [['    ',
             '####',
             '    ',
             '    '],
            ['  # ',
             '  # ',
             '  # ',
             '  # '],
            ['    ',
             '    ',
             '####',
             '    '],
            [' #  ',
             ' #  ',
             ' #  ',
             ' #  ']
        ],
        T: [[' #  ',
             '### ',
             '    ',
             '    '],
            [' #  ',
             ' ## ',
             ' #  ',
             '    '],
            ['    ',
             '### ',
             ' #  ',
             '    '],
            [' #  ',
             '##  ',
             ' #  ',
             '    ']
        ],
        J: [['#   ',
             '### ',
             '    ',
             '    '],
            [' ## ',
             ' #  ',
             ' #  ',
             '    '],
            ['    ',
             '### ',
             '  # ',
             '    '],
            [' #  ',
             ' #  ',
             '##  ',
             '    ']
        ],
        L: [['  # ',
             '### ',
             '    ',
             '    '],
            [' #  ',
             ' #  ',
             ' ## ',
             '    '],
            ['    ',
             '### ',
             '#   ',
             '    '],
            ['##  ',
             ' #  ',
             ' #  ',
             '    ']
        ],
        S: [[' ## ',
             '##  ',
             '    ',
             '    '],
            ['    ',
             ' #  ',
             ' ## ',
             '  # '],
            ['    ',
             ' ## ',
             '##  ',
             '    '],
            ['#   ',
             '##  ',
             ' #  ',
             '    ']
        ],
        Z: [['##  ',
             ' ## ',
             '    ',
             '    '],
            ['  # ',
             ' ## ',
             ' #  ',
             '    '],
            ['    ',
             '##  ',
             ' ## ',
             '    '],
            [' #  ',
             '##  ',
             '#   ',
             '    ']
        ]
    }, function (v, k) {
        if (k == 'O')
            return v;

        return v.map(function (x) {
            return parseInt(x.join('').replace(/#/g, '1').replace(/\s/g, '0'), 2);
        });
    }),

    colors = {
        I: 'cyan',
        O: 'yellow',
        T: 'purple',
        S: 'green',
        Z: 'red',
        J: 'blue',
        L: 'orange'
    },
    // colorByIdx = ' IOTSZJL'.split(''),
    // colorToIdx = {
    //     I: 1,
    //     O: 2,
    //     T: 3,
    //     S: 4,
    //     Z: 5,
    //     J: 6,
    //     L: 7
    // },
    generatePieces = require('./defaultPieceGenerator');

// Object.defineProperties(colors, {
//     getColor: {
//         value: function (n) {return this[colorByIdx[n]]}
//     },
//     getIdx: {
//         value: function (l) {return colorToIdx[l]}
//     }
// });

exports.pieces = pieces;
exports.colors = colors;

/**
 * a function that iterates over 16 bits of a JS number used
 * to represent a piece and calls a callback for each on bit.
 * @static
 * @param  {string|Piece}   type  either the string name of a piece or an instance of Piece
 * @param  {number}   [x]       the x coordinate of a piece, not required if type is a Piece instance
 * @param  {number}   [y]       the y coordinate of a piece, not required if type is a Piece instance
 * @param  {number}   [dir]     the rotation (0 - 3) of a piece, not required if type is a Piece instance
 * @param  {Function} fn      the function to call if a block is filled (bit is on) in the piece
 * @param  {number}   [thisObj] context in which to call the fn
 * @return {undefined}
 */
function eachblock (type, x, y, dir, fn, thisObj) {
    if (type instanceof Piece) {
        thisObj = y;
        fn = x;
        x = type.x;
        y = type.y;
        dir = type.r;
        type = type.piece;
    }

    var row = 0,
        col = 0,
        piece = pieces[type][dir],
        stop = false;

    for (var bit = 0x8000;  !stop && bit > 0; bit >>= 1) {
        if (piece & bit)
            stop = fn.call(thisObj, x + col, y + row);

        if (++col == 4) {
            col = 0;
            ++row;
        }
    }
}

exports.eachblock = eachblock;

/**
 * Draws a piece
 * @static
 * @param  {string} type [description]
 * @param  {number} x    [description]
 * @param  {number} y    [description]
 * @param  {number} dx   [description]
 * @param  {number} dy   [description]
 * @param  {number} dir  [description]
 * @param  {CanvasRenderingContext2D} ctx  [description]
 * @return {undefined}      [description]
 */
function drawPiece (type, x, y, dx, dy, dir, ctx) {
    eachblock(type, x, y, dir, function (x, y) {
        drawBlock(type, x, y, dx, dy, ctx);
    });
}
exports.drawPiece = drawPiece;

/**
 * Erases a piece
 * @static
 * @param  {string} type [description]
 * @param  {number} x    [description]
 * @param  {number} y    [description]
 * @param  {number} dx   [description]
 * @param  {number} dy   [description]
 * @param  {number} dir  [description]
 * @param  {CanvasRenderingContext2D} ctx  [description]
 * @return {undefined}      [description]
 */
function clearPiece (type, x, y, dx, dy, dir, ctx) {
    eachblock(type, x, y, dir, function (x, y) {
        clearBlock(x, y, dx, dy, ctx);
    });
}
exports.clearPiece = clearPiece;

function drawBlock (type, x, y, dx, dy, ctx) {
    ctx.fillStyle = colors[type];
    ctx.fillRect(x*dx, y*dy, dx, dy);

    // if (arguments.callee.caller.caller.caller.caller.name == '')
    //     console.log('filling block', x, y);

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
exports.drawBlock = drawBlock;

function clearBlock (x, y, dx, dy, ctx) {
    // console.log('clearing block', x, y);
    ctx.clearRect(x*dx, y*dy, dx, dy);
}
exports.clearBlock = clearBlock;

/**
 * Creates a Bag object, which provides a random piece name on
 * demand.
 * @param {[type]} [generator] a function to use to generate the
 *                             piece names. The default function
 *                             is similar to <http://tetrisconcept.net/wiki/Random_Generator>
 *                             but does not prevent the first
 *                             piece from being an S or a Z
 */
function Bag (generator) {
    EventEmitter.call(this);
    this.pieces = [];
    generator && (this.generator = generator);
}

inherit(Bag, EventEmitter);

Bag.prototype.fill = function () {
    [].unshift.apply(this.pieces, this.generator(null, 2));
};

Bag.prototype.generator = generatePieces;

Bag.prototype.next = function () {
    if (!this.pieces.length)
        this.fill();

    var next = this.pieces.pop();

    this.emitEvent('next', next);
    return next;
};

Bag.prototype.preview = function (n) {
    n == null && (n = 1);
    if (n > this.pieces.length)
        this.fill();

    return this.pieces.slice(this.pieces.length - n);
};

Bag.prototype.reset = function () {
    this.pieces.length = 0;
    return this;
};

exports.Bag = Bag;

function Piece (piece, dx, dy) {
    EventEmitter.call(this);
    this._dirty = false;
    this.x = 3; // left
    this.y = 0; // top
    this.r = 0; // rotation 0 - 4
    this.dx = dx; // width of cell
    this.dy = dy; // height of cell
    this.piece = piece || '';
}
inherit(Piece, EventEmitter);

Piece.prototype.rotateLeft = function (x) {
    this._dirty = true;
    if (!this.r)
        this.r = 3;
    else
        --this.r;

    return this.r;
};

Piece.prototype.rotateRight = function (x) {
    this._dirty = true;
    ++this.r
    return this.r %= 4;
};

Piece.prototype.draw = function (x, y, ctx) {
    if (!this._dirty)
        return;

    drawPiece(this.piece, x, y, this.dx, this.dy, this.r, ctx);
    this._dirty = false;
};

Piece.prototype.toString = function () {
    return pieces[this._piece][this.r].map(function (v, i) {if (i && !(i % 4)) return v ? '\n#' : '\n '; return v ? '#' : ' '}).join('');
}

exports.Piece = Piece;
