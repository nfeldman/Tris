var mix = require('../Grue/js/object/mix');

module.exports = Score;

function Score () {
    this._level = 0;
    this._rows  = 0;
    this._total = 0;

    this._handles = [];
    this._rowsDisplayed  = 0;
    this._totalDisplayed = 0;

    Object.defineProperties(this, {
        _handles: {enumerable:false},
        _rowsDisplayed: {enumerable:false},
        _totalDisplayed: {enumerable:false}
    });

    this.ticker = null;

    this.levelNode = null;
    this.rowsNode  = null;
    this.totalNode = null;
};

mix({ // add properties to the prototype without overwriting the constructor{
    init: function () {
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

    destroy: function () {
        for (var i = 0; i < this._handles.length; i++)
            this.ticker.off(this._handles[i]);
    }
}, Score.prototype);