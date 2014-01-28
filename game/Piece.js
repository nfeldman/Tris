/**
 * This module exports 
 *  • the `Piece` constructor
 *  • the `Bag` constructor
 *
 * It also exports two data objects containing default values:
 *  • a `pieces` object, which contains an array of 4 numbers for each piece
 *    (tetromino), each number representing one orientation of that piece
 *  • a `colors` object, which maps the name of a piece to its color
 */

var EventEmitter = require('../Grue/js/infrastructure/EventEmitter'),
    inherit = require('../Grue/js/OO/inherit'),
    objMap = require('../Grue/js/object/map'),
    // unlike native map, ours doesn't skip holes
    map  = require('../Grue/js/functional/map'),
    oVal = ['     ',
            '     ',
            ' ##  ',
            ' ##  ',
            '     '],
    // # Tetrominos (http://tetris.wikia.com/wiki/Tetromino)
    // Tetrominoes, occasionally known alternately as Tetrads, Blocks, or 
    // Tetriminoes, are the blocks used in every known Tetris game. They come in 
    // seven shapes, all of which can be rotated and then dropped. Tetrominoes
    // all have an area of four squares.

    // A tetromino, is a polyomino made of four square blocks. The seven one-
    // sided tetrominoes are I, O, T, S, Z, J, and L.

    pieces = objMap({
        O: map(new Array(4), function () {return oVal}),
        I: [['     ',
             '     ',
             ' ####',
             '     ',
             '     '],
            ['     ',
             '  #  ',
             '  #  ',
             '  #  ',
             '  #  '],
            ['     ',
             '     ',
             ' ####',
             '     ',
             '     '],
            ['  #  ',
             '  #  ',
             '  #  ',
             '  #  ',
             '     ']
        ],
        T: [['     ',
             '  #  ',
             ' ### ',
             '     ',
             '     '],
            ['     ',
             '  #  ',
             '  ## ',
             '  #  ',
             '     '],
            ['     ',
             '     ',
             ' ### ',
             '  #  ',
             '     '],
            ['     ',
             '  #  ',
             ' ##  ',
             '  #  ',
             '     ']
        ],
        J: [['     ',
             ' #   ',
             ' ### ',
             '     ',
             '     '],
            ['     ',
             '  ## ',
             '  #  ',
             '  #  ',
             '     '],
            ['     ',
             '     ',
             ' ### ',
             '   # ',
             '     '],
            ['     ',
             '  #  ',
             '  #  ',
             ' ##  ',
             '     ']
        ],
        L: [['     ',
             '   # ',
             ' ### ',
             '     ',
             '     '],
            ['     ',
             '  #  ',
             '  #  ',
             '  ## ',
             '    '],
            ['     ',
             '     ',
             ' ### ',
             ' #   ',
             '     '],
            ['     ',
             ' ##  ',
             '  #  ',
             '  #  ',
             '     ']
        ],
        S: [['     ',
             '     ',
             '  ## ',
             ' ##  ',
             '     '],
            ['     ',
             '  #  ',
             '  ## ',
             '   # ',
             '     '],
            ['     ',
             '     ',
             '  ## ',
             ' ##  ',
             '     '],
            ['     ',
             '  #  ',
             '  ## ',
             '   # ',
             '     ']
        ],
        Z: [['     ',
             '     ',
             ' ##  ',
             '  ## ',
             '     '],
            ['     ',
             '   # ',
             '  ## ',
             '  #  ',
             '     '],
            ['     ',
             '     ',
             ' ##  ',
             '  ## ',
             '     '],
            ['     ',
             '   # ',
             '  ## ',
             '  #  ',
             '     ']
        ]
    }, function (v) {
        return v.map(function (x) {
            return x.map(function (r) {
                return r.split('').map(function (x) {return x == '#'}) 
            });
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
    generatePieces = require('defaultPieceGenerator'),
    eachblock = require('eachblock');

// Object.defineProperties(colors, {
//     getColor: {
//         value: function (n) {return this[colorByIdx[n]]}
//     },
//     getIdx: {
//         value: function (l) {return colorToIdx[l]}
//     }
// });

module.exports = Piece;
Piece.Bag    = Bag;
Piece.pieces = pieces;
Piece.colors = colors;


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
    this.__grue_props.use_event_pool = true;
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

/**
 * A piece consists of a name, an x and a y coordinate and a flag
 * specifying which of 4 orientations it occupies
 * @param {[type]} name [description]
 */
function Piece (name) {
    this.x = 2;
    this.y = 0;
    this.r = 0;
    this.name = name || '';
}

Piece.prototype.slideLeft  = function () {--this.x};

Piece.prototype.slideRight = function () {++this.x};

Piece.prototype.rotateLeft = function (x) {
    return this.r = !this.r ? 3 : --this.r;
};

Piece.prototype.rotateRight = function (x) {
    ++this.r
    return this.r %= 4;
};