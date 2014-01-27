module.exports = function eachblock (piece, x, y, callback, thisObj) {
    var row  = 0,
        col  = 0,
        stop = false;

    for (var bit = 0x8000; bit > 0; bit >>= 1) {
        if (piece & bit)
            stop = callback.call(thisObj, x + col, y + row);

        if (stop)
            break;

        if (++col == 4) {
            col = 0;
            ++row;
        }
    }
}