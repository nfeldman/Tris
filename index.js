var hasLS = 'localStorage' in window && window.localStorage != null,
    Piece = require('./game/Piece'),
    Ticker = require('./Grue/js/dom/anim/Ticker'),
    Bag = Piece.Bag,
    Game = require('./game/Game'),
    Preview = require('./game/Preview'),
    Score = require('./game/Score'),
    Board = require('./game/Board'),
    // ajax = require('Grue/js/ajax/ajax'),
    // Hold  = require('/game/Hold'),
    PROPS = require('./properties'),
    props = localStorage.getItem('props'),
    layout = (function () {
        var root = document.getElementsByClassName('root')[0];
        return {
            root: root,
            preview: root.getElementsByClassName('preview')[0],
            playfield: root.getElementsByClassName('playfield')[0],
            scoreboard: root.getElementsByClassName('scoreboard')[0]
        };
    }()),
    ticker = new Ticker(),
    bag = new Bag(),
    game = new Game(),
    preview = new Preview();

if (props)
    PROPS = JSON.parse(props);

// setup the preview
preview.bag = bag;

layout.preview.appendChild(preview.canvas);

preview.showNext = PROPS.preview.show;

// setup the game
game.layout = layout;
game.props  = PROPS;
game.bag = bag;
game.preview = preview;
game.ticker = ticker;
game.boardCtor = Board;
game.scoreCtor = Score;
game.init();

