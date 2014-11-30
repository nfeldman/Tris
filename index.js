var hasLS = 'localStorage' in window && window.localStorage != null,
    Piece = require('./game/Piece'),
    Ticker = require('./Grue/js/dom/anim/Ticker'),
    Bag = Piece.Bag,
    Game = require('./game/Game'),
    Preview = require('./game/Preview'),
    Score = require('./game/Score'),
    Board = require('./game/Board'),
    Options = require('./game/Options'),
    DOMEvents = require('./Grue/js/dom/events/DOMEvents'),
    PROPS = require('./properties'),
    genFnFactory = require('./game/defaultPieceGenerator'),
    random = require('./Grue/js/number/random'),
    merge  = require('./Grue/js/object/merge'),
    props = (function () {
            var props = localStorage.getItem('props');

            if (props) {
                props = JSON.parse(props);
                if (!props._user_configured || !props.version || props.version.major != PROPS.version.major || props.version.minor != PROPS.version.minor) {
                    props.version = PROPS.version;
                    props.version_string = PROPS.version_string;
                    setTimeout(function () {
                        showOptions('Gruetris has been updated. Please check your settings.');
                    }, 0);
                }
                merge(PROPS, props, true);
            } else {
                props = PROPS;
            }
            return props;
        }()),
    layout = (function () {
        var root = document.getElementsByClassName('root')[0];
        return {
            root: root,
            preview: root.getElementsByClassName('preview')[0],
            playfield: root.getElementsByClassName('playfield')[0],
            scoreboard: root.getElementsByClassName('scoreboard')[0],
            highscores: root.getElementsByClassName('highscores')[0]
        };
    }()),
    ticker = new Ticker(),
    entropy = [],
    defaultPieceNames = 'ITSZJLO',
    extendedPieceNames = 'ITSZJLOR',
    randomGenFnGen = function (names, entropy) {
        return function () {
            var ret = new Array(14),
                len = names.length,
                idx;

            for (var i = 0; i < 14; i++) {
                do {
                    idx = (entropy && entropy.length > 14) ? entropy.pop() % len : random(len - 1);
                } while (names.charAt(idx) == 'R' && random(3) != 2);
                ret[i] = names.charAt(idx);
            }

            return ret;
        };
    },
    
    getGenFnToUse = function () {
            if (props.use_keyboard_entropy)
                !keypressHandle && useKeypress();
            else
                keypressHandle && dontUseKeypress();

            if (props.use_the_random_generator) {
                return genFnFactory(props.use_crazy_piece ? extendedPieceNames : defaultPieceNames, props.use_keyboard_entropy && entropy)
            } else {
                return randomGenFnGen(props.use_crazy_piece ? extendedPieceNames : defaultPieceNames, props.use_keyboard_entropy && entropy)
            }
        },
    bag = new Bag(getGenFnToUse()),
    game = new Game(),
    preview = new Preview(),
    now = Date.now || function () {
        return +new Date;
    },

    each = require('./Grue/js/functional/each'),

    showOptions = (function (message) {
        var wasPlaying = this._state.playing;
        wasPlaying && this.togglePlay();

        new Options({
            data: {
                up_turns_right: this.props.controls.up_turns_right,
                down_inverse_of_up: this.props.controls.down_inverse_of_up,
                start_level: this.props.start_level,
                slide_fast: this.props.slide_fast,
                use_crazy_piece: this.props.use_crazy_piece,
                use_keyboard_entropy: this.props.use_keyboard_entropy,
                use_the_random_generator: this.props.use_the_random_generator,
                bag_size: this.props.bag_size,
                max_level: this.props.max_level || -1,
                clear_scores: false
            }, 
            message: message,
            destroyOnHide: true, 
            onHide: (function (data) {
                var reset = this.props.start_level != data.start_level,
                    changeBag = this.props.use_keyboard_entropy != data.use_keyboard_entropy || this.props.use_the_random_generator != data.use_the_random_generator || this.props.use_crazy_piece != data.use_crazy_piece;

                each(data, function (v, k) {
                    if (k in this.props)
                        this.props[k] = v;
                }, this);


                this.props.controls.up_turns_right = data.up_turns_right;
                this.props.controls.down_inverse_of_up = data.down_inverse_of_up;
                this.keyMap[38] = this.props.controls.up_turns_right ? Game.ACTIONS.rotate_right : Game.ACTIONS.rotate_left;
                this.keyMap[40] = this.props.controls.down_inverse_of_up ? data.up_turns_right ? Game.ACTIONS.rotate_left : Game.ACTIONS.rotate_right : Game.ACTIONS.soft_drop;

                this.props.slide_fast = data.slide_fast;
                this.props.max_level  = data.max_level;
                this.setMaxLevel(data.max_level);

                bag.size = data.bag_size;
                if (changeBag) {
                    bag.generator = getGenFnToUse();
                    bag.reset();
                }

                if (reset) {
                    this.reset();
                } else {
                    wasPlaying && this.togglePlay();
                }

                if (data.clear_scores) {
                    localStorage.removeItem('scores');
                    this.renderHighScore();
                }

                if (!this.props._user_configured)
                    this.props._user_configured = true;
                localStorage.setItem('props', JSON.stringify(this.props));
            }).bind(this)
        }).show();
    }).bind(game),

    keypressHandle;

DOMEvents.on(layout.root, 'click', function (e) {
    var target = e.target,
        name   = target.nodeName.toLowerCase();

    if (name != 'button')
        return;

    if (target.name == 'toggle')
        this.togglePlay();
    else if (target.name == 'new')
        this.newGame();
    else if (target.name == 'options')
        showOptions();
}, false, game);

DOMEvents.on(layout.highscores, 'click', function (e) {
    e.preventDefault();
    var cell, idx;

    if (e.target.nodeName != 'A')
        return;

    cell = e.target.parentNode;

    idx = [].indexOf.call(cell.parentNode.cells, cell);
    
    if (~idx) {
        if (idx == game.sortCol)
            game.sortAsc = !game.sortAsc;
        else
            game.sortAsc = false;
        game.sortCol = idx;
        game.renderHighScore();
    }
});

function useKeypress () {
    // use the time of key presses rather than Math.random as an entropy source
    keypressHandle = DOMEvents.on(document, 'keydown', function () {
        entropy.push(now());
    }, false);
}

function dontUseKeypress () {
    keypressHandle && DOMEvents.off(keypressHandle);
    keypressHandle = null;
}


bag.size = props.bag_size;
// setup the preview
preview.bag = bag;

layout.preview.appendChild(preview.canvas);

preview.showNext = props.preview.show;

// setup the game
game.layout = layout;
game.props  = props;
game.bag = bag;
game.preview = preview;
game.ticker = ticker;
game.boardCtor = Board;
game.scoreCtor = Score;
game.init();

if (!props._user_configured)
    showOptions('Configure Gruetris');