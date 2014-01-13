var inherit = require('../Grue/js/OO/inherit'),
    // EventEmitter = require('../Grue/infrastructure/EventEmitter'),
    Component = require('../Grue/js/infrastructure/Component'),
    DOMEvents = require('../Grue/js/dom/events/DOMEvents'),
    // throttle = require('../Grue/js/utils/throttle'),
    Board  = require('Board'),
    pieces = require('pieces');

module.exports = Game;

/**
 * Constructs a data object that tracks game flags
 * @private
 */
function GameState () {
    this.initial = true;     // whether the game has just begun
    this.playing = false;    // whether the game is active
    this.sliding = false;    // whether the current piece can slide
    this.descending = false; // whether pieces are currently falling
    this.pieceIsNew = true;  // whether the piece spawned in the last update
    this.rendering  = true;  // whether drawing is happening
    this.suspended  = false; // whether updating should be skipped
}

/**
 * Constructs a data object that tracks numbers relevant to ongoing gameplay
 * @constructor
 * @private
 */
function GameCounters () {
    this.traveled    = 0;
    this.slideFrames = 0;
    this.softDropped = 0;
    this.hardDropped = 0;   
}

function Game () {
    Component.apply(this, arguments);

    // these are set after instantiation but before calling Game#init
    this.layout = null;
    this.bag   = null;
    this.board = null;
    this.props = null;
    this.ticker = null;
    this.scoreCtor = null;
    this.previewCtor = null;

    // these are set/reset by Game#refresh (first called by Game#init)
    this._state    = new GameState();
    this._counters = new GameCounters();
    this._piecesSeen = 0;
    this._actions = [];
    this.score = null;
    this.preview = null;
    this.dx = 0;
    this.dy = 0;
    this.piece = null;

    Object.defineProperties(this, {
        _state: {enumerable:false},
        _counters: {enumerable:false},
        _piecesSeen: {enumerable:false},
        _actions: {enumerable:false}
    });
}

Game.ACTIONS = {
    LEFT: 1,
    RIGHT: 2,
    R_LEFT: 3,
    R_RIGHT: 4,
    SOFT: 5,
    HARD: 6,
    CLEAR: 7
};

Object.defineProperty(Game, 'ACTIONS', {enumerable:false});

Game.prototype = {
    constructor: Game,
    publishes: Object.create(Component.prototype.publishes, {
        levelup: {value:true},
        scoreChange: {value:true},
        playing: {value:true}
    }),

    refresh: function () {
        var p = this.props;
        
        this.dx = p.cellsize_x || p.cellsize, 
        this.dy = p.cellsize_y || p.cellsize;

        this._piecesSeen = 0;
        this._actions.length = 0;

        GameState.apply(this._state);
        GameCounters.apply(this._counters);

        this._newScoreBoard();
        this._newPlayField();
        // generate the pieces
        this.bag.reset().fill();
    },

    init: function () {
        this.refresh();
        this._bindEvents();
        this._bindDomEvents();
    },

    nextPiece: function () {
        if (!this.piece)
            this.piece = new pieces.Piece(null, this.dx, this.dy);

        var piece = this.bag.next();
        console.log('next piece:', piece);
        pieces.Piece.call(this.piece, piece, this.dx, this.dy);

        GameCounters.call(this._counters);
        ++this.piecesSeen;

        this._state.pieceIsNew = true;
        this._state.descending = true;
        this._state.sliding    = true;
    },

    update: function (e) {
        if (this._state.suspended)
            return;

        var speed = this.score.level > 10 ? 0 : Math.floor(Math.log(10 - this.score.level) * 500),
            actions = this._actions.slice(0);

        this._actions.length = 0;
        this._counters.traveled += speed ? 10/speed : 1;

        // skip rerendering if nothing has changed
        this._state.rendering = !actions.length && 1 > this._counters.traveled;

        if (this._state.descending) {
            if (this._counters.traveled >= 1)
                this.maybeSlideDown();
        } else if (this._state.sliding) {
            if (!this._counters.slideFrames) {
                this.board.occupy(this.piece);
                this._actions.push(Game.ACTIONS.CLEAR);
                this._state.sliding = false;
            } else {
                --this._counters.slideFrames;
            }
        }

        for (var i = 0; i < actions.length; i++) {
            switch (actions[i]) {
                case Game.ACTIONS.LEFT   : this.maybeSlideLeft()    ; break;
                case Game.ACTIONS.RIGHT  : this.maybeSlideRight()   ; break;
                case Game.ACTIONS.R_LEFT : this.maybeRotateRight()  ; break;
                case Game.ACTIONS.R_RIGHT: this.maybeRotateLeft()   ; break;
                case Game.ACTIONS.SOFT   : this.maybeSlideDown(true); break;
                case Game.ACTIONS.HARD   : this.hardDrop()          ; break;
                case Game.ACTIONS.CLEAR  : return this.clearRows()  ;
            }
        }

    },

    maybeSlideLeft: function () {this._maybeSlide(true)},

    maybeSlideRight: function () {this._maybeSlide(false)},

    maybeSlideDown: function (soft) {
        if (!this._state.descending)
            return;
        ++this.piece.y;
        this._counters.traveled = 0;
        if (!this.maybeToggleDescent())
            --this.piece.y;
        else
            ++this._counters.softDropped;
    },

    hardDrop: function () {
        var rows = 0,
            intersects;

        while (++rows, this._state.descending)
            this.maybeSlideDown();

        intersects = this.board.willIntersect(this.piece);
        if (intersects) {
            --this.piece.y;
            --rows;
        }
        this._counters.hardDropped = rows;
        this._counters.slideFrames = 0;
    },

    maybeRotateLeft: function () {
        this._maybeRotate(true);
    },

    maybeRotateRight: function () {
        this._maybeRotate(false);
    },

    _maybeSlide: function (left) {
        var intersects;
        if (left)
            --this.piece.x;
        else
            ++this.piece.x;
        intersects = this.board.willIntersect(this.piece);
        if (intersects) {
            if (left)
                ++this.piece.x;
            else
                --this.piece.x;
        }
        this.maybeToggleDescent();
    },

    _maybeRotate: function (left) {
        if (!this._state.descending)
            return;

        var intersects;
        left ? this.piece.rotateLeft() : this.piece.rotateRight();
        intersects = this.board.willIntersect(this.piece);
        if (intersects) {
            // TODO wall kicks
            if (left)
                this.piece.rotateRight();
            else
                this.piece.rotateLeft();
        }
        this.maybeToggleDescent();
    },

    clearRows: function () {
        if (!this.board.maybeClearRows(this.piece))
            this.nextPiece();
    },

    maybeToggleDescent: function () {
        var intersects = this.board.willIntersect(this.piece);
        if (intersects) {
            this._state.descending = false;
            this._counters.slideFrames = 60 - this.score.level;
        } else {
            this._state.descending = true;
        }
        console.log('descending:', this._state.descending, 'x:', this.piece.x, 'y:', this.piece.y);
        return this._state.descending;
    },

    render: function (e) {
        if (!this._state.rendering)
            return;
        this.board.drawPiece(this.piece, this._state.pieceIsNew);
        this._state.pieceIsNew && (this._state.pieceIsNew = false);
    },
    // override Component#on to handle dom event and grue event binding
    on: function () {
        !this.__grue_props.dom_handles && (this.__grue_props.dom_handles = []);
        try {
            Component.prototype.on.apply(this, arguments);
        } catch (e) {
            this.__grue_props.dom_handles.push(DOMEvents.on.apply(null, arguments));
        }
        return this;
    },

    togglePlay: function () {
        this._state.playing = !this._state.playing;
        if (this._state.initial) {
            this.nextPiece();
            this._state.initial = false;
        }
        this.ticker.toggle();
        this.emitEvent('playing', this._state.playing);
    },

    newGame: function () {
        // TODO pause and prompt if game hasn't ended
        // if (this._state.playing) {
        //     this.togglePlay();
        // } else {
            this.refresh();
        // }
    },

    _newScoreBoard: function () {
        // setup score board
        this.score && this.score.destroy();
        this.score = new this.scoreCtor();
        this.score.totalNode = this.layout.scoreboard.firstElementChild.lastChild;
        this.score.levelNode = this.layout.scoreboard.firstElementChild.nextElementSibling.lastChild;
        this.score.rowsNode  = this.layout.scoreboard.lastElementChild.lastChild;
        this.score.level = this.props.start_level;
        this.score.ticker = this.ticker;
        this.score.init();
    },

    _newPlayField: function () {
        this.board && this.board.destroy();
        this.board = new Board(this.props.rows, this.props.cols, this.dx, this.dy);
        this.board.ticker = this.ticker;
        this.board.on('animating', function (e) {
            this._state.suspended = e;
        }, this);

        if (this.layout.playfield.firstChild)
            this.layout.playfield.innerHTML = '';
        this.layout.playfield.appendChild(this.board.canvas);
    },

    _bindEvents: function () {
        this.__grue_props.grue_handles = [];
        this.__grue_props.grue_handles.push(this.ticker.on('tick', this.update, this).lastRegisteredHandler);
        this.__grue_props.grue_handles.push(this.ticker.on('draw', this.render, this).lastRegisteredHandler);
    },

    _bindDomEvents: function () {
        var that = this,
            handles = this.__grue_props.dom_handles;

        this.on(this.layout.root, 'click', function (e) {
            var target = e.target,
                name   = target.nodeName.toLowerCase();

            if (name != 'button')
                return;

            if (target.name == 'toggle') {
                this.togglePlay();
                this.board.canvas.focus();
            } else if (target.name == 'new') {
                this.refresh();
            } else if (target.name == 'options') {

            }
        }, false, this);

        this.on(this.layout.root, 'keydown', function (e) {
            var props = this.props.controls,
                that  = this;

            if (e.target == this.board.canvas) {
                e.preventDefault();

                switch (e.which) {
                    case props.rotate_left:
                        this._actions.push(Game.ACTIONS.R_LEFT);
                      break;
                    case 38: // up arrow
                    case props.rotate_right:
                        this._actions.push(Game.ACTIONS.R_RIGHT);
                      break;
                    case props.left:
                        this._actions.push(Game.ACTIONS.LEFT);
                      break;
                    case props.right:
                        this._actions.push(Game.ACTIONS.RIGHT);
                      break;
                    case props.soft_drop:
                        this._actions.push(Game.ACTIONS.SOFT);
                      break;
                    case props.hard_drop:
                        this._actions.push(Game.ACTIONS.HARD);
                      break;
                }

                if (e.which == props.play_toggle)
                    this.ticker.toggle();
            }
        }, false, this);
    },

    _unbindDomEvents: function () {
        var handles = this.__grue_props.dom_handles;

        if (!handles)
            return;

        for (var i = 0; i < handles.length; i++)
            DOMEvents.off(handles[i]);

        this.__grue_props.dom_handles.length = 0;
        delete this.__grue_props.dom_handles;
    },

    _destroy: function () {
        this._unbindDomEvents();
        delete this.__grue_props.dom_handles;
        this.ticker.off();
    }
};
inherit(Game, Component);