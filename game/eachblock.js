module.exports = function eachblock (piece, x, y, callback, thisObj) {
    var stop = false;

    for (var i = 0; i < 5; i++) {
        for (var j = 0; j < 5; j++) {
            if (piece[i][j])
                stop = callback.call(thisObj, x + j, y + i);

            if (stop)
                return;
        }
    }
}