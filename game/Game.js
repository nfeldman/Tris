var inherit = require('../Grue/js/OO/inherit'),
    Component = require('../Grue/js/infrastructure/Component'),
    DOMEvents = require('../Grue/js/dom/events/DOMEvents'),
    mix = require('../Grue/js/object/mix'),
    Board  = require('Board'),
    pieces = require('pieces');

module.exports = Game;

/**
 * Constructs a data object that tracks game flags
 * @private
 */
function GameState () {
    this.initial = true;
    this.ended   = false;    // whether the game has ended
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
    this.motionless  = 0;
    this.slideFrames = 0;
    this.softDropped = 0;
    this.hardDropped = 0;
}

/**
 * Manages a game, its objects, and their lifecycles.
 * @constructor
 */
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

    // these are set/reset by Game#reset (first called by Game#init)
    this._state    = new GameState();
    this._counters = new GameCounters();
    this._piecesSeen = 0;
    this._actions = [];
    this.score   = null;
    this.preview = null;
    this.dx = 0;
    this.dy = 0;
    this.piece  = null;
    this._piece = new pieces.Piece(null, this.dx, this.dy);

    Object.defineProperties(this, {
        _state: {enumerable:false},
        _counters: {enumerable:false},
        _piecesSeen: {enumerable:false},
        _actions: {enumerable:false},
        _piece: {enumerable:false}
    });
}

/**
 * Actions to take
 * @static
 * @enum {number}
 * @type {Object}
 */
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

// add properties to the prototype without overwriting the constructor
mix(/** @lends Game#prototype */{
    /** 
     * A convention follwed by Grue Components, advertises what events are will
     * be emitted by a Game object.
     */
    publishes: Object.create(Component.prototype.publishes, {
        levelup: {value:true},
        scoreChange: {value:true},
        playing: {value:true}
    }),

    /**
     * Resets the state of all components
     * @return {undefined}
     */
    reset: function () {
        var p = this.props;

        this.dx = p.cellsize_x || p.cellsize,
        this.dy = p.cellsize_y || p.cellsize;

        this._piecesSeen = 0;
        this._actions.length = 0;

        GameState.apply(this._state);
        GameCounters.apply(this._counters);

        this._newScoreBoard();
        this._newPlayField();
        this.preview.clear();
        // generate the pieces
        this.bag.reset().fill();
    },

    /**
     * Should only be called once after `this.layout`, `this.bag`, `this.board`,
     * `this.props`, `this.ticker`, `this.scoreCtor`,  and `this.previewCtor`
     * have been set. Finishes setting up the DOM and performs event binding.
     * @return {undefined}
     */
    init: function () {
        this.reset();
        this.layout.playfield.appendChild(this.board.canvas);
        this._bindEvents();
        this._bindDomEvents();
    },

    /**
     * Gets the next piece, increments the count of seen pieces, updates flags
     * @return {undefined}
     */
    nextPiece: function () {
        // console.time('nextPiece')
        if (!this.piece)
            this.piece = new pieces.Piece(null, this.dx, this.dy);

        var piece = this.bag.next();
        pieces.Piece.call(this.piece, piece, this.dx, this.dy);
        pieces.Piece.call(this._piece, piece, this.dx, this.dy);
        ++this._piecesSeen;

        GameCounters.call(this._counters);

        this._state.pieceIsNew = true;
        this._state.descending = true;
        this._state.sliding    = true;

        this.board.refresh();

        if (this.board.willIntersect(this.piece)) {
            // console.timeEnd('nextPiece')
            this.gameOver();
        } else {
            // console.timeEnd('nextPiece')
        }
    },

    /**
     * Deals with updating the piece's position and whether it is moveable on
     * each tick of the game loop
     * @param  {GrueEvent} e
     * @return {undefined}
     */
    update: function (e) {
        if (this._state.suspended || this._state.ended)
            return;

        var speed   = this.score.level > 15 ? 0 : Math.floor(Math.log(15 - this.score.level) * 40),
            actions = this._actions.slice(0);
        this._actions.length = 0;
        this._counters.traveled += (speed ? 10/speed : 1);

        // skip rerendering if nothing has changed
        this._state.rendering = actions.length || this._counters.traveled >= 1;

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

        if (this._state.descending) {
            if (this._counters.traveled >= 1)
                this.maybeSlideDown();
        } else if (this._state.sliding) {
            // if the user doesn't slide within 20 frames, lock the piece
            if (this.piece.type == this._piece.type && this.piece.x == this._piece.x && this.piece.y == this._piece.y && this.piece.r == this._piece.r)
                ++this._counters.motionless;
            else
                this._counters.motionless = 0;

            this._piece.x = this.piece.x;
            this._piece.y = this.piece.y;
            this._piece.r = this.piece.r;

            if (!this._counters.slideFrames || this._counters.motionless > 19) {
                if (this.piece.y) {
                    this.board.occupy(this.piece);
                    this._actions.push(Game.ACTIONS.CLEAR);
                } else {
                    this.gameOver();
                }
                this._state.sliding = false;
            } else {
                --this._counters.slideFrames;
            }
        }
    },

    /**
     * End of game logic. Stops the game, alerts the user, and call Game#newGame
     * @return {undefined}
     */
    gameOver: function () {
        this.togglePlay();
        this._state.ended = true;
        alert('Game Over!');
        // this.newGame();
    },

    /**
     * Slides the piece left if the translation won't result in the piece
     * intersecting with an occupied block
     * @return {undefined}
     */
    maybeSlideLeft: function () {this._maybeSlide(true)},

    /**
     * Slides the piece right if the translation won't result in the piece
     * intersecting with an occupied block
     * @return {undefined}
     */
    maybeSlideRight: function () {this._maybeSlide(false)},

    /**
     * Drops the piece one row if the drop won't cause the piece to intersect an
     * occupied row. @see Game#maybeToggleDescent
     * @param  {boolean} soft if this is a soft drop (triggered by down key)
     * @return {undefined}
     */
    maybeSlideDown: function (soft) {
        if (!this._state.descending)
            return;

        this._counters.traveled = 0;
        if (this.maybeToggleDescent())
            ++this.piece.y;
        else if (soft)
            ++this._counters.softDropped;
    },

    /**
     * Drops the piece to the lowest unoccupied row and locks it in place
     * @return {undefined}
     */
    hardDrop: function () {
        var rows = 0,
            intersects;

        while (++rows, this._state.descending)
            this.maybeSlideDown();

        --rows;

        this._counters.hardDropped = rows;
        this._counters.slideFrames = 0; // prevent sliding
    },

    /**
     * Rotates the piece left if the rotation won't result in the piece
     * intersecting with an occupied block
     * @return {undefined}
     */
    maybeRotateLeft: function () {
        this._maybeRotate(true);
    },

    /**
     * Rotates the piece right if the rotation won't result in the piece
     * intersecting with an occupied block
     * @return {undefined}
     */
    maybeRotateRight: function () {
        this._maybeRotate(false);
    },

    /** @private */
    _maybeSlide: function (left) {
        if (left)
            --this.piece.x;
        else
            ++this.piece.x;

        var intersects = this.board.willIntersect(this.piece);
        if (intersects) {
            if (left)
                ++this.piece.x;
            else
                --this.piece.x;
        }

        if (!this._state.descending)
            this.maybeToggleDescent();
    },

    /** @private */
    _maybeRotate: function (left) {
        left ? this.piece.rotateLeft() : this.piece.rotateRight();
        var intersects = this.board.willIntersect(this.piece);
        if (intersects) {
            // TODO wall kicks
            if (left)
                this.piece.rotateRight();
            else
                this.piece.rotateLeft();
        } else if (!this._state.descending) {
            this.maybeToggleDescent();
        }
    },

    /**
     * Asks this.board to clear the rows this.piece occupies. If this.board
     * returns false, calls this.nextPiece. (If the board does need to clear
     * rows, it will emit an `animating` event)
     * @return {undefined}
     */
    clearRows: function () {
        var rows = this.board.maybeClearRows(this.piece);
        if (rows)
            this.score.set(rows, this._counters.softDropped, this._counters.hardDropped);
        else
            this.nextPiece();
    },

    /**
     * Asks this.board whether this.piece will intersect a filled block. If it
     * will, sets the descending flag to false and sets the counter of frames
     * during which the piece is permitted to slide.
     * @return {boolean} whether the piece is still descending
     */
    maybeToggleDescent: function () {
        ++this.piece.y;
        var intersects = this.board.willIntersect(this.piece);
        --this.piece.y;

        if (intersects) {
            if (this._state.descending) {
                this._state.descending = false;
                this._counters.slideFrames = 40 - (this.score.level * 2);
            }
        } else {
            this._state.descending = true;
        }

        return this._state.descending;
    },

    /**
     * Tells the board to draw the piece
     * @param  {GrueEvent} e
     * @return {undefined}
     */
    render: function (e) {
        if (!this._state.rendering || this._state.ended)
            return;

        this.board.drawPiece(this.piece, this._state.pieceIsNew);
        this._state.pieceIsNew && (this._state.pieceIsNew = false);
    },

    /**
     * overrides Component#on to handle both dom and grue event binding
     * @return {this}
     */
    on: function () {
        !this.__grue_props.dom_handles && (this.__grue_props.dom_handles = []);
        try {
            Component.prototype.on.apply(this, arguments);
        } catch (e) {
            this.__grue_props.dom_handles.push(DOMEvents.on.apply(null, arguments));
        }
        return this;
    },

    /**
     * Toggles the game loop, updates the `playing` flag, 
     * and emits a `playing` event.
     * @return {this}
     */
    togglePlay: function () {
        this._state.playing = !this._state.playing;
        if (this._state.initial) {
            this.nextPiece();
            this._state.initial = false;
        }
        this.ticker.toggle();
        this.emitEvent('playing', this._state.playing);
        return this;
    },

    /**
     * reset everything to a clean state
     * @return {[type]} [description]
     */
    newGame: function () {
        // TODO pause and prompt if game hasn't ended
        // if (this._state.playing) {
        //     this.togglePlay();
        // } else {
            this.reset();
        // }
    },

    /** @private */
    _newScoreBoard: function () {
        // setup score board
        this.score && this.score.destroy();
        this.score = new this.scoreCtor();
        this.score.scoring   = this.props.scoring;
        this.score.totalNode = this.layout.scoreboard.lastElementChild.lastChild;
        this.score.levelNode = this.layout.scoreboard.firstElementChild.lastChild;
        this.score.rowsNode  = this.layout.scoreboard.firstElementChild.nextElementSibling.lastChild;
        this.score.ticker = this.ticker;
        this.score.init();
        this.score.level = this.props.start_level;
    },

    /** @private */
    _newPlayField: function () {
        if (this.board)
            return this.board.reset(this.props.rows, this.props.cols, this.dx, this.dy);

        this.board = new Board(this.ticker, this.props.rows, this.props.cols, this.dx, this.dy);
    },

    /** @private */
    _bindEvents: function () {
        this.__grue_props.grue_handles = [];
        this.__grue_props.grue_handles.push(this.ticker.on('tick', this.update, this).lastRegisteredHandler);
        this.__grue_props.grue_handles.push(this.ticker.on('draw', this.render, this).lastRegisteredHandler);
        this.__grue_props.grue_handles.push(this.board.on('outOfBounds', this.gameOver, this).lastRegisteredHandler);
        this.__grue_props.grue_handles.push(this.board.on('animating', function (e) {
            this._state.suspended = e.body;
            if (!e.body)
                this.nextPiece();
        }, this));
    },

    /** @private */
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
                this.reset();
            } else if (target.name == 'options') {

            }
        }, false, this);

        this.on(this.layout.root, 'keydown', function (e) {
            if (this._state.ended)
                return;

            var props = this.props.controls,
                that  = this;

            if (e.target == this.board.canvas && !this._state.initial) {
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

    /** @private */
    _unbindDomEvents: function () {
        var handles = this.__grue_props.dom_handles;

        if (!handles)
            return;

        for (var i = 0; i < handles.length; i++)
            DOMEvents.off(handles[i]);

        this.__grue_props.dom_handles.length = 0;
        delete this.__grue_props.dom_handles;
    },

    /** @private */
    _destroy: function () {
        this._unbindDomEvents();
        delete this.__grue_props.dom_handles;

        var handles = this.__grue_props.grue_handles;
        for (var i = 0; i < handles.length; i++)
            handles[i].off();

        this.board.destroy();
        this.preview.destroy();
        this.score.destroy();
        this.bag.destroy();
        this.ticker.destroy();
    }
}, Game.prototype);
inherit(Game, Component);
