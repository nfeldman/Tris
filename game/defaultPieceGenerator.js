var random = require('../Grue/js/number/random'),
    repeat = require('../Grue/js/string/repeat');

module.exports = function (alphabet, entropy) {
    !alphabet && (alphabet = 'OITLJSZ');

    return function generatePieces (size) {
        !size && (size = 7);
        var ret   = [],
            alpha = size == 7 ? alphabet : repeat(alphabet, size / 7),
            from  = alpha.split(''),
            idx;

        while (from.length) {
            do {
                idx = (entropy && entropy.length >= size) ? entropy.pop() % from.length : random(from.length - 1);
            } while (from[idx] == 'R' && random(3) != 2);

            ret.push(from.splice(idx, 1)[0]);
        }

        return ret;
    };
};