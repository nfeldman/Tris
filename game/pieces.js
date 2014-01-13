/**
 * This module exports 
 *  • the `Piece` constructor, which creates a tetromino
 *  • the `Bag` constructor, which creates an object that manages pieces
 *
 * It also exports the following static objects and functions:
 *  • a `pieces` object, which contains an array of 4 numbers for each piece (or
 *    tetromino), each number representing one orientation of that piece
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
    // rotation. Given that a JS numbers are 64bit, I wonder if I can represent
    // all 4 rotations in a single number?
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
    generatePieces = require('./defaultPieceGenerator');

exports.pieces = pieces;
exports.colors = colors;

// accepts a Piece or the properties of one
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
        piece = pieces[type][dir];

    for (var bit = 0x8000;  bit > 0; bit >>= 1) {
        if (piece & bit)
            fn.call(thisObj, x + col, y + row);

        if (++col == 4) {
            col = 0;
            ++row;
        }
    }
}

exports.eachblock = eachblock;

function drawPiece (type, x, y, dx, dy, dir, ctx) {
    eachblock(type, x, y, dir, function (x, y) {
        drawBlock(x, y, dx, dy, type, ctx);
    });
}
exports.drawPiece = drawPiece;

function clearPiece (type, x, y, dx, dy, dir, ctx) {
    eachblock(type, x, y, dir, function (x, y) {
        clearBlock(x, y, dx, dy, ctx);
    });
}
exports.clearPiece = clearPiece;

function drawBlock (x, y, dx, dy, type, ctx) {
    ctx.fillStyle = colors[type];
    ctx.fillRect(x*dx, y*dy, dx, dy);

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
    ctx.clearRect(x*dx, y*dy, dx, dy);
}
exports.clearBlock = clearBlock;


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
    console.log(next);
    this.emitEvent('next', next);
    return next;
};

Bag.prototype.preview = function (n) {
    n == null && (n = 1);
    if (n > this.pieces.length)
        this.fill();
console.log(this.pieces);
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
    console.log(this.r);
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
