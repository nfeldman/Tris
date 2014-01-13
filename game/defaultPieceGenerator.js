var random = require('../Grue/js/number/random');
// Random Generator generates a sequence of all seven one-sided tetrominoes 
// permuted randomly, as if they were drawn from a bag. Then it deals all seven 
// tetrominoes to the piece sequence before generating another bag. There are 
// 7!, or 5,040, permutations of seven elements, and it is believed that 
// Tetris assigns a nearly equal probability to each of these, making it much 
// less likely that the player will get an obscenely long run without a desired 
// tetromino. It can produce a maximum of 12 tetrominoes between one I and the 
// next I, and a run of S and Z tetrominoes is limited to a maximum of 4.
// @src <http://tetris.wikia.com/wiki/Random_Generator>
module.exports = function generatePieces (from, ct) {
    var ret  = [];
    !from && (from = 'OITLJSZ'.split(''));

    while (from.length)
        ret.push(from.splice(random(from.length - 1), 1)[0]);
    if (ct)
        return generatePieces(ret, --ct);
    return ret;
};