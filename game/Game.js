var inherit = require('../Grue/js/OO/inherit'),
    Component = require('../Grue/js/infrastructure/Component'),
    DOMEvents = require('../Grue/js/dom/events/DOMEvents'),
    mix = require('../Grue/js/object/mix'),
    each = require('../Grue/js/functional/each'),
    Piece = require('./Piece'),
    ACTIONS = {
        left: 1,
        right: 2,
        rotate_left: 3,
        rotate_right: 4,
        soft_drop: 5,
        hard_drop: 6,
        clear: 7
    };

module.exports = Game;
Game.ACTIONS = ACTIONS;

function Actions () {
    this._ptr = 0;
    Object.defineProperty(this, '_ptr', {enumerable: false});
    this.items = new Array(20);
}

Actions.prototype.push = function () {
    for (var i = 0; i < arguments.length; i++)
        this.items[this.ptr++] = arguments[i];
};

Object.defineProperty(Actions.prototype, 'ptr', {
    set: function (n) {
        if (n > 19)
            n = 0;
        this._ptr = n;
    },
    get: function () {
        return this._ptr;
    },
    enumerable: true
});

Object.defineProperty(Actions.prototype, 'length', {
    set: function (n) {
        if (n > 19)
            n = 0;
        this._ptr = n;
    },
    get: function () {
        return this._ptr;
    },
    enumerable: true
});

/**
 * Constructs a data object that tracks game flags
 * @private
 */
function GameState () {
    this.initial = true;
    this.pieceIsNew = false;  // whether the piece spawned in the last update
    this.ended   = false;    // whether the game has ended
    this.playing = false;    // whether the game is active
    this.sliding = false;    // whether the current piece can slide
    this.descending = false; // whether pieces are currently falling
    this.rendering  = false;  // whether drawing is happening
    this.suspended  = false; // whether updating should be skipped
}

/**
 * Constructs a data object that tracks numbers relevant to ongoing gameplay
 * @constructor
 * @private
 */
function GameCounters () {
    this.motionless  = 0;
    this.slideFrames = 0;
    this.softDropped = 0;
    this.hardDropped = 0;
    this.frameCt     = 0;
}

/**
 * Manages a game, its objects, and their lifecycles.
 * @constructor
 */
function Game () {
    Component.apply(this, arguments);

    // these are set after instantiation but before calling Game#init
    this.layout = null;
    this._toggleBtn = null;
    this.bag   = null;
    this.board = null;
    this.props  = null;
    this.ticker = null;
    this.scoreCtor = null;
    this.boardCtor = null;

    this._keyState = {
        down: false,
        action: -1,
        ct: 0
    };

    this.keyMap = Object.create(null);

    // these are set/reset by Game#reset (first called by Game#init)
    this._actions = new Actions();
    this._options = null;
    this.score   = null;
    this.preview = null;
    this.dx = 0;
    this.dy = 0;
    this.piece  = null;

    Object.defineProperties(this, {
        _toggleBtn: {value: null, writeable: true},
        _state: {value: new GameState(), writeable: true},
        _counters: {value: new GameCounters(), writeable: true},
        _piecesSeen: {value: Object.create(null), writeable: true},
        _piece: {value: new Piece(null, this.dx, this.dy), writeable: true}
    });
}

Object.defineProperty(Game, 'ACTIONS', {enumerable:false});

// add properties to the prototype without overwriting the constructor
mix(/** @lends Game#prototype */{
    /** 
     * A convention follwed by Grue Components, advertises what events will
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
        this.ticker.stop();

        this.dx = p.cellsize_x || p.cellsize,
        this.dy = p.cellsize_y || p.cellsize;

        each(Piece.pieces, function (v, k) {
            this._piecesSeen[k] = 0;
        }, this);

        this._actions.length = 0;

        each(this.props.controls, function (v, k) {
            if (v != 80 && k != 'up_turns_right' && k != 'hard_drop')
                this.keyMap[v] = ACTIONS[k];
        }, this);

        this.keyMap[38] = this.props.controls.up_turns_right ? ACTIONS.rotate_right : ACTIONS.rotate_left;

        GameState.apply(this._state);
        GameCounters.apply(this._counters);
        this._renderHighScore();
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
        this._toggleBtn = this.layout.root.querySelector('.meta > button[name="toggle"]');
        this._bindEvents();
        this._bindDomEvents();
    },

    /**
     * Gets the next piece, increments the count of seen pieces, updates flags
     * @return {undefined}
     */
    nextPiece: function () {
        var piece  = this.bag.next();
        this.piece = new Piece(piece, this.dx, this.dy);
        Piece.call(this._piece, piece, this.dx, this.dy);

        ++this._piecesSeen[piece];
        // console.log(JSON.stringify(this._piecesSeen, null, '  '));

        GameCounters.call(this._counters);

        this._state.pieceIsNew = true;
        this._state.descending = true;
        this._state.sliding    = true;

        this.board.refresh();

        if (this.board.willIntersect(this.piece))
            this.gameOver();
    },

    /**
     * Deals with updating the piece's position and whether it is moveable on
     * each tick of the game loop
     * @param  {GrueEvent} e
     * @return {undefined}
     */
    update: function (e) {
        if (!this._state.playing || this._state.suspended || this._state.ended)
            return;

        if (this._keyState.down) {
            if (this._keyState.ct) {
                --this._keyState.ct;
            } else {
                this._keyState.ct = 6;
                this._actions.push(this._keyState.action);
            }
        }

        var level = this.score.level,
            max   = this.props.max_speed,
            framesPerDrop, len;

        // this is how nintendo's original tetris handled the drop speed
        if (9 > level)
            framesPerDrop = 48 - (level * 5)
        else if (level == 9)
            framesPerDrop = 6;
        else if (13 > level)
            framesPerDrop = 5;
        else if (16 > level)
            framesPerDrop = 4;
        else if (18 > level)
            framesPerDrop = 3;
        else if (29 > level)
            framesPerDrop = 2;
        else
            framesPerDrop = 1;

        if (max > framesPerDrop)
            framesPerDrop = max;

        if (++this._counters.frameCt == framesPerDrop)
            this._counters.frameCt = 0;

        // skip rerendering if no action has occured and we haven't dropped a row
        this._state.rendering = !!this._actions.length || !this._counters.frameCt;

        if (len = this._actions.length) {
            for (var i = 0; i < len; i++) {
                switch (this._actions.items[i]) {
                    case ACTIONS.left : this.maybeSlideLeft() ; break;
                    case ACTIONS.right: this.maybeSlideRight(); break;
                    case ACTIONS.rotate_left : this.maybeRotateRight(); break;
                    case ACTIONS.rotate_right: this.maybeRotateLeft() ; break;
                    case ACTIONS.soft_drop: this.maybeSlideDown(true); break;
                    case ACTIONS.hard_drop: this.hardDrop()          ; break;
                    case ACTIONS.clear: this._actions.length = 0; return this.clearRows();
                }
            }
            this._actions.length = 0;
        }

        if (this._state.descending) {
            if (!this._counters.frameCt)
                this.maybeSlideDown();
        } else if (this._state.sliding) {
            // if the user doesn't slide within 30 frames, lock the piece
            if (this.piece.type == this._piece.type && this.piece.x == this._piece.x && this.piece.y == this._piece.y && this.piece.r == this._piece.r)
                ++this._counters.motionless;
            else
                this._counters.motionless = 0;

            this._piece.x = this.piece.x;
            this._piece.y = this.piece.y;
            this._piece.r = this.piece.r;

            if (!this._counters.slideFrames || this._counters.motionless > 29) {
                if (this.piece.y) {
                    ++this.piece.y;
                    if (this.board.willIntersect(this.piece)) {
                        --this.piece.y;
                    } else {
                        this._state.descending = false;
                        return this.maybeSlideDown();
                    }
                    this.board.occupy(this.piece);
                    this._actions.push(ACTIONS.clear);
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
     * End-of-game logic. Stops the game, alerts the user, and call Game#newGame
     * @return {undefined}
     */
    gameOver: function () {
        if (this._state.playing)
            this.togglePlay();
        this._state.ended = true;

        this._updateHighScores();
        // TODO replace with custom dialog
        alert('Game Over!');
        this.newGame();
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
        if (this.maybeToggleDescent()) {
            ++this.piece.y;
            if (soft)
                ++this._counters.softDropped;
        }
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
            ++this.piece.x;
            intersects = this.board.willIntersect(this.piece);
            if (intersects) {
                this.piece.x -= 2;
                intersects = this.board.willIntersect(this.piece);
                if (intersects) {
                    ++this.piece.x;
                } else {
                    return;
                }
            } else {
                return;
            }
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
        var rows  = this.board.maybeClearRows(this.piece);
        if (rows)
            this.score.set(rows, this._counters.softDropped, this._counters.hardDropped, this.piece._name == 'R' ? this.level + random(1, 100) : 0);
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
                if (11 > this.level)
                    this._counters.slideFrames = 35//45 - (this.score.level * 2);
                else if (25 > this.level)
                    this._counters.slideFrames = 28//25 - (this.level - 10)
                else if (40 > this.level)
                    this._counters.slideFrames = 15;
                else
                    this._counters.slideFrames = 10;
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
        if (!this._state.playing || !this._state.rendering || this._state.ended)
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
        // start the game loop up on the first call to toggle play, but don't
        // suspend it on subsequent calls
        if (!this._state.playing && !this.ticker.playing)
            this.ticker.toggle();

        this._state.playing = !this._state.playing;
        if (this._state.initial) {
            this.nextPiece();
            this._state.initial = false;
        }

        if (this._state.playing)
            this.board.canvas.focus();

        // this.ticker.toggle();
        this.emitEvent('playing', this._state.playing);
        return this;
    },

    /**
     * reset everything to a clean state
     */
    newGame: function () {
        // TODO pause and prompt if game hasn't ended
        if (this._state.ended)
            return this.reset();

        if (this._state.playing)
            this.togglePlay();

        // TODO replace with custom dialog
        if (confirm("Really Start Over?"))
            this.reset();
        else
            this.togglePlay();
    },

    /** @private */
    _newScoreBoard: function () {
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
    _renderHighScore: function (scores) {
        if (!this.layout.highscores)
            this.layout.highscores = this.layout.root.getElementsByClassName('highscores')[0];

        var div = this.layout.highscores,
            ol, li;

        while (div.children.length > 1) {
            div.removeChild(div.lastChild);
        }

        if (!scores) {
                scores = localStorage.getItem('scores');
            if (scores) 
                scores = JSON.parse(scores);
            else
                return;
        }

        ol = document.createElement('ol');
        ol.className = 'score-list';
        li = '';
        for (var i = 0; i < scores.length; i++)
            li += '<li><span>total <b>' + scores[i].total + '</b></span> <span>level <b>' + scores[i].level + '</b></span></li>';
        ol.innerHTML = li;
        div.appendChild(ol);
    },

    /** @private */
    _updateHighScores: function () {
        var level = this.score.level,
            total = this.score.total,
            highs = localStorage.getItem('scores'),
            i, idx;

        highs = !!highs ? JSON.parse(highs) : [];
        i = highs.length;
        idx = highs.length;

        if (i) {
            while (i--) {
                if (highs[i].total >= total)
                    break;
            }

            if (~i && highs[i].total == total) {
                if (highs[i].level == level)
                    return;

                for (var j = 0; j < highs.length; j++) {
                    if (highs[j].total == total && highs[j].level == level)
                        return;
                }
            }

            if (i == -1 || highs[i].total > total || level > highs[i].level)
                ++i;

            10 > idx && ++idx;

            while (--idx > i)
                highs[idx] = highs[idx - 1];
        }

        10 > i && (highs[i] = {
            total: total,
            level: level
        });

        localStorage.setItem('scores', JSON.stringify(highs));
        this._renderHighScore(highs);
    },

    /** @private */
    _newPlayField: function () {
        if (this.board)
            return this.board.reset(this.props.rows, this.props.cols, this.dx, this.dy);

        this.board = new this.boardCtor(this.ticker, this.props.rows, this.props.cols, this.dx, this.dy);
    },

    /** @private */
    _bindEvents: function () {
        this.__grue_props.grue_handles = [];
        this.__grue_props.grue_handles.push(this.ticker.on('tick', this.update, this).lastRegisteredHandler);
        this.__grue_props.grue_handles.push(this.ticker.on('draw', this.render, this).lastRegisteredHandler);
        this.__grue_props.grue_handles.push(this.board.on('outOfBounds', this.gameOver, this).lastRegisteredHandler);
        this.__grue_props.grue_handles.push(this.board.on('animating', function (e) {
            this._state.suspended = e.body;
            !e.body && this.nextPiece();
        }, this));
        this.__grue_props.grue_handles.push(this.on('playing', function (e) {
            this._toggleBtn.innerHTML = e.body ? 'Pause' : 'Play';
        }, this).lastRegisteredHandler);
    },

    /** @private */
    _bindDomEvents: function () {
        var that = this,
            handles = this.__grue_props.dom_handles;

        this.on(this.layout.root, 'keydown', function (e) {
            if (this._state.ended)
                return;

            var props = this.props.controls,
                fast  = this.props.slide_fast,
                that  = this;

            if (e.target == this.board.canvas && !this._state.initial) {
                e.preventDefault();

                if (this.keyMap[e.which]) {
                    if (!fast || this._keyState.down || this.keyMap[e.which] == ACTIONS.rotate_left || this.keyMap[e.which] == ACTIONS.rotate_right) {
                        this._actions.push(this.keyMap[e.which]);
                    } else {
                        this._keyState.down   = true;
                        this._keyState.action = this.keyMap[e.which];
                    }
                } else if (e.which == props.hard_drop) {
                    this._actions.push(ACTIONS.hard_drop);
                } else if (e.which == props.play_toggle) {
                    this.togglePlay();
                }
            }
        }, false, this);

        this.on(this.layout.root, 'keyup', function (e) {
            this._keyState.down = false;
            this._keyState.action = 0;
            this._keyState.ct = 0;
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
