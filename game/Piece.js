/**
 * This module exports 
 *  • a Piece factory that returns either a Piece or RandomPiece
 *  • the `Bag` constructor
 *
 * It also exports two data objects containing default values:
 *  • a `pieces` object, which contains an array of 4 numbers for each piece
 *    (tetromino), each number representing one orientation of that piece
 *  • a `colors` object, which maps the name of a piece to its color
 */

var EventEmitter = require('../Grue/js/infrastructure/EventEmitter'),
    random = require('../Grue/js/number/random'),
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
        A: [['  #  ',
             '  #  ',
             '  ###',
             '     ',
             '     '],
            ['     ',
             '     ',
             '  ###',
             '  #  ',
             '  #  '],
            ['     ',
             '     ',
             '###  ',
             '  #  ',
             '  #  '],
            ['  #  ',
             '  #  ',
             '###  ',
             '     ',
             '     ']],
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
        A: 'pink',
        I: 'cyan',
        O: 'yellow',
        T: 'purple',
        S: 'green',
        Z: 'red',
        J: 'blue',
        L: 'orange',
        R: 'lightgray'
    },

    keys = 'IOTSZJL'.split(''),

    // colors = Object.create({
    //     set: function (name, value) {
    //         if (this[name])
    //             this[name] = value;
    //     },
    //     get: function (name) {
    //         if (name == 'R') {
    //             return this.keys[random(0, 7)]
    //         }
    //     }
    // },{
    //     keys: {value: 'IOTSZJL'.split(''), writeable: true},
    //     A: {value:'pink', writeable: true},
    //     I: {value:'cyan', writeable: true},
    //     O: {value:'yellow', writeable: true},
    //     T: {value:'purple', writeable: true},
    //     S: {value:'green', writeable: true},
    //     Z: {value:'red', writeable: true},
    //     J: {value:'blue', writeable: true},
    //     L: {value:'orange', writeable: true}
    // }),
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
    genFnFactory = require('./defaultPieceGenerator'),
    generatePieces = genFnFactory('OITSZJL'),
    eachblock = require('./eachblock');

// Object.defineProperties(colors, {
//     getColor: {
//         value: function (n) {return this[colorByIdx[n]]}
//     },
//     getIdx: {
//         value: function (l) {return colorToIdx[l]}
//     }
// });

Object.defineProperty(pieces, 'R', {
    get: function () {
        return this[keys[random(0, 6)]]
    }
});

// export a factory
module.exports = function (name) {
    if (this instanceof Piece)
        return Piece.apply(this, arguments);
    else if (this instanceof RandomPiece)
        return RandomPiece.call(this);
    else
        return new (name == 'R' ? RandomPiece : Piece)(name);
};

module.exports.Bag    = Bag;
module.exports.pieces = pieces;
module.exports.colors = colors;


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
    this.size   = 7;
    generator && (this.generator = generator);
}

inherit(Bag, EventEmitter);

Bag.prototype.fill = function () {
    [].unshift.apply(this.pieces, this.generator(this.size));
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
    if (this.r == 0)
        this.r = 3;
    else
        --this.r;

    return this.r;
};

Piece.prototype.rotateRight = function (x) {
    if (this.r == 3)
        this.r = 0;
    else
        ++this.r;

    return this.r;
};

Piece.prototype.getModel = function () {
    return pieces[this.name][this.r];
};

// TODO probably shouldn't do stuff like this in games
// although worrying about allocations and GC pauses in
// Tetris is probably silly.
function RandomPiece () {
    Piece.call(this);
    this._name = 'R';
    this.model = new Array(4);
    for (var i = 0; i < 4; i++)
        this.model[i] = {name: '', model: ''};
    this._setModel();
    Object.defineProperty(this, 'name', {
        get: function () {
            return this.model[this.r].name;
        }
    })
}

inherit(RandomPiece, Piece);

RandomPiece.prototype.getModel = function () {
    !this.model[this.r].name && this._setModel();
    return this.model[this.r].model;
};

RandomPiece.prototype._setModel = function () {
    var name = keys[random(0, 6)];
    this.model[this.r].name  = name;
    this.model[this.r].model = pieces[name][this.r];
};