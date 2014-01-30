module.exports = {
    "controls": {
        "rotate_left": 68, // D
        "rotate_right": 70, // F
        "left": 37, // left arrow
        "right": 39, // right arrow
        "soft_drop": 40, // down arrow
        "hard_drop": 32, // space 
        "play_toggle": 80, // P
        "up_turns_right": false
    },
    // @see <http://tetrisconcept.net/wiki/Scoring>
    "scoring": {
        // score == level * number of rows * multiplier
        "line_multipliers": [40, 100, 300, 800],
        // bonuses
        "soft_drop": 1,
        "hard_drop": 2
    },
    "cellsize": 25,
    "cols": 10,
    "rows": 20,
    "preview": {
        "show": 3
    },
    "start_level": 5,
    "slide_fast": false
};