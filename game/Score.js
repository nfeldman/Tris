/**  @module tris/game/Score */
module.exports = Score;

var mix = require('../Grue/js/object/mix');

/**
 * Constructs an object for tracking the score in a game.
 */
function Score () {
    this._level = 0;
    this.rows   = 0;
    this.total  = 0;

    this._handles = [];
    this._rowsDisplayed  = 0;
    this._totalDisplayed = 0;
    this.scoring = null;

    Object.defineProperties(this, {
        _handles: {enumerable:false},
        _rowsDisplayed: {enumerable:false},
        _totalDisplayed: {enumerable:false},
        _level: {enumerable: false}
    });

    this.ticker = null;

    this.levelNode = null;
    this.rowsNode  = null;
    this.totalNode = null;
};

// add properties to the prototype without overwriting the constructor
mix(/** @lends Score#prototype */ {
    set: function (rowsCleared, softDropCt, hardDropCt) {
        var total = (this.scoring.line_multipliers[rowsCleared - 1] * (this.level + 1)) + softDropCt + (hardDropCt * 2);

        this.total += total;
        this.rows  += rowsCleared;

        if (1 >= (this.level * 10) / this.rows)
            ++this.level;
    },
    /**
     * Sets up the dom and binds event listeners
     * @return {undefined}
     */
    init: function () {
        this.rowsNode.innerHTML  = 0;
        this.totalNode.innerHTML = 0;
        this._handles.push(this.ticker.on('draw', function () {
            if (this.rows > this._rowsDisplayed) {
                ++this._rowsDisplayed;
                if (this._rowsDisplayed > this.rows)
                    this._rowsDisplayed = this.rows;
                this.rowsNode.innerHTML = this._rowsDisplayed;
            }

            if (this.total > this._totalDisplayed) {
                this._totalDisplayed += 10;
                if (this._totalDisplayed > this.total)
                    this._totalDisplayed = this.total;
                this.totalNode.innerHTML = this._totalDisplayed;
            }
        }, this).lastRegisteredHandler);
    },

    /**
     * Unbinds event listeners
     * @return {undefined}
     */
    destroy: function () {
        for (var i = 0; i < this._handles.length; i++)
            this.ticker.off(this._handles[i]);
    }
}, Score.prototype);

Object.defineProperty(Score.prototype, 'level', {
    get: function () {
        return this._level;
    },
    set: function (n) {
        this._level = n;
        this.levelNode.innerHTML = n;
    }
})